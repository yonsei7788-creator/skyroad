import { ReportPage } from "../../report/_components";
import styles from "./jeongsi-report.module.css";
import type { JeongsiPartConfig } from "./part-config";

interface JeongsiDividerProps {
  part: JeongsiPartConfig;
  index: number;
}

/** PART 표지 — 큰 번호, 제목, "이 파트에서 보는 것" 3칸 */
export const JeongsiDivider = ({ part, index }: JeongsiDividerProps) => (
  <ReportPage sectionTitle={part.partNumber} showWatermark={false}>
    <div className={styles.standaloneBody}>
      <div className={styles.dividerMain}>
        <span className={styles.dividerNumber}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className={styles.dividerBar} />
        <span className={styles.dividerPart}>{part.partNumber}</span>
        <h2 className={styles.dividerTitle}>{part.title}</h2>
        <p className={styles.dividerDesc}>{part.description}</p>
      </div>

      <div className={styles.dividerPoints}>
        <span className={styles.dividerPointsLabel}>이 파트에서 보는 것</span>
        <div className={styles.dividerPointGrid}>
          {part.points.map((point) => (
            <div key={point.head} className={styles.dividerPoint}>
              <span className={styles.dividerPointHead}>{point.head}</span>
              <span className={styles.dividerPointBody}>{point.body}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </ReportPage>
);
