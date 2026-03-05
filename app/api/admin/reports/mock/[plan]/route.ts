import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import type { ReportDetail } from "@/app/admin/types";
import {
  LITE_MOCK_REPORT,
  STANDARD_MOCK_REPORT,
  PREMIUM_MOCK_REPORT,
} from "@/libs/report/mock-data";

import { verifyAdmin } from "../../helpers";

const PLAN_CONFIG = {
  lite: { displayName: "라이트", data: LITE_MOCK_REPORT },
  standard: { displayName: "스탠다드", data: STANDARD_MOCK_REPORT },
  premium: { displayName: "프리미엄", data: PREMIUM_MOCK_REPORT },
} as const;

type MockPlan = keyof typeof PLAN_CONFIG;

const isMockPlan = (value: string): value is MockPlan => value in PLAN_CONFIG;

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) => {
  const { plan } = await params;
  const supabase = await createClient();

  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  if (!isMockPlan(plan)) {
    return NextResponse.json(
      { error: "유효하지 않은 플랜입니다. (lite | standard | premium)" },
      { status: 400 }
    );
  }

  const { displayName, data: mockReportData } = PLAN_CONFIG[plan];

  const detail: ReportDetail = {
    id: `mock-${plan}`,
    orderId: `mock-order-${plan}`,
    userName: "테스트 유저",
    userEmail: "ujh9208@gmail.com",
    planName: displayName,
    targetUniversity: "서울대학교 컴퓨터공학부 (학생부종합)",
    status: "review_pending",
    content: mockReportData,
    reviewNotes: null,
    aiGeneratedAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    deliveredAt: null,
  };

  return NextResponse.json(detail);
};
