import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const dynamic = "force-dynamic";

interface ConfirmBody {
  paymentKey: string;
  orderId: string; // toss_order_id (토스 주문번호)
  amount: number;
}

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";
const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

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
  let body: ConfirmBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { paymentKey, orderId: tossOrderId, amount } = body;
  if (!paymentKey || !tossOrderId || !amount) {
    return NextResponse.json(
      { error: "paymentKey, orderId, amount가 필요합니다." },
      { status: 400 }
    );
  }

  // 3. payments 테이블에서 주문 매칭
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(
      `
      id,
      order_id,
      toss_order_id,
      amount,
      status,
      orders!inner (
        id,
        user_id,
        status
      )
    `
    )
    .eq("toss_order_id", tossOrderId)
    .single();

  if (paymentError || !payment) {
    return NextResponse.json(
      { error: "결제 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const orders = payment.orders as unknown as {
    id: string;
    user_id: string;
    status: string;
  };

  // 소유자 확인
  if (orders.user_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 이미 결제 완료된 경우
  if (payment.status === "done") {
    return NextResponse.json(
      { error: "이미 결제가 완료되었습니다." },
      { status: 409 }
    );
  }

  // 금액 검증
  if (payment.amount !== amount) {
    return NextResponse.json(
      { error: "결제 금액이 일치하지 않습니다." },
      { status: 400 }
    );
  }

  // 4. 토스페이먼츠 결제 승인 API 호출
  if (!TOSS_SECRET_KEY) {
    return NextResponse.json(
      { error: "결제 서비스가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const authHeader = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");

  let tossResponse: Response;
  try {
    tossResponse = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId: tossOrderId, amount }),
    });
  } catch (err) {
    console.error("토스페이먼츠 API 호출 오류:", err);
    return NextResponse.json(
      { error: "결제 승인 요청에 실패했습니다." },
      { status: 502 }
    );
  }

  const tossResult = await tossResponse.json();

  if (!tossResponse.ok) {
    console.error("토스페이먼츠 승인 실패:", tossResult);
    return NextResponse.json(
      {
        error: tossResult.message ?? "결제 승인에 실패했습니다.",
        code: tossResult.code,
      },
      { status: tossResponse.status }
    );
  }

  // 5. 결제 성공 -- DB 업데이트
  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  // payments 테이블 업데이트
  const { error: updateError } = await dbClient
    .from("payments")
    .update({
      payment_key: paymentKey,
      method: tossResult.method ?? null,
      status: "done",
      approved_at: tossResult.approvedAt ?? new Date().toISOString(),
      raw_response: tossResult,
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("결제 정보 업데이트 오류:", updateError);
    // 토스 승인은 완료되었으므로 중단하지 않고 계속 진행
  }

  // orders 상태 업데이트
  const { error: orderUpdateError } = await dbClient
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orders.id);

  if (orderUpdateError) {
    console.error("주문 상태 업데이트 오류:", orderUpdateError);
  }

  // 5-1. 쿠폰 사용 마킹 + referral_usages 업데이트
  const { data: orderDetail } = await dbClient
    .from("orders")
    .select("coupon_id, plan_id, amount, plans!inner(name)")
    .eq("id", orders.id)
    .single();

  if (orderDetail?.coupon_id) {
    // 쿠폰 사용 완료 처리
    const { error: couponError } = await dbClient
      .from("user_coupons")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq("id", orderDetail.coupon_id);

    if (couponError) {
      console.error("쿠폰 사용 마킹 실패 — 재사용 위험:", couponError);
    }

    // referral_usages에 결제 정보 기록
    const planInfo = orderDetail.plans as unknown as { name: string };
    const { error: usageUpdateError } = await dbClient
      .from("referral_usages")
      .update({
        order_id: orders.id,
        plan_name: planInfo?.name ?? null,
        paid_amount: orderDetail.amount ?? amount,
      })
      .eq("coupon_id", orderDetail.coupon_id);

    if (usageUpdateError) {
      console.error(
        "referral_usages 업데이트 실패 — 수수료 누락 위험:",
        usageUpdateError
      );
    }
  }

  // 6. 리포트 자동 생성 트리거
  let reportTriggered = false;
  try {
    // 내부적으로 generate API를 호출하는 대신 직접 리포트 레코드 생성
    const { data: targetUni } = await dbClient
      .from("target_universities")
      .select("id")
      .eq("user_id", user.id)
      .order("priority", { ascending: true })
      .limit(1)
      .single();

    const { data: newReport, error: reportError } = await dbClient
      .from("reports")
      .insert({
        order_id: orders.id,
        target_university_id: targetUni?.id ?? null,
        ai_status: "pending",
      })
      .select("id")
      .single();

    if (reportError) {
      console.error("리포트 레코드 생성 오류:", reportError);
    } else {
      reportTriggered = true;
    }

    // 클라이언트가 generate API를 별도 호출할 수 있도록
    // reportId를 응답에 포함
    return NextResponse.json({
      success: true,
      orderId: orders.id,
      reportId: newReport?.id ?? null,
      reportTriggered,
    });
  } catch (err) {
    console.error("리포트 생성 트리거 오류:", err);
    // 결제는 이미 성공했으므로 200 반환
    return NextResponse.json({
      success: true,
      orderId: orders.id,
      reportId: null,
      reportTriggered: false,
    });
  }
};
