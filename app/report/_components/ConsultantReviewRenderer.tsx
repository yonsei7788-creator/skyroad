import type { ConsultantReviewSection, ReportPlan } from "@/libs/report/types";

import styles from "./report.module.css";
import { renderInsightMarkers } from "./insight-marker";
import { SectionHeader } from "./SectionHeader";

interface ConsultantReviewRendererProps {
  data: ConsultantReviewSection;
  sectionNumber: number;
  plan?: ReportPlan;
  isGraduate?: boolean;
}

export const ConsultantReviewRenderer = ({
  data,
  sectionNumber,
  plan,
  isGraduate,
}: ConsultantReviewRendererProps) => {
  const displayTitle = data.title || "전임 컨설턴트 2차 검수";

  return (
    <>
      {/* 각 항목을 개별 블록으로 — AutoPaginatedSection이 항목 단위로 페이지 분리 */}
      <div>
        <SectionHeader
          number={sectionNumber}
          title={`★ ${displayTitle}`}
          highlighted
        />

        <div className={styles.mt12}>
          <div className={styles.h3}>
            <span className={styles.markerSky}>
              성적 및 교과 이수 노력 평가
            </span>
          </div>
          <p className={styles.small}>
            {renderInsightMarkers(data.gradeAnalysis)}
          </p>
        </div>
      </div>

      <div>
        <div className={styles.h3}>
          <span className={styles.markerSky}>전공 관련 교과 성취도</span>
        </div>
        <p className={styles.small}>
          {renderInsightMarkers(data.courseEffort)}
        </p>
      </div>

      <div>
        <div className={styles.h3}>
          <span className={styles.markerSky}>전형 전략 방향</span>
        </div>
        <p className={styles.small}>
          {renderInsightMarkers(data.admissionStrategy)}
        </p>
      </div>

      {data.completionDirection && !isGraduate && (
        <div>
          <div className={styles.h3}>
            <span className={styles.markerSky}>생기부 마무리 방향</span>
          </div>
          <p className={styles.small}>
            {renderInsightMarkers(data.completionDirection)}
          </p>
        </div>
      )}

      <div>
        <div className={styles.h3}>
          <span className={styles.markerSky}>종합 조언</span>
        </div>
        <p className={`${styles.small} ${styles.emphasis}`}>
          {renderInsightMarkers(data.finalAdvice)}
        </p>
      </div>

      {data.evaluationGuide && (
        <div>
          <div className={`${styles.h3} ${styles.mt20}`}>
            <span className={styles.markerYellow}>
              입학사정관은 이렇게 평가합니다
            </span>
          </div>

          <div className={styles.card}>
            <div className={styles.tableCellBold}>전공 적합성</div>
            <p className={styles.small}>
              {renderInsightMarkers(data.evaluationGuide.majorFit)}
            </p>
          </div>

          <div className={`${styles.card} ${styles.mt12}`}>
            <div className={styles.tableCellBold}>학업 역량</div>
            <p className={styles.small}>
              {renderInsightMarkers(data.evaluationGuide.academicAbility)}
            </p>
          </div>

          <div className={`${styles.card} ${styles.mt12}`}>
            <div className={styles.tableCellBold}>탐구 역량</div>
            <p className={styles.small}>
              {renderInsightMarkers(data.evaluationGuide.inquiryAbility)}
            </p>
          </div>

          <div className={`${styles.card} ${styles.mt12}`}>
            <div className={styles.tableCellBold}>발전 가능성</div>
            <p className={styles.small}>
              {renderInsightMarkers(data.evaluationGuide.growthPotential)}
            </p>
          </div>

          <div
            className={`${styles.callout} ${styles.calloutCaution} ${styles.mt16}`}
          >
            <div className={styles.calloutContent}>
              <span className={styles.emphasis}>핵심 인사이트:</span>{" "}
              {renderInsightMarkers(data.evaluationGuide.keyInsights)}
            </div>
          </div>

          {data.evaluationGuide.analysisMethodology && (
            <div className={`${styles.aiCommentary} ${styles.mt16}`}>
              <div className={styles.aiCommentaryIcon}>✦</div>
              <div className={styles.aiCommentaryContent}>
                <div className={styles.aiCommentaryLabel}>분석 방법론</div>
                <div className={styles.aiCommentaryText}>
                  {renderInsightMarkers(
                    data.evaluationGuide.analysisMethodology
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
