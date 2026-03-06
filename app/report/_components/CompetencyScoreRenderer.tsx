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

  const growthClass = isPremium
    ? styles.competencyGrowthPremium
    : isStandard
      ? styles.competencyGrowthStandard
      : styles.competencyGrowth;

  const renderDimCard = (score: (typeof data.scores)[number], key?: string) => (
    <div key={key ?? score.category} className={styles.competencyDimCardWide}>
      <div className={styles.competencyDimWideHeader}>
        <span className={styles.competencyDimWideLabel}>
          {CATEGORY_LABEL[score.category] ?? score.label}
        </span>
        <div className={styles.competencyDimWideScoreRow}>
          <span className={styles.competencyDimWideScore}>{score.score}</span>
          <span className={styles.competencyDimWideMax}>/{score.maxScore}</span>
          {score.grade && (
            <span
              className={`${styles.competencyDimWideGradeBadge} ${GRADE_BADGE_CLASS[score.grade] ?? ""}`}
            >
              {score.grade}
            </span>
          )}
        </div>
      </div>

      {showBar && (
        <div className={styles.competencyDimWideBar}>
          <div
            className={styles.competencyDimWideBarFill}
            style={{
              width: `${(score.score / score.maxScore) * 100}%`,
            }}
          />
        </div>
      )}

      <div className={styles.competencyDimWideSubs}>
        {score.subcategories.map((sub) => (
          <div key={sub.name} className={styles.competencyDimWideSubRow}>
            <span className={styles.competencyDimWideSubLabel}>{sub.name}</span>
            <div className={styles.competencyDimWideSubRight}>
              <span className={styles.competencyDimWideSubScore}>
                {sub.score}/{sub.maxScore}
              </span>
              {showBar && (
                <div className={styles.competencyDimWideSubBar}>
                  <div
                    className={styles.competencyDimWideSubBarFill}
                    style={{
                      width: `${(sub.score / sub.maxScore) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {score.grade && score.gradeComment && (
        <div className={styles.competencyDimWideGradeComment}>
          {score.gradeComment}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Block 1: Hero + 첫 번째 역량 ── */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        {/* Hero score panel */}
        <div className={heroClass}>
          <div className={styles.competencyHeroOverline}>종합 역량 점수</div>
          <div className={styles.competencyHeroScoreRow}>
            <span className={styles.competencyHeroScore}>
              {data.totalScore}
            </span>
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
                <span className={styles.competencyHeroCompareLabel}>
                  내 점수
                </span>
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

        <div className={styles.competencySectionLabel}>역량별 상세</div>
        {data.scores[0] && renderDimCard(data.scores[0])}
      </div>

      {/* ── Block 2+: 나머지 역량 카드 각각 ── */}
      {data.scores.slice(1).map((score) => (
        <div key={score.category}>{renderDimCard(score)}</div>
      ))}

      {/* ── Last block: Growth + AI ── */}
      <div>
        {/* Growth potential */}
        <div className={growthClass}>
          <div className={styles.competencyGrowthLeft}>
            <span className={styles.competencyGrowthLabel}>발전 가능성</span>
            <div className={GROWTH_GRADE_CLASS[data.growthGrade]}>
              {data.growthGrade}
            </div>
          </div>
          <div className={styles.competencyGrowthRight}>
            <p className={styles.competencyGrowthComment}>
              {data.growthComment}
            </p>
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
    </>
  );
};
