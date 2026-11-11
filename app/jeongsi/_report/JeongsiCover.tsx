import type {
  JeongsiCombinationSection,
  JeongsiRecommendationSection,
  JeongsiReportMeta,
  JeongsiScoreAnalysisSection,
} from "@/libs/jeongsi/report-types";

import { ReportPage } from "../../report/_components";
import { TIER_ORDER, toneStyleOf } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";

interface JeongsiCoverProps {
  meta: JeongsiReportMeta;
  score?: JeongsiScoreAnalysisSection;
  recommendation?: JeongsiRecommendationSection;
  combination?: JeongsiCombinationSection;
}

interface ScoreCell {
  label: string;
  value: string;
  sub: string;
}

const buildScoreCells = (meta: JeongsiReportMeta): ScoreCell[] => {
  const { korean, math, english, inquiry1, inquiry2, history } =
    meta.input.score;

  return [
    {
      label: `국어 · ${korean.elective}`,
      value: `${korean.standardScore}`,
      sub: `백분위 ${korean.percentile}`,
    },
    {
      label: `수학 · ${math.elective}`,
      value: `${math.standardScore}`,
      sub: `백분위 ${math.percentile}`,
    },
    {
      label: `탐구 · ${inquiry1.subject} · ${inquiry2.subject}`,
      value: `${inquiry1.standardScore} · ${inquiry2.standardScore}`,
      sub: `백분위 ${inquiry1.percentile} · ${inquiry2.percentile}`,
    },
    {
      label: "영어 · 한국사",
      value: `${english.grade} · ${history.grade}등급`,
      sub: "절대평가",
    },
  ];
};

/** 문단의 첫 문장. 리포트 본문에 이미 있는 문장만 요약에 옮긴다 */
const firstSentenceOf = (text: string): string =>
  text.trim().split(/(?<=[.!?])\s+/)[0] ?? "";

const formatDeviation = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(1)}`;

export const JeongsiCover = ({
  meta,
  score,
  recommendation,
  combination,
}: JeongsiCoverProps) => {
  const { input, createdAt } = meta;
  const { preference } = input;

  const date = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tierCounts = TIER_ORDER.map((tier) => ({
    tier,
    count:
      recommendation?.groups.find((group) => group.tier === tier)?.items
        .length ?? 0,
  }));
  const totalCount = tierCounts.reduce((sum, item) => sum + item.count, 0);

  const strengthRows =
    score?.rows.filter((row) => score.strengthAreas.includes(row.area)) ?? [];
  const weaknessRows =
    score?.rows.filter((row) => score.weaknessAreas.includes(row.area)) ?? [];
  const labelsOf = (items: typeof strengthRows): string =>
    items.map((row) => row.label).join("·") || "—";
  const areaDeviations = [...strengthRows, ...weaknessRows]
    .map((row) => row.deviation)
    .filter((value): value is number => value !== null)
    .map(formatDeviation);

  const keyPoints = [
    score?.overallComment,
    recommendation?.overallComment,
    combination?.overallComment,
  ]
    .filter((text): text is string => typeof text === "string")
    .map(firstSentenceOf)
    .filter((text) => text.length > 0);

  return (
    <ReportPage showHeader={false} showWatermark={false}>
      <div className={styles.coverTopBar} />
      <div className={styles.standaloneBody}>
        <div className={styles.coverBrandRow}>
          <div className={styles.coverBrand}>
            시대 <span className={styles.coverBrandAccent}>컨설팅</span>
          </div>
          <span className={styles.coverDate}>발행 {date}</span>
        </div>

        <div className={styles.coverTitleBlock}>
          <span className={styles.coverOverline}>
            JEONGSI ADMISSION REPORT · 2027학년도
          </span>
          <h1 className={styles.coverTitle}>정시 지원 분석 리포트</h1>
          <p className={styles.coverSubtitle}>
            수능 성적을 대학별 환산식으로 다시 계산하고, 3개년 공개 입결과
            비교해
            <br />
            {preference.target} 지원 전략을 설계했습니다.
          </p>
        </div>

        <div className={styles.coverScoreStrip}>
          {buildScoreCells(meta).map((cell) => (
            <div key={cell.label} className={styles.coverScoreCell}>
              <span className={styles.coverScoreLabel}>{cell.label}</span>
              <span className={styles.coverScoreValue}>{cell.value}</span>
              <span className={styles.coverScoreSub}>{cell.sub}</span>
            </div>
          ))}
        </div>

        <div className={styles.coverPrefRow}>
          <span>
            <b>희망</b>
            {preference.target}
            {preference.targetKind === "field" ? " (계열)" : ""}
          </span>
          <span>
            <b>지역</b>
            {preference.region}
          </span>
          <span>
            <b>성향</b>
            {preference.risk}
          </span>
        </div>

        <div className={styles.summaryHeading}>
          <span className={styles.summaryOverline}>EXECUTIVE SUMMARY</span>
          <span className={styles.summaryTitle}>핵심 요약</span>
        </div>

        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryCardLabel}>
              국·수·탐 평균 백분위
            </span>
            <span className={styles.summaryCardValue}>
              {score ? score.averagePercentile.toFixed(1) : "—"}
            </span>
            {score && (
              <span className={styles.summaryCardNote}>
                표준점수 합 {score.totalStandardScore}
              </span>
            )}
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.summaryCardLabel}>지원 가능 모집단위</span>
            <span className={styles.summaryCardValue}>
              {totalCount}
              <span className={styles.summaryCardUnit}>곳</span>
            </span>
            <div className={styles.summaryTierCounts}>
              {tierCounts.map(({ tier, count }) => (
                <span
                  key={tier}
                  className={styles.toneText}
                  style={toneStyleOf(tier)}
                >
                  {tier} {count}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.summaryCardLabel}>강점 · 약점 영역</span>
            <span className={styles.summaryCardValueSmall}>
              <span className={styles.summaryStrength}>
                {labelsOf(strengthRows)}
              </span>
              {" · "}
              <span className={styles.summaryWeakness}>
                {labelsOf(weaknessRows)}
              </span>
            </span>
            {areaDeviations.length > 0 && (
              <span className={styles.summaryCardNote}>
                평균 대비 {areaDeviations.join(" · ")}
              </span>
            )}
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.summaryCardLabel}>지원 조합</span>
            <span className={styles.summaryCardValue}>
              {combination?.combinations.length ?? 0}
              <span className={styles.summaryCardUnit}>가지</span>
            </span>
            <span className={styles.summaryCardNote}>
              지원 성향 {preference.risk}
            </span>
          </div>
        </div>

        {keyPoints.length > 0 && (
          <div className={styles.summaryPoints}>
            {keyPoints.map((point, index) => (
              <div key={`point-${index}`} className={styles.summaryPoint}>
                <span className={styles.summaryPointNum}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className={styles.summaryPointText}>{point}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportPage>
  );
};
