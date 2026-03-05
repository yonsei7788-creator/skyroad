import type { OverallAssessmentSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface OverallAssessmentRendererProps {
  data: OverallAssessmentSection;
  sectionNumber: number;
}

const FILL_LABEL = (rate: number) =>
  rate >= 85 ? "우수" : rate >= 70 ? "양호" : rate >= 50 ? "보통" : "미흡";

export const OverallAssessmentRenderer = ({
  data,
  sectionNumber,
}: OverallAssessmentRendererProps) => {
  return (
    <div>
      <SectionHeader number={sectionNumber} title={data.title} />

      <div className={styles.h3}>항목별 기록 분량</div>
      <div className={`${styles.caption} ${styles.mb12}`}>
        전체 충실도 {data.overallFillRate}%
      </div>
      <table className={styles.compactTable}>
        <thead>
          <tr>
            <th>항목</th>
            <th className={styles.tableAlignCenter}>충실도</th>
            <th className={styles.tableAlignCenter}>등급</th>
            <th>실제 / 최대</th>
          </tr>
        </thead>
        <tbody>
          {data.volumeAnalysis.map((item) => (
            <tr key={item.category}>
              <td className={styles.tableCellBold}>{item.category}</td>
              <td
                className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
              >
                {item.fillRate}%
              </td>
              <td className={styles.tableAlignCenter}>
                <span className={styles.tag}>{FILL_LABEL(item.fillRate)}</span>
              </td>
              <td className={styles.caption}>
                {item.actualVolume} / {item.maxCapacity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.fillRateComparison && (
        <>
          <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
            충실도 벤치마크 비교
          </div>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th className={styles.tableAlignCenter}>내 충실도</th>
                <th className={styles.tableAlignCenter}>지원적정 평균</th>
                <th className={styles.tableAlignCenter}>전체 평균</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
                >
                  {data.fillRateComparison.myValue}%
                </td>
                <td className={styles.tableAlignCenter}>
                  {data.fillRateComparison.targetRangeAvg}%
                </td>
                <td className={styles.tableAlignCenter}>
                  {data.fillRateComparison.overallAvg}%
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {data.competencyProgressBars &&
        data.competencyProgressBars.length > 0 && (
          <>
            <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
              역량별 기록 수준
            </div>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>역량</th>
                  <th className={styles.tableAlignCenter}>점수</th>
                  <th className={styles.tableAlignCenter}>평가</th>
                </tr>
              </thead>
              <tbody>
                {data.competencyProgressBars.map((bar) => (
                  <tr key={bar.category}>
                    <td className={styles.tableCellBold}>{bar.label}</td>
                    <td
                      className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
                    >
                      {bar.score} / {bar.maxScore}
                    </td>
                    <td className={styles.tableAlignCenter}>
                      <span className={styles.tag}>{bar.assessment}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

      {data.areaGrades && data.areaGrades.length > 0 && (
        <>
          <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
            영역별 등급
          </div>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>영역</th>
                <th className={styles.tableAlignCenter}>등급</th>
                <th>요약</th>
              </tr>
            </thead>
            <tbody>
              {data.areaGrades.map((ag) => (
                <tr key={ag.area}>
                  <td className={styles.tableCellBold}>{ag.area}</td>
                  <td className={styles.tableAlignCenter}>
                    <span className={styles.tag}>{ag.grade}</span>
                  </td>
                  <td className={styles.small}>{ag.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className={`${styles.card} ${styles.mt20}`}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>경쟁력 종합 요약</div>
          {data.overallCompetitivenessScore !== undefined && (
            <span className={styles.emphasis}>
              {data.overallCompetitivenessScore}점
            </span>
          )}
        </div>
        <p className={`${styles.small} ${styles.mt8}`}>
          {data.competitivenessSum}
        </p>
        <p className={`${styles.small} ${styles.mt6}`}>
          <span className={styles.emphasis}>질 평가:</span>{" "}
          {data.qualityAssessment}
        </p>
      </div>

      <div className={`${styles.aiCommentary} ${styles.mt16}`}>
        <div className={styles.aiCommentaryIcon}>AI</div>
        <div className={styles.aiCommentaryContent}>
          <div className={styles.aiCommentaryLabel}>최종 종합 의견</div>
          <div className={styles.aiCommentaryText}>{data.finalComment}</div>
        </div>
      </div>
    </div>
  );
};
