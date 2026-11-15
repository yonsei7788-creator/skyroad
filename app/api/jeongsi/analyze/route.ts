import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { verifyAdmin } from "@/app/api/admin/reports/helpers";
import { createAdminClient } from "@/libs/supabase/admin";
import { createClient } from "@/libs/supabase/server";
import { analyzeJeongsi } from "@/libs/jeongsi/engine/analyze";
import type { JeongsiInput } from "@/libs/jeongsi/types";

import {
  formatJeongsiInputError,
  JeongsiInputSchema,
} from "@/app/jeongsi/_lib/input-schema";
import { buildReportContent } from "../_lib/report-builder";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** SSE 진행률 구간 */
const PROGRESS = {
  validated: 10,
  analyzed: 40,
  built: 95,
  saved: 100,
} as const;

const sendEvent = (
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: Record<string, unknown>
) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
};

/** ai_progress 갱신. 실패해도 생성 자체는 계속 진행한다. */
const updateProgress = async (
  db: SupabaseClient,
  reportId: string,
  progress: number
): Promise<void> => {
  const { error } = await db
    .from("jeongsi_reports")
    .update({ ai_progress: progress })
    .eq("id", reportId);

  if (error) {
    console.error(`[jeongsi:${reportId}] 진행률 갱신 실패:`, error.message);
  }
};

const markFailed = async (
  db: SupabaseClient,
  reportId: string,
  message: string
): Promise<void> => {
  const { error } = await db
    .from("jeongsi_reports")
    .update({ ai_status: "failed", ai_error: message })
    .eq("id", reportId);

  if (error) {
    console.error(`[jeongsi:${reportId}] failed 마킹 실패:`, error.message);
  }
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "정시 분석 중 알 수 없는 오류가 발생했습니다.";
};

/* ============================================
   POST /api/jeongsi/analyze
   수능 성적 입력 → 엔진 계산 → AI 해설 → 저장 (SSE 스트리밍)
   ============================================ */
export const POST = async (request: NextRequest) => {
  const supabase = await createClient();

  const { userId, error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 해석할 수 없습니다." },
      { status: 400 }
    );
  }

  const parsed = JeongsiInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatJeongsiInputError(parsed.error) },
      { status: 400 }
    );
  }

  const input: JeongsiInput = parsed.data;

  // RLS 상 본인 행이라 anon 클라이언트로도 쓸 수 있지만, 스트리밍 도중
  // 세션이 만료돼도 상태 갱신이 이어지도록 service role 을 우선 쓴다.
  const adminClient = createAdminClient();
  const db = adminClient ?? supabase;

  const { data: created, error: insertError } = await db
    .from("jeongsi_reports")
    .insert({
      user_id: userId,
      input,
      ai_status: "processing",
      ai_progress: PROGRESS.validated,
    })
    .select("id, created_at")
    .single();

  if (insertError || !created) {
    console.error("[jeongsi] 리포트 생성 실패:", insertError?.message);
    return NextResponse.json(
      { error: "리포트를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  const reportId: string = created.id;
  const createdAt: string = created.created_at;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendEvent(controller, encoder, { type: "init", reportId });
        sendEvent(controller, encoder, {
          type: "progress",
          progress: PROGRESS.validated,
          stage: "validate",
        });

        // ─── 1. 엔진 계산 (대학별 환산 · 추천 · 조합) ───
        const analysis = await analyzeJeongsi(input);

        await updateProgress(db, reportId, PROGRESS.analyzed);
        sendEvent(controller, encoder, {
          type: "progress",
          progress: PROGRESS.analyzed,
          stage: "analyze",
        });

        // ─── 2. AI 해설 붙이기 ───
        const { content, modelVersion } = await buildReportContent(analysis, {
          reportId,
          createdAt,
          onProgress: (progress, stage) => {
            try {
              sendEvent(controller, encoder, {
                type: "progress",
                progress,
                stage,
              });
            } catch {
              // 클라이언트가 이미 떠난 경우 — 생성은 계속한다
            }
          },
        });

        sendEvent(controller, encoder, {
          type: "progress",
          progress: PROGRESS.built,
          stage: "build",
        });

        // ─── 3. 저장 ───
        const { error: saveError } = await db
          .from("jeongsi_reports")
          .update({
            content,
            ai_status: "completed",
            ai_progress: PROGRESS.saved,
            ai_error: null,
            ai_model_version: modelVersion,
          })
          .eq("id", reportId);

        if (saveError) {
          throw new Error(`리포트 저장에 실패했습니다: ${saveError.message}`);
        }

        sendEvent(controller, encoder, {
          type: "completed",
          reportId,
          progress: PROGRESS.saved,
        });
      } catch (error) {
        const message = toErrorMessage(error);
        console.error(`[jeongsi:${reportId}] 생성 실패:`, error);

        await markFailed(db, reportId, message);

        try {
          sendEvent(controller, encoder, {
            type: "error",
            reportId,
            error: message,
          });
        } catch {
          // 스트림이 이미 닫혔을 수 있음
        }
      } finally {
        try {
          controller.close();
        } catch {
          // 이미 닫힘
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
