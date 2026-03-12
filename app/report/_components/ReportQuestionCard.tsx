import type { InterviewQuestion } from "@/libs/report/types";

import styles from "./report.module.css";

interface ReportQuestionCardProps {
  question: InterviewQuestion;
  number: number;
}

export const ReportQuestionCard = ({
  question,
  number,
}: ReportQuestionCardProps) => {
  return (
    <div className={styles.interviewCard}>
      <div className={styles.interviewNumber}>{number}</div>
      <div className={styles.interviewQuestion}>{question.question}</div>

      {/* Intent as tag */}
      <div className={styles.interviewTag}>{question.intent}</div>

      {/* Premium: sample answer */}
      {question.sampleAnswer && (
        <div className={`${styles.cardNeutral} ${styles.mt16}`}>
          <div className={`${styles.overline} ${styles.mb8}`}>
            모범 답변 가이드
          </div>
          <p className={styles.body}>{question.sampleAnswer}</p>
        </div>
      )}

      {/* Premium: answer strategy as AI commentary */}
      {question.answerStrategy && (
        <div className={`${styles.aiCommentary} ${styles.mt12}`}>
          <div className={styles.aiCommentaryIcon}>✦</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>답변 전략</div>
            <div className={styles.aiCommentaryText}>
              {question.answerStrategy}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
