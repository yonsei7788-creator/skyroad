import type { ReportPlan, ReportSection } from "@/libs/report/types";

import styles from "./report.module.css";

interface ReportTableOfContentsProps {
  sections: ReportSection[];
  plan?: ReportPlan;
  studentName?: string;
}

interface PartDefinition {
  partNumber: string;
  partTitle: string;
  sectionIds: string[];
}

/**
 * 실제 템플릿 PART_CONFIG와 동기화된 목차 정의.
 * LiteReport / StandardReport / PremiumReport의 PART_CONFIG sectionIds와
 * 반드시 일치시켜야 합니다.
 */
const PART_DEFINITIONS: Record<string, PartDefinition[]> = {
  lite: [
    {
      partNumber: "PART 1",
      partTitle: "진단",
      sectionIds: ["studentProfile", "competencyScore"],
    },
    {
      partNumber: "PART 2",
      partTitle: "정밀 분석",
      sectionIds: [
        "academicAnalysis",
        "courseAlignment",
        "attendanceAnalysis",
        "activityAnalysis",
        "subjectAnalysis",
        "behaviorAnalysis",
      ],
    },
    {
      partNumber: "PART 3",
      partTitle: "전략 & 실행",
      sectionIds: ["interviewPrep"],
    },
    {
      partNumber: "부록",
      partTitle: "부록",
      sectionIds: ["majorExploration"],
    },
    {
      partNumber: "총평",
      partTitle: "전임 컨설턴트 총평",
      sectionIds: ["consultantReview"],
    },
  ],
  standard: [
    {
      partNumber: "PART 1",
      partTitle: "진단",
      sectionIds: ["studentProfile", "competencyScore", "admissionPrediction"],
    },
    {
      partNumber: "PART 2",
      partTitle: "정밀 분석",
      sectionIds: [
        "academicAnalysis",
        "courseAlignment",
        "attendanceAnalysis",
        "activityAnalysis",
        "subjectAnalysis",
        "behaviorAnalysis",
      ],
    },
    {
      partNumber: "PART 3",
      partTitle: "전략 & 실행",
      sectionIds: ["topicRecommendation", "interviewPrep"],
    },
    {
      partNumber: "부록",
      partTitle: "부록",
      sectionIds: ["majorExploration"],
    },
    {
      partNumber: "총평",
      partTitle: "전임 컨설턴트 총평",
      sectionIds: ["consultantReview"],
    },
  ],
  premium: [
    {
      partNumber: "PART 1",
      partTitle: "진단",
      sectionIds: ["studentProfile", "competencyScore", "admissionPrediction"],
    },
    {
      partNumber: "PART 2",
      partTitle: "정밀 분석",
      sectionIds: [
        "academicAnalysis",
        "courseAlignment",
        "attendanceAnalysis",
        "activityAnalysis",
        "subjectAnalysis",
        "behaviorAnalysis",
      ],
    },
    {
      partNumber: "PART 3",
      partTitle: "전략 & 실행",
      sectionIds: [
        "weaknessAnalysis",
        "topicRecommendation",
        "admissionStrategy",
        "actionRoadmap",
        "interviewPrep",
      ],
    },
    {
      partNumber: "부록",
      partTitle: "부록",
      sectionIds: ["majorExploration"],
    },
    {
      partNumber: "총평",
      partTitle: "전임 컨설턴트 2차 검수",
      sectionIds: ["consultantReview"],
    },
  ],
};

export const ReportTableOfContents = ({
  sections,
  plan = "lite",
  studentName,
}: ReportTableOfContentsProps) => {
  const parts = PART_DEFINITIONS[plan] ?? PART_DEFINITIONS.lite;
  const isCompact = plan === "standard" || plan === "premium";

  const sectionMap = new Map<string, ReportSection>(
    sections.map((s) => [s.sectionId, s])
  );

  // 전역 섹션 번호 카운터
  let globalIndex = 0;

  // 파트별 데이터 빌드
  const resolvedParts = parts
    .map((part) => {
      const partSections = part.sectionIds
        .map((id) => {
          const section = sectionMap.get(id);
          if (!section) return null;
          globalIndex++;
          return { section, num: globalIndex };
        })
        .filter(Boolean) as { section: ReportSection; num: number }[];

      return { ...part, resolvedSections: partSections };
    })
    .filter((p) => p.resolvedSections.length > 0);

  return (
    <div
      className={`${styles.tocPage} ${isCompact ? styles.tocCompact : ""}`}
      data-page
    >
      {/* Geometric corner accents */}
      <div className={styles.tocCornerTR} />
      <div className={styles.tocCornerBL} />

      {/* Header */}
      <div className={styles.tocHeader}>
        <span className={styles.tocHeaderLabel}>Contents</span>
        <h2 className={styles.tocHeaderTitle}>목차</h2>
        <div className={styles.tocHeaderLine} />
      </div>

      {/* Parts — 2-column grid for standard/premium */}
      <div
        className={`${styles.tocBody} ${isCompact ? styles.tocBodyGrid : ""}`}
      >
        {resolvedParts.map((part) => (
          <div key={part.partNumber} className={styles.tocPart}>
            <div className={styles.tocPartHeader}>
              <span className={styles.tocPartNumber}>{part.partNumber}</span>
              <span className={styles.tocPartTitle}>{part.partTitle}</span>
            </div>
            <div className={styles.tocItems}>
              {part.resolvedSections.map(({ section, num }) => (
                <div key={section.sectionId} className={styles.tocItem}>
                  <span className={styles.tocNumber}>
                    {String(num).padStart(2, "0")}
                  </span>
                  <span className={styles.tocTitle}>{section.title}</span>
                  <span className={styles.tocDots} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.tocFooter}>
        <span className={styles.tocFooterText}>
          &copy; 2026 SKYROAD{studentName ? ` | ${studentName}` : ""}
        </span>
      </div>
    </div>
  );
};
