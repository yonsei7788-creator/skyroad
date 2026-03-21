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
    .select("*, user_coupons(is_used)", { count: "exact" })
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

  const total = count ?? 0;
  const data = (usages ?? []).map((u) => ({
    id: u.id,
    referralCodeId: u.referral_code_id,
    userId: u.user_id,
    userEmail: emailMap[u.user_id] ?? "-",
    couponId: u.coupon_id,
    couponUsed: u.user_coupons?.is_used ?? false,
    planName: u.plan_name ?? null,
    paidAmount: u.paid_amount ?? 0,
    createdAt: u.created_at,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};
