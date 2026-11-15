import type {
  JeongsiUniversityMatchSection,
  ScoreBreakdown,
  UnitJudgement,
} from "@/libs/jeongsi/report-types";
import type { ScoreArea } from "@/libs/jeongsi/types";

import { JeongsiGroupChip, toneStyleOf } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";
import { JeongsiPartHeading } from "./JeongsiPartHeading";
import {
  METRIC_NAME,
  formatGapPoints,
  formatJudgementValue,
} from "./judgement-format";

const AREA_LABEL: Record<ScoreArea, string> = {
  korean: "국어",
  math: "수학",
  english: "영어",
  inquiry: "탐구",
};

const formatPoint = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const formatSignedPoint = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${formatPoint(Math.abs(value))}`;

interface ScoreTableProps {
  breakdown: ScoreBreakdown;
  judgement?: UnitJudgement;
}

/**
 * 대학 환산식을 내 성적에 그대로 적용한 점수표. 영역마다 받은 점수와 그 영역
 * 만점을 보여, 어느 영역이 이 대학에서 점수를 벌고 잃는지 숫자로 비교된다.
 */
const ScoreTable = ({ breakdown, judgement }: ScoreTableProps) => (
  <div className={styles.scoreTable}>
    {breakdown.areas.map((area) => (
      <div key={area.area} className={styles.scoreCell}>
        <span className={styles.scoreCellLabel}>
          {AREA_LABEL[area.area]} {formatPoint(area.ratio)}%
        </span>
        <span className={styles.scoreCellValue}>
          {formatPoint(area.earned)}
          <span className={styles.scoreCellMax}>/{formatPoint(area.max)}</span>
        </span>
      </div>
    ))}
    {breakdown.englishVsFirstGrade !== null && (
      <div className={styles.scoreCell}>
        <span className={styles.scoreCellLabel}>영어 1등급 대비</span>
        <span className={styles.scoreCellValue}>
          {formatSignedPoint(breakdown.englishVsFirstGrade)}
        </span>
      </div>
    )}
    {breakdown.bonusAdjustment !== 0 && (
      <div className={styles.scoreCell}>
        <span className={styles.scoreCellLabel}>가산점</span>
        <span className={styles.scoreCellValue}>
          {formatSignedPoint(breakdown.bonusAdjustment)}
        </span>
      </div>
    )}
    <div className={`${styles.scoreCell} ${styles.scoreCellTotal}`}>
      <span className={styles.scoreCellLabel}>내 환산점수</span>
      <span className={styles.scoreCellValue}>
        {formatPoint(breakdown.convertedScore)}
        <span className={styles.scoreCellMax}>
          /{formatPoint(breakdown.totalScore)}
        </span>
      </span>
    </div>
    {judgement && (
      <div
        className={`${styles.scoreCell} ${styles.scoreCellTotal}`}
        style={toneStyleOf(judgement.tier)}
      >
        <span className={styles.scoreCellLabel}>
          기준컷 대비 ({METRIC_NAME[judgement.metric]})
        </span>
        <span className={`${styles.scoreCellValue} ${styles.toneText}`}>
          {formatGapPoints(judgement.gapPoints)}
          <span className={styles.scoreCellMax}>
            {" "}
            {judgement.tier} / 기준컷{" "}
            {formatJudgementValue(judgement.referenceCut)}
          </span>
        </span>
      </div>
    )}
  </div>
);

interface JeongsiUniversityMatchRendererProps {
  data: JeongsiUniversityMatchSection;
  partNumber: string;
}

export const JeongsiUniversityMatchRenderer = ({
  data,
  partNumber,
}: JeongsiUniversityMatchRendererProps) => {
  const { items, overallComment } = data;

  return (
    <>
      {/* Block 1: 제목 */}
      <JeongsiPartHeading
        partNumber={partNumber}
        title={data.title}
        lead="추천 대학(PART 3)을 반영방식이 내 성적 구조에 유리한 순서로 놓고, 대학 환산식을 그대로 적용한 영역별 점수를 함께 보였습니다."
      />

      {/* Block 2~N: 순위 목록. 대학 한 곳이 쪽 나눔 단위 1개다.
          첫 대학만 목록 머리선과 한 블록으로 묶는다. */}
      {items.length === 0 ? (
        <div className={styles.emptyNotice}>
          희망 조건에 맞는 대학이 산출되지 않았습니다.
        </div>
      ) : (
        items.map((item, index) => {
          const row = (
            <div
              key={`${item.university}-${item.department}-${item.group}`}
              className={styles.rankItem}
            >
              <span className={styles.rankNumber}>{index + 1}</span>
              <div className={styles.rankBody}>
                <div className={styles.rankTitleRow}>
                  <span className={styles.rankTitle}>
                    {item.university}{" "}
                    <span className={styles.rankDept}>{item.department}</span>
                  </span>
                  <JeongsiGroupChip group={item.group} />
                </div>
                <div className={styles.chipRow}>
                  <span className={styles.specChip}>
                    반영 {item.ratioSummary}
                  </span>
                  <span className={styles.specChip}>{item.metricSummary}</span>
                </div>
                {item.breakdown && (
                  <ScoreTable
                    breakdown={item.breakdown}
                    judgement={item.judgement}
                  />
                )}
                <p className={styles.rankReason}>{item.reason}</p>
              </div>
            </div>
          );
          return index === 0 ? (
            <div key="rank-first" className={styles.rankList}>
              {row}
            </div>
          ) : (
            row
          );
        })
      )}

      {/* Block 3: 총평 */}
      <div className={styles.insightBox}>
        <span className={styles.insightLabel}>반영방식 총평</span>
        <p className={styles.insightText}>{overallComment}</p>
      </div>
    </>
  );
};
