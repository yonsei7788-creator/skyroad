/**
 * 본문 텍스트의 사정관 평가 표시 처리.
 *
 * 1. [[insight]] ... [[/insight]] 마커 태그를 제거합니다.
 *    (마커 안 텍스트는 그대로 노출 — 본문 형광펜에는 사용하지 않음.)
 * 2. "입학사정관"으로 시작하는 문장은 노란색 형광펜(.markerYellow)으로
 *    감싸 시각적으로 강조합니다. 문장 경계는 . ? ! … 또는 문자열 끝.
 *
 * - 매칭되지 않은 마커(닫힘 누락 등)는 텍스트 그대로 노출됩니다.
 * - 마커 안 마커(중첩)는 처리하지 않습니다 — 먼저 만나는 `[[/insight]]`까지가 한 단위.
 */

import type { ReactNode } from "react";

import styles from "./report.module.css";
import { safeText } from "./safe-text";

const INSIGHT_PATTERN = /\[\[insight\]\]([\s\S]*?)\[\[\/insight\]\]/g;

// 문장 시작 + "입학사정관" + 문장 본문 + 종결 부호(또는 끝)
// 시작 조건: 문자열 맨 앞, 또는 종결 부호 + 공백 뒤
const INSPECTOR_SENTENCE_PATTERN = /(^|[.!?…]\s+)(입학사정관[^.!?…]*[.!?…]?)/g;

const highlightInspectorSentences = (text: string): ReactNode => {
  if (!text.includes("입학사정관")) return text;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INSPECTOR_SENTENCE_PATTERN)) {
    const matchStart = match.index ?? 0;
    const [, prefix, sentence] = match;
    const sentenceStart = matchStart + (prefix?.length ?? 0);
    if (sentenceStart > lastIndex) {
      nodes.push(text.slice(lastIndex, sentenceStart));
    }
    nodes.push(
      <mark key={`ih-${key++}`} className={styles.markerYellow}>
        {sentence}
      </mark>
    );
    lastIndex = sentenceStart + sentence.length;
  }

  if (nodes.length === 0) return text;
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return <>{nodes}</>;
};

export const renderInsightMarkers = (value: unknown): ReactNode => {
  const text = safeText(value);
  if (!text) return text;
  const stripped = text.includes("[[insight]]")
    ? text.replace(INSIGHT_PATTERN, "$1")
    : text;
  return highlightInspectorSentences(stripped);
};
