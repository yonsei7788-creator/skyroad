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

/** 실제 템플릿 PART_CONFIG와 동기화된 목차 정의 */
const PART_DEFINITIONS: Record<string, PartDefinition[]> = {
  lite: [
    {
      partNumber: "PART 1",
      partTitle: "진단",
      sectionIds: [
        "studentProfile",
        "competencyScore",
        "admissionPrediction",
        "diagnostic",
      ],
    },
    {
      partNumber: "PART 2",
      partTitle: "분석",
      sectionIds: [
        "competencyEvaluation",
        "academicAnalysis",
        "courseAlignment",
        "attendanceAnalysis",
        "activityAnalysis",
        "subjectAnalysis",
      ],
    },
    {
      partNumber: "PART 3",
      partTitle: "전략",
      sectionIds: [
        "weaknessAnalysis",
        "topicRecommendation",
        "admissionStrategy",
        "directionGuide",
      ],
    },
    {
      partNumber: "부록",
      partTitle: "부록",
      sectionIds: ["wordCloud"],
    },
  ],
  standard: [
    {
      partNumber: "PART 1",
      partTitle: "진단",
      sectionIds: [
        "studentProfile",
        "competencyScore",
        "admissionPrediction",
        "diagnostic",
      ],
    },
    {
      partNumber: "PART 2",
      partTitle: "분석",
      sectionIds: [
        "competencyEvaluation",
        "academicAnalysis",
        "courseAlignment",
        "attendanceAnalysis",
        "activityAnalysis",
        "subjectAnalysis",
        "behaviorAnalysis",
        "overallAssessment",
      ],
    },
    {
      partNumber: "PART 3",
      partTitle: "전략",
      sectionIds: [
        "weaknessAnalysis",
        "topicRecommendation",
        "interviewPrep",
        "admissionStrategy",
        "directionGuide",
        "storyAnalysis",
        "actionRoadmap",
      ],
    },
    {
      partNumber: "부록",
      partTitle: "부록",
      sectionIds: ["bookRecommendation", "majorExploration", "wordCloud"],
    },
  ],
  premium: [
    {
      partNumber: "PART 1",
      partTitle: "진단",
      sectionIds: [
        "studentProfile",
        "competencyScore",
        "admissionPrediction",
        "diagnostic",
      ],
    },
    {
      partNumber: "PART 2",
      partTitle: "정밀 분석",
      sectionIds: [
        "competencyEvaluation",
        "academicAnalysis",
        "courseAlignment",
        "attendanceAnalysis",
        "activityAnalysis",
        "subjectAnalysis",
        "behaviorAnalysis",
        "overallAssessment",
      ],
    },
    {
      partNumber: "PART 3",
      partTitle: "전략 & 실행",
      sectionIds: [
        "weaknessAnalysis",
        "topicRecommendation",
        "interviewPrep",
        "admissionStrategy",
        "directionGuide",
        "storyAnalysis",
        "actionRoadmap",
      ],
    },
    {
      partNumber: "부록",
      partTitle: "부록",
      sectionIds: ["bookRecommendation", "majorExploration", "wordCloud"],
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
