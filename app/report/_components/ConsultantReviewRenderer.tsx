import type { ConsultantReviewSection, ReportPlan } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
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
        <SectionHeader number={sectionNumber} title={`★ ${displayTitle}`} />

        <div className={styles.mt12}>
          <div className={styles.h3}>성적 및 교과 이수 노력 평가</div>
          <p className={styles.small}>{safeText(data.gradeAnalysis)}</p>
        </div>
      </div>

      <div>
        <div className={styles.h3}>전공 관련 교과 성취도</div>
        <p className={styles.small}>{safeText(data.courseEffort)}</p>
      </div>

      <div>
        <div className={styles.h3}>전형 전략 방향</div>
        <p className={styles.small}>{safeText(data.admissionStrategy)}</p>
      </div>

      {data.completionDirection && !isGraduate && (
        <div>
          <div className={styles.h3}>생기부 마무리 방향</div>
          <p className={styles.small}>{safeText(data.completionDirection)}</p>
        </div>
      )}

      <div>
        <div className={styles.h3}>종합 조언</div>
        <p className={`${styles.small} ${styles.emphasis}`}>
          {safeText(data.finalAdvice)}
        </p>
      </div>
    </>
  );
};
