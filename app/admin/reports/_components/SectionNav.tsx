"use client";

import styles from "./SectionNav.module.css";

const PART_CONFIG = [
  {
    label: "PART 1",
    title: "진단",
    sectionIds: ["studentProfile", "competencyScore", "admissionPrediction"],
  },
  {
    label: "PART 2",
    title: "정밀 분석",
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
    label: "PART 3",
    title: "전략 & 실행",
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
    label: "부록",
    title: "부록",
    sectionIds: ["majorExploration"],
  },
];

interface SectionNavProps {
  sections: { sectionId: string; title: string }[];
  activeSectionIndex: number;
  onSectionSelect: (index: number) => void;
  checkedSections: Set<string>;
  hasUnsavedChanges: boolean;
  userName: string | null;
  userEmail: string;
  planName: string;
}

interface GroupedSection {
  sectionId: string;
  title: string;
  globalIndex: number;
  sequenceNumber: number;
}

interface PartGroup {
  label: string;
  title: string;
  sections: GroupedSection[];
}

const buildPartGroups = (
  sections: { sectionId: string; title: string }[]
): PartGroup[] => {
  const sectionIndexMap = new Map<string, number>();
  sections.forEach((s, i) => {
    sectionIndexMap.set(s.sectionId, i);
  });

  let sequenceNumber = 1;
  const partGroups: PartGroup[] = [];

  for (const part of PART_CONFIG) {
    const grouped: GroupedSection[] = [];

    for (const id of part.sectionIds) {
      const globalIndex = sectionIndexMap.get(id);
      if (globalIndex === undefined) continue;

      const section = sections[globalIndex];
      grouped.push({
        sectionId: section.sectionId,
        title: section.title,
        globalIndex,
        sequenceNumber: sequenceNumber++,
      });
    }

    if (grouped.length > 0) {
      partGroups.push({
        label: part.label,
        title: part.title,
        sections: grouped,
      });
    }
  }

  return partGroups;
};

export const SectionNav = ({
  sections,
  activeSectionIndex,
  onSectionSelect,
  checkedSections,
  userName,
  userEmail,
  planName,
}: SectionNavProps) => {
  const partGroups = buildPartGroups(sections);

  const renderStatusIcon = (sectionId: string, globalIndex: number) => {
    if (globalIndex === activeSectionIndex) {
      return (
        <span className={`${styles.statusDot} ${styles.dotActive}`}>●</span>
      );
    }
    if (checkedSections.has(sectionId)) {
      return (
        <span className={`${styles.statusDot} ${styles.dotChecked}`}>✓</span>
      );
    }
    return (
      <span className={`${styles.statusDot} ${styles.dotDefault}`}>○</span>
    );
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.userInfo}>
        <p className={styles.userName}>
          {userName ?? "이름 없음"} · {planName}
        </p>
        <p className={styles.userMeta}>{userEmail}</p>
      </div>

      {partGroups.map((part) => {
        const checkedCount = part.sections.filter((s) =>
          checkedSections.has(s.sectionId)
        ).length;

        return (
          <div key={part.label} className={styles.partGroup}>
            <div className={styles.partHeader}>
              <span>
                {part.label} {part.title}
              </span>
              <span className={styles.partCount}>
                {checkedCount}/{part.sections.length}
              </span>
            </div>

            {part.sections.map((section) => {
              const isActive = section.globalIndex === activeSectionIndex;
              const itemClass = isActive
                ? `${styles.sectionItem} ${styles.sectionItemActive}`
                : styles.sectionItem;

              return (
                <button
                  key={section.sectionId}
                  className={itemClass}
                  onClick={() => onSectionSelect(section.globalIndex)}
                >
                  {renderStatusIcon(section.sectionId, section.globalIndex)}
                  <span className={styles.sectionNumber}>
                    {String(section.sequenceNumber).padStart(2, "0")}
                  </span>
                  <span className={styles.sectionTitle}>{section.title}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
};
