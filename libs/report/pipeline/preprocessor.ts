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
import { findCutoffData } from "../constants/admission-cutoff-data.ts";

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

// ─── 5등급제 환산 ───

const convertToFiveGrade = (nineGrade: number): number => {
  // 5등급제 전환 기준: 1→1, 2~3→2, 4~5→3, 6~7→4, 8~9→5
  if (nineGrade <= 1) return 1;
  if (nineGrade <= 3) return 2;
  if (nineGrade <= 5) return 3;
  if (nineGrade <= 7) return 4;
  return 5;
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

// ─── 메인 전처리 함수 ───

export const preprocess = (
  recordData: RecordData,
  studentInfo: StudentInfo,
  plan: ReportPlan
): PreprocessResult => {
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
    gradesWithRank.length > 0
      ? gradesWithRank.reduce((sum, s) => sum + (s.gradeRank ?? 0), 0) /
        gradesWithRank.length
      : 0;

  // 2. 학년/학기별 평균
  const gradeGroups = new Map<string, number[]>();
  for (const s of gradesWithRank) {
    const key = `${s.year}-${s.semester}`;
    if (!gradeGroups.has(key)) gradeGroups.set(key, []);
    gradeGroups.get(key)!.push(s.gradeRank!);
  }
  const averageByGrade = [...gradeGroups.entries()]
    .map(([key, grades]) => {
      const [year, semester] = key.split("-").map(Number);
      return {
        year,
        semester,
        average: grades.reduce((a, b) => a + b, 0) / grades.length,
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

  // 11. 권장과목 이수 매칭
  const recommendedCourseMatch = matchRecommendedCourses(
    generalSubjects,
    careerSubjects,
    studentInfo.targetDepartment ?? "",
    studentInfo.grade
  );

  // 12. 교육과정 버전 판별
  const curriculumVersion = detectCurriculumVersion(creativeActs);

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
  };

  const texts = buildTexts(data, recordData, studentInfo, plan);

  return { data, texts };
};

// ─── 보조 함수들 ───

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
    const avg =
      matching.length > 0
        ? matching.reduce((sum, s) => sum + (s.gradeRank ?? 0), 0) /
          matching.length
        : 0;
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
    related.length > 0
      ? related.reduce((sum, s) => sum + s.gradeRank!, 0) / related.length
      : overallAvg;

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
  // matchMajorEvaluationCriteria의 정규식 기반 매칭 결과를 활용
  const criteria = matchMajorEvaluationCriteria(targetDept);
  const { majorGroup } = criteria;

  // majorGroup과 recommendations의 major명 매핑
  // (major-evaluation-criteria의 majorGroup과 recommended-courses의 major가 동일한 경우 직접 매칭)
  const direct = recommendations.find((m) => m.major === majorGroup);
  if (direct) return direct;

  // majorGroup → recommended-courses major 매핑 (이름이 다른 경우)
  const GROUP_TO_COURSE_MAJOR: Record<string, string[]> = {
    의생명: ["의학", "생명바이오"],
    교육: ["인문", "사회과학"],
    예체능: ["인문"],
  };

  const alternatives = GROUP_TO_COURSE_MAJOR[majorGroup];
  if (alternatives) {
    for (const alt of alternatives) {
      const found = recommendations.find((m) => m.major === alt);
      if (found) return found;
    }
  }

  // 폴백: includes 매칭
  return recommendations.find(
    (m) =>
      targetDept.includes(m.major) ||
      m.major.includes(targetDept.split(" ")[0] ?? "")
  );
};

const matchRecommendedCourses = (
  generalSubjects: GeneralSubjectRow[],
  careerSubjects: CareerSubjectRow[],
  targetDept: string,
  studentGrade: number
): RecommendedCourseMatch => {
  // 학생이 이수한 과목명을 정규화하여 Set 구축
  const takenRawSet = new Set<string>();
  const normalizedToRaw = new Map<string, string>();
  for (const s of generalSubjects) {
    takenRawSet.add(s.subject);
    normalizedToRaw.set(normalizeSubjectName(s.subject), s.subject);
  }
  for (const s of careerSubjects) {
    takenRawSet.add(s.subject);
    normalizedToRaw.set(normalizeSubjectName(s.subject), s.subject);
  }
  const takenNormalizedSet = new Set(normalizedToRaw.keys());

  // Find matching major recommendation (교육과정 버전에 따라 분기)
  const courseRecommendations = getMajorCourseRecommendations(studentGrade);
  const matchingMajor = findMatchingMajor(targetDept, courseRecommendations);

  const requiredCourses = matchingMajor?.recommendedCourses ?? [];

  // 정규화된 이름으로 매칭
  const takenCourses: string[] = [];
  const missingCourses: string[] = [];
  for (const course of requiredCourses) {
    const normalized = normalizeSubjectName(course);
    if (takenNormalizedSet.has(normalized) || takenRawSet.has(course)) {
      takenCourses.push(course);
    } else {
      missingCourses.push(course);
    }
  }

  const isCompleted = studentGrade >= 3;

  return {
    targetMajor: matchingMajor?.major ?? targetDept,
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
  if (areas.has("봉사활동")) return "2015";
  if (areas.has("자율·자치활동") || areas.has("자율자치활동")) return "2022";
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
    data.convertedGrade
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

  // 계열별 입학사정관 평가 기준 생성
  const targetDept = studentInfo.targetDepartment ?? "";
  const majorCriteria = matchMajorEvaluationCriteria(targetDept);
  const majorEvalBase = targetDept
    ? formatMajorEvaluationContext(majorCriteria, targetDept)
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
    universityCandidatesText: buildUniversityCandidatesText(
      targetDept,
      data.gradingSystem,
      data.overallAverage
    ),
    targetUniversitiesText,
    curriculumVersion: data.curriculumVersion,
    majorEvaluationContextText,
  };
};

/**
 * 5등급제 등급별 대학 라인 (일반고 학종 기준).
 * 이 등급 이하(숫자가 크면 낮은 등급)인 대학만 후보에 포함.
 */
const FIVE_GRADE_UNIVERSITY_CUTOFF: Record<string, number> = {
  서울대학교: 1.0,
  KAIST: 1.0,
  연세대학교: 1.0,
  고려대학교: 1.0,
  포항공과대학교: 1.0,
  서강대학교: 1.1,
  성균관대학교: 1.1,
  한양대학교: 1.1,
  중앙대학교: 1.2,
  경희대학교: 1.2,
  한국외국어대학교: 1.2,
  서울시립대학교: 1.2,
  건국대학교: 1.3,
  동국대학교: 1.3,
  홍익대학교: 1.3,
  아주대학교: 1.4,
  인하대학교: 1.4,
  국민대학교: 1.5,
  숭실대학교: 1.5,
  세종대학교: 1.5,
  단국대학교: 1.5,
};

/** 커리어넷 데이터 기반 대학 후보군 텍스트 생성 (커트라인 포함) */
const buildUniversityCandidatesText = (
  targetDept: string,
  gradingSystem?: "5등급제" | "9등급제",
  overallAverage?: number
): string => {
  if (!targetDept) return "[]";
  const majorInfo = findMajorInfo(targetDept);
  if (!majorInfo) return "[]";

  let universities = majorInfo.universities as string[];

  // 5등급제 학생: 등급에 맞지 않는 상위 대학 필터링
  // 학생 등급 + 0.5 여유를 줘서 "도전 가능" 범위까지 포함
  if (gradingSystem === "5등급제" && overallAverage != null) {
    const maxReach = overallAverage - 0.5; // 예: 2.42 → 1.92까지 도전 가능
    universities = universities.filter((uni) => {
      const cutoff = FIVE_GRADE_UNIVERSITY_CUTOFF[uni];
      if (cutoff === undefined) return true; // 테이블에 없는 대학은 유지
      return cutoff >= maxReach; // 대학 커트라인이 학생 도달 범위 내
    });
  }

  const candidates = universities.map((university: string) => {
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

    return {
      university,
      department: majorInfo.majorName,
      ...(cutoffSummary ? { cutoffData: cutoffSummary } : {}),
    };
  });
  return JSON.stringify(candidates, null, 2);
};

const formatStudentProfile = (
  info: StudentInfo,
  convertedGrade?: PreprocessedData["convertedGrade"]
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
  ];
  if (convertedGrade) {
    lines.push(
      `환산 등급: ${convertedGrade.converted} (원래 ${convertedGrade.original}, ${convertedGrade.schoolType} 보정 적용)`
    );
  }
  if (info.targetUniversity || info.targetDepartment) {
    lines.push(
      `[참고] 희망 대학/학과 (합격 예측용 — 분석 방향과 무관): ${info.targetUniversity ?? ""} ${info.targetDepartment ?? ""}`.trim()
    );
  }
  lines.push(`모의고사 데이터: ${info.hasMockExamData ? "있음" : "없음"}`);
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
    const suffix = dataAvailable
      ? ""
      : ' ⚠️ 해당 학과 데이터 미확보 — 합격 예측 시 "(판단 불가)"로 표시';
    return `- ${t.priority}지망: ${t.universityName} ${t.department} (${t.admissionType})${suffix}`;
  });

  return `## 유저 설정 희망대학\n${lines.join("\n")}`;
};
