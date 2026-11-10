import type { JeongsiUniversityMatchSection } from "@/libs/jeongsi/report-types";

import { SectionHeader } from "../../report/_components";
import reportStyles from "../../report/_components/report.module.css";
import { JeongsiGroupChip } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";

interface JeongsiUniversityMatchRendererProps {
  data: JeongsiUniversityMatchSection;
  sectionNumber: number;
}

export const JeongsiUniversityMatchRenderer = ({
  data,
  sectionNumber,
}: JeongsiUniversityMatchRendererProps) => {
  const { items, overallComment } = data;

  return (
    <>
      {/* Block 1: 헤더 + 지표 설명 */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />
        <div className={reportStyles.callout}>
          <div className={reportStyles.calloutContent}>
            <p className={reportStyles.small}>
              같은 성적이라도 대학마다 영역별 반영비율과 활용지표가 달라
              환산점수가 달라집니다. 내 강점 영역을 크게 반영하는 대학을 유리한
              순서대로 모았습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Block 2~N: 대학별 반영방식 카드 */}
      {items.length === 0 ? (
        <div>
          <div className={styles.nullNotice}>
            희망 조건에 맞는 대학이 산출되지 않았습니다.
          </div>
        </div>
      ) : (
        items.map((item, idx) => (
          <div key={`${item.university}-${item.department}`}>
            <div className={styles.matchCard}>
              <div className={styles.matchHead}>
                <span className={styles.matchRank}>{idx + 1}</span>

                <div className={styles.matchIdentity}>
                  <div className={styles.matchTitleRow}>
                    <span className={styles.matchUniversity}>
                      {item.university}
                    </span>
                    <JeongsiGroupChip group={item.group} />
                  </div>
                  <span className={styles.matchDepartment}>
                    {item.department}
                  </span>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>영역별 반영비율</span>
                  <span className={styles.metaValue}>{item.ratioSummary}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>활용지표</span>
                  <span className={styles.metaValue}>{item.metricSummary}</span>
                </div>
              </div>

              <p className={styles.reasonText}>{item.reason}</p>
            </div>
          </div>
        ))
      )}

      {/* 최종 블록: 총평 */}
      <div>
        <div className={reportStyles.aiCommentary}>
          <div className={reportStyles.aiCommentaryIcon}>✦</div>
          <div className={reportStyles.aiCommentaryContent}>
            <div className={reportStyles.aiCommentaryLabel}>
              <span className={reportStyles.markerSky}>반영방식 총평</span>
            </div>
            <div className={reportStyles.aiCommentaryText}>
              {overallComment}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
