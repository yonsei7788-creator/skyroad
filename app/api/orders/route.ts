import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

interface OrderBody {
  planName: "lite" | "standard" | "premium";
  couponId?: string | null;
}

const VALID_PLANS = ["lite", "standard", "premium"] as const;

const PENDING_REUSE_MINUTES = 30;

const generateTossOrderId = (): string => {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `SKYROAD_${ts}_${rand}`;
};

export const POST = async (request: NextRequest) => {
  const supabase = await createClient();

  // 1. 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  // 2. 요청 바디 파싱
  let body: OrderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { planName, couponId } = body;
  if (!planName || !VALID_PLANS.includes(planName)) {
    return NextResponse.json(
      { error: "유효하지 않은 플랜입니다." },
      { status: 400 }
    );
  }

  // 3. 플랜 조회
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name, display_name, price")
    .eq("name", planName)
    .eq("is_active", true)
    .single();

  if (planError || !plan) {
    return NextResponse.json(
      { error: "플랜 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 3-1. 쿠폰 검증 + 할인 계산
  let discountAmount = 0;
  let validCouponId: string | null = null;

  if (couponId) {
    const couponClient = createAdminClient() ?? supabase;
    const { data: coupon } = await couponClient
      .from("user_coupons")
      .select("id, discount_amount, is_used, expires_at, user_id")
      .eq("id", couponId)
      .single();

    if (
      coupon &&
      coupon.user_id === user.id &&
      !coupon.is_used &&
      new Date(coupon.expires_at) > new Date()
    ) {
      discountAmount = coupon.discount_amount;
      validCouponId = coupon.id;
    }
  }

  const finalAmount = Math.max(0, plan.price - discountAmount);

  // 4. 생기부 레코드 확인
  const { data: record, error: recordError } = await supabase
    .from("records")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recordError || !record) {
    return NextResponse.json(
      { error: "생기부가 등록되지 않았습니다. 먼저 생기부를 등록해주세요." },
      { status: 400 }
    );
  }

  // 5. 기존 pending_payment 주문 확인 (30분 이내면 재사용)
  const cutoff = new Date(
    Date.now() - PENDING_REUSE_MINUTES * 60 * 1000
  ).toISOString();

  const { data: existingOrder } = await supabase
    .from("orders")
    .select(
      `
      id,
      amount,
      created_at,
      payments!inner (
        toss_order_id
      )
    `
    )
    .eq("user_id", user.id)
    .eq("record_id", record.id)
    .eq("plan_id", plan.id)
    .eq("status", "pending_payment")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingOrder) {
    const payments = existingOrder.payments as unknown as {
      toss_order_id: string;
    };
    return NextResponse.json({
      orderId: existingOrder.id,
      tossOrderId: payments.toss_order_id,
      amount: existingOrder.amount,
      orderName: `SKYROAD ${plan.display_name}`,
    });
  }

  // 6. 주문 + 결제 레코드 생성 (admin client로 payments INSERT)
  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  const { data: newOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      record_id: record.id,
      plan_id: plan.id,
      status: "pending_payment",
      amount: finalAmount,
      coupon_id: validCouponId,
      discount_amount: discountAmount,
    })
    .select("id")
    .single();

  if (orderError || !newOrder) {
    // record_id UNIQUE 제약조건 충돌 가능
    if (orderError?.code === "23505") {
      return NextResponse.json(
        { error: "이미 해당 생기부에 대한 주문이 존재합니다." },
        { status: 409 }
      );
    }
    console.error("주문 생성 오류:", orderError);
    return NextResponse.json(
      { error: "주문 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  const tossOrderId = generateTossOrderId();

  const { error: paymentError } = await dbClient.from("payments").insert({
    order_id: newOrder.id,
    toss_order_id: tossOrderId,
    amount: finalAmount,
    status: "ready",
  });

  if (paymentError) {
    console.error("결제 레코드 생성 오류:", paymentError);
    // 주문은 생성되었으나 결제 레코드 실패 → 주문 삭제 시도
    await dbClient.from("orders").delete().eq("id", newOrder.id);
    return NextResponse.json(
      { error: "결제 정보 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    orderId: newOrder.id,
    tossOrderId,
    amount: finalAmount,
    orderName: `SKYROAD ${plan.display_name}`,
  });
};
