import type {
  WeaknessAnalysisSection,
  Priority,
  ReportPlan,
} from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface WeaknessAnalysisRendererProps {
  data: WeaknessAnalysisSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

/** @deprecated 영역 2개씩 묶어서 한 블록으로 — 페이지 분할 개선으로 미사용 */
const _chunkAreas = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const WeaknessAnalysisRenderer = ({
  data,
  sectionNumber,
  plan,
}: WeaknessAnalysisRendererProps) => {
  const areas = data.areas ?? [];
  const sortedAreas = [...areas];
  // 실제 유효한 값(PRIORITY_LABEL에 매칭되는 값)이 있는 경우에만 칼럼 표시
  const validPriorities: Set<string> = new Set(["high", "medium", "low"]);
  const hasUrgency = areas.some(
    (a) => a.urgency && validPriorities.has(a.urgency)
  );
  const hasPriority = areas.some(
    (a) => a.priority && validPriorities.has(a.priority)
  );

  return (
    <>
      {/* Block 1: Header + summary table (Lite에서는 요약 도표 숨김) */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        {plan !== "lite" && (
          <>
            <p className={`${styles.caption} ${styles.mb6}`}>
              아래 표는 부족한 영역별 보완 우선순위와 추천 활동 수를 요약한
              것입니다. 우선순위가 높을수록 먼저 보완하면 효과적입니다.
            </p>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>영역</th>
                  {hasPriority && (
                    <th className={styles.tableAlignCenter}>우선순위</th>
                  )}
                  {hasUrgency && (
                    <>
                      <th className={styles.tableAlignCenter}>시급도</th>
                      <th className={styles.tableAlignCenter}>효과도</th>
                    </>
                  )}
                  <th className={styles.tableAlignCenter}>추천 활동</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area, idx) => (
                  <tr key={idx}>
                    <td className={styles.tableCellBold}>{area.area}</td>
                    {hasPriority && (
                      <td className={styles.tableAlignCenter}>
                        {area.priority ? (
                          <span className={styles.tag}>
                            {PRIORITY_LABEL[area.priority]}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    {hasUrgency && (
                      <>
                        <td className={styles.tableAlignCenter}>
                          {area.urgency ? (
                            <span className={styles.tag}>
                              {PRIORITY_LABEL[area.urgency]}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={styles.tableAlignCenter}>
                          {area.effectiveness ? (
                            <span className={styles.tag}>
                              {PRIORITY_LABEL[area.effectiveness]}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    )}
                    <td className={styles.tableAlignCenter}>
                      {(area.suggestedActivities ?? []).length}개
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* 영역별 개별 블록으로 분리 → 페이지 분할 가능 */}
      {sortedAreas.map((area, idx) => (
        <div key={idx}>
          <div className={styles.h3}>
            {String(idx + 1).padStart(2, "0")}. {area.area}
          </div>
          {area.priority && (
            <div className={`${styles.caption} ${styles.mb6}`}>
              우선순위: {PRIORITY_LABEL[area.priority]}
            </div>
          )}

          <p className={styles.small}>{safeText(area.description)}</p>

          {area.evidence && (
            <p className={`${styles.caption} ${styles.mt4}`}>
              <span className={styles.emphasis}>근거:</span>{" "}
              {safeText(area.evidence)}
            </p>
          )}

          {area.competencyTag && (
            <div className={`${styles.tagGroup} ${styles.mt6}`}>
              <span className={styles.tag}>
                {area.competencyTag.subcategory}
                {area.competencyTag.assessment &&
                  ` (${area.competencyTag.assessment})`}
              </span>
              {area.recordSource && (
                <span className={styles.tag}>{area.recordSource}</span>
              )}
            </div>
          )}

          <div className={`${styles.caption} ${styles.mt8}`}>
            <span className={styles.emphasis}>추천 보완 활동:</span>
            {(area.suggestedActivities ?? []).map((activity, actIdx) => (
              <p key={actIdx} className={styles.mt4}>
                {actIdx + 1}. {activity}
              </p>
            ))}
          </div>

          {(area.executionStrategy || area.detailedStrategy) && (
            <p className={`${styles.caption} ${styles.mt6}`}>
              <span className={styles.emphasis}>실행 전략:</span>{" "}
              {safeText(area.detailedStrategy ?? area.executionStrategy)}
            </p>
          )}

          {area.subjectLinkStrategy && (
            <p className={`${styles.caption} ${styles.mt4}`}>
              <span className={styles.emphasis}>교과 연계:</span>{" "}
              {safeText(area.subjectLinkStrategy)}
            </p>
          )}
        </div>
      ))}
    </>
  );
};
