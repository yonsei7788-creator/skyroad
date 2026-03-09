import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { verifyAdmin } from "../helpers";
import type { ReportPlan, StudentInfo } from "@/libs/report/types";
import { executePreprocess } from "@/libs/report/pipeline/wave-executor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GenerateBody {
  userId: string;
  plan: ReportPlan;
}

const VALID_PLANS: ReportPlan[] = ["lite", "standard", "premium"];

const GRADE_MAP: Record<string, number> = {
  high1: 1,
  high2: 2,
  high3: 3,
};

/**
 * 어드민 전용 리포트 생성 — 결제 없이 플랜별 리포트를 생성한다.
 * 주문(order)을 자동 생성하고 paid 상태로 설정한 뒤 파이프라인을 시작한다.
 */
export const POST = async (request: NextRequest) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  let body: GenerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { userId, plan } = body;
  if (!userId || !plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "userId와 유효한 plan이 필요합니다." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  // 1. 유저의 최신 생기부 레코드 확인
  const { data: record, error: recordError } = await dbClient
    .from("records")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recordError || !record) {
    return NextResponse.json(
      { error: "해당 유저의 생기부가 등록되지 않았습니다." },
      { status: 404 }
    );
  }

  // 2. 플랜 조회
  const { data: planRow, error: planError } = await dbClient
    .from("plans")
    .select("id, name, price")
    .eq("name", plan)
    .eq("is_active", true)
    .single();

  if (planError || !planRow) {
    return NextResponse.json(
      { error: "플랜 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 3. 주문 생성 (결제 없이 바로 paid 상태)
  const { data: order, error: orderError } = await dbClient
    .from("orders")
    .insert({
      user_id: userId,
      record_id: record.id,
      plan_id: planRow.id,
      status: "paid",
      amount: 0,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("어드민 주문 생성 오류:", orderError);
    return NextResponse.json(
      { error: "주문 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  // 4. 리포트 레코드 생성
  const { data: targetUni } = await dbClient
    .from("target_universities")
    .select("id")
    .eq("user_id", userId)
    .order("priority", { ascending: true })
    .limit(1)
    .single();

  const { data: report, error: reportError } = await dbClient
    .from("reports")
    .insert({
      order_id: order.id,
      target_university_id: targetUni?.id ?? null,
      ai_status: "processing",
      ai_progress: 0,
    })
    .select("id")
    .single();

  if (reportError || !report) {
    console.error("리포트 생성 오류:", reportError);
    return NextResponse.json(
      { error: "리포트 레코드 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  await dbClient
    .from("orders")
    .update({ status: "analyzing" })
    .eq("id", order.id);

  // 5. 파이프라인 입력 데이터 준비
  const { data: userProfile } = await dbClient
    .from("profiles")
    .select("name, grade, high_school_type")
    .eq("id", userId)
    .single();

  const profiles = userProfile ?? {
    name: "학생",
    grade: "high2",
    high_school_type: "일반고",
  };

  const { data: targetUnis } = await dbClient
    .from("target_universities")
    .select("university_name, admission_type, department, sub_field, priority")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  const firstUni = targetUnis?.[0];

  const studentInfo: StudentInfo = {
    name: profiles.name ?? "학생",
    grade: GRADE_MAP[profiles.grade] ?? 2,
    track: "통합",
    schoolType:
      (profiles.high_school_type as StudentInfo["schoolType"]) ?? "일반고",
    targetUniversity: firstUni?.university_name,
    targetDepartment: firstUni?.department,
    hasMockExamData: false,
  };

  const universityCandidatesText =
    targetUnis && targetUnis.length > 0
      ? JSON.stringify(
          targetUnis.map((u) => ({
            priority: u.priority,
            university: u.university_name,
            admissionType: u.admission_type,
            department: u.department,
            subField: u.sub_field || undefined,
          })),
          null,
          2
        )
      : "[]";

  // 6. 전처리 실행
  try {
    const waveState = await executePreprocess(
      plan,
      studentInfo,
      report.id,
      dbClient,
      record.id,
      universityCandidatesText
    );

    return NextResponse.json({
      reportId: report.id,
      orderId: order.id,
      plan,
      studentInfo,
      taskQueue: waveState.taskQueue,
      status: "ready",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "전처리 중 오류가 발생했습니다.";

    await dbClient
      .from("reports")
      .update({ ai_status: "failed", ai_error: message })
      .eq("id", report.id);
    await dbClient.from("orders").update({ status: "paid" }).eq("id", order.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
};
