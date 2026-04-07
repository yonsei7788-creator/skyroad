import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/libs/supabase/admin";
import { createClient } from "@/libs/supabase/server";

interface AdminPayment {
  id: string;
  orderId: string;
  userName: string | null;
  userEmail: string;
  userId: string;
  planName: string | null;
  planDisplayName: string | null;
  orderStatus: string;
  orderAmount: number;
  discountAmount: number;
  paymentKey: string | null;
  tossOrderId: string | null;
  method: string | null;
  paymentStatus: string;
  paymentAmount: number;
  approvedAt: string | null;
  createdAt: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalCount: number;
  todayRevenue: number;
  todayCount: number;
  canceledCount: number;
}

interface PaginatedResponse {
  data: AdminPayment[];
  stats: PaymentStats;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const GET = async (
  request: NextRequest
): Promise<NextResponse<PaginatedResponse | { error: string }>> => {
  const supabase = await createClient();

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

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(
    DEFAULT_PAGE,
    parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10)
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)
    )
  );
  const search = searchParams.get("search")?.trim() ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const methodFilter = searchParams.get("method") ?? "";

  // Stats: total revenue + count for completed payments
  const { data: allDone } = await supabase
    .from("payments")
    .select("amount, created_at")
    .eq("status", "done");

  const { count: canceledCount } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "canceled");

  // 한국 시간(UTC+9) 기준으로 오늘 자정 계산 — 대시보드 API와 동일한 방식
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const yyyy = nowKST.getUTCFullYear();
  const mm = String(nowKST.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowKST.getUTCDate()).padStart(2, "0");
  const todayStart = `${yyyy}-${mm}-${dd}T00:00:00+09:00`;

  const totalRevenue =
    allDone?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;
  const totalCount = allDone?.length ?? 0;
  const todayPayments =
    allDone?.filter((p) => p.created_at >= todayStart) ?? [];
  const todayRevenue = todayPayments.reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  );
  const todayCount = todayPayments.length;

  const stats: PaymentStats = {
    totalRevenue,
    totalCount,
    todayRevenue,
    todayCount,
    canceledCount: canceledCount ?? 0,
  };

  // Build payments query with joined orders and plans
  let query = supabase.from("payments").select(
    `
      id,
      order_id,
      payment_key,
      toss_order_id,
      method,
      status,
      amount,
      approved_at,
      created_at,
      orders!inner (
        id,
        user_id,
        status,
        amount,
        discount_amount,
        plans (
          name,
          display_name
        )
      )
    `,
    { count: "exact" }
  );

  // Status filter — default to actual transactions only (exclude "ready")
  if (statusFilter === "done" || statusFilter === "canceled") {
    query = query.eq("status", statusFilter);
  } else {
    query = query.in("status", ["done", "canceled"]);
  }

  // Method filter
  if (methodFilter) {
    query = query.eq("method", methodFilter);
  }

  const offset = (page - 1) * limit;
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: payments, count, error: paymentsError } = await query;

  if (paymentsError) {
    console.error("결제 조회 오류:", paymentsError);
    return NextResponse.json(
      { error: "결제 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }

  if (!payments || payments.length === 0) {
    return NextResponse.json({
      data: [],
      stats,
      total: 0,
      page,
      limit,
      totalPages: 0,
    });
  }

  // Get user profiles and emails
  const userIds = [
    ...new Set(
      payments.map((p) => {
        const order = p.orders as unknown as {
          user_id: string;
        };
        return order.user_id;
      })
    ),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds);

  const profileMap = new Map<string, string | null>();
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.id, p.name);
    }
  }

  const emailMap = new Map<string, string>();
  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    const { data: authData } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (authData?.users) {
      for (const u of authData.users) {
        emailMap.set(u.id, u.email ?? "");
      }
    }
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const data: AdminPayment[] = payments
    .map((p) => {
      const order = p.orders as unknown as {
        id: string;
        user_id: string;
        status: string;
        amount: number;
        discount_amount: number;
        plans: { name: string; display_name: string } | null;
      };

      const userId = order.user_id;
      const userName = profileMap.get(userId) ?? null;
      const userEmail = emailMap.get(userId) ?? "";

      // Apply search filter (server-side name/email)
      if (search) {
        const lowerSearch = search.toLowerCase();
        const nameMatch = userName?.toLowerCase().includes(lowerSearch);
        const emailMatch = userEmail.toLowerCase().includes(lowerSearch);
        const tossMatch = p.toss_order_id?.toLowerCase().includes(lowerSearch);
        if (!nameMatch && !emailMatch && !tossMatch) return null;
      }

      return {
        id: p.id,
        orderId: order.id,
        userName,
        userEmail,
        userId,
        planName: order.plans?.name ?? null,
        planDisplayName: order.plans?.display_name ?? null,
        orderStatus: order.status,
        orderAmount: order.amount,
        discountAmount: order.discount_amount ?? 0,
        paymentKey: p.payment_key,
        tossOrderId: p.toss_order_id,
        method: p.method,
        paymentStatus: p.status,
        paymentAmount: p.amount,
        approvedAt: p.approved_at,
        createdAt: p.created_at,
      };
    })
    .filter((item): item is AdminPayment => item !== null);

  return NextResponse.json({
    data,
    stats,
    total: search ? data.length : total,
    page,
    limit,
    totalPages: search ? Math.ceil(data.length / limit) : totalPages,
  });
};
