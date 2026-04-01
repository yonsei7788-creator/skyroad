import type {
  CompetitiveProfilingSection,
  NonAcademicLevel,
} from "@/libs/report/types";

import { TEMPLATES, fillTemplate } from "./competitive-profiling-templates";
import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

/** 기존 3등급 → 5등급 마이그레이션 */
const LEGACY_LEVEL_MAP: Record<string, NonAcademicLevel> = {
  상: "상위권",
  중: "중위권",
  하: "하위권",
};

const normalizeLevel = (level: string): NonAcademicLevel =>
  LEGACY_LEVEL_MAP[level] ?? (level as NonAcademicLevel);

interface CompetitiveProfilingRendererProps {
  data: CompetitiveProfilingSection;
  sectionNumber: number;
}

export const CompetitiveProfilingRenderer = ({
  data,
  sectionNumber,
}: CompetitiveProfilingRendererProps) => {
  const level = normalizeLevel(data.level);
  const { connectivity } = data;
  const comparison = TEMPLATES.competitorComparison[level][connectivity];

  return (
    <>
      {/* Block 0: 헤더 + 종합 진단 */}
      <div>
        <SectionHeader
          number={sectionNumber}
          title={data.title}
          subtitle="실제 평가 흐름 기반 합격 가능성 / 탈락 구조 / 개선 전략 분석"
        />

        <table className={styles.compactTable}>
          <tbody>
            <tr>
              <td className={styles.tableCellBold}>비교과 수준</td>
              <td>{level}</td>
            </tr>
            <tr>
              <td className={styles.tableCellBold}>전공 방향</td>
              <td>{data.majorDirection}</td>
            </tr>
            <tr>
              <td className={styles.tableCellBold}>핵심 활동</td>
              <td>{data.keywords.join(", ")}</td>
            </tr>
            <tr>
              <td className={styles.tableCellBold}>활동 연결성</td>
              <td>{data.connectivity}</td>
            </tr>
            <tr>
              <td className={styles.tableCellBold}>종합 점수</td>
              <td>{data.score}점 / 100점</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Block 1: 현재 진단 */}
      <div>
        <div className={styles.h3}>현재 진단</div>

        <div className={styles.callout}>
          <div className={styles.calloutContent}>
            <p className={styles.body}>{TEMPLATES.summary[level]}</p>
          </div>
        </div>

        <p className={`${styles.small} ${styles.mt8}`}>
          <span className={styles.tableCellBold}>합격 분기점: </span>
          {fillTemplate(
            "{전공 방향} 전공에 대한 설득력과, 여러 활동이 하나의 방향으로 연결되는지 여부에서 결과가 갈릴 가능성이 높습니다.",
            data
          )}
        </p>

        <p className={`${styles.small} ${styles.mt4}`}>
          <span className={styles.tableCellBold}>평가 결과: </span>
          {TEMPLATES.evaluationResult[level]}
        </p>
      </div>

      {/* Block 2: 탈락 구조 + 경쟁자 비교 */}
      <div>
        <div className={styles.h3}>탈락 구조 분석</div>

        <p className={styles.body}>{TEMPLATES.rejectionCommon}</p>

        <div className={`${styles.cardAccent} ${styles.mt8}`}>
          <div className={styles.cardTitle}>구체적 탈락 원인</div>
          <p className={`${styles.small} ${styles.mt4}`}>
            {TEMPLATES.rejectionCause[level]}
          </p>
        </div>

        <div className={`${styles.h3} ${styles.mt12}`}>
          경쟁자 대비 핵심 차이
        </div>

        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>비교 항목</th>
              <th>경쟁자</th>
              <th>현재 학생</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.tableCellBold}>방향성 명확도</td>
              <td>한 문장으로 설명 가능</td>
              <td>{comparison.direction}</td>
            </tr>
            <tr>
              <td className={styles.tableCellBold}>메시지 전달력</td>
              <td>핵심 메시지가 즉시 전달</td>
              <td>{comparison.message}</td>
            </tr>
            <tr>
              <td className={styles.tableCellBold}>활동 연결성</td>
              <td>활동 간 연결이 명확</td>
              <td>{comparison.connection}</td>
            </tr>
          </tbody>
        </table>

        <div className={`${styles.callout} ${styles.mt8}`}>
          <div className={styles.calloutContent}>
            <span className={styles.markerYellow} style={{ fontWeight: 600 }}>
              {TEMPLATES.competitorCoreDifference[connectivity]}
            </span>
          </div>
        </div>
      </div>

      {/* Block 3: 실행 전략 (통합) */}
      <div>
        <div className={styles.h3}>
          <span className={styles.markerYellow}>실행 전략</span>
        </div>

        {TEMPLATES.actionSteps.map((step, idx) => (
          <div key={idx} className={`${styles.cardAccent} ${styles.mt8}`}>
            <div className={styles.cardTitle}>
              {idx + 1}. {step.title}
            </div>
            <p className={`${styles.caption} ${styles.mt4}`}>{step.why}</p>
            <p className={`${styles.small} ${styles.mt4}`}>
              {fillTemplate(step.how, data)}
            </p>
          </div>
        ))}

        <div className={`${styles.callout} ${styles.mt8}`}>
          <div className={styles.calloutContent}>
            <p className={styles.caption}>
              <span className={styles.tableCellBold}>예상 변화: </span>
              {TEMPLATES.expectedChanges.join(" → ")}
              {" → "}
              <span className={styles.markerYellow}>합격 가능성 상승</span>
            </p>
          </div>
        </div>
      </div>

      {/* Block 4: 입학사정관 평가 + 최종 결론 */}
      <div>
        <div className={styles.h3}>입학사정관 관점 평가</div>

        <div className={styles.quoteBox}>
          <div className={styles.quoteText}>
            {fillTemplate(TEMPLATES.evaluatorComment[level], data)}
          </div>
        </div>

        <div className={`${styles.verdict} ${styles.mt12}`}>
          <div className={styles.verdictTitle}>최종 결론</div>
          <div className={styles.verdictBody}>
            {TEMPLATES.finalConclusion[level]}
          </div>
        </div>
      </div>
    </>
  );
};
