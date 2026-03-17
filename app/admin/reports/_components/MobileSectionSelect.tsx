"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import styles from "./MobileSectionSelect.module.css";

interface Section {
  sectionId: string;
  title: string;
}

interface MobileSectionSelectProps {
  sections: Section[];
  activeIndex: number;
  onSelect: (index: number) => void;
  checkedSections: Set<string>;
}

export const MobileSectionSelect = ({
  sections,
  activeIndex,
  onSelect,
  checkedSections,
}: MobileSectionSelectProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeSection = sections[activeIndex];
  const label = activeSection
    ? `${String(activeIndex + 1).padStart(2, "0")}. ${activeSection.title || activeSection.sectionId}`
    : "섹션 선택";

  const handleSelect = useCallback(
    (index: number) => {
      onSelect(index);
      setOpen(false);
    },
    [onSelect]
  );

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span className={styles.triggerLabel}>{label}</span>
        <ChevronDown
          size={16}
          className={`${styles.triggerIcon} ${open ? styles.triggerIconOpen : ""}`}
        />
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownList}>
            {sections.map((s, i) => {
              const isActive = i === activeIndex;
              const isChecked = checkedSections.has(s.sectionId);
              return (
                <button
                  key={s.sectionId}
                  className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
                  onClick={() => handleSelect(i)}
                  type="button"
                >
                  <span className={styles.optionNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.optionTitle}>
                    {s.title || s.sectionId}
                  </span>
                  {isChecked && (
                    <Check size={14} className={styles.optionCheck} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
