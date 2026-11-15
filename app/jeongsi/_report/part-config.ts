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
    description: "영역별 위치와 강점, 약점 구조를 진단합니다.",
    color: "#4f46e5",
    sectionIds: ["jeongsiScoreAnalysis"],
    points: [
      {
        head: "영역별 성적",
        body: "국어, 수학, 탐구의 표준점수와 백분위, 순위",
      },
      { head: "강점과 약점", body: "국어, 수학, 탐구 평균 백분위 대비 편차" },
      { head: "해석", body: "성적 구조가 지원 판단에 주는 의미" },
    ],
  },
  {
    partNumber: "PART 2",
    title: "나에게 유리한 대학",
    description:
      "추천 대학마다 대학 환산식을 그대로 적용한 실제 점수를 비교합니다.",
    color: "#4338ca",
    sectionIds: ["jeongsiUniversityMatch"],
    points: [
      {
        head: "영역별 점수",
        body: "대학 반영비율로 국어, 수학, 탐구에서 받는 점수와 만점",
      },
      {
        head: "영어와 가산점",
        body: "영어 1등급 대비 깎이는 점수와 한국사, 가산점",
      },
      { head: "기준컷 대비", body: "내 환산점수와 기준컷의 차이" },
    ],
  },
  {
    partNumber: "PART 3",
    title: "지원 가능 대학과 학과",
    description:
      "기준컷과의 격차에 모든 대학 같은 구간을 적용해 상향, 적정, 안정을 나눕니다.",
    color: "#2563eb",
    sectionIds: ["jeongsiRecommendation"],
    points: [
      {
        head: "기준컷",
        body: "공개된 2025년, 2026년 70% 컷(있는 학년도만)으로 만든 비교 기준",
      },
      {
        head: "격차",
        body: "대학이 공개한 입결 지표로 계산한 내 값과 기준컷의 차이",
      },
      {
        head: "합격 가능성",
        body: "안정 높음, 적정 보통, 상향 낮음, 스나이핑 매우낮음",
      },
    ],
  },
  {
    partNumber: "PART 4",
    title: "군별 지원 조합",
    description: "세 장의 원서를 군마다 어떻게 놓을지 조합으로 비교합니다.",
    color: "#1d4ed8",
    sectionIds: ["jeongsiCombination"],
    points: [
      { head: "추천 조합", body: "성향 배분과 희망 학과 일치로 고른 한 조합" },
      { head: "선택 이유", body: "군마다 그 원서를 고른 점수 근거" },
      { head: "다른 조합", body: "조합마다 달라지는 칸과 고를 때의 기준" },
    ],
  },
  {
    partNumber: "PART 5",
    title: "대학별 상세 분석",
    description:
      "추천 대학의 환산점수, 학년도별 컷, 전형 반영방식을 한 장씩 정리합니다.",
    color: "#3730a3",
    sectionIds: ["jeongsiUniversityDetail"],
    points: [
      {
        head: "내 위치",
        body: "기준컷과 연도별 컷 사이에서 내 값이 놓이는 곳",
      },
      {
        head: "학년도별 컷",
        body: "공개된 학년도만 쓰고, 없는 학년도는 그대로 표시",
      },
      { head: "반영방식", body: "반영비율, 활용지표, 영어, 한국사, 가산점" },
    ],
  },
];
