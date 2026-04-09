import type { InterviewPrepSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface InterviewPrepRendererProps {
  data: InterviewPrepSection;
  sectionNumber: number;
}

export const InterviewPrepRenderer = ({
  data,
  sectionNumber,
}: InterviewPrepRendererProps) => {
  const questions = data.questions ?? [];

  return (
    <>
      {/* Block 1: Header + summary */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} highlighted />

        <div className={styles.cardAccent}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              예상 질문 {questions.length}개
            </div>
            {data.readinessScore !== undefined && (
              <span className={styles.emphasis}>
                준비도 {data.readinessScore}점
              </span>
            )}
          </div>
        </div>

        {data.questionDistribution && data.questionDistribution.length > 0 && (
          <div className={`${styles.tagGroup} ${styles.mt12}`}>
            {data.questionDistribution.map((d, qdIdx) => (
              <span key={`qd-${qdIdx}`} className={styles.tag}>
                {d.type} {d.count}개
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 각 질문을 개별 블록으로 — AutoPaginatedSection이 질문 단위로 페이지 분리 */}
      {questions.map((q, idx) => (
        <div key={idx}>
          <div className={`${styles.h3} ${styles.mb6}`}>
            Q{idx + 1}.
            {q.questionType && (
              <span className={`${styles.caption} ${styles.ml8}`}>
                [{q.questionType}]
              </span>
            )}
            {q.importance && (
              <span
                className={
                  styles[`importance_${q.importance}` as keyof typeof styles]
                }
              >
                {q.importance === "high"
                  ? "★ 중요"
                  : q.importance === "medium"
                    ? "● 보통"
                    : ""}
              </span>
            )}
          </div>

          <p className={styles.body}>{q.question}</p>

          {q.intent && (
            <p className={`${styles.body} ${styles.mt6}`}>
              <span className={styles.emphasis}>출제 의도:</span>{" "}
              {safeText(q.intent)}
            </p>
          )}

          {q.answerKeywords && q.answerKeywords.length > 0 && (
            <div className={`${styles.tagGroup} ${styles.mt8}`}>
              {q.answerKeywords.map((kw, kIdx) => (
                <span key={`q-${idx}-kw-${kIdx}`} className={styles.tag}>
                  {String(kw)}
                </span>
              ))}
            </div>
          )}

          {q.answerStrategy && (
            <p className={`${styles.small} ${styles.mt8}`}>
              <span className={styles.emphasis}>답변 전략:</span>{" "}
              {safeText(q.answerStrategy)}
            </p>
          )}

          {q.sampleAnswer && (
            <div className={`${styles.callout} ${styles.mt12}`}>
              <div className={styles.calloutContent}>
                <span className={styles.emphasis}>모범 답변:</span>{" "}
                {safeText(q.sampleAnswer)}
              </div>
            </div>
          )}

          {q.followUpQuestions && q.followUpQuestions.length > 0 && (
            <div className={styles.mt8}>
              {q.followUpQuestions.map((fq, fqIdx) => (
                <p key={fqIdx} className={`${styles.caption} ${styles.mt4}`}>
                  <span className={styles.emphasis}>
                    꼬리 {fqIdx + 1}. {fq.question}
                  </span>{" "}
                  — {safeText(fq.context)}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
};
