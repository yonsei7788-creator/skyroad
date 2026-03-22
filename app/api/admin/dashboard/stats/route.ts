import { NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersYesterday: number;
  totalRecords: number;
  totalDeliveredReports: number;
  totalPayments: number;
  totalRevenue: number;
  todayPayments: number;
  todayRevenue: number;
}

export async function GET() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  const yesterdayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  ).toISOString();

  const [
    totalUsersResult,
    newUsersTodayResult,
    newUsersYesterdayResult,
    totalRecordsResult,
    totalDeliveredReportsResult,
    totalRevenueResult,
    todayRevenueResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterdayStart)
      .lt("created_at", todayStart),
    supabase.from("records").select("*", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .not("delivered_at", "is", null),
    supabase.from("payments").select("amount").eq("status", "done"),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "done")
      .gte("created_at", todayStart),
  ]);

  const paidPayments = totalRevenueResult.data ?? [];
  const totalRevenue = paidPayments.reduce(
    (sum, payment) => sum + (payment.amount ?? 0),
    0
  );

  const todayPaidPayments = todayRevenueResult.data ?? [];
  const todayRevenue = todayPaidPayments.reduce(
    (sum, payment) => sum + (payment.amount ?? 0),
    0
  );

  const stats: DashboardStats = {
    totalUsers: totalUsersResult.count ?? 0,
    newUsersToday: newUsersTodayResult.count ?? 0,
    newUsersYesterday: newUsersYesterdayResult.count ?? 0,
    totalRecords: totalRecordsResult.count ?? 0,
    totalDeliveredReports: totalDeliveredReportsResult.count ?? 0,
    totalPayments: paidPayments.length,
    totalRevenue,
    todayPayments: todayPaidPayments.length,
    todayRevenue,
  };

  return NextResponse.json(stats);
}
