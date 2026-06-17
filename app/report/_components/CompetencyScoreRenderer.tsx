import type {
  CompetencyAxis,
  CompetencyGrade,
  CompetencyScoreSection,
  ReportPlan,
} from "@/libs/report/types";

import styles from "./report.module.css";
import { renderInsightMarkers } from "./insight-marker";
import { SectionHeader } from "./SectionHeader";

// ── 레이더 기하 상수 (인라인 SVG, 인쇄·html2canvas 캡처 안전) ──
const RADAR_SIZE = 320;
const RADAR_CX = 160;
const RADAR_CY = 162;
const RADAR_R = 104;
const RADAR_RINGS = [0.25, 0.5, 0.75, 1] as const;

// 플랜별 강조색 (CSS 변수 미해석 환경에서도 캡처되도록 구체 색상 사용)
const ACCENT_BY_PLAN: Record<ReportPlan, string> = {
  lite: "#4f46e5",
  standard: "#2563eb",
  premium: "#7c3aed",
};
const STRENGTH_COLOR = "#059669";
const WEAKNESS_COLOR = "#d97706";
const GRID_COLOR = "#e2e8f0";
const LABEL_COLOR = "#475569";

const polarPoint = (r: number, angleDeg: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: RADAR_CX + r * Math.cos(rad),
    y: RADAR_CY + r * Math.sin(rad),
  };
};

/** 5축 세분화 레이더 (순수 인라인 SVG — hook/브라우저 API 미사용, SSR·인쇄 안전) */
const CompetencyRadar = ({
  axes,
  accent,
}: {
  axes: CompetencyAxis[];
  accent: string;
}) => {
  const n = axes.length;
  const angleAt = (i: number) => -90 + (360 / n) * i;

  const ringPolys = RADAR_RINGS.map((ratio) =>
    axes
      .map((_, i) => {
        const p = polarPoint(RADAR_R * ratio, angleAt(i));
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ")
  );

  const dataPts = axes
    .map((a, i) => {
      const ratio = Math.max(0, Math.min(100, a.score)) / 100;
      const p = polarPoint(RADAR_R * ratio, angleAt(i));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className={styles.competencyRadarSvg}
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      role="img"
      aria-label="역량 5축 레이더 차트"
    >
      {/* 배경 격자 (동심 오각형) */}
      {ringPolys.map((pts, idx) => (
        <polygon
          key={`ring-${idx}`}
          points={pts}
          fill="none"
          stroke={GRID_COLOR}
          strokeWidth={1}
        />
      ))}

      {/* 축 spoke */}
      {axes.map((_, i) => {
        const p = polarPoint(RADAR_R, angleAt(i));
        return (
          <line
            key={`spoke-${i}`}
            x1={RADAR_CX}
            y1={RADAR_CY}
            x2={p.x.toFixed(1)}
            y2={p.y.toFixed(1)}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        );
      })}

      {/* 데이터 영역 */}
      <polygon
        points={dataPts}
        fill={accent}
        fillOpacity={0.18}
        stroke={accent}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* 꼭짓점 + 라벨 */}
      {axes.map((a, i) => {
        const ratio = Math.max(0, Math.min(100, a.score)) / 100;
        const vertex = polarPoint(RADAR_R * ratio, angleAt(i));
        const labelPos = polarPoint(RADAR_R + 22, angleAt(i));
        const dx = labelPos.x - RADAR_CX;
        const anchor = Math.abs(dx) < 4 ? "middle" : dx > 0 ? "start" : "end";
        const dotColor = a.isStrength
          ? STRENGTH_COLOR
          : a.isWeakness
            ? WEAKNESS_COLOR
            : accent;
        const labelColor = a.isStrength
          ? STRENGTH_COLOR
          : a.isWeakness
            ? WEAKNESS_COLOR
            : LABEL_COLOR;
        return (
          <g key={`v-${a.key}`}>
            <circle
              cx={vertex.x.toFixed(1)}
              cy={vertex.y.toFixed(1)}
              r={a.isStrength || a.isWeakness ? 4.5 : 3.5}
              fill={dotColor}
            />
            <text
              x={labelPos.x.toFixed(1)}
              y={(labelPos.y - 4).toFixed(1)}
              textAnchor={anchor}
              fontSize={13}
              fontWeight={a.isStrength || a.isWeakness ? 700 : 600}
              fill={labelColor}
            >
              {a.label}
            </text>
            <text
              x={labelPos.x.toFixed(1)}
              y={(labelPos.y + 11).toFixed(1)}
              textAnchor={anchor}
              fontSize={12}
              fontWeight={600}
              fill={dotColor}
            >
              {a.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

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
  const scorePct = Math.round((data.totalScore / 400) * 100);

  // 신규 리포트(v5+): 5축 레이더 데이터 존재 여부로 신·구 UI 분기.
  // 기존 리포트는 competencyAxes가 없으므로 기존 비교(지원적정/전체 평균) UI 유지.
  const axes = data.competencyAxes;
  const hasAxes = Array.isArray(axes) && axes.length > 0;
  const accent = ACCENT_BY_PLAN[plan];
  const strengthAxis = hasAxes ? axes!.find((a) => a.isStrength) : undefined;
  const weaknessAxis = hasAxes ? axes!.find((a) => a.isWeakness) : undefined;

  // 데이터 기반 강점·보완 항목 (신규 리포트 전용)
  const highlights =
    data.competencyHighlights &&
    (data.competencyHighlights.strengths.length > 0 ||
      data.competencyHighlights.improvements.length > 0)
      ? data.competencyHighlights
      : undefined;

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
          {renderInsightMarkers(score.gradeComment)}
        </div>
      )}
    </div>
  );

  const academic = (data.scores ?? []).find((s) => s.category === "academic");
  const career = (data.scores ?? []).find((s) => s.category === "career");
  const community = (data.scores ?? []).find((s) => s.category === "community");
  const growth = (data.scores ?? []).find((s) => s.category === "growth");

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
            <span className={styles.competencyHeroDenom}>/ 400</span>
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

          {!hasAxes && data.comparison && (
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

        {/* ── 신규 리포트(v5+): 5축 세분화 레이더 + 강점/보완 ── */}
        {hasAxes && (
          <div className={styles.competencyRadarPanel}>
            <div className={styles.competencyRadarLabel}>
              항목별 강점·보완 프로필
            </div>
            <CompetencyRadar axes={axes!} accent={accent} />

            <div className={styles.competencyAxisLegend}>
              {strengthAxis && (
                <span
                  className={`${styles.competencyAxisChip} ${styles.competencyAxisChipStrength}`}
                >
                  강점 · {strengthAxis.label} {strengthAxis.score}
                </span>
              )}
              {weaknessAxis && (
                <span
                  className={`${styles.competencyAxisChip} ${styles.competencyAxisChipWeak}`}
                >
                  보완 · {weaknessAxis.label} {weaknessAxis.score}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── 데이터 기반 강점·보완 항목 (어떤 부분 보완 시 +N점 향상되는지) ── */}
        {highlights && (
          <div className={styles.competencyHighlights}>
            {highlights.strengths.length > 0 && (
              <div className={styles.competencyHighlightCol}>
                <div className={styles.competencyHighlightHeading}>
                  <span className={styles.competencyHighlightDotStrength} />
                  강점 항목
                </div>
                {highlights.strengths.map((it) => (
                  <div
                    key={`st-${it.categoryLabel}-${it.name}`}
                    className={styles.competencyHighlightItem}
                  >
                    <div className={styles.competencyHighlightItemHead}>
                      <span className={styles.competencyHighlightItemName}>
                        {it.name}
                      </span>
                      <span className={styles.competencyHighlightItemMeta}>
                        {it.categoryLabel} · {it.score}/{it.maxScore}
                      </span>
                    </div>
                    {it.reason && (
                      <div className={styles.competencyHighlightReason}>
                        {renderInsightMarkers(it.reason)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {highlights.improvements.length > 0 && (
              <div className={styles.competencyHighlightCol}>
                <div className={styles.competencyHighlightHeading}>
                  <span className={styles.competencyHighlightDotWeak} />
                  보완하면 향상되는 항목
                </div>
                {highlights.improvements.map((it) => (
                  <div
                    key={`im-${it.categoryLabel}-${it.name}`}
                    className={styles.competencyHighlightItem}
                  >
                    <div className={styles.competencyHighlightItemHead}>
                      <span className={styles.competencyHighlightItemName}>
                        {it.name}
                      </span>
                      <span className={styles.competencyHighlightGain}>
                        +{it.gap}점 여지
                      </span>
                      <span className={styles.competencyHighlightItemMeta}>
                        {it.categoryLabel} · {it.score}/{it.maxScore}
                      </span>
                    </div>
                    {it.reason && (
                      <div className={styles.competencyHighlightReason}>
                        {renderInsightMarkers(it.reason)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.competencySectionLabel}>역량별 상세</div>
      </div>

      {/* ── 역량 카드: 각각을 개별 블록으로 분리하여 페이지 분할 가능 ── */}
      {academic && renderDimCard(academic)}
      {career && renderDimCard(career)}
      {community && renderDimCard(community)}

      {/* Growth potential — 다른 역량 카드와 동일한 레이아웃 (하위항목 포함) */}
      {growth ? (
        renderDimCard(
          {
            ...growth,
            score:
              growth.score ??
              data.growthScore ??
              GROWTH_SCORE_MAP[data.growthGrade] ??
              0,
            maxScore: growth.maxScore ?? 100,
            grade: growth.grade ?? data.growthGrade,
            gradeComment: growth.gradeComment ?? data.growthComment,
          },
          "growth"
        )
      ) : (
        <div className={styles.competencyDimCardWide}>
          <div className={styles.competencyDimWideHeader}>
            <span className={styles.competencyDimWideLabel}>
              {CATEGORY_LABEL.growth}
            </span>
            <div className={styles.competencyDimWideScoreRow}>
              <span className={styles.competencyDimWideScore}>
                {data.growthScore ?? GROWTH_SCORE_MAP[data.growthGrade] ?? "—"}
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
                  width: `${data.growthScore ?? GROWTH_SCORE_MAP[data.growthGrade] ?? 0}%`,
                }}
              />
            </div>
          )}

          {data.growthComment && (
            <div className={styles.competencyDimWideGradeComment}>
              {renderInsightMarkers(data.growthComment)}
            </div>
          )}
        </div>
      )}

      {/* AI commentary */}
      <div className={styles.aiCommentary}>
        <div className={styles.aiCommentaryIcon}>✦</div>
        <div className={styles.aiCommentaryContent}>
          <div className={styles.aiCommentaryLabel}>
            <span className={styles.markerYellow}>점수 해석</span>
          </div>
          <div className={styles.aiCommentaryText}>
            {renderInsightMarkers(data.interpretation)}
          </div>
        </div>
      </div>
    </>
  );
};
