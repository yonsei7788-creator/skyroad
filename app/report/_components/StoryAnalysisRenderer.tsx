import type {
  CompetencyGrade,
  StoryAnalysisSection,
} from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface StoryAnalysisRendererProps {
  data: StoryAnalysisSection;
  sectionNumber: number;
}

const GRADE_LABEL: Record<CompetencyGrade, string> = {
  S: "매우 우수",
  A: "우수",
  B: "보통",
  C: "미흡",
  D: "부족",
};

export const StoryAnalysisRenderer = ({
  data,
  sectionNumber,
}: StoryAnalysisRendererProps) => {
  return (
    <>
      {/* Block 1: Header + storyline + year progressions + consistency */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.cardAccent}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>메인 스토리라인</div>
          </div>
          <p className={`${styles.small} ${styles.mt6}`}>
            {data.mainStoryline}
          </p>
        </div>

        <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
          학년별 심화 흐름
        </div>
        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th className={styles.tableAlignCenter}>학년</th>
              <th>테마</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {data.yearProgressions.map((yp) => (
              <tr key={yp.year}>
                <td
                  className={`${styles.tableCellBold} ${styles.tableAlignCenter}`}
                >
                  {yp.year}학년
                </td>
                <td className={styles.tableCellBold}>{yp.theme}</td>
                <td className={styles.small}>{yp.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={`${styles.card} ${styles.mt20}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>진로 일관성</div>
            <span className={styles.emphasis}>
              {GRADE_LABEL[data.careerConsistencyGrade]} (
              {data.careerConsistencyGrade})
            </span>
          </div>
          <p className={`${styles.small} ${styles.mt6}`}>
            {data.careerConsistencyComment}
          </p>
        </div>
      </div>

      {/* Block 2: Cross-subject links */}
      {data.crossSubjectLinks && data.crossSubjectLinks.length > 0 && (
        <div>
          <div className={`${styles.h3} ${styles.mb12}`}>과목 간 연결</div>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>출발</th>
                <th>도착</th>
                <th>연결 주제</th>
                <th className={styles.tableAlignCenter}>깊이</th>
              </tr>
            </thead>
            <tbody>
              {data.crossSubjectLinks.map((link, idx) => (
                <tr key={idx}>
                  <td className={styles.tableCellBold}>{link.from}</td>
                  <td className={styles.tableCellBold}>{link.to}</td>
                  <td className={styles.small}>{link.topic}</td>
                  <td className={styles.tableAlignCenter}>
                    <span className={styles.tag}>{link.depth}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Block 3: Enhancement suggestions + interview guide */}
      {(data.storyEnhancementSuggestions?.length ||
        data.interviewStoryGuide) && (
        <div>
          {data.storyEnhancementSuggestions &&
            data.storyEnhancementSuggestions.length > 0 && (
              <>
                <div className={`${styles.h3} ${styles.mb8}`}>
                  스토리 강화 제안
                </div>
                <div className={styles.caption}>
                  {data.storyEnhancementSuggestions.map((suggestion, idx) => (
                    <p key={idx} className={idx > 0 ? styles.mt4 : undefined}>
                      {idx + 1}. {suggestion}
                    </p>
                  ))}
                </div>
              </>
            )}

          {data.interviewStoryGuide && (
            <div className={`${styles.aiCommentary} ${styles.mt20}`}>
              <div className={styles.aiCommentaryIcon}>AI</div>
              <div className={styles.aiCommentaryContent}>
                <div className={styles.aiCommentaryLabel}>
                  면접 스토리텔링 가이드
                </div>
                <div className={styles.aiCommentaryText}>
                  {data.interviewStoryGuide}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
