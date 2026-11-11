import type {
  JeongsiSection,
  UniversityDetailItem,
} from "@/libs/jeongsi/report-types";

import { ReportPage } from "../../report/_components";
import { toneStyleOf } from "./JeongsiBadge";
import styles from "./jeongsi-report.module.css";
import { JEONGSI_PART_CONFIG } from "./part-config";

interface JeongsiTableOfContentsProps {
  sections: JeongsiSection[];
  detailItems: UniversityDetailItem[];
}

export const JeongsiTableOfContents = ({
  sections,
  detailItems,
}: JeongsiTableOfContentsProps) => {
  const presentIds = new Set(sections.map((section) => section.sectionId));
  const parts = JEONGSI_PART_CONFIG.filter((part) =>
    part.sectionIds.some((id) => presentIds.has(id))
  );

  return (
    <ReportPage sectionTitle="CONTENTS" showWatermark={false}>
      <div className={styles.standaloneBody}>
        <div className={styles.tocHead}>
          <span className={styles.tocOverline}>CONTENTS</span>
          <h2 className={styles.tocTitle}>목차</h2>
        </div>

        <div className={styles.tocParts}>
          {parts.map((part) => (
            <div
              key={part.partNumber}
              className={styles.tocPart}
              style={{ "--part-color": part.color } as React.CSSProperties}
            >
              <span className={styles.tocPartNumber}>{part.partNumber}</span>
              <div className={styles.tocPartText}>
                <span className={styles.tocPartTitle}>{part.title}</span>
                <span className={styles.tocPartDesc}>{part.description}</span>
              </div>
            </div>
          ))}
        </div>

        {detailItems.length > 0 && (
          <>
            <div className={`${styles.blockTitle} ${styles.tocUnivTitle}`}>
              PART 5 수록 대학
            </div>
            <div className={styles.tocUnivGrid}>
              {detailItems.map((item) => (
                <div
                  key={`${item.university}-${item.department}-${item.group}`}
                  className={styles.tocUniv}
                  style={toneStyleOf(item.tier)}
                >
                  <span className={styles.tocUnivTier}>{item.tier}</span>
                  <span>
                    <b>{item.university}</b>{" "}
                    <span className={styles.tocUnivDept}>
                      {item.department}
                    </span>
                  </span>
                  <span className={styles.tocUnivGroup}>{item.group}군</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ReportPage>
  );
};
