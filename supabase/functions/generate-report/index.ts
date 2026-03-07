/**
 * Supabase Edge Function: generate-report
 *
 * Task 기반 Wave 실행으로 AI 리포트를 생성한다.
 * 각 Wave는 정확히 1개의 Gemini 호출을 실행하여 150초 wall time 안에 완료된다.
 * 완료 후 다음 Wave를 pg_net(비동기 HTTP)으로 트리거한다.
 *
 * Wave 0: 데이터 로딩 + 전처리 + 태스크 큐 생성
 * Wave 1+: 태스크 큐에서 순서대로 1개씩 실행
 * 마지막 Wave: 후처리 + content 저장
 *
 * 인증: x-secret 헤더로 공유 시크릿 검증
 */

import { createClient } from "@supabase/supabase-js";

import { createGeminiClient } from "../../../libs/report/pipeline/gemini-client.ts";
import {
  loadWaveState,
  computeNextWave,
  clearWaveState,
  verifyRunId,
} from "../../../libs/report/pipeline/wave-state.ts";
import type { WaveState } from "../../../libs/report/pipeline/wave-state.ts";
import {
  executePreprocess,
  executeTask,
} from "../../../libs/report/pipeline/wave-executor.ts";
import { postprocess } from "../../../libs/report/pipeline/postprocessor.ts";
import type { ReportPlan, StudentInfo } from "../../../libs/report/types.ts";

// ─── CORS ───

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-secret",
};

// ─── 요청 페이로드 ───

interface GenerateReportPayload {
  orderId: string;
  reportId: string;
  plan: ReportPlan;
  studentInfo: StudentInfo;
  recordId: string;
  universityCandidatesText: string;
  wave?: number;
  runId?: string;
}

// ─── 상수 ───

// Premium 최대 18 waves (preprocess + 17 tasks)
const MAX_WAVE = 20;

// ─── 유틸 ───

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

// ─── 메인 핸들러 ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // 1. 환경변수
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const edgeFnSecret = Deno.env.get("EDGE_FUNCTION_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "서버 설정 오류 (Supabase)" }, 500);
  }
  if (!geminiApiKey) {
    return jsonResponse({ error: "서버 설정 오류 (Gemini API Key)" }, 500);
  }

  // 2. 인증
  const secret = req.headers.get("x-secret");
  if (!edgeFnSecret || !secret || secret !== edgeFnSecret) {
    return jsonResponse({ error: "인증 실패" }, 401);
  }

  // 3. 요청 파싱
  let payload: GenerateReportPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "잘못된 요청 바디" }, 400);
  }

  const {
    orderId,
    reportId,
    plan,
    studentInfo,
    recordId,
    universityCandidatesText,
  } = payload;
  const wave = payload.wave ?? 0;

  if (!orderId || !reportId || !plan || !studentInfo || !recordId) {
    return jsonResponse({ error: "필수 파라미터 누락" }, 400);
  }

  // Run ID: Wave 0에서 생성, 이후 wave에서 검증
  const runId = payload.runId ?? crypto.randomUUID();

  if (wave > MAX_WAVE) {
    return jsonResponse(
      { error: `최대 Wave(${MAX_WAVE})를 초과했습니다.` },
      400
    );
  }

  // 4. 클라이언트 생성
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const gemini = createGeminiClient(geminiApiKey);

  try {
    console.log(`[report:${reportId}] Wave ${wave} 시작 (plan: ${plan})`);

    let nextState: WaveState;

    // Wave 1+: run ID 검증 (동시 실행 방지)
    if (wave > 0) {
      const isValidRun = await verifyRunId(supabase, reportId, runId);
      if (!isValidRun) {
        console.log(
          `[report:${reportId}] Wave ${wave} 중단: 다른 실행(runId)이 진행 중`
        );
        return jsonResponse({
          success: false,
          reason: "stale_run",
          wave,
        });
      }
    }

    if (wave === 0) {
      // ── Wave 0: 전처리 + 태스크 큐 생성 ──
      nextState = await executePreprocess(
        plan,
        studentInfo,
        reportId,
        supabase,
        recordId,
        universityCandidatesText,
        runId
      );
    } else {
      // ── Wave 1+: 태스크 큐에서 다음 태스크 실행 ──
      const state = await loadWaveState(supabase, reportId);
      if (!state) {
        throw new Error(`Wave ${wave}: 이전 상태를 찾을 수 없습니다.`);
      }

      const taskIndex = state.currentTaskIndex + 1;
      const taskId = state.taskQueue[taskIndex];
      if (!taskId) {
        throw new Error(`Wave ${wave}: 태스크 큐에 남은 작업이 없습니다.`);
      }

      console.log(
        `[report:${reportId}] Task: ${taskId} (${taskIndex + 1}/${state.totalTasks})`
      );

      nextState = await executeTask(
        taskId,
        gemini,
        plan,
        studentInfo,
        state,
        reportId,
        supabase
      );
    }

    console.log(`[report:${reportId}] Wave ${wave} 완료`);

    // 5. 다음 Wave 판별
    const nextWaveNum = computeNextWave(nextState);

    if (nextWaveNum !== null) {
      // ── pg_net으로 다음 Wave 비동기 트리거 ──
      const selfUrl = `${supabaseUrl}/functions/v1/generate-report`;
      const nextPayload = {
        ...payload,
        wave: nextState.lastCompletedWave + 1,
        runId,
      };

      const { error: rpcError } = await supabase.rpc("trigger_next_wave", {
        p_url: selfUrl,
        p_secret: edgeFnSecret,
        p_payload: nextPayload,
      });

      if (rpcError) {
        console.error(`[report:${reportId}] 다음 Wave 트리거 실패:`, rpcError);
        throw new Error(`다음 Wave 트리거 실패: ${rpcError.message}`);
      }

      const currentTask =
        nextState.taskQueue[nextState.currentTaskIndex] ?? "preprocess";
      console.log(
        `[report:${reportId}] 다음 Wave 트리거 완료 (다음 태스크: ${nextState.taskQueue[nextState.currentTaskIndex + 1] ?? "finalize"})`
      );

      return jsonResponse({
        success: true,
        reportId,
        wave,
        task: currentTask,
        nextWave: nextState.lastCompletedWave + 1,
      });
    }

    // ── 마지막 태스크: 후처리 + 결과 저장 ──

    const sections = nextState.completedSections ?? [];
    const result = postprocess(
      sections,
      nextState.preprocessedData!,
      studentInfo,
      plan,
      reportId
    );

    const failedSections = result.validationResults.filter((r) => !r.valid);
    if (failedSections.length > 0) {
      console.warn(
        `[report:${reportId}] ${failedSections.length}개 섹션 검증 실패:`,
        failedSections.map((s) => s.sectionId)
      );
    }

    const { error: saveError } = await supabase
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

    if (saveError) {
      throw new Error(`리포트 저장 실패: ${saveError.message}`);
    }

    await supabase
      .from("orders")
      .update({ status: "analysis_complete" })
      .eq("id", orderId);

    console.log(`[report:${reportId}] 생성 완료! (총 ${wave + 1} waves)`);
    return jsonResponse({ success: true, reportId, wave, final: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[report:${reportId}] Wave ${wave} 오류:`, message);

    await supabase
      .from("reports")
      .update({
        ai_status: "failed",
        ai_error: message,
        ai_current_wave: wave,
      })
      .eq("id", reportId);

    await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);

    return jsonResponse({ error: message, wave }, 500);
  }
});
