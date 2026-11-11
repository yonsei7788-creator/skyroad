import type {
  CombinationSlot,
  JeongsiCombinationSection,
} from "@/libs/jeongsi/report-types";
import type { AdmissionGroup, RiskAppetite } from "@/libs/jeongsi/types";

import { SectionHeader } from "../../report/_components";
import reportStyles from "../../report/_components/report.module.css";
import {
  JeongsiChanceBadge,
  JeongsiTierBadge,
  TIER_COLOR_VAR,
} from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";

interface JeongsiCombinationRendererProps {
  data: JeongsiCombinationSection;
  sectionNumber: number;
}

/** 조합 카드는 항상 가·나·다 3칼럼을 유지한다 — 빈 군도 자리를 비워 보여준다 */
const GROUP_ORDER: AdmissionGroup[] = ["가", "나", "다"];

const RISK_NOTE: Record<RiskAppetite, string> = {
  안정: "합격 확보를 우선하는 성향으로, 안정·적정 비중이 높은 조합을 상단에 배치했습니다.",
  균형: "상향 한 장과 안전망 한 장을 함께 두는 성향으로, 세 군의 구분이 서로 다른 조합을 상단에 배치했습니다.",
  공격: "상단 대학 도전을 우선하는 성향으로, 상향 비중이 높은 조합을 상단에 배치했습니다.",
};

export const JeongsiCombinationRenderer = ({
  data,
  sectionNumber,
}: JeongsiCombinationRendererProps) => {
  const { risk, combinations, overallComment } = data;

  return (
    <>
      {/* Block 1: 헤더 + 지원 성향 */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.riskBanner}>
          <span className={styles.riskLabel}>지원 성향</span>
          <span className={styles.riskValue}>{risk}</span>
          <span className={styles.riskNote}>{RISK_NOTE[risk]}</span>
        </div>

        <p className={styles.noteLine}>
          정시는 가·나·다군에 한 번씩, 최대 세 번 지원합니다. 비어 있는 군은
          오류가 아니라 지원할 모집단위가 없다는 뜻입니다. 특히 다군은 모집
          자체가 드물고 서울대·연세대·고려대·서강대·성균관대·한양대는 다군
          모집을 하지 않아, 상위권 지원에서는 다군이 비는 경우가 흔합니다.
        </p>
      </div>

      {/* Block 2~N: 조합 카드 */}
      {combinations.length === 0 ? (
        <div>
          <div className={styles.nullNotice}>
            유효한 지원 조합이 산출되지 않았습니다.
          </div>
        </div>
      ) : (
        combinations.map((combination, idx) => {
          const slotByGroup = new Map<AdmissionGroup, CombinationSlot>(
            combination.slots.map((slot) => [slot.group, slot])
          );

          return (
            <div key={combination.id}>
              <div className={styles.comboCard}>
                <div className={styles.comboHead}>
                  <span className={styles.comboIndex}>{idx + 1}</span>
                  <span className={styles.comboLabel}>{combination.label}</span>
                  <span className={styles.comboSlotCount}>
                    {combination.slots.length}개 군 지원
                  </span>
                </div>

                <div className={styles.comboGrid}>
                  {GROUP_ORDER.map((group) => {
                    const slot = slotByGroup.get(group);

                    if (!slot) {
                      return (
                        <div key={group} className={styles.comboSlotEmpty}>
                          <span className={styles.comboEmptyMark}>{group}</span>
                          <span className={styles.comboEmptyText}>
                            {group}군 지원 없음
                          </span>
                        </div>
                      );
                    }

                    const slotStyle = {
                      "--slot-color": TIER_COLOR_VAR[slot.tier],
                    } as React.CSSProperties;

                    return (
                      <div
                        key={group}
                        className={styles.comboSlot}
                        style={slotStyle}
                      >
                        <div className={styles.comboGroupRow}>
                          <span className={styles.comboGroupLetter}>
                            <span className={styles.comboGroupLetterMain}>
                              {group}
                            </span>
                            <span className={styles.comboGroupLetterSuffix}>
                              군
                            </span>
                          </span>
                          <JeongsiTierBadge tier={slot.tier} />
                        </div>

                        <div className={styles.comboBody}>
                          <span className={styles.comboUniversity}>
                            {slot.university}
                          </span>
                          <span className={styles.comboDepartment}>
                            {slot.department}
                          </span>
                        </div>

                        <div className={styles.comboSlotFoot}>
                          <JeongsiChanceBadge chance={slot.chance} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.comboStrategy}>
                  <span className={styles.comboStrategyMark}>전략</span>
                  <p className={styles.comboStrategyText}>
                    {combination.strategy}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* 최종 블록: 조합 선택 가이드 */}
      <div>
        <div className={reportStyles.aiCommentary}>
          <div className={reportStyles.aiCommentaryIcon}>✦</div>
          <div className={reportStyles.aiCommentaryContent}>
            <div className={reportStyles.aiCommentaryLabel}>
              <span className={reportStyles.markerSky}>조합 선택 가이드</span>
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
