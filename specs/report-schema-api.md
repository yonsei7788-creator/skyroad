# 리포트 출력 스키마 및 API 구조 설계

> **문서 버전**: v2.0
> **작성일**: 2026-03-03
> **상태**: Draft
> **기반 자료**: specs/report-ai-spec.md, libs/report/types.ts (v3), require/record-data-spec.md, PRD

---

## 1. 설계 개요

### 1.1 변경 사유

v1의 10섹션 구조를 폐기하고, 3파트 + 부록 총 21섹션 구조(v3)로 재설계한다.

**주요 변경점:**

- **Part 1 진단 (4섹션 신설)**: `studentProfile`, `competencyScore`, `admissionPrediction`, `diagnostic`
- **Part 2 분석 (8섹션)**: `competencyEvaluation`, `academicAnalysis`, `courseAlignment`(신규), `attendanceAnalysis`(신규), `activityAnalysis`(신규), `subjectAnalysis`, `behaviorAnalysis`(신규), `overallAssessment`(신규)
- **Part 3 전략 (6섹션)**: `weaknessAnalysis`, `topicRecommendation`, `interviewPrep`, `admissionStrategy`, `storyAnalysis`, `actionRoadmap`
- **부록 (3섹션 신설)**: `bookRecommendation`, `majorExploration`, `wordCloud`
- `competencyRatings`가 모든 플랜에서 필수 (기존 Standard+ optional -> 전 플랜 required)
- `subjectAnalysis`에서 `category` 필드 제거 (교과 세특만 분석, 창체는 `activityAnalysis`로 분리)
- `storyAnalysis`, `actionRoadmap`이 Standard부터 포함 (기존 Premium 전용 -> Standard+)
- `interviewPrep`은 Standard+ 전용 (Lite에서 제외)
- `schoolType`에서 `"자사고"` -> `"자율고"` 변경

### 1.2 플랜별 섹션 구성

| 플랜     | 섹션 수 | 포함 섹션                                                                                                                                                                        |
| -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lite     | 14      | Part 1 전체 + Part 2에서 behaviorAnalysis/overallAssessment 제외 + Part 3에서 interviewPrep/storyAnalysis/actionRoadmap 제외 + 부록에서 bookRecommendation/majorExploration 제외 |
| Standard | 21      | 전체 21섹션                                                                                                                                                                      |
| Premium  | 21      | 전체 21섹션 + 각 섹션 내 Premium 전용 필드 포함                                                                                                                                  |

### 1.3 설계 원칙

1. **플랜별 누적 구조**: Lite가 베이스, Standard는 Lite 확장, Premium은 Standard 확장
2. **Optional 필드로 플랜 차등**: 동일 인터페이스에서 optional 필드로 Standard/Premium 전용 데이터 표현
3. **AI 출력 검증**: 모든 타입에 대응하는 Zod 스키마로 AI 출력을 런타임 검증
4. **섹션 독립성**: 각 섹션은 독립적으로 생성/검증 가능 (AI 파이프라인에서 섹션별 생성 지원)

---

## 2. TypeScript 출력 스키마 (libs/report/types.ts)

### 2.1 공통 타입

```typescript
// ============================================================
// 플랜 & 공통 타입
// ============================================================

export type ReportPlan = "lite" | "standard" | "premium";

/** 역량 등급 (5단계) */
export type CompetencyGrade = "S" | "A" | "B" | "C" | "D";

/** 세특 평가 등급 */
export type SubjectRating = "excellent" | "good" | "average" | "weak";

/** 평가 영향도 */
export type EvaluationImpact = "high" | "medium" | "low";

/** 합격 가능성 */
export type AdmissionChance = "high" | "medium" | "low";

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

/** 모든 섹션이 공유하는 기본 필드 */
interface BaseSection {
  sectionId: string;
  title: string;
}
```

### 2.1.1 추가 공통 타입

```typescript
/** 교과군별 성적 매트릭스 (성적 분석 시 교과군 단위 비교에 사용) */
interface SubjectGroupMatrix {
  /** 교과군명 (예: "국어", "수학", "영어", "사회", "과학") */
  group: string;
  /** 학년별 평균 등급 */
  yearlyAverage: {
    year: number;
    average: number;
    subjectCount: number;
  }[];
  /** 전공 관련 교과군 여부 */
  isCareerRelated: boolean;
  /** 교과군 내 등급 편차 */
  gradeDeviation: number;
  /** 교과군 종합 평가 */
  assessment: string;
}

/** 리더십 정량 지표 (공동체역량 평가에 사용) */
interface LeadershipQuantitative {
  /** 임원/리더 역할 횟수 */
  leadershipRoleCount: number;
  /** 역할 목록 */
  roles: {
    year: number;
    role: string;
    context: string;
  }[];
  /** 협업 활동 언급 빈도 */
  collaborationMentionCount: number;
  /** 나눔/배려 사례 수 */
  caringSampleCount: number;
  /** 리더십 성장 추이 */
  growthTrend: "상승" | "유지" | "하강";
  /** 종합 평가 */
  assessment: string;
}
```

### 2.2 Part 1: 진단

#### 섹션 1: 학생 프로필 (studentProfile)

```typescript
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
}
```

#### 섹션 2: 역량 정량 스코어 (competencyScore)

```typescript
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
}
```

#### 섹션 3: 합격 예측 (admissionPrediction)

```typescript
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
}
```

#### 섹션 4: 종합 진단 (diagnostic)

```typescript
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
}
```

### 2.3 Part 2: 분석

#### 섹션 5: 역량별 종합 평가 (competencyEvaluation)

```typescript
interface StrengthWeaknessItem {
  competencyTag: CompetencyTag;
  label: string;
  evidence: string;
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

  /** 4대 역량별 등급 (모든 플랜 필수) */
  competencyRatings: CompetencyRating[];
}
```

#### 섹션 6: 성적 분석 (academicAnalysis)

```typescript
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
}

/** Premium: 5등급제 전환 시뮬레이션 */
interface FiveGradeSimulation {
  subject: string;
  currentGrade: number;
  simulatedGrade: number;
  interpretation: string;
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
}
```

#### 섹션 7: 권장과목 이수 분석 (courseAlignment)

```typescript
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
}
```

#### 섹션 8: 출결 분석 (attendanceAnalysis)

```typescript
interface AttendanceSummary {
  year: number;
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
}
```

#### 섹션 9: 창체 활동 분석 (activityAnalysis)

```typescript
interface ActivityTypeAnalysis {
  /** 활동 영역명 (자율·자치 / 동아리 / 진로) */
  type: string;
  /** 학년별 분석 */
  yearlyAnalysis: {
    year: number;
    summary: string;
    rating: SubjectRating;
    competencyTags: CompetencyTag[];
  }[];
  /** 영역 종합 코멘트 */
  overallComment: string;
  /** 기록 분량 평가 */
  volumeAssessment?: string;

  /** Standard+: 핵심 활동 상세 */
  keyActivities?: {
    activity: string;
    evaluation: string;
    competencyTags: CompetencyTag[];
  }[];
  /** Standard+: 개선 방향 */
  improvementDirection?: string;

  /** Premium: 기록 충실도 (최대 기재 분량 대비 실제 기록 비율) */
  fillRate?: {
    maxCapacity: number;
    actualLength: number;
    percentage: number;
    assessment: "충실" | "보통" | "부족";
  };
  /** Premium: 학년별 상세 분석 */
  yearlyDetails?: {
    year: number;
    detailedAnalysis: string;
    strengthPoints: string[];
    improvementPoints: string[];
    competencyTags: CompetencyTag[];
  }[];
}

export interface ActivityAnalysisSection extends BaseSection {
  sectionId: "activityAnalysis";

  /** 교육과정 버전 (2015: 4영역 / 2022: 3영역) */
  curriculumVersion: "2015" | "2022";
  /** 활동 영역별 분석 */
  activities: ActivityTypeAnalysis[];
  /** 창체 종합 평가 */
  overallComment: string;
}
```

#### 섹션 10: 교과 세특 분석 (subjectAnalysis)

```typescript
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
}

export interface SubjectAnalysisSection extends BaseSection {
  sectionId: "subjectAnalysis";
  /** 교과 세특만 포함 (창체는 activityAnalysis에서 분석) */
  subjects: SubjectAnalysisItem[];
}
```

#### 섹션 11: 행동특성 분석 (behaviorAnalysis)

```typescript
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
}
```

#### 섹션 12: 기록 충실도 종합 (overallAssessment)

```typescript
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
}
```

### 2.4 Part 3: 전략

#### 섹션 13: 부족한 부분 + 보완 전략 (weaknessAnalysis)

```typescript
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

  /** Premium: 근거 출처 (생기부 원문 참조) */
  recordSource?: {
    section: string;
    subject?: string;
    year: number;
    quote: string;
  };
  /** Premium: 구체적 보완 전략 (350자+) */
  detailedStrategy?: string;
  /** Premium: 실행 항목 리스트 (3-5개) */
  actionItems?: {
    action: string;
    timeline: string;
    expectedOutcome: string;
  }[];
}

export interface WeaknessAnalysisSection extends BaseSection {
  sectionId: "weaknessAnalysis";
  /** Lite: 3개, Standard: 5개, Premium: 5개+ */
  areas: WeaknessArea[];
}
```

#### 섹션 14: 세특 주제 추천 (topicRecommendation)

```typescript
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
}

export interface TopicRecommendationSection extends BaseSection {
  sectionId: "topicRecommendation";
  /** Lite: 3개, Standard: 5개, Premium: 5개 */
  topics: TopicRecommendationItem[];
}
```

#### 섹션 15: 예상 면접 질문 (interviewPrep) -- Standard+ 전용

```typescript
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
}

export interface InterviewPrepSection extends BaseSection {
  sectionId: "interviewPrep";
  /** Standard: 10~12개, Premium: 12~15개 */
  questions: InterviewQuestion[];
}
```

#### 섹션 16: 입시 전략 + 대학 추천 (admissionStrategy)

```typescript
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
}
```

**참고**: `admissionStrategy` 섹션은 조건부 제공이다.

- 고2 이상 생기부 포함 시: 전체 제공
- 고1 생기부만: `DirectionGuideSection` 대체 제공 (아래 참조)

```typescript
/** 고1 전용: 방향 설정 가이드 (admissionStrategy 대체) */
export interface DirectionGuideSection extends BaseSection {
  sectionId: "directionGuide";
  recommendedTracks: string[];
  subjectSelectionGuide: string[];
  preparationAdvice: string;
}
```

#### 섹션 17: 생기부 스토리 구조 분석 (storyAnalysis) -- Standard+

```typescript
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
}
```

#### 섹션 18: 실행 로드맵 (actionRoadmap) -- Standard+

```typescript
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
}
```

### 2.5 부록

#### 섹션 19: 추천 도서 (bookRecommendation) -- Standard+

```typescript
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
```

#### 섹션 20: AI 전공 추천 (majorExploration) -- Standard+

```typescript
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
}

export interface MajorExplorationSection extends BaseSection {
  sectionId: "majorExploration";
  /** 현재 목표 학과 평가 */
  currentTargetAssessment?: string;
  /** AI 추천 전공 (3~5개) */
  suggestions: MajorSuggestion[];
}
```

#### 섹션 21: 워드 클라우드 (wordCloud)

```typescript
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
```

### 2.6 섹션 유니온 및 메인 타입

```typescript
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
  // Part 1
  | "studentProfile"
  | "competencyScore"
  | "admissionPrediction"
  | "diagnostic"
  // Part 2
  | "competencyEvaluation"
  | "academicAnalysis"
  | "courseAlignment"
  | "attendanceAnalysis"
  | "activityAnalysis"
  | "subjectAnalysis"
  // Part 3
  | "weaknessAnalysis"
  | "topicRecommendation"
  | "admissionStrategy"
  | "directionGuide"
  // 부록
  | "wordCloud";

type StandardSectionId =
  | LiteSectionId
  // Part 2 추가
  | "behaviorAnalysis"
  | "overallAssessment"
  // Part 3 추가
  | "interviewPrep"
  | "storyAnalysis"
  | "actionRoadmap"
  // 부록 추가
  | "bookRecommendation"
  | "majorExploration";

type PremiumSectionId = StandardSectionId;

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
// 플랜별 섹션 순서
// ============================================================

/** 플랜별 섹션 순서 (조건부 섹션은 런타임에서 판단) */
export const SECTION_ORDER: Record<ReportPlan, string[]> = {
  lite: [
    // Part 1: 진단
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    "diagnostic",
    // Part 2: 분석
    "competencyEvaluation",
    "academicAnalysis",
    "courseAlignment",
    "attendanceAnalysis",
    "activityAnalysis",
    "subjectAnalysis",
    // Part 3: 전략
    "weaknessAnalysis",
    "topicRecommendation",
    "admissionStrategy", // 또는 "directionGuide" (고1)
    // 부록
    "wordCloud",
  ],
  standard: [
    // Part 1: 진단
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    "diagnostic",
    // Part 2: 분석
    "competencyEvaluation",
    "academicAnalysis",
    "courseAlignment",
    "attendanceAnalysis",
    "activityAnalysis",
    "subjectAnalysis",
    "behaviorAnalysis",
    "overallAssessment",
    // Part 3: 전략
    "weaknessAnalysis",
    "topicRecommendation",
    "interviewPrep",
    "admissionStrategy", // 또는 "directionGuide" (고1)
    "storyAnalysis",
    "actionRoadmap",
    // 부록
    "bookRecommendation",
    "majorExploration",
    "wordCloud",
  ],
  premium: [
    // Part 1: 진단
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    "diagnostic",
    // Part 2: 분석
    "competencyEvaluation",
    "academicAnalysis",
    "courseAlignment",
    "attendanceAnalysis",
    "activityAnalysis",
    "subjectAnalysis",
    "behaviorAnalysis",
    "overallAssessment",
    // Part 3: 전략
    "weaknessAnalysis",
    "topicRecommendation",
    "interviewPrep",
    "admissionStrategy", // 또는 "directionGuide" (고1)
    "storyAnalysis",
    "actionRoadmap",
    // 부록
    "bookRecommendation",
    "majorExploration",
    "wordCloud",
  ],
};

/** 섹션 ID에서 섹션 타입 추출 헬퍼 */
export type ExtractSection<
  T extends ReportSection,
  Id extends string,
> = T extends { sectionId: Id } ? T : never;
```

---

## 3. Zod 검증 스키마 (libs/report/schemas.ts)

AI 출력을 런타임에 검증하기 위한 Zod 스키마. `libs/report/types.ts`와 1:1 대응.

### 3.1 설계 원칙

1. **플랜별 검증 함수**: `validateReportContent(content, plan)` -- 플랜에 따라 필수/옵션 필드 검증
2. **섹션별 개별 검증**: 각 섹션을 독립적으로 검증 가능 (AI 파이프라인에서 섹션별 생성 시)
3. **에러 메시지 한국어**: 검증 실패 시 한국어 에러 메시지

### 3.2 공통 스키마

```typescript
import { z } from "zod/v4";

// 공통 enum 스키마
const CompetencyGradeSchema = z.enum(["S", "A", "B", "C", "D"]);
const SubjectRatingSchema = z.enum(["excellent", "good", "average", "weak"]);
const EvaluationImpactSchema = z.enum(["high", "medium", "low"]);
const AdmissionChanceSchema = z.enum(["high", "medium", "low"]);
const AdmissionTierSchema = z.enum(["상향", "안정", "하향"]);
const PrioritySchema = z.enum(["high", "medium", "low"]);
const CompetencyCategorySchema = z.enum([
  "academic",
  "career",
  "community",
  "growth",
]);

const CompetencyTagSchema = z.object({
  category: CompetencyCategorySchema,
  subcategory: z.string().min(1),
  assessment: z.enum(["우수", "양호", "미흡", "부족"]).optional(),
});
```

### 3.3 Part 1: 진단 스키마

```typescript
// ─── 섹션 1: 학생 프로필 ───

const StudentProfileSectionSchema = z.object({
  sectionId: z.literal("studentProfile"),
  title: z.string().min(1),
  typeName: z.string().min(1),
  typeDescription: z.string().min(1),
  radarChart: z.object({
    academic: z.number().min(0).max(100),
    career: z.number().min(0).max(100),
    community: z.number().min(0).max(100),
    growth: z.number().min(0).max(100),
  }),
  tags: z.array(z.string().min(1)).min(3).max(5),
  catchPhrase: z.string().min(1),
});

// ─── 섹션 2: 역량 정량 스코어 ───

const CompetencySubScoreSchema = z.object({
  name: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  comment: z.string().min(1),
});

const CompetencyScoreDetailSchema = z.object({
  category: CompetencyCategorySchema,
  label: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.literal(100),
  subcategories: z.array(CompetencySubScoreSchema).min(1),
});

const ComparisonDataSchema = z.object({
  myScore: z.number().min(0),
  targetRangeAvg: z.number().min(0).optional(),
  overallAvg: z.number().min(0).optional(),
});

const CompetencyScoreSectionSchema = z.object({
  sectionId: z.literal("competencyScore"),
  title: z.string().min(1),
  totalScore: z.number().min(0).max(300),
  growthGrade: CompetencyGradeSchema,
  growthComment: z.string().min(1),
  scores: z.tuple([
    CompetencyScoreDetailSchema,
    CompetencyScoreDetailSchema,
    CompetencyScoreDetailSchema,
  ]),
  percentile: z.number().min(0).max(100).optional(),
  percentileLabel: z.string().optional(),
  comparison: ComparisonDataSchema.optional(),
  interpretation: z.string().min(1),
});

// ─── 섹션 3: 합격 예측 ───

const UniversityPredictionSchema = z.object({
  university: z.string().min(1),
  department: z.string().min(1),
  chance: AdmissionChanceSchema,
  rationale: z.string().min(1),
});

const AdmissionPredictionItemSchema = z.object({
  admissionType: z.enum(["학종", "교과", "정시"]),
  passRateLabel: z.string().min(1),
  passRateRange: z.tuple([
    z.number().min(0).max(100),
    z.number().min(0).max(100),
  ]),
  analysis: z.string().min(1),
  universityPredictions: z.array(UniversityPredictionSchema).optional(),
});

const AdmissionPredictionSectionSchema = z.object({
  sectionId: z.literal("admissionPrediction"),
  title: z.string().min(1),
  recommendedType: z.enum(["학종", "교과", "정시"]),
  recommendedTypeReason: z.string().min(1),
  predictions: z.array(AdmissionPredictionItemSchema).min(1),
  overallComment: z.string().min(1),
});

// ─── 섹션 4: 종합 진단 ───

const DiagnosticKeywordSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1),
});

const CompetencySummaryItemSchema = z.object({
  category: CompetencyCategorySchema,
  label: z.string().min(1),
  summary: z.string().min(1),
});

const DiagnosticSectionSchema = z.object({
  sectionId: z.literal("diagnostic"),
  title: z.string().min(1),
  oneLiner: z.string().min(10),
  keywords: z.tuple([
    DiagnosticKeywordSchema,
    DiagnosticKeywordSchema,
    DiagnosticKeywordSchema,
  ]),
  competencySummary: z.tuple([
    CompetencySummaryItemSchema,
    CompetencySummaryItemSchema,
    CompetencySummaryItemSchema,
    CompetencySummaryItemSchema,
  ]),
  admissionPositioning: z.string().optional(),
  strategyOverview: z.string().optional(),
});
```

### 3.4 Part 2: 분석 스키마

```typescript
// ─── 섹션 5: 역량별 종합 평가 ───

const StrengthWeaknessItemSchema = z.object({
  competencyTag: CompetencyTagSchema,
  label: z.string().min(1),
  evidence: z.string().min(1),
});

const SubcategoryRatingSchema = z.object({
  name: z.string().min(1),
  grade: CompetencyGradeSchema,
  comment: z.string().min(1),
});

const CompetencyRatingSchema = z.object({
  category: CompetencyCategorySchema,
  label: z.string().min(1),
  grade: CompetencyGradeSchema,
  comment: z.string().min(1),
  subcategories: z.array(SubcategoryRatingSchema).optional(),
});

const CompetencyEvaluationSectionSchema = z.object({
  sectionId: z.literal("competencyEvaluation"),
  title: z.string().min(1),
  strengths: z.array(StrengthWeaknessItemSchema).min(3),
  weaknesses: z.array(StrengthWeaknessItemSchema).min(3),
  overallComment: z.string().min(20),
  competencyRatings: z.array(CompetencyRatingSchema).min(1),
});

// ─── 섹션 6: 성적 분석 ───

const GradeSummaryByYearSchema = z.object({
  year: z.number().int().min(1).max(3),
  semester: z.number().int().min(1).max(2),
  averageGrade: z.number(),
});

const SubjectGradeItemSchema = z.object({
  subject: z.string().min(1),
  year: z.number().int().min(1).max(3),
  semester: z.number().int().min(1).max(2),
  grade: z.number().min(1).max(9),
  rawScore: z.number().optional(),
  classAverage: z.number().optional(),
  standardDeviation: z.number().optional(),
  studentCount: z.number().int().optional(),
});

const SubjectCombinationAverageSchema = z.object({
  combination: z.string().min(1),
  averageGrade: z.number(),
});

const SubjectStatAnalysisSchema = z.object({
  subject: z.string().min(1),
  year: z.number().int().min(1).max(3),
  semester: z.number().int().min(1).max(2),
  zScore: z.number(),
  percentileEstimate: z.number().min(0).max(100),
  interpretation: z.string().min(1),
});

const GradeDeviationAnalysisSchema = z.object({
  highestSubject: z.string().min(1),
  lowestSubject: z.string().min(1),
  deviationRange: z.number(),
  riskAssessment: z.string().min(1),
});

const MajorRelevanceAnalysisSchema = z.object({
  enrollmentEffort: z.string().min(1),
  achievement: z.string().min(1),
  recommendedSubjects: z.array(z.string().min(1)).optional(),
});

const CareerSubjectAnalysisSchema = z.object({
  subject: z.string().min(1),
  achievement: z.string().min(1),
  achievementDistribution: z.string().min(1),
  interpretation: z.string().min(1),
});

const GradeChangeAnalysisSchema = z.object({
  currentTrend: z.enum(["상승", "유지", "하락"]),
  prediction: z.string().min(1),
  actionItems: z.array(z.string().min(1)).min(1),
});

const FiveGradeSimulationSchema = z.object({
  subject: z.string().min(1),
  currentGrade: z.number(),
  simulatedGrade: z.number(),
  interpretation: z.string().min(1),
});

const UniversityGradeSimulationSchema = z.object({
  university: z.string().min(1),
  department: z.string().min(1),
  reflectionMethod: z.string().min(1),
  calculatedScore: z.number(),
  interpretation: z.string().min(1),
});

const SmallClassSubjectAnalysisSchema = z.object({
  subject: z.string().min(1),
  enrollmentSize: z.number().int(),
  achievementLevel: z.string().min(1),
  grade: z.string().optional(),
  interpretation: z.string().min(1),
});

const AcademicAnalysisSectionSchema = z.object({
  sectionId: z.literal("academicAnalysis"),
  title: z.string().min(1),
  overallAverageGrade: z.number(),
  gradesByYear: z.array(GradeSummaryByYearSchema).min(1),
  subjectCombinations: z.array(SubjectCombinationAverageSchema),
  gradeTrend: z.enum(["상승", "유지", "하락"]),
  subjectGrades: z.array(SubjectGradeItemSchema).min(1),
  interpretation: z.string().min(1),
  subjectStatAnalyses: z.array(SubjectStatAnalysisSchema).optional(),
  gradeDeviationAnalysis: GradeDeviationAnalysisSchema.optional(),
  majorRelevanceAnalysis: MajorRelevanceAnalysisSchema.optional(),
  schoolTypeAdjustment: z.string().optional(),
  gradeChangeAnalysis: GradeChangeAnalysisSchema.optional(),
  careerSubjectAnalyses: z.array(CareerSubjectAnalysisSchema).optional(),
  smallClassSubjectAnalyses: z
    .array(SmallClassSubjectAnalysisSchema)
    .optional(),
  gradeInflationContext: z.string().optional(),
  fiveGradeSimulation: z.array(FiveGradeSimulationSchema).optional(),
  universityGradeSimulations: z
    .array(UniversityGradeSimulationSchema)
    .optional(),
  improvementPriority: z.array(z.string().min(1)).optional(),
});

// ─── 섹션 7: 권장과목 이수 분석 ───

const CourseMatchDetailSchema = z.object({
  course: z.string().min(1),
  status: z.enum(["이수", "미이수"]),
  importance: z.enum(["필수", "권장"]),
});

const MedicalRequirementSchema = z.object({
  university: z.string().min(1),
  department: z.string().min(1),
  met: z.boolean(),
  details: z.string().min(1),
});

const CourseAlignmentSectionSchema = z.object({
  sectionId: z.literal("courseAlignment"),
  title: z.string().min(1),
  targetMajor: z.string().min(1),
  matchRate: z.number().min(0).max(100),
  courses: z.array(CourseMatchDetailSchema).min(1),
  missingCourseImpact: z.string().min(1),
  recommendation: z.string().optional(),
  medicalRequirements: z.array(MedicalRequirementSchema).optional(),
});

// ─── 섹션 8: 출결 분석 ───

const AttendanceSummarySchema = z.object({
  year: z.number().int().min(1).max(3),
  totalAbsence: z.number().int().min(0),
  illness: z.number().int().min(0),
  unauthorized: z.number().int().min(0),
  etc: z.number().int().min(0),
  lateness: z.number().int().min(0),
  earlyLeave: z.number().int().min(0),
});

const AttendanceAnalysisSectionSchema = z.object({
  sectionId: z.literal("attendanceAnalysis"),
  title: z.string().min(1),
  summaryByYear: z.array(AttendanceSummarySchema).min(1),
  overallRating: z.enum(["우수", "양호", "주의", "경고"]),
  impactAnalysis: z.string().min(1),
  integrityContribution: z.string().min(1),
  improvementAdvice: z.string().optional(),
});

// ─── 섹션 9: 창체 활동 분석 ───

const ActivityYearlyAnalysisSchema = z.object({
  year: z.number().int().min(1).max(3),
  summary: z.string().min(1),
  rating: SubjectRatingSchema,
  competencyTags: z.array(CompetencyTagSchema),
});

const KeyActivitySchema = z.object({
  activity: z.string().min(1),
  evaluation: z.string().min(1),
  competencyTags: z.array(CompetencyTagSchema),
});

const ActivityTypeAnalysisSchema = z.object({
  type: z.string().min(1),
  yearlyAnalysis: z.array(ActivityYearlyAnalysisSchema).min(1),
  overallComment: z.string().min(1),
  volumeAssessment: z.string().optional(),
  keyActivities: z.array(KeyActivitySchema).optional(),
  improvementDirection: z.string().optional(),
});

const ActivityAnalysisSectionSchema = z.object({
  sectionId: z.literal("activityAnalysis"),
  title: z.string().min(1),
  curriculumVersion: z.enum(["2015", "2022"]),
  activities: z.array(ActivityTypeAnalysisSchema).min(1),
  overallComment: z.string().min(1),
});

// ─── 섹션 10: 교과 세특 분석 ───

const SentenceAnalysisSchema = z.object({
  sentence: z.string().min(1),
  evaluation: z.string().min(1),
  competencyTags: z.array(CompetencyTagSchema).min(1),
  highlight: z.enum(["positive", "negative", "neutral"]),
  improvementSuggestion: z.string().optional(),
});

const CrossSubjectConnectionSchema = z.object({
  targetSubject: z.string().min(1),
  connectionType: z.enum(["주제연결", "역량연결", "중복"]),
  description: z.string().min(1),
});

const SubjectAnalysisItemSchema = z.object({
  subjectName: z.string().min(1),
  year: z.number().int().min(1).max(3),
  rating: SubjectRatingSchema,
  competencyTags: z.array(CompetencyTagSchema).min(1),
  activitySummary: z.string().min(10),
  evaluationComment: z.string().min(10),
  keyQuotes: z.array(z.string()).optional(),
  detailedEvaluation: z.string().optional(),
  improvementDirection: z.string().optional(),
  improvementExample: z.string().optional(),
  crossSubjectConnections: z.array(CrossSubjectConnectionSchema).optional(),
  sentenceAnalysis: z.array(SentenceAnalysisSchema).optional(),
  importancePercent: z.number().min(0).max(100).optional(),
  evaluationImpact: EvaluationImpactSchema.optional(),
});

const SubjectAnalysisSectionSchema = z.object({
  sectionId: z.literal("subjectAnalysis"),
  title: z.string().min(1),
  subjects: z.array(SubjectAnalysisItemSchema).min(1),
});

// ─── 섹션 11: 행동특성 분석 ───

const BehaviorYearAnalysisSchema = z.object({
  year: z.number().int().min(1).max(3),
  summary: z.string().min(1),
  competencyTags: z.array(CompetencyTagSchema),
  keyQuotes: z.array(z.string()).optional(),
});

const BehaviorAnalysisSectionSchema = z.object({
  sectionId: z.literal("behaviorAnalysis"),
  title: z.string().min(1),
  yearlyAnalysis: z.array(BehaviorYearAnalysisSchema).min(1),
  consistentTraits: z.array(z.string().min(1)).min(1),
  overallComment: z.string().min(1),
  admissionRelevance: z.string().min(1),
});

// ─── 섹션 12: 기록 충실도 종합 ───

const RecordVolumeItemSchema = z.object({
  category: z.string().min(1),
  maxCapacity: z.string().min(1),
  actualVolume: z.string().min(1),
  fillRate: z.number().min(0).max(100),
  assessment: z.string().min(1),
});

const OverallAssessmentSectionSchema = z.object({
  sectionId: z.literal("overallAssessment"),
  title: z.string().min(1),
  volumeAnalysis: z.array(RecordVolumeItemSchema).min(1),
  overallFillRate: z.number().min(0).max(100),
  qualityAssessment: z.string().min(1),
  competitivenessSum: z.string().min(1),
  finalComment: z.string().min(1),
});
```

### 3.5 Part 3: 전략 스키마

```typescript
// ─── 섹션 13: 부족한 부분 + 보완 전략 ───

const WeaknessAreaSchema = z.object({
  area: z.string().min(1),
  description: z.string().min(1),
  suggestedActivities: z.array(z.string().min(1)).min(1),
  evidence: z.string().optional(),
  competencyTag: CompetencyTagSchema.optional(),
  priority: PrioritySchema.optional(),
  urgency: PrioritySchema.optional(),
  effectiveness: PrioritySchema.optional(),
  executionStrategy: z.string().optional(),
  subjectLinkStrategy: z.string().optional(),
});

const WeaknessAnalysisSectionSchema = z.object({
  sectionId: z.literal("weaknessAnalysis"),
  title: z.string().min(1),
  areas: z.array(WeaknessAreaSchema).min(3),
});

// ─── 섹션 14: 세특 주제 추천 ───

const ActivityDesignSchema = z.object({
  steps: z.array(z.string().min(1)).min(1),
  duration: z.string().min(1),
  expectedResult: z.string().min(1),
});

const TopicRecommendationItemSchema = z.object({
  topic: z.string().min(1),
  relatedSubjects: z.array(z.string().min(1)).min(1),
  description: z.string().min(1),
  rationale: z.string().optional(),
  existingConnection: z.string().optional(),
  activityDesign: ActivityDesignSchema.optional(),
  sampleEvaluation: z.string().optional(),
});

const TopicRecommendationSectionSchema = z.object({
  sectionId: z.literal("topicRecommendation"),
  title: z.string().min(1),
  topics: z.array(TopicRecommendationItemSchema).min(3),
});

// ─── 섹션 15: 예상 면접 질문 ───

const FollowUpQuestionSchema = z.object({
  question: z.string().min(1),
  context: z.string().min(1),
});

const InterviewQuestionSchema = z.object({
  question: z.string().min(1),
  questionType: z
    .enum(["세특기반", "성적기반", "진로기반", "인성기반"])
    .optional(),
  intent: z.string().optional(),
  answerStrategy: z.string().optional(),
  sampleAnswer: z.string().optional(),
  followUpQuestions: z.array(FollowUpQuestionSchema).optional(),
});

const InterviewPrepSectionSchema = z.object({
  sectionId: z.literal("interviewPrep"),
  title: z.string().min(1),
  questions: z.array(InterviewQuestionSchema).min(10),
});

// ─── 섹션 16: 입시 전략 + 대학 추천 ───

const AdmissionDataSchema = z.object({
  cutoff50: z.number().optional(),
  cutoff70: z.number().optional(),
  competitionRate: z.number().optional(),
  enrollment: z.number().int().optional(),
});

const UniversityRecommendationSchema = z.object({
  university: z.string().min(1),
  department: z.string().min(1),
  admissionType: z.string().min(1),
  tier: AdmissionTierSchema,
  chance: AdmissionChanceSchema.optional(),
  chanceRationale: z.string().optional(),
  admissionData: AdmissionDataSchema.optional(),
});

const AdmissionTypeStrategySchema = z.object({
  type: z.enum(["학종", "교과", "정시"]),
  analysis: z.string().min(1),
  suitability: z.enum(["적합", "보통", "부적합"]),
  reason: z.string().min(1),
});

const SchoolTypeAnalysisSchema = z.object({
  cautionTypes: z.array(z.string().min(1)),
  advantageTypes: z.array(z.string().min(1)),
  rationale: z.string().min(1),
});

const ApplicationSimulationDetailSchema = z.object({
  admissionType: z.string().min(1),
  count: z.number().int().min(1),
  targetUniversities: z.array(z.string().min(1)),
});

const ApplicationSimulationSchema = z.object({
  description: z.string().min(1),
  details: z.array(ApplicationSimulationDetailSchema).min(1),
});

const UniversityGuideMatchingSchema = z.object({
  university: z.string().min(1),
  emphasisKeywords: z.array(z.string().min(1)),
  studentStrengthMatch: z.array(z.string().min(1)),
  studentWeaknessMatch: z.array(z.string().min(1)),
});

const AdmissionStrategySectionSchema = z.object({
  sectionId: z.literal("admissionStrategy"),
  title: z.string().min(1),
  recommendedPath: z.string().min(1),
  recommendations: z.array(UniversityRecommendationSchema).min(1),
  typeStrategies: z.array(AdmissionTypeStrategySchema).optional(),
  schoolTypeAnalysis: SchoolTypeAnalysisSchema.optional(),
  csatMinimumStrategy: z.string().optional(),
  applicationSimulation: ApplicationSimulationSchema.optional(),
  universityGuideMatching: z.array(UniversityGuideMatchingSchema).optional(),
});

// ─── 고1 전용: 방향 설정 가이드 ───

const DirectionGuideSectionSchema = z.object({
  sectionId: z.literal("directionGuide"),
  title: z.string().min(1),
  recommendedTracks: z.array(z.string().min(1)).min(1),
  subjectSelectionGuide: z.array(z.string().min(1)).min(1),
  preparationAdvice: z.string().min(1),
});

// ─── 섹션 17: 생기부 스토리 구조 분석 ───

const YearProgressionSchema = z.object({
  year: z.number().int().min(1).max(3),
  theme: z.string().min(1),
  description: z.string().min(1),
});

const CrossSubjectLinkSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  topic: z.string().min(1),
  depth: z.enum(["심화", "반복", "확장", "무관"]),
});

const StoryAnalysisSectionSchema = z.object({
  sectionId: z.literal("storyAnalysis"),
  title: z.string().min(1),
  mainStoryline: z.string().min(1),
  yearProgressions: z.array(YearProgressionSchema).min(1),
  careerConsistencyGrade: CompetencyGradeSchema,
  careerConsistencyComment: z.string().min(1),
  crossSubjectLinks: z.array(CrossSubjectLinkSchema).optional(),
  storyEnhancementSuggestions: z.array(z.string().min(1)).optional(),
  interviewStoryGuide: z.string().optional(),
});

// ─── 섹션 18: 실행 로드맵 ───

const RoadmapPhaseSchema = z.object({
  phase: z.string().min(1),
  period: z.string().min(1),
  goals: z.array(z.string().min(1)).min(1),
  tasks: z.array(z.string().min(1)).min(1),
});

const EvaluationWritingGuideSchema = z.object({
  structure: z.array(z.string().min(1)).min(1),
  goodExample: z.string().min(1),
  badExample: z.string().min(1),
});

const ActionRoadmapSectionSchema = z.object({
  sectionId: z.literal("actionRoadmap"),
  title: z.string().min(1),
  completionStrategy: z.string().min(1),
  phases: z.array(RoadmapPhaseSchema).min(1),
  prewriteProposals: z.array(z.string().min(1)).optional(),
  evaluationWritingGuide: EvaluationWritingGuideSchema.optional(),
  interviewTimeline: z.string().optional(),
});
```

### 3.6 부록 스키마

```typescript
// ─── 섹션 19: 추천 도서 ───

const BookItemSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  reason: z.string().min(1),
  connectionToRecord: z.string().min(1),
  relatedSubject: z.string().optional(),
});

const BookRecommendationSectionSchema = z.object({
  sectionId: z.literal("bookRecommendation"),
  title: z.string().min(1),
  books: z.array(BookItemSchema).min(3),
});

// ─── 섹션 20: AI 전공 추천 ───

const MajorSuggestionSchema = z.object({
  major: z.string().min(1),
  university: z.string().optional(),
  fitScore: z.number().min(0).max(100),
  rationale: z.string().min(1),
  strengthMatch: z.array(z.string().min(1)).min(1),
  gapAnalysis: z.string().optional(),
});

const MajorExplorationSectionSchema = z.object({
  sectionId: z.literal("majorExploration"),
  title: z.string().min(1),
  currentTargetAssessment: z.string().optional(),
  suggestions: z.array(MajorSuggestionSchema).min(3),
});

// ─── 섹션 21: 워드 클라우드 ───

const WordCloudItemSchema = z.object({
  text: z.string().min(1),
  frequency: z.number().int().min(1),
  category: CompetencyCategorySchema.optional(),
});

const WordCloudSectionSchema = z.object({
  sectionId: z.literal("wordCloud"),
  title: z.string().min(1),
  words: z.array(WordCloudItemSchema).min(20).max(50),
});
```

### 3.7 전체 리포트 스키마

```typescript
// ============================================================
// 전체 리포트 콘텐츠 스키마
// ============================================================

const StudentInfoSchema = z.object({
  name: z.string().min(1),
  grade: z.number().int().min(1).max(3),
  track: z.enum(["문과", "이과", "예체능", "통합"]),
  schoolType: z.enum([
    "일반고",
    "특목고",
    "자율고",
    "특성화고",
    "영재학교",
    "과학고",
    "외국어고",
    "국제고",
    "예술고",
    "체육고",
    "마이스터고",
  ]),
  targetUniversity: z.string().optional(),
  targetDepartment: z.string().optional(),
  hasMockExamData: z.boolean(),
});

const ReportMetaSchema = z.object({
  reportId: z.string().min(1),
  plan: z.enum(["lite", "standard", "premium"]),
  studentInfo: StudentInfoSchema,
  createdAt: z.string().datetime(),
  version: z.number().int().min(1),
});

const ReportSectionSchema = z.discriminatedUnion("sectionId", [
  StudentProfileSectionSchema,
  CompetencyScoreSectionSchema,
  AdmissionPredictionSectionSchema,
  DiagnosticSectionSchema,
  CompetencyEvaluationSectionSchema,
  AcademicAnalysisSectionSchema,
  CourseAlignmentSectionSchema,
  AttendanceAnalysisSectionSchema,
  ActivityAnalysisSectionSchema,
  SubjectAnalysisSectionSchema,
  BehaviorAnalysisSectionSchema,
  OverallAssessmentSectionSchema,
  WeaknessAnalysisSectionSchema,
  TopicRecommendationSectionSchema,
  InterviewPrepSectionSchema,
  AdmissionStrategySectionSchema,
  DirectionGuideSectionSchema,
  StoryAnalysisSectionSchema,
  ActionRoadmapSectionSchema,
  BookRecommendationSectionSchema,
  MajorExplorationSectionSchema,
  WordCloudSectionSchema,
]);

const ReportContentSchema = z.object({
  meta: ReportMetaSchema,
  sections: z.array(ReportSectionSchema).min(14),
});
```

### 3.8 플랜별 검증 규칙

```typescript
import type {
  ReportContent,
  CompetencyEvaluationSection,
  SubjectAnalysisSection,
} from "./types";
import { SECTION_ORDER } from "./types";

/**
 * 플랜별 필수 필드 검증
 * AI 출력 검증 시 이 함수를 통해 플랜에 맞는 필드 존재 여부를 확인한다.
 */
export const validateByPlan = (content: ReportContent): string[] => {
  const { plan } = content.meta;
  const errors: string[] = [];

  // ── 섹션 구성 검증 ──
  const expectedSections = SECTION_ORDER[plan];
  const actualSectionIds = content.sections.map((s) => s.sectionId);

  for (const expected of expectedSections) {
    // admissionStrategy는 조건부이므로 directionGuide로 대체 가능
    if (expected === "admissionStrategy") {
      if (
        !actualSectionIds.includes("admissionStrategy") &&
        !actualSectionIds.includes("directionGuide")
      ) {
        errors.push("필수 섹션 누락: admissionStrategy 또는 directionGuide");
      }
      continue;
    }
    if (!actualSectionIds.includes(expected)) {
      errors.push(`필수 섹션 누락: ${expected}`);
    }
  }

  // ── 전 플랜 공통: competencyRatings 필수 ──
  const compEval = content.sections.find(
    (s) => s.sectionId === "competencyEvaluation"
  ) as CompetencyEvaluationSection | undefined;
  if (
    compEval &&
    (!compEval.competencyRatings || compEval.competencyRatings.length === 0)
  ) {
    errors.push("전 플랜: competencyRatings 필수");
  }

  // ── Standard/Premium 필수 필드 검증 ──
  if (plan === "standard" || plan === "premium") {
    // 세특 분석 Standard 필수 필드
    const subjectAnalysis = content.sections.find(
      (s) => s.sectionId === "subjectAnalysis"
    ) as SubjectAnalysisSection | undefined;
    if (subjectAnalysis) {
      for (const subject of subjectAnalysis.subjects) {
        if (!subject.keyQuotes) {
          errors.push(`Standard 이상: ${subject.subjectName}의 keyQuotes 필수`);
        }
        if (!subject.detailedEvaluation) {
          errors.push(
            `Standard 이상: ${subject.subjectName}의 detailedEvaluation 필수`
          );
        }
      }
    }

    // interviewPrep 필수 (Standard+ 전용)
    if (!actualSectionIds.includes("interviewPrep")) {
      errors.push("Standard 이상: interviewPrep 섹션 필수");
    }

    // storyAnalysis 필수
    if (!actualSectionIds.includes("storyAnalysis")) {
      errors.push("Standard 이상: storyAnalysis 섹션 필수");
    }

    // actionRoadmap 필수
    if (!actualSectionIds.includes("actionRoadmap")) {
      errors.push("Standard 이상: actionRoadmap 섹션 필수");
    }

    // behaviorAnalysis 필수
    if (!actualSectionIds.includes("behaviorAnalysis")) {
      errors.push("Standard 이상: behaviorAnalysis 섹션 필수");
    }

    // overallAssessment 필수
    if (!actualSectionIds.includes("overallAssessment")) {
      errors.push("Standard 이상: overallAssessment 섹션 필수");
    }

    // bookRecommendation 필수
    if (!actualSectionIds.includes("bookRecommendation")) {
      errors.push("Standard 이상: bookRecommendation 섹션 필수");
    }

    // majorExploration 필수
    if (!actualSectionIds.includes("majorExploration")) {
      errors.push("Standard 이상: majorExploration 섹션 필수");
    }
  }

  // ── Premium 전용 필드 검증 ──
  if (plan === "premium") {
    const subjectAnalysis = content.sections.find(
      (s) => s.sectionId === "subjectAnalysis"
    ) as SubjectAnalysisSection | undefined;
    if (subjectAnalysis) {
      for (const subject of subjectAnalysis.subjects) {
        if (!subject.sentenceAnalysis) {
          errors.push(
            `Premium: ${subject.subjectName}의 sentenceAnalysis 필수`
          );
        }
        if (subject.importancePercent === undefined) {
          errors.push(
            `Premium: ${subject.subjectName}의 importancePercent 필수`
          );
        }
      }
    }
  }

  return errors;
};
```

---

## 4. API 라우트 구조

### 4.1 라우트 총괄표

| Method | Path                              | 용도               | 인증                            |
| ------ | --------------------------------- | ------------------ | ------------------------------- |
| POST   | `/api/reports/generate`           | 리포트 생성 트리거 | 시스템 (결제 완료 후 자동 호출) |
| GET    | `/api/reports/[id]/status`        | 리포트 상태 조회   | 유저                            |
| GET    | `/api/reports/[id]`               | 리포트 결과 조회   | 유저                            |
| GET    | `/api/admin/reports`              | 리포트 목록 조회   | 어드민 (기존 유지)              |
| GET    | `/api/admin/reports/[id]`         | 리포트 상세 조회   | 어드민 (기존 유지)              |
| PATCH  | `/api/admin/reports/[id]`         | 리포트 내용 수정   | 어드민                          |
| POST   | `/api/admin/reports/[id]/review`  | 리포트 검수 완료   | 어드민                          |
| POST   | `/api/admin/reports/[id]/deliver` | 리포트 발송        | 어드민                          |

### 4.2 각 API 상세

#### POST `/api/reports/generate` -- 리포트 생성 트리거

결제 완료 시 자동 호출되어 AI 분석을 백그라운드로 시작한다.

**호출 시점**: 결제 승인 처리 완료 후 (`orders.status` = `paid` 로 변경 시)

**Request Body**:

```typescript
interface GenerateReportRequest {
  orderId: string;
}
```

**처리 흐름**:

1. `orders` 테이블에서 `order_id`로 주문 정보 조회 (plan_id, record_id, user_id)
2. `reports` 테이블에 빈 레코드 생성 (content = null, status = ai_pending)
3. `orders.status` = `analyzing` 으로 변경
4. 백그라운드 AI 분석 작업 트리거 (Edge Function 또는 서버 액션)
5. AI 분석 완료 시 `reports.content`에 JSONB 저장, `ai_generated_at` 설정

**Response**:

```typescript
// 200 OK
{
  reportId: string;
  status: "ai_pending";
}
```

#### GET `/api/reports/[id]/status` -- 리포트 상태 조회

유저가 자신의 리포트 진행 상태를 확인한다.

**Response**:

```typescript
interface ReportStatusResponse {
  id: string;
  status: "ai_pending" | "review_pending" | "review_complete" | "delivered";
  statusLabel: string; // 한국어 상태 레이블
  estimatedDelivery: string; // 예상 전달 시간 (ISO 8601)
}
```

#### GET `/api/reports/[id]` -- 리포트 결과 조회

`delivered` 상태일 때만 콘텐츠를 반환한다.

**Response**:

```typescript
// 200 OK (delivered 상태)
interface ReportResponse {
  id: string;
  status: "delivered";
  content: ReportContent; // 전체 리포트 JSONB
}

// 403 (아직 전달되지 않은 경우)
{
  error: "리포트가 아직 준비 중입니다.";
}
```

#### PATCH `/api/admin/reports/[id]` -- 리포트 내용 수정

어드민이 AI 생성 리포트의 content를 수정한다.

**Request Body**:

```typescript
interface UpdateReportRequest {
  content: ReportContent; // 수정된 전체 콘텐츠
  reviewNotes?: string; // 수정 사유/메모
}
```

**처리**: content를 Zod 스키마로 재검증 후 저장.

#### POST `/api/admin/reports/[id]/review` -- 검수 완료

**Request Body**:

```typescript
interface ReviewReportRequest {
  reviewNotes?: string;
}
```

**처리**: `reviewed_at` = now(), `reviewed_by` = 현재 어드민 ID, `orders.status` = `review_complete`

#### POST `/api/admin/reports/[id]/deliver` -- 발송

**처리**: `delivered_at` = now(), `orders.status` = `delivered`, 이메일 발송 트리거

---

## 5. DB 스키마 변경사항

### 5.1 현행 reports 테이블 (변경 없음)

현행 `reports` 테이블 구조는 유지한다. `content` JSONB 컬럼의 내부 구조만 변경된다.

| 컬럼                 | 타입                             | 변경                           |
| -------------------- | -------------------------------- | ------------------------------ |
| id                   | uuid (PK)                        | 유지                           |
| order_id             | uuid (FK -> orders)              | 유지                           |
| content              | jsonb (nullable)                 | **내부 구조 변경** (v3 스키마) |
| ai_generated_at      | timestamptz                      | 유지                           |
| reviewed_by          | uuid (FK -> profiles)            | 유지                           |
| reviewed_at          | timestamptz                      | 유지                           |
| review_notes         | text                             | 유지                           |
| delivered_at         | timestamptz                      | 유지                           |
| target_university_id | uuid (FK -> target_universities) | 유지                           |
| created_at           | timestamptz                      | 유지                           |
| updated_at           | timestamptz                      | 유지                           |

### 5.2 content JSONB 구조 변경

**Before** (v1 기반):

```json
{
  "meta": {
    "reportId": "...",
    "plan": "lite",
    "studentInfo": {},
    "version": 1
  },
  "sections": [
    { "sectionId": "diagnostic", "...": "..." },
    { "sectionId": "competencyEvaluation", "...": "..." },
    "...8~10개 섹션 (플랜별)"
  ]
}
```

**After** (v3 스키마 기반):

```json
{
  "meta": {
    "reportId": "rpt_abc123",
    "plan": "standard",
    "studentInfo": {
      "name": "김하늘",
      "grade": 2,
      "track": "이과",
      "schoolType": "일반고",
      "targetUniversity": "서울대학교",
      "targetDepartment": "생명과학부",
      "hasMockExamData": false
    },
    "createdAt": "2026-03-03T09:00:00Z",
    "version": 3
  },
  "sections": [
    {
      "sectionId": "studentProfile",
      "typeName": "탐구형 성장러",
      "...": "..."
    },
    { "sectionId": "competencyScore", "totalScore": 245, "...": "..." },
    { "sectionId": "admissionPrediction", "...": "..." },
    { "sectionId": "diagnostic", "...": "..." },
    { "sectionId": "competencyEvaluation", "...": "..." },
    { "sectionId": "academicAnalysis", "...": "..." },
    { "sectionId": "courseAlignment", "...": "..." },
    { "sectionId": "attendanceAnalysis", "...": "..." },
    { "sectionId": "activityAnalysis", "...": "..." },
    { "sectionId": "subjectAnalysis", "...": "..." },
    { "sectionId": "behaviorAnalysis", "...": "..." },
    { "sectionId": "overallAssessment", "...": "..." },
    { "sectionId": "weaknessAnalysis", "...": "..." },
    { "sectionId": "topicRecommendation", "...": "..." },
    { "sectionId": "interviewPrep", "...": "..." },
    { "sectionId": "admissionStrategy", "...": "..." },
    { "sectionId": "storyAnalysis", "...": "..." },
    { "sectionId": "actionRoadmap", "...": "..." },
    { "sectionId": "bookRecommendation", "...": "..." },
    { "sectionId": "majorExploration", "...": "..." },
    { "sectionId": "wordCloud", "...": "..." }
  ]
}
```

### 5.3 마이그레이션 필요 여부

**DDL 마이그레이션: 불필요**. `content` 컬럼은 JSONB이므로 스키마 변경 없이 내부 구조만 변경 가능.

**데이터 마이그레이션**: 현재 reports 테이블에 데이터가 0행이므로 불필요. 만약 기존 데이터가 있었다면 content 컬럼 내부 구조를 변환하는 스크립트가 필요했을 것.

### 5.4 reports 테이블에 추가 컬럼 (선택사항)

AI 파이프라인에서 재시도 등을 위해 다음 컬럼 추가를 권장한다:

```sql
-- 권장 추가 컬럼
ALTER TABLE reports ADD COLUMN ai_error text;                         -- AI 생성 실패 시 에러 메시지
ALTER TABLE reports ADD COLUMN ai_retry_count integer DEFAULT 0;      -- 재시도 횟수
ALTER TABLE reports ADD COLUMN ai_model_version text;                 -- 사용된 AI 모델 버전
```

이 추가 컬럼들은 AI 파이프라인 설계 결과에 따라 결정한다.

---

## 6. 기존 코드 영향 분석

### 6.1 변경 대상 파일

| 파일                                  | 변경 내용                                                   |
| ------------------------------------- | ----------------------------------------------------------- |
| `libs/report/types.ts`                | v3 스키마로 전면 재작성 완료 (21섹션, 3파트 + 부록)         |
| `libs/report/mock-data.ts`            | 신규 v3 스키마에 맞게 전면 재작성 필요                      |
| `libs/report/schemas.ts`              | 신규 생성 (Zod 검증 스키마, 21섹션 전체)                    |
| `app/api/admin/reports/route.ts`      | `content` 참조 부분만 업데이트 (JSONB이므로 구조 변경 없음) |
| `app/api/admin/reports/[id]/route.ts` | 동일                                                        |
| `app/api/admin/reports/helpers.ts`    | 변경 없음 (status 파생 로직은 content 내부 구조와 무관)     |
| `app/admin/types.ts`                  | 변경 없음                                                   |

### 6.2 신규 생성 파일

| 파일                                          | 내용                          |
| --------------------------------------------- | ----------------------------- |
| `libs/report/schemas.ts`                      | Zod 검증 스키마 (21섹션 전체) |
| `libs/report/validation.ts`                   | 플랜별 검증 로직              |
| `app/api/reports/generate/route.ts`           | 리포트 생성 트리거 API        |
| `app/api/reports/[id]/status/route.ts`        | 상태 조회 API                 |
| `app/api/reports/[id]/route.ts`               | 결과 조회 API                 |
| `app/api/admin/reports/[id]/review/route.ts`  | 검수 완료 API                 |
| `app/api/admin/reports/[id]/deliver/route.ts` | 발송 API                      |

---

## 7. 참고: sectionId 변경 매핑

### 7.1 기존 (v1) -> 신규 (v3) 매핑

| 기존 sectionId (v1)  | 신규 sectionId (v3)    | 비고                                                        |
| -------------------- | ---------------------- | ----------------------------------------------------------- |
| `overview`           | `diagnostic`           | 입시 포지셔닝, 역량 요약 추가                               |
| `summary`            | `competencyEvaluation` | 3대 역량 프레임워크 기반, competencyRatings 전 플랜 필수    |
| `subjectAnalysis`    | `subjectAnalysis`      | category 필드 제거 (교과만), 창체는 activityAnalysis로 분리 |
| `academic`           | `academicAnalysis`     | 소인수과목, 성적인플레 등 다차원 분석 추가                  |
| `weakness`           | `weaknessAnalysis`     | 보완 전략 통합                                              |
| `researchTopics`     | `topicRecommendation`  | 활동 설계 추가                                              |
| `interview`          | `interviewPrep`        | Standard+ 전용 (Lite 제외), 유형 분류/꼬리질문 추가         |
| `universityStrategy` | `admissionStrategy`    | 전형별 전략 통합                                            |
| `storyAnalysis`      | `storyAnalysis`        | Premium 전용 -> Standard+ 확대, Premium 필드 optional 분리  |
| `supplement`         | (삭제)                 | `weaknessAnalysis`에 통합                                   |
| `careerPath`         | (삭제)                 | `admissionStrategy`에 통합                                  |
| `roadmap`            | `actionRoadmap`        | Premium 전용 -> Standard+ 확대, Premium 필드 optional 분리  |
| (신규)               | `studentProfile`       | Part 1 신규: 학생 유형 프로필 + 레이더 차트                 |
| (신규)               | `competencyScore`      | Part 1 신규: 역량 정량 스코어 (총점/백분위)                 |
| (신규)               | `admissionPrediction`  | Part 1 신규: 전형별 합격 예측                               |
| (신규)               | `courseAlignment`      | Part 2 신규: 권장과목 이수 분석                             |
| (신규)               | `attendanceAnalysis`   | Part 2 신규: 출결 분석                                      |
| (신규)               | `activityAnalysis`     | Part 2 신규: 창체 활동 분석 (subjectAnalysis에서 분리)      |
| (신규)               | `behaviorAnalysis`     | Part 2 신규: 행동특성 분석 (Standard+)                      |
| (신규)               | `overallAssessment`    | Part 2 신규: 기록 충실도 종합 (Standard+)                   |
| (신규)               | `bookRecommendation`   | 부록 신규: 추천 도서 (Standard+)                            |
| (신규)               | `majorExploration`     | 부록 신규: AI 전공 추천 (Standard+)                         |
| (신규)               | `wordCloud`            | 부록 신규: 워드 클라우드 (전 플랜)                          |
| (신규)               | `directionGuide`       | 조건부: 고1 전용 (admissionStrategy 대체)                   |
