import type { AttendanceAnalysisSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface AttendanceAnalysisRendererProps {
  data: AttendanceAnalysisSection;
  sectionNumber: number;
}

const RATING_CLASS: Record<string, string> = {
  "\uC6B0\uC218": styles.ratingExcellent,
  "\uC591\uD638": styles.ratingGood,
  "\uC8FC\uC758": styles.ratingAverage,
  "\uACBD\uACE0": styles.ratingWeak,
};

export const AttendanceAnalysisRenderer = ({
  data,
  sectionNumber,
}: AttendanceAnalysisRendererProps) => {
  return (
    <>
      {/* Block 1: Header + overall rating + yearly table */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.cardAccent}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>출결 종합 평가</div>
            <span className={RATING_CLASS[data.overallRating]}>
              {data.overallRating || "—"}
            </span>
          </div>
        </div>

        <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
          학년별 출결 현황
        </div>
        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>학년</th>
              <th className={styles.tableAlignCenter}>수업일수</th>
              <th className={styles.tableAlignCenter}>총 결석</th>
              <th className={styles.tableAlignCenter}>질병</th>
              <th className={styles.tableAlignCenter}>미인정</th>
              <th className={styles.tableAlignCenter}>기타</th>
              <th className={styles.tableAlignCenter}>지각</th>
              <th className={styles.tableAlignCenter}>조퇴</th>
              <th className={styles.tableAlignCenter}>특기사항</th>
            </tr>
          </thead>
          <tbody>
            {(data.summaryByYear ?? []).map((row) => (
              <tr key={row.year}>
                <td className={styles.tableCellBold}>{row.year}학년</td>
                <td className={styles.tableAlignCenter}>
                  {row.totalDays ?? "-"}
                </td>
                <td className={styles.tableAlignCenter}>{row.totalAbsence}</td>
                <td className={styles.tableAlignCenter}>{row.illness}</td>
                <td className={styles.tableAlignCenter}>{row.unauthorized}</td>
                <td className={styles.tableAlignCenter}>{row.etc}</td>
                <td className={styles.tableAlignCenter}>{row.lateness}</td>
                <td className={styles.tableAlignCenter}>{row.earlyLeave}</td>
                <td className={styles.tableAlignCenter}>{row.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.comparisonData && (
          <>
            <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
              출결 벤치마크 비교
            </div>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th className={styles.tableAlignCenter}>내 출결(결석일)</th>
                  <th className={styles.tableAlignCenter}>지원적정 평균</th>
                  <th className={styles.tableAlignCenter}>전체 평균</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
                  >
                    {data.comparisonData.myValue}일
                  </td>
                  <td className={styles.tableAlignCenter}>
                    {data.comparisonData.targetRangeAvg}일
                  </td>
                  <td className={styles.tableAlignCenter}>
                    {data.comparisonData.overallAvg}일
                  </td>
                </tr>
              </tbody>
            </table>
            {data.comparisonData.estimationBasis && (
              <p className={`${styles.caption} ${styles.mt4}`}>
                * {safeText(data.comparisonData.estimationBasis)}
              </p>
            )}
          </>
        )}
      </div>

      {/* Block 2: Impact analysis + improvement */}
      <div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>출결 영향 분석</div>
          </div>

          {data.integrityScore !== undefined && (
            <p className={`${styles.body} ${styles.mt8}`}>
              <span className={styles.emphasis}>성실성 점수:</span>{" "}
              {data.integrityScore}점 / 100점
            </p>
          )}

          <p className={`${styles.body} ${styles.mt8}`}>
            <span className={styles.emphasis}>입시 영향:</span>{" "}
            {safeText(data.impactAnalysis)}
          </p>
          <p className={`${styles.body} ${styles.mt8}`}>
            <span className={styles.emphasis}>성실성 기여:</span>{" "}
            {safeText(data.integrityContribution)}
          </p>

          {data.estimatedDeduction && (
            <p className={`${styles.body} ${styles.mt8}`}>
              <span className={styles.emphasis}>
                추정 감점: {data.estimatedDeduction.deductionPoints}점
              </span>{" "}
              — {safeText(data.estimatedDeduction.rationale)}
            </p>
          )}
        </div>

        {data.improvementAdvice && (
          <div
            className={`${styles.callout} ${styles.calloutCaution} ${styles.mt16}`}
          >
            <div className={styles.calloutContent}>
              <span className={styles.emphasis}>개선 방향:</span>{" "}
              {safeText(data.improvementAdvice)}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
