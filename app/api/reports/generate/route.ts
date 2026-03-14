import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import type { ReportPlan, StudentInfo } from "@/libs/report/types";
import { executePreprocess } from "@/libs/report/pipeline/wave-executor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GenerateBody {
  orderId: string;
}

const GRADE_MAP: Record<string, number> = {
  high1: 1,
  high2: 2,
  high3: 3,
  graduate: 3,
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
  let body: GenerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json(
      { error: "orderId가 필요합니다." },
      { status: 400 }
    );
  }

  // 3. 주문 정보 조회 (owner 확인 + 관련 데이터)
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      user_id,
      record_id,
      status,
      plans!inner (
        name
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 주문 소유자 또는 관리자만 생성 가능
  if (order.user_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  }

  // 결제 완료 상태 확인
  if (order.status === "pending_payment") {
    return NextResponse.json(
      { error: "결제가 완료되지 않았습니다." },
      { status: 400 }
    );
  }

  // 4. 리포트 조회 또는 생성
  const { data: existingReport } = await supabase
    .from("reports")
    .select("id, ai_status, content, ai_wave_state")
    .eq("order_id", orderId)
    .single();

  if (existingReport?.ai_status === "processing") {
    // 이미 processing 상태 — wave state가 있으면 태스크 큐 반환하여 이어서 실행
    const waveState = existingReport.ai_wave_state as {
      taskQueue?: string[];
    } | null;

    if (waveState?.taskQueue) {
      const plans = order.plans as unknown as { name: string };
      const plan = plans.name as ReportPlan;

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("name, grade, high_school_type")
        .eq("id", order.user_id)
        .single();

      const profiles = userProfile ?? {
        name: "학생",
        grade: "high2",
        high_school_type: "일반고",
      };

      const { data: targetUnis } = await supabase
        .from("target_universities")
        .select("university_name, admission_type, department, priority")
        .eq("user_id", order.user_id)
        .order("priority", { ascending: true });

      const targetUni = targetUnis?.[0];

      const { data: mockExamsCheck } = await supabase
        .from("record_mock_exams")
        .select("id")
        .eq("record_id", order.record_id as string)
        .limit(1);

      const studentInfo: StudentInfo = {
        name: profiles.name ?? "학생",
        grade: GRADE_MAP[profiles.grade] ?? 2,
        track: "통합",
        schoolType:
          (profiles.high_school_type as StudentInfo["schoolType"]) ?? "일반고",
        targetUniversity: targetUni?.university_name,
        targetDepartment: targetUni?.department,
        targetUniversities:
          targetUnis && targetUnis.length > 0
            ? targetUnis.map((u) => ({
                priority: u.priority,
                universityName: u.university_name,
                admissionType: u.admission_type ?? "학종",
                department: u.department,
              }))
            : undefined,
        hasMockExamData: (mockExamsCheck?.length ?? 0) > 0,
      };

      return NextResponse.json({
        reportId: existingReport.id,
        orderId,
        plan,
        studentInfo,
        taskQueue: waveState.taskQueue,
        status: "ready",
      });
    }

    return NextResponse.json({ error: "이미 생성 중입니다." }, { status: 409 });
  }

  // 실패한 리포트 재시도 판별
  const isRetry = existingReport?.ai_status === "failed";

  if (
    !isRetry &&
    existingReport?.content !== null &&
    existingReport?.content !== undefined
  ) {
    return NextResponse.json(
      { error: "이미 생성 완료된 리포트입니다." },
      { status: 409 }
    );
  }

  // admin client를 먼저 생성 (RLS 우회 필요)
  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  // 리포트 레코드 확보 (없으면 생성)
  let reportId: string;
  if (existingReport) {
    reportId = existingReport.id;
  } else {
    // 목표 대학 조회
    const { data: targetUni } = await dbClient
      .from("target_universities")
      .select("id")
      .eq("user_id", order.user_id)
      .order("priority", { ascending: true })
      .limit(1)
      .single();

    const { data: newReport, error: insertError } = await dbClient
      .from("reports")
      .insert({
        order_id: orderId,
        target_university_id: targetUni?.id ?? null,
        ai_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !newReport) {
      console.error("리포트 생성 오류:", insertError);
      return NextResponse.json(
        { error: "리포트 레코드 생성에 실패했습니다." },
        { status: 500 }
      );
    }
    reportId = newReport.id;
  }

  // 5. 상태를 processing으로 변경

  await dbClient
    .from("reports")
    .update({
      ai_status: "processing",
      ai_progress: 0,
      ai_current_section: null,
      ai_error: null,
    })
    .eq("id", reportId);

  await dbClient
    .from("orders")
    .update({ status: "analyzing" })
    .eq("id", orderId);

  // 6. 파이프라인 입력 데이터 준비
  const plans = order.plans as unknown as { name: string };

  const { data: userProfile } = await dbClient
    .from("profiles")
    .select("name, grade, high_school_type")
    .eq("id", order.user_id)
    .single();

  const profiles = userProfile ?? {
    name: "학생",
    grade: "high2",
    high_school_type: "일반고",
  };

  const plan = plans.name as ReportPlan;
  const recordId = order.record_id as string;

  // 목표 대학 정보 조회 (1~3지망 전체)
  const { data: targetUnis } = await dbClient
    .from("target_universities")
    .select("university_name, admission_type, department, sub_field, priority")
    .eq("user_id", order.user_id)
    .order("priority", { ascending: true });

  const targetUni = targetUnis?.[0];

  const { data: mockExamsMain } = await dbClient
    .from("record_mock_exams")
    .select("id")
    .eq("record_id", recordId)
    .limit(1);

  const studentInfo: StudentInfo = {
    name: profiles.name ?? "학생",
    grade: GRADE_MAP[profiles.grade] ?? 2,
    track: "통합",
    schoolType:
      (profiles.high_school_type as StudentInfo["schoolType"]) ?? "일반고",
    targetUniversity: targetUni?.university_name,
    targetDepartment: targetUni?.department,
    targetUniversities:
      targetUnis && targetUnis.length > 0
        ? targetUnis.map((u) => ({
            priority: u.priority,
            universityName: u.university_name,
            admissionType: u.admission_type ?? "학종",
            department: u.department,
          }))
        : undefined,
    hasMockExamData: (mockExamsMain?.length ?? 0) > 0,
  };

  // 7. 전처리 실행 (Gemini 호출 없음 — 빠름)
  // 대학 후보군은 preprocessor에서 환산등급 기반으로 자동 생성됨
  try {
    const waveState = await executePreprocess(
      plan,
      studentInfo,
      reportId,
      dbClient,
      recordId
    );

    return NextResponse.json({
      reportId,
      orderId,
      plan,
      studentInfo,
      taskQueue: waveState.taskQueue,
      status: "ready",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "전처리 중 오류가 발생했습니다.";
    await markFailed(dbClient, reportId, orderId, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

// ─── 유틸 ───

const markFailed = async (
  supabase: SupabaseClient,
  reportId: string,
  orderId: string,
  errorMessage: string
): Promise<void> => {
  await supabase
    .from("reports")
    .update({
      ai_status: "failed",
      ai_error: errorMessage,
    })
    .eq("id", reportId);

  await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
};
