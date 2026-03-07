import type { BookRecommendationSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface BookRecommendationRendererProps {
  data: BookRecommendationSection;
  sectionNumber: number;
}

export const BookRecommendationRenderer = ({
  data,
  sectionNumber,
}: BookRecommendationRendererProps) => {
  return (
    <div className={styles.section}>
      <SectionHeader
        number={sectionNumber}
        title={data.title}
        subtitle="생기부와 연계할 수 있는 도서를 추천합니다"
      />

      {(data.books ?? []).map((book, idx) => (
        <div key={idx} className={styles.card}>
          <div className={`${styles.flexRowStart} ${styles.gap14}`}>
            <span className={`${styles.sectionNumber} ${styles.sizeCircleSm}`}>
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className={styles.flexOne}>
              <div className={styles.cardTitle}>{book.title}</div>
              <div className={`${styles.small} ${styles.mt4}`}>
                {book.author}
              </div>
              {book.relatedSubject && (
                <div className={`${styles.tagGroup} ${styles.mt8}`}>
                  <span className={styles.tag}>{book.relatedSubject}</span>
                </div>
              )}
            </div>
          </div>

          <p className={`${styles.body} ${styles.mt14}`}>
            {safeText(book.reason)}
          </p>

          <div className={`${styles.callout} ${styles.mt14}`}>
            <div className={styles.calloutContent}>
              <span className={styles.emphasis}>생기부 연결점:</span>{" "}
              {safeText(book.connectionToRecord)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
