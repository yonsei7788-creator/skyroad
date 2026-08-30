import type { ReactNode } from "react";

import styles from "./report.module.css";

interface ReportPageProps {
  children: ReactNode;
  pageNumber?: number;
  sectionTitle?: string;
  studentName?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showWatermark?: boolean;
}

export const ReportPage = ({
  children,
  pageNumber,
  sectionTitle,
  studentName,
  showHeader = true,
  showFooter = true,
  showWatermark = true,
}: ReportPageProps) => {
  return (
    <div className={styles.page} data-page>
      {showWatermark && <div className={styles.watermark}>시대 컨설팅</div>}

      {showHeader && (
        <div className={styles.pageHeader}>
          <span className={styles.pageHeaderBrand}>시대 컨설팅 리포트</span>
          {sectionTitle && (
            <span className={styles.pageHeaderSection}>{sectionTitle}</span>
          )}
        </div>
      )}

      {children}

      {showFooter && (
        <div className={styles.pageFooter}>
          <span className={styles.pageFooterText}>
            &copy; 2026 시대 컨설팅{studentName ? ` | ${studentName}` : ""}
          </span>
          <span className={styles.pageNumber} data-page-number />
        </div>
      )}
    </div>
  );
};
