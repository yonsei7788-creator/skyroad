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

interface PremiumReportProps {
  data: ReportContent;
}

const PART_CONFIG = [
  {
    partNumber: "PART 1",
    title: "진단",
    description: "학생 유형 분류, 역량 점수, 희망학과 판단",
    color: "#7c3aed",
    sectionIds: ["studentProfile", "competencyScore", "admissionPrediction"],
  },
  {
    partNumber: "PART 2",
    title: "정밀 분석",
    description:
      "학업 분석, 과목 적합도, 출결 분석, 활동 분석, 과목별 분석, 행동특성 분석",
    color: "#6d28d9",
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
    description:
      "부족한 부분 + 보완 전략, 주제 추천, 입시 전략, 실행 로드맵, 면접 준비",
    color: "#8b4cf5",
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
    title: "부록",
    description: "학과 탐색",
    color: "#9a5df7",
    sectionIds: ["majorExploration"],
  },
  {
    partNumber: "총평",
    title: "전임 컨설턴트 총평",
    description: "종합 평가 및 전략 방향",
    color: "#7c3aed",
    sectionIds: ["consultantReview"],
  },
];

export const PremiumReport = ({ data }: PremiumReportProps) => {
  const { meta, sections } = data;
  const order = SECTION_ORDER.premium;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const sectionMap = new Map<string, ReportSection>(
    sections.map((s) => [s.sectionId, s])
  );

  let globalSectionNum = 0;

  // Dynamic page numbering after all pages are rendered
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
    <div className={`${styles.report} ${styles.planPremium}`}>
      <div className={styles.reportWrapper} ref={wrapperRef}>
        <ReportCover meta={meta} />
        <ReportTableOfContents
          sections={order
            .map((id) => sectionMap.get(id))
            .filter((s): s is ReportSection => s !== undefined)}
          plan="premium"
          studentName={meta.studentInfo.name}
          isGraduate={meta.studentInfo.isGraduate}
        />

        {PART_CONFIG.map((part) => {
          const partSections = part.sectionIds
            .filter(
              (id) => !(id === "courseAlignment" && meta.studentInfo.isGraduate)
            )
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
                    plan="premium"
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
