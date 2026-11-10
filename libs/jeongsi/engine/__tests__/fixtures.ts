// ============================================================
// 엔진 테스트용 최소 픽스처
//
// libs/jeongsi/data/*.json 은 consultant-data 팀 산출물이므로
// 테스트는 이 파일의 픽스처만 사용한다(데이터가 바뀌어도 테스트가
// 깨지지 않도록).
// ============================================================

import type {
  ConversionFormula,
  GradeScoreTable,
  JeongsiAdmissionPlan,
  JeongsiPreference,
  JeongsiResultEntry,
  SuneungGrade,
  SuneungScore,
} from "../../types";

/** 등급 테이블 생성 헬퍼. 지정하지 않은 등급은 fallback */
export const gradeTable = (
  values: Partial<Record<SuneungGrade, number>>,
  fallback = 0
): GradeScoreTable => {
  const grades: SuneungGrade[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return grades.reduce<GradeScoreTable>((table, grade) => {
    table[grade] = values[grade] ?? fallback;
    return table;
  }, {} as GradeScoreTable);
};

/**
 * 기준 학생.
 * 국어 표준 130 / 백분위 93, 수학(미적분) 표준 140 / 백분위 96,
 * 영어 1등급, 탐구 물리학I(70, 95) · 화학I(66, 90), 한국사 1등급
 */
export const baseScore: SuneungScore = {
  examYear: 2026,
  korean: { elective: "언어와매체", standardScore: 130, percentile: 93 },
  math: { elective: "미적분", standardScore: 140, percentile: 96 },
  english: { grade: 1 },
  inquiry1: { subject: "물리학I", standardScore: 70, percentile: 95 },
  inquiry2: { subject: "화학I", standardScore: 66, percentile: 90 },
  history: { grade: 1 },
};

/** 사탐 응시 학생 (선택과목 제한 테스트용) */
export const socialScore: SuneungScore = {
  ...baseScore,
  math: { elective: "확률과통계", standardScore: 128, percentile: 88 },
  inquiry1: { subject: "생활과윤리", standardScore: 68, percentile: 93 },
  inquiry2: { subject: "사회문화", standardScore: 65, percentile: 89 },
};

/**
 * 표준점수형 환산식.
 * 국30·수35·영10(비율포함)·탐25, 총점 1000,
 * 기준만점 국150·수150·탐80, 한국사 감산
 */
export const standardFormula: ConversionFormula = {
  formulaVersion: 1,
  totalScore: 1000,
  ratios: { korean: 30, math: 35, english: 10, inquiry: 25 },
  metric: { korean: "standard", math: "standard", inquiry: "standard" },
  inquiryCount: 2,
  english: {
    type: "ratioIncluded",
    scoreByGrade: gradeTable({
      1: 100,
      2: 95,
      3: 88,
      4: 79,
      5: 68,
      6: 55,
      7: 40,
      8: 23,
      9: 0,
    }),
  },
  history: {
    type: "subtract",
    penaltyByGrade: gradeTable({ 3: 1, 4: 2, 5: 3, 6: 4, 7: 6, 8: 8, 9: 10 }),
  },
  baseMax: { korean: 150, math: 150, inquiry: 80 },
};

/**
 * 백분위형 환산식.
 * 국30·수40·영0(가산)·탐30, 총점 1000, 기준만점 100,
 * 탐구 상위 1과목, 미적분 5% 가산, 한국사 가산
 */
export const percentileFormula: ConversionFormula = {
  formulaVersion: 1,
  totalScore: 1000,
  ratios: { korean: 30, math: 40, english: 0, inquiry: 30 },
  metric: { korean: "percentile", math: "percentile", inquiry: "percentile" },
  inquiryCount: 1,
  english: {
    type: "add",
    scoreByGrade: gradeTable({ 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 }),
  },
  history: {
    type: "add",
    scoreByGrade: gradeTable({ 1: 5, 2: 5, 3: 4, 4: 3, 5: 2 }),
  },
  bonus: { mathElective: { 미적분: { type: "percent", value: 5 } } },
  baseMax: { korean: 100, math: 100, inquiry: 100 },
};

/**
 * 변환표준점수형 환산식.
 * 국30·수40·영0(감산)·탐30, 기준만점 탐70, 한국사 감산
 */
export const convertedStandardFormula: ConversionFormula = {
  formulaVersion: 1,
  totalScore: 1000,
  ratios: { korean: 30, math: 40, english: 0, inquiry: 30 },
  metric: {
    korean: "percentile",
    math: "percentile",
    inquiry: "convertedStandard",
  },
  inquiryCount: 2,
  convertedStandardTable: { 100: 72, 95: 68, 90: 64 },
  english: {
    type: "subtract",
    penaltyByGrade: gradeTable({ 2: 2, 3: 5, 4: 9, 5: 14 }),
  },
  history: {
    type: "subtract",
    penaltyByGrade: gradeTable({ 3: 1, 4: 2 }),
  },
  baseMax: { korean: 100, math: 100, inquiry: 70 },
};

/** 시행계획 생성 헬퍼 */
export const makePlan = (
  overrides: Partial<JeongsiAdmissionPlan> = {}
): JeongsiAdmissionPlan => ({
  id: "테스트대학교-컴퓨터공학과-가",
  admissionYear: 2027,
  university: "테스트대학교",
  department: "컴퓨터공학과",
  category: "컴퓨터공학",
  region: "서울",
  group: "가",
  quota: 30,
  formula: standardFormula,
  ...overrides,
});

/** 입결 생성 헬퍼 */
export const makeResult = (
  overrides: Partial<JeongsiResultEntry> = {}
): JeongsiResultEntry => ({
  planKey: "테스트대학교-컴퓨터공학과-가",
  admissionYear: 2026,
  university: "테스트대학교",
  department: "컴퓨터공학과",
  group: "가",
  quota: 30,
  competitionRate: 4.2,
  cut70: { metric: "convertedScore", value: 880 },
  ...overrides,
});

/** 희망조건 생성 헬퍼 */
export const makePreference = (
  overrides: Partial<JeongsiPreference> = {}
): JeongsiPreference => ({
  target: "컴퓨터공학과",
  targetKind: "department",
  region: "전국",
  risk: "균형",
  ...overrides,
});
