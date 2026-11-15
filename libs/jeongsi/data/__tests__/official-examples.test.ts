import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadAdmissionPlans, resetJeongsiDataSource } from "..";
import { convertScore } from "@/libs/jeongsi/engine/convert-score";

import type {
  InquirySubject,
  JeongsiAdmissionPlan,
  MathElective,
  SuneungGrade,
  SuneungScore,
} from "../../types";

// ============================================================
// 실데이터 환산식이 대학 공식 계산예시를 재현하는지 검증한다.
//
// 예시 원문은 libs/jeongsi/data/source/formulas.json 의
// officialExample 에 있다. 시행계획 JSON 을 다시 만들면
// (scripts/jeongsi/build-engine-data.ts) 이 테스트로 해석 회귀를 잡는다.
//
// 예시의 탐구 변환표준점수는 2027 표 값이라 2026 표에 그대로 없다.
// 해당 케이스는 표의 두 칸에 예시 값을 넣고 그 백분위로 계산한다.
// ============================================================

interface OfficialExample {
  name: string;
  planId: string;
  korean: number;
  math: number;
  mathElective?: MathElective;
  englishGrade: SuneungGrade;
  historyGrade: SuneungGrade;
  /** 표준점수 또는 백분위(백분위형 대학). 변표형이면 변환표준점수 */
  inquiry: [number, number];
  science?: boolean;
  convertedInquiry?: boolean;
  percentileMetric?: boolean;
  expected: number;
}

const EXAMPLES: OfficialExample[] = [
  {
    // 사회복지: 국70·수60·영1등급·탐80 → 790 (영어 가산은 배율 전)
    name: "강서대 백분위형 + 배율 전 영어 가산",
    planId: "강서대학교-사회복지학과-다",
    korean: 70,
    math: 60,
    englishGrade: 1,
    historyGrade: 1,
    inquiry: [80, 10],
    percentileMetric: true,
    expected: 790,
  },
  {
    // 국어128·수학136·탐구 변표65.45+63.03·영어2등급(0)·한국사4등급(0) → 390.504
    name: "경희대 만점 보강(600) + 변표 2과목 합",
    planId: "경희대학교-국어국문학과-가",
    korean: 128,
    math: 136,
    englishGrade: 2,
    historyGrade: 4,
    inquiry: [65.45, 63.03],
    convertedInquiry: true,
    expected: 390.504,
  },
  {
    // 영어영문학과: 국어125·수학137·영어2(198)·탐구63+67 → 143.85×5 = 719.25
    // 광운대 예시는 "가산점 미포함" 이다. 한국사 1등급 가산 10점을 더한다.
    name: "광운대 200점 기준 ×5",
    planId: "광운대학교-영어영문학과-나",
    korean: 125,
    math: 137,
    englishGrade: 2,
    historyGrade: 1,
    inquiry: [63, 67],
    convertedInquiry: true,
    expected: 719.25 + 10,
  },
  {
    // 자연계: 국116·수123·과탐63+68·영어3 → 179.475 (과탐가산 185.37)
    // 원문은 "한국사1 → −1" 이지만 감점표상 −1 은 4~6등급이다.
    // 예시의 등급 표기 오류로 보고 감점이 −1 인 4등급으로 넣는다.
    name: "충남대 ÷200 + 과탐 과목별 10% 가산",
    planId: "충남대학교-물리학과-가",
    korean: 116,
    math: 123,
    englishGrade: 3,
    historyGrade: 4,
    inquiry: [63, 68],
    science: true,
    expected: 185.37,
  },
  {
    // 국120→108, 수(미적분)120→156+31.2, 영3등급 190,
    // 과탐 2과목 합120→96+9.6, 한국사3등급 +2 → 592.8
    name: "한국해양대 미적분 20% + 과탐 2과목 응시 10%",
    planId: "국립한국해양대학교-조선해양시스템공학부-가",
    korean: 120,
    math: 120,
    mathElective: "미적분",
    englishGrade: 3,
    historyGrade: 3,
    inquiry: [60, 60],
    science: true,
    expected: 592.8,
  },
  {
    // 국어129·수학142·영어1등급(200)·사탐 변표68.11+66.23 → 721.175
    name: "동국대 ÷200 + 변표 2과목 합",
    planId: "동국대학교-국어국문·문예창작학부-나",
    korean: 129,
    math: 142,
    englishGrade: 1,
    historyGrade: 1,
    inquiry: [68.11, 66.23],
    convertedInquiry: true,
    expected: 721.175,
  },
  {
    // 식품영양학전공(미적분): 국88·수90·영1(100)·과탐86·한국사1(10)
    // → 220+346.5+200+180.6+10 = 957.100
    name: "상명대 백분위형 + 미적분·과탐 가산",
    planId: "상명대학교-식품영양학전공-나",
    korean: 88,
    math: 90,
    mathElective: "미적분",
    englishGrade: 1,
    historyGrade: 1,
    inquiry: [86, 50],
    science: true,
    percentileMetric: true,
    expected: 957.1,
  },
  // ─── 상위 영역 선택 반영 ───
  // 서강대 예시(504.82)는 뺐다. 서강대는 수능 환산 만점을 공시하지 않아
  // 원문 데이터만으로는 환산식을 완성할 수 없으므로 서비스 데이터에서
  // 제외된다(build-engine-data REASON.estimatedMax).
  {
    // 국70·수90·영3등급(89)·사탐85·한국사7등급 → 70+90+89+8 = 257
    name: "한남대 국어 필수 + 수·영·탐 중 상위 2개",
    planId: "한남대학교-국어국문·창작학과-가",
    korean: 70,
    math: 90,
    englishGrade: 3,
    historyGrade: 7,
    inquiry: [85, 10],
    percentileMetric: true,
    expected: 257,
  },
  {
    // 수90·영89·탐85·한국사8 → 272 (국어는 상위 2개 밖)
    name: "한남대 수학 필수 + 국·영·탐 중 상위 2개",
    planId: "한남대학교-국어교육과-나",
    korean: 50,
    math: 90,
    englishGrade: 3,
    historyGrade: 7,
    inquiry: [85, 10],
    percentileMetric: true,
    expected: 272,
  },
  {
    // 국93·영2등급 95·탐 화학Ⅰ97 → 372 + 285 + 291 = 948
    name: "목포대 수·탐 중 상위 1개 30%",
    planId: "국립목포대학교-국어국문·문예창작학부-가",
    korean: 93,
    math: 50,
    englishGrade: 2,
    historyGrade: 1,
    inquiry: [97, 10],
    science: true,
    percentileMetric: true,
    expected: 948,
  },
  {
    // 국49, 수85→28.331+미적분 가산4.250, 영2등급→31.664, 탐89→29.664
    // → 상위3 합 93.909 + 한국사 1 = 94.909
    // 대학은 영역마다 셋째 자리에서 반올림한다(엔진 94.907, 오차 0.002).
    name: "금오공대 상위 3개 영역 × 0.3333 + 미적분 15%",
    planId: "국립금오공과대학교-기계공학부-가",
    korean: 49,
    math: 85,
    mathElective: "미적분",
    englishGrade: 2,
    historyGrade: 1,
    inquiry: [89, 10],
    science: true,
    percentileMetric: true,
    expected: 94.909,
  },
  {
    // 인문: 영90×0.3333×4=119.988 + 탐71→94.657 + 국64→85.325
    // + 한국사10 = 309.97 × 0.9 = 278.97 (한국사 가산이 배율 전)
    name: "경일대 상위 3개 영역 + 배율 전 한국사 가산",
    planId: "경일대학교-경찰행정학과-가",
    korean: 64,
    math: 30,
    englishGrade: 3,
    historyGrade: 1,
    inquiry: [71, 10],
    percentileMetric: true,
    expected: 278.97,
  },
  {
    // 국64 + 수62 + 영3등급 90 + 탐71 + 한국사10 = 297.00 × 0.9 = 267.30
    name: "경일대 간호 4개 영역 + 배율 전 한국사 가산",
    planId: "경일대학교-간호학과-가",
    korean: 64,
    math: 62,
    englishGrade: 3,
    historyGrade: 1,
    inquiry: [71, 10],
    percentileMetric: true,
    expected: 267.3,
  },
  {
    // 국93·수41·영4등급(85)·탐98·한국사2 → 794.000
    name: "가톨릭대 국·수 우수순 35·25%",
    planId: "가톨릭대학교(성심교정(부천))-자유전공학부 (일반전형Ⅰ)-나",
    korean: 93,
    math: 41,
    englishGrade: 4,
    historyGrade: 2,
    inquiry: [98, 10],
    percentileMetric: true,
    expected: 794,
  },
  {
    // 국72·수60·영95·탐58: (83.5×0.7+58×0.3)=75.85 ×10 = 758.5
    // + 한국사1등급 10 = 768.5
    // 원문은 "영어 1등급→백분위95" 이지만 영어 환산표상 95 는 3등급이다
    // (1·2등급 100). 예시의 등급 표기 오류로 보고 3등급으로 넣는다.
    name: "동양대 국·수·영 중 우수 2개 평균 70%",
    planId: "동양대학교(북서울캠퍼스(동두천))-공공인재학부-나",
    korean: 72,
    math: 60,
    englishGrade: 3,
    historyGrade: 1,
    inquiry: [58, 10],
    percentileMetric: true,
    expected: 768.5,
  },
  {
    // 산출식 원문 예: [수학(95)×0.4]+[영어(100)×0.4]+[사회문화(93)×0.2]
    // = 96.6 → 1,000점 만점 ×10 = 966
    name: "나사렛대 국·수·영 중 우수 2개 각 40%",
    planId: "나사렛대학교-자율전공계열-가",
    korean: 50,
    math: 95,
    englishGrade: 1,
    historyGrade: 1,
    inquiry: [93, 10],
    percentileMetric: true,
    expected: 966,
  },
];

/** 변표 예시 값을 표의 두 칸(백분위 95·94)에 넣는다 */
const CONVERTED_SLOTS = [95, 94] as const;

const subjectAt = (example: OfficialExample, index: number): InquirySubject => {
  if (example.science) {
    return index === 0 ? "물리학I" : "화학I";
  }
  return index === 0 ? "생활과윤리" : "사회문화";
};

const toScore = (example: OfficialExample): SuneungScore => {
  const inquiryEntry = (index: 0 | 1) => {
    const value = example.inquiry[index];
    if (example.convertedInquiry) {
      return { standardScore: 60, percentile: CONVERTED_SLOTS[index] };
    }
    return {
      standardScore: value,
      percentile: example.percentileMetric ? value : 90,
    };
  };

  return {
    examYear: 2026,
    korean: {
      elective: "언어와매체",
      standardScore: example.korean,
      percentile: example.percentileMetric ? example.korean : 90,
    },
    math: {
      elective: example.mathElective ?? "확률과통계",
      standardScore: example.math,
      percentile: example.percentileMetric ? example.math : 90,
    },
    english: { grade: example.englishGrade },
    inquiry1: { subject: subjectAt(example, 0), ...inquiryEntry(0) },
    inquiry2: { subject: subjectAt(example, 1), ...inquiryEntry(1) },
    history: { grade: example.historyGrade },
  };
};

const withExampleTable = (
  plan: JeongsiAdmissionPlan,
  example: OfficialExample
): JeongsiAdmissionPlan["formula"] => {
  if (!example.convertedInquiry) {
    return plan.formula;
  }
  return {
    ...plan.formula,
    convertedStandardTable: {
      ...plan.formula.convertedStandardTable,
      [CONVERTED_SLOTS[0]]: example.inquiry[0],
      [CONVERTED_SLOTS[1]]: example.inquiry[1],
    },
  };
};

describe("실데이터 환산식 — 대학 공식 계산예시 재현", () => {
  let plans: JeongsiAdmissionPlan[] = [];

  beforeAll(async () => {
    resetJeongsiDataSource();
    // 입결이 없어 서비스에서 뺀 모집단위도 환산식은 검증한다
    const withoutResults = JSON.parse(
      await readFile(
        path.join(
          process.cwd(),
          "libs/jeongsi/data/source/plans-without-results.json"
        ),
        "utf-8"
      )
    ) as JeongsiAdmissionPlan[];
    plans = [...(await loadAdmissionPlans()), ...withoutResults];
  });

  it.each(EXAMPLES)("$name", (example) => {
    // Arrange
    const plan = plans.find((entry) => entry.id === example.planId);
    expect(plan).toBeDefined();
    if (!plan) {
      return;
    }

    // Act
    const result = convertScore(
      toScore(example),
      withExampleTable(plan, example)
    );

    // Assert — 예시는 소수 셋째 자리까지 공시한다
    expect(result.convertedScore).toBeCloseTo(example.expected, 2);
  });
});
