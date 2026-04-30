/**
 * AI가 자유서술 텍스트에 삽입하는 사정관 평가 마커를 처리합니다.
 *
 * 마커 문법: `[[insight]] ... [[/insight]]`
 * 변환 결과: 마커 태그만 제거하고 안의 텍스트를 그대로 본문에 노출
 * (본문 형광펜 표시는 사용하지 않음 — 제목 영역만 형광펜 유지).
 *
 * - 매칭되지 않은 마커(닫힘 누락 등)는 텍스트 그대로 노출됩니다.
 *   (postprocessor에서 사전 정리되지만, 누락 시에도 텍스트 자체는 깨지지 않음)
 * - 마커 안 마커(중첩)는 처리하지 않습니다 — 먼저 만나는 `[[/insight]]`까지가 한 단위.
 */

import type { ReactNode } from "react";

import { safeText } from "./safe-text";

const INSIGHT_PATTERN = /\[\[insight\]\]([\s\S]*?)\[\[\/insight\]\]/g;

export const renderInsightMarkers = (value: unknown): ReactNode => {
  const text = safeText(value);
  if (!text) return text;
  if (!text.includes("[[insight]]")) return text;
  return text.replace(INSIGHT_PATTERN, "$1");
};
