"use client";

import type {
  ExtractJeongsiSection,
  JeongsiReportContent,
  JeongsiSection,
  JeongsiSectionId,
} from "@/libs/jeongsi/report-types";

import { AutoPaginatedSection } from "../../report/_components";
import reportStyles from "../../report/_components/report.module.css";
import { JeongsiCover } from "./JeongsiCover";
import { JeongsiDivider } from "./JeongsiDivider";
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
 * 표지 → 목차 → (PART 표지 → 본문) × 5 순서로 A4 페이지를 쌓는다.
 *
 * - 페이지 셸(크기·머리말·꼬리말)은 수시와 같은 ReportPage 를 쓴다.
 * - 본문은 AutoPaginatedSection 이 블록 단위로 A4 에 나눈다.
 *   섹션 렌더러의 최상위 자식 하나가 페이지 분할의 기본 단위다.
 * - PART 별 accent 는 --report-accent 를 인라인 style 로 덮는다.
 * - 페이지 번호는 CSS counter 가 그린다. JS 로 textContent 를 쓰면
 *   번호가 두 번 찍히므로 쓰지 않는다.
 */
export const JeongsiReport = ({ data }: JeongsiReportProps) => {
  const { meta, sections } = data;

  const sectionMap = new Map<string, JeongsiSection>(
    sections.map((section) => [section.sectionId, section])
  );

  const findSection = <T extends JeongsiSectionId>(
    id: T
  ): ExtractJeongsiSection<T> | undefined =>
    sectionMap.get(id) as ExtractJeongsiSection<T> | undefined;

  const detail = findSection("jeongsiUniversityDetail");

  const parts = JEONGSI_PART_CONFIG.map((part) => ({
    part,
    sections: part.sectionIds
      .map((id) => sectionMap.get(id))
      .filter((section): section is JeongsiSection => section !== undefined),
  })).filter((entry) => entry.sections.length > 0);

  return (
    <div className={`${reportStyles.report} ${styles.jeongsiReport}`}>
      <div className={reportStyles.reportWrapper}>
        <JeongsiCover
          meta={meta}
          score={findSection("jeongsiScoreAnalysis")}
          recommendation={findSection("jeongsiRecommendation")}
          combination={findSection("jeongsiCombination")}
        />

        <JeongsiTableOfContents
          sections={sections}
          detailItems={detail?.items ?? []}
        />

        {parts.map(({ part, sections: partSections }) => {
          const partStyle = {
            "--report-accent": part.color,
          } as React.CSSProperties;

          return (
            <div key={part.partNumber} style={partStyle}>
              <JeongsiDivider
                part={part}
                index={JEONGSI_PART_CONFIG.indexOf(part)}
              />

              {partSections.map((section) => (
                <AutoPaginatedSection
                  key={section.sectionId}
                  sectionTitle={`${part.partNumber} ${part.title}`}
                  studentName=""
                >
                  <JeongsiSectionRenderer
                    section={section}
                    partNumber={part.partNumber}
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
