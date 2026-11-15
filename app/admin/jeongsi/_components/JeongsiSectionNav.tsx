"use client";

import { JEONGSI_PART_CONFIG } from "@/app/jeongsi/_report/part-config";

import styles from "../../reports/_components/SectionNav.module.css";

interface JeongsiSectionNavProps {
  sections: { sectionId: string; title: string }[];
  activeSectionIndex: number;
  onSectionSelect: (index: number) => void;
  checkedSections: Set<string>;
  title: string;
  subtitle: string;
}

/** 정시 리포트 섹션 목록 — PART 구성은 리포트 템플릿과 같은 출처를 쓴다 */
export const JeongsiSectionNav = ({
  sections,
  activeSectionIndex,
  onSectionSelect,
  checkedSections,
  title,
  subtitle,
}: JeongsiSectionNavProps) => {
  const renderStatusIcon = (sectionId: string, index: number) => {
    if (index === activeSectionIndex) {
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
        <p className={styles.userName}>{title}</p>
        <p className={styles.userMeta}>{subtitle}</p>
      </div>

      {JEONGSI_PART_CONFIG.map((part) => {
        const items = sections
          .map((section, index) => ({ section, index }))
          .filter(({ section }) =>
            part.sectionIds.some((id) => id === section.sectionId)
          );
        if (items.length === 0) return null;

        const checkedCount = items.filter(({ section }) =>
          checkedSections.has(section.sectionId)
        ).length;

        return (
          <div key={part.partNumber} className={styles.partGroup}>
            <div className={styles.partHeader}>
              <span>
                {part.partNumber} {part.title}
              </span>
              <span className={styles.partCount}>
                {checkedCount}/{items.length}
              </span>
            </div>

            {items.map(({ section, index }) => (
              <button
                key={section.sectionId}
                className={`${styles.sectionItem} ${
                  index === activeSectionIndex ? styles.sectionItemActive : ""
                }`}
                onClick={() => onSectionSelect(index)}
              >
                {renderStatusIcon(section.sectionId, index)}
                <span className={styles.sectionNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.sectionTitle}>{section.title}</span>
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );
};
