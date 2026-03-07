import type { InterviewPrepSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface InterviewPrepRendererProps {
  data: InterviewPrepSection;
  sectionNumber: number;
}

const chunkItems = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const InterviewPrepRenderer = ({
  data,
  sectionNumber,
}: InterviewPrepRendererProps) => {
  // 첫 2개 질문은 요약 블록과 합침, 나머지는 2개씩 묶음
  const questions = data.questions ?? [];
  const firstQuestions = questions.slice(0, 2);
  const restQuestions = questions.slice(2);
  const questionChunks = chunkItems(restQuestions, 2);

  return (
    <>
      {/* Block 1: Header + distribution + 첫 질문들 (요약 바로 밑에서 시작) */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

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
            {data.questionDistribution.map((d) => (
              <span key={d.type} className={styles.tag}>
                {d.type} {d.count}개
              </span>
            ))}
          </div>
        )}

        {/* 첫 질문들을 요약 블록과 같은 div에 포함 */}
        {firstQuestions.map((q, idx) => (
          <div key={idx} className={styles.mt24}>
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
                      : "○ 참고"}
                </span>
              )}
            </div>
            <p className={styles.body}>{q.question}</p>
            {q.intent && (
              <p className={`${styles.caption} ${styles.mt6}`}>
                <span className={styles.emphasis}>출제 의도:</span>{" "}
                {safeText(q.intent)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 나머지 질문 2개씩 묶어서 한 페이지 단위 */}
      {questionChunks.map((chunk, chunkIdx) => (
        <div key={chunkIdx}>
          {chunk.map((q, localIdx) => {
            const globalIdx = chunkIdx * 2 + localIdx + firstQuestions.length;
            return (
              <div
                key={globalIdx}
                className={localIdx > 0 ? styles.mt24 : undefined}
              >
                <div className={`${styles.h3} ${styles.mb6}`}>
                  Q{globalIdx + 1}.
                  {q.questionType && (
                    <span className={`${styles.caption} ${styles.ml8}`}>
                      [{q.questionType}]
                    </span>
                  )}
                  {q.importance && (
                    <span
                      className={
                        styles[
                          `importance_${q.importance}` as keyof typeof styles
                        ]
                      }
                    >
                      {q.importance === "high"
                        ? "★ 중요"
                        : q.importance === "medium"
                          ? "● 보통"
                          : "○ 참고"}
                    </span>
                  )}
                </div>

                <p className={styles.body}>{q.question}</p>

                {q.intent && (
                  <p className={`${styles.caption} ${styles.mt6}`}>
                    <span className={styles.emphasis}>출제 의도:</span>{" "}
                    {q.intent}
                  </p>
                )}

                {q.answerKeywords && q.answerKeywords.length > 0 && (
                  <div className={`${styles.tagGroup} ${styles.mt8}`}>
                    {q.answerKeywords.map((kw) => (
                      <span key={kw} className={styles.tag}>
                        {kw}
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
                      <p
                        key={fqIdx}
                        className={`${styles.caption} ${styles.mt4}`}
                      >
                        <span className={styles.emphasis}>
                          꼬리 {fqIdx + 1}. {fq.question}
                        </span>{" "}
                        — {safeText(fq.context)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
};
