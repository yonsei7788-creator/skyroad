import type { DirectionGuideSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface DirectionGuideRendererProps {
  data: DirectionGuideSection;
  sectionNumber: number;
}

export const DirectionGuideRenderer = ({
  data,
  sectionNumber,
}: DirectionGuideRendererProps) => {
  return (
    <>
      {/* Block 1: SectionHeader + recommended tracks */}
      <div>
        <SectionHeader
          number={sectionNumber}
          title={data.title}
          subtitle="고1을 위한 방향 설정 가이드입니다"
        />

        <div className={styles.card}>
          <div className={styles.cardTitle}>추천 계열</div>
          <div className={`${styles.tagGroup} ${styles.mt12}`}>
            {data.recommendedTracks.map((track) => (
              <span key={track} className={styles.tagAccent}>
                {track}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Block 2: Subject selection guide + preparation advice */}
      <div>
        <div className={`${styles.card} ${styles.mt16}`}>
          <div className={styles.cardTitle}>선택과목 가이드</div>
          <ol className={`${styles.numberedList} ${styles.mt12}`}>
            {data.subjectSelectionGuide.map((item, idx) => (
              <li key={idx} className={styles.numberedListItem}>
                <span className={styles.numberedListNumber}>{idx + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className={`${styles.aiCommentary} ${styles.mt20}`}>
          <div className={styles.aiCommentaryIcon}>AI</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>준비 조언</div>
            <div className={styles.aiCommentaryText}>
              {data.preparationAdvice}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
