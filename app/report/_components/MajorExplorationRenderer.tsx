import type { MajorExplorationSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface MajorExplorationRendererProps {
  data: MajorExplorationSection;
  sectionNumber: number;
}

export const MajorExplorationRenderer = ({
  data,
  sectionNumber,
}: MajorExplorationRendererProps) => {
  const suggestions = data.suggestions ?? [];
  const hasRationale = suggestions.some((s) => s.rationale);

  return (
    <>
      {/* Block 1: Header + target assessment + table */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} highlighted />

        {data.currentTargetAssessment && (
          <div className={styles.cardAccent}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>현재 목표 학과 평가</div>
            </div>
            <p className={`${styles.small} ${styles.mt6}`}>
              {safeText(data.currentTargetAssessment)}
            </p>
          </div>
        )}

        <div className={styles.avoidBreak}>
          <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
            추천 전공
          </div>
          <table
            className={styles.compactTable}
            style={{ tableLayout: "auto" }}
          >
            <thead>
              <tr>
                <th>전공</th>
                <th className={styles.tableAlignCenter}>적합도</th>
                <th>강점 매칭</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s, idx) => (
                <tr key={idx}>
                  <td className={styles.tableCellBold}>
                    <span className={styles.markerSky}>{s.major}</span>
                  </td>
                  <td
                    className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
                  >
                    {s.fitScore}%
                  </td>
                  <td>
                    <div className={styles.tagGroup}>
                      {(s.strengthMatch ?? []).slice(0, 4).map((sm, smIdx) => (
                        <span key={`sm-${idx}-${smIdx}`} className={styles.tag}>
                          {String(sm)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block 2: Detailed analysis per major */}
      {hasRationale && (
        <div>
          <div className={`${styles.h3} ${styles.mb12}`}>전공별 상세 분석</div>
          {suggestions.map((s, idx) => (
            <div key={idx} className={idx > 0 ? styles.mt16 : undefined}>
              <div className={`${styles.h3} ${styles.mb6}`}>
                {String(idx + 1).padStart(2, "0")}.{" "}
                <span className={styles.markerSky}>{s.major}</span>
                <span className={`${styles.caption} ${styles.ml8}`}>
                  적합도 {s.fitScore}%
                </span>
              </div>
              <p className={styles.small}>{safeText(s.rationale)}</p>
              {s.gapAnalysis && (
                <p className={`${styles.caption} ${styles.mt6}`}>
                  <span className={styles.emphasis}>보완 필요:</span>{" "}
                  {safeText(s.gapAnalysis)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};
