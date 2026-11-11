import { CUT_METRIC_LABEL } from "@/libs/jeongsi/report/cut-format";
import type {
  CutComparison,
  JeongsiUniversityDetailSection,
  UniversityDetailItem,
} from "@/libs/jeongsi/report-types";
import type { ResultMetric } from "@/libs/jeongsi/types";

import {
  JeongsiChanceBadge,
  JeongsiGroupChip,
  JeongsiTierBadge,
  toneStyleOf,
} from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";
import { JeongsiPartHeading } from "./JeongsiPartHeading";

interface JeongsiUniversityDetailRendererProps {
  data: JeongsiUniversityDetailSection;
  partNumber: string;
}

const UNIT: Record<ResultMetric, string> = {
  percentile: "백분위점",
  convertedScore: "점",
};

const STUDENT_LABEL: Record<ResultMetric, string> = {
  percentile: "나",
  convertedScore: "내 환산점수",
};

/** 위치 축 라벨이 가장자리에서 잘리지 않도록 가운데 정렬 기준점을 안쪽에 둔다 */
const LABEL_EDGE_PERCENT = 7;

/** 두 라벨이 이 거리(%)보다 가까우면 위아래로 엇갈려 놓는다 */
const LABEL_COLLISION_PERCENT = 14;

const formatSigned = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(1)}`;

const clampLabel = (percent: number): number =>
  Math.min(100 - LABEL_EDGE_PERCENT, Math.max(LABEL_EDGE_PERCENT, percent));

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

interface AxisWindow {
  min: number;
  max: number;
}

/**
 * 위치 축의 표시 구간. 0부터 그리면 내 값과 컷이 한쪽 끝에 몰려 구분이
 * 안 되므로 값이 모인 구간만 보여주고, 축 양 끝 값을 함께 적는다.
 */
const buildAxisWindow = (values: number[]): AxisWindow => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.2, 1);
  return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
};

const toPercent = (value: number, window: AxisWindow): number =>
  ((value - window.min) / (window.max - window.min)) * 100;

interface PositionAxisProps {
  comparison: CutComparison;
  cuts: { year: number; cut: number }[];
}

const PositionAxis = ({ comparison, cuts }: PositionAxisProps) => {
  const { studentValue, referenceCut, metric } = comparison;
  const window = buildAxisWindow([
    studentValue,
    referenceCut,
    ...cuts.map((entry) => entry.cut),
  ]);
  const meX = toPercent(studentValue, window);
  const cutX = toPercent(referenceCut, window);
  const labelsCollide = Math.abs(meX - cutX) < LABEL_COLLISION_PERCENT;

  return (
    <>
      <div className={`${styles.blockTitle} ${styles.positionTitle}`}>
        내 위치{" "}
        <span className={styles.blockTitleSub}>
          · {CUT_METRIC_LABEL[metric]} 기준, 축 {window.min}–{window.max}
        </span>
      </div>
      <div className={styles.positionAxis}>
        <div className={styles.positionTrack} />
        <div className={styles.positionPass} style={{ left: `${cutX}%` }} />
        <div className={styles.positionCut} style={{ left: `${cutX}%` }} />
        <span
          className={styles.positionLabel}
          style={{
            left: `${clampLabel(cutX)}%`,
            top: labelsCollide ? -38 : -20,
            color: "var(--tone-fg)",
          }}
        >
          기준컷 {referenceCut.toFixed(1)}
        </span>

        {/* 값이 가까운 연도 라벨끼리 겹치지 않도록 값 순서대로 두 줄에 번갈아 놓는다 */}
        {[...cuts]
          .sort((a, b) => a.cut - b.cut)
          .map((entry, index) => {
            const x = toPercent(entry.cut, window);
            return (
              <div key={entry.year}>
                <div
                  className={styles.positionTick}
                  style={{ left: `${x}%` }}
                />
                <span
                  className={styles.positionTickLabel}
                  style={{
                    left: `${clampLabel(x)}%`,
                    top: 38 + (index % 2) * 14,
                  }}
                >
                  {entry.year} 컷 {entry.cut}
                </span>
              </div>
            );
          })}

        <div className={styles.positionMe} style={{ left: `${meX}%` }} />
        <span
          className={styles.positionLabel}
          style={{ left: `${clampLabel(meX)}%`, top: -20 }}
        >
          {STUDENT_LABEL[metric]} {studentValue.toFixed(1)}
        </span>

        <span className={styles.positionEnd} style={{ left: 0 }}>
          {window.min}
        </span>
        <span className={styles.positionEnd} style={{ right: 0 }}>
          {window.max}
        </span>
      </div>
    </>
  );
};

interface DetailProfileProps {
  item: UniversityDetailItem;
  index: number;
}

const DetailProfile = ({ item, index }: DetailProfileProps) => {
  const comparison = resolveComparison(item);
  const gap =
    comparison === null
      ? null
      : comparison.studentValue - comparison.referenceCut;
  const knownCuts = item.cutHistory.filter(
    (entry): entry is { year: number; cut: number } => entry.cut !== null
  );

  // totalScore 는 가산점을 뺀 기준 만점이라 가산이 붙으면 환산점수가
  // 이를 넘어선다. 오류가 아니라 가산점을 받았다는 신호이므로 명시한다.
  const exceedsBaseMax = item.convertedScore > item.totalScore;

  const specRows: [string, string][] = [
    ...(item.suneungWeight !== undefined
      ? [
          [
            "전형 요소",
            `수능 ${item.suneungWeight}% + 학생부 등 ${100 - item.suneungWeight}% (판정은 수능 성적 기준)`,
          ] as [string, string],
        ]
      : []),
    ["반영비율", item.ratioSummary],
    ["활용지표", item.metricSummary],
    ["영어·한국사", item.englishHistorySummary],
    ["가산점", item.bonusSummary ?? "없음"],
    ["응시 제한", item.restrictionSummary ?? "제한 없음"],
  ];

  return (
    <div style={toneStyleOf(item.tier)}>
      <div className={styles.profileHead}>
        <div className={styles.profileTitleBlock}>
          <span className={styles.profileOverline}>
            UNIVERSITY PROFILE {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className={styles.profileTitle}>
            {item.university}{" "}
            <span className={styles.profileDept}>{item.department}</span>
          </h3>
        </div>
        <div className={styles.profilePills}>
          <JeongsiGroupChip group={item.group} />
          <JeongsiTierBadge tier={item.tier} />
          <JeongsiChanceBadge chance={item.chance} tier={item.tier} />
        </div>
      </div>

      <div className={styles.profileStats}>
        <div className={styles.profileStat}>
          <span className={styles.statLabel}>내 환산점수</span>
          <span className={styles.profileStatValue}>
            {item.convertedScore.toFixed(1)}
            <span className={styles.profileStatUnit}> / {item.totalScore}</span>
          </span>
          {exceedsBaseMax && (
            <span className={styles.bonusNote}>가산점 포함</span>
          )}
        </div>
        <div className={styles.profileStat}>
          <span className={styles.statLabel}>기준컷 대비</span>
          {comparison === null || gap === null ? (
            <span className={`${styles.profileStatValue} ${styles.muted}`}>
              비교 불가
            </span>
          ) : (
            <span className={`${styles.profileStatValue} ${styles.toneText}`}>
              {formatSigned(gap)}
              <span className={styles.profileStatUnit}>
                {" "}
                {UNIT[comparison.metric]}
              </span>
            </span>
          )}
        </div>
        <div className={styles.profileStat}>
          <span className={styles.statLabel}>모집인원</span>
          <span className={styles.profileStatValue}>
            {item.quota}
            <span className={styles.profileStatUnit}> 명</span>
          </span>
        </div>
        <div className={styles.profileStat}>
          <span className={styles.statLabel}>전년 경쟁률</span>
          <span className={styles.profileStatValue}>
            {item.competitionRate === null ? (
              "—"
            ) : (
              <>
                {item.competitionRate.toFixed(2)}
                <span className={styles.profileStatUnit}> : 1</span>
              </>
            )}
          </span>
        </div>
      </div>

      {comparison === null ? (
        <div className={`${styles.emptyNotice} ${styles.positionTitle}`}>
          전년도 입결이 공개되지 않아 기준컷과 비교할 수 없습니다.
        </div>
      ) : (
        <PositionAxis comparison={comparison} cuts={knownCuts} />
      )}

      <div className={styles.profileColumns}>
        <div className={styles.profileColumn}>
          <span className={styles.blockTitle}>
            3개년 70% 컷{" "}
            {comparison && (
              <span className={styles.blockTitleSub}>
                · {CUT_METRIC_LABEL[comparison.metric]}
              </span>
            )}
          </span>
          <div className={styles.ruledList}>
            {item.cutHistory.map((entry) => (
              <div key={entry.year} className={styles.cutRow}>
                <span>{entry.year}학년도</span>
                {entry.cut === null ? (
                  <span className={styles.muted}>미공개</span>
                ) : (
                  <b>{entry.cut}</b>
                )}
              </div>
            ))}
            {comparison && (
              <div className={styles.cutRowReference}>
                <span>3개년 기준컷</span>
                <span>{comparison.referenceCut.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.profileColumn}>
          <span className={styles.blockTitle}>전형 반영방식</span>
          <div className={styles.ruledList}>
            {specRows.map(([label, value]) => (
              <div key={label} className={styles.specRow}>
                <span className={styles.specLabel}>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.insightBox} ${styles.profileReason}`}>
        <span className={styles.insightLabel}>추천 이유</span>
        <p className={styles.insightText}>{item.reason}</p>
      </div>
    </div>
  );
};

export const JeongsiUniversityDetailRenderer = ({
  data,
  partNumber,
}: JeongsiUniversityDetailRendererProps) => {
  const { items } = data;

  return (
    <>
      {/* Block 1: 제목 */}
      <JeongsiPartHeading
        partNumber={partNumber}
        title={data.title}
        lead="대학마다 기준 만점과 환산식이 달라 환산점수는 대학 간 비교에 쓰지 않습니다. 대학마다 그 대학 안에서의 내 위치를 보세요."
      />

      {/* Block 2~N: 대학 1곳 = 페이지 분할 단위 1개 */}
      {items.length === 0 ? (
        <div className={styles.emptyNotice}>
          상세 분석할 대학이 산출되지 않았습니다.
        </div>
      ) : (
        items.map((item, index) => (
          <DetailProfile
            key={`${item.university}-${item.department}-${item.group}`}
            item={item}
            index={index}
          />
        ))
      )}
    </>
  );
};
