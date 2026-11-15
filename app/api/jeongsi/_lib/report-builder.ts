// ============================================================
// AI 해설 레이어 어댑터
//
// 정시 리포트 콘텐츠 조립(JeongsiAnalysis → JeongsiReportContent)은
// libs/jeongsi/report/build.ts 가 담당한다. 이 파일은 analyze 라우트가
// 거기에 붙는 지점 하나로, Gemini 클라이언트 구성과 진행률 변환만 한다.
//
// buildJeongsiReport 는 두 층위로 AI 실패를 흡수한다.
//   1. geminiClient 를 넘기지 않으면 해설 호출 자체를 건너뛴다.
//   2. 섹션별 호출이 실패하면 JEONGSI_COMMENTARY_FALLBACK 문구로 수렴한다.
// 덕분에 AI 가 전부 죽어도 코드 계산값만으로 완결된 콘텐츠가 나온다.
// ============================================================

import { env } from "@/env";
import {
  buildJeongsiReport,
  JEONGSI_AI_MODEL,
  JEONGSI_COMMON_SYSTEM_PROMPT,
} from "@/libs/jeongsi/report/build";
import { createGeminiClient } from "@/libs/report/pipeline/gemini-client";
import type { JeongsiBuildStatus } from "@/libs/jeongsi/report/build";
import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";
import type { JeongsiAnalysis } from "@/libs/jeongsi/types";

/** AI 해설 단계가 차지하는 SSE 진행률 구간 */
const AI_PROGRESS_START = 40;
const AI_PROGRESS_END = 95;

export interface BuildReportOptions {
  reportId: string;
  createdAt: string;
  /** 섹션 단위 진행률 보고. progress 는 0~100 (전체 기준) */
  onProgress?: (progress: number, stage: string) => void;
}

export interface BuildReportResult {
  content: JeongsiReportContent;
  /** 해설이 실제로 생성된 파트가 하나라도 있을 때만 모델명. 아니면 null */
  modelVersion: string | null;
}

/**
 * 엔진 산출물에 AI 해설을 붙여 저장 가능한 콘텐츠를 만든다.
 *
 * GEMINI_API_KEY 가 없으면 해설 없이 코드 계산값만으로 리포트를 만든다.
 * 분석 결과를 통째로 버리는 것보다 수치만이라도 남기는 편이 낫다.
 */
export const buildReportContent = async (
  analysis: JeongsiAnalysis,
  options: BuildReportOptions
): Promise<BuildReportResult> => {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[jeongsi] GEMINI_API_KEY 미설정 — 해설 없이 생성합니다.");
  }

  const geminiClient = apiKey
    ? createGeminiClient({
        apiKeys: [apiKey],
        commonSystemPrompt: JEONGSI_COMMON_SYSTEM_PROMPT,
      })
    : undefined;

  // 파트별 해설 생성 결과를 모아 ai_model_version 판정에 쓴다.
  // 키가 있어도 전 파트가 503 으로 죽으면 해설이 0개이므로, 키 유무가
  // 아니라 "done 이 하나라도 있었는지"로 기록한다.
  const statuses: JeongsiBuildStatus[] = [];

  const content = await buildJeongsiReport(analysis, {
    geminiClient,
    reportId: options.reportId,
    createdAt: options.createdAt,
    onProgress: ({ title, percent, status }) => {
      statuses.push(status);
      const span = AI_PROGRESS_END - AI_PROGRESS_START;
      const overall = AI_PROGRESS_START + Math.round((percent / 100) * span);
      options.onProgress?.(overall, title);
    },
  });

  const fallbackCount = statuses.filter(
    (status) => status === "fallback"
  ).length;
  if (fallbackCount > 0) {
    console.warn(
      `[jeongsi:${options.reportId}] 해설 ${fallbackCount}/${statuses.length} 파트가 폴백 처리됐습니다.`
    );
  }

  const hasCommentary = statuses.includes("done");

  return { content, modelVersion: hasCommentary ? JEONGSI_AI_MODEL : null };
};
