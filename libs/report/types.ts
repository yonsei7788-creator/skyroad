// ============================================================
// 리포트 Content JSONB 스키마 타입 정의 (v4)
//
// 기반 문서: specs/report-ai-spec.md, 바이브온 벤치마크 분석
// 구조: 3파트 + 부록, 총 21섹션
//
// Part 1 진단: studentProfile, competencyScore,
//              admissionPrediction, diagnostic
// Part 2 분석: competencyEvaluation, academicAnalysis,
//              courseAlignment, attendanceAnalysis,
//              activityAnalysis, subjectAnalysis,
//              behaviorAnalysis, overallAssessment
// Part 3 전략: weaknessAnalysis, topicRecommendation,
//              interviewPrep, admissionStrategy,
//              storyAnalysis, actionRoadmap
// 부록:       bookRecommendation, majorExploration, wordCloud
//
// + 조건부 directionGuide (고1 전용, admissionStrategy 대체)
//
// v4 변경: 벤치마크 비교, 원문 인용, 3단계 평가, 캐릭터 라벨 등 추가
// ============================================================

// ─── 플랜 & 공통 타입 ───

export type ReportPlan = "lite" | "standard" | "premium";

/** 역량 등급 (5단계) */
export type CompetencyGrade = "S" | "A" | "B" | "C" | "D";

/** 세특 평가 등급 */
export type SubjectRating = "excellent" | "good" | "average" | "weak";

/** 평가 영향도 */
export type EvaluationImpact = "high" | "medium" | "low";

/** 합격 가능성 (5단계) */
export type AdmissionChance =
  | "very_high"
  | "high"
  | "medium"
  | "low"
  | "very_low";

/** 지원 전략 유형 */
export type AdmissionTier = "상향" | "안정" | "하향";

/** 우선순위 */
export type Priority = "high" | "medium" | "low";

/** 역량 카테고리 (4대 역량) */
export type CompetencyCategory = "academic" | "career" | "community" | "growth";

/** 역량 태그 (역량 카테고리 + 하위항목) */
export interface CompetencyTag {
  category: CompetencyCategory;
  subcategory: string;
  assessment?: "우수" | "양호" | "미흡" | "부족";
}

// ─── v4 공통 타입 ───

/** 3단계 평가 (바이브온 스타일) */
export type ThreeTierRating = "우수" | "양호" | "보완필요";

/** 5단계 지원 안정도 */
export type AdmissionRiskBand = "안정" | "적정" | "소신" | "도전" | "위험";

/** 벤치마크 비교 데이터 (모든 비교 차트에 사용) */
export interface BenchmarkComparison {
  myValue: number;
  targetRangeAvg: number;
  overallAvg: number;
  estimationBasis?: string;
}

/** 생기부 원문 인용 + 역량 태깅 */
export interface OriginalTextCitation {
  originalText: string;
  source: string;
  competencyTags: CompetencyTag[];
  assessment: ThreeTierRating;
  positivePoint?: string;
  improvementSuggestion?: string;
}

/** 캐릭터 라벨 */
export interface CharacterLabel {
  label: string;
  rationale: string;
}

/** 기재 분량 분석 */
export interface VolumeMetric {
  category: string;
  maxCapacityChars: number;
  actualChars: number;
  fillRate: number;
  comparisonGroupAvg?: number;
}

/** 과목군별 역량 매트릭스 (바이브온 스타일) */
export interface SubjectGroupMatrix {
  group: string;
  적극성: ThreeTierRating;
  탐구정신: ThreeTierRating;
  전공진로탐색: ThreeTierRating;
  협력성: ThreeTierRating;
}

/** 리더십 정량 분석 */
export interface LeadershipQuantitative {
  totalPositions: number;
  positionsByYear: { grade: number; positions: string[] }[];
  leadershipRate: number;
}

/** 모든 섹션이 공유하는 기본 필드 */
interface BaseSection {
  sectionId: string;
  title: string;
}

// ============================================================
// Part 1: 진단
// ============================================================

// ─── 섹션 1: 학생 프로필 (studentProfile) ───

export interface StudentProfileSection extends BaseSection {
  sectionId: "studentProfile";

  /** 학생 유형명 (예: "탐구형 성장러", "실행형 리더") */
  typeName: string;
  /** 유형 설명 (2~3줄) */
  typeDescription: string;

  /** 레이더 차트 데이터 (4대 역량, 0~100) */
  radarChart: {
    academic: number;
    career: number;
    community: number;
    growth: number;
  };

  /** 핵심 키워드 태그 (3~5개) */
  tags: string[];

  /** 한줄 캐치프레이즈 */
  catchPhrase: string;

  // ─── v4 추가 ───

  /** 레이더 차트 벤치마크 비교 (역량별) */
  radarChartComparison?: Record<string, BenchmarkComparison>;
  /** 백분위 라벨 (예: "상위 34%") */
  percentileLabel?: string;
  /** 유형 강점 (2~3개) */
  typeStrengths?: string[];
  /** 유형 약점 (2~3개) */
  typeWeaknesses?: string[];
}

// ─── 섹션 2: 역량 정량 스코어 (competencyScore) ───

interface CompetencySubScore {
  name: string;
  score: number;
  maxScore: number;
  comment: string;
}

interface CompetencyScoreDetail {
  category: CompetencyCategory;
  label: string;
  score: number;
  maxScore: 100;
  subcategories: CompetencySubScore[];
  grade?: CompetencyGrade;
  gradeComment?: string;
}

/** 비교 데이터 (내 점수 vs 지원적정구간 평균 vs 전체 평균) */
interface ComparisonData {
  myScore: number;
  targetRangeAvg?: number;
  overallAvg?: number;
}

export interface CompetencyScoreSection extends BaseSection {
  sectionId: "competencyScore";

  /**
   * 총점 (학업 + 진로 + 공동체, 0~300)
   * 발전가능성은 별도 등급으로 표시
   */
  totalScore: number;

  /** 발전가능성 등급 (총점에 미포함, 별도 표시) */
  growthGrade: CompetencyGrade;
  /** 발전가능성 점수 (0~100, radarChart.growth 기반) */
  growthScore?: number;
  growthComment: string;

  /** 역량별 점수 상세 (학업, 진로, 공동체 3개) */
  scores: [CompetencyScoreDetail, CompetencyScoreDetail, CompetencyScoreDetail];

  /** Standard+: 백분위 추정 */
  percentile?: number;
  percentileLabel?: string;

  /** Standard+: 비교 데이터 */
  comparison?: ComparisonData;

  /** 점수 해석 */
  interpretation: string;

  // ─── v4 추가 ───

  /** 학업/진로/공동체 각각 벤치마크 비교 */
  scoreComparisons?: [
    BenchmarkComparison,
    BenchmarkComparison,
    BenchmarkComparison,
  ];
  /** 지원 안정도 밴드 */
  scoreBand?: {
    label: AdmissionRiskBand;
    rangeMin: number;
    rangeMax: number;
    description: string;
  };
  /** 하위항목별 비교 */
  subcategoryComparisons?: {
    name: string;
    myScore: number;
    maxScore: number;
    estimatedAvg: number;
  }[];
}

// ─── 섹션 3: 합격 예측 (admissionPrediction) ───

interface UniversityPrediction {
  university: string;
  department: string;
  chance: AdmissionChance;
  rationale: string;
}

interface AdmissionPredictionItem {
  admissionType: "학종" | "교과" | "정시";
  /** 합격률 표시 (예: "60~70%") */
  passRateLabel: string;
  /** 합격률 수치 범위 [하한, 상한] */
  passRateRange: [number, number];
  /** 근거 분석 (2~3줄) */
  analysis: string;
  /** Standard+: 주요 대학별 예측 */
  universityPredictions?: UniversityPrediction[];
}

export interface AdmissionPredictionSection extends BaseSection {
  sectionId: "admissionPrediction";

  /** 추천 전형 */
  recommendedType: "학종" | "교과" | "정시";
  recommendedTypeReason: string;

  /** 전형별 합격 예측 */
  predictions: AdmissionPredictionItem[];

  /** 종합 코멘트 */
  overallComment: string;

  // ─── v4 추가 ───

  /** 전형별 리스크 밴드 */
  riskBands?: {
    admissionType: "학종" | "교과" | "정시";
    band: AdmissionRiskBand;
    rationale: string;
  }[];
  /** 대학별 상세 예측 */
  detailedUniversityPredictions?: {
    university: string;
    department: string;
    admissionType: string;
    band: AdmissionRiskBand;
    passRateRange: [number, number];
    comparisonBar?: BenchmarkComparison;
    keyFactors: {
      factor: string;
      impact: "positive" | "negative" | "neutral";
    }[];
    rationale: string;
  }[];
  /** 전형 적합도 점수 */
  typeSuitabilityScores?: {
    type: string;
    score: number;
  }[];
}

// ─── 섹션 4: 종합 진단 (diagnostic) ───

interface DiagnosticKeyword {
  label: string;
  description: string;
}

interface CompetencySummaryItem {
  category: CompetencyCategory;
  label: string;
  summary: string;
}

export interface DiagnosticSection extends BaseSection {
  sectionId: "diagnostic";

  /** 한줄 총평 */
  oneLiner: string;
  /** 핵심 키워드 3개 */
  keywords: [DiagnosticKeyword, DiagnosticKeyword, DiagnosticKeyword];
  /** 학업/진로/공동체/발전가능성 한줄씩 */
  competencySummary: [
    CompetencySummaryItem,
    CompetencySummaryItem,
    CompetencySummaryItem,
    CompetencySummaryItem,
  ];

  /** Standard+: 입시 포지셔닝 (추천 전형 방향) */
  admissionPositioning?: string;
  /** Premium: 합격 가능 전략 요약 */
  strategyOverview?: string;

  // ─── v4 추가 ───

  /** 대시보드 핵심 지표 */
  dashboardMetrics?: {
    totalScore: number;
    percentileLabel: string;
    gradeTrend: "상승" | "유지" | "하락";
    recordFillRate: number;
    recommendedType: string;
  };
  /** 역량별 바 차트 데이터 */
  competencyBars?: {
    category: string;
    label: string;
    score: number;
    maxScore: number;
    assessment: ThreeTierRating;
  }[];
  /** 핵심 강점 */
  topStrengths?: string[];
  /** 핵심 약점 */
  topWeaknesses?: string[];
  /** 캐릭터 라벨 */
  characterLabel?: CharacterLabel;
}

// ============================================================
// Part 2: 분석
// ============================================================

// ─── 섹션 5: 역량별 종합 평가 (competencyEvaluation) ───

interface StrengthWeaknessItem {
  competencyTag: CompetencyTag;
  label: string;
  evidence: string;
  /** v4: 3단계 평가 */
  tier?: ThreeTierRating;
  /** v4: 원문 인용 근거 */
  originalQuotes?: OriginalTextCitation[];
}

interface SubcategoryRating {
  name: string;
  grade: CompetencyGrade;
  comment: string;
}

interface CompetencyRating {
  category: CompetencyCategory;
  label: string;
  grade: CompetencyGrade;
  comment: string;
  /** Premium: 하위항목별 등급 */
  subcategories?: SubcategoryRating[];
}

export interface CompetencyEvaluationSection extends BaseSection {
  sectionId: "competencyEvaluation";

  /** Lite: 3개, Standard: 5개, Premium: 5개+ */
  strengths: StrengthWeaknessItem[];
  /** Lite: 3개, Standard: 5개, Premium: 5개+ */
  weaknesses: StrengthWeaknessItem[];
  /** Lite: 3~5줄, Standard/Premium: 상세 */
  overallComment: string;

  /** 4대 역량별 등급 (모든 플랜) */
  competencyRatings: CompetencyRating[];

  // ─── v4 추가 ───

  /** 역량별 캐릭터 라벨 */
  competencyCharacters?: {
    category: CompetencyCategory;
    characterLabel: CharacterLabel;
  }[];
  /** 전체 원문 인용 목록 */
  citationAnalysis?: OriginalTextCitation[];
  /** 역량별 벤치마크 비교 */
  competencyBenchmarks?: {
    category: CompetencyCategory;
    comparison: BenchmarkComparison;
  }[];
}

// ─── 섹션 6: 성적 분석 (academicAnalysis) ───

interface GradeSummaryByYear {
  year: number;
  semester: number;
  averageGrade: number;
}

interface SubjectGradeItem {
  subject: string;
  year: number;
  semester: number;
  grade: number;
  rawScore?: number;
  classAverage?: number;
  standardDeviation?: number;
  studentCount?: number;
}

interface SubjectCombinationAverage {
  combination: string;
  averageGrade: number;
}

/** Standard+: 원점수-평균-표준편차 분석 */
interface SubjectStatAnalysis {
  subject: string;
  year: number;
  semester: number;
  zScore: number;
  percentileEstimate: number;
  interpretation: string;
}

/** Standard+: 과목 간 편차 분석 */
interface GradeDeviationAnalysis {
  highestSubject: string;
  lowestSubject: string;
  deviationRange: number;
  riskAssessment: string;
}

/** Standard+: 전공 관련 교과 분석 */
interface MajorRelevanceAnalysis {
  enrollmentEffort: string;
  achievement: string;
  recommendedSubjects?: string[];
}

/** Standard+: 진로선택과목 분석 */
interface CareerSubjectAnalysis {
  subject: string;
  achievement: string;
  achievementDistribution: string;
  interpretation: string;
}

/** Standard+: 등급 변화 가능성 */
interface GradeChangeAnalysis {
  currentTrend: "상승" | "유지" | "하락";
  prediction: string;
  actionItems: string[];
  actionItemPriorities?: Priority[];
}

/** Premium: 5등급제 전환 시뮬레이션 */
interface FiveGradeSimulation {
  subject: string;
  currentGrade: number;
  simulatedGrade: number;
  interpretation: string;
  percentileCumulative?: number;
}

/** Premium: 대학별 반영 방법 시뮬레이션 */
interface UniversityGradeSimulation {
  university: string;
  department: string;
  reflectionMethod: string;
  calculatedScore: number;
  interpretation: string;
}

/** Standard+: 소인수 과목 분석 */
interface SmallClassSubjectAnalysis {
  subject: string;
  enrollmentSize: number;
  achievementLevel: string;
  grade?: string;
  interpretation: string;
}

export interface AcademicAnalysisSection extends BaseSection {
  sectionId: "academicAnalysis";

  // Lite
  overallAverageGrade: number;
  gradesByYear: GradeSummaryByYear[];
  subjectCombinations: SubjectCombinationAverage[];
  gradeTrend: "상승" | "유지" | "하락";
  subjectGrades: SubjectGradeItem[];
  interpretation: string;

  // Standard+
  subjectStatAnalyses?: SubjectStatAnalysis[];
  gradeDeviationAnalysis?: GradeDeviationAnalysis;
  majorRelevanceAnalysis?: MajorRelevanceAnalysis;
  schoolTypeAdjustment?: string;
  gradeChangeAnalysis?: GradeChangeAnalysis;
  careerSubjectAnalyses?: CareerSubjectAnalysis[];
  smallClassSubjectAnalyses?: SmallClassSubjectAnalysis[];
  gradeInflationContext?: string;

  // Premium
  fiveGradeSimulation?: FiveGradeSimulation[];
  universityGradeSimulations?: UniversityGradeSimulation[];
  improvementPriority?: string[];

  // ─── v4 추가 ───

  /** 상세 성적 테이블 */
  detailedGradeTable?: {
    subject: string;
    year: number;
    semester: number;
    unitCount: number;
    rawScore: number;
    classAverage: number;
    stdDev: number;
    achievementLevel: string;
    studentCount: number;
    grade: number;
  }[];
  /** 과목 조합별 트렌드 */
  combinationTrends?: {
    combination: string;
    trendData: { year: number; semester: number; avg: number }[];
    trend: "상승" | "유지" | "하락";
  }[];
  /** 과목별 등급 변화 추이 */
  subjectTrends?: {
    subject: string;
    dataPoints: { year: number; semester: number; grade: number }[];
  }[];
  /** 과목별 벤치마크 비교 */
  subjectBenchmarks?: {
    subject: string;
    myGrade: number;
    estimatedTargetAvg: number;
    estimatedOverallAvg: number;
  }[];
  /** 성적 강점 */
  gradeStrengths?: string[];
  /** 성적 약점 */
  gradeWeaknesses?: string[];
  /** 캐릭터 라벨 */
  characterLabel?: CharacterLabel;
}

// ─── 섹션 7: 권장과목 이수 분석 (courseAlignment) ───

interface CourseMatchDetail {
  course: string;
  status: "이수" | "미이수";
  importance: "필수" | "권장";
}

export interface CourseAlignmentSection extends BaseSection {
  sectionId: "courseAlignment";

  /** 목표 계열 */
  targetMajor: string;
  /** 권장과목 이수율 (0~100) */
  matchRate: number;
  /** 이수/미이수 상세 */
  courses: CourseMatchDetail[];
  /** 미이수 과목에 대한 영향 분석 */
  missingCourseImpact: string;
  /** 이수 전략 제안 (고1~2 해당 시) */
  recommendation?: string;

  /** Standard+: 메디컬 계열 대학별 요구사항 매칭 */
  medicalRequirements?: {
    university: string;
    department: string;
    met: boolean;
    details: string;
  }[];

  // ─── v4 추가 ───

  /** 이수율 벤치마크 비교 */
  matchRateComparison?: BenchmarkComparison;
  /** 필수과목 이수율 */
  requiredMatchRate?: number;
  /** 권장과목 이수율 */
  recommendedMatchRate?: number;
  /** 미이수 과목 영향 점수 (0~100) */
  missingCourseImpactScore?: number;
  /** 과목별 액션 플랜 */
  courseActionPlan?: {
    course: string;
    priority: Priority;
    actionItem: string;
    expectedImpact: string;
  }[];
}

// ─── 섹션 8: 출결 분석 (attendanceAnalysis) ───

interface AttendanceSummary {
  year: number;
  totalDays?: number;
  note?: string;
  totalAbsence: number;
  illness: number;
  unauthorized: number;
  etc: number;
  lateness: number;
  earlyLeave: number;
}

export interface AttendanceAnalysisSection extends BaseSection {
  sectionId: "attendanceAnalysis";

  /** 학년별 출결 요약 */
  summaryByYear: AttendanceSummary[];
  /** 전체 평가 (우수/양호/주의/경고) */
  overallRating: "우수" | "양호" | "주의" | "경고";
  /** 출결이 입시에 미치는 영향 */
  impactAnalysis: string;
  /** 성실성 점수 기여도 */
  integrityContribution: string;

  /** Standard+: 개선 방향 (주의/경고일 때) */
  improvementAdvice?: string;

  // ─── v4 추가 ───

  /** 출결 벤치마크 비교 */
  comparisonData?: BenchmarkComparison;
  /** 성실성 점수 (0~100) */
  integrityScore?: number;
  /** 추정 감점 */
  estimatedDeduction?: {
    deductionPoints: number;
    rationale: string;
  };
}

// ─── 섹션 9: 창체 활동 분석 (activityAnalysis) ───

interface ActivityTypeAnalysis {
  /** 활동 영역명 (자율·자치 / 동아리 / 진로) */
  type: string;
  /** 학년별 분석 */
  yearlyAnalysis: {
    year: number;
    summary: string;
    rating: SubjectRating;
    competencyTags: CompetencyTag[];
    ratingRationale?: string;
  }[];
  /** 영역 종합 코멘트 */
  overallComment: string;
  /** 기록 분량 평가 */
  volumeAssessment?: string;

  /** 기재율 (전체/개인기록) */
  fillRate?: { total: number; personal: number };
  /** 학년별 상세 분석 */
  yearlyDetails?: {
    grade: number;
    summary: string;
    keyActivities: string[];
    evaluation: string;
  }[];

  /** Standard+: 핵심 활동 상세 */
  keyActivities?: {
    activity: string;
    evaluation: string;
    competencyTags: CompetencyTag[];
  }[];
  /** Standard+: 개선 방향 */
  improvementDirection?: string;

  // ─── v4 추가 ───

  /** 3단계 티어 평가 (우수/양호/보완필요별 항목 + 인용) */
  tieredAssessment?: {
    excellent: {
      items: string[];
      quotes: OriginalTextCitation[];
    };
    good: {
      items: string[];
      quotes: OriginalTextCitation[];
    };
    needsImprovement: {
      items: string[];
      quotes: OriginalTextCitation[];
      improvementTable: {
        area: string;
        currentState: string;
        suggestion: string;
      }[];
    };
  };
  /** 기재 분량 분석 */
  volumeMetric?: VolumeMetric;
  /** 캐릭터 라벨 */
  characterLabel?: CharacterLabel;
  /** 활동 수준 벤치마크 비교 */
  activityLevelComparison?: BenchmarkComparison;
}

export interface ActivityAnalysisSection extends BaseSection {
  sectionId: "activityAnalysis";

  /** 교육과정 버전 (2015: 4영역 / 2022: 3영역) */
  curriculumVersion: "2015" | "2022";
  /** 활동 영역별 분석 */
  activities: ActivityTypeAnalysis[];
  /** 창체 종합 평가 */
  overallComment: string;

  /** 리더십 정량 분석 */
  leadershipQuantitative?: LeadershipQuantitative;
}

// ─── 섹션 10: 교과 세특 분석 (subjectAnalysis) ───

/** 문장 단위 분석 (Premium 전용) */
interface SentenceAnalysis {
  sentence: string;
  evaluation: string;
  competencyTags: CompetencyTag[];
  highlight: "positive" | "negative" | "neutral";
  improvementSuggestion?: string;
}

/** 교과 간 연결성 (Standard+) */
interface CrossSubjectConnection {
  targetSubject: string;
  connectionType: "주제연결" | "역량연결" | "중복";
  description: string;
}

export interface SubjectAnalysisItem {
  subjectName: string;
  year: number;
  rating: SubjectRating;
  competencyTags: CompetencyTag[];

  /** 핵심 활동 요약 (2~3줄) */
  activitySummary: string;
  /** 평가 코멘트 (3~4줄) */
  evaluationComment: string;

  /** Standard+: 원문 핵심 인용 (2~3개) */
  keyQuotes?: string[];
  /** Standard+: 상세 평가 (5~8줄) */
  detailedEvaluation?: string;
  /** Standard+: 개선 방향 (2~3줄) */
  improvementDirection?: string;
  /** Standard+: 개선 예시 문장 */
  improvementExample?: string;
  /** Standard+: 교과 간 연결성 */
  crossSubjectConnections?: CrossSubjectConnection[];

  /** Premium: 문장 단위 분석 */
  sentenceAnalysis?: SentenceAnalysis[];
  /** Premium: 중요도 퍼센트 (0~100) */
  importancePercent?: number;
  /** Premium: 평가 영향도 */
  evaluationImpact?: EvaluationImpact;

  // ─── v4 추가 ───

  /** 3단계 평가 */
  tierRating?: ThreeTierRating;
  /** 역량 매트릭스 */
  competencyMatrix?: {
    dimension: string;
    rating: ThreeTierRating;
    evidence?: string;
  }[];
  /** 원문 인용 분석 */
  citationAnalysis?: OriginalTextCitation[];
  /** 기재 분량 분석 */
  volumeMetric?: VolumeMetric;
}

export interface SubjectAnalysisSection extends BaseSection {
  sectionId: "subjectAnalysis";
  /** 교과 세특만 포함 (창체는 activityAnalysis에서 분석) */
  subjects: SubjectAnalysisItem[];

  // ─── v4 추가 ───

  /** 과목군별 역량 매트릭스 */
  subjectGroupMatrix?: SubjectGroupMatrix[];

  /** 요약 대시보드 */
  summaryDashboard?: {
    totalSubjects: number;
    excellentCount: number;
    goodCount: number;
    averageCount: number;
    weakCount: number;
    overallQualityScore: number;
  };
  /** 캐릭터 라벨 */
  characterLabel?: CharacterLabel;
}

// ─── 섹션 11: 행동특성 분석 (behaviorAnalysis) ───

interface BehaviorYearAnalysis {
  year: number;
  /** 핵심 서술 요약 */
  summary: string;
  /** 드러나는 역량 태그 */
  competencyTags: CompetencyTag[];
  /** Standard+: 원문 핵심 인용 */
  keyQuotes?: string[];
}

export interface BehaviorAnalysisSection extends BaseSection {
  sectionId: "behaviorAnalysis";

  /** 학년별 분석 */
  yearlyAnalysis: BehaviorYearAnalysis[];
  /** 일관되게 등장하는 특성 */
  consistentTraits: string[];
  /** 종합 평가 */
  overallComment: string;
  /** 입시에서의 활용 포인트 */
  admissionRelevance: string;

  // ─── v4 추가 ───

  /** 캐릭터 라벨 */
  characterLabel?: CharacterLabel;
  /** 원문 인용 분석 */
  citationAnalysis?: OriginalTextCitation[];
  /** 인성 점수 (0~100) */
  personalityScore?: number;
  /** 인성 벤치마크 비교 */
  personalityComparison?: BenchmarkComparison;
  /** 인성 키워드 */
  personalityKeywords?: string[];
}

// ─── 섹션 12: 기록 충실도 종합 (overallAssessment) ───

interface RecordVolumeItem {
  category: string;
  maxCapacity: string;
  actualVolume: string;
  fillRate: number;
  assessment: string;
}

export interface OverallAssessmentSection extends BaseSection {
  sectionId: "overallAssessment";

  /** 항목별 기록 분량 분석 */
  volumeAnalysis: RecordVolumeItem[];
  /** 전체 기록 충실도 (0~100) */
  overallFillRate: number;
  /** 분량 대비 질 평가 */
  qualityAssessment: string;
  /** 경쟁력 종합 요약 (학업/진로/공동체/발전가능성 각 한줄) */
  competitivenessSum: string;
  /** 최종 종합 의견 */
  finalComment: string;

  // ─── v4 추가 ───

  /** 기록 충실도 벤치마크 비교 */
  fillRateComparison?: BenchmarkComparison;
  /** 역량별 진행 바 */
  competencyProgressBars?: {
    category: string;
    label: string;
    score: number;
    maxScore: number;
    assessment: ThreeTierRating;
  }[];
  /** 전체 경쟁력 점수 (0~100) */
  overallCompetitivenessScore?: number;
  /** 영역별 등급 */
  areaGrades?: {
    area: string;
    grade: CompetencyGrade;
    summary: string;
  }[];
}

// ============================================================
// Part 3: 전략
// ============================================================

// ─── 섹션 13: 부족한 부분 + 보완 전략 (weaknessAnalysis) ───

interface WeaknessArea {
  area: string;
  description: string;
  suggestedActivities: string[];

  /** Standard+: 상세 근거 */
  evidence?: string;
  /** Standard+: 역량 매핑 */
  competencyTag?: CompetencyTag;
  /** Standard+: 보완 우선순위 */
  priority?: Priority;

  /** Premium: 시급도 */
  urgency?: Priority;
  /** Premium: 효과도 */
  effectiveness?: Priority;
  /** Premium: 실행 전략 */
  executionStrategy?: string;
  /** Premium: 진로-선택과목 연계 전략 */
  subjectLinkStrategy?: string;

  // ─── v4 추가 ───

  /** 생기부 항목 출처 (예: "세특_국어", "동아리활동") */
  recordSource?: string;
  /** 상세 보완 전략 (200-300자) */
  detailedStrategy?: string;
  /** 구체적 실행 항목 3-5개 */
  actionItems?: string[];

  /** 3단계 평가 */
  tierRating?: ThreeTierRating;
  /** 개선 테이블 */
  improvementTable?: {
    currentState: string;
    targetState: string;
    specificAction: string;
    timeline: string;
    expectedOutcome: string;
  };
  /** 관련 과목 */
  relatedSubjects?: string[];
  /** 예상 점수 영향 */
  expectedScoreImpact?: {
    category: string;
    currentScore: number;
    projectedScore: number;
  };
}

export interface WeaknessAnalysisSection extends BaseSection {
  sectionId: "weaknessAnalysis";
  /** Lite: 3개, Standard: 5개, Premium: 5개+ */
  areas: WeaknessArea[];

  // ─── v4 추가 ───

  /** 티어 요약 (우수/양호/보완필요 개수) */
  tierSummary?: {
    excellent: number;
    good: number;
    needsImprovement: number;
  };
}

// ─── 섹션 14: 세특 주제 추천 (topicRecommendation) ───

/** Premium: 활동 설계 */
interface ActivityDesign {
  steps: string[];
  duration: string;
  expectedResult: string;
}

export interface TopicRecommendationItem {
  topic: string;
  relatedSubjects: string[];
  description: string;

  /** Standard+: 주제 선정 이유 */
  rationale?: string;
  /** Standard+: 기존 탐구와의 연결 */
  existingConnection?: string;

  /** Premium: 활동 설계 */
  activityDesign?: ActivityDesign;
  /** Premium: 세특 서술 예시 */
  sampleEvaluation?: string;

  // ─── v4 추가 ───

  /** 키워드 제안 */
  keywordSuggestions?: string[];
  /** 난이도 */
  difficulty?: "기본" | "심화" | "도전";
  /** 예상 소요 기간 */
  estimatedDuration?: string;
  /** 시너지 점수 (0~100) */
  synergyScore?: number;
  /** 중요도 */
  importance?: Priority;
}

export interface TopicRecommendationSection extends BaseSection {
  sectionId: "topicRecommendation";
  /** Lite: 3개, Standard: 5개, Premium: 5개 */
  topics: TopicRecommendationItem[];

  // ─── v4 추가 ───

  /** 과목별 키워드 테이블 */
  subjectKeywordTable?: {
    subject: string;
    keywords: string[];
    topicCount: number;
  }[];
}

// ─── 섹션 15: 예상 면접 질문 (interviewPrep) ───

type InterviewQuestionType = "세특기반" | "성적기반" | "진로기반" | "인성기반";

interface FollowUpQuestion {
  question: string;
  context: string;
}

export interface InterviewQuestion {
  question: string;

  /** Standard+: 질문 유형 */
  questionType?: InterviewQuestionType;
  /** Standard+: 출제 의도 (1~2줄) */
  intent?: string;

  /** Premium: 답변 전략 + 핵심 포인트 */
  answerStrategy?: string;
  /** Premium: 모범 답변 가이드 */
  sampleAnswer?: string;
  /** Premium: 꼬리질문 1~2개 */
  followUpQuestions?: FollowUpQuestion[];

  // ─── v4 추가 ───

  /** 난이도 */
  difficulty?: "상" | "중" | "하";
  /** 출제 빈도 */
  frequency?: "높음" | "보통" | "낮음";
  /** 관련 원문 인용 */
  relatedCitation?: OriginalTextCitation;
  /** 답변 핵심 키워드 */
  answerKeywords?: string[];
  /** 중요도 */
  importance?: Priority;
}

export interface InterviewPrepSection extends BaseSection {
  sectionId: "interviewPrep";
  /** Standard: 최대 20개, Premium: 30개 */
  questions: InterviewQuestion[];

  // ─── v4 추가 ───

  /** 질문 유형별 분포 */
  questionDistribution?: {
    type: string;
    count: number;
  }[];
  /** 면접 준비 점수 (0~100) */
  readinessScore?: number;
}

// ─── 섹션 16: 입시 전략 + 대학 추천 (admissionStrategy) ───

interface UniversityRecommendation {
  university: string;
  department: string;
  admissionType: string;
  tier: AdmissionTier;

  /** Standard+: 합격 가능성 */
  chance?: AdmissionChance;
  /** Standard+: 합격 가능성 근거 (AI 생성) */
  chanceRationale?: string;
  /** Standard+: 입시 데이터 (코드에서 정적 데이터로 주입) */
  admissionData?: {
    cutoff50?: number;
    cutoff70?: number;
    competitionRate?: number;
    enrollment?: number;
  };
  /** 합격 가능성 퍼센트 라벨 (예: "60~70%") */
  chancePercentLabel?: string;
}

/** Standard+: 전형별 전략 */
interface AdmissionTypeStrategy {
  type: "학종" | "교과" | "정시";
  analysis: string;
  suitability: "적합" | "보통" | "부적합";
  reason: string;
}

/** Standard+: 학교 유형 분석 */
interface SchoolTypeAnalysis {
  cautionTypes: string[];
  advantageTypes: string[];
  rationale: string;
}

/** Premium: 지원 조합 시뮬레이션 */
interface ApplicationSimulation {
  description: string;
  details: {
    admissionType: string;
    count: number;
    targetUniversities: string[];
  }[];
}

export interface AdmissionStrategySection extends BaseSection {
  sectionId: "admissionStrategy";

  // Lite
  recommendedPath: string;
  recommendations: UniversityRecommendation[];

  // Standard+
  typeStrategies?: AdmissionTypeStrategy[];
  schoolTypeAnalysis?: SchoolTypeAnalysis;

  // Premium
  csatMinimumStrategy?: string;
  applicationSimulation?: ApplicationSimulation;
  universityGuideMatching?: {
    university: string;
    emphasisKeywords: string[];
    studentStrengthMatch: string[];
    studentWeaknessMatch: string[];
  }[];

  // ─── v4 추가 ───

  /** 대학별 리스크 밴드 */
  universityRiskBands?: {
    university: string;
    department: string;
    band: AdmissionRiskBand;
    rationale: string;
  }[];
  /** 전형별 적합도 차트 */
  typeSuitabilityChart?: {
    type: string;
    score: number;
    keyStrengths: string[];
    keyRisks: string[];
  }[];
  /** 전략 매트릭스 (상향/안정/하향별 추천) */
  strategyMatrix?: {
    tier: AdmissionTier;
    recommendations: {
      university: string;
      department: string;
      type: string;
      band: AdmissionRiskBand;
    }[];
  }[];
  /** 티어 그룹별 추천 */
  tierGroupedRecommendations?: {
    tierGroup: "상향 위주" | "안정 위주" | "하향 위주";
    recommendations: UniversityRecommendation[];
  }[];
  /** 다음 학기 전략 */
  nextSemesterStrategy?: string;
}

/** 고1 전용: 방향 설정 가이드 (admissionStrategy 대체) */
export interface DirectionGuideSection extends BaseSection {
  sectionId: "directionGuide";
  recommendedTracks: string[];
  subjectSelectionGuide: string[];
  preparationAdvice: string;
}

// ─── 섹션 17: 생기부 스토리 구조 분석 (storyAnalysis) ───

interface YearProgression {
  year: number;
  theme: string;
  description: string;
}

interface CrossSubjectLink {
  from: string;
  to: string;
  topic: string;
  depth: "심화" | "반복" | "확장" | "무관";
}

export interface StoryAnalysisSection extends BaseSection {
  sectionId: "storyAnalysis";

  // Standard (기본)
  /** 메인 스토리라인 (3~5줄) */
  mainStoryline: string;
  /** 학년별 심화 흐름 */
  yearProgressions: YearProgression[];
  /** 진로 일관성 등급 */
  careerConsistencyGrade: CompetencyGrade;
  /** 일관성 분석 코멘트 */
  careerConsistencyComment: string;

  // Premium (확장)
  /** Premium: 과목 간 연결 그래프 */
  crossSubjectLinks?: CrossSubjectLink[];
  /** Premium: 스토리 강화 제안 */
  storyEnhancementSuggestions?: string[];
  /** Premium: 면접 스토리텔링 가이드 */
  interviewStoryGuide?: string;

  // ─── v4 추가 ───

  /** 타임라인 */
  timeline?: {
    year: number;
    semester: number;
    events: {
      category: string;
      title: string;
      competencyTags: CompetencyTag[];
    }[];
  }[];
  /** 스토리 완성도 점수 (0~100) */
  storyCompletenessScore?: number;
  /** 스토리 갭 분석 */
  storyGaps?: {
    gap: string;
    suggestion: string;
    priority: Priority;
  }[];
  /** 캐릭터 라벨 */
  characterLabel?: CharacterLabel;
}

// ─── 섹션 18: 실행 로드맵 (actionRoadmap) ───

interface RoadmapPhase {
  phase: string;
  period: string;
  goals: string[];
  tasks: string[];
}

interface EvaluationWritingGuide {
  structure: string[];
  goodExample: string;
  badExample: string;
}

export interface ActionRoadmapSection extends BaseSection {
  sectionId: "actionRoadmap";

  // Standard (간략)
  /** 생기부 마무리 전략 */
  completionStrategy: string;
  /** 학기별 실행 계획 */
  phases: RoadmapPhase[];

  // Premium (확장)
  /** Premium: 방학 중 사전 준비 보고서/활동 */
  prewriteProposals?: string[];
  /** Premium: 세특 서술 전략 가이드 */
  evaluationWritingGuide?: EvaluationWritingGuide;
  /** Premium: 면접 대비 타임라인 */
  interviewTimeline?: string;

  // ─── v4 추가 ───

  /** 마일스톤 */
  milestones?: {
    id: string;
    title: string;
    deadline: string;
    category: string;
    priority: Priority;
    subtasks: string[];
    estimatedImpact: string;
  }[];
  /** 주간 계획 (Premium) */
  weeklyPlan?: {
    week: number;
    focusArea: string;
    tasks: string[];
  }[];
  /** 예상 결과 */
  projectedOutcome?: {
    category: string;
    currentScore: number;
    projectedScore: number;
  }[];
}

// ============================================================
// 부록
// ============================================================

// ─── 섹션 19: 추천 도서 (bookRecommendation) ───

interface BookItem {
  title: string;
  author: string;
  /** 추천 이유 */
  reason: string;
  /** 학생의 기존 활동과의 연결 */
  connectionToRecord: string;
  /** 관련 과목/영역 */
  relatedSubject?: string;
}

export interface BookRecommendationSection extends BaseSection {
  sectionId: "bookRecommendation";
  /** Standard: 3~5권, Premium: 5~8권 */
  books: BookItem[];
}

// ─── 섹션 20: AI 전공 추천 (majorExploration) ───

interface MajorSuggestion {
  major: string;
  university?: string;
  /** 적합도 (0~100) */
  fitScore: number;
  /** 추천 근거 */
  rationale: string;
  /** 학생의 강점과의 매칭 */
  strengthMatch: string[];
  /** 보완 필요 사항 */
  gapAnalysis?: string;

  // ─── v4 추가 ───

  /** 적합도 벤치마크 비교 */
  fitComparison?: BenchmarkComparison;
  /** 관련 교과 성취도 */
  relatedGradePerformance?: {
    subject: string;
    grade: number;
    assessment: ThreeTierRating;
  }[];
}

export interface MajorExplorationSection extends BaseSection {
  sectionId: "majorExploration";
  /** 현재 목표 학과 평가 */
  currentTargetAssessment?: string;
  /** AI 추천 전공 (3~5개) */
  suggestions: MajorSuggestion[];
}

// ─── 섹션 21: 워드 클라우드 (wordCloud) ───

interface WordCloudItem {
  text: string;
  frequency: number;
  category?: CompetencyCategory;
}

export interface WordCloudSection extends BaseSection {
  sectionId: "wordCloud";
  /** 상위 키워드 (20~50개) */
  words: WordCloudItem[];
}

// ============================================================
// 섹션 유니온 타입
// ============================================================

/** 모든 가능한 섹션 유니온 */
export type ReportSection =
  // Part 1: 진단
  | StudentProfileSection
  | CompetencyScoreSection
  | AdmissionPredictionSection
  | DiagnosticSection
  // Part 2: 분석
  | CompetencyEvaluationSection
  | AcademicAnalysisSection
  | CourseAlignmentSection
  | AttendanceAnalysisSection
  | ActivityAnalysisSection
  | SubjectAnalysisSection
  | BehaviorAnalysisSection
  | OverallAssessmentSection
  // Part 3: 전략
  | WeaknessAnalysisSection
  | TopicRecommendationSection
  | InterviewPrepSection
  | AdmissionStrategySection
  | DirectionGuideSection
  | StoryAnalysisSection
  | ActionRoadmapSection
  // 부록
  | BookRecommendationSection
  | MajorExplorationSection
  | WordCloudSection;

// ============================================================
// 섹션 ID 매핑
// ============================================================

type LiteSectionId =
  // Part 1: 진단
  | "studentProfile"
  | "competencyScore"
  // Part 2: 분석
  | "academicAnalysis"
  | "activityAnalysis"
  | "subjectAnalysis"
  // Part 3: 전략
  | "weaknessAnalysis"
  | "topicRecommendation"
  | "interviewPrep"
  | "admissionStrategy";

type StandardSectionId =
  | LiteSectionId
  // Part 1 추가
  | "admissionPrediction"
  // Part 2 추가
  | "courseAlignment"
  | "attendanceAnalysis"
  | "behaviorAnalysis";

type PremiumSectionId =
  | StandardSectionId
  // Part 2 추가
  | "overallAssessment"
  // Part 3 추가
  | "storyAnalysis"
  | "actionRoadmap"
  // 부록 추가
  | "bookRecommendation"
  | "majorExploration";

/** 플랜별 가능한 섹션 ID 매핑 */
export type RequiredSectionIds = {
  lite: LiteSectionId;
  standard: StandardSectionId;
  premium: PremiumSectionId;
};

// ============================================================
// 메인 리포트 콘텐츠 타입
// ============================================================

export interface StudentInfo {
  name: string;
  grade: number;
  track: "문과" | "이과" | "예체능" | "통합";
  schoolType:
    | "일반고"
    | "특목고"
    | "자율고"
    | "특성화고"
    | "영재학교"
    | "과학고"
    | "외국어고"
    | "국제고"
    | "예술고"
    | "체육고"
    | "마이스터고";
  targetUniversity?: string;
  targetDepartment?: string;
  hasMockExamData: boolean;
}

export interface ReportMeta {
  reportId: string;
  plan: ReportPlan;
  studentInfo: StudentInfo;
  createdAt: string;
  version: number;
}

/** DB에 JSONB로 저장되는 리포트 콘텐츠 */
export interface ReportContent {
  meta: ReportMeta;
  sections: ReportSection[];
}

// ============================================================
// 플랜별 타입 헬퍼
// ============================================================

/** 섹션 배열에서 특정 섹션 타입 추출 */
export type ExtractSection<
  T extends ReportSection,
  Id extends string,
> = T extends { sectionId: Id } ? T : never;

/** 플랜별 섹션 순서 (조건부 섹션은 런타임에서 판단) */
export const SECTION_ORDER: Record<ReportPlan, string[]> = {
  lite: [
    // Part 1: 진단
    "studentProfile",
    "competencyScore",
    "diagnostic",
    "competencyEvaluation",
    // Part 2: 분석
    "academicAnalysis",
    "activityAnalysis",
    "subjectAnalysis",
    // Part 3: 전략
    "weaknessAnalysis",
    "topicRecommendation",
    "admissionStrategy",
    // 부록
    "interviewPrep",
  ],
  standard: [
    // Part 1: 진단
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    // Part 2: 분석
    "academicAnalysis",
    "courseAlignment",
    "attendanceAnalysis",
    "activityAnalysis",
    "subjectAnalysis",
    "behaviorAnalysis",
    // Part 3: 전략
    "weaknessAnalysis",
    "topicRecommendation",
    "admissionStrategy",
    // 부록
    "interviewPrep",
  ],
  premium: [
    // Part 1: 진단
    "studentProfile", // diagnostic 통합
    "competencyScore", // competencyEvaluation 통합
    "admissionPrediction", // Premium만 별도 유지
    // Part 2: 분석
    "academicAnalysis",
    "courseAlignment",
    "attendanceAnalysis",
    "activityAnalysis",
    "subjectAnalysis",
    "behaviorAnalysis",
    // Part 3: 전략
    "weaknessAnalysis",
    "topicRecommendation",
    "admissionStrategy",
    "storyAnalysis",
    "actionRoadmap",
    // 부록
    "interviewPrep",
    "bookRecommendation",
    "majorExploration",
  ],
};
