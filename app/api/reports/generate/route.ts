import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { env } from "@/env";
import type { ReportPlan, StudentInfo } from "@/libs/report/types";

export const dynamic = "force-dynamic";

interface GenerateBody {
  orderId: string;
}

const GRADE_MAP: Record<string, number> = {
  high1: 1,
  high2: 2,
  high3: 3,
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
    .select("id, ai_status, content")
    .eq("order_id", orderId)
    .single();

  if (existingReport?.ai_status === "processing") {
    return NextResponse.json({ error: "이미 생성 중입니다." }, { status: 409 });
  }

  if (
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

  const studentInfo: StudentInfo = {
    name: profiles.name ?? "학생",
    grade: GRADE_MAP[profiles.grade] ?? 2,
    track: "통합",
    schoolType:
      (profiles.high_school_type as StudentInfo["schoolType"]) ?? "일반고",
    targetUniversity: targetUni?.university_name,
    targetDepartment: targetUni?.department,
    hasMockExamData: false,
  };

  // 목표 대학 후보군 텍스트 (AI 프롬프트용)
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

  // 7. Edge Function으로 파이프라인 비동기 실행 (fire-and-forget)
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    await markFailed(
      dbClient,
      reportId,
      orderId,
      "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다."
    );
    return NextResponse.json(
      { error: "AI 서비스 설정이 올바르지 않습니다." },
      { status: 500 }
    );
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-report`;

  // Edge Function을 fire-and-forget으로 호출.
  // await하지 않음 — Edge Function은 독립 프로세스로 계속 실행됨.
  // 성공/실패는 Edge Function이 직접 DB에 기록.
  fetch(edgeFunctionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "x-secret": "skyroad-edge-fn-2026",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      reportId,
      plan,
      studentInfo,
      recordId,
      universityCandidatesText,
    }),
  }).catch((err) => {
    console.error("Edge Function 호출 오류:", err);
  });

  console.log(`리포트 ${reportId} Edge Function 디스패치 완료`);

  return NextResponse.json({
    reportId,
    status: "processing",
  });
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
