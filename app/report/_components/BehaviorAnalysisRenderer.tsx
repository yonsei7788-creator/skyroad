import type { BehaviorAnalysisSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface BehaviorAnalysisRendererProps {
  data: BehaviorAnalysisSection;
  sectionNumber: number;
}

export const BehaviorAnalysisRenderer = ({
  data,
  sectionNumber,
}: BehaviorAnalysisRendererProps) => {
  return (
    <>
      {/* Block 1: Header + character label + yearly table */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        {/* 캐릭터 라벨 + 인성 점수 */}
        {data.characterLabel && (
          <div className={styles.cardAccent}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                {data.characterLabel.label}
              </div>
              {data.personalityScore !== undefined && (
                <span className={styles.emphasis}>
                  인성 점수 {data.personalityScore}점
                </span>
              )}
            </div>
            {data.characterLabel.rationale && (
              <p className={`${styles.small} ${styles.mt6}`}>
                {data.characterLabel.rationale}
              </p>
            )}
          </div>
        )}

        {/* 일관특성 + 인성 키워드 태그 */}
        <div className={`${styles.tagGroup} ${styles.mt12}`}>
          {data.consistentTraits.map((trait) => (
            <span key={trait} className={styles.tag}>
              {trait}
            </span>
          ))}
          {data.personalityKeywords?.map((kw) => (
            <span key={kw} className={styles.tag}>
              {kw}
            </span>
          ))}
        </div>

        {/* 학년별 분석 테이블 */}
        <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
          학년별 행동특성 분석
        </div>
        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>학년</th>
              <th>분석 내용</th>
              <th className={styles.tableAlignCenter}>핵심 역량</th>
            </tr>
          </thead>
          <tbody>
            {data.yearlyAnalysis.map((year) => (
              <tr key={year.year}>
                <td className={styles.tableCellBold}>{year.year}학년</td>
                <td>
                  <p className={styles.small}>{year.summary}</p>
                  {year.keyQuotes &&
                    year.keyQuotes.map((q, i) => (
                      <p
                        key={i}
                        className={styles.caption}
                        style={{ fontStyle: "italic", marginTop: 4 }}
                      >
                        &ldquo;{q}&rdquo;
                      </p>
                    ))}
                </td>
                <td className={styles.tableAlignCenter}>
                  <div className={styles.tagGroup}>
                    {year.competencyTags.map((tag, idx) => (
                      <span key={idx} className={styles.tag}>
                        {tag.subcategory}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Block 2: AI 종합 평가 + 입시 활용 (통합) */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>AI</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>종합 평가</div>
            <div className={styles.aiCommentaryText}>{data.overallComment}</div>
            <div className={`${styles.aiCommentaryLabel} ${styles.mt12}`}>
              입시 활용 포인트
            </div>
            <div className={styles.aiCommentaryText}>
              {data.admissionRelevance}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
