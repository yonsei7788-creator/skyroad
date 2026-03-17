import type {
  SubjectAnalysisItem,
  SubjectAnalysisSection,
  SubjectRating,
} from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

/** 텍스트 안전 변환 (말줄임 없이 전체 표시) */
const safeOrEmpty = (text: string | undefined): string => {
  if (!text) return "";
  return safeText(text);
};

interface SubjectAnalysisRendererProps {
  data: SubjectAnalysisSection;
  sectionNumber: number;
}

const RATING_ORDER: Record<SubjectRating, number> = {
  excellent: 0,
  good: 1,
  average: 2,
  weak: 3,
};

/**
 * 과목 상세를 논리적 블록으로 렌더링.
 * Block 1: 헤더 + 태그 + 활동요약 + 평가 + 핵심인용 + 심화분석 (한 페이지)
 * Block 2 (optional): 문장 단위 분석 (Premium)
 */
const renderSubjectBlocks = (subject: SubjectAnalysisItem) => {
  const key = `${subject.subjectName}-${subject.year}`;
  const blocks: React.ReactNode[] = [];

  const hasExtras =
    (subject.crossSubjectConnections &&
      subject.crossSubjectConnections.length > 0) ||
    subject.detailedEvaluation ||
    subject.improvementDirection ||
    subject.improvementExample;

  // Block 1: 과목 헤더 + 태그 + 활동요약 + 인용
  blocks.push(
    <div key={key}>
      <div className={styles.h3} style={{ marginBottom: 4 }}>
        {subject.subjectName}
      </div>

      {(subject.competencyTags ?? []).length > 0 && (
        <div className={`${styles.tagGroup} ${styles.mb8}`}>
          {(subject.competencyTags ?? []).map((tag, idx) => (
            <span key={idx} className={styles.tag}>
              {tag.subcategory}
              {tag.assessment && ` (${tag.assessment})`}
            </span>
          ))}
        </div>
      )}

      {subject.activitySummary && (
        <p className={styles.body}>
          <span className={styles.emphasis}>주요 활동 내용:</span>{" "}
          {safeText(subject.activitySummary)}
        </p>
      )}

      {!subject.detailedEvaluation && subject.evaluationComment && (
        <p className={`${styles.small} ${styles.mt6}`}>
          {safeText(subject.evaluationComment)}
        </p>
      )}

      {subject.keyQuotes && subject.keyQuotes.length > 0 && (
        <div className={`${styles.callout} ${styles.mt8}`}>
          <div className={styles.calloutContent}>
            <span className={styles.emphasis}>핵심 인용:</span>{" "}
            {subject.keyQuotes
              .slice(0, 2)
              .map((q) => `"${safeOrEmpty(q)}"`)
              .join(" / ")}
          </div>
        </div>
      )}

      {subject.crossSubjectConnections &&
        subject.crossSubjectConnections.length > 0 && (
          <div className={styles.mt8}>
            <span className={`${styles.emphasis} ${styles.small}`}>
              교과 연결:
            </span>{" "}
            <span className={styles.caption}>
              {subject.crossSubjectConnections
                .map((conn) => `${conn.targetSubject}(${conn.connectionType})`)
                .join(", ")}
            </span>
          </div>
        )}
    </div>
  );

  // Block 2: 상세 평가 (별도 블록 → 페이지 분리 가능)
  if (subject.detailedEvaluation) {
    blocks.push(
      <div key={`${key}-eval`} className={styles.aiCommentary}>
        <div className={styles.aiCommentaryIcon}>✦</div>
        <div className={styles.aiCommentaryContent}>
          <div className={styles.aiCommentaryText}>
            {safeOrEmpty(subject.detailedEvaluation)}
          </div>
        </div>
      </div>
    );
  }

  // Block 3: 개선 방향/예시 (별도 블록 → 페이지 분리 가능)
  if (subject.improvementDirection || subject.improvementExample) {
    blocks.push(
      <div key={`${key}-improve`} className={styles.callout}>
        <div className={styles.calloutContent}>
          {subject.improvementDirection && (
            <>
              <span className={styles.emphasis}>개선 방향:</span>{" "}
              {safeOrEmpty(subject.improvementDirection)}
            </>
          )}
          {subject.improvementDirection && subject.improvementExample && <br />}
          {subject.improvementExample && (
            <>
              <span className={styles.emphasis}>개선 예시:</span>{" "}
              {safeOrEmpty(subject.improvementExample)}
            </>
          )}
        </div>
      </div>
    );
  }

  // Block 3: 문장 단위 분석 (Premium — 분량이 커서 별도 페이지)
  if (subject.sentenceAnalysis && subject.sentenceAnalysis.length > 0) {
    blocks.push(
      <div key={`${key}-sa`}>
        <div
          className={`${styles.caption} ${styles.mb6}`}
          style={{ fontWeight: 600 }}
        >
          {subject.subjectName} — 문장 단위 분석
        </div>
        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>문장</th>
              <th className={styles.tableAlignCenter}>평가</th>
            </tr>
          </thead>
          <tbody>
            {subject.sentenceAnalysis.map((sa, idx) => (
              <tr key={idx}>
                <td>
                  <span className={styles.small}>{sa.sentence}</span>
                  {sa.improvementSuggestion && (
                    <p className={`${styles.caption} ${styles.mt4}`}>
                      <span className={styles.emphasis}>개선:</span>{" "}
                      {safeText(sa.improvementSuggestion)}
                    </p>
                  )}
                </td>
                <td className={`${styles.tableAlignCenter} ${styles.caption}`}>
                  {safeText(sa.evaluation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return blocks;
};

export const SubjectAnalysisRenderer = ({
  data,
  sectionNumber,
}: SubjectAnalysisRendererProps) => {
  const sortedSubjects = [...(data.subjects ?? [])].sort(
    (a, b) => RATING_ORDER[a.rating] - RATING_ORDER[b.rating]
  );

  return (
    <>
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />
      </div>

      {/* 과목별 상세 — 블록 단위로 페이지 분리 */}
      {sortedSubjects.flatMap((subject) => renderSubjectBlocks(subject))}
    </>
  );
};
