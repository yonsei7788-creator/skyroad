import { Fragment } from "react";

import type {
  CutComparison,
  JeongsiRecommendationSection,
  RecommendationItem,
} from "@/libs/jeongsi/report-types";
import type { ResultMetric } from "@/libs/jeongsi/types";

import { TIER_ORDER, toneStyleOf } from "./JeongsiBadge";
import type { RecommendableTier } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";
import { JeongsiPartHeading } from "./JeongsiPartHeading";

interface JeongsiRecommendationRendererProps {
  data: JeongsiRecommendationSection;
  partNumber: string;
}

/** 격차 막대 트랙 폭(px). .gapTrack 의 width 와 같아야 한다 */
const GAP_TRACK_PX = 120;

const UNIT: Record<ResultMetric, string> = {
  percentile: "백분위점",
  convertedScore: "점",
};

/**
 * 컷 비교값. cutComparison 이 생기기 전에 저장된 리포트는 컷이 전부
 * 환산점수 기준이었으므로 그 기준으로 복원한다.
 */
const resolveComparison = (item: RecommendationItem): CutComparison | null => {
  if (item.cutComparison !== undefined) {
    return item.cutComparison;
  }
  if (item.referenceCut === null) {
    return null;
  }
  return {
    metric: "convertedScore",
    studentValue: item.convertedScore,
    referenceCut: item.referenceCut,
    previousYear: null,
  };
};

const formatSigned = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(1)}`;

interface GapScale {
  zeroX: number;
  pxPerUnit: number;
}

/**
 * 지표별 막대 축. 백분위점과 환산점수는 단위가 달라 한 축에 그릴 수
 * 없으므로, 같은 지표끼리만 같은 축(최소 격차 ~ 최대 격차)을 쓴다.
 */
const buildGapScales = (
  comparisons: CutComparison[]
): Map<ResultMetric, GapScale> => {
  const scales = new Map<ResultMetric, GapScale>();
  const metrics: ResultMetric[] = ["percentile", "convertedScore"];

  metrics.forEach((metric) => {
    const gaps = comparisons
      .filter((comparison) => comparison.metric === metric)
      .map((comparison) => comparison.studentValue - comparison.referenceCut);
    if (gaps.length === 0) return;

    const negative = Math.max(0, -Math.min(...gaps));
    const positive = Math.max(0, Math.max(...gaps));
    const span = negative + positive || 1;
    scales.set(metric, {
      zeroX: (negative / span) * GAP_TRACK_PX,
      pxPerUnit: GAP_TRACK_PX / span,
    });
  });

  return scales;
};

interface GapCellProps {
  comparison: CutComparison | null;
  scale: GapScale | undefined;
}

const GapCell = ({ comparison, scale }: GapCellProps) => {
  if (comparison === null || scale === undefined) {
    return <span className={styles.muted}>비교 불가</span>;
  }

  const gap = comparison.studentValue - comparison.referenceCut;
  const width = Math.abs(gap) * scale.pxPerUnit;
  const left = gap >= 0 ? scale.zeroX : scale.zeroX - width;

  return (
    <div className={styles.gapCell}>
      <div className={styles.gapTrack}>
        <div className={styles.gapZero} style={{ left: `${scale.zeroX}px` }} />
        <div
          className={styles.gapBar}
          style={{ left: `${left}px`, width: `${width}px` }}
        />
      </div>
      <span className={styles.gapValue}>
        {formatSigned(gap)}
        <span className={styles.unit}>{UNIT[comparison.metric]}</span>
      </span>
    </div>
  );
};

const formatReferenceCut = (comparison: CutComparison | null): string => {
  if (comparison === null) return "—";
  const value = comparison.referenceCut.toFixed(1);
  return comparison.metric === "percentile" ? value : `${value}점`;
};

interface RecommendationRowProps {
  item: RecommendationItem;
  comparison: CutComparison | null;
  scales: Map<ResultMetric, GapScale>;
  className: string;
  style: React.CSSProperties;
}

const RecommendationRow = ({
  item,
  comparison,
  scales,
  className,
  style,
}: RecommendationRowProps) => (
  <div className={`${styles.recItem} ${className}`} style={style}>
    <div className={styles.recRow}>
      <span className={styles.recName}>
        <b>{item.university}</b> <span>{item.department}</span>
      </span>
      <span className={styles.alignCenter}>{item.group}</span>
      <span className={styles.alignRight}>{item.quota}</span>
      <span className={styles.alignRight}>
        {formatReferenceCut(comparison)}
      </span>
      <GapCell
        comparison={comparison}
        scale={comparison ? scales.get(comparison.metric) : undefined}
      />
      <span className={`${styles.alignRight} ${styles.toneText}`}>
        {item.chance}
      </span>
    </div>
    <p className={styles.recComment}>{item.comment}</p>
    {item.suneungWeight !== undefined && (
      <p className={styles.recNote}>
        수능 {item.suneungWeight}% + 학생부 등 {100 - item.suneungWeight}%
        전형입니다. 구분은 수능 성적만으로 본 위치입니다.
      </p>
    )}
  </div>
);

export const JeongsiRecommendationRenderer = ({
  data,
  partNumber,
}: JeongsiRecommendationRendererProps) => {
  const { groups, notices, overallComment } = data;

  const orderedGroups = TIER_ORDER.map((tier) =>
    groups.find((group) => group.tier === tier)
  ).filter((group): group is (typeof groups)[number] => group !== undefined);

  const comparisonOf = new Map<RecommendationItem, CutComparison | null>(
    orderedGroups.flatMap((group) =>
      group.items.map((item) => [item, resolveComparison(item)] as const)
    )
  );
  const scales = buildGapScales(
    [...comparisonOf.values()].filter(
      (comparison): comparison is CutComparison => comparison !== null
    )
  );
  const usedMetrics = new Set(
    [...comparisonOf.values()]
      .filter((comparison): comparison is CutComparison => comparison !== null)
      .map((comparison) => comparison.metric)
  );

  const countOf = (tier: RecommendableTier): number =>
    orderedGroups.find((group) => group.tier === tier)?.items.length ?? 0;

  return (
    <>
      {/* Block 1: 제목 + 구분별 개수 */}
      <div>
        <JeongsiPartHeading
          partNumber={partNumber}
          title={data.title}
          lead={
            <>
              각 대학이 공개한 입결 지표(대부분 <b>국·수·탐 평균 백분위</b>,
              일부 대학은 <b>대학 환산점수</b>)로 계산한 내 값을 3개년 기준컷과
              비교해 상향·적정·안정으로 나눴습니다.
            </>
          }
        />
        <div className={`${styles.tierSummary} ${styles.tierSummaryGap}`}>
          {TIER_ORDER.map((tier) => (
            <div
              key={tier}
              className={styles.tierSummaryCell}
              style={toneStyleOf(tier)}
            >
              <span className={styles.tierSummaryName}>{tier}</span>
              <span className={styles.tierSummaryCount}>
                <b>{countOf(tier)}</b>곳
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 목록을 그대로 읽으면 오해할 수 있는 전제. 표보다 먼저 읽혀야 한다 */}
      {notices.length > 0 && (
        <div className={styles.noticeBox}>
          <span className={styles.noticeLabel}>먼저 확인하세요</span>
          {notices.map((notice, index) => (
            <p key={`notice-${index}`} className={styles.noticeText}>
              {notice}
            </p>
          ))}
        </div>
      )}

      {/* Block 2~N: 구분별 표.
          구분 머리(머리행·구분명)는 첫 대학과 한 블록으로 묶고, 나머지 대학은
          한 곳씩 독립 블록으로 둔다. 그래야 표가 대학 단위로 쪽을 넘기고
          구분 하나가 통째로 밀려 빈 공간이 생기지 않는다. */}
      {orderedGroups.map((group) => {
        const [firstItem, ...restItems] = group.items;
        const toneStyle = toneStyleOf(group.tier);
        const renderRow = (item: RecommendationItem, extraClass = "") => (
          <RecommendationRow
            key={`${item.university}-${item.department}-${item.group}`}
            item={item}
            comparison={comparisonOf.get(item) ?? null}
            scales={scales}
            className={extraClass}
            style={toneStyle}
          />
        );

        return (
          <Fragment key={group.tier}>
            <div className={styles.recTable} style={toneStyle}>
              <div className={styles.recHeadRow}>
                <span>대학 · 학과</span>
                <span className={styles.alignCenter}>군</span>
                <span className={styles.alignRight}>모집</span>
                <span className={styles.alignRight}>기준컷</span>
                <span>기준컷 대비 격차</span>
                <span className={styles.alignRight}>합격 가능성</span>
              </div>
              <div className={styles.recTierLabel}>{group.tier}</div>
              {firstItem === undefined ? (
                <div className={styles.recItem}>
                  <span className={styles.muted}>
                    이 구분에 해당하는 대학이 산출되지 않았습니다.
                  </span>
                </div>
              ) : (
                renderRow(firstItem)
              )}
            </div>
            {restItems.map((item) => renderRow(item))}
          </Fragment>
        );
      })}

      {usedMetrics.size > 1 && (
        <p className={styles.axisNote}>
          격차 막대는 같은 지표(백분위점 · 환산점수)끼리만 같은 축으로
          그렸습니다.
        </p>
      )}

      {/* 최종 블록: 지원 전략 */}
      <div className={styles.insightBox}>
        <span className={styles.insightLabel}>지원 전략</span>
        <p className={styles.insightText}>{overallComment}</p>
      </div>
    </>
  );
};
