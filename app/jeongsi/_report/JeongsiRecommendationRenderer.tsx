import { Fragment } from "react";

import type {
  CutComparison,
  JeongsiRecommendationSection,
  RecommendationItem,
  UnitJudgement,
} from "@/libs/jeongsi/report-types";

import { TIER_ORDER, toneStyleOf } from "./JeongsiBadge";
import type { RecommendableTier } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";
import { JeongsiCriteriaTable } from "./JeongsiCriteriaTable";
import { JeongsiPartHeading } from "./JeongsiPartHeading";
import {
  BAND_EDGES,
  METRIC_NAME,
  describeAdmitPosition,
  formatGapPoints,
  formatJudgementValue,
  formatPassRate,
  formatResultYears,
  toAxisPercent,
} from "./judgement-format";

interface JeongsiRecommendationRendererProps {
  data: JeongsiRecommendationSection;
  partNumber: string;
}

/**
 * 판정 근거가 생기기 전(2026-11-14)에 저장된 리포트용 비교값.
 * cutComparison 도 없으면 컷이 전부 환산점수 기준이던 시절의 값으로 복원한다.
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

/** 모든 대학 공통 축(스나이핑 하한 ~ 안정 상한) 위의 내 위치 */
const PositionBar = ({ judgement }: { judgement: UnitJudgement }) => (
  <div className={styles.bandTrack}>
    <div
      className={`${styles.bandZone} ${styles.bandSnipe}`}
      style={{ left: 0, width: `${BAND_EDGES.상향}%` }}
    />
    <div
      className={`${styles.bandZone} ${styles.bandReach}`}
      style={{
        left: `${BAND_EDGES.상향}%`,
        width: `${BAND_EDGES.적정 - BAND_EDGES.상향}%`,
      }}
    />
    <div
      className={`${styles.bandZone} ${styles.bandMatch}`}
      style={{
        left: `${BAND_EDGES.적정}%`,
        width: `${BAND_EDGES.안정 - BAND_EDGES.적정}%`,
      }}
    />
    <div
      className={`${styles.bandZone} ${styles.bandSafety}`}
      style={{ left: `${BAND_EDGES.안정}%`, right: 0 }}
    />
    <div
      className={styles.bandMarker}
      style={{ left: `${toAxisPercent(judgement.gapRatio)}%` }}
    />
  </div>
);

interface RecommendationRowProps {
  item: RecommendationItem;
  style: React.CSSProperties;
}

const RecommendationRow = ({ item, style }: RecommendationRowProps) => {
  const { judgement } = item;
  const legacy = judgement ? null : resolveComparison(item);

  return (
    <div className={styles.recItem} style={style}>
      <div className={styles.recRow}>
        <span className={styles.recName}>
          <b>{item.university}</b> <span>{item.department}</span>
          {item.outsideTargetCategory && (
            <span className={styles.outsideChip}>희망 학과와 다른 분류</span>
          )}
          {judgement && (
            <span className={styles.recBasis}>
              {METRIC_NAME[judgement.metric]} 비교 /{" "}
              {formatResultYears(judgement)}
              {describeAdmitPosition(judgement) &&
                ` / ${describeAdmitPosition(judgement)?.short}`}
            </span>
          )}
        </span>
        <span className={styles.alignCenter}>{item.group}</span>
        <span className={styles.alignRight}>
          {judgement
            ? formatJudgementValue(judgement.studentValue)
            : legacy
              ? formatJudgementValue(legacy.studentValue)
              : "—"}
        </span>
        <span className={styles.alignRight}>
          {judgement
            ? formatJudgementValue(judgement.referenceCut)
            : legacy
              ? formatJudgementValue(legacy.referenceCut)
              : "—"}
        </span>
        <div className={styles.gapCell}>
          {judgement ? (
            <>
              <PositionBar judgement={judgement} />
              <span className={styles.gapValue}>
                {formatGapPoints(judgement.gapPoints)}
              </span>
            </>
          ) : legacy ? (
            <span className={styles.gapValue}>
              {formatGapPoints(legacy.studentValue - legacy.referenceCut)}
            </span>
          ) : (
            <span className={styles.muted}>비교 불가</span>
          )}
        </div>
        <span className={`${styles.alignRight} ${styles.toneText}`}>
          {item.chance}
          {judgement?.historicalPassRate != null && (
            <span className={styles.passRate}>
              실측 {formatPassRate(judgement.historicalPassRate)}
            </span>
          )}
        </span>
      </div>
      <p className={styles.recComment}>{item.comment}</p>
      {(item.suneungWeight !== undefined || item.selectionNote) && (
        <p className={styles.recNote}>
          수능 {item.suneungWeight ?? 100}% 전형
          {item.selectionNote ? `, 수능 외 요소: ${item.selectionNote}` : ""}.
          구분은 수능 성적만으로 본 위치입니다.
        </p>
      )}
    </div>
  );
};

export const JeongsiRecommendationRenderer = ({
  data,
  partNumber,
}: JeongsiRecommendationRendererProps) => {
  const { groups, notices, overallComment, notListed, notCompared } = data;

  const orderedGroups = TIER_ORDER.map((tier) =>
    groups.find((group) => group.tier === tier)
  ).filter((group): group is (typeof groups)[number] => group !== undefined);

  const countOf = (tier: RecommendableTier): number =>
    orderedGroups.find((group) => group.tier === tier)?.items.length ?? 0;
  // 스나이핑 칸은 고른 곳이 있을 때만 요약에 보인다
  const summaryTiers = TIER_ORDER.filter(
    (tier) => tier !== "소신" || countOf(tier) > 0
  );

  const hasJudgement = orderedGroups.some((group) =>
    group.items.some((item) => item.judgement)
  );

  return (
    <>
      {/* Block 1: 제목 + 구분별 개수 */}
      <div>
        <JeongsiPartHeading
          partNumber={partNumber}
          title={data.title}
          lead={
            <>
              모든 대학을 <b>내 대학별 환산점수</b>와 그 대학의 환산점수 입결로
              비교해, 같은 기준으로 상향, 적정, 안정을 나눴습니다.
            </>
          }
        />
        <div
          className={`${styles.tierSummary} ${styles.tierSummaryGap}`}
          style={{
            gridTemplateColumns: `repeat(${summaryTiers.length}, minmax(0, 1fr))`,
          }}
        >
          {summaryTiers.map((tier) => (
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

      {/* 판정 기준. 학생이 어느 대학의 구분을 물어도 이 표로 설명된다 */}
      {hasJudgement && <JeongsiCriteriaTable />}

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
          한 곳씩 독립 블록으로 둔다. 그래야 표가 대학 단위로 쪽을 넘긴다. */}
      {orderedGroups.map((group) => {
        const [firstItem, ...restItems] = group.items;
        const toneStyle = toneStyleOf(group.tier);
        const renderRow = (item: RecommendationItem) => (
          <RecommendationRow
            key={`${item.university}-${item.department}-${item.group}`}
            item={item}
            style={
              item.judgement && item.judgement.tier !== group.tier
                ? toneStyleOf(item.judgement.tier)
                : toneStyle
            }
          />
        );

        return (
          <Fragment key={group.tier}>
            <div className={styles.recTable} style={toneStyle}>
              <div className={styles.recHeadRow}>
                <span>대학 / 학과</span>
                <span className={styles.alignCenter}>군</span>
                <span className={styles.alignRight}>내 값</span>
                <span className={styles.alignRight}>기준컷</span>
                <span>기준컷 대비 (소신, 상향, 적정, 안정)</span>
                <span className={styles.alignRight}>합격 가능성</span>
              </div>
              <div className={styles.recTierLabel}>{group.tier}</div>
              {firstItem === undefined ? (
                <div className={styles.recItem}>
                  <span className={styles.muted}>
                    이 구분에 해당하는 대학이 없습니다.
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

      {/* 같은 분류인데 목록에 없는 곳과 비교하지 못한 곳. "왜 이 대학은 없나"에 답한다 */}
      {notListed && notListed.length > 0 && (
        <div className={styles.explainPanel}>
          <span className={styles.explainPanelTitle}>
            비교했지만 목록에 넣지 않은 곳
          </span>
          <div className={styles.ruledList}>
            {notListed.map((row) => (
              <div
                key={`${row.university}-${row.department}-${row.group}`}
                className={styles.notListedRow}
              >
                <span className={styles.notListedName}>
                  <b>{row.university}</b> {row.department} ({row.group}군)
                </span>
                <span className={styles.notListedReason}>{row.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {notCompared && notCompared.length > 0 && (
        <div className={styles.explainPanel}>
          <span className={styles.explainPanelTitle}>
            희망 학과와 같은 분류지만 같은 기준으로 비교하지 못한 곳
          </span>
          {notCompared.map((group) => (
            <div key={group.reason} className={styles.notComparedGroup}>
              <p className={styles.notComparedReason}>{group.reason}</p>
              <p className={styles.notComparedUnits}>
                {group.units.join(", ")}
                {group.moreCount ? ` 외 ${group.moreCount}곳` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 최종 블록: 지원 전략 */}
      <div className={styles.insightBox}>
        <span className={styles.insightLabel}>지원 전략</span>
        <p className={styles.insightText}>{overallComment}</p>
      </div>
    </>
  );
};
