import type {
  CombinationItem,
  CombinationSlot,
  JeongsiCombinationSection,
} from "@/libs/jeongsi/report-types";
import type { AdmissionGroup, RiskAppetite } from "@/libs/jeongsi/types";

import { toneStyleOf } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";
import { JeongsiPartHeading } from "./JeongsiPartHeading";

interface JeongsiCombinationRendererProps {
  data: JeongsiCombinationSection;
  partNumber: string;
}

/** 조합 표는 항상 가·나·다 3칸을 유지한다. 빈 군도 자리를 비워 보여준다 */
const GROUP_ORDER: AdmissionGroup[] = ["가", "나", "다"];

const RISK_NOTE: Record<RiskAppetite, string> = {
  안정: "합격 확보를 우선하는 성향으로, 안정·적정 비중이 높은 조합을 위에 두었습니다.",
  균형: "상향 한 장과 안전망 한 장을 함께 두는 성향으로, 세 군의 구분이 서로 다른 조합을 위에 두었습니다.",
  공격: "상단 대학 도전을 우선하는 성향으로, 상향 비중이 높은 조합을 위에 두었습니다.",
};

const letterOf = (index: number): string => String.fromCharCode(65 + index);

const slotKeyOf = (slot: CombinationSlot | undefined): string =>
  slot ? `${slot.university}|${slot.department}` : "";

/** 모든 조합에서 같은 원서가 놓인 군. 조합이 둘 이상일 때만 따진다 */
const findCommonGroups = (
  combinations: CombinationItem[]
): Set<AdmissionGroup> => {
  if (combinations.length < 2) return new Set();

  return new Set(
    GROUP_ORDER.filter((group) => {
      const keys = combinations.map((combination) =>
        slotKeyOf(combination.slots.find((slot) => slot.group === group))
      );
      return keys[0] !== "" && keys.every((key) => key === keys[0]);
    })
  );
};

export const JeongsiCombinationRenderer = ({
  data,
  partNumber,
}: JeongsiCombinationRendererProps) => {
  const { risk, combinations, overallComment } = data;
  const commonGroups = findCommonGroups(combinations);
  const showsDistinct = combinations.length > 1;

  return (
    <>
      {/* Block 1: 제목 */}
      <JeongsiPartHeading
        partNumber={partNumber}
        title={data.title}
        lead={
          <>
            지원 성향 <b>{risk}</b> · {RISK_NOTE[risk]}
            {showsDistinct &&
              " 색이 칠해진 칸이 다른 조합과 갈리는 원서입니다."}
          </>
        }
      />

      {/* Block 2: 조합 표. 길면 조합(행) 단위로 페이지가 나뉜다 */}
      {combinations.length === 0 ? (
        <div className={styles.emptyNotice}>
          유효한 지원 조합이 산출되지 않았습니다.
        </div>
      ) : (
        <div className={styles.comboTable}>
          <div className={styles.comboHeadRow}>
            <span className={styles.comboHeadCell}>조합</span>
            {GROUP_ORDER.map((group) => (
              <span key={group} className={styles.comboHeadCell}>
                {group}군
                {commonGroups.has(group) && (
                  <span className={styles.comboHeadCommon}>
                    {" "}
                    · {combinations.length}개 조합 공통
                  </span>
                )}
              </span>
            ))}
          </div>

          {combinations.map((combination, index) => (
            <div key={combination.id} className={styles.comboRow}>
              <div className={styles.comboNameCell}>
                <span className={styles.comboLetter}>{letterOf(index)}</span>
                <span className={styles.comboName}>{combination.label}</span>
              </div>
              {GROUP_ORDER.map((group) => {
                const slot = combination.slots.find(
                  (item) => item.group === group
                );
                if (!slot) {
                  return (
                    <div key={group} className={styles.comboSlot}>
                      <span className={styles.comboEmpty}>지원 없음</span>
                    </div>
                  );
                }
                const distinct = showsDistinct && !commonGroups.has(group);
                return (
                  <div
                    key={group}
                    className={`${styles.comboSlot} ${
                      distinct ? styles.comboSlotDistinct : ""
                    }`}
                    style={toneStyleOf(slot.tier)}
                  >
                    <span className={styles.comboUniv}>{slot.university}</span>
                    <span className={styles.comboDept}>{slot.department}</span>
                    <span className={styles.comboTier}>
                      {slot.tier} · {slot.chance}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Block 3: 조합별 전략 */}
      {combinations.length > 0 && (
        <div>
          <div className={styles.blockTitle}>조합별 전략</div>
          <div className={styles.strategyGrid}>
            {combinations.map((combination, index) => (
              <div key={combination.id} className={styles.strategyCard}>
                <span className={styles.strategyName}>
                  {letterOf(index)} {combination.label}
                </span>
                <p className={styles.strategyText}>{combination.strategy}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block 4: 조합 선택 가이드 */}
      <div className={styles.insightBox}>
        <span className={styles.insightLabel}>조합 선택 가이드</span>
        <p className={styles.insightText}>{overallComment}</p>
      </div>
    </>
  );
};
