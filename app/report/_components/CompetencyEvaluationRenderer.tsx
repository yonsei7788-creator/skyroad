import type {
  CompetencyEvaluationSection,
  CompetencyGrade,
} from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface CompetencyEvaluationRendererProps {
  data: CompetencyEvaluationSection;
  sectionNumber: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  academic: "학업 역량",
  career: "진로 역량",
  community: "공동체 역량",
  growth: "발전 가능성",
};

const GRADE_BADGE_CLASS: Record<CompetencyGrade, string> = {
  S: styles.ceGradeS,
  A: styles.ceGradeA,
  B: styles.ceGradeB,
  C: styles.ceGradeC,
  D: styles.ceGradeD,
};

const GRADE_COLOR: Record<CompetencyGrade, string> = {
  S: "var(--report-strength)",
  A: "var(--grade-good)",
  B: "var(--grade-average)",
  C: "var(--grade-weak)",
  D: "#991b1b",
};

export const CompetencyEvaluationRenderer = ({
  data,
  sectionNumber,
}: CompetencyEvaluationRendererProps) => {
  const ratingsFirstHalf = data.competencyRatings.slice(0, 2);
  const ratingsSecondHalf = data.competencyRatings.slice(2);

  return (
    <>
      {/* Block 1: Header + Strengths */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />
        <div className={styles.ceSubheading}>
          <span className={styles.textStrength}>강점 분석</span>
        </div>
        <div className={styles.ceCardGrid}>
          {data.strengths.map((item) => (
            <div key={item.label} className={styles.ceStrengthCard}>
              <div className={styles.ceCardLabel}>
                <span className={styles.ceCardLabelText}>{item.label}</span>
                <span className={styles.ceCompetencyPill}>
                  {item.competencyTag.subcategory}
                </span>
              </div>
              <p className={styles.ceEvidence}>{item.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Block 2: Weaknesses */}
      <div>
        <div className={styles.ceSubheading}>
          <span className={styles.textWeakness}>약점 분석</span>
        </div>
        <div className={styles.ceCardGrid}>
          {data.weaknesses.map((item) => (
            <div key={item.label} className={styles.ceWeaknessCard}>
              <div className={styles.ceCardLabel}>
                <span className={styles.ceCardLabelText}>{item.label}</span>
                <span className={styles.ceCompetencyPill}>
                  {item.competencyTag.subcategory}
                </span>
              </div>
              <p className={styles.ceEvidence}>{item.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Block 3: Ratings - first half (academic, career) */}
      <div>
        <div className={styles.ceSubheading}>역량별 등급</div>
        {ratingsFirstHalf.map((rating) => (
          <div key={rating.category} className={styles.ceRatingCard}>
            <div className={styles.ceRatingHeader}>
              <span className={styles.ceRatingCategory}>
                {CATEGORY_LABEL[rating.category] ?? rating.label}
              </span>
              <span className={GRADE_BADGE_CLASS[rating.grade]}>
                {rating.grade}
              </span>
            </div>
            <p className={styles.ceRatingComment}>{rating.comment}</p>
            {rating.subcategories && rating.subcategories.length > 0 && (
              <div className={styles.ceSubcatRow}>
                {rating.subcategories.map((sub) => (
                  <span key={sub.name} className={styles.ceSubcatChip}>
                    {sub.name}
                    <span
                      className={styles.ceSubcatGradeDot}
                      style={{ background: GRADE_COLOR[sub.grade] }}
                    >
                      {sub.grade}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Block 4: Ratings - second half (community, growth) */}
      <div>
        {ratingsSecondHalf.map((rating) => (
          <div key={rating.category} className={styles.ceRatingCard}>
            <div className={styles.ceRatingHeader}>
              <span className={styles.ceRatingCategory}>
                {CATEGORY_LABEL[rating.category] ?? rating.label}
              </span>
              <span className={GRADE_BADGE_CLASS[rating.grade]}>
                {rating.grade}
              </span>
            </div>
            <p className={styles.ceRatingComment}>{rating.comment}</p>
            {rating.subcategories && rating.subcategories.length > 0 && (
              <div className={styles.ceSubcatRow}>
                {rating.subcategories.map((sub) => (
                  <span key={sub.name} className={styles.ceSubcatChip}>
                    {sub.name}
                    <span
                      className={styles.ceSubcatGradeDot}
                      style={{ background: GRADE_COLOR[sub.grade] }}
                    >
                      {sub.grade}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Block 5: AI overall comment */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>AI</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>종합 코멘트</div>
            <div className={styles.aiCommentaryText}>{data.overallComment}</div>
          </div>
        </div>
      </div>
    </>
  );
};
