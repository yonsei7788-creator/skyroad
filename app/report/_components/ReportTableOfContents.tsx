import type { ReportPlan, ReportSection } from "@/libs/report/types";

import styles from "./report.module.css";

interface ReportTableOfContentsProps {
  sections: ReportSection[];
  plan?: ReportPlan;
  studentName?: string;
  isGraduate?: boolean;
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
      sectionIds: ["studentProfile", "competencyScore", "competitiveProfiling"],
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
      sectionIds: [
        "topicRecommendation",
        "interviewPrep",
        "competitiveProfiling",
      ],
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
        "competitiveProfiling",
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

/** 플랜별 포함 섹션 (빠른 조회용) */
const PLAN_SECTION_SET: Record<string, Set<string>> = {
  lite: new Set(PART_DEFINITIONS.lite.flatMap((p) => p.sectionIds)),
  standard: new Set(PART_DEFINITIONS.standard.flatMap((p) => p.sectionIds)),
  premium: new Set(PART_DEFINITIONS.premium.flatMap((p) => p.sectionIds)),
};

/** 하위 플랜 매핑: 현재 플랜 대비 바로 아래 플랜 */
const LOWER_PLAN: Record<string, string | null> = {
  lite: null,
  standard: "lite",
  premium: "standard",
};

export const ReportTableOfContents = ({
  sections,
  plan = "lite",
  studentName,
  isGraduate,
}: ReportTableOfContentsProps) => {
  // 현재 플랜의 목차만 표시, 하위 플랜에 없고 현재 플랜에서 새로 추가된 섹션을 형광펜 표시
  const parts = PART_DEFINITIONS[plan] ?? PART_DEFINITIONS.lite;
  const currentPlanSections = PLAN_SECTION_SET[plan] ?? PLAN_SECTION_SET.lite;
  const lowerPlan = LOWER_PLAN[plan];
  const lowerPlanSections = lowerPlan ? PLAN_SECTION_SET[lowerPlan] : null;
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
        .filter((id) => !(id === "courseAlignment" && isGraduate))
        .map((id) => {
          const section = sectionMap.get(id);
          if (!section) return null;
          globalIndex++;
          // 현재 플랜에 있지만 하위 플랜에는 없는 섹션 = 이 플랜에서 새로 추가된 항목
          const isUpgrade = lowerPlanSections
            ? currentPlanSections.has(id) && !lowerPlanSections.has(id)
            : false;
          return {
            sectionId: id,
            title: section.title,
            num: globalIndex,
            isUpgrade,
          };
        })
        .filter(Boolean) as {
        sectionId: string;
        title: string;
        num: number;
        isUpgrade: boolean;
      }[];

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

      {/* Parts — 2-column grid */}
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
              {part.resolvedSections.map(
                ({ sectionId, title, num, isUpgrade }) => (
                  <div key={sectionId} className={styles.tocItem}>
                    <span className={styles.tocNumber}>
                      {String(num).padStart(2, "0")}
                    </span>
                    <span
                      className={`${styles.tocTitle} ${isUpgrade ? styles.tocUpgrade : ""}`}
                    >
                      {title}
                    </span>
                    <span className={styles.tocDots} />
                  </div>
                )
              )}
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
