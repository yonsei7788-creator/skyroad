import type { ReportMeta } from "@/libs/report/types";

import styles from "./report.module.css";

interface ReportCoverProps {
  meta: ReportMeta;
}

const PLAN_LABEL: Record<string, string> = {
  lite: "Lite",
  standard: "Standard",
  premium: "Premium",
};

export const ReportCover = ({ meta }: ReportCoverProps) => {
  const { plan, studentInfo, createdAt } = meta;
  const isPremium = plan === "premium";
  const isStandard = plan === "standard";
  const isLite = plan === "lite";
  const date = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className={`${styles.coverPage} ${
        isPremium ? styles.coverPremiumBg : ""
      } ${isStandard ? styles.coverStandardBg : ""}`}
      data-page
    >
      {/* Geometric corner decorations */}
      <div className={styles.coverCornerTR} />
      <div className={styles.coverCornerBL} />
      {(isPremium || isStandard) && <div className={styles.coverDotGrid} />}
      {isPremium && <div className={styles.coverGlow} />}

      {/* Header: brand + plan badge */}
      <div className={styles.coverHeader}>
        <div className={styles.coverBrand}>SKYROAD</div>
        <div
          className={`${styles.coverPlanBadge} ${
            isPremium ? styles.coverBadgePremium : ""
          } ${isLite ? styles.coverBadgeOutline : ""}`}
        >
          {PLAN_LABEL[plan]} Report
        </div>
      </div>

      {/* Main: title + divider + subtitle */}
      <div className={styles.coverMain}>
        <h1
          className={`${styles.coverTitle} ${
            isPremium ? styles.coverPremiumTitle : ""
          }`}
        >
          생활기록부
          <br />
          분석 리포트
        </h1>

        <div
          className={`${styles.coverDivider} ${
            isPremium ? styles.coverDividerGradient : ""
          }`}
        />

        <p className={styles.coverSubtitle}>
          {studentInfo.name} 학생의 생기부를 AI가 정밀 분석하여
          <br />
          맞춤형 입시 전략을 제안합니다.
        </p>
      </div>

      {/* Bottom: student info */}
      <div
        className={`${styles.coverStudentCard} ${
          isPremium ? styles.coverStudentCardPremium : ""
        }`}
      >
        <div className={styles.coverStudentRow}>
          <span className={styles.coverStudentLabel}>학생</span>
          <span className={styles.coverStudentValue}>{studentInfo.name}</span>
        </div>
        <div className={styles.coverStudentRow}>
          <span className={styles.coverStudentLabel}>학년 / 계열</span>
          <span className={styles.coverStudentValue}>
            {studentInfo.grade}학년 / {studentInfo.track}
          </span>
        </div>
        {studentInfo.targetUniversity && (
          <div className={styles.coverStudentRow}>
            <span className={styles.coverStudentLabel}>목표 대학</span>
            <span className={styles.coverStudentValue}>
              {studentInfo.targetUniversity} {studentInfo.targetDepartment}
            </span>
          </div>
        )}
        <div className={styles.coverStudentRow}>
          <span className={styles.coverStudentLabel}>발행일</span>
          <span className={styles.coverStudentValue}>{date}</span>
        </div>
      </div>
    </div>
  );
};
