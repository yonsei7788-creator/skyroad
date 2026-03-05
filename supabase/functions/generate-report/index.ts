/**
 * Supabase Edge Function: generate-report
 *
 * AI 리포트 생성 파이프라인을 Supabase Edge Function에서 실행한다.
 * Vercel Hobby 타임아웃(10초) 제약을 우회하기 위해
 * 기존 /api/reports/generate에서 파이프라인 실행 부분을 이전.
 *
 * 호출: Next.js API Route → Edge Function (fire-and-forget 스타일)
 * 인증: Authorization Bearer 헤더에 service_role key
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Pipeline imports (relative paths from supabase/functions/generate-report/)
import { loadRecordData } from "../../../libs/report/pipeline/load-record.ts";
import { preprocess } from "../../../libs/report/pipeline/preprocessor.ts";
import { orchestrate } from "../../../libs/report/pipeline/orchestrator.ts";
import { postprocess } from "../../../libs/report/pipeline/postprocessor.ts";
import { createGeminiClient } from "../../../libs/report/pipeline/gemini-client.ts";
import type { ReportPlan, StudentInfo } from "../../../libs/report/types.ts";

// ─── CORS 헤더 ───

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
}

// ─── 유틸 ───

const updateProgress = async (
  supabase: SupabaseClient,
  reportId: string,
  progress: number,
  currentSection: string
): Promise<void> => {
  await supabase
    .from("reports")
    .update({
      ai_progress: Math.min(99, progress),
      ai_current_section: currentSection,
    })
    .eq("id", reportId);
};

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

// ─── 메인 핸들러 ───

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // 1. 환경변수
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "서버 설정 오류 (Supabase)" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: "서버 설정 오류 (Gemini API Key)" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // 2. 인증: x-secret 헤더로 공유 시크릿 검증
  const edgeFnSecret = Deno.env.get("EDGE_FUNCTION_SECRET");
  const secret = req.headers.get("x-secret");
  if (!edgeFnSecret || !secret || secret !== edgeFnSecret) {
    return new Response(JSON.stringify({ error: "인증 실패" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // 3. 요청 바디 파싱
  let payload: GenerateReportPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청 바디" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const {
    orderId,
    reportId,
    plan,
    studentInfo,
    recordId,
    universityCandidatesText,
  } = payload;

  if (!orderId || !reportId || !plan || !studentInfo || !recordId) {
    return new Response(JSON.stringify({ error: "필수 파라미터 누락" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // 4. Supabase admin client
  const dbClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 5. 파이프라인 실행
  try {
    // Phase 1: 데이터 로딩 + 전처리
    await updateProgress(dbClient, reportId, 5, "데이터 로딩");

    const recordData = await loadRecordData(dbClient, recordId);
    const { data, texts } = preprocess(recordData, studentInfo, plan);

    // 목표 대학 후보군 텍스트 주입
    texts.universityCandidatesText = universityCandidatesText;

    await updateProgress(dbClient, reportId, 10, "전처리 완료");

    // Phase 2-3: AI 호출 (오케스트레이터)
    const client = createGeminiClient(geminiApiKey);

    const sections = await orchestrate(
      client,
      plan,
      studentInfo,
      texts,
      data,
      (progress) => {
        const dbProgress = Math.round(10 + progress.progress * 0.8);
        updateProgress(
          dbClient,
          reportId,
          dbProgress,
          progress.section ?? progress.phase
        ).catch(() => {});
      }
    );

    await updateProgress(dbClient, reportId, 92, "후처리 시작");

    // Phase 4: 후처리
    const result = postprocess(sections, data, studentInfo, plan, reportId);

    // 검증 오류 로깅
    const failedSections = result.validationResults.filter((r) => !r.valid);
    if (failedSections.length > 0) {
      console.warn(
        `리포트 ${reportId}: ${failedSections.length}개 섹션 검증 실패`,
        failedSections.map((s) => s.sectionId)
      );
    }
    if (result.planValidationErrors.length > 0) {
      console.warn(
        `리포트 ${reportId}: 플랜 검증 오류`,
        result.planValidationErrors
      );
    }

    // 결과 저장
    const { error: saveError } = await dbClient
      .from("reports")
      .update({
        content: result.content,
        ai_status: "completed",
        ai_progress: 100,
        ai_current_section: null,
        ai_generated_at: new Date().toISOString(),
        ai_model_version: "gemini-2.5-pro",
      })
      .eq("id", reportId);

    if (saveError) {
      console.error("리포트 저장 오류:", saveError);
      await markFailed(
        dbClient,
        reportId,
        orderId,
        "리포트 저장에 실패했습니다."
      );
      return new Response(JSON.stringify({ error: "리포트 저장 실패" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 주문 상태 업데이트
    await dbClient
      .from("orders")
      .update({ status: "analysis_complete" })
      .eq("id", orderId);

    console.log(`리포트 ${reportId} 생성 완료`);

    return new Response(JSON.stringify({ success: true, reportId }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`리포트 ${reportId} AI 파이프라인 오류:`, err);
    await markFailed(dbClient, reportId, orderId, message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
