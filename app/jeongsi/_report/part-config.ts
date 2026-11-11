import type { JeongsiSectionId } from "@/libs/jeongsi/report-types";

/**
 * 정시 리포트의 PART 구성.
 *
 * 템플릿(JeongsiReport)과 목차(JeongsiTableOfContents)가 공유하는 단일
 * 출처다. 수시 리포트는 PART_CONFIG 와 목차 정의가 따로 있어 동기화가
 * 어긋날 수 있었으므로, 정시는 처음부터 한곳에서 관리한다.
 *
 * color 는 기존 리포트 팔레트(인디고 ~ 블루) 안에서만 고른다.
 * StandardReport 와 동일하게 --report-accent 를 인라인 style 로 덮는다.
 */
export interface JeongsiPartConfig {
  partNumber: string;
  title: string;
  description: string;
  color: string;
  sectionIds: JeongsiSectionId[];
}

export const JEONGSI_PART_CONFIG: JeongsiPartConfig[] = [
  {
    partNumber: "PART 1",
    title: "성적 종합 분석",
    description: "영역별 위치, 강점과 약점 구조 진단",
    color: "#4f46e5",
    sectionIds: ["jeongsiScoreAnalysis"],
  },
  {
    partNumber: "PART 2",
    title: "나에게 유리한 대학",
    description: "반영비율·활용지표 관점의 유불리 분석",
    color: "#4338ca",
    sectionIds: ["jeongsiUniversityMatch"],
  },
  {
    partNumber: "PART 3",
    title: "지원 가능 대학·학과",
    description: "상향 · 적정 · 안정 구분별 추천",
    color: "#2563eb",
    sectionIds: ["jeongsiRecommendation"],
  },
  {
    partNumber: "PART 4",
    title: "가·나·다군 지원 조합",
    description: "모집군별 조합 시나리오와 전략",
    color: "#1d4ed8",
    sectionIds: ["jeongsiCombination"],
  },
  {
    partNumber: "PART 5",
    title: "대학별 상세 분석",
    description: "환산점수, 기준컷 추이, 전형 반영방식",
    color: "#3730a3",
    sectionIds: ["jeongsiUniversityDetail"],
  },
];
