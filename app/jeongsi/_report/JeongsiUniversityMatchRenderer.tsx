import type { JeongsiUniversityMatchSection } from "@/libs/jeongsi/report-types";

import { JeongsiGroupChip } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";
import { JeongsiPartHeading } from "./JeongsiPartHeading";

interface JeongsiUniversityMatchRendererProps {
  data: JeongsiUniversityMatchSection;
  partNumber: string;
}

export const JeongsiUniversityMatchRenderer = ({
  data,
  partNumber,
}: JeongsiUniversityMatchRendererProps) => {
  const { items, overallComment } = data;

  return (
    <>
      {/* Block 1: 제목 */}
      <JeongsiPartHeading
        partNumber={partNumber}
        title={data.title}
        lead="합격 가능성과 별개로, 영역별 반영비율과 활용지표가 내 성적 구조에 유리한 순서입니다."
      />

      {/* Block 2~N: 순위 목록. 대학 한 곳이 쪽 나눔 단위 1개다.
          첫 대학만 목록 머리선과 한 블록으로 묶는다. */}
      {items.length === 0 ? (
        <div className={styles.emptyNotice}>
          희망 조건에 맞는 대학이 산출되지 않았습니다.
        </div>
      ) : (
        items.map((item, index) => {
          const row = (
            <div
              key={`${item.university}-${item.department}-${item.group}`}
              className={styles.rankItem}
            >
              <span className={styles.rankNumber}>{index + 1}</span>
              <div className={styles.rankBody}>
                <div className={styles.rankTitleRow}>
                  <span className={styles.rankTitle}>
                    {item.university}{" "}
                    <span className={styles.rankDept}>{item.department}</span>
                  </span>
                  <JeongsiGroupChip group={item.group} />
                </div>
                <div className={styles.chipRow}>
                  <span className={styles.specChip}>
                    반영 {item.ratioSummary}
                  </span>
                  <span className={styles.specChip}>{item.metricSummary}</span>
                </div>
                <p className={styles.rankReason}>{item.reason}</p>
              </div>
            </div>
          );
          return index === 0 ? (
            <div key="rank-first" className={styles.rankList}>
              {row}
            </div>
          ) : (
            row
          );
        })
      )}

      {/* Block 3: 총평 */}
      <div className={styles.insightBox}>
        <span className={styles.insightLabel}>반영방식 총평</span>
        <p className={styles.insightText}>{overallComment}</p>
      </div>
    </>
  );
};
