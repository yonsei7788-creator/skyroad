import type { TopicRecommendationSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface TopicRecommendationRendererProps {
  data: TopicRecommendationSection;
  sectionNumber: number;
}

export const TopicRecommendationRenderer = ({
  data,
  sectionNumber,
}: TopicRecommendationRendererProps) => {
  return (
    <>
      {/* Block 1: Header + summary table */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>주제</th>
              <th className={styles.tableAlignCenter}>엮으면 좋은 과목 영역</th>
              {(data.topics ?? [])[0]?.difficulty && (
                <th className={styles.tableAlignCenter}>난이도</th>
              )}
              {(data.topics ?? [])[0]?.synergyScore !== undefined && (
                <th className={styles.tableAlignCenter}>시너지</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(data.topics ?? []).map((topic, idx) => (
              <tr key={idx}>
                <td className={styles.tableCellBold}>{topic.topic}</td>
                <td className={styles.tableAlignCenter}>
                  <div className={styles.tagGroup}>
                    {(Array.isArray(topic.relatedSubjects)
                      ? topic.relatedSubjects
                      : typeof topic.relatedSubjects === "string"
                        ? [topic.relatedSubjects]
                        : []
                    ).map((s, sIdx) => (
                      <span
                        key={`topic-${idx}-sub-${sIdx}`}
                        className={styles.tag}
                      >
                        {String(s)}
                      </span>
                    ))}
                  </div>
                </td>
                {(data.topics ?? [])[0]?.difficulty && (
                  <td className={styles.tableAlignCenter}>
                    <span className={styles.tag}>
                      {topic.difficulty ?? "—"}
                    </span>
                  </td>
                )}
                {(data.topics ?? [])[0]?.synergyScore !== undefined && (
                  <td
                    className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
                  >
                    {topic.synergyScore ?? "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Each topic as its own block */}
      {(data.topics ?? []).map((topic, idx) => (
        <div key={idx}>
          <div className={`${styles.h3} ${styles.mb6}`}>
            {String(idx + 1).padStart(2, "0")}. {topic.topic}
            {topic.importance && (
              <span
                className={
                  styles[
                    `importance_${topic.importance}` as keyof typeof styles
                  ]
                }
              >
                {topic.importance === "high"
                  ? "★ 중요"
                  : topic.importance === "medium"
                    ? "● 보통"
                    : ""}
              </span>
            )}
          </div>

          <div className={`${styles.tagGroup} ${styles.mb8}`}>
            {(Array.isArray(topic.relatedSubjects)
              ? topic.relatedSubjects
              : typeof topic.relatedSubjects === "string"
                ? [topic.relatedSubjects]
                : []
            ).map((s, sIdx) => (
              <span key={`detail-${idx}-sub-${sIdx}`} className={styles.tag}>
                {String(s)}
              </span>
            ))}
            {topic.keywordSuggestions?.map((kw, kIdx) => (
              <span key={`detail-${idx}-kw-${kIdx}`} className={styles.tag}>
                {String(kw)}
              </span>
            ))}
          </div>

          <p className={styles.small}>{safeText(topic.description)}</p>

          {topic.rationale && (
            <p className={`${styles.caption} ${styles.mt6}`}>
              <span className={styles.emphasis}>선정 이유:</span>{" "}
              {safeText(topic.rationale)}
            </p>
          )}

          {topic.existingConnection && (
            <p className={`${styles.caption} ${styles.mt4}`}>
              <span className={styles.emphasis}>기존 탐구 연결:</span>{" "}
              {safeText(topic.existingConnection)}
            </p>
          )}

          {topic.activityDesign && (
            <div className={styles.mt12}>
              <div className={`${styles.small} ${styles.mb6}`}>
                <span className={styles.markerSky} style={{ fontWeight: 600 }}>
                  활동 설계
                </span>
              </div>
              <div className={styles.small}>
                {(topic.activityDesign.steps ?? []).map((step, sIdx) => (
                  <p key={sIdx} className={sIdx > 0 ? styles.mt4 : undefined}>
                    {step}
                  </p>
                ))}
              </div>
              <p className={`${styles.small} ${styles.mt6}`}>
                <span className={styles.emphasis}>예상 결과물:</span>{" "}
                {safeText(topic.activityDesign.expectedResult)}
              </p>
            </div>
          )}

          {topic.sampleEvaluation && (
            <div className={`${styles.callout} ${styles.mt12}`}>
              <div className={styles.calloutContent}>
                <span className={styles.emphasis}>세특 서술 예시:</span>{" "}
                {safeText(topic.sampleEvaluation)}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
};
