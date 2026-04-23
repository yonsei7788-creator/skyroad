/**
 * AI가 자유서술 텍스트에 삽입하는 사정관 평가 마커를 React 노드로 변환합니다.
 *
 * 마커 문법: `[[insight]] ... [[/insight]]`
 * 변환 결과: 마커 안 텍스트가 파란 형광펜(markerSky)으로 강조됨.
 *
 * - 매칭되지 않은 마커(닫힘 누락 등)는 텍스트 그대로 노출됩니다.
 *   (postprocessor에서 사전 정리되지만, 누락 시에도 텍스트 자체는 깨지지 않음)
 * - 마커 안 마커(중첩)는 처리하지 않습니다 — 먼저 만나는 `[[/insight]]`까지가 한 단위.
 */

import type { ReactNode } from "react";

import styles from "./report.module.css";
import { safeText } from "./safe-text";

const INSIGHT_PATTERN_SRC =
  "\\[\\[insight\\]\\]([\\s\\S]*?)\\[\\[/insight\\]\\]";

export const renderInsightMarkers = (value: unknown): ReactNode => {
  const text = safeText(value);
  if (!text) return text;
  if (!text.includes("[[insight]]")) return text;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  // 매번 새 정규식 인스턴스 (g 플래그는 stateful이므로 모듈 상수와 분리)
  const re = new RegExp(INSIGHT_PATTERN_SRC, "g");
  let match: RegExpExecArray | null = re.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={`ins-${match.index}`} className={styles.markerSky}>
        {match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
    match = re.exec(text);
  }
  if (parts.length === 0) return text;
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};
