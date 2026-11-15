import styles from "./jeongsi-report.module.css";
import { JUDGEMENT_CRITERIA } from "./judgement-format";

/**
 * 구분·합격 가능성 판정 기준 (모든 대학 공통). 값은 엔진 상수에서 온다.
 * "계산값"(내 값·기준컷·차이)과 "판단"(구분·가능성)을 잇는 규칙을 그대로 보인다.
 */
export const JeongsiCriteriaTable = () => (
  <div className={styles.criteriaBox}>
    <span className={styles.criteriaTitle}>판정 기준 (모든 대학 공통)</span>
    <div className={styles.criteriaGrid}>
      <span className={styles.criteriaHead}>구분</span>
      <span className={styles.criteriaHead}>기준컷 대비 격차</span>
      <span className={styles.criteriaHead}>합격 가능성</span>
      {JUDGEMENT_CRITERIA.map((row) => (
        <span key={row.tier} className={styles.criteriaRow}>
          <b>{row.tier}</b>
          <span>{row.range}</span>
          <span>{row.chance}</span>
        </span>
      ))}
    </div>
    <p className={styles.criteriaNote}>
      격차 단위는 환산점수로 비교한 대학은 만점 대비 %(환산점수 차이 ÷ 만점 ×
      100), 평균 백분위로 비교한 대학은 백분위점입니다. 기준컷은 공개된 2025년,
      2026년 70% 컷을 가중평균하고 모집인원 변화를 반영한 값입니다. 구간은
      실측으로 정했습니다. 2025 입결로 만든 기준컷과 2026 실제 70% 컷을 두 해
      모두 환산점수 입결이 있고 모집군이 같은 모집단위에서 견줘, 같은 여유였던
      곳이 다음 해 컷을 넘은 비율(실측)로 나눴습니다. 입결이 한 해뿐이거나, 과거
      입결이 다른 모집군에서 나왔거나, 평균 백분위로 비교한 대학은 여유가 커도
      &lsquo;안정&rsquo; 대신 &lsquo;적정&rsquo;으로 표시합니다. 평균 백분위로
      비교한 대학은 실측 표본이 없어 실측 비율을 싣지 않습니다. 실측 비율은 과거
      한 해의 변동으로 본 참고치이며, 실제 합격선은 해마다 달라질 수 있습니다.
    </p>
  </div>
);
