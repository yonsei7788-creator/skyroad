import type {
  CompetencyGrade,
  CompetencyScoreSection,
  ReportPlan,
} from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface CompetencyScoreRendererProps {
  data: CompetencyScoreSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

const CATEGORY_LABEL: Record<string, string> = {
  academic: "학업 역량",
  career: "진로 역량",
  community: "공동체 역량",
  growth: "발전 가능성",
};

const GRADE_BADGE_CLASS: Record<CompetencyGrade, string> = {
  S: styles.ratingExcellent,
  A: styles.ratingGood,
  B: styles.ratingAverage,
  C: styles.ratingWeak,
  D: styles.ratingWeak,
};

const GROWTH_GRADE_CLASS: Record<CompetencyGrade, string> = {
  S: styles.competencyGrowthGradeS,
  A: styles.competencyGrowthGradeA,
  B: styles.competencyGrowthGradeB,
  C: styles.competencyGrowthGradeCD,
  D: styles.competencyGrowthGradeCD,
};

export const CompetencyScoreRenderer = ({
  data,
  sectionNumber,
  plan = "lite",
}: CompetencyScoreRendererProps) => {
  const isPremium = plan === "premium";
  const isStandard = plan === "standard";
  const showBar = isStandard || isPremium;
  const scorePct = Math.round((data.totalScore / 300) * 100);

  const heroClass = isPremium
    ? styles.competencyHeroPremium
    : isStandard
      ? styles.competencyHeroStandard
      : styles.competencyHero;

  const dimCardClass = isPremium
    ? styles.competencyDimCardPremium
    : isStandard
      ? styles.competencyDimCardStandard
      : styles.competencyDimCard;

  const growthClass = isPremium
    ? styles.competencyGrowthPremium
    : isStandard
      ? styles.competencyGrowthStandard
      : styles.competencyGrowth;

  return (
    <div>
      <SectionHeader number={sectionNumber} title={data.title} />

      {/* Hero score panel */}
      <div className={heroClass}>
        <div className={styles.competencyHeroOverline}>종합 역량 점수</div>
        <div className={styles.competencyHeroScoreRow}>
          <span className={styles.competencyHeroScore}>{data.totalScore}</span>
          <span className={styles.competencyHeroDenom}>/ 300</span>
        </div>

        {showBar && (
          <div className={styles.competencyHeroBar}>
            <div
              className={
                isPremium
                  ? styles.competencyHeroBarFillPremium
                  : styles.competencyHeroBarFill
              }
              style={{ width: `${scorePct}%` }}
            />
          </div>
        )}

        {data.comparison && (
          <div className={styles.competencyHeroComparison}>
            <div className={styles.competencyHeroCompareItem}>
              <span className={styles.competencyHeroCompareValue}>
                {data.comparison.myScore}
              </span>
              <span className={styles.competencyHeroCompareLabel}>내 점수</span>
            </div>
            {data.comparison.targetRangeAvg !== undefined && (
              <div className={styles.competencyHeroCompareItem}>
                <span className={styles.competencyHeroCompareValue}>
                  {data.comparison.targetRangeAvg}
                </span>
                <span className={styles.competencyHeroCompareLabel}>
                  지원적정 평균
                </span>
              </div>
            )}
            {data.comparison.overallAvg !== undefined && (
              <div className={styles.competencyHeroCompareItem}>
                <span className={styles.competencyHeroCompareValue}>
                  {data.comparison.overallAvg}
                </span>
                <span className={styles.competencyHeroCompareLabel}>
                  전체 평균
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dimension cards */}
      <div className={styles.competencySectionLabel}>역량별 상세</div>
      <div className={styles.competencyDimGrid}>
        {data.scores.map((score) => (
          <div key={score.category} className={dimCardClass}>
            <div className={styles.competencyDimHeader}>
              <span className={styles.competencyDimLabel}>
                {CATEGORY_LABEL[score.category] ?? score.label}
              </span>
            </div>
            <div className={styles.competencyDimScoreRow}>
              <span className={styles.competencyDimScore}>{score.score}</span>
              <span className={styles.competencyDimMax}>/{score.maxScore}</span>
            </div>

            {showBar && (
              <div className={styles.competencyDimBar}>
                <div
                  className={
                    isPremium
                      ? styles.competencyDimBarFillPremium
                      : styles.competencyDimBarFill
                  }
                  style={{
                    width: `${(score.score / score.maxScore) * 100}%`,
                  }}
                />
              </div>
            )}

            <div className={styles.competencyDimSubs}>
              {score.subcategories.map((sub) => (
                <div key={sub.name} className={styles.competencyDimSubRow}>
                  <span className={styles.competencyDimSubLabel}>
                    {sub.name}
                  </span>
                  <span className={styles.competencyDimSubScore}>
                    {sub.score}/{sub.maxScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Growth potential */}
      <div className={growthClass}>
        <div className={styles.competencyGrowthLeft}>
          <span className={styles.competencyGrowthLabel}>발전 가능성</span>
          <div className={GROWTH_GRADE_CLASS[data.growthGrade]}>
            {data.growthGrade}
          </div>
        </div>
        <div className={styles.competencyGrowthRight}>
          <p className={styles.competencyGrowthComment}>{data.growthComment}</p>
        </div>
      </div>

      {/* AI commentary */}
      <div className={styles.aiCommentary}>
        <div className={styles.aiCommentaryIcon}>AI</div>
        <div className={styles.aiCommentaryContent}>
          <div className={styles.aiCommentaryLabel}>점수 해석</div>
          <div className={styles.aiCommentaryText}>{data.interpretation}</div>
        </div>
      </div>
    </div>
  );
};
