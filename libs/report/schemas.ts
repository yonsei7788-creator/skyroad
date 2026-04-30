// ============================================================
// 리포트 Zod 검증 스키마 (v4)
//
// AI 출력을 런타임에 검증하기 위한 Zod 스키마.
// libs/report/types.ts와 1:1 대응.
// ============================================================

import { z } from "zod/v4";

import { SECTION_ORDER } from "./types.ts";
import type { ReportContent, SubjectAnalysisSection } from "./types.ts";

// ─── 공통 enum 스키마 ───

export const CompetencyGradeSchema = z.enum(["S", "A", "B", "C", "D"]);
export const SubjectRatingSchema = z.enum([
  "excellent",
  "good",
  "average",
  "weak",
]);
export const EvaluationImpactSchema = z.enum([
  "very_high",
  "high",
  "medium",
  "low",
  "very_low",
]);
export const AdmissionChanceSchema = z.enum([
  "high",
  "medium",
  "low",
  "very_low",
]);
export const CardRiskLevelSchema = z.enum(["위험", "안정"]);
export const PrioritySchema = z.enum(["high", "medium", "low"]);
export const CompetencyCategorySchema = z.enum([
  "academic",
  "career",
  "community",
  "growth",
]);

export const CompetencyTagSchema = z.object({
  category: CompetencyCategorySchema,
  subcategory: z.string().min(1),
  assessment: z.enum(["우수", "보통", "미흡", "부족"]).optional(),
});

// ─── v4 공통 스키마 ───

export const ThreeTierRatingSchema = z.enum(["우수", "보통", "미흡"]);
export const AdmissionRiskBandSchema = z.enum([
  "안정",
  "적정",
  "소신",
  "도전",
  "위험",
]);

export const BenchmarkComparisonSchema = z.object({
  myValue: z.number(),
  targetRangeAvg: z.number(),
  overallAvg: z.number(),
  estimationBasis: z.string().optional(),
});

export const OriginalTextCitationSchema = z.object({
  originalText: z.string().min(1),
  source: z.string().min(1),
  competencyTags: z.array(CompetencyTagSchema),
  assessment: ThreeTierRatingSchema,
  positivePoint: z.string().optional(),
  improvementSuggestion: z.string().optional(),
});

export const CharacterLabelSchema = z.object({
  label: z.string().min(1),
  rationale: z.string().min(1),
});

export const VolumeMetricSchema = z.object({
  category: z.string().min(1),
  maxCapacityChars: z.number().int().min(0),
  actualChars: z.number().int().min(0),
  fillRate: z.number().min(0).max(100),
  comparisonGroupAvg: z.number().optional(),
});

// ============================================================
// Part 1: 진단 스키마
// ============================================================

// ─── 섹션 1: 학생 프로필 ───

export const StudentProfileSectionSchema = z.object({
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
  // v4
  radarChartComparison: z
    .record(z.string(), BenchmarkComparisonSchema)
    .optional(),
  percentileLabel: z.string().optional(),
  typeStrengths: z.array(z.string().min(1)).optional(),
  typeWeaknesses: z.array(z.string().min(1)).optional(),
  recommendedAdmissionType: z.string().min(1).optional(),
  strategy: z.array(z.string().min(1)).min(2).max(4).optional(),
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
  grade: CompetencyGradeSchema.optional(),
  gradeComment: z.string().optional(),
});

const ComparisonDataSchema = z.object({
  myScore: z.number().min(0),
  targetRangeAvg: z.number().min(0).optional(),
  overallAvg: z.number().min(0).optional(),
});

export const CompetencyScoreSectionSchema = z.object({
  sectionId: z.literal("competencyScore"),
  title: z.string().min(1),
  totalScore: z.number().min(0).max(400),
  growthGrade: CompetencyGradeSchema,
  growthScore: z.number().min(0).max(100).optional(),
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
  // v4
  scoreComparisons: z
    .tuple([
      BenchmarkComparisonSchema,
      BenchmarkComparisonSchema,
      BenchmarkComparisonSchema,
    ])
    .optional(),
  scoreBand: z
    .object({
      label: AdmissionRiskBandSchema,
      rangeMin: z.number(),
      rangeMax: z.number(),
      description: z.string().min(1),
    })
    .optional(),
  subcategoryComparisons: z
    .array(
      z.object({
        name: z.string().min(1),
        myScore: z.number(),
        maxScore: z.number(),
        estimatedAvg: z.number(),
      })
    )
    .optional(),
});

// ─── 섹션 3: 합격 예측 ───

const UniversityPredictionSchema = z.object({
  university: z.string().min(1),
  department: z.string().min(1),
  chance: AdmissionChanceSchema.optional(),
  rationale: z.string().optional(),
  recommendedAdmissionType: z.enum(["학종", "교과"]).optional(),
  tier: z.enum(["reach", "ambitious", "fit", "safety"]).optional(),
});

const AdmissionPredictionItemSchema = z.object({
  admissionType: z.enum(["학종", "교과", "논술", "실기/실적"]),
  passRateLabel: z.string().optional(),
  passRateRange: z
    .tuple([z.number().min(0).max(100), z.number().min(0).max(100)])
    .optional(),
  analysis: z.string().min(1),
  universityPredictions: z.array(UniversityPredictionSchema).optional(),
});

export const AdmissionPredictionSectionSchema = z.object({
  sectionId: z.literal("admissionPrediction"),
  title: z.string().min(1),
  recommendedType: z.enum(["학종", "교과", "논술"]),
  recommendedTypeReason: z.string().min(1),
  predictions: z.array(AdmissionPredictionItemSchema).min(1),
  overallComment: z.string().min(1),
  // v4
  riskBands: z
    .array(
      z.object({
        admissionType: z.enum(["학종", "교과", "논술", "실기/실적"]),
        band: AdmissionRiskBandSchema,
        rationale: z.string().min(1),
      })
    )
    .optional(),
  detailedUniversityPredictions: z
    .array(
      z.object({
        university: z.string().min(1),
        department: z.string().min(1),
        admissionType: z.string().min(1),
        band: AdmissionRiskBandSchema,
        passRateRange: z.tuple([
          z.number().min(0).max(100),
          z.number().min(0).max(100),
        ]),
        comparisonBar: BenchmarkComparisonSchema.optional(),
        keyFactors: z.array(
          z.object({
            factor: z.string().min(1),
            impact: z.enum(["positive", "negative", "neutral"]),
          })
        ),
        rationale: z.string().min(1),
      })
    )
    .optional(),
  typeSuitabilityScores: z
    .array(
      z.object({
        type: z.string().min(1),
        score: z.number().min(0).max(100),
      })
    )
    .optional(),
});

// ============================================================
// Part 2: 분석 스키마
// ============================================================

// ─── 성적 분석 ───

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
  zScore: z.number().optional().default(0),
  percentileEstimate: z.number().min(0).max(100).optional().default(50),
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
  actionItemPriorities: z.array(PrioritySchema).optional(),
});

const FiveGradeSimulationSchema = z.object({
  subject: z.string().min(1),
  currentGrade: z.number(),
  simulatedGrade: z.number(),
  interpretation: z.string().min(1),
  percentileCumulative: z.number().optional(),
});

const SmallClassSubjectAnalysisSchema = z.object({
  subject: z.string().min(1),
  enrollmentSize: z.number().int(),
  achievementLevel: z.string().min(1),
  grade: z.string().optional(),
  interpretation: z.string().min(1),
});

export const AcademicAnalysisSectionSchema = z.object({
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
  improvementPriority: z.array(z.string().min(1)).optional(),
  // v4
  detailedGradeTable: z
    .array(
      z.object({
        subject: z.string().min(1),
        year: z.number().int(),
        semester: z.number().int(),
        unitCount: z.number().int(),
        rawScore: z.number(),
        classAverage: z.number(),
        stdDev: z.number(),
        achievementLevel: z.string().min(1),
        studentCount: z.number().int(),
        grade: z.number(),
      })
    )
    .optional(),
  combinationTrends: z
    .array(
      z.object({
        combination: z.string().min(1),
        trendData: z.array(
          z.object({
            year: z.number().int(),
            semester: z.number().int(),
            avg: z.number(),
          })
        ),
        trend: z.enum(["상승", "유지", "하락"]),
      })
    )
    .optional(),
  subjectTrends: z
    .array(
      z.object({
        subject: z.string().min(1),
        dataPoints: z.array(
          z.object({
            year: z.number().int(),
            semester: z.number().int(),
            grade: z.number(),
          })
        ),
      })
    )
    .optional(),
  subjectBenchmarks: z
    .array(
      z.object({
        subject: z.string().min(1),
        myGrade: z.number(),
        estimatedTargetAvg: z.number(),
        estimatedOverallAvg: z.number(),
      })
    )
    .optional(),
  gradeStrengths: z.array(z.string().min(1)).optional(),
  gradeWeaknesses: z.array(z.string().min(1)).optional(),
  characterLabel: CharacterLabelSchema.optional(),
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

export const CourseAlignmentSectionSchema = z.object({
  sectionId: z.literal("courseAlignment"),
  title: z.string().min(1),
  targetMajor: z.string().min(1),
  matchRate: z.number().min(0).max(100),
  courses: z.array(CourseMatchDetailSchema).min(1),
  missingCourseImpact: z.string().min(1),
  recommendation: z.string().optional(),
  medicalRequirements: z.array(MedicalRequirementSchema).optional(),
  // v4
  matchRateComparison: BenchmarkComparisonSchema.optional(),
  requiredMatchRate: z.number().min(0).max(100).optional(),
  recommendedMatchRate: z.number().min(0).max(100).optional(),
  missingCourseImpactScore: z.number().min(0).max(100).optional(),
  courseActionPlan: z
    .array(
      z.object({
        course: z.string().min(1),
        priority: PrioritySchema,
        actionItem: z.string().min(1),
        expectedImpact: z.string().min(1),
      })
    )
    .optional(),
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

export const AttendanceAnalysisSectionSchema = z.object({
  sectionId: z.literal("attendanceAnalysis"),
  title: z.string().min(1),
  summaryByYear: z.array(AttendanceSummarySchema).min(1),
  overallRating: z.enum(["우수", "보통", "주의", "경고"]),
  impactAnalysis: z.string().min(1),
  integrityContribution: z.string().min(1),
  improvementAdvice: z.string().optional(),
  // v4
  comparisonData: BenchmarkComparisonSchema.optional(),
  integrityScore: z.number().min(0).max(100).optional(),
  estimatedDeduction: z
    .object({
      deductionPoints: z.number(),
      rationale: z.string().min(1),
    })
    .optional(),
});

// ─── 섹션 9: 창체 활동 분석 ───

const ActivityYearlyAnalysisSchema = z.object({
  year: z.number().int().min(1).max(3),
  summary: z.string().min(1),
  rating: SubjectRatingSchema,
  competencyTags: z.array(CompetencyTagSchema),
  ratingRationale: z.string().optional(),
});

const KeyActivitySchema = z.object({
  activity: z.string().min(1),
  evaluation: z.string().min(1),
  competencyTags: z.array(CompetencyTagSchema),
});

const TieredAssessmentSchema = z.object({
  excellent: z.object({
    items: z.array(z.string()),
    quotes: z.array(OriginalTextCitationSchema),
  }),
  good: z.object({
    items: z.array(z.string()),
    quotes: z.array(OriginalTextCitationSchema),
  }),
  needsImprovement: z.object({
    items: z.array(z.string()),
    quotes: z.array(OriginalTextCitationSchema),
    improvementTable: z.array(
      z.object({
        area: z.string().min(1),
        currentState: z.string().min(1),
        suggestion: z.string().min(1),
      })
    ),
  }),
});

const ActivityTypeAnalysisSchema = z.object({
  type: z.string().min(1),
  yearlyAnalysis: z.array(ActivityYearlyAnalysisSchema).min(1),
  overallComment: z.string().min(1),
  volumeAssessment: z.string().optional(),
  fillRate: z
    .object({
      total: z.number().min(0).max(100),
      personal: z.number().min(0).max(100),
    })
    .optional(),
  yearlyDetails: z
    .array(
      z.object({
        grade: z.number().int().min(1).max(3),
        summary: z.string().min(1),
        keyActivities: z.array(z.string().min(1)),
        evaluation: z.string().min(1),
      })
    )
    .optional(),
  keyActivities: z.array(KeyActivitySchema).optional(),
  improvementDirection: z.string().optional(),
  // v4
  tieredAssessment: TieredAssessmentSchema.optional(),
  volumeMetric: VolumeMetricSchema.optional(),
  characterLabel: CharacterLabelSchema.optional(),
  activityLevelComparison: BenchmarkComparisonSchema.optional(),
});

const LeadershipQuantitativeSchema = z.object({
  totalPositions: z.number().int().min(0),
  positionsByYear: z.array(
    z.object({
      grade: z.number().int().min(1).max(3),
      positions: z.array(z.string().min(1)),
    })
  ),
  leadershipRate: z.number().min(0).max(100),
});

export const ActivityAnalysisSectionSchema = z.object({
  sectionId: z.literal("activityAnalysis"),
  title: z.string().min(1),
  curriculumVersion: z.enum(["2015", "2022"]),
  activities: z.array(ActivityTypeAnalysisSchema).min(1),
  overallComment: z.string().min(1),
  leadershipQuantitative: LeadershipQuantitativeSchema.optional(),
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
  // v4
  tierRating: ThreeTierRatingSchema.optional(),
  competencyMatrix: z
    .array(
      z.object({
        dimension: z.string().min(1),
        rating: ThreeTierRatingSchema,
        evidence: z.string().optional(),
      })
    )
    .optional(),
  citationAnalysis: z.array(OriginalTextCitationSchema).optional(),
  volumeMetric: VolumeMetricSchema.optional(),
});

const SubjectGroupMatrixSchema = z.object({
  group: z.string().min(1),
  적극성: ThreeTierRatingSchema,
  탐구정신: ThreeTierRatingSchema,
  전공진로탐색: ThreeTierRatingSchema,
  협력성: ThreeTierRatingSchema,
});

export const SubjectAnalysisSectionSchema = z.object({
  sectionId: z.literal("subjectAnalysis"),
  title: z.string().min(1),
  subjects: z.array(SubjectAnalysisItemSchema).min(1),
  // v4
  subjectGroupMatrix: z.array(SubjectGroupMatrixSchema).optional(),
  summaryDashboard: z
    .object({
      totalSubjects: z.number().int(),
      excellentCount: z.number().int(),
      goodCount: z.number().int(),
      averageCount: z.number().int(),
      weakCount: z.number().int(),
      overallQualityScore: z.number().min(0).max(100),
    })
    .optional(),
  characterLabel: CharacterLabelSchema.optional(),
});

// ─── 섹션 11: 행동특성 분석 ───

const BehaviorYearAnalysisSchema = z.object({
  year: z.number().int().min(1).max(3),
  summary: z.string().min(1),
  competencyTags: z.array(CompetencyTagSchema),
  keyQuotes: z.array(z.string()).optional(),
});

export const BehaviorAnalysisSectionSchema = z.object({
  sectionId: z.literal("behaviorAnalysis"),
  title: z.string().min(1),
  yearlyAnalysis: z.array(BehaviorYearAnalysisSchema).min(1),
  consistentTraits: z.array(z.string().min(1)).min(1),
  overallComment: z.string().min(1),
  admissionRelevance: z.string().min(1),
  // v4
  characterLabel: CharacterLabelSchema.optional(),
  citationAnalysis: z.array(OriginalTextCitationSchema).optional(),
  personalityScore: z.number().min(0).max(100).optional(),
  personalityComparison: BenchmarkComparisonSchema.optional(),
  personalityKeywords: z.array(z.string().min(1)).optional(),
});

// ─── 섹션 12: 기록 충실도 종합 ───

// ============================================================
// Part 3: 전략 스키마
// ============================================================

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
  // v4
  recordSource: z.string().optional(),
  detailedStrategy: z.string().optional(),
  actionItems: z.array(z.string().min(1)).optional(),
  tierRating: ThreeTierRatingSchema.optional(),
  improvementTable: z
    .object({
      currentState: z.string().min(1),
      targetState: z.string().min(1),
      specificAction: z.string().min(1),
      timeline: z.string().min(1),
      expectedOutcome: z.string().min(1),
    })
    .optional(),
  relatedSubjects: z.array(z.string().min(1)).optional(),
  expectedScoreImpact: z
    .object({
      category: z.string().min(1),
      currentScore: z.number(),
      projectedScore: z.number(),
    })
    .optional(),
});

export const WeaknessAnalysisSectionSchema = z.object({
  sectionId: z.literal("weaknessAnalysis"),
  title: z.string().min(1),
  areas: z.array(WeaknessAreaSchema).min(3),
  // v4
  tierSummary: z
    .object({
      excellent: z.number().int(),
      good: z.number().int(),
      needsImprovement: z.number().int(),
    })
    .optional(),
});

// ─── 섹션 14: 세특 주제 추천 ───

const ActivityDesignSchema = z.object({
  steps: z.array(z.string().min(1)).min(1),
  duration: z.string().optional().default(""),
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
  // v4
  keywordSuggestions: z.array(z.string().min(1)).optional(),
  difficulty: z.enum(["기본", "심화", "도전"]).optional(),
  estimatedDuration: z.string().optional(),
  synergyScore: z.number().min(0).max(100).optional(),
  importance: PrioritySchema.optional(),
});

export const TopicRecommendationSectionSchema = z.object({
  sectionId: z.literal("topicRecommendation"),
  title: z.string().min(1),
  topics: z.array(TopicRecommendationItemSchema).min(3),
  // v4
  subjectKeywordTable: z
    .array(
      z.object({
        subject: z.string().min(1),
        keywords: z.array(z.string().min(1)),
        topicCount: z.number().int(),
      })
    )
    .optional(),
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
  // v4
  difficulty: z.enum(["상", "중", "하"]).optional(),
  frequency: z.enum(["높음", "보통", "낮음"]).optional(),
  relatedCitation: OriginalTextCitationSchema.optional(),
  answerKeywords: z.array(z.string().min(1)).optional(),
  importance: PrioritySchema.optional(),
});

export const InterviewPrepSectionSchema = z.object({
  sectionId: z.literal("interviewPrep"),
  title: z.string().min(1),
  questions: z.array(InterviewQuestionSchema).min(3),
  // v4
  questionDistribution: z
    .array(
      z.object({
        type: z.string().min(1),
        count: z.number().int(),
      })
    )
    .optional(),
  readinessScore: z.number().min(0).max(100).optional(),
});

// ─── 섹션 16: 입시 전략 + 대학 추천 ───

const CardAdmissionInfoSchema = z.object({
  admissionType: z.string().min(1),
  chance: AdmissionChanceSchema,
  chanceRationale: z.string().min(1),
  chancePercentLabel: z.string().optional(),
});

const UniversityCardSchema = z.object({
  university: z.string().min(1),
  department: z.string().min(1),
  riskLevel: z.enum(["위험", "안정"]).optional(),
  comprehensive: CardAdmissionInfoSchema,
  subject: CardAdmissionInfoSchema.optional(),
});

const SimulationGroupSchema = z.object({
  type: z.enum(["위험형", "안정형"]).optional(),
  description: z.string().min(1),
  cards: z.array(UniversityCardSchema).min(1).max(6),
});

const AdmissionTypeStrategySchema = z.object({
  type: z.enum(["학종", "교과", "논술", "실기/실적"]),
  analysis: z.string().min(1),
  suitability: z.enum(["적합", "보통", "부적합"]),
  reason: z.string().min(1),
});

const SchoolTypeAnalysisSchema = z.object({
  cautionTypes: z.array(z.string()),
  advantageTypes: z.array(z.string()),
  rationale: z.string(),
});

const UniversityGuideMatchingSchema = z.object({
  university: z.string().min(1),
  emphasisKeywords: z.array(z.string().min(1)).optional().default([]),
  studentStrengthMatch: z.array(z.string().min(1)).optional().default([]),
  studentWeaknessMatch: z.array(z.string().min(1)).optional().default([]),
});

export const AdmissionStrategySectionSchema = z.object({
  sectionId: z.literal("admissionStrategy"),
  title: z.string().min(1),
  recommendedAdmissionType: z.string().min(1).optional(),
  recommendedPath: z.string().min(1),
  simulations: z.union([
    z.tuple([SimulationGroupSchema]),
    z.tuple([SimulationGroupSchema, SimulationGroupSchema]),
    z.array(SimulationGroupSchema).min(1).max(2),
  ]),
  typeStrategies: z.array(AdmissionTypeStrategySchema).optional(),
  schoolTypeAnalysis: SchoolTypeAnalysisSchema.optional(),
  universityGuideMatching: z.array(UniversityGuideMatchingSchema).optional(),
  nextSemesterStrategy: z.string().optional(),
});

// ─── 고1 전용: 방향 설정 가이드 ───

export const DirectionGuideSectionSchema = z.object({
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

export const StoryAnalysisSectionSchema = z.object({
  sectionId: z.literal("storyAnalysis"),
  title: z.string().min(1),
  mainStoryline: z.string().min(1),
  yearProgressions: z.array(YearProgressionSchema).min(1),
  careerConsistencyGrade: CompetencyGradeSchema,
  careerConsistencyComment: z.string().min(1),
  crossSubjectLinks: z.array(CrossSubjectLinkSchema).optional(),
  storyEnhancementSuggestions: z.array(z.string().min(1)).optional(),
  interviewStoryGuide: z.string().optional(),
  // v4
  timeline: z
    .array(
      z.object({
        year: z.number().int(),
        semester: z.number().int(),
        events: z.array(
          z.object({
            category: z.string().min(1),
            title: z.string().min(1),
            competencyTags: z.array(CompetencyTagSchema),
          })
        ),
      })
    )
    .optional(),
  storyCompletenessScore: z.number().min(0).max(100).optional(),
  storyGaps: z
    .array(
      z.object({
        gap: z.string().min(1),
        suggestion: z.string().min(1),
        priority: PrioritySchema,
      })
    )
    .optional(),
  characterLabel: CharacterLabelSchema.optional(),
});

// ─── 섹션 18: 실행 로드맵 ───

const EvaluationWritingGuideSchema = z.object({
  structure: z.array(z.string().min(1)).min(1),
  goodExample: z.string().min(1),
  badExample: z.string().min(1),
});

export const ActionRoadmapSectionSchema = z.object({
  sectionId: z.literal("actionRoadmap"),
  title: z.string().min(1),
  completionStrategy: z.string().min(1),
  prewriteProposals: z.array(z.string().min(1)).optional(),
  evaluationWritingGuide: EvaluationWritingGuideSchema.optional(),
  interviewTimeline: z.string().optional(),
  // v4
  milestones: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        deadline: z.string().min(1),
        category: z.string().min(1),
        priority: PrioritySchema,
        subtasks: z.array(z.string().min(1)),
        estimatedImpact: z.string().min(1),
      })
    )
    .optional(),
  weeklyPlan: z
    .array(
      z.object({
        week: z.number().int(),
        focusArea: z.string().min(1),
        tasks: z.array(z.string().min(1)),
      })
    )
    .optional(),
  projectedOutcome: z
    .array(
      z.object({
        category: z.string().min(1),
        currentScore: z.number(),
        projectedScore: z.number(),
      })
    )
    .optional(),
});

// ============================================================
// 부록 스키마
// ============================================================

// ─── 섹션 19: 추천 도서 ───

// ─── AI 전공 추천 ───

const MajorSuggestionSchema = z.object({
  major: z.string().min(1),
  university: z.string().optional(),
  fitScore: z.number().min(0).max(100),
  rationale: z.string().min(1),
  strengthMatch: z.array(z.string().min(1)).min(1),
  gapAnalysis: z.string().optional(),
  // v4
  fitComparison: BenchmarkComparisonSchema.optional(),
  relatedGradePerformance: z
    .array(
      z.object({
        subject: z.string().min(1),
        grade: z.number(),
        assessment: ThreeTierRatingSchema,
      })
    )
    .optional(),
});

export const MajorExplorationSectionSchema = z.object({
  sectionId: z.literal("majorExploration"),
  title: z.string().min(1),
  currentTargetAssessment: z.string().optional(),
  suggestions: z.array(MajorSuggestionSchema).min(3),
});

// ─── 전임 컨설턴트 총평 ───

const EvaluationGuideSchema = z.object({
  majorFit: z.string().min(1),
  academicAbility: z.string().min(1),
  inquiryAbility: z.string().min(1),
  growthPotential: z.string().min(1),
  keyInsights: z.string().min(1),
});

export const ConsultantReviewSectionSchema = z.object({
  sectionId: z.literal("consultantReview"),
  title: z.string().min(1),
  gradeAnalysis: z.string().min(1),
  courseEffort: z.string().min(1),
  admissionStrategy: z.string().min(1),
  completionDirection: z.string().optional(),
  finalAdvice: z.string().min(1),
  evaluationGuide: EvaluationGuideSchema.optional(),
});

// ─── 비교과 경쟁력 정밀 분석 ───

const NonAcademicLevelSchema = z.enum([
  "상위권",
  "중상위권",
  "중위권",
  "중하위권",
  "하위권",
]);
const ActivityConnectivitySchema = z.enum(["있음", "보통", "없음"]);

export const CompetitiveProfilingSectionSchema = z.object({
  sectionId: z.literal("competitiveProfiling"),
  title: z.string().min(1),
  level: NonAcademicLevelSchema,
  majorDirection: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1).max(5),
  connectivity: ActivityConnectivitySchema,
  score: z.number().int().min(0).max(100),
});

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

export const ReportMetaSchema = z.object({
  reportId: z.string().min(1),
  plan: z.enum(["lite", "standard", "premium"]),
  studentInfo: StudentInfoSchema,
  createdAt: z.string().datetime(),
  version: z.number().int().min(1),
});

export const ReportSectionSchema = z.discriminatedUnion("sectionId", [
  StudentProfileSectionSchema,
  CompetencyScoreSectionSchema,
  AdmissionPredictionSectionSchema,
  AcademicAnalysisSectionSchema,
  CourseAlignmentSectionSchema,
  AttendanceAnalysisSectionSchema,
  ActivityAnalysisSectionSchema,
  SubjectAnalysisSectionSchema,
  BehaviorAnalysisSectionSchema,
  WeaknessAnalysisSectionSchema,
  TopicRecommendationSectionSchema,
  InterviewPrepSectionSchema,
  AdmissionStrategySectionSchema,
  DirectionGuideSectionSchema,
  StoryAnalysisSectionSchema,
  ActionRoadmapSectionSchema,
  CompetitiveProfilingSectionSchema,
  MajorExplorationSectionSchema,
  ConsultantReviewSectionSchema,
]);

export const ReportContentSchema = z.object({
  meta: ReportMetaSchema,
  sections: z.array(ReportSectionSchema).min(5),
});

// ============================================================
// 플랜별 검증 함수
// ============================================================

/**
 * 플랜별 필수 필드 검증
 * AI 출력 검증 시 플랜에 맞는 필드 존재 여부를 확인한다.
 */
export const validateByPlan = (content: ReportContent): string[] => {
  const { plan } = content.meta;
  const errors: string[] = [];

  // ── 섹션 구성 검증 ──
  const expectedSections = SECTION_ORDER[plan];
  const actualSectionIds: string[] = content.sections.map((s) => s.sectionId);

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

  // ── Standard/Premium 필수 필드 검증 ──
  if (plan === "standard" || plan === "premium") {
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

    if (!actualSectionIds.includes("admissionPrediction")) {
      errors.push("Standard 이상: admissionPrediction 섹션 필수");
    }
    // storyAnalysis 제외됨 (피드백 반영)
    if (!actualSectionIds.includes("actionRoadmap")) {
      errors.push("Standard 이상: actionRoadmap 섹션 필수");
    }
    if (!actualSectionIds.includes("behaviorAnalysis")) {
      errors.push("Standard 이상: behaviorAnalysis 섹션 필수");
    }
    if (!actualSectionIds.includes("courseAlignment")) {
      errors.push("Standard 이상: courseAlignment 섹션 필수");
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

    if (!actualSectionIds.includes("majorExploration")) {
      errors.push("Premium: majorExploration 섹션 필수");
    }
  }

  return errors;
};
