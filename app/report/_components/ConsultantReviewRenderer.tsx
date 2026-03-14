import type { ConsultantReviewSection, ReportPlan } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface ConsultantReviewRendererProps {
  data: ConsultantReviewSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

export const ConsultantReviewRenderer = ({
  data,
  sectionNumber,
  plan,
}: ConsultantReviewRendererProps) => {
  return (
    <>
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.mt12}>
          <div className={styles.h3}>성적 및 교과 이수 노력 평가</div>
          <p className={styles.small}>{safeText(data.gradeAnalysis)}</p>
        </div>

        <div className={styles.mt16}>
          <div className={styles.h3}>전공 관련 교과 성취도</div>
          <p className={styles.small}>{safeText(data.courseEffort)}</p>
        </div>

        <div className={styles.mt16}>
          <div className={styles.h3}>전형 전략 방향</div>
          <p className={styles.small}>{safeText(data.admissionStrategy)}</p>
        </div>

        {data.completionDirection && (
          <div className={styles.mt16}>
            <div className={styles.h3}>생기부 마무리 방향</div>
            <p className={styles.small}>{safeText(data.completionDirection)}</p>
          </div>
        )}

        <div className={styles.mt16}>
          <div className={styles.h3}>종합 조언</div>
          <p className={`${styles.small} ${styles.emphasis}`}>
            {safeText(data.finalAdvice)}
          </p>
        </div>
      </div>
    </>
  );
};
