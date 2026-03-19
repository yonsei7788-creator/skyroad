import type { ActivityAnalysisSection, ReportPlan } from "@/libs/report/types";
import type React from "react";

import { ReportBadge } from "./ReportBadge";
import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface ActivityAnalysisRendererProps {
  data: ActivityAnalysisSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

const NO_DATA_MSG = "기록이 없어 평가할 수 없습니다.";

export const ActivityAnalysisRenderer = ({
  data,
  sectionNumber,
}: ActivityAnalysisRendererProps) => {
  const activities = data.activities ?? [];

  return (
    <>
      {/* Each activity type split into blocks for pagination */}
      {activities.flatMap((activity, actIdx) => {
        const blocks: React.ReactNode[] = [];

        /* Main block: yearly analysis table + comment */
        blocks.push(
          <div key={`${activity.type}-main`}>
            {/* First activity gets the section header */}
            {actIdx === 0 && (
              <>
                <SectionHeader number={sectionNumber} title={data.title} />
                <div className={styles.mb16}>
                  <span className={styles.tag}>
                    {data.curriculumVersion === "2015"
                      ? "2015 개정 교육과정 (4영역)"
                      : "2022 개정 교육과정 (3영역)"}
                  </span>
                </div>
              </>
            )}

            <h3 className={`${styles.h3} ${styles.mb12}`}>{activity.type}</h3>

            {(activity.yearlyAnalysis ?? []).map((year) => (
              <div key={year.year} className={styles.activityYearCard}>
                <div className={styles.activityYearHeader}>
                  <span className={styles.tableCellBold}>{year.year}학년</span>
                  <ReportBadge rating={year.rating} />
                </div>
                <p className={styles.small}>{safeText(year.summary)}</p>
                {(year.competencyTags ?? []).length > 0 && (
                  <div className={`${styles.tagGroup} ${styles.mt6}`}>
                    {(year.competencyTags ?? []).map((tag, idx) => (
                      <span key={idx} className={styles.tag}>
                        {tag.subcategory}
                      </span>
                    ))}
                  </div>
                )}
                {year.ratingRationale && (
                  <p className={`${styles.ratingRationale} ${styles.mt6}`}>
                    {safeText(year.ratingRationale)}
                  </p>
                )}
              </div>
            ))}

            {activity.volumeAssessment &&
              activity.overallComment !== NO_DATA_MSG && (
                <p className={`${styles.small} ${styles.mt12}`}>
                  <span className={styles.emphasis}>기록 분량:</span>{" "}
                  {safeText(activity.volumeAssessment)}
                </p>
              )}

            {activity.overallComment &&
              activity.overallComment !== NO_DATA_MSG && (
                <p className={`${styles.small} ${styles.mt12}`}>
                  {safeText(activity.overallComment)}
                </p>
              )}

            {!(activity.keyActivities && activity.keyActivities.length > 0) &&
              activity.improvementDirection &&
              activity.overallComment !== NO_DATA_MSG && (
                <div
                  className={`${styles.callout} ${styles.calloutCaution} ${styles.mt16}`}
                >
                  <div className={styles.calloutContent}>
                    <span className={styles.emphasis}>개선 방향:</span>{" "}
                    {safeText(activity.improvementDirection)}
                  </div>
                </div>
              )}
          </div>
        );

        /* Key activities — each activity as its own block for pagination */
        if (activity.keyActivities && activity.keyActivities.length > 0) {
          const kas = activity.keyActivities;
          for (let i = 0; i < kas.length; i++) {
            const ka = kas[i];
            const isFirst = i === 0;
            const isLast = i === kas.length - 1;

            blocks.push(
              <div key={`${activity.type}-ka-${i}`}>
                {isFirst && (
                  <div className={`${styles.overline} ${styles.mb8}`}>
                    {activity.type} — 핵심 활동
                  </div>
                )}
                <div className={styles.keyActivityCard}>
                  <div className={styles.keyActivityHeader}>
                    <span className={styles.keyActivityNo}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.tableCellBold}>{ka.activity}</span>
                  </div>
                  <p className={styles.small}>{safeText(ka.evaluation)}</p>
                  {(ka.competencyTags ?? []).length > 0 && (
                    <div className={`${styles.tagGroup} ${styles.mt6}`}>
                      {(ka.competencyTags ?? []).map((tag, tagIdx) => (
                        <span key={tagIdx} className={styles.tag}>
                          {tag.subcategory}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isLast && activity.improvementDirection && (
                  <div
                    className={`${styles.callout} ${styles.calloutCaution} ${styles.mt16}`}
                  >
                    <div className={styles.calloutContent}>
                      <span className={styles.emphasis}>개선 방향:</span>{" "}
                      {safeText(activity.improvementDirection)}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        }

        return blocks;
      })}

      {/* 기록 없는 활동 영역은 렌더링하지 않음 */}

      {/* Final Block: Overall AI commentary */}
      <div>
        <div className={`${styles.aiCommentary} ${styles.mt20}`}>
          <div className={styles.aiCommentaryIcon}>✦</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>창체 종합 평가</div>
            <div className={styles.aiCommentaryText}>
              {safeText(data.overallComment)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
