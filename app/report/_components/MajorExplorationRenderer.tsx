import type { MajorExplorationSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface MajorExplorationRendererProps {
  data: MajorExplorationSection;
  sectionNumber: number;
}

export const MajorExplorationRenderer = ({
  data,
  sectionNumber,
}: MajorExplorationRendererProps) => {
  return (
    <div>
      <SectionHeader number={sectionNumber} title={data.title} />

      {data.currentTargetAssessment && (
        <div className={styles.cardAccent}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>현재 목표 학과 평가</div>
          </div>
          <p className={`${styles.small} ${styles.mt6}`}>
            {data.currentTargetAssessment}
          </p>
        </div>
      )}

      <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
        추천 전공
      </div>
      <table className={styles.compactTable}>
        <thead>
          <tr>
            <th>전공</th>
            {data.suggestions[0]?.university && <th>대학</th>}
            <th className={styles.tableAlignCenter}>적합도</th>
            <th>강점 매칭</th>
          </tr>
        </thead>
        <tbody>
          {data.suggestions.map((s, idx) => (
            <tr key={idx}>
              <td className={styles.tableCellBold}>{s.major}</td>
              {data.suggestions[0]?.university && (
                <td className={styles.small}>{s.university ?? "—"}</td>
              )}
              <td
                className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
              >
                {s.fitScore}%
              </td>
              <td>
                <div className={styles.tagGroup}>
                  {s.strengthMatch.map((sm) => (
                    <span key={sm} className={styles.tag}>
                      {sm}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.suggestions.some((s) => s.rationale) && (
        <>
          <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
            전공별 상세 분석
          </div>
          {data.suggestions.map((s, idx) => (
            <div key={idx} className={idx > 0 ? styles.mt16 : undefined}>
              <div className={`${styles.h3} ${styles.mb6}`}>
                {String(idx + 1).padStart(2, "0")}. {s.major}
                <span className={`${styles.caption} ${styles.ml8}`}>
                  적합도 {s.fitScore}%
                </span>
              </div>
              <p className={styles.small}>{s.rationale}</p>
              {s.gapAnalysis && (
                <p className={`${styles.caption} ${styles.mt6}`}>
                  <span className={styles.emphasis}>보완 필요:</span>{" "}
                  {s.gapAnalysis}
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
