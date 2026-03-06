import type { ActivityAnalysisSection, ReportPlan } from "@/libs/report/types";

import { ReportBadge } from "./ReportBadge";
import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface ActivityAnalysisRendererProps {
  data: ActivityAnalysisSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

export const ActivityAnalysisRenderer = ({
  data,
  sectionNumber,
}: ActivityAnalysisRendererProps) => {
  return (
    <>
      {/* Block 1: SectionHeader + curriculum version tag */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.mb16}>
          <span className={styles.tag}>
            {data.curriculumVersion === "2015"
              ? "2015 개정 교육과정 (4영역)"
              : "2022 개정 교육과정 (3영역)"}
          </span>
        </div>
      </div>

      {/* Each activity type split into blocks for pagination */}
      {data.activities.flatMap((activity) => {
        const hasExtras =
          (activity.keyActivities && activity.keyActivities.length > 0) ||
          activity.improvementDirection;

        const mainBlock = (
          <div key={`${activity.type}-main`}>
            {/* Activity type header */}
            <h3 className={`${styles.h3} ${styles.mt16} ${styles.mb12}`}>
              {activity.type}
            </h3>

            {/* Yearly analysis table */}
            <table className={styles.tableCompact}>
              <thead>
                <tr>
                  <th className={styles.tableAlignCenter}>학년</th>
                  <th>분석 내용</th>
                  <th className={styles.tableAlignCenter}>평가</th>
                </tr>
              </thead>
              <tbody>
                {activity.yearlyAnalysis.map((year) => (
                  <tr key={year.year}>
                    <td
                      className={`${styles.tableCellBold} ${styles.tableAlignCenter}`}
                    >
                      {year.year}학년
                    </td>
                    <td>
                      <span className={styles.body}>{year.summary}</span>
                      {year.competencyTags.length > 0 && (
                        <div className={`${styles.tagGroup} ${styles.mt6}`}>
                          {year.competencyTags.map((tag, idx) => (
                            <span key={idx} className={styles.tag}>
                              {tag.subcategory}
                              {tag.assessment && ` (${tag.assessment})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={styles.tableAlignCenter}>
                      <ReportBadge rating={year.rating} />
                      {year.ratingRationale && (
                        <p className={styles.ratingRationale}>
                          {year.ratingRationale}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Volume assessment */}
            {activity.volumeAssessment && (
              <p className={`${styles.small} ${styles.mt12}`}>
                <span className={styles.emphasis}>기록 분량:</span>{" "}
                {activity.volumeAssessment}
              </p>
            )}

            {/* Overall comment per activity */}
            <p className={`${styles.body} ${styles.mt12}`}>
              {activity.overallComment}
            </p>

            {/* If no extras, include nothing else */}
            {!hasExtras && activity.improvementDirection && (
              <div
                className={`${styles.callout} ${styles.calloutCaution} ${styles.mt16}`}
              >
                <div className={styles.calloutContent}>
                  <span className={styles.emphasis}>개선 방향:</span>{" "}
                  {activity.improvementDirection}
                </div>
              </div>
            )}
          </div>
        );

        if (!hasExtras) return [mainBlock];

        const extrasBlock = (
          <div key={`${activity.type}-extras`}>
            {/* Key activities (Standard+) */}
            {activity.keyActivities && activity.keyActivities.length > 0 && (
              <div>
                <div className={`${styles.overline} ${styles.mb8}`}>
                  {activity.type} — 핵심 활동
                </div>
                <table className={styles.tableCompact}>
                  <thead>
                    <tr>
                      <th className={styles.tableAlignCenter}>No.</th>
                      <th>활동 내용</th>
                      <th>평가</th>
                      <th>역량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.keyActivities.map((ka, idx) => (
                      <tr key={idx}>
                        <td
                          className={`${styles.tableCellBold} ${styles.tableAlignCenter}`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className={styles.tableCellBold}>{ka.activity}</td>
                        <td>
                          <span className={styles.small}>{ka.evaluation}</span>
                        </td>
                        <td>
                          <div className={styles.tagGroup}>
                            {ka.competencyTags.map((tag, tagIdx) => (
                              <span key={tagIdx} className={styles.tag}>
                                {tag.subcategory}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Improvement direction (Standard+) */}
            {activity.improvementDirection && (
              <div
                className={`${styles.callout} ${styles.calloutCaution} ${styles.mt16}`}
              >
                <div className={styles.calloutContent}>
                  <span className={styles.emphasis}>개선 방향:</span>{" "}
                  {activity.improvementDirection}
                </div>
              </div>
            )}
          </div>
        );

        return [mainBlock, extrasBlock];
      })}

      {/* Final Block: Overall AI commentary */}
      <div>
        <div className={`${styles.aiCommentary} ${styles.mt20}`}>
          <div className={styles.aiCommentaryIcon}>AI</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>창체 종합 평가</div>
            <div className={styles.aiCommentaryText}>{data.overallComment}</div>
          </div>
        </div>
      </div>
    </>
  );
};
