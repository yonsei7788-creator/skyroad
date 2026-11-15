import type { ReactNode } from "react";

import styles from "./jeongsi-report.module.css";

interface JeongsiPartHeadingProps {
  partNumber: string;
  title: string;
  lead?: ReactNode;
}

/** 섹션 첫머리의 PART 배지 + 제목 + 한 줄 안내 */
export const JeongsiPartHeading = ({
  partNumber,
  title,
  lead,
}: JeongsiPartHeadingProps) => (
  <div className={styles.partHeading}>
    <div className={styles.partHeadingRow}>
      <span className={styles.partBadge}>{partNumber}</span>
      <h2 className={styles.partTitle}>{title}</h2>
    </div>
    {lead && <p className={styles.partLead}>{lead}</p>}
  </div>
);
