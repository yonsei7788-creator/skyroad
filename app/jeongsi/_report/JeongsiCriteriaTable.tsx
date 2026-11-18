import { SMALL_QUOTA_MAX } from "@/libs/jeongsi/engine/classify";

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
      모든 대학을 내 대학별 환산점수와 그 대학의 환산점수 입결로 비교합니다.
      격차 단위는 만점 대비 %(환산점수 차이 ÷ 만점 × 100)입니다. 기준컷은 공개된
      2025년, 2026년 70% 컷을 가중평균하고 모집인원 변화를 반영한 값입니다.
      구간은 실측으로 정했습니다. 2025 입결로 만든 기준컷과 2026 실제 70% 컷을
      두 해 모두 환산점수 입결이 있고 모집군이 같은 모집단위에서 견줘, 같은
      여유였던 곳이 다음 해 컷을 넘은 비율(실측)로 나눴습니다. 공개 입결이
      적거나 과거 입결이 다른 모집군에서 나온 대학, 모집인원이 {SMALL_QUOTA_MAX}
      명 이하라 컷이 크게 움직이는 대학은 여유가 커도 &lsquo;안정&rsquo; 대신
      &lsquo;적정&rsquo;으로 표시합니다. 실측 비율은 2025년에서 2026년으로의
      변동으로 본 참고치이며, 실제 합격선은 해마다 달라질 수 있습니다.
    </p>
    <p className={styles.criteriaNote}>
      다른 입시 분석과 구분이 다를 수 있습니다. 이 리포트는 공개 원문 자료(대학
      환산식, 최종등록자 70% 컷, 모집인원)로 다시 계산할 수 있는 값만 씁니다.
      다른 분석이 50% 컷이나 등록자 평균, 모의지원 같은 자체 자료를 기준으로
      삼으면 같은 대학도 구분이 달라질 수 있습니다. 2027 최종 모집인원(수시 이월
      반영)이 발표되면 합격선도 달라질 수 있습니다.
    </p>
  </div>
);
