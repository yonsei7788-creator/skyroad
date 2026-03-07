import type { DiagnosticSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface DiagnosticRendererProps {
  data: DiagnosticSection;
  sectionNumber: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  academic: "학업 역량",
  career: "진로 역량",
  community: "공동체 역량",
  growth: "발전 가능성",
};

export const DiagnosticRenderer = ({
  data,
  sectionNumber,
}: DiagnosticRendererProps) => {
  return (
    <>
      {/* Block 1: Header + Hero callout */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.diagHero}>
          <div className={styles.diagHeroText}>{safeText(data.oneLiner)}</div>
        </div>
      </div>

      {/* Block 2: Keywords */}
      <div>
        <div className={`${styles.h3} ${styles.mb12}`}>핵심 키워드</div>
        <div className={styles.diagKeywordGrid}>
          {(data.keywords ?? []).map((kw) => (
            <div key={kw.label} className={styles.diagKeywordChip}>
              <span className={styles.diagKeywordBadge}>{kw.label}</span>
              <span className={styles.diagKeywordDesc}>
                {safeText(kw.description)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Block 3: Competency Summary 2×2 */}
      <div>
        <div className={`${styles.h3} ${styles.mb12}`}>역량별 진단</div>
        <div className={styles.diagCompGrid}>
          {(data.competencySummary ?? []).map((item) => (
            <div key={item.category} className={styles.diagCompCard}>
              <div className={styles.diagCompLabel}>
                {CATEGORY_LABEL[item.category] ?? item.label}
              </div>
              <p className={styles.diagCompText}>{safeText(item.summary)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Block 4: Admission positioning (Standard+) */}
      {data.admissionPositioning && (
        <div className={styles.diagPanel}>
          <div className={styles.diagPanelLabel}>
            <span className={styles.diagPanelLabelDot} />
            입시 포지셔닝
          </div>
          <p className={styles.diagPanelText}>
            {safeText(data.admissionPositioning)}
          </p>
        </div>
      )}

      {/* Block 5: Strategy overview (Premium) */}
      {data.strategyOverview && (
        <div className={styles.diagPanel}>
          <div className={styles.diagPanelLabel}>
            <span className={styles.diagPanelLabelDot} />
            합격 전략 요약
          </div>
          <p className={styles.diagPanelText}>
            {safeText(data.strategyOverview)}
          </p>
        </div>
      )}
    </>
  );
};
