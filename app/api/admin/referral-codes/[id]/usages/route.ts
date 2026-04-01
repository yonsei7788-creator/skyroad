import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { verifyAdmin } from "@/app/api/admin/reports/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/* ============================================
   GET  /api/admin/referral-codes/[id]/usages
   ============================================ */
export const GET = async (request: NextRequest, { params }: RouteParams) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? 20))
  );

  const {
    data: usages,
    count,
    error,
  } = await supabase
    .from("referral_usages")
    .select("*", { count: "exact" })
    .eq("referral_code_id", id)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return NextResponse.json(
      { error: "사용 내역을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }

  // 유저 이메일 조회 (admin client)
  const adminClient = createAdminClient();
  const userIds = [...new Set((usages ?? []).map((u) => u.user_id))];

  const emailMap: Record<string, string> = {};
  if (adminClient && userIds.length > 0) {
    const { data: authUsers } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        if (userIds.includes(u.id)) {
          emailMap[u.id] = u.email ?? "-";
        }
      }
    }
  }

  // 결제 정보를 orders에서 조회 (coupon_id 기준)
  const couponIds = (usages ?? [])
    .map((u) => u.coupon_id)
    .filter(Boolean) as string[];

  const orderMap: Record<string, { amount: number; planName: string | null }> =
    {};

  if (couponIds.length > 0) {
    const { data: paidOrders } = await supabase
      .from("orders")
      .select("coupon_id, amount, plans!inner(name)")
      .in("coupon_id", couponIds)
      .neq("status", "pending_payment");

    for (const o of paidOrders ?? []) {
      const planInfo = o.plans as unknown as { name: string };
      orderMap[o.coupon_id] = {
        amount: o.amount ?? 0,
        planName: planInfo?.name ?? null,
      };
    }
  }

  const total = count ?? 0;
  const data = (usages ?? []).map((u) => {
    const order = u.coupon_id ? orderMap[u.coupon_id] : undefined;
    return {
      id: u.id,
      referralCodeId: u.referral_code_id,
      userId: u.user_id,
      userEmail: emailMap[u.user_id] ?? "-",
      couponId: u.coupon_id,
      couponUsed: !!order,
      planName: order?.planName ?? null,
      paidAmount: order?.amount ?? 0,
      createdAt: u.created_at,
    };
  });

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};
