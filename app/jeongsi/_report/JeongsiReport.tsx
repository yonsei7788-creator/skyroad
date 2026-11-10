"use client";

import { JEONGSI_SECTION_ORDER } from "@/libs/jeongsi/report-types";
import type {
  JeongsiReportContent,
  JeongsiSection,
} from "@/libs/jeongsi/report-types";

import { AutoPaginatedSection, PartPage } from "../../report/_components";
import reportStyles from "../../report/_components/report.module.css";
import { JeongsiCover } from "./JeongsiCover";
import styles from "./jeongsi-report.module.css";
import { JeongsiSectionRenderer } from "./JeongsiSectionRenderer";
import { JeongsiTableOfContents } from "./JeongsiTableOfContents";
import { JEONGSI_PART_CONFIG } from "./part-config";

interface JeongsiReportProps {
  data: JeongsiReportContent;
}

/**
 * 정시 분석 리포트 최상위 템플릿.
 *
 * 커버 → 목차 → PART 1~5 순서로 A4 페이지를 쌓는다.
 * 플랜 분기는 없다 (단일 리포트).
 *
 * - 디자인 토큰은 report.module.css 의 .report 클래스에서 상속받는다.
 * - PART 별 accent 는 StandardReport 와 동일하게 인라인 CSS 변수로 덮는다.
 * - 페이지 번호는 CSS counter 가 그린다 (아래 주석 참고).
 */
export const JeongsiReport = ({ data }: JeongsiReportProps) => {
  const { meta, sections } = data;

  const sectionMap = new Map<string, JeongsiSection>(
    sections.map((section) => [section.sectionId, section])
  );

  let globalSectionNum = 0;

  // 페이지 번호는 JS 로 채우지 않는다.
  // .page 의 counter-increment 와 .pageNumber::after 의 counter() 가
  // 이미 번호를 그리므로, 여기서 textContent 까지 쓰면 "1818" 처럼
  // 두 번 찍힌다. (수시 템플릿의 numbering useEffect 는 비동기로 추가되는
  // 페이지를 못 잡아 아무 값도 쓰지 못한 덕에 증상이 드러나지 않았다.)

  return (
    <div className={`${reportStyles.report} ${styles.jeongsiReport}`}>
      <div className={reportStyles.reportWrapper}>
        <JeongsiCover meta={meta} />

        <JeongsiTableOfContents
          sections={JEONGSI_SECTION_ORDER.map((id) =>
            sectionMap.get(id)
          ).filter(
            (section): section is JeongsiSection => section !== undefined
          )}
        />

        {JEONGSI_PART_CONFIG.map((part) => {
          const partSections = part.sectionIds
            .map((id) => sectionMap.get(id))
            .filter(
              (section): section is JeongsiSection => section !== undefined
            );

          if (partSections.length === 0) return null;

          const partSectionList = partSections.map((section) => {
            globalSectionNum++;
            return { section, num: globalSectionNum };
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
                  studentName=""
                >
                  <JeongsiSectionRenderer
                    section={item.section}
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
