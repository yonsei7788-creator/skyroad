/**
 * Phase 1: 전처리
 *
 * 생기부 JSONB → 프롬프트 입력 텍스트 변환 + 정량 계산
 * AI 호출 없음 -- 모든 수치 계산은 이 모듈에서 코드로 수행.
 */

import type { ReportPlan, StudentInfo } from "../types.ts";
import {
  getMajorCourseRecommendations,
  MEDICAL_COURSE_REQUIREMENTS,
  isMedicalMajor,
} from "../constants/recommended-courses.ts";
import type { RecommendedCourseMatch } from "../constants/recommended-courses.ts";
import {
  matchMajorEvaluationCriteria,
  formatMajorEvaluationContext,
} from "../constants/major-evaluation-criteria.ts";
import { findMajorInfo } from "../constants/major-info-data.ts";
import {
  findCutoffData,
  ADMISSION_CUTOFF_DATA,
} from "../constants/admission-cutoff-data.ts";
import { correctSubjectName } from "../constants/subject-name-corrections.ts";

/**
 * 예체능 관련 키워드 (lClass 보완용).
 * lClass가 "예체능계열"이 아니더라도 학과명에 이 키워드가 포함되면 예체능으로 판단.
 * 주의: 오탐 방지를 위해 단독으로 사용되는 예체능 실기 키워드만 포함.
 */
const ART_SPORT_KEYWORDS = [
  "체육",
  "무용",
  "댄스",
  "음악",
  "미술",
  "회화",
  "조소",
  "조형",
  "공예",
  "도예",
  "실용음악",
  "국악",
  "작곡",
  "성악",
  "기악",
  "피아노",
  "관현악",
  "뮤지컬",
  "무대",
];

/**
 * 예체능 비실기 제외 키워드.
 * 키워드에 매칭되더라도 이 패턴이 포함되면 예체능 실기가 아닌 것으로 판단.
 * 예: 스포츠마케팅학과, 스포츠경영학과, 음악치료학과
 */
const ART_SPORT_EXCLUDE_PATTERNS = [
  "마케팅",
  "경영",
  "치료",
  "심리",
  "산업",
  "공학",
  "테크",
  "미디어",
  "저널",
  "행정",
];

/**
 * 예체능 학과 여부 판별.
 * lClass가 "예체능계열"이거나 학과명에 예체능 키워드가 포함되면 예체능으로 판단.
 * 단, 제외 패턴에 해당하면 예체능이 아닌 것으로 판단.
 */
export const isArtSportDepartment = (targetDept: string): boolean => {
  const majorInfo = findMajorInfo(targetDept);
  if (majorInfo?.lClass === "예체능계열") return true;

  const hasKeyword = ART_SPORT_KEYWORDS.some((kw) => targetDept.includes(kw));
  if (!hasKeyword) return false;

  // 제외 패턴 체크
  if (ART_SPORT_EXCLUDE_PATTERNS.some((ex) => targetDept.includes(ex)))
    return false;

  return true;
};

/**
 * 실기 예체능 학과 판별.
 * 1차: 예체능 학과인지 판별.
 * 2차: 커트라인 데이터가 0건이면 실기 전형 학과로 간주.
 */
export const isArtSportPractical = (targetDept: string): boolean => {
  if (!isArtSportDepartment(targetDept)) return false;

  const majorInfo = findMajorInfo(targetDept);
  if (!majorInfo) return true;

  const hasCutoff = majorInfo.universities.some(
    (u) => findCutoffData(u, majorInfo.majorName).length > 0
  );
  return !hasCutoff;
};

// ─── 생기부 원본 JSONB 타입 ───

interface AttendanceRow {
  year: number;
  totalDays: number | null;
  absenceIllness: number | null;
  absenceUnauthorized: number | null;
  absenceOther: number | null;
  latenessIllness: number | null;
  latenessUnauthorized: number | null;
  latenessOther: number | null;
  earlyLeaveIllness: number | null;
  earlyLeaveUnauthorized: number | null;
  earlyLeaveOther: number | null;
  classMissedIllness: number | null;
  classMissedUnauthorized: number | null;
  classMissedOther: number | null;
  note: string;
}

interface GeneralSubjectRow {
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  rawScore: number | null;
  average: number | null;
  standardDeviation: number | null;
  achievement: string;
  studentCount: number | null;
  gradeRank: number | null;
}

interface CareerSubjectRow {
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  rawScore: number | null;
  average: number | null;
  achievement: string;
  studentCount: number | null;
  achievementDistribution: string;
}

interface SubjectEvaluationRow {
  year: number;
  subject: string;
  evaluation: string;
}

interface CreativeActivityRow {
  year: number;
  area: string;
  hours: number | null;
  note: string;
}

interface BehavioralAssessmentRow {
  year: number;
  assessment: string;
}

export interface RecordData {
  attendance?: AttendanceRow[];
  generalSubjects?: GeneralSubjectRow[];
  careerSubjects?: CareerSubjectRow[];
  subjectEvaluations?: SubjectEvaluationRow[];
  creativeActivities?: CreativeActivityRow[];
  behavioralAssessments?: BehavioralAssessmentRow[];
  readingActivities?: {
    year: number;
    subjectOrArea: string;
    content: string;
  }[];
  volunteerActivities?: {
    year: number;
    dateRange: string;
    place: string;
    content: string;
    hours: number | null;
  }[];
  awards?: unknown[];
  certifications?: unknown[];
  artsPhysicalSubjects?: unknown[];
}

// ─── 전처리 결과 타입 ───

export interface SubjectStat {
  subject: string;
  year: number;
  semester: number;
  grade: number;
  rawScore: number;
  classAverage: number;
  stdDev: number;
  zScore: number;
  estimatedPercentile: number;
  enrollmentSize: number;
}

export interface AttendanceSummaryItem {
  year: number;
  totalDays: number;
  note: string;
  totalAbsence: number;
  illness: number;
  unauthorized: number;
  etc: number;
  lateness: number;
  earlyLeave: number;
}

export interface RecordVolumeItem {
  category: string;
  maxCapacity: string;
  actualVolume: string;
  fillRate: number;
}

export interface WordCloudItem {
  text: string;
  frequency: number;
  category?: "academic" | "career" | "community" | "growth";
}

export interface PreprocessedData {
  overallAverage: number;
  averageByGrade: { year: number; semester: number; average: number }[];
  subjectCombinations: { name: string; subjects: string[]; average: number }[];
  gradeTrend: {
    direction: "ascending" | "stable" | "descending";
    magnitude: number;
  };
  subjectStats: SubjectStat[];
  gradeVariance: { highest: string; lowest: string; spread: number };
  majorRelated: {
    relatedAverage: number;
    overallAverage: number;
    diff: number;
  };
  convertedGrade: { schoolType: string; original: number; converted: number };
  /** 학생의 등급제: 고1·고2는 "5등급제", 고3/졸업생은 "9등급제" */
  gradingSystem: "5등급제" | "9등급제";
  /** 모든 과목의 성적 데이터 (postprocessor AI 출력 보정용) */
  allSubjectGrades?: {
    subject: string;
    year: number;
    semester: number;
    gradeRank: number | null;
    rawScore: number | null;
    average: number | null;
    studentCount: number | null;
  }[];
  fiveGradeConversion?: {
    subject: string;
    original: number;
    converted: number;
  }[];
  smallClassSubjects: {
    subject: string;
    enrollmentSize: number;
    achievementLevel: string;
    grade?: string;
  }[];
  careerSubjects: {
    subject: string;
    achievement: string;
    achievementDistribution: string;
  }[];
  recommendedCourseMatch: RecommendedCourseMatch;
  curriculumVersion: "2015" | "2022";
  attendanceSummary: AttendanceSummaryItem[];
  recordVolume: RecordVolumeItem[];
  wordCloudData: WordCloudItem[];
  /** 데이터가 존재하는 창체 영역/학년 조합 (postprocessor "기록 없음" 판단용) */
  existingCreativeSlots: { area: string; year: number }[];
  /** 데이터가 존재하는 행동특성 학년 (postprocessor "기록 없음" 판단용) */
  existingBehaviorYears: number[];
  studentTypeInput: {
    academicScore: number;
    careerScore: number;
    communityScore: number;
    growthScore: number;
  };
}

/** 프롬프트에 주입 가능한 텍스트 형태의 전처리 결과 */
export interface PreprocessedTexts {
  studentProfileText: string;
  recordDataText: string;
  subjectDataText: string;
  creativeActivitiesText: string;
  behavioralAssessmentText: string;
  rawAcademicDataText: string;
  preprocessedAcademicDataText: string;
  attendanceSummaryText: string;
  recommendedCourseMatchText: string;
  recordVolumeText: string;
  universityCandidatesText: string;
  /** 유저 설정 희망대학 텍스트 (없으면 빈 문자열) */
  targetUniversitiesText: string;
  curriculumVersion: "2015" | "2022";
  /** 계열별 입학사정관 평가 기준 컨텍스트 */
  majorEvaluationContextText: string;
  /** 학년별 이수 완료 과목 요약 (AI가 이수 완료 과목 성적 개선 권고를 방지하기 위함) */
  completedSubjectsByYearText: string;
  /** 실기 예체능 학과 여부 (커트라인 데이터 없는 예체능계열) */
  isArtSportPractical: boolean;
}

export interface PreprocessResult {
  data: PreprocessedData;
  texts: PreprocessedTexts;
}

// ─── 정규분포 CDF 근사 ───

const normalCdf = (z: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
};

// ─── 고교 유형별 등급 환산 ───

const SCHOOL_TYPE_ADJUSTMENT: Record<string, number> = {
  일반고: 0,
  자율고: -0.3,
  특목고: -0.5,
  과학고: -0.7,
  외국어고: -0.5,
  국제고: -0.5,
  영재학교: -0.8,
  예술고: 0.2,
  체육고: 0.2,
  특성화고: 0.3,
  마이스터고: 0.3,
};

// ─── 9등급제 → 5등급제 환산 테이블 ───
// [9등급, 5등급(상), 5등급(평균), 5등급(하)]
const NINE_TO_FIVE_GRADE_TABLE: [number, number, number, number][] = [
  [1.0, 1, 1, 1],
  [1.1, 1, 1.01, 1.03],
  [1.2, 1, 1.01, 1.04],
  [1.3, 1, 1.05, 1.07],
  [1.4, 1, 1.06, 1.13],
  [1.5, 1.03, 1.09, 1.17],
  [1.6, 1.11, 1.15, 1.19],
  [1.7, 1.13, 1.17, 1.24],
  [1.8, 1.17, 1.22, 1.29],
  [1.9, 1.22, 1.27, 1.32],
  [2.0, 1.27, 1.33, 1.39],
  [2.1, 1.31, 1.38, 1.46],
  [2.2, 1.39, 1.45, 1.5],
  [2.3, 1.4, 1.5, 1.59],
  [2.4, 1.46, 1.54, 1.61],
  [2.5, 1.54, 1.6, 1.68],
  [2.6, 1.6, 1.67, 1.77],
  [2.7, 1.64, 1.72, 1.81],
  [2.8, 1.7, 1.76, 1.82],
  [2.9, 1.74, 1.82, 1.9],
  [3.0, 1.81, 1.89, 1.97],
  [3.1, 1.83, 1.93, 2.03],
  [3.2, 1.89, 1.98, 2.07],
  [3.3, 1.93, 2.03, 2.11],
  [3.4, 2.0, 2.09, 2.18],
  [3.5, 2.07, 2.15, 2.23],
  [3.6, 2.12, 2.21, 2.29],
  [3.7, 2.17, 2.25, 2.34],
  [3.8, 2.21, 2.31, 2.4],
  [3.9, 2.29, 2.37, 2.47],
  [4.0, 2.35, 2.43, 2.52],
  [4.1, 2.39, 2.49, 2.6],
  [4.2, 2.46, 2.56, 2.65],
  [4.3, 2.53, 2.62, 2.71],
  [4.4, 2.59, 2.68, 2.75],
  [4.5, 2.63, 2.73, 2.83],
  [4.6, 2.69, 2.78, 2.87],
  [4.7, 2.77, 2.85, 2.93],
  [4.8, 2.83, 2.91, 3.0],
  [4.9, 2.88, 2.97, 3.07],
  [5.0, 2.93, 3.03, 3.12],
  [5.1, 3.0, 3.09, 3.17],
  [5.2, 3.06, 3.14, 3.23],
  [5.3, 3.12, 3.21, 3.29],
  [5.4, 3.17, 3.26, 3.35],
  [5.5, 3.25, 3.32, 3.4],
  [5.6, 3.3, 3.38, 3.48],
  [5.7, 3.35, 3.45, 3.54],
  [5.8, 3.41, 3.49, 3.58],
  [5.9, 3.47, 3.55, 3.64],
  [6.0, 3.55, 3.63, 3.72],
  [6.1, 3.59, 3.69, 3.79],
  [6.2, 3.67, 3.74, 3.83],
  [6.3, 3.74, 3.81, 3.89],
  [6.4, 3.79, 3.86, 3.96],
  [6.5, 3.83, 3.91, 4.0],
  [6.6, 3.89, 3.97, 4.04],
  [6.7, 3.96, 4.03, 4.1],
  [6.8, 4.0, 4.08, 4.16],
  [6.9, 4.04, 4.11, 4.18],
  [7.0, 4.11, 4.19, 4.25],
  [7.1, 4.17, 4.25, 4.33],
  [7.2, 4.25, 4.31, 4.38],
  [7.3, 4.29, 4.36, 4.45],
  [7.4, 4.34, 4.41, 4.5],
  [7.5, 4.37, 4.47, 4.55],
  [7.6, 4.41, 4.51, 4.61],
  [7.7, 4.47, 4.57, 4.63],
  [7.8, 4.56, 4.62, 4.69],
  [7.9, 4.63, 4.69, 4.77],
  [8.0, 4.67, 4.72, 4.83],
  [8.1, 4.69, 4.76, 4.83],
  [8.2, 4.75, 4.81, 4.87],
  [8.3, 4.79, 4.84, 4.88],
  [8.4, 4.84, 4.89, 4.96],
  [8.5, 4.86, 4.91, 4.96],
  [8.6, 4.89, 4.92, 4.97],
  [8.7, 4.92, 4.96, 5.0],
  [8.8, 4.93, 4.97, 5.0],
  [8.9, 5.0, 5.0, 5.0],
  [9.0, 5.0, 5.0, 5.0],
];

// 빠른 조회를 위한 Map (key: 9등급 × 10 → 정수화)
const FIVE_GRADE_MAP = new Map(
  NINE_TO_FIVE_GRADE_TABLE.map(([nine, upper, avg, lower]) => [
    Math.round(nine * 10),
    { upper, avg, lower },
  ])
);

/** 9등급 → 5등급 환산 (평균값 기준). 0.1 단위 보간 지원. */
const convertToFiveGrade = (nineGrade: number): number => {
  const clamped = Math.max(1, Math.min(9, nineGrade));
  const key = Math.round(clamped * 10);
  const exact = FIVE_GRADE_MAP.get(key);
  if (exact) return exact.avg;

  // 테이블에 없는 값은 인접 두 항목 선형 보간
  const lo = Math.floor(clamped * 10);
  const hi = lo + 1;
  const loEntry = FIVE_GRADE_MAP.get(lo);
  const hiEntry = FIVE_GRADE_MAP.get(hi);
  if (loEntry && hiEntry) {
    const t = clamped * 10 - lo;
    return Math.round((loEntry.avg * (1 - t) + hiEntry.avg * t) * 100) / 100;
  }
  return loEntry?.avg ?? hiEntry?.avg ?? clamped;
};

/** 9등급 → 5등급 환산 범위 (상/평균/하) */
const convertToFiveGradeRange = (
  nineGrade: number
): { upper: number; avg: number; lower: number } => {
  const clamped = Math.max(1, Math.min(9, nineGrade));
  const key = Math.round(clamped * 10);
  const exact = FIVE_GRADE_MAP.get(key);
  if (exact) return exact;

  const lo = Math.floor(clamped * 10);
  const hi = lo + 1;
  const loEntry = FIVE_GRADE_MAP.get(lo);
  const hiEntry = FIVE_GRADE_MAP.get(hi);
  if (loEntry && hiEntry) {
    const t = clamped * 10 - lo;
    const lerp = (a: number, b: number) =>
      Math.round((a * (1 - t) + b * t) * 100) / 100;
    return {
      upper: lerp(loEntry.upper, hiEntry.upper),
      avg: lerp(loEntry.avg, hiEntry.avg),
      lower: lerp(loEntry.lower, hiEntry.lower),
    };
  }
  const fallback = loEntry ??
    hiEntry ?? { upper: clamped, avg: clamped, lower: clamped };
  return fallback;
};

// ─── 불용어 ───

const STOPWORDS = new Set([
  "것",
  "수",
  "등",
  "바",
  "이",
  "그",
  "저",
  "때",
  "곳",
  "더",
  "및",
  "또",
  "또한",
  "그리고",
  "하지만",
  "그러나",
  "따라서",
  "때문",
  "위해",
  "통해",
  "대해",
  "관련",
  "대한",
  "에서",
  "으로",
  "부터",
  "까지",
  "에게",
  "한테",
  "이다",
  "있다",
  "하다",
  "되다",
  "없다",
  "학생",
  "활동",
  "수업",
  "과목",
  "학교",
  "교사",
  "선생님",
  "적극적",
  "성실",
  "참여",
  "노력",
  "태도",
  "모습",
  "보임",
]);

// ─── 과목명 오타 보정 ───

/**
 * RecordData 내 모든 과목명(subject)을 보정한다.
 * PDF OCR 오류로 인한 오타를 정규화하여 리포트 품질을 보장.
 * mutate: 원본 객체를 직접 수정.
 */
const correctRecordSubjectNames = (data: RecordData): void => {
  for (const s of data.generalSubjects ?? []) {
    s.subject = correctSubjectName(s.subject);
  }
  for (const s of data.careerSubjects ?? []) {
    s.subject = correctSubjectName(s.subject);
  }
  for (const s of data.subjectEvaluations ?? []) {
    s.subject = correctSubjectName(s.subject);
  }
};

// ─── 메인 전처리 함수 ───

export const preprocess = (
  recordData: RecordData,
  studentInfo: StudentInfo,
  plan: ReportPlan
): PreprocessResult => {
  // 과목명 오타 보정 (기존 DB 데이터 대응)
  correctRecordSubjectNames(recordData);

  // 학기 범위 필터: 재학생(고3)은 3-1까지, 졸업생/N수생은 3-2까지
  const maxSemester = studentInfo.isGraduate
    ? { year: 3, semester: 2 }
    : studentInfo.grade === 3
      ? { year: 3, semester: 1 }
      : { year: studentInfo.grade, semester: 2 };

  const withinScope = (year: number, semester?: number): boolean => {
    if (year < maxSemester.year) return true;
    if (year > maxSemester.year) return false;
    return (semester ?? 1) <= maxSemester.semester;
  };

  const generalSubjects = (recordData.generalSubjects ?? []).filter((s) =>
    withinScope(s.year, s.semester)
  );
  const careerSubjects = (recordData.careerSubjects ?? []).filter((s) =>
    withinScope(s.year, s.semester)
  );
  const attendance = recordData.attendance ?? [];
  const subjectEvals = (recordData.subjectEvaluations ?? []).filter((s) =>
    withinScope(s.year)
  );
  const creativeActs = (recordData.creativeActivities ?? []).filter((a) =>
    withinScope(a.year)
  );
  const behaviors = (recordData.behavioralAssessments ?? []).filter((b) =>
    withinScope(b.year)
  );

  // 1. 평균 등급 계산
  const gradesWithRank = generalSubjects.filter(
    (s) => s.gradeRank !== null && s.gradeRank !== undefined
  );
  const overallAverage =
    gradesWithRank.length > 0 ? weightedAverage(gradesWithRank) : 0;

  // 2. 학년/학기별 평균
  const gradeGroups = new Map<string, GeneralSubjectRow[]>();
  for (const s of gradesWithRank) {
    const key = `${s.year}-${s.semester}`;
    if (!gradeGroups.has(key)) gradeGroups.set(key, []);
    gradeGroups.get(key)!.push(s);
  }
  const averageByGrade = [...gradeGroups.entries()]
    .map(([key, subjects]) => {
      const [year, semester] = key.split("-").map(Number);
      return {
        year,
        semester,
        average: weightedAverage(subjects),
      };
    })
    .sort((a, b) => a.year - b.year || a.semester - b.semester);

  // 3. 교과 조합별 평균
  const subjectCombinations = computeSubjectCombinations(gradesWithRank);

  // 4. 등급 추이
  const gradeTrend = computeGradeTrend(averageByGrade);

  // 5. Z-score + 백분위
  const subjectStats = computeSubjectStats(generalSubjects);

  // 6. 과목 간 편차
  const gradeVariance = computeGradeVariance(gradesWithRank);

  // 7. 전공 관련 교과 성적
  const majorRelated = computeMajorRelated(
    generalSubjects,
    studentInfo.targetDepartment ?? "",
    overallAverage
  );

  // 8. 고교 유형별 등급 환산
  const adj = SCHOOL_TYPE_ADJUSTMENT[studentInfo.schoolType] ?? 0;
  const convertedGrade = {
    schoolType: studentInfo.schoolType,
    original: Math.round(overallAverage * 100) / 100,
    converted: Math.round(Math.max(1, overallAverage + adj) * 100) / 100,
  };

  // 9. 등급제 판별 및 5등급제 환산
  // 2026년 기준: 고1·고2(grade 1, 2)는 2022 개정 교육과정 → 5등급제
  // 고3/졸업생(grade 3 이상)은 2015 개정 교육과정 → 9등급제
  const gradingSystem: "5등급제" | "9등급제" =
    studentInfo.grade <= 2 ? "5등급제" : "9등급제";

  // 5등급제 환산: 9등급제 학생(고3/졸업생)의 Premium에서만 의미 있음
  const fiveGradeConversion =
    plan === "premium" && gradingSystem === "9등급제"
      ? gradesWithRank.map((s) => ({
          subject: s.subject,
          original: s.gradeRank!,
          converted: convertToFiveGrade(s.gradeRank!),
        }))
      : undefined;

  // 10. 소인수 과목 식별
  const smallClassSubjects = generalSubjects
    .filter((s) => s.studentCount !== null && s.studentCount <= 5)
    .map((s) => ({
      subject: s.subject,
      enrollmentSize: s.studentCount!,
      achievementLevel: s.achievement,
      grade: s.gradeRank !== null ? String(s.gradeRank) : undefined,
    }));

  // 11. 교육과정 버전 판별 (권장과목 매칭보다 먼저 수행)
  // gradingSystem이 이미 grade 기반으로 확정되었으므로 이를 우선 사용
  const curriculumVersion: "2015" | "2022" =
    gradingSystem === "5등급제"
      ? "2022"
      : detectCurriculumVersion(creativeActs);

  // 12. 권장과목 이수 매칭 (교육과정 버전 기반)
  const recommendedCourseMatch = matchRecommendedCourses(
    generalSubjects,
    careerSubjects,
    studentInfo.targetDepartment ?? "",
    studentInfo.grade,
    curriculumVersion
  );

  // 13. 출결 데이터 정규화
  const attendanceSummary = normalizeAttendance(attendance);

  // 14. 기록 분량 계산
  const recordVolume = computeRecordVolume(
    subjectEvals,
    creativeActs,
    behaviors
  );

  // 15. 워드클라우드 전처리
  const wordCloudData = extractKeywords(subjectEvals, creativeActs, behaviors);

  // 16. 학생 유형 분류 입력 데이터
  const studentTypeInput = computeStudentTypeInput(
    overallAverage,
    gradesWithRank,
    subjectEvals,
    creativeActs,
    attendance
  );

  // 모든 과목의 성적 맵 (postprocessor에서 AI 출력 보정용)
  const allSubjectGrades = generalSubjects.map((s) => ({
    subject: s.subject,
    year: s.year,
    semester: s.semester,
    gradeRank: s.gradeRank,
    rawScore: s.rawScore,
    average: s.average,
    studentCount: s.studentCount,
  }));

  // 17. 데이터 존재 여부 맵 (postprocessor에서 "기록 없음" 판단용)
  const existingCreativeSlots = creativeActs
    .filter((a) => a.area !== "봉사활동" && a.note.trim().length > 0)
    .map((a) => ({ area: a.area, year: a.year }));
  const existingBehaviorYears = behaviors
    .filter((b) => b.assessment.trim().length > 0)
    .map((b) => b.year);

  const data: PreprocessedData = {
    overallAverage: Math.round(overallAverage * 100) / 100,
    averageByGrade,
    subjectCombinations,
    gradeTrend,
    subjectStats,
    gradeVariance,
    majorRelated,
    convertedGrade,
    gradingSystem,
    fiveGradeConversion,
    allSubjectGrades,
    smallClassSubjects,
    careerSubjects: careerSubjects.map((cs) => ({
      subject: cs.subject,
      achievement: cs.achievement,
      achievementDistribution: cs.achievementDistribution,
    })),
    recommendedCourseMatch,
    curriculumVersion,
    attendanceSummary,
    recordVolume,
    wordCloudData,
    studentTypeInput,
    existingCreativeSlots,
    existingBehaviorYears,
  };

  const texts = buildTexts(data, recordData, studentInfo, plan);

  return { data, texts };
};

// ─── 보조 함수들 ───

const weightedAverage = (subjects: GeneralSubjectRow[]): number => {
  const withCredits = subjects.filter(
    (s) => s.credits !== null && s.credits > 0
  );
  if (withCredits.length > 0) {
    const totalCredits = withCredits.reduce((sum, s) => sum + s.credits!, 0);
    return (
      withCredits.reduce((sum, s) => sum + (s.gradeRank ?? 0) * s.credits!, 0) /
      totalCredits
    );
  }
  // credits 데이터가 없으면 단순 평균으로 fallback
  return subjects.length > 0
    ? subjects.reduce((sum, s) => sum + (s.gradeRank ?? 0), 0) / subjects.length
    : 0;
};

const computeSubjectCombinations = (
  subjects: GeneralSubjectRow[]
): PreprocessedData["subjectCombinations"] => {
  const combinations: { name: string; subjects: string[] }[] = [
    { name: "국수영", subjects: ["국어", "수학", "영어"] },
    { name: "국수영사", subjects: ["국어", "수학", "영어", "사회"] },
    { name: "국수영과", subjects: ["국어", "수학", "영어", "과학"] },
  ];

  return combinations.map(({ name, subjects: combSubjects }) => {
    const matching = subjects.filter((s) =>
      combSubjects.some((c) => s.category.includes(c) || s.subject.includes(c))
    );
    const avg = matching.length > 0 ? weightedAverage(matching) : 0;
    return {
      name,
      subjects: combSubjects,
      average: Math.round(avg * 100) / 100,
    };
  });
};

const computeGradeTrend = (
  averages: PreprocessedData["averageByGrade"]
): PreprocessedData["gradeTrend"] => {
  if (averages.length < 2) {
    return { direction: "stable", magnitude: 0 };
  }

  const n = averages.length;
  const xMean = (n - 1) / 2;
  const yMean = averages.reduce((s, a) => s + a.average, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (averages[i].average - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Lower grade number = better in Korean system (1등급 is best)
  // Negative slope = grades improving (numbers going down)
  if (slope < -0.1)
    return { direction: "ascending", magnitude: Math.abs(slope) };
  if (slope > 0.1) return { direction: "descending", magnitude: slope };
  return { direction: "stable", magnitude: Math.abs(slope) };
};

const computeSubjectStats = (subjects: GeneralSubjectRow[]): SubjectStat[] => {
  return subjects
    .filter(
      (s) =>
        s.rawScore !== null &&
        s.average !== null &&
        s.standardDeviation !== null &&
        s.standardDeviation > 0 &&
        s.gradeRank !== null
    )
    .map((s) => {
      const zScore = (s.rawScore! - s.average!) / s.standardDeviation!;
      return {
        subject: s.subject,
        year: s.year,
        semester: s.semester,
        grade: s.gradeRank!,
        rawScore: s.rawScore!,
        classAverage: s.average!,
        stdDev: s.standardDeviation!,
        zScore: Math.round(zScore * 100) / 100,
        estimatedPercentile: Math.round(normalCdf(zScore) * 10000) / 100,
        enrollmentSize: s.studentCount ?? 0,
      };
    });
};

const computeGradeVariance = (
  subjects: GeneralSubjectRow[]
): PreprocessedData["gradeVariance"] => {
  if (subjects.length === 0) {
    return { highest: "-", lowest: "-", spread: 0 };
  }

  // Group by subject, take average grade per subject
  const subjectAvgs = new Map<string, number[]>();
  for (const s of subjects) {
    if (!subjectAvgs.has(s.subject)) subjectAvgs.set(s.subject, []);
    subjectAvgs.get(s.subject)!.push(s.gradeRank!);
  }

  let best = { subject: "", avg: 9 };
  let worst = { subject: "", avg: 1 };
  for (const [subject, grades] of subjectAvgs) {
    const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
    if (avg < best.avg) best = { subject, avg };
    if (avg > worst.avg) worst = { subject, avg };
  }

  return {
    highest: best.subject,
    lowest: worst.subject,
    spread: Math.round((worst.avg - best.avg) * 100) / 100,
  };
};

const computeMajorRelated = (
  subjects: GeneralSubjectRow[],
  targetDept: string,
  overallAvg: number
): PreprocessedData["majorRelated"] => {
  const majorKeywords = extractMajorKeywords(targetDept);
  const related = subjects.filter(
    (s) =>
      s.gradeRank !== null &&
      majorKeywords.some((k) => s.subject.includes(k) || s.category.includes(k))
  );

  const relatedAverage =
    related.length > 0 ? weightedAverage(related) : overallAvg;

  return {
    relatedAverage: Math.round(relatedAverage * 100) / 100,
    overallAverage: Math.round(overallAvg * 100) / 100,
    diff: Math.round((relatedAverage - overallAvg) * 100) / 100,
  };
};

const extractMajorKeywords = (targetDept: string): string[] => {
  // 계열별 평가 기준 데이터와 연동하여 정밀한 교과 키워드를 반환한다.
  const criteria = matchMajorEvaluationCriteria(targetDept);

  // keySubjects를 기반으로 교과 매칭용 키워드 확장
  const SUBJECT_KEYWORD_MAP: Record<string, string[]> = {
    수학: ["수학"],
    물리: ["물리", "과학"],
    화학: ["화학", "과학"],
    생명과학: ["생명", "과학"],
    정보: ["정보", "프로그래밍"],
    국어: ["국어"],
    영어: ["영어"],
    사회: ["사회"],
    경제: ["경제", "사회"],
    역사: ["역사", "사회"],
  };

  const keywords = new Set<string>();
  for (const subject of criteria.keySubjects) {
    const mapped = SUBJECT_KEYWORD_MAP[subject];
    if (mapped) {
      for (const k of mapped) keywords.add(k);
    } else {
      keywords.add(subject);
    }
  }

  return [...keywords];
};

// ─── 과목명 정규화 (DB 저장 형식 ↔ 권장과목 형식 통일) ───

/**
 * 과목명에서 로마숫자 표기를 통일한다.
 * DB: "수학 I", "수학 Ⅱ", "물리학 I", "영어Ⅱ" (공백/문자 혼재)
 * 권장과목: "수학Ⅰ", "수학Ⅱ", "물리학Ⅰ" (공백 없음 + 전각 로마숫자)
 * → 모두 "공백 없음 + 전각 로마숫자" 형식으로 통일
 */
const normalizeSubjectName = (name: string): string => {
  return (
    name
      // 공백 + ASCII "I"/"II" → 전각 로마숫자
      .replace(/\s+III\s*$/, "Ⅲ")
      .replace(/\s+II\s*$/, "Ⅱ")
      .replace(/\s+I\s*$/, "Ⅰ")
      // 공백 + 전각 로마숫자 → 공백 제거
      .replace(/\s+(Ⅰ|Ⅱ|Ⅲ)\s*$/, "$1")
      // 공백 없이 ASCII "I"/"II" → 전각
      .replace(/III\s*$/, "Ⅲ")
      .replace(/II\s*$/, "Ⅱ")
      .replace(/I\s*$/, "Ⅰ")
  );
};

/**
 * 2022 개정 교육과정의 분할 과목명을 기본 교과명으로 매핑.
 * "공통국어1", "공통국어2" → "국어" 등.
 * 권장과목 매칭 시 기본 교과 단위로 이수 여부를 판단하기 위해 사용.
 */
const BASE_SUBJECT_MAP: Record<string, string> = {
  공통국어1: "국어",
  공통국어2: "국어",
  공동영어1: "영어",
  공동영어2: "영어",
  공동수학1: "수학",
  공통수학2: "수학",
  한국사1: "한국사",
  한국사2: "한국사",
  통합사회1: "통합사회",
  통합사회2: "통합사회",
  통합과학1: "통합과학",
  통합과학2: "통합과학",
  // 오타 대응 (실제 생기부 데이터에서 발견된 오타)
  동합과학1: "통합과학",
  동합과학2: "통합과학",
};

/**
 * 과목명을 기본 교과명으로 정규화 (권장과목 매칭용).
 * 1) BASE_SUBJECT_MAP으로 2022 분할과목 → 기본 교과 변환
 * 2) 매핑에 없으면 로마숫자만 정규화
 */
const normalizeToBaseSubject = (name: string): string => {
  const mapped = BASE_SUBJECT_MAP[name];
  if (mapped) return mapped;
  // 후행 숫자 제거 (예: "공통국어1" 매핑 누락 시 폴백)
  const stripped = name.replace(/[0-9]+$/, "").trim();
  const mappedStripped = BASE_SUBJECT_MAP[stripped];
  if (mappedStripped) return mappedStripped;
  return normalizeSubjectName(name);
};

// ─── 학과→계열 매칭 (matchMajorEvaluationCriteria와 통일) ───

/**
 * matchMajorEvaluationCriteria(targetDept)의 majorGroup을 기반으로
 * 권장과목 목록에서 일치하는 계열을 찾는다.
 * → 학과→계열 매칭 로직이 한 곳(major-evaluation-criteria.ts)에만 존재하므로
 *   매칭 불일치 문제가 발생하지 않는다.
 */
const findMatchingMajor = (
  targetDept: string,
  recommendations: {
    major: string;
    coreSubjects: string[];
    recommendedCourses: string[];
  }[]
): (typeof recommendations)[number] | undefined => {
  // 1) targetDept가 이미 계열명인 경우 직접 매칭 (detectedMajorGroup 등)
  const directByDept = recommendations.find((m) => m.major === targetDept);
  if (directByDept) return directByDept;

  // 2) detectedMajorGroup ↔ recommended-courses major 이름이 다른 경우 매핑
  const GROUP_TO_COURSE_MAJOR: Record<string, string[]> = {
    의생명: ["의학", "생명바이오"],
    예체능교육: ["예체능", "교육"],
  };

  const altsByDept = GROUP_TO_COURSE_MAJOR[targetDept];
  if (altsByDept) {
    for (const alt of altsByDept) {
      const found = recommendations.find((m) => m.major === alt);
      if (found) return found;
    }
  }

  // 3) 학과명(예: "체육교육과")에서 계열 추론 (matchMajorEvaluationCriteria 기반)
  const criteria = matchMajorEvaluationCriteria(targetDept);
  const { majorGroup } = criteria;

  const direct = recommendations.find((m) => m.major === majorGroup);
  if (direct) return direct;

  // 4) majorGroup도 매핑이 필요한 경우
  const altsByGroup = GROUP_TO_COURSE_MAJOR[majorGroup];
  if (altsByGroup) {
    for (const alt of altsByGroup) {
      const found = recommendations.find((m) => m.major === alt);
      if (found) return found;
    }
  }

  // 5) 폴백: includes 매칭
  return recommendations.find(
    (m) =>
      targetDept.includes(m.major) ||
      m.major.includes(targetDept.split(" ")[0] ?? "")
  );
};

export const matchRecommendedCourses = (
  generalSubjects: GeneralSubjectRow[],
  careerSubjects: CareerSubjectRow[],
  targetDept: string,
  studentGrade: number,
  curriculumVersion?: "2015" | "2022"
): RecommendedCourseMatch => {
  // 학생이 이수한 과목명을 정규화하여 Set 구축
  const takenRawSet = new Set<string>();
  const normalizedToRaw = new Map<string, string>();
  const baseSubjectSet = new Set<string>();
  for (const s of generalSubjects) {
    takenRawSet.add(s.subject);
    normalizedToRaw.set(normalizeSubjectName(s.subject), s.subject);
    baseSubjectSet.add(normalizeToBaseSubject(s.subject));
  }
  for (const s of careerSubjects) {
    takenRawSet.add(s.subject);
    normalizedToRaw.set(normalizeSubjectName(s.subject), s.subject);
    baseSubjectSet.add(normalizeToBaseSubject(s.subject));
  }
  const takenNormalizedSet = new Set(normalizedToRaw.keys());

  // Find matching major recommendation (교육과정 버전에 따라 분기)
  const courseRecommendations = getMajorCourseRecommendations(
    studentGrade,
    curriculumVersion
  );
  const matchingMajor = findMatchingMajor(targetDept, courseRecommendations);

  const requiredCourses = matchingMajor?.recommendedCourses ?? [];

  // 정규화된 이름으로 매칭 (로마숫자 정규화 + 기본 교과명 매칭)
  const takenCourses: string[] = [];
  const missingCourses: string[] = [];
  for (const course of requiredCourses) {
    const normalized = normalizeSubjectName(course);
    const base = normalizeToBaseSubject(course);
    if (
      takenNormalizedSet.has(normalized) ||
      takenRawSet.has(course) ||
      baseSubjectSet.has(base) ||
      baseSubjectSet.has(normalized)
    ) {
      takenCourses.push(course);
    } else {
      missingCourses.push(course);
    }
  }

  const isCompleted = studentGrade >= 3;

  return {
    _referenceTargetMajor: matchingMajor?.major ?? targetDept,
    requiredCourses,
    takenCourses,
    missingCourses,
    matchRate:
      requiredCourses.length > 0
        ? Math.round((takenCourses.length / requiredCourses.length) * 100)
        : 100,
    isCompleted,
  };
};

const detectCurriculumVersion = (
  activities: CreativeActivityRow[]
): "2015" | "2022" => {
  const areas = new Set(activities.map((a) => a.area));
  // 2015 확정: 봉사활동은 2015 개정에만 존재
  if (areas.has("봉사활동")) return "2015";
  // 2022 확정: 자율·자치활동은 2022 개정에만 존재
  if (areas.has("자율·자치활동") || areas.has("자율자치활동")) return "2022";
  // 폴백: 봉사활동도 자율·자치활동도 없으면 판별 불가 → 2022로 기본
  // (고1·고2는 상위 호출부에서 이미 grade 기반으로 "2022"를 확정하므로,
  //  여기 도달하는 것은 고3/졸업생만. 고3 중 봉사활동이 빠진 케이스는 드물지만 안전하게 "2015")
  return "2015";
};

const normalizeAttendance = (
  attendance: AttendanceRow[]
): AttendanceSummaryItem[] => {
  return attendance.map((a) => ({
    year: a.year,
    totalDays: a.totalDays ?? 0,
    note: a.note ?? "",
    totalAbsence:
      (a.absenceIllness ?? 0) +
      (a.absenceUnauthorized ?? 0) +
      (a.absenceOther ?? 0),
    illness: a.absenceIllness ?? 0,
    unauthorized: a.absenceUnauthorized ?? 0,
    etc: a.absenceOther ?? 0,
    lateness:
      (a.latenessIllness ?? 0) +
      (a.latenessUnauthorized ?? 0) +
      (a.latenessOther ?? 0),
    earlyLeave:
      (a.earlyLeaveIllness ?? 0) +
      (a.earlyLeaveUnauthorized ?? 0) +
      (a.earlyLeaveOther ?? 0),
  }));
};

const computeRecordVolume = (
  evals: SubjectEvaluationRow[],
  activities: CreativeActivityRow[],
  behaviors: BehavioralAssessmentRow[]
): RecordVolumeItem[] => {
  const byteLength = (s: string) => new TextEncoder().encode(s).length;

  // 교과 세특
  const evalBytes = evals.map((e) => byteLength(e.evaluation));
  const avgEvalBytes =
    evalBytes.length > 0
      ? evalBytes.reduce((a, b) => a + b, 0) / evalBytes.length
      : 0;

  const result: RecordVolumeItem[] = [
    {
      category: "교과 세특",
      maxCapacity: "과목당 500자(1500바이트)",
      actualVolume: `평균 ${Math.round(avgEvalBytes / 3)}자(${Math.round(avgEvalBytes)}바이트)`,
      fillRate: Math.min(100, Math.round((avgEvalBytes / 1500) * 100)),
    },
  ];

  // 창체 영역별
  const activityAreas = ["자율활동", "자율·자치활동", "동아리활동", "진로활동"];
  for (const area of activityAreas) {
    const matching = activities.filter(
      (a) => a.area === area || a.area.includes(area.replace("활동", ""))
    );
    if (matching.length === 0) continue;
    const bytes = matching.map((a) => byteLength(a.note));
    const avg = bytes.reduce((a, b) => a + b, 0) / bytes.length;
    result.push({
      category: area,
      maxCapacity: "500자(1500바이트)",
      actualVolume: `평균 ${Math.round(avg / 3)}자(${Math.round(avg)}바이트)`,
      fillRate: Math.min(100, Math.round((avg / 1500) * 100)),
    });
  }

  // 행동특성
  if (behaviors.length > 0) {
    const bytes = behaviors.map((b) => byteLength(b.assessment));
    const avg = bytes.reduce((a, b) => a + b, 0) / bytes.length;
    result.push({
      category: "행동특성",
      maxCapacity: "500자(1500바이트)",
      actualVolume: `평균 ${Math.round(avg / 3)}자(${Math.round(avg)}바이트)`,
      fillRate: Math.min(100, Math.round((avg / 1500) * 100)),
    });
  }

  return result;
};

const extractKeywords = (
  evals: SubjectEvaluationRow[],
  activities: CreativeActivityRow[],
  behaviors: BehavioralAssessmentRow[]
): WordCloudItem[] => {
  const allText = [
    ...evals.map((e) => e.evaluation),
    ...activities.map((a) => a.note),
    ...behaviors.map((b) => b.assessment),
  ].join(" ");

  // Simple noun extraction via regex (Korean nouns tend to be 2+ characters)
  const words = allText
    .replace(/[^\uAC00-\uD7A3\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([text, frequency]) => ({ text, frequency }));
};

const computeStudentTypeInput = (
  overallAvg: number,
  subjects: GeneralSubjectRow[],
  evals: SubjectEvaluationRow[],
  activities: CreativeActivityRow[],
  attendance: AttendanceRow[]
): PreprocessedData["studentTypeInput"] => {
  // Rough heuristic scoring for initial type classification input
  const academicScore = Math.max(
    0,
    Math.min(100, Math.round((10 - overallAvg) * 12))
  );

  const careerActivities = activities.filter((a) => a.area.includes("진로"));
  const careerScore = Math.min(
    100,
    Math.round(
      30 +
        careerActivities.length * 10 +
        (evals.length > 0 ? 20 : 0) +
        (subjects.length > 10 ? 10 : 0)
    )
  );

  const communityActivities = activities.filter(
    (a) => a.area.includes("자율") || a.area.includes("봉사")
  );
  const totalUnauthorized = attendance.reduce(
    (s, a) => s + (a.absenceUnauthorized ?? 0),
    0
  );
  const communityScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(50 + communityActivities.length * 8 - totalUnauthorized * 10)
    )
  );

  const uniqueYears = new Set(evals.map((e) => e.year)).size;
  const growthScore = Math.min(100, Math.round(30 + uniqueYears * 20));

  return {
    academicScore,
    careerScore,
    communityScore,
    growthScore,
  };
};

// ─── 텍스트 빌더 ───

const buildTexts = (
  data: PreprocessedData,
  recordData: RecordData,
  studentInfo: StudentInfo,
  plan: ReportPlan
): PreprocessedTexts => {
  const studentProfileText = formatStudentProfile(
    studentInfo,
    data.convertedGrade,
    data.gradingSystem
  );
  const recordDataText = formatRecordData(recordData);
  const subjectDataText = formatSubjectEvaluations(
    recordData.subjectEvaluations ?? []
  );
  const creativeActivitiesText = formatCreativeActivities(
    recordData.creativeActivities ?? []
  );
  const behavioralAssessmentText = formatBehavioralAssessments(
    recordData.behavioralAssessments ?? []
  );
  const rawAcademicDataText = formatRawAcademicData(
    recordData.generalSubjects ?? [],
    recordData.careerSubjects ?? []
  );
  const preprocessedAcademicDataText = JSON.stringify(data, null, 2);
  const attendanceSummaryText = JSON.stringify(data.attendanceSummary, null, 2);
  const recommendedCourseMatchText = JSON.stringify(
    data.recommendedCourseMatch,
    null,
    2
  );
  const recordVolumeText = JSON.stringify(data.recordVolume, null, 2);

  // 실기 예체능 판별: 모든 희망대학이 실기일 때만 전체 제외
  const targetDept = studentInfo.targetDepartment ?? "";
  const allTargetsPractical =
    studentInfo.targetUniversities &&
    studentInfo.targetUniversities.length > 0 &&
    studentInfo.targetUniversities.every((t) =>
      isArtSportPractical(t.department)
    );
  const artSportPractical =
    allTargetsPractical ?? isArtSportPractical(targetDept);

  // 계열별 입학사정관 평가 기준 생성
  const majorCriteria = matchMajorEvaluationCriteria(targetDept);
  const majorEvalBase = targetDept
    ? formatMajorEvaluationContext(
        majorCriteria,
        targetDept,
        data.gradingSystem
      )
    : "";
  // 커리어넷 API 기반 학과 관련 교과 정보 추가
  const majorInfoFromApi = targetDept ? findMajorInfo(targetDept) : undefined;
  const careerNetContext = majorInfoFromApi
    ? `\n\n### 커리어넷 학과 관련 교과 (${majorInfoFromApi.majorName})\n` +
      `- 계열: ${majorInfoFromApi.lClass}\n` +
      `- 일반선택 관련 교과: ${majorInfoFromApi.electiveSubjects.join(", ") || "없음"}\n` +
      `- 진로선택 관련 교과: ${majorInfoFromApi.careerSubjects.join(", ") || "없음"}\n` +
      `- 개설 대학: ${majorInfoFromApi.universities.slice(0, 10).join(", ")}`
    : "";
  const majorEvaluationContextText = majorEvalBase + careerNetContext;

  // 유저 설정 희망대학 텍스트
  const targetUniversitiesText = formatTargetUniversities(
    studentInfo.targetUniversities
  );

  return {
    studentProfileText,
    recordDataText,
    subjectDataText,
    creativeActivitiesText,
    behavioralAssessmentText,
    rawAcademicDataText,
    preprocessedAcademicDataText,
    attendanceSummaryText,
    recommendedCourseMatchText,
    recordVolumeText,
    universityCandidatesText: artSportPractical
      ? "[]"
      : buildUniversityCandidatesText(
          targetDept,
          data.gradingSystem,
          data.overallAverage
        ),
    targetUniversitiesText,
    curriculumVersion: data.curriculumVersion,
    majorEvaluationContextText,
    completedSubjectsByYearText: formatCompletedSubjectsByYear(
      recordData,
      studentInfo.grade,
      studentInfo.isGraduate
    ),
    isArtSportPractical: artSportPractical,
  };
};

/**
 * 5등급제 등급별 대학 라인 (일반고 학종 기준).
 * 이 등급 이하(숫자가 크면 낮은 등급)인 대학만 후보에 포함.
 */
/**
 * 5등급제 등급별 대학 커트라인 (일반고 학종 기준).
 * @see require/university-grade-mapping.md
 */
const FIVE_GRADE_UNIVERSITY_CUTOFF: Record<string, number> = {
  // 1.0: 메디컬, SKY, KAIST, 포항공대
  서울대학교: 1.0,
  KAIST: 1.0,
  연세대학교: 1.0,
  고려대학교: 1.0,
  포항공과대학교: 1.0,
  // 1.1: 서강대, 성균관대, 한양대
  서강대학교: 1.1,
  성균관대학교: 1.1,
  한양대학교: 1.1,
  // 1.2: 중앙대, 경희대, 한국외대, 서울시립대, 과기원
  중앙대학교: 1.2,
  경희대학교: 1.2,
  한국외국어대학교: 1.2,
  서울시립대학교: 1.2,
  UNIST: 1.2,
  DGIST: 1.2,
  GIST: 1.2,
  // 1.3: 건국대, 동국대, 홍익대
  건국대학교: 1.3,
  동국대학교: 1.3,
  홍익대학교: 1.3,
  // 1.4: 아주대, 인하대, 경북대, 부산대
  아주대학교: 1.4,
  인하대학교: 1.4,
  경북대학교: 1.4,
  부산대학교: 1.4,
  // 1.5: 국민대, 숭실대, 세종대, 단국대, 서울과기대
  국민대학교: 1.5,
  숭실대학교: 1.5,
  세종대학교: 1.5,
  단국대학교: 1.5,
  서울과학기술대학교: 1.5,
  // 1.6: 한양대(ERICA), 한국항공대
  "한양대학교(ERICA)": 1.6,
  한국항공대학교: 1.6,
  // 1.7: 광운대, 명지대, 상명대
  광운대학교: 1.7,
  명지대학교: 1.7,
  상명대학교: 1.7,
  // 1.8: 인천대, 가천대, 경기대
  인천대학교: 1.8,
  가천대학교: 1.8,
  경기대학교: 1.8,
};

/**
 * 9등급제 등급별 대학 커트라인 (일반고 학종 기준).
 * 5등급→9등급 환산: 1.0→1~2, 1.5→3~4, 2.0→4~5
 */
const NINE_GRADE_UNIVERSITY_CUTOFF: Record<string, number> = {
  서울대학교: 1.5,
  KAIST: 1.5,
  연세대학교: 1.5,
  고려대학교: 1.5,
  포항공과대학교: 1.5,
  서강대학교: 2.0,
  성균관대학교: 2.0,
  한양대학교: 2.0,
  중앙대학교: 2.5,
  경희대학교: 2.5,
  한국외국어대학교: 2.5,
  서울시립대학교: 2.5,
  건국대학교: 3.0,
  동국대학교: 3.0,
  홍익대학교: 3.0,
  아주대학교: 3.5,
  인하대학교: 3.5,
  경북대학교: 3.5,
  부산대학교: 3.5,
  국민대학교: 4.0,
  숭실대학교: 4.0,
  세종대학교: 4.0,
  단국대학교: 4.0,
  서울과학기술대학교: 4.0,
  광운대학교: 4.5,
  명지대학교: 4.5,
  인천대학교: 5.0,
  가천대학교: 5.0,
  경기대학교: 5.0,
};

/**
 * 5등급제 → 9등급제 환산 (커트라인 데이터가 9등급제 기준이므로).
 * @see require/university-grade-mapping.md
 */
const fiveToNineGrade = (five: number): number => {
  if (five <= 1.0) return 1.5;
  if (five <= 1.5) return 1.5 + (five - 1.0) * 4; // 1.0→1.5, 1.5→3.5
  return 3.5 + (five - 1.5) * 2; // 1.5→3.5, 2.0→4.5, 2.5→5.5, 3.0→6.5
};

/**
 * 대학의 대표 커트라인 등급 산출 (9등급제 기준).
 * 학종 70%cut 우선, 없으면 교과 70%cut, 없으면 50%cut fallback.
 */
const getRepresentativeCutoff = (
  cutoffs: {
    admissionType: string;
    cutoff50Grade: number | null;
    cutoff70Grade: number | null;
  }[]
): number | null => {
  // 학종 70%cut 우선
  const hakjong = cutoffs.find((c) => c.admissionType === "학종");
  if (hakjong?.cutoff70Grade != null) return hakjong.cutoff70Grade;
  if (hakjong?.cutoff50Grade != null) return hakjong.cutoff50Grade;
  // 교과 fallback
  const gyogwa = cutoffs.find((c) => c.admissionType === "교과");
  if (gyogwa?.cutoff70Grade != null) return gyogwa.cutoff70Grade;
  if (gyogwa?.cutoff50Grade != null) return gyogwa.cutoff50Grade;
  // 아무거나
  for (const c of cutoffs) {
    if (c.cutoff70Grade != null) return c.cutoff70Grade;
    if (c.cutoff50Grade != null) return c.cutoff50Grade;
  }
  return null;
};

/**
 * 커트라인 데이터 기반 대학 후보군 생성.
 * 학생 등급과 비슷한 점수대의 대학만 후보로 제공한다.
 */
export const buildUniversityCandidatesText = (
  targetDept: string,
  gradingSystem?: "5등급제" | "9등급제",
  overallAverage?: number,
  /** detectedMajorGroup이 계열명일 때 실제 학과명으로 폴백 */
  fallbackDepartment?: string
): string => {
  if (!targetDept) return "[]";

  // targetDept(생기부 기반 계열 또는 학과명)를 우선 사용
  // fallbackDepartment는 targetDept로 매칭 실패 시에만 사용
  let majorInfo = findMajorInfo(targetDept);
  if (!majorInfo && fallbackDepartment) {
    majorInfo = findMajorInfo(fallbackDepartment);
  }
  if (!majorInfo) return "[]";

  const universities = majorInfo.universities as string[];

  // 학생 등급을 9등급제로 환산 (커트라인 데이터가 9등급제 기준)
  const studentGrade9 =
    overallAverage != null
      ? gradingSystem === "5등급제"
        ? fiveToNineGrade(overallAverage)
        : overallAverage
      : null;

  // 각 대학의 커트라인 데이터 조회 + 대표 등급 산출
  const withCutoff = universities.map((university) => {
    const cutoffs = findCutoffData(university, majorInfo.majorName);
    const cutoffSummary =
      cutoffs.length > 0
        ? cutoffs
            .map(
              (c) =>
                `${c.admissionType}(${c.admissionName}): 50%cut=${c.cutoff50Grade ?? "-"}, 70%cut=${c.cutoff70Grade ?? "-"}, 경쟁률=${c.competitionRate}`
            )
            .join(" / ")
        : null;
    const repCutoff = getRepresentativeCutoff(cutoffs);
    return { university, cutoffSummary, repCutoff };
  });

  // 학생 등급 기반 필터링: 커트라인이 학생 등급 근처인 대학만 선정
  let filtered = withCutoff;
  if (studentGrade9 != null) {
    const margin = 0.5; // 9등급제 기준 ±0.5 (학생 수준과 근접한 대학만 선정)

    // 대학별 중간값 캐시 (학과 매칭 실패 시 대학 전체 중간값으로 fallback)
    const uniMedianCache = new Map<string, number | null>();
    const getUniversityMedian = (university: string): number | null => {
      if (uniMedianCache.has(university))
        return uniMedianCache.get(university)!;
      const allCutoffs = ADMISSION_CUTOFF_DATA.filter(
        (d) => d.university === university && d.cutoff70Grade != null
      ).map((d) => d.cutoff70Grade!);
      if (allCutoffs.length === 0) {
        uniMedianCache.set(university, null);
        return null;
      }
      allCutoffs.sort((a, b) => a - b);
      const median = allCutoffs[Math.floor(allCutoffs.length / 2)];
      uniMedianCache.set(university, median);
      return median;
    };

    filtered = withCutoff.filter((c) => {
      // 5등급제 학생: 하드코딩 맵 기반 필터링 (9등급 커트라인 변환 오차 방지)
      // 비대칭 범위: 상향(-0.5)은 넓게, 하향(+0.2)은 좁게
      if (gradingSystem === "5등급제") {
        const hardcoded = FIVE_GRADE_UNIVERSITY_CUTOFF[c.university];
        if (hardcoded !== undefined) {
          const diff = hardcoded - overallAverage!; // 음수=상향, 양수=하향
          return diff >= -0.4 && diff <= 0.2;
        }
        return false;
      }

      // 9등급제 학생: 커트라인 직접 비교
      if (c.repCutoff != null) {
        return (
          c.repCutoff >= studentGrade9 - margin &&
          c.repCutoff <= studentGrade9 + margin
        );
      }

      // 하드코딩 맵 체크
      const hardcoded = NINE_GRADE_UNIVERSITY_CUTOFF[c.university];
      if (hardcoded !== undefined) {
        return Math.abs(hardcoded - overallAverage!) <= margin;
      }

      return false;
    });

    // 필터 결과가 5개 미만이면 범위 소폭 확대
    if (filtered.length < 5) {
      const wider = 0.8;
      filtered = withCutoff.filter((c) => {
        if (gradingSystem === "5등급제") {
          const hardcoded = FIVE_GRADE_UNIVERSITY_CUTOFF[c.university];
          if (hardcoded !== undefined) {
            const diff = hardcoded - overallAverage!;
            return diff >= -0.6 && diff <= 0.3;
          }
          // 커트라인 맵에 없는 대학: 실제 커트라인 데이터가 있으면 9등급 환산 비교
          if (c.repCutoff != null) {
            return (
              c.repCutoff >= studentGrade9 - wider &&
              c.repCutoff <= studentGrade9 + wider
            );
          }
          // 커트라인 데이터도 없으면 포함 (AI가 판단하도록)
          return true;
        }
        if (c.repCutoff == null) return true;
        return (
          c.repCutoff >= studentGrade9 - wider &&
          c.repCutoff <= studentGrade9 + wider
        );
      });
    }

    // 그래도 5개 미만이면 모든 대학 포함 (AI가 등급 기반으로 적절히 판단)
    if (filtered.length < 5) {
      filtered = withCutoff;
    }
  }

  const candidates = filtered.map(({ university, cutoffSummary }) => ({
    university,
    department: majorInfo.majorName,
    ...(cutoffSummary ? { cutoffData: cutoffSummary } : {}),
  }));

  return JSON.stringify(candidates, null, 2);
};

const formatStudentProfile = (
  info: StudentInfo,
  convertedGrade?: PreprocessedData["convertedGrade"],
  gradingSystem?: "5등급제" | "9등급제"
): string => {
  const statusLabel = info.isGraduate
    ? "졸업생(N수생)"
    : `${info.grade}학년 재학생`;
  const semesterScope = info.isGraduate
    ? "3학년 2학기까지 (전체)"
    : info.grade === 3
      ? "3학년 1학기까지"
      : `${info.grade}학년까지`;

  const lines = [
    `이름: ${info.name}`,
    `학년: ${info.grade}학년`,
    `학생 상태: ${statusLabel}`,
    `분석 범위: ${semesterScope}`,
    `계열: ${info.track}`,
    `학교 유형: ${info.schoolType}`,
    ...(info.highSchoolRegion ? [`고교 소재지: ${info.highSchoolRegion}`] : []),
    ...(gradingSystem ? [`적용 등급제: ${gradingSystem}`] : []),
  ];
  if (convertedGrade) {
    lines.push(
      `환산 등급: ${convertedGrade.converted} (원래 ${convertedGrade.original}, ${convertedGrade.schoolType} 보정 적용)`
    );
  }
  // 희망 대학/학과는 studentProfileText에 포함하지 않음
  // → 합격 판단이 필요한 admissionPrediction에만 targetUniversitiesText로 별도 전달
  // → 나머지 섹션은 희망학과를 모르는 상태에서 생기부만으로 분석
  lines.push(`모의고사 데이터: ${info.hasMockExamData ? "있음" : "없음"}`);
  return lines.join("\n");
};

/**
 * 학년별 이수 완료 과목 요약 텍스트 생성.
 * AI가 이미 이수 완료한 과목의 성적 향상을 권고하지 않도록 명확한 제약 정보를 제공한다.
 */
const formatCompletedSubjectsByYear = (
  recordData: RecordData,
  currentGrade: number,
  isGraduate?: boolean
): string => {
  const generalSubjects = recordData.generalSubjects ?? [];
  const careerSubjects = recordData.careerSubjects ?? [];

  // 학년별 이수 과목 그룹핑
  const byYear = new Map<number, string[]>();
  for (const s of generalSubjects) {
    const list = byYear.get(s.year) ?? [];
    list.push(s.subject);
    byYear.set(s.year, list);
  }
  for (const s of careerSubjects) {
    if (s.year > 0) {
      const list = byYear.get(s.year) ?? [];
      list.push(`${s.subject}(진로선택)`);
      byYear.set(s.year, list);
    }
  }

  const lines: string[] = ["## 학년별 이수 완료 과목 (성적 변경 불가)"];

  const sortedYears = [...byYear.keys()].sort();
  for (const year of sortedYears) {
    const subjects = byYear.get(year) ?? [];
    const uniqueSubjects = [...new Set(subjects)];
    lines.push(`- ${year}학년 이수 완료: ${uniqueSubjects.join(", ")}`);
  }

  // 학년/졸업 상태별 명확한 제약 조건
  if (isGraduate) {
    lines.push(
      "",
      "⚠️ 이 학생은 졸업생입니다. 모든 과목이 이수 완료되어 성적 변경이 불가능합니다.",
      "→ 성적 개선 권고 대신, 면접 준비 전략이나 자기소개서 작성 방향을 제시하세요."
    );
  } else if (currentGrade >= 3) {
    lines.push(
      "",
      "⚠️ 이 학생은 고3입니다. 위 과목들은 모두 이수 완료되어 성적 변경이 불가능합니다.",
      "→ 새로운 과목 이수 기회가 극히 제한적입니다. 기존 성적을 활용한 전략을 제시하세요."
    );
  } else {
    const completedYears = sortedYears.join(", ");
    const nextGrade = currentGrade + 1;
    lines.push(
      "",
      `⚠️ ${completedYears}학년 과목은 이미 이수 완료되어 성적 변경이 불가능합니다.`,
      `→ 위 과목의 성적을 올리라는 조언은 불가능합니다.`,
      `→ 대신, 해당 과목이 속한 교과 영역(예: 국어, 수학, 사회탐구 등)에서 ${nextGrade}학년 이후 선택과목 성적을 높이라고 조언하세요.`,
      `→ 예시: "통합사회 3등급 → 통합사회 성적을 올리세요" (❌ 불가능)`,
      `→ 예시: "통합사회 3등급 → 사회 교과 영역에서 2학년 선택과목(사회와 문화 등) 성적을 높이세요" (✅ 올바름)`
    );
  }

  return lines.join("\n");
};

const formatRecordData = (recordData: RecordData): string => {
  const sections: string[] = [];

  // 세특
  for (const e of recordData.subjectEvaluations ?? []) {
    sections.push(`[${e.year}학년 ${e.subject}]\n${e.evaluation}`);
  }

  // 창체
  for (const a of recordData.creativeActivities ?? []) {
    sections.push(`[${a.year}학년 ${a.area}]\n${a.note}`);
  }

  // 행동특성
  for (const b of recordData.behavioralAssessments ?? []) {
    sections.push(`[${b.year}학년 행동특성 및 종합의견]\n${b.assessment}`);
  }

  // 독서활동
  for (const r of recordData.readingActivities ?? []) {
    sections.push(
      `[${r.year}학년 독서활동 - ${r.subjectOrArea}]\n${r.content}`
    );
  }

  return sections.join("\n\n");
};

const formatSubjectEvaluations = (evals: SubjectEvaluationRow[]): string => {
  const sorted = [...evals].sort(
    (a, b) => a.year - b.year || a.subject.localeCompare(b.subject)
  );
  return sorted
    .map((e) => `[${e.year}학년 ${e.subject}]\n${e.evaluation}`)
    .join("\n\n");
};

const formatCreativeActivities = (
  activities: CreativeActivityRow[]
): string => {
  const sorted = [...activities]
    .filter((a) => a.area !== "봉사활동")
    .sort((a, b) => a.year - b.year || a.area.localeCompare(b.area));
  return sorted.map((a) => `[${a.year}학년 ${a.area}]\n${a.note}`).join("\n\n");
};

const formatBehavioralAssessments = (
  assessments: BehavioralAssessmentRow[]
): string => {
  const sorted = [...assessments].sort((a, b) => a.year - b.year);
  return sorted
    .map((b) => `[${b.year}학년 행동특성 및 종합의견]\n${b.assessment}`)
    .join("\n\n");
};

const formatRawAcademicData = (
  general: GeneralSubjectRow[],
  career: CareerSubjectRow[]
): string => {
  const lines: string[] = [];

  lines.push("## 일반 교과 성적");
  lines.push(
    "| 학년 | 학기 | 교과 | 과목 | 원점수 | 평균 | 표준편차 | 등급 | 수강자수 |"
  );
  lines.push(
    "|------|------|------|------|--------|------|----------|------|----------|"
  );
  for (const s of general.sort(
    (a, b) => a.year - b.year || a.semester - b.semester
  )) {
    lines.push(
      `| ${s.year} | ${s.semester} | ${s.category} | ${s.subject} | ${s.rawScore ?? "-"} | ${s.average ?? "-"} | ${s.standardDeviation ?? "-"} | ${s.gradeRank ?? "-"} | ${s.studentCount ?? "-"} |`
    );
  }

  if (career.length > 0) {
    lines.push("\n## 진로선택과목 성적");
    lines.push(
      "| 학년 | 학기 | 교과 | 과목 | 원점수 | 평균 | 성취도 | 수강자수 | 성취도분포 |"
    );
    lines.push(
      "|------|------|------|------|--------|------|--------|----------|-----------|"
    );
    for (const s of career.sort(
      (a, b) => a.year - b.year || a.semester - b.semester
    )) {
      lines.push(
        `| ${s.year} | ${s.semester} | ${s.category} | ${s.subject} | ${s.rawScore ?? "-"} | ${s.average ?? "-"} | ${s.achievement} | ${s.studentCount ?? "-"} | ${s.achievementDistribution} |`
      );
    }
  }

  return lines.join("\n");
};

const formatTargetUniversities = (
  targetUniversities?: StudentInfo["targetUniversities"]
): string => {
  if (!targetUniversities || targetUniversities.length === 0) {
    return "";
  }

  const lines = targetUniversities.map((t) => {
    const majorInfo = findMajorInfo(t.department);
    const hasCutoff = findCutoffData(t.universityName, t.department).length > 0;
    const dataAvailable = majorInfo || hasCutoff;
    const practical = isArtSportPractical(t.department);

    let suffix = "";
    if (practical) {
      suffix =
        " ⚠️ 실기 전형 예체능 학과 — 합격 예측 제외 (universityPredictions에 포함하지 마세요)";
    } else if (!dataAvailable) {
      suffix =
        ' ⚠️ 해당 학과 데이터 미확보 — 합격 예측 시 "(판단 불가)"로 표시';
    }
    return `- ${t.priority}지망: ${t.universityName} ${t.department} (${t.admissionType})${suffix}`;
  });

  return `## 유저 설정 희망대학\n${lines.join("\n")}`;
};

/**
 * Phase 2 이후 생기부 기반 계열로 권장과목 매칭을 재생성한다.
 * preprocessedData에 저장된 과목 데이터를 활용하여
 * 희망학과가 아닌 detectedMajorGroup 기준으로 매칭한다.
 */
export const rebuildRecommendedCourseMatchText = (
  detectedMajorGroup: string,
  preData: PreprocessedData,
  studentGrade: number
): string => {
  // allSubjectGrades를 matchRecommendedCourses 호환 형태로 변환
  const generalSubjects = (preData.allSubjectGrades ?? []).map((s) => ({
    subject: s.subject,
    year: s.year,
    semester: s.semester,
    category: "",
    credits: null as number | null,
    gradeRank: s.gradeRank,
    rawScore: s.rawScore,
    average: s.average,
    studentCount: s.studentCount,
    standardDeviation: null as number | null,
    achievement: "",
  }));

  const careerSubjects = (preData.careerSubjects ?? []).map((cs) => ({
    subject: cs.subject,
    year: 0,
    semester: 0,
    category: "",
    credits: null as number | null,
    rawScore: null as number | null,
    average: null as number | null,
    achievement: cs.achievement,
    studentCount: null as number | null,
    achievementDistribution: cs.achievementDistribution,
  }));

  const result = matchRecommendedCourses(
    generalSubjects,
    careerSubjects,
    detectedMajorGroup,
    studentGrade,
    preData.curriculumVersion
  );

  return JSON.stringify(result, null, 2);
};
