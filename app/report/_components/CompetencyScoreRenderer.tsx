import type {
  CompetencyGrade,
  CompetencyScoreSection,
  ReportPlan,
} from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
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

const GROWTH_SCORE_MAP: Record<CompetencyGrade, number> = {
  S: 95,
  A: 80,
  B: 65,
  C: 50,
  D: 35,
};

const GRADE_BADGE_CLASS: Record<CompetencyGrade, string> = {
  S: styles.ratingExcellent,
  A: styles.ratingGood,
  B: styles.ratingAverage,
  C: styles.ratingWeak,
  D: styles.ratingWeak,
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
        {(score.subcategories ?? []).map((sub) => (
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
          {safeText(score.gradeComment)}
        </div>
      )}
    </div>
  );

  const academic = (data.scores ?? []).find((s) => s.category === "academic");
  const career = (data.scores ?? []).find((s) => s.category === "career");
  const community = (data.scores ?? []).find((s) => s.category === "community");

  return (
    <>
      {/* ── 종합 역량 점수 헤더 + 히어로 ── */}
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
      </div>

      {/* ── 역량 카드: 각각을 개별 블록으로 분리하여 페이지 분할 가능 ── */}
      {academic && renderDimCard(academic)}
      {career && renderDimCard(career)}
      {community && renderDimCard(community)}

      {/* Growth potential — 다른 역량 카드와 동일한 레이아웃 */}
      <div className={styles.competencyDimCardWide}>
        <div className={styles.competencyDimWideHeader}>
          <span className={styles.competencyDimWideLabel}>
            {CATEGORY_LABEL.growth}
          </span>
          <div className={styles.competencyDimWideScoreRow}>
            <span className={styles.competencyDimWideScore}>
              {GROWTH_SCORE_MAP[data.growthGrade] ?? "—"}
            </span>
            <span className={styles.competencyDimWideMax}>/100</span>
            <span
              className={`${styles.competencyDimWideGradeBadge} ${GRADE_BADGE_CLASS[data.growthGrade] ?? ""}`}
            >
              {data.growthGrade}
            </span>
          </div>
        </div>

        {showBar && (
          <div className={styles.competencyDimWideBar}>
            <div
              className={styles.competencyDimWideBarFill}
              style={{
                width: `${GROWTH_SCORE_MAP[data.growthGrade] ?? 0}%`,
              }}
            />
          </div>
        )}

        {data.growthComment && (
          <div className={styles.competencyDimWideGradeComment}>
            {safeText(data.growthComment)}
          </div>
        )}
      </div>

      {/* AI commentary */}
      <div className={styles.aiCommentary}>
        <div className={styles.aiCommentaryIcon}>AI</div>
        <div className={styles.aiCommentaryContent}>
          <div className={styles.aiCommentaryLabel}>점수 해석</div>
          <div className={styles.aiCommentaryText}>
            {safeText(data.interpretation)}
          </div>
        </div>
      </div>
    </>
  );
};
