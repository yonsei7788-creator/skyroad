import type { BehaviorAnalysisSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

const NO_DATA_MSG = "기록이 없어 평가할 수 없습니다.";

interface BehaviorAnalysisRendererProps {
  data: BehaviorAnalysisSection;
  sectionNumber: number;
}

export const BehaviorAnalysisRenderer = ({
  data,
  sectionNumber,
}: BehaviorAnalysisRendererProps) => {
  const years = data.yearlyAnalysis ?? [];

  return (
    <>
      {/* Block 1: Header + character label + tags + first year */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        {data.characterLabel && (
          <div className={styles.cardAccent}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                {data.characterLabel.label}
              </div>
              {data.personalityScore !== undefined && (
                <span className={styles.emphasis}>
                  인성 점수 {data.personalityScore}점
                </span>
              )}
            </div>
            {data.characterLabel.rationale && (
              <p className={`${styles.small} ${styles.mt6}`}>
                {safeText(data.characterLabel.rationale)}
              </p>
            )}
          </div>
        )}

        <div className={`${styles.tagGroup} ${styles.mt12}`}>
          {(data.consistentTraits ?? []).map((trait) => (
            <span key={trait} className={styles.tag}>
              {trait}
            </span>
          ))}
          {data.personalityKeywords?.map((kw) => (
            <span key={kw} className={styles.tag}>
              {kw}
            </span>
          ))}
        </div>

        <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
          학년별 행동특성 분석
        </div>
        {years.length > 0 &&
          (() => {
            const [year] = years;
            return (
              <div className={styles.activityYearCard}>
                <div className={styles.activityYearHeader}>
                  <span className={styles.tableCellBold}>{year.year}학년</span>
                  {year.summary !== NO_DATA_MSG && (
                    <div className={styles.tagGroup}>
                      {(year.competencyTags ?? []).map((tag, idx) => (
                        <span key={idx} className={styles.tag}>
                          {tag.subcategory}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className={styles.small}>{safeText(year.summary)}</p>
                {year.summary !== NO_DATA_MSG &&
                  year.keyQuotes?.map((q, i) => (
                    <p
                      key={i}
                      className={styles.caption}
                      style={{ fontStyle: "italic", marginTop: 4 }}
                    >
                      &ldquo;{q}&rdquo;
                    </p>
                  ))}
              </div>
            );
          })()}
      </div>

      {/* Remaining years — each as its own block */}
      {years.slice(1).map((year) => (
        <div key={year.year}>
          <div className={styles.activityYearCard}>
            <div className={styles.activityYearHeader}>
              <span className={styles.tableCellBold}>{year.year}학년</span>
              {year.summary !== NO_DATA_MSG && (
                <div className={styles.tagGroup}>
                  {(year.competencyTags ?? []).map((tag, idx) => (
                    <span key={idx} className={styles.tag}>
                      {tag.subcategory}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className={styles.small}>{safeText(year.summary)}</p>
            {year.summary !== NO_DATA_MSG &&
              year.keyQuotes?.map((q, i) => (
                <p
                  key={i}
                  className={styles.caption}
                  style={{ fontStyle: "italic", marginTop: 4 }}
                >
                  &ldquo;{q}&rdquo;
                </p>
              ))}
          </div>
        </div>
      ))}

      {/* Final Block: AI 종합 평가 + 입시 활용 */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>✦</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>
              <span className={styles.markerSky}>종합 평가</span>
            </div>
            <div className={styles.aiCommentaryText}>
              {safeText(data.overallComment)}
            </div>
            <div className={`${styles.aiCommentaryLabel} ${styles.mt12}`}>
              <span className={styles.markerSky}>입시 활용 포인트</span>
            </div>
            <div className={styles.aiCommentaryText}>
              {safeText(data.admissionRelevance)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
