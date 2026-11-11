import {
  formatCutDifference,
  formatCutValue,
  formatStudentCutValue,
} from "@/libs/jeongsi/report/cut-format";
import type {
  CutComparison,
  JeongsiRecommendationSection,
  RecommendationItem,
} from "@/libs/jeongsi/report-types";
import type { AdmissionTier } from "@/libs/jeongsi/types";

import { SectionHeader } from "../../report/_components";
import reportStyles from "../../report/_components/report.module.css";
import {
  JeongsiChanceBadge,
  JeongsiGroupChip,
  TIER_BG_VAR,
  TIER_COLOR_VAR,
  TIER_HINT,
} from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";

interface JeongsiRecommendationRendererProps {
  data: JeongsiRecommendationSection;
  sectionNumber: number;
}

type RecommendableTier = Exclude<AdmissionTier, "지원불가">;

/** 상향 → 적정 → 안정 순서를 항상 고정한다 */
const TIER_ORDER: RecommendableTier[] = ["상향", "적정", "안정"];

const formatScore = (value: number): string => value.toFixed(1);

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

const RecommendationMetrics = ({ item }: { item: RecommendationItem }) => {
  const comparison = resolveComparison(item);
  const diff =
    comparison === null
      ? null
      : comparison.studentValue - comparison.referenceCut;

  return (
    <div className={styles.recMetrics}>
      <div className={styles.recMetric}>
        <span className={styles.recMetricLabel}>내 환산점수</span>
        <span className={styles.recMetricValue}>
          {formatScore(item.convertedScore)}
        </span>
      </div>
      <div className={styles.recMetric}>
        <span className={styles.recMetricLabel}>
          {comparison?.previousYear
            ? `${comparison.previousYear.year} 컷`
            : "전년도 컷"}
        </span>
        {comparison?.previousYear ? (
          <span className={styles.recMetricValue}>
            {formatCutValue(comparison.metric, comparison.previousYear.cut)}
          </span>
        ) : (
          <span className={styles.recMetricValueNull}>미공개</span>
        )}
      </div>
      <div className={styles.recMetric}>
        <span className={styles.recMetricLabel}>3개년 기준컷 대비</span>
        {comparison === null || diff === null ? (
          <span className={styles.recMetricValueNull}>비교 불가</span>
        ) : (
          <>
            <span
              className={`${styles.recMetricValue} ${
                diff >= 0 ? styles.recMetricValueUp : styles.recMetricValueDown
              }`}
            >
              {formatCutDifference(comparison)}
            </span>
            <span className={reportStyles.caption}>
              {formatStudentCutValue(comparison)} · 기준컷{" "}
              {formatCutValue(comparison.metric, comparison.referenceCut)}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export const JeongsiRecommendationRenderer = ({
  data,
  sectionNumber,
}: JeongsiRecommendationRendererProps) => {
  const { groups, notices, overallComment } = data;

  const orderedGroups = TIER_ORDER.map((tier) =>
    groups.find((group) => group.tier === tier)
  ).filter((group): group is (typeof groups)[number] => group !== undefined);

  return (
    <>
      {/* Block 1: 헤더 + 척도 안내 */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <p className={styles.noteLine}>
          환산점수는 대학마다 식이 달라 대학 간 직접 비교는 의미가 없습니다.
          합격 가능성은 각 대학이 공개한 입결 지표(대부분{" "}
          <strong>국·수·탐 평균 백분위</strong>, 일부 대학은{" "}
          <strong>대학 환산점수</strong>)로, 같은 지표로 계산한 내 값과 비교해
          판정했습니다.
        </p>
      </div>

      {/* 목록을 그대로 읽으면 오해할 수 있는 전제. 표보다 먼저 읽혀야 한다.

          notices 는 AI 가 아니라 buildRecommendationNotices() 가 만든다.
          출력은 짧은 라벨이 아니라 긴 문장이고, 개수도 0~2개로 변한다.
          그래서 (1) 한 건이면 불릿 없이 문단으로 쓰고,
          (2) 헤더와 한 덩어리로 묶지 않고 독립 블록으로 둔다 —
          길어졌을 때 통째로 밀리면서 첫 구분 블록까지 끌고 가지 않도록
          페이지 분할 지점을 엔진이 고르게 하기 위해서다. */}
      {notices.length > 0 && (
        <div>
          <div className={styles.noticeBox}>
            <span className={styles.noticeLabel}>먼저 확인하세요</span>
            {notices.length === 1 ? (
              <p className={styles.noticeText}>{notices[0]}</p>
            ) : (
              <ul className={styles.noticeList}>
                {notices.map((notice, idx) => (
                  <li key={`notice-${idx}`} className={styles.noticeItem}>
                    {notice}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Block 2~4: 구분별 블록 */}
      {orderedGroups.map((group) => {
        const tierStyle = {
          "--tier-color": TIER_COLOR_VAR[group.tier],
          "--tier-bg": TIER_BG_VAR[group.tier],
        } as React.CSSProperties;

        return (
          <div key={group.tier}>
            <div className={styles.tierBlock} style={tierStyle}>
              <div className={styles.tierBlockHead}>
                <div className={styles.tierHeadLeft}>
                  <span className={styles.tierName}>{group.tier}</span>
                  <span className={styles.tierHint}>
                    {TIER_HINT[group.tier]}
                  </span>
                </div>
                <span className={styles.tierCount}>{group.items.length}개</span>
              </div>

              <div className={styles.tierItems}>
                {group.items.length === 0 ? (
                  <div className={styles.tierEmpty}>
                    이 구분에 해당하는 대학이 산출되지 않았습니다.
                  </div>
                ) : (
                  group.items.map((item) => (
                    <div
                      key={`${item.university}-${item.department}`}
                      className={styles.recItem}
                    >
                      <div className={styles.recHead}>
                        <div className={styles.recIdentity}>
                          <div className={styles.recTitleRow}>
                            <span className={styles.recUniversity}>
                              {item.university}
                            </span>
                            <JeongsiGroupChip group={item.group} />
                            <span className={reportStyles.caption}>
                              모집 {item.quota}명
                            </span>
                          </div>
                          <span className={styles.recDepartment}>
                            {item.department}
                          </span>
                        </div>
                        <JeongsiChanceBadge chance={item.chance} />
                      </div>

                      <RecommendationMetrics item={item} />

                      <p className={styles.recComment}>{item.comment}</p>
                      {item.suneungWeight !== undefined && (
                        <p className={styles.recNote}>
                          수능 {item.suneungWeight}% + 학생부 등{" "}
                          {100 - item.suneungWeight}% 전형입니다. 구분은 수능
                          성적만으로 본 위치입니다.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* 최종 블록: 지원 전략 총평 */}
      <div>
        <div className={reportStyles.aiCommentary}>
          <div className={reportStyles.aiCommentaryIcon}>✦</div>
          <div className={reportStyles.aiCommentaryContent}>
            <div className={reportStyles.aiCommentaryLabel}>
              <span className={reportStyles.markerSky}>지원 전략 총평</span>
            </div>
            <div className={reportStyles.aiCommentaryText}>
              {overallComment}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
