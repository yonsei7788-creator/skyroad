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

interface LiteReportProps {
  data: ReportContent;
}

const PART_CONFIG = [
  {
    partNumber: "PART 1",
    title: "진단",
    description: "학생 유형 분류 및 역량 점수",
    color: "#4f46e5",
    sectionIds: ["studentProfile", "competencyScore"],
  },
  {
    partNumber: "PART 2",
    title: "정밀 분석",
    description:
      "학업 분석, 과목 적합도, 출결, 활동, 과목별 분석, 행동특성 분석",
    color: "#4338ca",
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
    title: "전략 & 실행",
    description: "면접 준비",
    color: "#5b4bd6",
    sectionIds: ["interviewPrep"],
  },
  {
    partNumber: "부록",
    title: "부록",
    description: "학과 탐색",
    color: "#6366f1",
    sectionIds: ["majorExploration"],
  },
  {
    partNumber: "총평",
    title: "전임 컨설턴트 총평",
    description: "종합 평가 및 전략 방향",
    color: "#4f46e5",
    sectionIds: ["consultantReview"],
  },
];

export const LiteReport = ({ data }: LiteReportProps) => {
  const { meta, sections } = data;
  const order = SECTION_ORDER.lite;
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
    <div className={styles.report}>
      <div className={styles.reportWrapper} ref={wrapperRef}>
        <ReportCover meta={meta} />
        <ReportTableOfContents
          sections={order
            .map((id) => sectionMap.get(id))
            .filter((s): s is ReportSection => s !== undefined)}
          plan="lite"
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

          const partStyle = {
            "--report-accent": part.color,
          } as React.CSSProperties;

          return (
            <div key={part.partNumber} style={partStyle}>
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
                    plan="lite"
                    sectionNumber={item.num}
                    isGraduate={meta.studentInfo.isGraduate}
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
