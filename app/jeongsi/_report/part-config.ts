import type { JeongsiSectionId } from "@/libs/jeongsi/report-types";

/**
 * 정시 리포트의 PART 구성.
 *
 * 템플릿(JeongsiReport)·목차·PART 표지·섹션 제목이 공유하는 단일 출처다.
 * color 는 기존 리포트 팔레트(인디고 ~ 블루) 안에서만 고른다.
 * points 는 PART 표지의 "이 파트에서 보는 것" 3칸이다.
 */
export interface JeongsiPartPoint {
  head: string;
  body: string;
}

export interface JeongsiPartConfig {
  partNumber: string;
  title: string;
  description: string;
  color: string;
  sectionIds: JeongsiSectionId[];
  points: JeongsiPartPoint[];
}

export const JEONGSI_PART_CONFIG: JeongsiPartConfig[] = [
  {
    partNumber: "PART 1",
    title: "성적 종합 분석",
    description: "영역별 위치와 강점·약점 구조를 진단합니다.",
    color: "#4f46e5",
    sectionIds: ["jeongsiScoreAnalysis"],
    points: [
      {
        head: "영역별 성적",
        body: "국어·수학·탐구의 표준점수·백분위와 순위",
      },
      { head: "강점과 약점", body: "국·수·탐 평균 백분위 대비 편차" },
      { head: "해석", body: "성적 구조가 지원 판단에 주는 의미" },
    ],
  },
  {
    partNumber: "PART 2",
    title: "나에게 유리한 대학",
    description:
      "반영비율과 활용지표 관점에서 내 성적 구조에 유리한 대학을 고릅니다.",
    color: "#4338ca",
    sectionIds: ["jeongsiUniversityMatch"],
    points: [
      {
        head: "반영비율",
        body: "강점 영역을 크게, 약점 영역을 작게 반영하는 대학",
      },
      {
        head: "활용지표",
        body: "백분위·표준점수·변환표준점수 중 무엇으로 환산하는가",
      },
      { head: "유리도", body: "합격 가능성과 별개로 본 반영방식의 유불리" },
    ],
  },
  {
    partNumber: "PART 3",
    title: "지원 가능 대학·학과",
    description:
      "3개년 기준컷과의 격차로 상향·적정·안정을 나누고 합격 가능성을 매깁니다.",
    color: "#2563eb",
    sectionIds: ["jeongsiRecommendation"],
    points: [
      { head: "기준컷", body: "최근 3개년 70% 컷을 바탕으로 한 비교 기준" },
      {
        head: "격차",
        body: "대학이 공개한 입결 지표로 계산한 내 값과 기준컷의 차이",
      },
      { head: "합격 가능성", body: "높음 · 보통 · 낮음 · 매우낮음 네 단계" },
    ],
  },
  {
    partNumber: "PART 4",
    title: "가·나·다군 지원 조합",
    description: "세 장의 원서를 군마다 어떻게 놓을지 조합으로 비교합니다.",
    color: "#1d4ed8",
    sectionIds: ["jeongsiCombination"],
    points: [
      { head: "지원 성향", body: "성향에 맞춰 상단에 놓은 조합" },
      { head: "조합 비교", body: "군별 원서와 조합마다 갈리는 칸" },
      { head: "전략", body: "각 조합을 고를 때의 판단 기준" },
    ],
  },
  {
    partNumber: "PART 5",
    title: "대학별 상세 분석",
    description:
      "추천 대학의 환산점수, 기준컷 추이, 전형 반영방식을 한 장씩 정리합니다.",
    color: "#3730a3",
    sectionIds: ["jeongsiUniversityDetail"],
    points: [
      {
        head: "내 위치",
        body: "기준컷과 연도별 컷 사이에서 내 값이 놓이는 곳",
      },
      {
        head: "3개년 컷",
        body: "공개된 연도만 쓰고, 미공개 연도는 그대로 표시",
      },
      { head: "반영방식", body: "비율·지표·영어·한국사·가산점" },
    ],
  },
];
