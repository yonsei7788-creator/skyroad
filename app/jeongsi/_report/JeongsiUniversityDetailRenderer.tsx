import {
  CUT_METRIC_LABEL,
  STUDENT_CUT_VALUE_LABEL,
  formatCutValue,
  formatStudentCutValue,
} from "@/libs/jeongsi/report/cut-format";
import type {
  CutComparison,
  JeongsiUniversityDetailSection,
  UniversityDetailItem,
} from "@/libs/jeongsi/report-types";

import {
  ReportBarChart,
  ReportComparisonBar,
  SectionHeader,
} from "../../report/_components";
import reportStyles from "../../report/_components/report.module.css";
import {
  JeongsiChanceBadge,
  JeongsiGroupChip,
  JeongsiTierBadge,
  TIER_COLOR_VAR,
} from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";

interface JeongsiUniversityDetailRendererProps {
  data: JeongsiUniversityDetailSection;
  sectionNumber: number;
}

interface CutDomain {
  min: number;
  max: number;
}

/**
 * 3개년 컷 추이 차트의 Y축 범위.
 *
 * 컷 변화폭은 총점 1000점 기준 1~3점 수준이라 0부터 그리면 세 막대가
 * 구분되지 않는다. 변화폭이 보이도록 축을 좁히되, 캡션에 축 범위를
 * 반드시 명시해 절단된 축임을 숨기지 않는다.
 */
const buildCutDomain = (cuts: number[]): CutDomain => {
  const min = Math.min(...cuts);
  const max = Math.max(...cuts);
  const padding = Math.max(1, (max - min) * 0.8);
  return {
    min: Math.floor(min - padding),
    max: Math.ceil(max + padding),
  };
};

/**
 * 환산점수 비교 바의 표시 구간.
 *
 * 0 ~ 총점 전체를 축으로 쓰면 내 점수와 기준컷이 모두 축 오른쪽 끝
 * 1~2% 안에 몰려 구분이 불가능하다. 두 값이 들어가는 구간만 잘라
 * 보여주고, 축 양 끝의 실제 점수를 함께 표기해 어디를 확대했는지
 * 숨기지 않는다.
 */
const buildScoreWindow = (myScore: number, cut: number): CutDomain => {
  const lo = Math.min(myScore, cut);
  const hi = Math.max(myScore, cut);
  const padding = Math.max(hi - lo, 1) * 1.2;
  return { min: lo - padding, max: hi + padding };
};

/**
 * 표시 구간 안에서의 위치를 0~100 으로 환산.
 *
 * totalScore 는 "가산점을 제외한 기준 만점"이라 수학 선택과목·과탐·한국사
 * 가산이 붙는 모집단위에서는 convertedScore 가 기준 만점을 최대 5% 넘는다.
 * 시각 요소는 100% 를 넘지 않게 자르고, 숫자 라벨에는 실제 값을 그대로
 * 쓴다 (가산점을 받은 것은 사실이므로 숨기지 않는다).
 */
const toWindowPercent = (value: number, window: CutDomain): number => {
  const percent = ((value - window.min) / (window.max - window.min)) * 100;
  return Math.min(100, Math.max(0, percent));
};

const formatScore = (value: number): string => value.toFixed(1);

/**
 * 컷 비교값. cutComparison 이 생기기 전에 저장된 리포트는 컷이 전부
 * 환산점수 기준이었으므로 그 기준으로 복원한다.
 */
const resolveComparison = (
  item: UniversityDetailItem
): CutComparison | null => {
  if (item.cutComparison !== undefined) {
    return item.cutComparison;
  }
  if (item.referenceCut === null) {
    return null;
  }
  const latest = [...item.cutHistory]
    .sort((a, b) => b.year - a.year)
    .find((entry) => entry.cut !== null);
  return {
    metric: "convertedScore",
    studentValue: item.convertedScore,
    referenceCut: item.referenceCut,
    previousYear:
      latest && latest.cut !== null
        ? { year: latest.year, cut: latest.cut }
        : null,
  };
};

const DetailCard = ({ item }: { item: UniversityDetailItem }) => {
  const tierStyle = {
    "--tier-color": TIER_COLOR_VAR[item.tier],
  } as React.CSSProperties;

  const historyRows = item.cutHistory.filter(
    (entry): entry is { year: number; cut: number } => entry.cut !== null
  );
  const missingYears = item.cutHistory.filter((entry) => entry.cut === null);
  const domain =
    historyRows.length > 0
      ? buildCutDomain(historyRows.map((entry) => entry.cut))
      : null;

  const comparison = resolveComparison(item);
  const metric = comparison?.metric ?? "convertedScore";
  const formatCut = (value: number): string => formatCutValue(metric, value);
  const gapToCut =
    comparison === null
      ? null
      : comparison.studentValue - comparison.referenceCut;

  const scoreWindow =
    comparison === null
      ? null
      : buildScoreWindow(comparison.studentValue, comparison.referenceCut);

  // totalScore 는 가산점을 뺀 기준 만점이라 가산이 붙으면 환산점수가
  // 이를 넘어선다. 오류가 아니라 가산점을 받았다는 신호이므로 명시한다.
  const exceedsBaseMax = item.convertedScore > item.totalScore;

  return (
    <div className={styles.detailCard} style={tierStyle}>
      <div className={styles.detailHead}>
        <div className={styles.detailIdentity}>
          <div className={styles.detailTitleRow}>
            <span className={styles.detailUniversity}>{item.university}</span>
            <JeongsiGroupChip group={item.group} />
          </div>
          <span className={styles.detailDepartment}>{item.department}</span>
        </div>
        <div className={styles.detailBadges}>
          <JeongsiTierBadge tier={item.tier} />
          <JeongsiChanceBadge chance={item.chance} />
        </div>
      </div>

      <div className={styles.detailBody}>
        {/* 핵심 수치 */}
        <div className={styles.detailStats}>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>모집인원</span>
            <span className={styles.detailStatValue}>{item.quota}명</span>
          </div>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>전년 경쟁률</span>
            <span className={styles.detailStatValue}>
              {item.competitionRate === null
                ? "—"
                : `${item.competitionRate.toFixed(2)}:1`}
            </span>
          </div>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>내 환산점수</span>
            <span
              className={`${styles.detailStatValue} ${styles.detailStatValueAccent}`}
            >
              {formatScore(item.convertedScore)}
              <span className={reportStyles.caption}>
                {` / ${item.totalScore}`}
              </span>
            </span>
            {exceedsBaseMax && (
              <span className={styles.bonusChip}>가산점 포함</span>
            )}
          </div>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>
              {comparison?.previousYear
                ? `${comparison.previousYear.year} 컷`
                : "전년도 컷"}
            </span>
            <span className={styles.detailStatValue}>
              {comparison?.previousYear
                ? formatCut(comparison.previousYear.cut)
                : "미공개"}
            </span>
          </div>
        </div>

        {/* 같은 지표로 본 내 위치 vs 합격권 */}
        <div>
          <div className={styles.blockLabel}>
            {STUDENT_CUT_VALUE_LABEL[metric]} vs 3개년 기준컷 (
            {CUT_METRIC_LABEL[metric]} 기준)
          </div>
          {comparison === null || scoreWindow === null ? (
            <div className={styles.nullNotice}>
              전년도 입결이 공개되지 않아 기준컷과 비교할 수 없습니다.
            </div>
          ) : (
            <>
              <ReportComparisonBar
                myValue={toWindowPercent(comparison.studentValue, scoreWindow)}
                rangeStart={toWindowPercent(
                  comparison.referenceCut,
                  scoreWindow
                )}
                rangeEnd={100}
                max={100}
                myLabel="내 위치"
                rangeLabel="기준컷 이상"
              />
              <div className={styles.barAxis}>
                <span>{formatCut(scoreWindow.min)}</span>
                <span>{formatCut(scoreWindow.max)}</span>
              </div>
              <p className={styles.noteLine}>
                {formatStudentCutValue(comparison)} · 3개년 기준컷{" "}
                {formatCut(comparison.referenceCut)} —{" "}
                {gapToCut !== null && gapToCut >= 0
                  ? `기준컷보다 ${formatScore(gapToCut)}${metric === "percentile" ? "백분위점" : "점"} 높습니다.`
                  : `기준컷보다 ${formatScore(Math.abs(gapToCut ?? 0))}${metric === "percentile" ? "백분위점" : "점"} 낮습니다.`}
                {exceedsBaseMax &&
                  ` 환산점수에는 가산점이 더해져 기준 만점 ${item.totalScore}점을 넘습니다.`}
              </p>
            </>
          )}
        </div>

        {/* 컷 추이 + 반영방식 */}
        <div className={styles.detailSplit}>
          <div className={styles.detailSplitCol}>
            <div className={styles.blockLabel}>
              최근 3개년 70% 컷 추이 ({CUT_METRIC_LABEL[metric]})
            </div>
            {domain === null ? (
              <div className={styles.nullNotice}>공개된 입결이 없습니다.</div>
            ) : (
              <>
                <div className={styles.chartFix}>
                  <ReportBarChart
                    data={historyRows.map((entry) => ({
                      name: `${entry.year}`,
                      value: entry.cut,
                    }))}
                    height={150}
                    yDomain={[domain.min, domain.max]}
                    formatTooltip={(value) => formatCut(value)}
                  />
                </div>
                <p className={styles.noteLine}>
                  변화폭이 보이도록 축 범위를 {formatCut(domain.min)}~
                  {formatCut(domain.max)}로 좁혔습니다.
                  {missingYears.length > 0 &&
                    ` ${missingYears.map((entry) => entry.year).join(" · ")}학년도는 미공개입니다.`}
                </p>
              </>
            )}
          </div>

          <div className={styles.detailSplitCol}>
            <div className={styles.blockLabel}>전형 반영방식</div>
            <div className={styles.specList}>
              {item.suneungWeight !== undefined && (
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>전형 요소</span>
                  <span className={styles.specValue}>
                    수능 {item.suneungWeight}% + 학생부 등{" "}
                    {100 - item.suneungWeight}% (판정은 수능 성적 기준)
                  </span>
                </div>
              )}
              <div className={styles.specRow}>
                <span className={styles.specLabel}>반영비율</span>
                <span className={styles.specValue}>{item.ratioSummary}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>활용지표</span>
                <span className={styles.specValue}>{item.metricSummary}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>영어·한국사</span>
                <span className={styles.specValue}>
                  {item.englishHistorySummary}
                </span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>가산점</span>
                <span
                  className={`${styles.specValue} ${
                    item.bonusSummary === null ? styles.specValueMuted : ""
                  }`}
                >
                  {item.bonusSummary ?? "없음"}
                </span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>응시 제한</span>
                <span
                  className={`${styles.specValue} ${
                    item.restrictionSummary === null
                      ? styles.specValueMuted
                      : ""
                  }`}
                >
                  {item.restrictionSummary ?? "제한 없음"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 판단 근거 — 카드가 9장 반복되므로 ✦ 코멘터리 박스 대신
            카드 안에 눌러앉는 조용한 푸터로 둔다 */}
        <div className={styles.detailReason}>
          <span className={styles.detailReasonLabel}>판단 근거</span>
          <p className={styles.detailReasonText}>{item.reason}</p>
        </div>
      </div>
    </div>
  );
};

export const JeongsiUniversityDetailRenderer = ({
  data,
  sectionNumber,
}: JeongsiUniversityDetailRendererProps) => {
  const { items } = data;

  return (
    <>
      {/* Block 1: 헤더 + 읽는 방법 */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />
        <div className={reportStyles.callout}>
          <div className={reportStyles.calloutContent}>
            <p className={reportStyles.small}>
              대학마다 기준 만점과 환산식이 다르므로 환산점수의 절대값은 대학 간
              비교에 쓸 수 없습니다. 각 대학의 합격권 비교 바와 3개년 컷 추이를
              함께 보고 그 대학 안에서의 내 위치만 판단해 주세요.
            </p>
          </div>
        </div>
      </div>

      {/* Block 2~N: 대학별 상세 — 1개 대학 = 1개 페이지 분할 단위 */}
      {items.length === 0 ? (
        <div>
          <div className={styles.nullNotice}>
            상세 분석할 대학이 산출되지 않았습니다.
          </div>
        </div>
      ) : (
        items.map((item) => (
          <div key={`${item.university}-${item.department}-${item.group}`}>
            <DetailCard item={item} />
          </div>
        ))
      )}
    </>
  );
};
