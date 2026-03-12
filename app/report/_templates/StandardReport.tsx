"use client";

import { useEffect, useRef } from "react";

import { SECTION_ORDER } from "@/libs/report/types";
import type { ReportContent, ReportSection } from "@/libs/report/types";

import {
  AutoPaginatedSection,
  PartPage,
  ReportCover,
  ReportTableOfContents,
} from "../_components";
import styles from "../_components/report.module.css";
import { SectionRenderer } from "./SectionRenderer";

interface StandardReportProps {
  data: ReportContent;
}

const PART_CONFIG = [
  {
    partNumber: "PART 1",
    title: "진단",
    description:
      "생기부 전체를 기반으로 한 학생 유형 분류, 역량 정량 스코어, 합격 예측",
    sectionIds: ["studentProfile", "competencyScore", "admissionPrediction"],
  },
  {
    partNumber: "PART 2",
    title: "분석",
    description:
      "성적 분석, 권장과목 이수, 출결, 창체 활동, 세특, 행동특성 분석",
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
    title: "전략",
    description: "보완 전략, 세특 주제 추천, 입시 전략",
    sectionIds: [
      "weaknessAnalysis",
      "topicRecommendation",
      "admissionStrategy",
    ],
  },
  {
    partNumber: "부록",
    title: "부록",
    description: "예상 면접 질문",
    sectionIds: ["interviewPrep"],
  },
];

export const StandardReport = ({ data }: StandardReportProps) => {
  const { meta, sections } = data;
  const order = SECTION_ORDER.standard;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const sectionMap = new Map<string, ReportSection>(
    sections.map((s) => [s.sectionId, s])
  );

  let globalSectionNum = 0;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const pages = wrapper.querySelectorAll("[data-page]");
    pages.forEach((el, i) => {
      const numEl = el.querySelector("[data-page-number]");
      if (numEl) numEl.textContent = String(i + 1);
    });
  });

  return (
    <div className={`${styles.report} ${styles.planStandard}`}>
      <div className={styles.reportWrapper} ref={wrapperRef}>
        <ReportCover meta={meta} />
        <ReportTableOfContents
          sections={order
            .map((id) => sectionMap.get(id))
            .filter((s): s is ReportSection => s !== undefined)}
          plan="standard"
          studentName={meta.studentInfo.name}
        />

        {PART_CONFIG.map((part) => {
          const partSections = part.sectionIds
            .map((id) => sectionMap.get(id))
            .filter((s): s is ReportSection => s !== undefined);

          if (partSections.length === 0) return null;

          const partSectionList = partSections.map((s) => {
            globalSectionNum++;
            return {
              section: s,
              num: globalSectionNum,
            };
          });

          return (
            <div key={part.partNumber}>
              <PartPage
                partNumber={part.partNumber}
                title={part.title}
                description={part.description}
                sections={partSectionList.map((item) => ({
                  number: String(item.num).padStart(2, "0"),
                  title: item.section.title,
                }))}
              />

              {partSectionList.map((item) => (
                <AutoPaginatedSection
                  key={item.section.sectionId}
                  sectionTitle={item.section.title}
                  studentName={meta.studentInfo.name}
                >
                  <SectionRenderer
                    section={item.section}
                    plan="standard"
                    sectionNumber={item.num}
                  />
                </AutoPaginatedSection>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
