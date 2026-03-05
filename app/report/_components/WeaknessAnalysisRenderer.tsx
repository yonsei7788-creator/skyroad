import type { WeaknessAnalysisSection, Priority } from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface WeaknessAnalysisRendererProps {
  data: WeaknessAnalysisSection;
  sectionNumber: number;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

/** 영역 2개씩 묶어서 한 블록으로 */
const chunkAreas = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const WeaknessAnalysisRenderer = ({
  data,
  sectionNumber,
}: WeaknessAnalysisRendererProps) => {
  const areaChunks = chunkAreas(data.areas, 2);

  return (
    <>
      {/* Block 1: Header + summary table */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>영역</th>
              <th className={styles.tableAlignCenter}>우선순위</th>
              {data.areas[0]?.urgency && (
                <>
                  <th className={styles.tableAlignCenter}>시급도</th>
                  <th className={styles.tableAlignCenter}>효과도</th>
                </>
              )}
              <th className={styles.tableAlignCenter}>활동 수</th>
            </tr>
          </thead>
          <tbody>
            {data.areas.map((area, idx) => (
              <tr key={idx}>
                <td className={styles.tableCellBold}>{area.area}</td>
                <td className={styles.tableAlignCenter}>
                  {area.priority ? (
                    <span className={styles.tag}>
                      {PRIORITY_LABEL[area.priority]}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                {data.areas[0]?.urgency && (
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
                  {area.suggestedActivities.length}개
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 영역 2개씩 묶어서 한 페이지 단위 */}
      {areaChunks.map((chunk, chunkIdx) => (
        <div key={chunkIdx}>
          {chunk.map((area, localIdx) => {
            const globalIdx = chunkIdx * 2 + localIdx;
            return (
              <div
                key={globalIdx}
                className={localIdx > 0 ? styles.mt24 : undefined}
              >
                <div className={styles.h3}>
                  {String(globalIdx + 1).padStart(2, "0")}. {area.area}
                </div>
                {area.priority && (
                  <div className={`${styles.caption} ${styles.mb6}`}>
                    우선순위: {PRIORITY_LABEL[area.priority]}
                  </div>
                )}

                <p className={styles.small}>{area.description}</p>

                {area.evidence && (
                  <p className={`${styles.caption} ${styles.mt4}`}>
                    <span className={styles.emphasis}>근거:</span>{" "}
                    {area.evidence}
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
                  {area.suggestedActivities.map((activity, actIdx) => (
                    <p key={actIdx} className={styles.mt4}>
                      {actIdx + 1}. {activity}
                    </p>
                  ))}
                </div>

                {(area.executionStrategy || area.detailedStrategy) && (
                  <p className={`${styles.caption} ${styles.mt6}`}>
                    <span className={styles.emphasis}>실행 전략:</span>{" "}
                    {area.detailedStrategy ?? area.executionStrategy}
                  </p>
                )}

                {area.subjectLinkStrategy && (
                  <p className={`${styles.caption} ${styles.mt4}`}>
                    <span className={styles.emphasis}>교과 연계:</span>{" "}
                    {area.subjectLinkStrategy}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
};
