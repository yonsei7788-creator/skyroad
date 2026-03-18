import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { env } from "@/env";
import type { ReportPlan, StudentInfo } from "@/libs/report/types";
import { createGeminiClient } from "@/libs/report/pipeline/gemini-client";
import { executeTask } from "@/libs/report/pipeline/wave-executor";
import { loadWaveState } from "@/libs/report/pipeline/wave-state";
import { postprocess } from "@/libs/report/pipeline/postprocessor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RunTaskBody {
  taskId: string;
  plan: ReportPlan;
  studentInfo: StudentInfo;
  orderId: string;
}

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: reportId } = await params;
  const supabase = await createClient();

  // 인증 확인
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

  let body: RunTaskBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { taskId, plan, studentInfo, orderId } = body;

  if (!taskId || !plan || !studentInfo || !orderId) {
    return NextResponse.json(
      { error: "필수 파라미터가 누락되었습니다." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  // Wave State 로드
  const waveState = await loadWaveState(dbClient, reportId);
  if (!waveState) {
    return NextResponse.json(
      { error: "파이프라인 상태를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Gemini 클라이언트 생성
  const geminiApiKey = env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "AI 서비스 설정이 올바르지 않습니다." },
      { status: 500 }
    );
  }

  const geminiClient = createGeminiClient(geminiApiKey);

  try {
    console.log(
      `[report:${reportId}] 태스크 시작: ${taskId} (현재 index: ${waveState.currentTaskIndex}, sections: ${waveState.completedSections?.length ?? 0})`
    );

    const nextState = await executeTask(
      taskId,
      geminiClient,
      plan,
      studentInfo,
      waveState,
      reportId,
      dbClient
    );

    console.log(
      `[report:${reportId}] 태스크 완료: ${taskId} (index: ${nextState.currentTaskIndex}, sections: ${nextState.completedSections?.length ?? 0})`
    );

    const isLastTask = nextState.currentTaskIndex >= nextState.totalTasks - 1;

    // 마지막 태스크: 후처리 + 결과 저장
    if (isLastTask) {
      const sections = nextState.completedSections ?? [];
      console.log(
        `[report:${reportId}] 마지막 태스크! 총 ${sections.length}개 섹션으로 후처리 시작`
      );
      const result = postprocess(
        sections,
        nextState.preprocessedData!,
        studentInfo,
        plan,
        reportId,
        nextState.preprocessedTexts?.universityCandidatesText
      );

      await dbClient
        .from("reports")
        .update({
          content: result.content as unknown as Record<string, unknown>,
          ai_status: "completed",
          ai_progress: 100,
          ai_current_section: null,
          ai_wave_state: null,
          ai_current_wave: null,
          ai_generated_at: new Date().toISOString(),
          ai_model_version: "gemini-2.5-pro",
        })
        .eq("id", reportId);

      await dbClient
        .from("orders")
        .update({ status: "analysis_complete" })
        .eq("id", orderId);

      return NextResponse.json({
        taskId,
        progress: 100,
        completed: true,
      });
    }

    const progress = Math.min(
      98,
      Math.round(((nextState.currentTaskIndex + 1) / nextState.totalTasks) * 98)
    );

    return NextResponse.json({
      taskId,
      progress,
      completed: false,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "태스크 실행 중 오류가 발생했습니다.";
    console.error(`[report:${reportId}] 태스크 ${taskId} 오류:`, message);

    await dbClient
      .from("reports")
      .update({
        ai_status: "failed",
        ai_error: message,
      })
      .eq("id", reportId);

    await dbClient.from("orders").update({ status: "paid" }).eq("id", orderId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
};
