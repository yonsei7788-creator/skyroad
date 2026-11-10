import type { JeongsiSection } from "@/libs/jeongsi/report-types";

import reportStyles from "../../report/_components/report.module.css";
import styles from "./jeongsi-report.module.css";
import { JEONGSI_PART_CONFIG } from "./part-config";

interface JeongsiTableOfContentsProps {
  sections: JeongsiSection[];
}

export const JeongsiTableOfContents = ({
  sections,
}: JeongsiTableOfContentsProps) => {
  const sectionMap = new Map<string, JeongsiSection>(
    sections.map((section) => [section.sectionId, section])
  );

  let globalIndex = 0;

  const parts = JEONGSI_PART_CONFIG.map((part) => {
    const items = part.sectionIds
      .map((id) => sectionMap.get(id))
      .filter((section): section is JeongsiSection => section !== undefined)
      .map((section) => {
        globalIndex++;
        return {
          sectionId: section.sectionId,
          title: section.title,
          num: globalIndex,
        };
      });

    return { ...part, items };
  }).filter((part) => part.items.length > 0);

  return (
    <div className={reportStyles.tocPage} data-page>
      <div className={reportStyles.tocCornerTR} />
      <div className={reportStyles.tocCornerBL} />

      <div className={reportStyles.tocHeader}>
        <span className={reportStyles.tocHeaderLabel}>Contents</span>
        <h2 className={reportStyles.tocHeaderTitle}>목차</h2>
        <div className={reportStyles.tocHeaderLine} />
      </div>

      <div className={reportStyles.tocBody}>
        {parts.map((part) => (
          <div key={part.partNumber} className={reportStyles.tocPart}>
            <div className={reportStyles.tocPartHeader}>
              <span className={reportStyles.tocPartNumber}>
                {part.partNumber}
              </span>
              <span className={reportStyles.tocPartTitle}>{part.title}</span>
            </div>
            <div className={reportStyles.tocItems}>
              {part.items.map((item) => (
                <div key={item.sectionId} className={reportStyles.tocItem}>
                  <span className={reportStyles.tocNumber}>
                    {String(item.num).padStart(2, "0")}
                  </span>
                  <span className={reportStyles.tocTitle}>{item.title}</span>
                  <span className={reportStyles.tocDots} />
                </div>
              ))}
            </div>
            <p className={styles.tocPartDesc}>{part.description}</p>
          </div>
        ))}
      </div>

      <div className={reportStyles.tocFooter}>
        <span className={reportStyles.tocFooterText}>
          &copy; 2026 시대 컨설팅 | 정시 지원 분석 리포트
        </span>
      </div>
    </div>
  );
};
