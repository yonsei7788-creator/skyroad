import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

type Period = "7d" | "30d" | "90d";

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartData {
  signups: ChartDataPoint[];
  revenue: ChartDataPoint[];
}

const PERIOD_DAYS: Record<Period, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const isValidPeriod = (value: string | null): value is Period =>
  value === "7d" || value === "30d" || value === "90d";

/** KST(UTC+9) 기준 Date → "YYYY-MM-DD" */
const formatDateKST = (utcMs: number): string => {
  const kst = new Date(utcMs + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** UTC ISO 타임스탬프를 KST 날짜 문자열로 변환 */
const toKSTDateStr = (isoStr: string): string => {
  const utcMs = new Date(isoStr).getTime();
  return formatDateKST(utcMs);
};

const generateDateRange = (days: number): string[] => {
  const dates: string[] = [];
  const nowMs = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    dates.push(formatDateKST(nowMs - i * 24 * 60 * 60 * 1000));
  }

  return dates;
};

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period: Period = isValidPeriod(periodParam) ? periodParam : "30d";
  const days = PERIOD_DAYS[period];

  const startDateStr = formatDateKST(Date.now() - days * 24 * 60 * 60 * 1000);

  const [signupsResult, revenueResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", `${startDateStr}T00:00:00+09:00`),
    supabase
      .from("payments")
      .select("amount, approved_at")
      .eq("status", "done")
      .gte("approved_at", `${startDateStr}T00:00:00+09:00`),
  ]);

  const dateRange = generateDateRange(days);

  const signupCountMap = new Map<string, number>();
  dateRange.forEach((date) => signupCountMap.set(date, 0));

  signupsResult.data?.forEach((row) => {
    if (row.created_at) {
      const date = toKSTDateStr(row.created_at);
      const current = signupCountMap.get(date);
      if (current !== undefined) {
        signupCountMap.set(date, current + 1);
      }
    }
  });

  const revenueMap = new Map<string, number>();
  dateRange.forEach((date) => revenueMap.set(date, 0));

  revenueResult.data?.forEach((row) => {
    if (row.approved_at) {
      const date = toKSTDateStr(row.approved_at);
      const current = revenueMap.get(date);
      if (current !== undefined) {
        revenueMap.set(date, current + (row.amount ?? 0));
      }
    }
  });

  const chartData: ChartData = {
    signups: dateRange.map((date) => ({
      date,
      value: signupCountMap.get(date) ?? 0,
    })),
    revenue: dateRange.map((date) => ({
      date,
      value: revenueMap.get(date) ?? 0,
    })),
  };

  return NextResponse.json(chartData);
}
