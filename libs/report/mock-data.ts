// ============================================================
// 리포트 Mock 데이터 (v4)
//
// 학생: 김민수, 고2, 이과, 일반고, 목표: 서울대 컴퓨터공학과
// 3개 플랜별 완전한 mock 데이터 제공
// v4: 벤치마크 비교, 원문 인용, 캐릭터 라벨 등 추가
// ============================================================

import type {
  ReportContent,
  StudentProfileSection,
  CompetencyScoreSection,
  AdmissionPredictionSection,
  AcademicAnalysisSection,
  CourseAlignmentSection,
  AttendanceAnalysisSection,
  ActivityAnalysisSection,
  SubjectAnalysisSection,
  BehaviorAnalysisSection,
  WeaknessAnalysisSection,
  TopicRecommendationSection,
  InterviewPrepSection,
  AdmissionStrategySection,
  StoryAnalysisSection,
  ActionRoadmapSection,
  MajorExplorationSection,
  ReportMeta,
} from "./types";

// ============================================================
// 공통 메타 정보
// ============================================================

const BASE_STUDENT_INFO = {
  name: "김민수",
  grade: 2 as const,
  isGraduate: false,
  track: "이과" as const,
  schoolType: "일반고" as const,
  targetUniversity: "서울대학교",
  targetDepartment: "컴퓨터공학과",
  hasMockExamData: true,
};

// ============================================================
// Part 1: 진단
// ============================================================

// ─── 섹션 1: 학생 프로필 ───

const studentProfile: StudentProfileSection = {
  sectionId: "studentProfile",
  title: "학생 프로필",
  typeName: "논리형 탐구러",
  typeDescription:
    "수학적 사고력과 알고리즘 설계 역량이 뛰어나며, 문제 해결 과정에서 체계적이고 분석적인 접근을 선호하는 학생입니다. 코딩과 수학을 접목한 융합 탐구에 강점을 보입니다.",
  radarChart: {
    academic: 82,
    career: 78,
    community: 65,
    growth: 75,
  },
  tags: ["알고리즘", "수학적 사고", "자기주도 탐구", "코딩 역량"],
  catchPhrase: "코드로 문제를 풀고, 수학으로 세상을 설계하는 논리형 탐구러",
  // v4
  radarChartComparison: {
    academic: {
      myValue: 82,
      targetRangeAvg: 85,
      overallAvg: 68,
      estimationBasis: "AI 추정 (서울대 컴퓨터공학과 지원자 기준)",
    },
    career: {
      myValue: 78,
      targetRangeAvg: 80,
      overallAvg: 62,
      estimationBasis: "AI 추정",
    },
    community: {
      myValue: 65,
      targetRangeAvg: 75,
      overallAvg: 60,
      estimationBasis: "AI 추정",
    },
    growth: {
      myValue: 75,
      targetRangeAvg: 78,
      overallAvg: 65,
      estimationBasis: "AI 추정",
    },
  },
  percentileLabel: "상위 22%",
  typeStrengths: ["알고리즘 설계 역량", "수학-IT 융합 사고"],
  typeWeaknesses: ["공동체 활동 부족", "인문학적 소양 미비"],
};

// ─── 섹션 2: 역량 정량 스코어 ───

const competencyScoreLite: CompetencyScoreSection = {
  sectionId: "competencyScore",
  title: "역량 정량 스코어",
  totalScore: 225,
  growthGrade: "B",
  growthComment:
    "1학년 대비 2학년에서 전공 관련 교과 성적과 탐구 활동이 눈에 띄게 성장하였으며, 자기주도적 학습 태도가 형성되고 있습니다.",
  scores: [
    {
      category: "academic",
      label: "학업 역량",
      score: 82,
      maxScore: 100,
      grade: "A",
      gradeComment:
        "교과 성적이 전반적으로 우수하며, 특히 수학과 정보 교과에서 상위권을 유지하고 있습니다. 탐구 교과에서도 적극적인 학습 태도를 보이고 있으나, 국어와 한국사 교과의 편차가 다소 존재하여 보완이 필요합니다.",
      subcategories: [
        {
          name: "교과 성취도",
          score: 85,
          maxScore: 100,
          comment: "주요 교과 평균 2.1등급으로 상위권 유지",
        },
        {
          name: "탐구 역량",
          score: 78,
          maxScore: 100,
          comment:
            "정보 교과에서 독립적 프로젝트 수행 경험이 있으나 깊이 보완 필요",
        },
        {
          name: "세특 충실도",
          score: 80,
          maxScore: 100,
          comment:
            "전공 관련 교과 세특은 우수하나, 비전공 교과 서술이 다소 평이함",
        },
      ],
    },
    {
      category: "career",
      label: "진로 역량",
      score: 78,
      maxScore: 100,
      grade: "B",
      gradeComment:
        "컴퓨터공학이라는 진로 방향이 1학년부터 일관되게 유지되고 있으며, 코딩 동아리와 세특 활동에서 전공 적합성이 돋보입니다. 다만 외부 활동 연계나 심화 진로 탐색이 다소 부족하여, 보다 구체적인 진로 연계 경험을 확보할 필요가 있습니다.",
      subcategories: [
        {
          name: "전공 적합성",
          score: 82,
          maxScore: 100,
          comment:
            "컴퓨터공학 관련 활동(코딩, 알고리즘 대회)이 일관되게 기록됨",
        },
        {
          name: "진로 탐색 활동",
          score: 75,
          maxScore: 100,
          comment:
            "동아리와 세특을 통한 진로 탐색은 있으나 외부 활동 연계가 부족",
        },
        {
          name: "진로 일관성",
          score: 78,
          maxScore: 100,
          comment: "1학년부터 IT 분야에 대한 관심이 꾸준히 드러나고 있음",
        },
      ],
    },
    {
      category: "community",
      label: "공동체 역량",
      score: 65,
      maxScore: 100,
      grade: "C",
      gradeComment:
        "학교 내 소규모 프로젝트에서 기술적 역할을 수행하고 있으나, 공식적인 리더 경험이나 진로 연계 봉사 활동이 부족합니다. 3학년에서 학급 임원이나 동아리 부장 역할을 맡고, 코딩 교육 봉사를 시작하여 공동체 역량을 적극적으로 보강해야 합니다.",
      subcategories: [
        {
          name: "리더십",
          score: 60,
          maxScore: 100,
          comment: "소규모 프로젝트 리더 경험은 있으나 공식적 리더 역할 부족",
        },
        {
          name: "협업 능력",
          score: 68,
          maxScore: 100,
          comment:
            "팀 프로젝트에서 기술적 역할을 주로 담당하며 조율 역할은 제한적",
        },
        {
          name: "봉사 및 나눔",
          score: 62,
          maxScore: 100,
          comment: "진로 연계 봉사 경험이 부족하여 인성 영역 보완이 필요",
        },
      ],
    },
  ],
  interpretation:
    "학업 역량과 진로 역량에서 강점을 보이나, 공동체 역량이 상대적으로 약합니다. 리더십과 봉사 활동을 통해 균형 잡힌 역량 프로필을 만들 필요가 있습니다.",
};

const competencyScoreStandard: CompetencyScoreSection = {
  ...competencyScoreLite,
  percentile: 78,
  percentileLabel: "상위 22%",
  comparison: {
    myScore: 225,
    targetRangeAvg: 250,
    overallAvg: 195,
  },
  // v4
  scoreComparisons: [
    {
      myValue: 82,
      targetRangeAvg: 88,
      overallAvg: 70,
      estimationBasis: "AI 추정 (서울대 컴퓨터공학과 지원 적정구간)",
    },
    {
      myValue: 78,
      targetRangeAvg: 82,
      overallAvg: 65,
      estimationBasis: "AI 추정",
    },
    {
      myValue: 65,
      targetRangeAvg: 80,
      overallAvg: 60,
      estimationBasis: "AI 추정",
    },
  ],
  scoreBand: {
    label: "소신",
    rangeMin: 220,
    rangeMax: 240,
    description:
      "지원 적정구간(240~270) 하단에 근접. 공동체 역량 보강 시 적정구간 진입 가능",
  },
  subcategoryComparisons: [
    { name: "교과 성취도", myScore: 85, maxScore: 100, estimatedAvg: 75 },
    { name: "탐구 역량", myScore: 78, maxScore: 100, estimatedAvg: 68 },
    { name: "리더십", myScore: 60, maxScore: 100, estimatedAvg: 72 },
  ],
};

// ─── 섹션 3: 합격 예측 ───

const admissionPredictionLite: AdmissionPredictionSection = {
  sectionId: "admissionPrediction",
  title: "희망 학교·학과 판단",
  recommendedType: "학종",
  recommendedTypeReason:
    "컴퓨터공학 관련 세특 활동과 탐구 경험이 풍부하여 학생부종합전형에서 전공 적합성을 어필할 수 있습니다. 내신 2.1등급으로 교과전형 상위권 대학 지원은 다소 어려우나, 활동 기반 평가에서 강점을 발휘할 수 있습니다.",
  predictions: [
    {
      admissionType: "학종",
      passRateLabel: "55~65%",
      passRateRange: [55, 65],
      analysis:
        "세특 활동의 전공 적합성이 높고 탐구 역량이 우수하여 학종에서 경쟁력이 있으나, 공동체 역량 보완이 필요합니다.",
    },
    {
      admissionType: "교과",
      passRateLabel: "30~40%",
      passRateRange: [30, 40],
      analysis:
        "내신 2.1등급은 서울대 교과전형 합격선(1.5등급 이내)에 미달하여 교과전형으로의 지원은 권장하지 않습니다.",
    },
  ],
  overallComment:
    "학생부종합전형을 주력으로 준비하되, 3학년 1학기 세특 보강과 공동체 활동 강화에 집중하면 합격 가능성을 높일 수 있습니다.",
};

const admissionPredictionStandard: AdmissionPredictionSection = {
  ...admissionPredictionLite,
  predictions: admissionPredictionLite.predictions.map((p) => ({
    ...p,
    universityPredictions:
      p.admissionType === "학종"
        ? [
            {
              university: "서울대학교",
              department: "컴퓨터공학과",
              chance: "medium" as const,
              rationale:
                "전공 적합성은 우수하나 내신과 공동체 역량 보완 시 경쟁력 상승",
            },
            {
              university: "KAIST",
              department: "전산학부",
              chance: "medium" as const,
              rationale: "알고리즘 대회 경험과 수학 역량이 긍정적 평가 요소",
            },
            {
              university: "고려대학교",
              department: "컴퓨터학과",
              chance: "high" as const,
              rationale:
                "현재 스펙으로 안정적 합격 가능, 활동 우수형 전형 적합",
            },
          ]
        : undefined,
  })),
  // v4
  riskBands: [
    {
      admissionType: "학종",
      band: "소신",
      rationale:
        "전공 적합성 우수하나 공동체 역량이 지원 적정구간 평균 대비 부족",
    },
    {
      admissionType: "교과",
      band: "도전",
      rationale: "내신 2.1등급은 서울대 교과전형 합격선(1.5등급)에 미달",
    },
  ],
  detailedUniversityPredictions: [
    {
      university: "서울대학교",
      department: "컴퓨터공학과",
      admissionType: "학종",
      band: "소신",
      passRateRange: [55, 65],
      comparisonBar: {
        myValue: 225,
        targetRangeAvg: 250,
        overallAvg: 195,
        estimationBasis: "AI 추정 (역량 점수 기준)",
      },
      keyFactors: [
        { factor: "전공 적합성", impact: "positive" },
        { factor: "알고리즘 탐구 역량", impact: "positive" },
        { factor: "공동체 역량", impact: "negative" },
        { factor: "인문 교과 연계", impact: "negative" },
      ],
      rationale:
        "전공 관련 활동은 우수하나 서울대가 중시하는 균형 잡힌 인재상에 도달하려면 공동체 역량 보강 필요",
    },
    {
      university: "고려대학교",
      department: "컴퓨터학과",
      admissionType: "학종",
      band: "안정",
      passRateRange: [75, 85],
      keyFactors: [
        { factor: "전공 적합성", impact: "positive" },
        { factor: "내신 성적", impact: "positive" },
        { factor: "활동 다양성", impact: "neutral" },
      ],
      rationale: "현재 역량으로 안정적 합격 가능, 학업우수형 전형에 매우 적합",
    },
  ],
  typeSuitabilityScores: [
    { type: "학종", score: 78 },
    { type: "교과", score: 52 },
    { type: "정시", score: 65 },
  ],
};

// ============================================================
// Part 2: 분석
// ============================================================

// ─── 섹션 6: 성적 분석 ───

const academicAnalysisLite: AcademicAnalysisSection = {
  sectionId: "academicAnalysis",
  title: "성적 분석",
  overallAverageGrade: 2.1,
  gradesByYear: [
    { year: 1, semester: 1, averageGrade: 2.5 },
    { year: 1, semester: 2, averageGrade: 2.3 },
    { year: 2, semester: 1, averageGrade: 1.9 },
    { year: 2, semester: 2, averageGrade: 1.8 },
  ],
  subjectCombinations: [
    { combination: "수학+정보+물리", averageGrade: 1.7 },
    { combination: "국영수 주요 교과", averageGrade: 2.0 },
    { combination: "전 교과", averageGrade: 2.1 },
  ],
  gradeTrend: "상승",
  subjectGrades: [
    {
      subject: "수학Ⅱ",
      year: 2,
      semester: 1,
      grade: 1,
      rawScore: 95,
      classAverage: 65,
      standardDeviation: 15,
      studentCount: 120,
    },
    {
      subject: "미적분",
      year: 2,
      semester: 2,
      grade: 2,
      rawScore: 88,
      classAverage: 62,
      standardDeviation: 14,
      studentCount: 118,
    },
    {
      subject: "정보",
      year: 2,
      semester: 1,
      grade: 1,
      rawScore: 97,
      classAverage: 70,
      standardDeviation: 12,
      studentCount: 115,
    },
    {
      subject: "물리학Ⅰ",
      year: 2,
      semester: 1,
      grade: 2,
      rawScore: 90,
      classAverage: 68,
      standardDeviation: 13,
      studentCount: 110,
    },
    {
      subject: "영어Ⅱ",
      year: 2,
      semester: 1,
      grade: 2,
      rawScore: 91,
      classAverage: 72,
      standardDeviation: 11,
      studentCount: 122,
    },
    {
      subject: "국어",
      year: 2,
      semester: 1,
      grade: 3,
      rawScore: 82,
      classAverage: 70,
      standardDeviation: 12,
      studentCount: 122,
    },
    {
      subject: "화학Ⅰ",
      year: 2,
      semester: 1,
      grade: 2,
      rawScore: 89,
      classAverage: 67,
      standardDeviation: 13,
      studentCount: 108,
    },
    {
      subject: "한국사",
      year: 2,
      semester: 1,
      grade: 3,
      rawScore: 80,
      classAverage: 72,
      standardDeviation: 10,
      studentCount: 122,
    },
  ],
  interpretation:
    "1학년 대비 2학년 성적이 꾸준히 상승하고 있으며, 특히 전공 관련 교과(수학, 정보)에서 1등급을 기록하여 전공 적합성이 높습니다. 다만 국어와 한국사 등 인문 교과가 3등급대로 교과 균형을 맞출 필요가 있습니다.",
};

const academicAnalysisStandard: AcademicAnalysisSection = {
  ...academicAnalysisLite,
  subjectStatAnalyses: [
    {
      subject: "수학Ⅱ",
      year: 2,
      semester: 1,
      zScore: 2.0,
      percentileEstimate: 97,
      interpretation:
        "원점수 95점으로 학급 평균 대비 2 표준편차 이상 높아 최상위권 성취를 보임",
    },
    {
      subject: "정보",
      year: 2,
      semester: 1,
      zScore: 2.25,
      percentileEstimate: 99,
      interpretation:
        "원점수 97점으로 전교 최상위 수준이며, z-score 기준 매우 우수한 성취",
    },
  ],
  gradeDeviationAnalysis: {
    highestSubject: "정보",
    lowestSubject: "국어",
    deviationRange: 2,
    riskAssessment:
      "전공 교과와 비전공 교과 간 2등급 편차는 학종 평가에서 '학업 성실성' 항목에서 감점 요인이 될 수 있습니다. 국어, 한국사 등 인문 교과를 2등급대로 끌어올리는 것이 중요합니다.",
  },
  majorRelevanceAnalysis: {
    enrollmentEffort:
      "컴퓨터공학 관련 권장 교과(정보, 수학, 물리)를 모두 이수하고 있으며, 진로선택 과목인 인공지능 수학도 이수하여 적극적인 교과 선택이 돋보임",
    achievement: "전공 관련 교과 평균 1.5등급으로 매우 우수한 성취를 보임",
    recommendedSubjects: ["기하", "프로그래밍"],
  },
  gradeChangeAnalysis: {
    currentTrend: "상승",
    prediction:
      "현재 상승 추세가 유지되면 3학년 1학기에 전 교과 평균 1.8등급 달성이 가능합니다.",
    actionItems: [
      "국어 교과 주 3회 추가 학습 및 비문학 독해 연습",
      "한국사 개념 정리 노트 작성 및 기출 풀이",
      "전 교과 세특에서 진로 연결 활동 기록 강화",
    ],
    actionItemPriorities: ["high", "high", "medium"],
  },
};

const academicAnalysisPremium: AcademicAnalysisSection = {
  ...academicAnalysisStandard,
  fiveGradeSimulation: [
    {
      subject: "수학Ⅱ",
      currentGrade: 1,
      simulatedGrade: 1,
      interpretation: "5등급제 전환 시에도 A등급(상위 10%) 유지가 예상됨",
      percentileCumulative: 10,
    },
    {
      subject: "국어",
      currentGrade: 3,
      simulatedGrade: 2,
      interpretation:
        "5등급제 전환 시 2등급(상위 34% 이내)으로 약간의 이점이 있을 수 있음",
      percentileCumulative: 34,
    },
  ],
  improvementPriority: [
    "국어 교과 2등급 달성",
    "한국사 2등급 달성",
    "전 교과 세특에서 진로 연결점 확보",
  ],
  // v4
  subjectBenchmarks: [
    {
      subject: "수학Ⅱ",
      myGrade: 1,
      estimatedTargetAvg: 1.3,
      estimatedOverallAvg: 3.2,
    },
    {
      subject: "정보",
      myGrade: 1,
      estimatedTargetAvg: 1.5,
      estimatedOverallAvg: 3.5,
    },
    {
      subject: "물리학Ⅰ",
      myGrade: 2,
      estimatedTargetAvg: 1.8,
      estimatedOverallAvg: 3.0,
    },
    {
      subject: "국어",
      myGrade: 3,
      estimatedTargetAvg: 2.0,
      estimatedOverallAvg: 3.1,
    },
  ],
  gradeStrengths: [
    "전공 교과(수학, 정보) 1등급 유지",
    "1학년→2학년 전 교과 성적 상승 추세",
  ],
  gradeWeaknesses: [
    "국어, 한국사 3등급대로 교과 균형 부족",
    "전공-비전공 교과 간 2등급 편차",
  ],
  characterLabel: {
    label: "전공 집중형 학업러",
    rationale: "전공 교과에서 최상위 성취를 보이나 비전공 교과 관리가 과제",
  },
};

// ─── 섹션 7: 권장과목 이수 분석 ───

const courseAlignment: CourseAlignmentSection = {
  sectionId: "courseAlignment",
  title: "권장과목 이수 분석",
  targetMajor: "컴퓨터공학",
  matchRate: 85,
  courses: [
    { course: "정보", status: "이수", importance: "필수" },
    { course: "수학Ⅱ", status: "이수", importance: "필수" },
    { course: "미적분", status: "이수", importance: "필수" },
    { course: "확률과 통계", status: "이수", importance: "필수" },
    { course: "물리학Ⅰ", status: "이수", importance: "권장" },
    { course: "인공지능 수학", status: "이수", importance: "권장" },
    { course: "기하", status: "미이수", importance: "권장" },
    { course: "물리학Ⅱ", status: "미이수", importance: "권장" },
  ],
  missingCourseImpact:
    "기하와 물리학Ⅱ 미이수가 컴퓨터그래픽스, 로보틱스 등 세부 분야 지원 시 약점이 될 수 있으나, 소프트웨어 중심 지원에는 큰 영향이 없습니다.",
  recommendation:
    "3학년에 기하를 추가 이수하면 권장과목 이수율이 92%까지 상승합니다. 물리학Ⅱ는 선택적으로 이수를 고려하세요.",
};

// ─── 섹션 8: 출결 분석 ───

const attendanceAnalysis: AttendanceAnalysisSection = {
  sectionId: "attendanceAnalysis",
  title: "출결 분석",
  summaryByYear: [
    {
      year: 1,
      totalAbsence: 2,
      illness: 2,
      unauthorized: 0,
      etc: 0,
      lateness: 1,
      earlyLeave: 0,
    },
    {
      year: 2,
      totalAbsence: 1,
      illness: 1,
      unauthorized: 0,
      etc: 0,
      lateness: 0,
      earlyLeave: 0,
    },
  ],
  overallRating: "우수",
  impactAnalysis:
    "무단결석·지각·조퇴가 전혀 없으며, 질병 결석도 최소 수준으로 입시에서 출결 관련 감점 요인은 없습니다.",
  integrityContribution:
    "출결 상태가 매우 우수하여 성실성 평가에서 긍정적으로 작용합니다.",
  // v4
  comparisonData: {
    myValue: 3,
    targetRangeAvg: 5,
    overallAvg: 8,
    estimationBasis: "AI 추정 (2년간 총 결석일 기준)",
  },
  integrityScore: 95,
  estimatedDeduction: {
    deductionPoints: 0,
    rationale: "무단 결석 및 지각이 없어 감점 요인이 없습니다.",
  },
};

// ─── 섹션 9: 창체 활동 분석 ───

const activityAnalysisLite: ActivityAnalysisSection = {
  sectionId: "activityAnalysis",
  title: "창체 활동 분석",
  curriculumVersion: "2015",
  activities: [
    {
      type: "자율·자치",
      yearlyAnalysis: [
        {
          year: 1,
          summary:
            "학급 환경 개선 프로젝트에 참여하여 교실 IT 환경 구축을 제안하고 실행",
          rating: "good",
          competencyTags: [
            {
              category: "community",
              subcategory: "협업 능력",
              assessment: "보통",
            },
          ],
          ratingRationale:
            "학급 환경 개선 프로젝트에서 IT 환경 구축을 제안하고 실행한 점은 문제해결능력과 실행력을 보여주나, 프로젝트의 범위가 교실 내로 한정되어 있고 타 학생과의 협업 깊이나 결과물의 구체적 성과가 생기부에 충분히 드러나지 않아 '보통'으로 평가하였습니다.",
        },
        {
          year: 2,
          summary:
            "학교 홈페이지 개선 TF팀에 참여하여 UI/UX 개선안을 제안하고 프로토타입 제작",
          rating: "excellent",
          competencyTags: [
            {
              category: "career",
              subcategory: "전공 적합성",
              assessment: "우수",
            },
            {
              category: "community",
              subcategory: "협업 능력",
              assessment: "보통",
            },
          ],
          ratingRationale:
            "학교 홈페이지의 UI/UX 문제점을 분석하고 프로토타입까지 직접 제작한 점은 전공 적합성과 실행력 모두에서 높은 수준을 보여줍니다. TF팀이라는 공식 조직 내에서 협업한 경험이 있어 공동체 역량도 함께 드러나며, 학교 공동체에 IT 역량으로 기여한 모범적 사례로 '우수'로 평가하였습니다.",
        },
      ],
      overallComment:
        "IT 역량을 학교 공동체에 기여하는 방식으로 발휘하고 있어 긍정적. 공식 리더 역할을 맡으면 더욱 좋겠음.",
    },
    {
      type: "동아리",
      yearlyAnalysis: [
        {
          year: 1,
          summary:
            "코딩 동아리에 가입하여 Python 기초 학습 및 간단한 프로그램 개발",
          rating: "good",
          competencyTags: [
            {
              category: "career",
              subcategory: "전공 적합성",
              assessment: "보통",
            },
          ],
          ratingRationale:
            "코딩 동아리에 자발적으로 가입하여 Python 기초를 학습하고 간단한 프로그램을 개발한 점은 진로 탐색의 시작으로 의미 있으나, 1학년 수준의 기초 활동에 머물러 있어 독창적 성과물이나 심화 탐구가 부족합니다. 동아리 내 역할도 일반 부원 수준이어서 '보통'으로 평가하였습니다.",
        },
        {
          year: 2,
          summary: "코딩 동아리에서 알고리즘 스터디 리드 및 교내 해커톤 참가",
          rating: "excellent",
          competencyTags: [
            {
              category: "academic",
              subcategory: "탐구 역량",
              assessment: "우수",
            },
            {
              category: "career",
              subcategory: "전공 적합성",
              assessment: "우수",
            },
          ],
          ratingRationale:
            "알고리즘 스터디를 직접 리드하며 학습 리더십을 발휘한 점과 교내 해커톤에 참가하여 실전 프로젝트 경험을 쌓은 점이 우수합니다. 1학년 대비 뚜렷한 성장을 보여주며, 전공 적합성과 탐구 역량 모두에서 높은 수준을 달성하여 '우수'로 평가하였습니다.",
        },
      ],
      overallComment:
        "코딩 동아리에서의 성장이 뚜렷하며, 알고리즘 스터디 리드 경험은 리더십으로도 연결 가능. 동아리 부장 역할을 맡는 것을 권장.",
    },
    {
      type: "진로",
      yearlyAnalysis: [
        {
          year: 1,
          summary: "IT 기업 탐방(네이버 본사) 및 진로 체험 활동 참여",
          rating: "average",
          competencyTags: [
            { category: "career", subcategory: "진로 탐색 활동" },
          ],
          ratingRationale:
            "IT 기업 탐방에 참여한 것 자체는 긍정적이나, 단순 견학 수준의 체험에 그치고 있으며 탐방 후 깊이 있는 성찰이나 후속 활동으로 연결되지 않았습니다. 진로 탐색의 초기 단계로 볼 수 있으나 구체성이 부족하여 '보통'으로 평가하였습니다.",
        },
        {
          year: 2,
          summary:
            "소프트웨어 개발자 직업 탐구 보고서 작성 및 AI 관련 진로 특강 참여",
          rating: "good",
          competencyTags: [
            {
              category: "career",
              subcategory: "진로 탐색 활동",
              assessment: "보통",
            },
          ],
          ratingRationale:
            "직업 탐구 보고서를 작성하고 AI 관련 진로 특강에 참여한 점에서 1학년 대비 진로 탐색의 구체성이 향상되었습니다. 다만 보고서의 깊이나 특강 참여 후 후속 탐구 활동이 생기부에 충분히 드러나지 않아 '보통'으로 평가하였습니다.",
        },
      ],
      overallComment:
        "진로 탐색이 점진적으로 심화되고 있으나, 보다 구체적이고 깊이 있는 진로 연계 활동이 필요합니다.",
    },
    {
      type: "봉사",
      yearlyAnalysis: [
        {
          year: 1,
          summary: "학교 주변 환경정화 봉사에 참여 (총 12시간)",
          rating: "average" as const,
          competencyTags: [
            {
              category: "community" as const,
              subcategory: "봉사 및 나눔",
            },
          ],
          ratingRationale:
            "환경정화 봉사에 12시간 참여한 것은 최소 기준은 충족하나, 진로와의 연계성이 전혀 없으며 단순 참여 수준에 머물러 있습니다. 봉사 활동에서 주도적 역할이나 의미 있는 성찰이 드러나지 않아 '보통'으로 평가하였습니다.",
        },
        {
          year: 2,
          summary:
            "교내 도서관 도서 정리 봉사 참여 (총 8시간), 봉사활동의 진로 연계성이 부족",
          rating: "weak" as const,
          competencyTags: [
            {
              category: "community" as const,
              subcategory: "봉사 및 나눔",
              assessment: "부족" as const,
            },
          ],
          ratingRationale:
            "봉사 시간이 1학년 대비 오히려 감소하였으며(12시간→8시간), 활동 내용도 도서 정리라는 단순 업무에 그치고 있습니다. 컴퓨터공학 진로와 연계된 봉사(코딩 교육 등)가 전무하고, 봉사를 통한 성장이나 공동체 기여 의식이 드러나지 않아 '보완필요'로 평가하였습니다.",
        },
      ],
      overallComment:
        "봉사 활동이 단순 참여 수준에 머물러 있으며, 코딩 교육 봉사 등 진로 연계 봉사 경험이 전무합니다. 3학년에 지역 아동센터 코딩 교육 봉사를 시작하여 진로 연계 봉사 기록을 확보해야 합니다.",
    },
  ],
  overallComment:
    "창체 활동에서 컴퓨터공학 진로와의 연결이 꾸준히 유지되고 있으며, 특히 2학년 동아리 활동이 우수합니다. 다만 자율·자치에서 공식 리더 역할이 없는 점과 봉사 활동의 진로 연계성 부족이 아쉽습니다.",
};

const activityAnalysisStandard: ActivityAnalysisSection = {
  ...activityAnalysisLite,
  activities: activityAnalysisLite.activities.map((a) => ({
    ...a,
    keyActivities:
      a.type === "자율·자치"
        ? [
            {
              activity: "학급 IT 환경 구축 프로젝트 (1학년)",
              evaluation:
                "교실 내 스마트 기기 활용 방안을 제안하고 직접 세팅하여 공동체 기여와 IT 역량을 동시에 보여줌",
              competencyTags: [
                {
                  category: "community" as const,
                  subcategory: "협업 능력",
                  assessment: "보통" as const,
                },
              ],
            },
            {
              activity: "학교 홈페이지 개선 TF팀 (2학년)",
              evaluation:
                "학교 홈페이지의 사용자 인터페이스 문제점을 분석하고 개선 프로토타입을 제작. 전공 적합성과 문제 해결 역량이 돋보임",
              competencyTags: [
                {
                  category: "career" as const,
                  subcategory: "전공 적합성",
                  assessment: "우수" as const,
                },
                {
                  category: "community" as const,
                  subcategory: "협업 능력",
                  assessment: "보통" as const,
                },
              ],
            },
          ]
        : a.type === "동아리"
          ? [
              {
                activity: "알고리즘 스터디 리드 (2학년)",
                evaluation:
                  "주 1회 스터디를 기획하고 문제 선정부터 풀이까지 이끌며, 리더십과 학업 역량을 동시에 보여줌",
                competencyTags: [
                  {
                    category: "academic" as const,
                    subcategory: "탐구 역량",
                    assessment: "우수" as const,
                  },
                  {
                    category: "community" as const,
                    subcategory: "리더십",
                    assessment: "보통" as const,
                  },
                ],
              },
              {
                activity: "교내 해커톤 참가 (2학년)",
                evaluation:
                  "팀원 3명과 함께 24시간 해커톤에 참가하여 학교 급식 추천 앱 프로토타입 개발. 협업과 문제 해결 역량이 돋보임",
                competencyTags: [
                  {
                    category: "academic" as const,
                    subcategory: "탐구 역량",
                    assessment: "우수" as const,
                  },
                  {
                    category: "community" as const,
                    subcategory: "협업 능력",
                    assessment: "우수" as const,
                  },
                ],
              },
              {
                activity: "Python 기초 프로그램 개발 (1학년)",
                evaluation:
                  "동아리 활동을 통해 Python 기초를 익히고 간단한 계산기 프로그램을 자주적으로 개발. 프로그래밍 입문 단계에서의 자기주도적 학습 태도가 긍정적",
                competencyTags: [
                  {
                    category: "career" as const,
                    subcategory: "전공 적합성",
                    assessment: "보통" as const,
                  },
                ],
              },
            ]
          : a.type === "진로"
            ? [
                {
                  activity: "IT 기업 탐방 - 네이버 본사 (1학년)",
                  evaluation:
                    "네이버 본사 방문을 통해 소프트웨어 개발자의 실제 업무 환경을 체험. 진로 탐색의 출발점으로 의미 있음",
                  competencyTags: [
                    {
                      category: "career" as const,
                      subcategory: "진로 탐색 활동",
                    },
                  ],
                },
                {
                  activity: "소프트웨어 개발자 직업 탐구 보고서 (2학년)",
                  evaluation:
                    "AI 엔지니어, 백엔드 개발자, 프론트엔드 개발자 등 세부 직군을 조사하고 각 직군별 필요 역량을 분석한 보고서 작성. 진로 인식의 구체성이 향상됨",
                  competencyTags: [
                    {
                      category: "career" as const,
                      subcategory: "진로 탐색 활동",
                      assessment: "보통" as const,
                    },
                  ],
                },
              ]
            : a.type === "봉사"
              ? [
                  {
                    activity: "학교 주변 환경정화 봉사 (1학년)",
                    evaluation:
                      "학교 주변 환경 미화 활동에 참여하였으나, 진로와의 연계성이 없는 일반적 봉사에 해당",
                    competencyTags: [
                      {
                        category: "community" as const,
                        subcategory: "봉사 및 나눔",
                      },
                    ],
                  },
                  {
                    activity: "교내 도서관 도서 정리 봉사 (2학년)",
                    evaluation:
                      "도서관 장서 정리 봉사에 참여하였으나 시간이 감소하였고, 컴퓨터공학 진로와의 연결 고리가 전무함",
                    competencyTags: [
                      {
                        category: "community" as const,
                        subcategory: "봉사 및 나눔",
                        assessment: "부족" as const,
                      },
                    ],
                  },
                ]
              : undefined,
    improvementDirection:
      a.type === "진로"
        ? "진로 활동에서 단순 탐방·특강 참여를 넘어, 직접 소프트웨어를 개발하여 사회 문제를 해결하는 프로젝트를 수행하면 진로 역량 평가에서 큰 차별화가 가능합니다."
        : a.type === "봉사"
          ? "봉사 활동이 단순 참여형에 머물러 있어 진로 연계성이 매우 부족합니다. 3학년에는 지역 아동센터 코딩 교육 봉사, 학교 IT 인프라 지원 봉사 등 전공 역량을 활용한 봉사 활동을 반드시 수행해야 합니다."
          : undefined,
    volumeAssessment:
      a.type === "자율·자치"
        ? "자율활동 기재 분량은 평균 수준이나, 리더 역할 기록이 없어 내용적 깊이가 부족합니다."
        : a.type === "동아리"
          ? "동아리 활동 기재 분량이 풍부하며, 구체적인 활동 내용과 성과가 잘 기록되어 있습니다."
          : a.type === "진로"
            ? "진로활동 기재 분량은 평균 수준이나, 심층적 탐구 내용의 비중이 낮습니다."
            : a.type === "봉사"
              ? "봉사활동 기재 분량이 매우 적으며, 2학년에서 오히려 감소한 점이 우려됩니다."
              : undefined,
    fillRate:
      a.type === "자율·자치"
        ? { total: 72, personal: 45 }
        : a.type === "동아리"
          ? { total: 88, personal: 78 }
          : a.type === "진로"
            ? { total: 65, personal: 52 }
            : a.type === "봉사"
              ? { total: 35, personal: 15 }
              : undefined,
    yearlyDetails:
      a.type === "자율·자치"
        ? [
            {
              grade: 1,
              summary:
                "학급 환경 개선 프로젝트에서 IT 환경 구축을 담당하며 공동체 기여 역량을 보여줌",
              keyActivities: [
                "교실 내 스마트 기기 활용 방안 제안 및 실행",
                "학급 내 온라인 학습 환경 구축 지원",
              ],
              evaluation:
                "자율활동에서 IT 특기를 살린 참여가 돋보이지만, 공식적인 임원 역할이 아닌 자발적 참여에 그침. 학급 내에서의 기여도는 인정되나 리더십 기록으로 남기기에는 한계가 있음",
            },
            {
              grade: 2,
              summary:
                "학교 홈페이지 개선 TF팀에서 UI/UX 분석 및 프로토타입 제작을 주도",
              keyActivities: [
                "학교 홈페이지 사용자 경험 분석 보고서 작성",
                "Figma를 활용한 개선 프로토타입 제작 및 발표",
              ],
              evaluation:
                "전공 역량을 학교 운영에 기여하는 방식으로 발휘한 점이 우수. 다만 TF팀 참여이지 공식 학생회 임원이 아니므로 리더십 면에서는 여전히 아쉬움이 남음",
            },
          ]
        : a.type === "동아리"
          ? [
              {
                grade: 1,
                summary:
                  "코딩 동아리에 가입하여 Python 기초 학습 및 간단한 프로그램 개발을 수행",
                keyActivities: [
                  "Python 기초 문법 학습 및 계산기 프로그램 개발",
                  "동아리 내부 프로그래밍 과제 수행",
                ],
                evaluation:
                  "프로그래밍 입문 단계에서 자기주도적으로 학습에 참여한 점이 긍정적. 다만 1학년 시기에는 동아리 내에서 두드러진 역할 없이 일반 부원으로 활동함",
              },
              {
                grade: 2,
                summary:
                  "알고리즘 스터디를 기획·운영하며 동아리 내 학습 리더 역할을 수행하고, 교내 해커톤에 참가하여 팀 프로젝트를 완수",
                keyActivities: [
                  "주 1회 알고리즘 스터디 기획 및 운영",
                  "교내 해커톤 참가 - 학교 급식 추천 앱 프로토타입 개발",
                  "동아리 발표회에서 해커톤 결과물 시연",
                ],
                evaluation:
                  "1학년 대비 비약적 성장을 보여줌. 알고리즘 스터디 리드 경험은 리더십과 학업 역량을 동시에 입증하는 핵심 활동이며, 해커톤 참가는 협업 능력과 문제 해결 역량의 근거가 됨. 동아리 부장을 맡지 않은 점은 3학년에 보완 필요",
              },
            ]
          : a.type === "진로"
            ? [
                {
                  grade: 1,
                  summary:
                    "IT 기업 탐방 및 진로 체험 활동을 통해 소프트웨어 개발 분야에 대한 초기 관심을 확인",
                  keyActivities: [
                    "네이버 본사 기업 탐방",
                    "진로 체험의 날 - SW 개발자 직업 체험",
                  ],
                  evaluation:
                    "진로 탐색의 출발점으로서 의미가 있으나, 단순 방문·체험 수준에 머물러 있어 깊이 있는 탐구 활동으로 발전시키지 못함",
                },
                {
                  grade: 2,
                  summary:
                    "소프트웨어 개발자 직업 탐구 보고서 작성 및 AI 관련 진로 특강 참여를 통해 진로 인식을 구체화",
                  keyActivities: [
                    "소프트웨어 개발자 세부 직군 탐구 보고서 작성",
                    "AI 관련 진로 특강 참여 및 후기 작성",
                  ],
                  evaluation:
                    "보고서 작성을 통해 진로 인식의 구체성이 높아졌으나, 여전히 수동적 정보 수집 단계. 직접 프로젝트를 수행하거나 관련 대회에 참가하는 등 능동적 진로 활동이 부족함",
                },
              ]
            : a.type === "봉사"
              ? [
                  {
                    grade: 1,
                    summary:
                      "학교 주변 환경정화 봉사에 참여하였으나 진로 연계성이 없는 일반적 봉사 수준",
                    keyActivities: ["학교 주변 환경 미화 봉사 (총 12시간)"],
                    evaluation:
                      "봉사 시간은 평균 수준을 충족하나, 컴퓨터공학 진로와의 연결 고리가 전혀 없어 입학사정관 평가에서 차별화 요소가 되기 어려움",
                  },
                  {
                    grade: 2,
                    summary:
                      "교내 도서관 도서 정리 봉사에 참여하였으나 봉사 시간이 감소하고 진로 연계 봉사 경험은 없음",
                    keyActivities: ["교내 도서관 도서 정리 봉사 (총 8시간)"],
                    evaluation:
                      "1학년 대비 봉사 시간이 오히려 감소한 점이 부정적. 코딩 교육 봉사, 학교 IT 인프라 지원 봉사 등 진로 연계 봉사 활동이 전무하여 공동체 역량 평가에서 취약점으로 작용할 가능성이 높음",
                  },
                ]
              : undefined,
  })),
};

const activityAnalysisPremium: ActivityAnalysisSection = {
  ...activityAnalysisStandard,
  activities: activityAnalysisStandard.activities.map((a) => ({
    ...a,
    overallComment:
      a.type === "자율·자치"
        ? "자율·자치 활동에서 IT 역량을 학교 공동체에 기여하는 방식으로 꾸준히 발휘하고 있으며, 특히 2학년 홈페이지 개선 TF팀 활동은 전공 적합성과 문제 해결 역량을 동시에 보여주는 우수한 사례입니다. 그러나 학급 반장, 학생회 임원 등 공식적인 리더 역할 경험이 전무하여, 입학사정관 평가에서 리더십 항목의 근거가 부족합니다. 3학년에는 반드시 학급 임원 또는 학생회 활동에 참여하여 공식 리더십 기록을 확보해야 합니다."
        : a.type === "동아리"
          ? "코딩 동아리에서의 성장 궤적이 매우 뚜렷하며, 1학년 Python 기초 학습에서 2학년 알고리즘 스터디 리드 및 해커톤 참가로 이어지는 발전 과정이 체계적입니다. 알고리즘 스터디 리드 경험은 리더십과 학업 역량을 동시에 입증하는 핵심 활동이며, 해커톤 참가는 실전 프로젝트 경험으로서 높은 가치를 지닙니다. 3학년에 동아리 부장을 맡고 외부 대회(정보올림피아드 등)에 참가한다면 최상위 평가를 받을 수 있습니다."
          : a.type === "진로"
            ? "진로 활동이 1학년 기업 탐방에서 2학년 직업 탐구 보고서로 점진적으로 심화되고 있으나, 전체적으로 수동적 정보 수집 단계에 머물러 있습니다. 서울대 컴퓨터공학과가 목표인 학생으로서, 직접 소프트웨어를 개발하거나 알고리즘 대회에 참가하는 등 능동적이고 깊이 있는 진로 연계 활동이 반드시 필요합니다. 3학년에 개인 프로젝트 수행 및 결과물 발표가 이루어져야 합니다."
            : a.type === "봉사"
              ? "봉사 활동이 창체 4개 영역 중 가장 취약한 영역입니다. 1학년 환경정화 봉사(12시간)에서 2학년 도서 정리 봉사(8시간)로 시간이 감소하였고, 모든 봉사가 진로와 무관한 단순 참여형에 그치고 있습니다. 서울대 입학사정관은 봉사활동의 진정성과 진로 연계성을 중시하므로, 3학년에 지역 아동센터 코딩 교육 봉사를 시작하여 전공 역량을 활용한 진로 연계 봉사 기록을 반드시 확보해야 합니다."
              : a.overallComment,
    tieredAssessment:
      a.type === "자율·자치"
        ? {
            excellent: {
              items: [
                "학교 홈페이지 개선 TF팀에서 UI/UX 분석 및 프로토타입 제작 주도",
              ],
              quotes: [
                {
                  originalText:
                    "학교 홈페이지의 사용성 문제를 분석하고 Figma를 활용하여 개선안 프로토타입을 제작·발표함",
                  source: "2학년 자율활동 특기사항",
                  competencyTags: [
                    {
                      category: "career" as const,
                      subcategory: "전공 적합성",
                      assessment: "우수" as const,
                    },
                  ],
                  assessment: "우수" as const,
                  positivePoint:
                    "IT 전공 역량을 실질적인 학교 문제 해결에 적용한 우수 사례",
                },
              ],
            },
            good: {
              items: ["학급 IT 환경 구축 프로젝트 자발적 참여"],
              quotes: [
                {
                  originalText:
                    "학급 환경 개선 프로젝트에서 IT 환경 구축을 제안하고 실행에 참여함",
                  source: "1학년 자율활동 특기사항",
                  competencyTags: [
                    {
                      category: "community" as const,
                      subcategory: "협업 능력",
                      assessment: "보통" as const,
                    },
                  ],
                  assessment: "보통" as const,
                  positivePoint: "IT 특기를 공동체에 기여하는 방식으로 활용",
                },
              ],
            },
            needsImprovement: {
              items: ["공식 리더 역할(반장, 학생회 임원) 경험 없음"],
              quotes: [],
              improvementTable: [
                {
                  area: "리더십 기록",
                  currentState: "2년간 공식 임원 역할 경험 없음",
                  suggestion:
                    "3학년 1학기 학급 반장 또는 학생회 임원에 출마하여 공식 리더십 기록 확보",
                },
              ],
            },
          }
        : a.type === "동아리"
          ? {
              excellent: {
                items: [
                  "알고리즘 스터디 기획·운영 및 리더 역할 수행",
                  "교내 해커톤 참가 및 팀 프로젝트 완수",
                ],
                quotes: [
                  {
                    originalText:
                      "코딩 동아리에서 알고리즘 스터디를 기획하여 주 1회 운영하며, 문제 선정·풀이·해설을 주도함",
                    source: "2학년 동아리활동 특기사항",
                    competencyTags: [
                      {
                        category: "academic" as const,
                        subcategory: "탐구 역량",
                        assessment: "우수" as const,
                      },
                      {
                        category: "community" as const,
                        subcategory: "리더십",
                        assessment: "보통" as const,
                      },
                    ],
                    assessment: "우수" as const,
                    positivePoint:
                      "학업 역량과 리더십을 동시에 보여주는 핵심 활동",
                  },
                  {
                    originalText:
                      "교내 해커톤에 참가하여 팀원 3명과 함께 학교 급식 추천 앱 프로토타입을 개발함",
                    source: "2학년 동아리활동 특기사항",
                    competencyTags: [
                      {
                        category: "academic" as const,
                        subcategory: "탐구 역량",
                        assessment: "우수" as const,
                      },
                      {
                        category: "community" as const,
                        subcategory: "협업 능력",
                        assessment: "우수" as const,
                      },
                    ],
                    assessment: "우수" as const,
                    positivePoint:
                      "실전 프로젝트 경험으로 협업과 문제 해결 역량 입증",
                  },
                ],
              },
              good: {
                items: ["1학년 Python 기초 학습 및 자주적 프로그램 개발"],
                quotes: [
                  {
                    originalText:
                      "코딩 동아리에 가입하여 Python 기초를 학습하고 간단한 계산기 프로그램을 개발함",
                    source: "1학년 동아리활동 특기사항",
                    competencyTags: [
                      {
                        category: "career" as const,
                        subcategory: "전공 적합성",
                        assessment: "보통" as const,
                      },
                    ],
                    assessment: "보통" as const,
                    positivePoint:
                      "프로그래밍 입문 단계에서의 자기주도적 학습 태도",
                  },
                ],
              },
              needsImprovement: {
                items: ["동아리 부장 역할 미경험", "외부 대회 참가 이력 없음"],
                quotes: [],
                improvementTable: [
                  {
                    area: "동아리 리더십",
                    currentState:
                      "스터디 리더 경험은 있으나 공식 부장 역할 없음",
                    suggestion:
                      "3학년에 코딩 동아리 부장을 맡아 동아리 운영 전반을 이끌기",
                  },
                  {
                    area: "대회 참가",
                    currentState: "교내 해커톤만 참가, 외부 대회 이력 없음",
                    suggestion:
                      "한국정보올림피아드(KOI) 또는 SW 공모전 참가로 외부 실적 확보",
                  },
                ],
              },
            }
          : a.type === "진로"
            ? {
                excellent: {
                  items: [],
                  quotes: [],
                },
                good: {
                  items: [
                    "소프트웨어 개발자 직업 탐구 보고서 작성",
                    "AI 관련 진로 특강 참여",
                  ],
                  quotes: [
                    {
                      originalText:
                        "소프트웨어 개발자의 세부 직군(AI 엔지니어, 백엔드, 프론트엔드)을 조사하고 각 직군별 필요 역량을 분석한 보고서를 작성함",
                      source: "2학년 진로활동 특기사항",
                      competencyTags: [
                        {
                          category: "career" as const,
                          subcategory: "진로 탐색 활동",
                          assessment: "보통" as const,
                        },
                      ],
                      assessment: "보통" as const,
                      positivePoint:
                        "세부 직군까지 조사한 점에서 진로 인식의 구체성 향상",
                      improvementSuggestion:
                        "조사에서 나아가 실제 프로젝트 수행으로 연결 필요",
                    },
                  ],
                },
                needsImprovement: {
                  items: [
                    "능동적 진로 연계 프로젝트 경험 전무",
                    "관련 대회 참가 이력 없음",
                  ],
                  quotes: [],
                  improvementTable: [
                    {
                      area: "능동적 진로 활동",
                      currentState:
                        "기업 탐방, 특강 참여 등 수동적 활동에 그침",
                      suggestion:
                        "개인 SW 프로젝트를 수행하고 결과를 진로활동 시간에 발표",
                    },
                    {
                      area: "외부 활동",
                      currentState: "교내 활동만 참여",
                      suggestion: "정보올림피아드, SW 공모전 등 외부 대회 참가",
                    },
                  ],
                },
              }
            : a.type === "봉사"
              ? {
                  excellent: {
                    items: [],
                    quotes: [],
                  },
                  good: {
                    items: [],
                    quotes: [],
                  },
                  needsImprovement: {
                    items: [
                      "봉사 시간 감소 추세 (1학년 12시간 → 2학년 8시간)",
                      "진로 연계 봉사 경험 전무",
                      "봉사활동의 자발성·지속성 부족",
                    ],
                    quotes: [
                      {
                        originalText: "교내 도서관 도서 정리 봉사 참여",
                        source: "2학년 봉사활동 특기사항",
                        competencyTags: [
                          {
                            category: "community" as const,
                            subcategory: "봉사 및 나눔",
                            assessment: "부족" as const,
                          },
                        ],
                        assessment: "미흡" as const,
                        improvementSuggestion:
                          "단순 정리 봉사에서 벗어나 전공 역량을 활용한 코딩 교육 봉사로 전환 필요",
                      },
                    ],
                    improvementTable: [
                      {
                        area: "봉사 시간",
                        currentState: "1학년 12시간, 2학년 8시간으로 감소 추세",
                        suggestion:
                          "3학년 최소 20시간 이상, 진로 연계 봉사 비중 70% 이상 확보",
                      },
                      {
                        area: "진로 연계 봉사",
                        currentState: "컴퓨터공학 관련 봉사 경험 전무",
                        suggestion:
                          "지역 아동센터 코딩 교육 봉사를 주 1회 이상 정기적으로 수행",
                      },
                      {
                        area: "봉사 진정성",
                        currentState: "학교 지정 봉사에 수동적 참여",
                        suggestion:
                          "직접 코딩 교육 프로그램을 기획하여 자발적 봉사 기록 확보",
                      },
                    ],
                  },
                }
              : undefined,
    volumeMetric:
      a.type === "자율·자치"
        ? {
            category: "자율·자치활동",
            maxCapacityChars: 500,
            actualChars: 362,
            fillRate: 72,
            comparisonGroupAvg: 68,
          }
        : a.type === "동아리"
          ? {
              category: "동아리활동",
              maxCapacityChars: 500,
              actualChars: 441,
              fillRate: 88,
              comparisonGroupAvg: 72,
            }
          : a.type === "진로"
            ? {
                category: "진로활동",
                maxCapacityChars: 700,
                actualChars: 455,
                fillRate: 65,
                comparisonGroupAvg: 61,
              }
            : a.type === "봉사"
              ? {
                  category: "봉사활동",
                  maxCapacityChars: 500,
                  actualChars: 175,
                  fillRate: 35,
                  comparisonGroupAvg: 55,
                }
              : undefined,
    characterLabel:
      a.type === "자율·자치"
        ? {
            label: "IT 기여형 참여자",
            rationale:
              "IT 역량을 공동체에 기여하는 방식으로 활용하나 공식 리더 역할은 부재",
          }
        : a.type === "동아리"
          ? {
              label: "성장형 코딩 리더",
              rationale:
                "1학년 입문에서 2학년 스터디 리더로 급성장하며 동아리 핵심 인재로 부상",
            }
          : a.type === "진로"
            ? {
                label: "탐색 단계 진로 설계자",
                rationale:
                  "진로 방향은 명확하나 아직 수동적 정보 수집 단계에 머물러 있음",
              }
            : a.type === "봉사"
              ? {
                  label: "소극적 봉사 참여자",
                  rationale:
                    "최소 수준의 봉사에 참여하고 있으며 진로 연계성과 자발성이 부족",
                }
              : undefined,
    activityLevelComparison:
      a.type === "자율·자치"
        ? {
            myValue: 65,
            targetRangeAvg: 82,
            overallAvg: 60,
            estimationBasis: "서울대 컴퓨터공학과 합격자 자율활동 평균",
          }
        : a.type === "동아리"
          ? {
              myValue: 85,
              targetRangeAvg: 88,
              overallAvg: 68,
              estimationBasis: "서울대 컴퓨터공학과 합격자 동아리활동 평균",
            }
          : a.type === "진로"
            ? {
                myValue: 58,
                targetRangeAvg: 80,
                overallAvg: 62,
                estimationBasis: "서울대 컴퓨터공학과 합격자 진로활동 평균",
              }
            : a.type === "봉사"
              ? {
                  myValue: 30,
                  targetRangeAvg: 72,
                  overallAvg: 55,
                  estimationBasis: "서울대 컴퓨터공학과 합격자 봉사활동 평균",
                }
              : undefined,
  })),
  overallComment:
    "창체 활동 전반에서 컴퓨터공학 진로와의 연결이 꾸준히 유지되고 있으며, 특히 동아리 활동은 1학년 입문에서 2학년 스터디 리더로의 성장 궤적이 뚜렷하여 높은 평가를 받을 수 있습니다. 자율·자치 활동에서도 IT 역량을 학교 문제 해결에 적용한 점이 돋보입니다. 그러나 공식 리더 역할(반장, 학생회 임원, 동아리 부장) 경험이 전무하여 리더십 영역의 근거가 부족하고, 봉사 활동은 창체 4개 영역 중 가장 취약하여 시급한 개선이 필요합니다. 3학년에는 동아리 부장 취임, 학급 임원 도전, 코딩 교육 봉사 시작을 통해 약점을 집중 보완해야 합니다.",
  leadershipQuantitative: {
    totalPositions: 1,
    positionsByYear: [
      { grade: 1, positions: [] },
      { grade: 2, positions: ["알고리즘 스터디 리더 (비공식)"] },
    ],
    leadershipRate: 12,
  },
};

// ─── 섹션 10: 교과 세특 분석 ───

const subjectAnalysisLite: SubjectAnalysisSection = {
  sectionId: "subjectAnalysis",
  title: "교과 세특 분석",
  subjects: [
    // ── 2학년 교과 ──
    {
      subjectName: "정보",
      year: 2,
      rating: "excellent",
      competencyTags: [
        { category: "academic", subcategory: "탐구 역량", assessment: "우수" },
        { category: "career", subcategory: "전공 적합성", assessment: "우수" },
      ],
      activitySummary:
        "다익스트라 알고리즘을 활용한 최단 경로 탐색 프로그램을 Python으로 구현하고, 시간 복잡도 분석까지 수행",
      evaluationComment:
        "단순 구현을 넘어 알고리즘의 효율성까지 분석한 점이 우수합니다. 컴퓨터공학 전공 적합성을 직접적으로 보여주는 핵심 세특입니다.",
    },
    {
      subjectName: "수학Ⅱ",
      year: 2,
      rating: "excellent",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "우수",
        },
        { category: "academic", subcategory: "융합 사고", assessment: "보통" },
      ],
      activitySummary:
        "함수의 극한 개념을 활용하여 머신러닝의 경사하강법 원리를 탐구하고 발표",
      evaluationComment:
        "수학 개념을 AI 기술과 연결한 융합적 사고가 돋보입니다. 수학적 도구를 컴퓨터과학에 적용하는 역량을 잘 보여줍니다.",
    },
    {
      subjectName: "미적분",
      year: 2,
      rating: "excellent",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "우수",
        },
        { category: "academic", subcategory: "탐구 역량", assessment: "우수" },
      ],
      activitySummary:
        "뉴턴-라프슨 방법을 프로그래밍으로 구현하여 방정식의 근을 탐색하는 수치 해석 프로젝트 수행",
      evaluationComment:
        "미적분 개념을 수치 해석과 연결하여 프로그래밍으로 구현한 점이 탁월합니다. 수학과 컴퓨터과학의 융합 역량이 잘 드러납니다.",
    },
    {
      subjectName: "확률과통계",
      year: 2,
      rating: "good",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
        { category: "academic", subcategory: "융합 사고", assessment: "보통" },
      ],
      activitySummary:
        "베이즈 정리를 활용한 스팸 메일 필터링 원리를 탐구하고 확률 모델 보고서 작성",
      evaluationComment:
        "확률 개념을 실제 IT 기술에 적용한 시도가 좋습니다. 조건부 확률의 이해도가 높으며 데이터 사이언스와의 연결성이 보통 수준입니다.",
    },
    {
      subjectName: "물리학Ⅰ",
      year: 2,
      rating: "good",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
      ],
      activitySummary:
        "전자기학 단원에서 반도체의 원리를 탐구하고, 컴퓨터 하드웨어와의 연결을 분석하는 보고서 작성",
      evaluationComment:
        "물리학과 컴퓨터공학의 연결을 시도한 점은 좋으나, 탐구의 깊이가 조금 아쉽습니다. 실험적 검증이 추가되면 더 강력한 세특이 됩니다.",
    },
    {
      subjectName: "화학Ⅰ",
      year: 2,
      rating: "average",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
      ],
      activitySummary:
        "반도체 소재로 사용되는 실리콘의 화학적 성질을 탐구하고 발표 수행",
      evaluationComment:
        "반도체 소재와 진로를 연결한 시도는 좋으나, 화학적 분석의 깊이가 부족합니다. 계산화학이나 분자 시뮬레이션과의 연결을 시도하면 더 좋겠습니다.",
    },
    {
      subjectName: "영어Ⅱ",
      year: 2,
      rating: "good",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
        { category: "career", subcategory: "전공 적합성", assessment: "보통" },
      ],
      activitySummary:
        "실리콘밸리 기업 문화에 대한 영어 에세이 작성 및 TED 강연(컴퓨터과학 관련) 요약 발표",
      evaluationComment:
        "영어 교과에서도 진로를 연결하려는 시도가 좋습니다. 기술 관련 영어 논문 읽기 활동이 추가되면 학술 역량을 더 잘 보여줄 수 있습니다.",
    },
    {
      subjectName: "국어",
      year: 2,
      rating: "average",
      competencyTags: [{ category: "academic", subcategory: "교과 성취도" }],
      activitySummary:
        "문학 작품 감상문 작성 및 토론 참여. 디지털 시대의 언어 변화에 대한 발표 수행",
      evaluationComment:
        "국어 세특이 진로와의 연결이 부족합니다. 'IT와 언어'를 주제로 자연어 처리, 코딩 언어와 자연어의 관계 등을 탐구하면 진로 연결성을 확보할 수 있습니다.",
    },
    {
      subjectName: "한국사",
      year: 2,
      rating: "average",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
      ],
      activitySummary:
        "한국 과학기술 발전사를 시대별로 정리하고, 디지털 전환 과정에 대한 보고서 작성",
      evaluationComment:
        "한국사에서 과학기술사를 다룬 것은 적절한 시도이나, 단순 나열에 그치고 있어 분석적 깊이가 아쉽습니다.",
    },
    {
      subjectName: "생활과윤리",
      year: 2,
      rating: "good",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
        { category: "community", subcategory: "시민의식", assessment: "보통" },
      ],
      activitySummary:
        "AI 윤리와 알고리즘 편향성 문제를 탐구하고, 기술 윤리 가이드라인을 제안하는 발표 수행",
      evaluationComment:
        "AI 윤리라는 주제로 진로와 사회교과를 연결한 점이 우수합니다. 컴퓨터공학자로서의 사회적 책임감을 보여주는 좋은 세특입니다.",
    },
    {
      subjectName: "인공지능수학",
      year: 2,
      rating: "excellent",
      competencyTags: [
        { category: "academic", subcategory: "탐구 역량", assessment: "우수" },
        { category: "career", subcategory: "전공 적합성", assessment: "우수" },
      ],
      activitySummary:
        "행렬 연산을 활용한 이미지 변환 알고리즘을 구현하고, CNN의 수학적 원리를 탐구하여 발표",
      evaluationComment:
        "인공지능의 수학적 기반을 깊이 이해하고 직접 구현까지 한 점이 매우 우수합니다. 전공 적합성을 강력히 보여주는 핵심 세특입니다.",
    },
    {
      subjectName: "체육",
      year: 2,
      rating: "good",
      competencyTags: [
        { category: "community", subcategory: "협업 능력", assessment: "보통" },
      ],
      activitySummary:
        "배드민턴 경기 전략을 데이터 분석으로 수립하고, 팀 경기에서 전략 분석 역할 수행",
      evaluationComment:
        "체육 활동에서도 데이터 분석적 사고를 적용한 점이 인상적입니다. 협동심과 분석 역량이 함께 드러납니다.",
    },
    {
      subjectName: "음악",
      year: 2,
      rating: "average",
      competencyTags: [{ category: "community", subcategory: "문화적 소양" }],
      activitySummary:
        "알고리즘 작곡의 원리를 조사하고, MIDI 프로그래밍으로 간단한 멜로디를 생성하여 발표",
      evaluationComment:
        "음악과 프로그래밍을 연결한 시도가 참신합니다. 다만 음악적 깊이보다 기술적 측면에 치우쳐 교과 본연의 역량이 다소 부족합니다.",
    },
    // ── 1학년 교과 ──
    {
      subjectName: "수학Ⅰ",
      year: 1,
      rating: "excellent",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "우수",
        },
        { category: "academic", subcategory: "탐구 역량", assessment: "보통" },
      ],
      activitySummary:
        "지수함수와 로그함수를 활용한 암호화 원리를 탐구하고 RSA 알고리즘의 수학적 기반을 발표",
      evaluationComment:
        "수학 개념을 정보보안 기술과 연결한 융합적 사고가 우수합니다. 1학년부터 진로 연결 의지가 돋보입니다.",
    },
    {
      subjectName: "영어Ⅰ",
      year: 1,
      rating: "good",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
      ],
      activitySummary:
        "빌 게이츠 자서전 영어 원서 독후감 작성 및 IT 기업가 정신에 대한 영어 발표 수행",
      evaluationComment:
        "영어 원서 독서를 통해 진로 관심을 표현한 점이 좋습니다. 학술적 영어 능력 향상이 필요합니다.",
    },
    {
      subjectName: "통합과학",
      year: 1,
      rating: "good",
      competencyTags: [
        {
          category: "academic",
          subcategory: "교과 성취도",
          assessment: "보통",
        },
        { category: "academic", subcategory: "탐구 역량", assessment: "보통" },
      ],
      activitySummary:
        "에너지 효율 관련 탐구에서 데이터 수집 및 그래프 분석을 담당하고 결과 보고서 작성",
      evaluationComment:
        "과학적 탐구 과정에서 데이터 분석 역량이 돋보입니다. 실험 설계의 체계성이 보통 수준이며, 과학적 사고력의 기초가 잘 잡혀 있습니다.",
    },
    {
      subjectName: "통합사회",
      year: 1,
      rating: "average",
      competencyTags: [{ category: "academic", subcategory: "교과 성취도" }],
      activitySummary:
        "정보화 사회의 명과 암에 대한 조별 발표에서 기술 발전의 사회적 영향을 분석",
      evaluationComment:
        "사회 교과에서 정보화를 다룬 것은 적절하나, 분석의 깊이가 표면적 수준에 머물고 있습니다. 구체적 사례와 데이터 활용이 필요합니다.",
    },
    {
      subjectName: "한국어문학",
      year: 1,
      rating: "average",
      competencyTags: [{ category: "academic", subcategory: "교과 성취도" }],
      activitySummary:
        "SF 소설 감상문 작성 및 과학기술과 문학의 관계에 대한 발표 수행",
      evaluationComment:
        "SF 문학을 통해 진로 관심을 드러낸 시도는 좋으나, 문학적 분석 역량이 다소 부족합니다. 작품에 대한 비평적 시각을 키울 필요가 있습니다.",
    },
    {
      subjectName: "기술가정",
      year: 1,
      rating: "excellent",
      competencyTags: [
        { category: "career", subcategory: "전공 적합성", assessment: "우수" },
        { category: "academic", subcategory: "탐구 역량", assessment: "우수" },
      ],
      activitySummary:
        "아두이노를 활용한 IoT 자동 급수 시스템을 설계·제작하고, 센서 데이터 처리 프로그램을 직접 코딩",
      evaluationComment:
        "하드웨어와 소프트웨어를 결합한 프로젝트를 자기주도적으로 수행한 점이 매우 우수합니다. 1학년부터 뛰어난 전공 적합성을 보여줍니다.",
    },
  ],
};

const subjectAnalysisStandard: SubjectAnalysisSection = {
  sectionId: "subjectAnalysis",
  title: "교과 세특 분석",
  subjects: subjectAnalysisLite.subjects.map((s) => ({
    ...s,
    keyQuotes:
      s.subjectName === "정보"
        ? [
            "다익스트라 알고리즘의 시간 복잡도를 분석하여 O(V²)에서 우선순위 큐를 활용해 O((V+E)logV)로 최적화하는 과정을 탐구함.",
            "실제 지도 데이터를 활용한 최단 경로 탐색 프로그램을 구현하여 알고리즘의 실용성을 검증함.",
          ]
        : s.subjectName === "수학Ⅱ"
          ? [
              "경사하강법의 학습률이 수렴 속도에 미치는 영향을 수학적으로 분석하고 시각화 프로그램으로 검증함.",
            ]
          : s.subjectName === "미적분"
            ? [
                "뉴턴-라프슨 방법의 수렴 조건을 분석하고, Python으로 구현하여 다양한 함수에 적용해봄.",
                "테일러 급수를 활용한 함수 근사 프로그램을 작성하여 오차 범위를 비교 분석함.",
              ]
            : s.subjectName === "인공지능수학"
              ? [
                  "합성곱 신경망(CNN)의 커널 연산이 행렬 곱셈으로 구현되는 과정을 수학적으로 분석함.",
                  "경사하강법에서 편미분의 역할을 수식으로 유도하고 학습률에 따른 수렴 양상을 시각화함.",
                ]
              : s.subjectName === "기술가정"
                ? [
                    "아두이노 센서 데이터를 실시간으로 처리하는 알고리즘을 직접 설계하고 C++ 코드로 구현함.",
                  ]
                : s.subjectName === "수학Ⅰ"
                  ? [
                      "RSA 암호 알고리즘에서 소인수분해의 어려움이 보안 강도를 결정한다는 점을 수학적으로 설명함.",
                    ]
                  : s.subjectName === "생활과윤리"
                    ? [
                        "AI 알고리즘의 편향성이 사회적 불평등을 심화할 수 있다는 점을 구체적 사례를 들어 분석함.",
                      ]
                    : undefined,
    detailedEvaluation:
      s.subjectName === "정보"
        ? "알고리즘의 이론적 이해뿐 아니라 실제 데이터에 적용하는 과정까지 수행한 점이 매우 우수합니다. 시간 복잡도 분석에서 빅오 표기법을 정확히 사용하였고, 우선순위 큐를 활용한 최적화까지 시도한 점에서 컴퓨터과학의 핵심 역량인 '효율적 문제 해결 능력'이 잘 드러납니다. 서울대 평가 기준에서 '학업 역량'과 '발전가능성' 항목에서 높은 평가가 예상됩니다."
        : s.subjectName === "수학Ⅱ"
          ? "함수의 극한이라는 수학 개념을 머신러닝의 경사하강법이라는 실제 기술에 적용한 융합적 사고가 돋보입니다. 다만 수학적 증명의 엄밀성이 조금 부족하며, 3학년에서는 미적분을 활용한 더 깊이 있는 최적화 문제 탐구를 권장합니다."
          : s.subjectName === "미적분"
            ? "수치 해석 기법을 직접 프로그래밍으로 구현한 점에서 수학적 사고력과 실행력이 모두 드러납니다. 뉴턴-라프슨 방법의 수렴 조건을 이론적으로 분석한 후 실험적으로 검증한 과정이 학술적이며, 컴퓨터과학 전공에서 요구하는 수리적 문제 해결 역량을 잘 보여줍니다."
            : s.subjectName === "인공지능수학"
              ? "CNN의 수학적 원리를 행렬 연산으로 풀어낸 점에서 깊은 이해도가 돋보입니다. 단순 활용이 아닌 원리 탐구 수준의 접근이며, 서울대 컴퓨터공학과가 요구하는 '수학적 기초 위의 기술 이해' 역량과 정확히 부합합니다. AI 분야 진출 의지를 강력히 보여줍니다."
              : s.subjectName === "국어"
                ? "국어 세특이 진로와의 연결 없이 일반적인 문학 감상에 머물고 있습니다. 디지털 시대의 언어 변화 발표는 좋은 시도이나, 자연어 처리(NLP)와의 연결까지 확장하면 컴퓨터공학 진로와의 접점을 만들 수 있습니다."
                : s.subjectName === "물리학Ⅰ"
                  ? "반도체 원리 탐구를 통해 물리학과 컴퓨터공학의 접점을 찾으려 한 점은 좋으나, 탐구가 개론 수준에 머물고 있습니다. 양자역학적 관점에서 반도체의 밴드갭 분석이나, 물리 시뮬레이션 프로그래밍으로 확장하면 전공 적합성이 크게 향상됩니다."
                  : s.subjectName === "생활과윤리"
                    ? "AI 윤리를 다룬 탐구는 컴퓨터공학 전공자의 사회적 책임감을 잘 보여줍니다. 단순 문제 제기를 넘어 구체적 가이드라인을 제안한 점이 우수하며, 서울대 평가에서 '공동체 역량'의 좋은 근거가 됩니다."
                    : s.subjectName === "기술가정"
                      ? "IoT 프로젝트를 설계부터 구현까지 자기주도적으로 수행한 점이 인상적입니다. 하드웨어와 소프트웨어를 결합하는 역량은 컴퓨터공학 전공에서 매우 중요한 실무 역량이며, 1학년에서 이 수준의 프로젝트를 수행한 것은 발전가능성 측면에서 높이 평가됩니다."
                      : undefined,
    improvementDirection:
      s.subjectName === "국어"
        ? "국어 세특에서 '자연어 처리와 인간 언어의 관계' 또는 '프로그래밍 언어와 자연어의 구조적 유사성'을 주제로 탐구하면 진로 연결성을 확보할 수 있습니다."
        : s.subjectName === "물리학Ⅰ"
          ? "3학년 물리학Ⅱ에서 전자기파나 양자역학 단원과 컴퓨터 하드웨어의 연결을 심화 탐구하고, 물리 시뮬레이션 프로그래밍을 시도하면 전공 적합성이 크게 향상됩니다."
          : s.subjectName === "화학Ⅰ"
            ? "계산화학이나 분자 시뮬레이션 등 화학과 컴퓨터과학의 접점을 탐구하면 비전공 교과에서도 진로 연결성을 확보할 수 있습니다."
            : s.subjectName === "한국어문학"
              ? "SF 문학에서 다루는 기술 윤리 문제를 비평적으로 분석하거나, 텍스트 마이닝을 활용한 문학 분석 등으로 진로와 연결하면 효과적입니다."
              : s.subjectName === "통합사회"
                ? "정보화 사회의 영향을 분석할 때 빅데이터, 개인정보 보호법 등 구체적 사례와 통계 자료를 활용하면 분석의 깊이를 높일 수 있습니다."
                : undefined,
    crossSubjectConnections:
      s.subjectName === "정보"
        ? [
            {
              targetSubject: "수학Ⅱ",
              connectionType: "주제연결" as const,
              description:
                "정보의 알고리즘 효율성 분석과 수학의 함수 극한 개념이 '최적화'라는 주제로 연결됨",
            },
            {
              targetSubject: "인공지능수학",
              connectionType: "주제연결" as const,
              description:
                "알고리즘 구현 역량이 인공지능수학에서의 CNN 원리 탐구와 직접적으로 연결됨",
            },
          ]
        : s.subjectName === "미적분"
          ? [
              {
                targetSubject: "인공지능수학",
                connectionType: "역량연결" as const,
                description:
                  "미적분의 수치 해석 기법이 인공지능수학의 경사하강법 이해에 기반이 됨",
              },
            ]
          : s.subjectName === "생활과윤리"
            ? [
                {
                  targetSubject: "정보",
                  connectionType: "주제연결" as const,
                  description:
                    "AI 윤리 탐구가 정보 교과의 알고리즘 개발과 '책임 있는 기술 개발'이라는 주제로 연결됨",
                },
              ]
            : s.subjectName === "물리학Ⅰ"
              ? [
                  {
                    targetSubject: "기술가정",
                    connectionType: "역량연결" as const,
                    description:
                      "반도체 원리 이해가 기술가정의 IoT 하드웨어 설계 역량과 연결됨",
                  },
                ]
              : s.subjectName === "수학Ⅰ"
                ? [
                    {
                      targetSubject: "정보",
                      connectionType: "주제연결" as const,
                      description:
                        "RSA 암호화의 수학적 기반 탐구가 정보 교과의 알고리즘 이해와 연결됨",
                    },
                  ]
                : undefined,
  })),
};

const subjectAnalysisPremium: SubjectAnalysisSection = {
  sectionId: "subjectAnalysis",
  title: "교과 세특 분석",
  // v4
  summaryDashboard: {
    totalSubjects: 19,
    excellentCount: 6,
    goodCount: 7,
    averageCount: 6,
    weakCount: 0,
    overallQualityScore: 76,
  },
  characterLabel: {
    label: "코드로 세상을 설계하는 융합형 탐구자",
    rationale:
      "수학적 사고와 프로그래밍 역량을 거의 모든 교과에 연결하며, 알고리즘·AI·IoT 등 다양한 기술 분야를 교차 탐구하는 융합형 인재",
  },
  subjectGroupMatrix: [
    {
      group: "국어",
      적극성: "보통" as const,
      탐구정신: "미흡" as const,
      전공진로탐색: "미흡" as const,
      협력성: "보통" as const,
    },
    {
      group: "수학",
      적극성: "우수" as const,
      탐구정신: "우수" as const,
      전공진로탐색: "우수" as const,
      협력성: "보통" as const,
    },
    {
      group: "영어",
      적극성: "보통" as const,
      탐구정신: "보통" as const,
      전공진로탐색: "보통" as const,
      협력성: "보통" as const,
    },
    {
      group: "사회",
      적극성: "보통" as const,
      탐구정신: "보통" as const,
      전공진로탐색: "보통" as const,
      협력성: "보통" as const,
    },
    {
      group: "과학",
      적극성: "보통" as const,
      탐구정신: "보통" as const,
      전공진로탐색: "보통" as const,
      협력성: "보통" as const,
    },
    {
      group: "기타",
      적극성: "우수" as const,
      탐구정신: "우수" as const,
      전공진로탐색: "우수" as const,
      협력성: "보통" as const,
    },
  ],
  subjects: subjectAnalysisStandard.subjects.map((s) => ({
    ...s,
    tierRating: [
      "정보",
      "수학Ⅱ",
      "미적분",
      "인공지능수학",
      "기술가정",
      "수학Ⅰ",
    ].includes(s.subjectName)
      ? ("우수" as const)
      : ["국어", "한국어문학", "통합사회", "한국사", "화학Ⅰ", "음악"].includes(
            s.subjectName
          )
        ? ("미흡" as const)
        : ("보통" as const),
    importancePercent:
      s.subjectName === "정보"
        ? 18
        : s.subjectName === "인공지능수학"
          ? 14
          : s.subjectName === "수학Ⅱ"
            ? 10
            : s.subjectName === "미적분"
              ? 10
              : s.subjectName === "기술가정"
                ? 8
                : s.subjectName === "수학Ⅰ"
                  ? 6
                  : s.subjectName === "물리학Ⅰ"
                    ? 5
                    : s.subjectName === "확률과통계"
                      ? 5
                      : s.subjectName === "생활과윤리"
                        ? 4
                        : s.subjectName === "영어Ⅱ"
                          ? 3
                          : s.subjectName === "영어Ⅰ"
                            ? 3
                            : s.subjectName === "통합과학"
                              ? 3
                              : s.subjectName === "국어"
                                ? 2
                                : s.subjectName === "화학Ⅰ"
                                  ? 2
                                  : s.subjectName === "한국사"
                                    ? 2
                                    : s.subjectName === "체육"
                                      ? 2
                                      : 1,
    evaluationImpact: ["정보", "인공지능수학", "수학Ⅱ", "미적분"].includes(
      s.subjectName
    )
      ? ("high" as const)
      : ["기술가정", "수학Ⅰ", "물리학Ⅰ", "확률과통계", "생활과윤리"].includes(
            s.subjectName
          )
        ? ("medium" as const)
        : ("low" as const),
    volumeMetric: {
      category: "교과 세특",
      maxCapacityChars: 500,
      actualChars:
        s.subjectName === "정보"
          ? 485
          : s.subjectName === "인공지능수학"
            ? 478
            : s.subjectName === "미적분"
              ? 460
              : s.subjectName === "수학Ⅱ"
                ? 445
                : s.subjectName === "기술가정"
                  ? 470
                  : s.subjectName === "수학Ⅰ"
                    ? 430
                    : s.subjectName === "물리학Ⅰ"
                      ? 410
                      : s.subjectName === "확률과통계"
                        ? 395
                        : s.subjectName === "생활과윤리"
                          ? 420
                          : s.subjectName === "영어Ⅱ"
                            ? 380
                            : s.subjectName === "영어Ⅰ"
                              ? 360
                              : s.subjectName === "통합과학"
                                ? 390
                                : s.subjectName === "국어"
                                  ? 320
                                  : s.subjectName === "화학Ⅰ"
                                    ? 340
                                    : s.subjectName === "한국사"
                                      ? 310
                                      : s.subjectName === "통합사회"
                                        ? 300
                                        : s.subjectName === "한국어문학"
                                          ? 290
                                          : s.subjectName === "체육"
                                            ? 280
                                            : 260,
      fillRate:
        s.subjectName === "정보"
          ? 97
          : s.subjectName === "인공지능수학"
            ? 96
            : s.subjectName === "미적분"
              ? 92
              : s.subjectName === "수학Ⅱ"
                ? 89
                : s.subjectName === "기술가정"
                  ? 94
                  : s.subjectName === "수학Ⅰ"
                    ? 86
                    : s.subjectName === "물리학Ⅰ"
                      ? 82
                      : s.subjectName === "확률과통계"
                        ? 79
                        : s.subjectName === "생활과윤리"
                          ? 84
                          : s.subjectName === "영어Ⅱ"
                            ? 76
                            : s.subjectName === "영어Ⅰ"
                              ? 72
                              : s.subjectName === "통합과학"
                                ? 78
                                : s.subjectName === "국어"
                                  ? 64
                                  : s.subjectName === "화학Ⅰ"
                                    ? 68
                                    : s.subjectName === "한국사"
                                      ? 62
                                      : s.subjectName === "통합사회"
                                        ? 60
                                        : s.subjectName === "한국어문학"
                                          ? 58
                                          : s.subjectName === "체육"
                                            ? 56
                                            : 52,
      comparisonGroupAvg: 78,
    },
    competencyMatrix:
      s.subjectName === "정보"
        ? [
            {
              dimension: "탐구 깊이",
              rating: "우수" as const,
              evidence: "알고리즘 시간 복잡도 분석 및 최적화 수행",
            },
            {
              dimension: "전공 적합성",
              rating: "우수" as const,
              evidence: "컴퓨터공학 핵심 알고리즘 직접 구현",
            },
            {
              dimension: "자기주도성",
              rating: "우수" as const,
              evidence: "교과 범위를 넘어선 자발적 심화 탐구",
            },
            {
              dimension: "표현 능력",
              rating: "보통" as const,
              evidence: "기술적 내용의 논리적 서술",
            },
          ]
        : s.subjectName === "수학Ⅱ"
          ? [
              {
                dimension: "교과 이해도",
                rating: "우수" as const,
                evidence: "함수의 극한 개념 정확한 이해",
              },
              {
                dimension: "융합 사고",
                rating: "우수" as const,
                evidence: "수학-AI 기술 연결 탐구",
              },
              {
                dimension: "탐구 깊이",
                rating: "보통" as const,
                evidence: "경사하강법 원리 분석",
              },
            ]
          : s.subjectName === "미적분"
            ? [
                {
                  dimension: "교과 이해도",
                  rating: "우수" as const,
                  evidence: "미분·적분 개념의 정확한 활용",
                },
                {
                  dimension: "탐구 깊이",
                  rating: "우수" as const,
                  evidence: "수치 해석 기법 분석 및 구현",
                },
                {
                  dimension: "전공 적합성",
                  rating: "우수" as const,
                  evidence: "수학적 사고를 프로그래밍에 적용",
                },
                {
                  dimension: "자기주도성",
                  rating: "우수" as const,
                  evidence: "교과 외 수치 해석 기법 자발적 학습",
                },
              ]
            : s.subjectName === "인공지능수학"
              ? [
                  {
                    dimension: "탐구 깊이",
                    rating: "우수" as const,
                    evidence: "CNN의 수학적 원리 행렬 연산으로 분석",
                  },
                  {
                    dimension: "전공 적합성",
                    rating: "우수" as const,
                    evidence: "AI 핵심 기술의 수학적 기반 이해",
                  },
                  {
                    dimension: "자기주도성",
                    rating: "우수" as const,
                    evidence: "교과 범위 초과 심화 학습",
                  },
                  {
                    dimension: "표현 능력",
                    rating: "보통" as const,
                    evidence: "수학적 개념의 시각화 발표",
                  },
                ]
              : s.subjectName === "기술가정"
                ? [
                    {
                      dimension: "전공 적합성",
                      rating: "우수" as const,
                      evidence: "IoT 시스템 설계 및 프로그래밍",
                    },
                    {
                      dimension: "자기주도성",
                      rating: "우수" as const,
                      evidence: "프로젝트 전 과정 자기주도 수행",
                    },
                    {
                      dimension: "탐구 깊이",
                      rating: "우수" as const,
                      evidence: "하드웨어-소프트웨어 통합 구현",
                    },
                  ]
                : s.subjectName === "물리학Ⅰ"
                  ? [
                      {
                        dimension: "교과 이해도",
                        rating: "보통" as const,
                        evidence: "전자기학 기본 개념 이해",
                      },
                      {
                        dimension: "전공 적합성",
                        rating: "보통" as const,
                        evidence: "반도체-하드웨어 연결 시도",
                      },
                      {
                        dimension: "탐구 깊이",
                        rating: "미흡" as const,
                        evidence: "개론 수준의 탐구에 머무름",
                      },
                    ]
                  : s.subjectName === "확률과통계"
                    ? [
                        {
                          dimension: "교과 이해도",
                          rating: "보통" as const,
                          evidence: "조건부 확률 개념 이해",
                        },
                        {
                          dimension: "융합 사고",
                          rating: "보통" as const,
                          evidence: "베이즈 정리의 IT 적용",
                        },
                        {
                          dimension: "탐구 깊이",
                          rating: "보통" as const,
                          evidence: "확률 모델 보고서 작성",
                        },
                      ]
                    : s.subjectName === "화학Ⅰ"
                      ? [
                          {
                            dimension: "교과 이해도",
                            rating: "보통" as const,
                            evidence: "물질의 성질 기본 이해",
                          },
                          {
                            dimension: "전공 적합성",
                            rating: "미흡" as const,
                            evidence: "반도체 소재 탐구 시도",
                          },
                          {
                            dimension: "탐구 깊이",
                            rating: "미흡" as const,
                            evidence: "화학적 분석 깊이 부족",
                          },
                        ]
                      : s.subjectName === "영어Ⅱ"
                        ? [
                            {
                              dimension: "교과 이해도",
                              rating: "보통" as const,
                              evidence: "영어 에세이 작성 능력",
                            },
                            {
                              dimension: "전공 적합성",
                              rating: "보통" as const,
                              evidence: "기술 관련 영어 콘텐츠 활용",
                            },
                            {
                              dimension: "표현 능력",
                              rating: "보통" as const,
                              evidence: "TED 강연 요약 발표",
                            },
                          ]
                        : s.subjectName === "영어Ⅰ"
                          ? [
                              {
                                dimension: "교과 이해도",
                                rating: "보통" as const,
                                evidence: "영어 원서 독해 능력",
                              },
                              {
                                dimension: "전공 적합성",
                                rating: "보통" as const,
                                evidence: "IT 기업가 관련 영어 활동",
                              },
                              {
                                dimension: "탐구 깊이",
                                rating: "미흡" as const,
                                evidence: "학술적 영어 활용 미흡",
                              },
                            ]
                          : s.subjectName === "국어"
                            ? [
                                {
                                  dimension: "교과 이해도",
                                  rating: "보통" as const,
                                  evidence: "기본적 문학 감상 역량",
                                },
                                {
                                  dimension: "전공 적합성",
                                  rating: "미흡" as const,
                                  evidence: "진로 연결 부족",
                                },
                                {
                                  dimension: "탐구 깊이",
                                  rating: "미흡" as const,
                                  evidence: "일반적 수준의 감상에 머무름",
                                },
                              ]
                            : s.subjectName === "생활과윤리"
                              ? [
                                  {
                                    dimension: "교과 이해도",
                                    rating: "보통" as const,
                                    evidence: "윤리적 논증 구조 이해",
                                  },
                                  {
                                    dimension: "전공 적합성",
                                    rating: "우수" as const,
                                    evidence: "AI 윤리와 진로 연결",
                                  },
                                  {
                                    dimension: "탐구 깊이",
                                    rating: "보통" as const,
                                    evidence: "구체적 가이드라인 제안",
                                  },
                                ]
                              : s.subjectName === "한국사"
                                ? [
                                    {
                                      dimension: "교과 이해도",
                                      rating: "보통" as const,
                                      evidence: "시대별 정리 능력",
                                    },
                                    {
                                      dimension: "전공 적합성",
                                      rating: "미흡" as const,
                                      evidence: "과학기술사 시도",
                                    },
                                    {
                                      dimension: "탐구 깊이",
                                      rating: "미흡" as const,
                                      evidence: "단순 나열 수준",
                                    },
                                  ]
                                : s.subjectName === "통합과학"
                                  ? [
                                      {
                                        dimension: "교과 이해도",
                                        rating: "보통" as const,
                                        evidence: "과학적 탐구 과정 이해",
                                      },
                                      {
                                        dimension: "탐구 깊이",
                                        rating: "보통" as const,
                                        evidence: "데이터 수집·분석 역량",
                                      },
                                      {
                                        dimension: "표현 능력",
                                        rating: "보통" as const,
                                        evidence: "보고서 작성 능력",
                                      },
                                    ]
                                  : s.subjectName === "통합사회"
                                    ? [
                                        {
                                          dimension: "교과 이해도",
                                          rating: "보통" as const,
                                          evidence: "사회 현상 기본 이해",
                                        },
                                        {
                                          dimension: "전공 적합성",
                                          rating: "미흡" as const,
                                          evidence: "정보화 주제 선택",
                                        },
                                        {
                                          dimension: "탐구 깊이",
                                          rating: "미흡" as const,
                                          evidence: "표면적 분석 수준",
                                        },
                                      ]
                                    : s.subjectName === "한국어문학"
                                      ? [
                                          {
                                            dimension: "교과 이해도",
                                            rating: "보통" as const,
                                            evidence: "문학 감상 기본 역량",
                                          },
                                          {
                                            dimension: "전공 적합성",
                                            rating: "미흡" as const,
                                            evidence:
                                              "SF 소설 통한 진로 연결 시도",
                                          },
                                          {
                                            dimension: "탐구 깊이",
                                            rating: "미흡" as const,
                                            evidence: "비평적 분석 미흡",
                                          },
                                        ]
                                      : s.subjectName === "수학Ⅰ"
                                        ? [
                                            {
                                              dimension: "교과 이해도",
                                              rating: "우수" as const,
                                              evidence:
                                                "지수·로그 함수 정확한 이해",
                                            },
                                            {
                                              dimension: "전공 적합성",
                                              rating: "우수" as const,
                                              evidence: "RSA 암호와 수학 연결",
                                            },
                                            {
                                              dimension: "탐구 깊이",
                                              rating: "보통" as const,
                                              evidence:
                                                "암호화 원리 수학적 분석",
                                            },
                                          ]
                                        : s.subjectName === "체육"
                                          ? [
                                              {
                                                dimension: "협력성",
                                                rating: "보통" as const,
                                                evidence: "팀 경기 참여",
                                              },
                                              {
                                                dimension: "전공 적합성",
                                                rating: "보통" as const,
                                                evidence: "데이터 분석적 접근",
                                              },
                                              {
                                                dimension: "자기주도성",
                                                rating: "보통" as const,
                                                evidence:
                                                  "전략 분석 역할 자발적 수행",
                                              },
                                            ]
                                          : [
                                              {
                                                dimension: "교과 이해도",
                                                rating: "보통" as const,
                                                evidence: "기본 역량 충족",
                                              },
                                              {
                                                dimension: "전공 적합성",
                                                rating: "미흡" as const,
                                                evidence: "진로 연결 미흡",
                                              },
                                            ],
    citationAnalysis:
      s.subjectName === "정보"
        ? [
            {
              originalText:
                "다익스트라 알고리즘의 시간 복잡도를 분석하여 O(V²)에서 우선순위 큐를 활용해 O((V+E)logV)로 최적화하는 과정을 탐구함.",
              source: "2학년 정보 세특",
              competencyTags: [
                {
                  category: "academic" as const,
                  subcategory: "탐구 역량",
                  assessment: "우수" as const,
                },
              ],
              assessment: "우수" as const,
              positivePoint: "빅오 표기법의 정확한 사용과 최적화 사고가 돋보임",
            },
            {
              originalText:
                "실제 지도 데이터를 활용한 최단 경로 탐색 프로그램을 구현하여 알고리즘의 실용성을 검증함.",
              source: "2학년 정보 세특",
              competencyTags: [
                {
                  category: "career" as const,
                  subcategory: "전공 적합성",
                  assessment: "우수" as const,
                },
              ],
              assessment: "우수" as const,
              positivePoint: "이론을 실제 데이터에 적용하는 실행력이 우수",
            },
            {
              originalText: "모둠 활동에서 프로그램 시연을 담당하여 발표함.",
              source: "2학년 정보 세특",
              competencyTags: [
                { category: "community" as const, subcategory: "협업 능력" },
              ],
              assessment: "미흡" as const,
              improvementSuggestion:
                "구체적 역할과 기여 내용이 드러나도록 기록 보완 필요",
            },
          ]
        : s.subjectName === "수학Ⅱ"
          ? [
              {
                originalText:
                  "경사하강법의 학습률이 수렴 속도에 미치는 영향을 수학적으로 분석하고 시각화 프로그램으로 검증함.",
                source: "2학년 수학Ⅱ 세특",
                competencyTags: [
                  {
                    category: "academic" as const,
                    subcategory: "융합 사고",
                    assessment: "우수" as const,
                  },
                ],
                assessment: "우수" as const,
                positivePoint:
                  "수학적 분석과 프로그래밍 검증을 결합한 융합적 접근",
              },
              {
                originalText:
                  "함수의 극한 개념을 활용하여 머신러닝의 경사하강법 원리를 탐구하고 발표함.",
                source: "2학년 수학Ⅱ 세특",
                competencyTags: [
                  {
                    category: "academic" as const,
                    subcategory: "교과 성취도",
                    assessment: "우수" as const,
                  },
                ],
                assessment: "우수" as const,
                positivePoint: "수학 개념의 실제 기술 적용 시도",
              },
            ]
          : s.subjectName === "미적분"
            ? [
                {
                  originalText:
                    "뉴턴-라프슨 방법의 수렴 조건을 분석하고, Python으로 구현하여 다양한 함수에 적용해봄.",
                  source: "2학년 미적분 세특",
                  competencyTags: [
                    {
                      category: "academic" as const,
                      subcategory: "탐구 역량",
                      assessment: "우수" as const,
                    },
                  ],
                  assessment: "우수" as const,
                  positivePoint:
                    "이론 분석과 프로그래밍 구현을 결합한 체계적 탐구",
                },
                {
                  originalText:
                    "테일러 급수를 활용한 함수 근사 프로그램을 작성하여 오차 범위를 비교 분석함.",
                  source: "2학년 미적분 세특",
                  competencyTags: [
                    {
                      category: "academic" as const,
                      subcategory: "교과 성취도",
                      assessment: "우수" as const,
                    },
                  ],
                  assessment: "우수" as const,
                  positivePoint: "수학적 정확성과 실험적 검증의 균형",
                },
                {
                  originalText:
                    "급수의 수렴과 발산 조건을 비율 판정법으로 분석하는 과정을 체계적으로 정리함.",
                  source: "2학년 미적분 세특",
                  competencyTags: [
                    {
                      category: "academic" as const,
                      subcategory: "교과 성취도",
                      assessment: "보통" as const,
                    },
                  ],
                  assessment: "보통" as const,
                  positivePoint: "수학적 논증의 체계성",
                },
              ]
            : s.subjectName === "인공지능수학"
              ? [
                  {
                    originalText:
                      "합성곱 신경망(CNN)의 커널 연산이 행렬 곱셈으로 구현되는 과정을 수학적으로 분석함.",
                    source: "2학년 인공지능수학 세특",
                    competencyTags: [
                      {
                        category: "academic" as const,
                        subcategory: "탐구 역량",
                        assessment: "우수" as const,
                      },
                      {
                        category: "career" as const,
                        subcategory: "전공 적합성",
                        assessment: "우수" as const,
                      },
                    ],
                    assessment: "우수" as const,
                    positivePoint:
                      "AI 핵심 기술의 수학적 원리를 깊이 있게 분석",
                  },
                  {
                    originalText:
                      "경사하강법에서 편미분의 역할을 수식으로 유도하고 학습률에 따른 수렴 양상을 시각화함.",
                    source: "2학년 인공지능수학 세특",
                    competencyTags: [
                      {
                        category: "academic" as const,
                        subcategory: "융합 사고",
                        assessment: "우수" as const,
                      },
                    ],
                    assessment: "우수" as const,
                    positivePoint: "수학적 유도와 시각화를 결합한 탐구",
                  },
                  {
                    originalText:
                      "이미지 변환 행렬을 직접 구성하여 회전·확대·축소 변환을 프로그래밍으로 구현함.",
                    source: "2학년 인공지능수학 세특",
                    competencyTags: [
                      {
                        category: "career" as const,
                        subcategory: "전공 적합성",
                        assessment: "우수" as const,
                      },
                    ],
                    assessment: "우수" as const,
                    positivePoint: "수학 이론을 실제 코드로 구현하는 실행력",
                  },
                ]
              : s.subjectName === "기술가정"
                ? [
                    {
                      originalText:
                        "아두이노 센서 데이터를 실시간으로 처리하는 알고리즘을 직접 설계하고 C++ 코드로 구현함.",
                      source: "1학년 기술가정 세특",
                      competencyTags: [
                        {
                          category: "career" as const,
                          subcategory: "전공 적합성",
                          assessment: "우수" as const,
                        },
                      ],
                      assessment: "우수" as const,
                      positivePoint: "하드웨어와 소프트웨어를 통합하는 역량",
                    },
                    {
                      originalText:
                        "토양 수분 센서와 급수 펌프를 연동하는 자동 제어 시스템을 설계하고 회로도를 직접 작성함.",
                      source: "1학년 기술가정 세특",
                      competencyTags: [
                        {
                          category: "academic" as const,
                          subcategory: "탐구 역량",
                          assessment: "우수" as const,
                        },
                      ],
                      assessment: "우수" as const,
                      positivePoint:
                        "설계부터 구현까지 자기주도적 프로젝트 수행",
                    },
                  ]
                : s.subjectName === "수학Ⅰ"
                  ? [
                      {
                        originalText:
                          "RSA 암호 알고리즘에서 소인수분해의 어려움이 보안 강도를 결정한다는 점을 수학적으로 설명함.",
                        source: "1학년 수학Ⅰ 세특",
                        competencyTags: [
                          {
                            category: "academic" as const,
                            subcategory: "탐구 역량",
                            assessment: "보통" as const,
                          },
                          {
                            category: "career" as const,
                            subcategory: "전공 적합성",
                            assessment: "우수" as const,
                          },
                        ],
                        assessment: "우수" as const,
                        positivePoint:
                          "수학과 정보보안의 연결을 1학년부터 시도",
                      },
                    ]
                  : s.subjectName === "생활과윤리"
                    ? [
                        {
                          originalText:
                            "AI 알고리즘의 편향성이 사회적 불평등을 심화할 수 있다는 점을 구체적 사례를 들어 분석함.",
                          source: "2학년 생활과윤리 세특",
                          competencyTags: [
                            {
                              category: "community" as const,
                              subcategory: "시민의식",
                              assessment: "보통" as const,
                            },
                          ],
                          assessment: "보통" as const,
                          positivePoint: "기술 개발자의 사회적 책임감 표현",
                        },
                        {
                          originalText:
                            "AI 개발 윤리 가이드라인을 직접 작성하여 '공정성, 투명성, 책임성' 3대 원칙을 제안함.",
                          source: "2학년 생활과윤리 세특",
                          competencyTags: [
                            {
                              category: "community" as const,
                              subcategory: "시민의식",
                              assessment: "보통" as const,
                            },
                          ],
                          assessment: "보통" as const,
                          positivePoint: "구체적 대안 제시 능력",
                        },
                      ]
                    : s.subjectName === "물리학Ⅰ"
                      ? [
                          {
                            originalText:
                              "반도체의 p-n 접합 원리를 전자기학 개념으로 설명하고 컴퓨터 프로세서와의 연결을 분석함.",
                            source: "2학년 물리학Ⅰ 세특",
                            competencyTags: [
                              {
                                category: "academic" as const,
                                subcategory: "교과 성취도",
                                assessment: "보통" as const,
                              },
                            ],
                            assessment: "보통" as const,
                            positivePoint: "물리학과 컴퓨터공학의 연결 시도",
                            improvementSuggestion:
                              "실험적 검증이나 시뮬레이션을 추가하면 탐구의 깊이가 향상됨",
                          },
                        ]
                      : s.subjectName === "통합과학"
                        ? [
                            {
                              originalText:
                                "에너지 효율 실험에서 데이터를 체계적으로 수집하고 스프레드시트로 그래프를 작성하여 경향성을 분석함.",
                              source: "1학년 통합과학 세특",
                              competencyTags: [
                                {
                                  category: "academic" as const,
                                  subcategory: "탐구 역량",
                                  assessment: "보통" as const,
                                },
                              ],
                              assessment: "보통" as const,
                              positivePoint: "데이터 기반 분석 역량",
                            },
                          ]
                        : undefined,
    sentenceAnalysis:
      s.subjectName === "정보"
        ? [
            {
              sentence:
                "다익스트라 알고리즘의 시간 복잡도를 분석하여 O(V²)에서 우선순위 큐를 활용해 O((V+E)logV)로 최적화하는 과정을 탐구함.",
              evaluation:
                "알고리즘 최적화 역량을 직접적으로 보여주는 핵심 문장. 빅오 표기법의 정확한 사용이 돋보임.",
              competencyTags: [
                {
                  category: "academic" as const,
                  subcategory: "탐구 역량",
                  assessment: "우수" as const,
                },
              ],
              highlight: "positive" as const,
            },
            {
              sentence:
                "실제 지도 데이터를 활용한 최단 경로 탐색 프로그램을 구현하여 알고리즘의 실용성을 검증함.",
              evaluation:
                "이론을 실제 데이터에 적용하는 실용적 역량을 보여주는 우수한 서술.",
              competencyTags: [
                {
                  category: "career" as const,
                  subcategory: "전공 적합성",
                  assessment: "우수" as const,
                },
              ],
              highlight: "positive" as const,
            },
            {
              sentence:
                "Python 언어로 그래프 자료구조를 직접 구현하고 인접 리스트 방식과 인접 행렬 방식의 성능을 비교함.",
              evaluation:
                "자료구조에 대한 깊은 이해와 비교 분석 능력이 드러나는 우수한 서술.",
              competencyTags: [
                {
                  category: "academic" as const,
                  subcategory: "탐구 역량",
                  assessment: "우수" as const,
                },
              ],
              highlight: "positive" as const,
            },
            {
              sentence:
                "알고리즘의 정확성을 검증하기 위해 다양한 테스트 케이스를 설계하고 결과를 분석함.",
              evaluation:
                "소프트웨어 테스팅의 기본 개념을 실천하고 있어 실무적 역량이 엿보임.",
              competencyTags: [
                {
                  category: "career" as const,
                  subcategory: "전공 적합성",
                  assessment: "보통" as const,
                },
              ],
              highlight: "positive" as const,
            },
            {
              sentence: "모둠 활동에서 프로그램 시연을 담당하여 발표함.",
              evaluation:
                "역할이 구체적으로 드러나지 않는 일반적 서술. 어떤 기여를 했는지 구체적으로 기록되어야 함.",
              competencyTags: [
                { category: "community" as const, subcategory: "협업 능력" },
              ],
              highlight: "neutral" as const,
              improvementSuggestion:
                "'팀 내 백엔드 로직 설계를 주도하고, 프론트엔드 담당 팀원과 협업하여 사용자 인터페이스를 구현함'과 같이 구체적 역할을 드러내야 합니다.",
            },
          ]
        : s.subjectName === "수학Ⅱ"
          ? [
              {
                sentence:
                  "함수의 극한 개념을 활용하여 머신러닝의 경사하강법 원리를 탐구하고 발표함.",
                evaluation:
                  "수학과 AI를 연결하는 융합적 사고가 돋보이는 핵심 문장.",
                competencyTags: [
                  {
                    category: "academic" as const,
                    subcategory: "융합 사고",
                    assessment: "우수" as const,
                  },
                ],
                highlight: "positive" as const,
              },
              {
                sentence:
                  "경사하강법의 학습률을 변화시키며 수렴 속도의 변화를 관찰하고 그래프로 시각화함.",
                evaluation:
                  "실험적 검증을 통해 이론적 이해를 공고히 하는 과정이 체계적임.",
                competencyTags: [
                  {
                    category: "academic" as const,
                    subcategory: "탐구 역량",
                    assessment: "보통" as const,
                  },
                ],
                highlight: "positive" as const,
              },
              {
                sentence:
                  "수학적 개념을 실생활에 적용하고자 하는 태도가 돋보이는 학생임.",
                evaluation:
                  "교사의 총평으로 학생의 일반적 태도를 기술. 구체적 역량 근거로는 약함.",
                competencyTags: [
                  { category: "growth" as const, subcategory: "자기주도성" },
                ],
                highlight: "neutral" as const,
              },
              {
                sentence:
                  "모둠 탐구에서 시각화 자료 제작을 담당하여 발표 자료의 완성도를 높임.",
                evaluation:
                  "협업에서의 역할이 명확히 드러나며, 시각적 표현 능력을 보여줌.",
                competencyTags: [
                  {
                    category: "community" as const,
                    subcategory: "협업 능력",
                    assessment: "보통" as const,
                  },
                ],
                highlight: "positive" as const,
              },
              {
                sentence:
                  "수학 개념과 프로그래밍을 연결하려는 노력이 향후 발전 가능성을 보여줌.",
                evaluation:
                  "교사 총평 성격의 문장. 발전가능성 평가의 근거가 되나 구체성은 부족.",
                competencyTags: [
                  { category: "growth" as const, subcategory: "발전가능성" },
                ],
                highlight: "neutral" as const,
              },
            ]
          : s.subjectName === "미적분"
            ? [
                {
                  sentence:
                    "뉴턴-라프슨 방법의 수렴 조건을 이론적으로 분석한 후 Python으로 구현하여 다양한 함수에 적용함.",
                  evaluation: "이론과 실습을 결합한 체계적 탐구 과정이 우수함.",
                  competencyTags: [
                    {
                      category: "academic" as const,
                      subcategory: "탐구 역량",
                      assessment: "우수" as const,
                    },
                  ],
                  highlight: "positive" as const,
                },
                {
                  sentence:
                    "테일러 급수의 항 수에 따른 근사 오차를 수치적으로 비교하여 수렴 속도를 분석함.",
                  evaluation:
                    "수학적 엄밀성과 실험적 검증의 균형이 돋보이는 서술.",
                  competencyTags: [
                    {
                      category: "academic" as const,
                      subcategory: "교과 성취도",
                      assessment: "우수" as const,
                    },
                  ],
                  highlight: "positive" as const,
                },
                {
                  sentence:
                    "급수의 수렴과 발산 조건을 비율 판정법으로 분석하는 과정을 체계적으로 정리함.",
                  evaluation: "교과 핵심 내용에 대한 이해도가 높음.",
                  competencyTags: [
                    {
                      category: "academic" as const,
                      subcategory: "교과 성취도",
                      assessment: "보통" as const,
                    },
                  ],
                  highlight: "positive" as const,
                },
                {
                  sentence:
                    "미적분 개념이 컴퓨터 그래픽스와 물리 엔진에 어떻게 활용되는지 조사하여 발표함.",
                  evaluation: "수학의 실용적 적용을 탐색하는 진로 연결 시도.",
                  competencyTags: [
                    {
                      category: "career" as const,
                      subcategory: "전공 적합성",
                      assessment: "보통" as const,
                    },
                  ],
                  highlight: "positive" as const,
                },
                {
                  sentence:
                    "수학적 사고력이 뛰어나며 개념 이해를 넘어 응용에 강한 학생임.",
                  evaluation:
                    "교사 총평으로 학생의 전반적 수학 역량을 긍정 평가.",
                  competencyTags: [
                    { category: "growth" as const, subcategory: "발전가능성" },
                  ],
                  highlight: "neutral" as const,
                },
              ]
            : s.subjectName === "인공지능수학"
              ? [
                  {
                    sentence:
                      "합성곱 신경망(CNN)의 커널 연산이 행렬 곱셈으로 구현되는 과정을 수학적으로 분석함.",
                    evaluation:
                      "AI 핵심 기술의 수학적 원리를 깊이 이해하고 분석한 탁월한 서술.",
                    competencyTags: [
                      {
                        category: "academic" as const,
                        subcategory: "탐구 역량",
                        assessment: "우수" as const,
                      },
                    ],
                    highlight: "positive" as const,
                  },
                  {
                    sentence:
                      "경사하강법에서 편미분의 역할을 수식으로 유도하고 학습률에 따른 수렴 양상을 시각화함.",
                    evaluation:
                      "수학적 유도와 시각적 검증을 결합한 우수한 탐구 방법론.",
                    competencyTags: [
                      {
                        category: "academic" as const,
                        subcategory: "융합 사고",
                        assessment: "우수" as const,
                      },
                    ],
                    highlight: "positive" as const,
                  },
                  {
                    sentence:
                      "이미지 변환 행렬을 직접 구성하여 회전·확대·축소 변환을 프로그래밍으로 구현함.",
                    evaluation: "수학 이론을 코드로 구현하는 실행력이 뛰어남.",
                    competencyTags: [
                      {
                        category: "career" as const,
                        subcategory: "전공 적합성",
                        assessment: "우수" as const,
                      },
                    ],
                    highlight: "positive" as const,
                  },
                  {
                    sentence:
                      "최소제곱법을 활용한 선형 회귀 분석의 원리를 행렬 연산으로 증명하고 데이터셋에 적용함.",
                    evaluation:
                      "통계적 기법과 선형대수의 연결을 보여주는 심화 탐구.",
                    competencyTags: [
                      {
                        category: "academic" as const,
                        subcategory: "탐구 역량",
                        assessment: "우수" as const,
                      },
                    ],
                    highlight: "positive" as const,
                  },
                  {
                    sentence:
                      "인공지능의 수학적 기초에 대한 높은 이해도를 보여주며 향후 관련 분야 발전이 기대됨.",
                    evaluation: "교사 총평. 발전가능성에 대한 긍정적 평가.",
                    competencyTags: [
                      {
                        category: "growth" as const,
                        subcategory: "발전가능성",
                      },
                    ],
                    highlight: "neutral" as const,
                  },
                ]
              : s.subjectName === "기술가정"
                ? [
                    {
                      sentence:
                        "아두이노를 활용한 IoT 자동 급수 시스템을 직접 설계하고 센서 데이터 처리 프로그램을 C++로 작성함.",
                      evaluation:
                        "1학년에서 하드웨어-소프트웨어 통합 프로젝트를 수행한 점이 매우 인상적.",
                      competencyTags: [
                        {
                          category: "career" as const,
                          subcategory: "전공 적합성",
                          assessment: "우수" as const,
                        },
                      ],
                      highlight: "positive" as const,
                    },
                    {
                      sentence:
                        "토양 수분 센서와 급수 펌프를 연동하는 자동 제어 로직을 설계하고 회로도를 직접 작성함.",
                      evaluation:
                        "시스템 설계 역량과 하드웨어 이해가 돋보이는 서술.",
                      competencyTags: [
                        {
                          category: "academic" as const,
                          subcategory: "탐구 역량",
                          assessment: "우수" as const,
                        },
                      ],
                      highlight: "positive" as const,
                    },
                    {
                      sentence:
                        "프로젝트 발표에서 시연과 함께 개발 과정의 시행착오를 솔직하게 공유하여 호응을 얻음.",
                      evaluation:
                        "실패를 학습 과정으로 받아들이는 성장 마인드셋이 드러남.",
                      competencyTags: [
                        {
                          category: "growth" as const,
                          subcategory: "자기주도성",
                          assessment: "보통" as const,
                        },
                      ],
                      highlight: "positive" as const,
                    },
                    {
                      sentence:
                        "기술 분야에 대한 강한 열정과 실행력이 돋보이는 학생임.",
                      evaluation:
                        "교사 총평으로 학생의 전반적 태도에 대한 긍정 평가.",
                      competencyTags: [
                        {
                          category: "growth" as const,
                          subcategory: "발전가능성",
                        },
                      ],
                      highlight: "neutral" as const,
                    },
                  ]
                : s.subjectName === "물리학Ⅰ"
                  ? [
                      {
                        sentence:
                          "반도체의 p-n 접합 원리를 전자기학 개념으로 설명하고 컴퓨터 프로세서와의 연결을 분석함.",
                        evaluation:
                          "물리학과 컴퓨터공학의 연결을 시도한 점은 좋으나 분석 깊이가 아쉬움.",
                        competencyTags: [
                          {
                            category: "academic" as const,
                            subcategory: "교과 성취도",
                            assessment: "보통" as const,
                          },
                        ],
                        highlight: "positive" as const,
                      },
                      {
                        sentence:
                          "전자기 유도 법칙을 실험을 통해 확인하고 결과를 그래프로 정리함.",
                        evaluation:
                          "기본적인 실험 수행 능력과 데이터 정리 역량이 드러남.",
                        competencyTags: [
                          {
                            category: "academic" as const,
                            subcategory: "탐구 역량",
                            assessment: "보통" as const,
                          },
                        ],
                        highlight: "neutral" as const,
                      },
                      {
                        sentence:
                          "물리 현상에 대한 호기심이 있으며, 이공계 진로에 대한 관심을 꾸준히 표현함.",
                        evaluation:
                          "교사 총평 성격의 문장. 구체적 역량 근거보다는 태도 평가.",
                        competencyTags: [
                          {
                            category: "growth" as const,
                            subcategory: "자기주도성",
                          },
                        ],
                        highlight: "neutral" as const,
                      },
                    ]
                  : s.subjectName === "확률과통계"
                    ? [
                        {
                          sentence:
                            "베이즈 정리를 활용한 스팸 메일 필터링의 원리를 탐구하고 조건부 확률 모델을 구성함.",
                          evaluation:
                            "확률론과 IT 기술의 연결을 시도한 좋은 탐구.",
                          competencyTags: [
                            {
                              category: "academic" as const,
                              subcategory: "융합 사고",
                              assessment: "보통" as const,
                            },
                          ],
                          highlight: "positive" as const,
                        },
                        {
                          sentence:
                            "이항분포와 정규분포의 관계를 시뮬레이션으로 확인하고 중심극한정리를 실험적으로 검증함.",
                          evaluation:
                            "통계적 개념을 실험적으로 검증하는 과정이 체계적임.",
                          competencyTags: [
                            {
                              category: "academic" as const,
                              subcategory: "탐구 역량",
                              assessment: "보통" as const,
                            },
                          ],
                          highlight: "positive" as const,
                        },
                        {
                          sentence:
                            "확률적 사고를 바탕으로 논리적인 문제 해결 과정을 보여줌.",
                          evaluation:
                            "교사 총평으로 전반적 역량에 대한 긍정 평가.",
                          competencyTags: [
                            {
                              category: "growth" as const,
                              subcategory: "발전가능성",
                            },
                          ],
                          highlight: "neutral" as const,
                        },
                      ]
                    : s.subjectName === "생활과윤리"
                      ? [
                          {
                            sentence:
                              "AI 알고리즘의 편향성이 사회적 불평등을 심화할 수 있다는 점을 구체적 사례를 들어 분석함.",
                            evaluation:
                              "기술의 사회적 영향을 비판적으로 분석하는 역량이 돋보임.",
                            competencyTags: [
                              {
                                category: "community" as const,
                                subcategory: "시민의식",
                                assessment: "보통" as const,
                              },
                            ],
                            highlight: "positive" as const,
                          },
                          {
                            sentence:
                              "AI 개발 윤리 가이드라인을 직접 작성하여 공정성·투명성·책임성 3대 원칙을 제안함.",
                            evaluation:
                              "단순 문제 제기를 넘어 구체적 대안을 제시한 점이 우수.",
                            competencyTags: [
                              {
                                category: "community" as const,
                                subcategory: "시민의식",
                                assessment: "보통" as const,
                              },
                            ],
                            highlight: "positive" as const,
                          },
                          {
                            sentence:
                              "토론 활동에서 기술 발전과 윤리적 가치의 균형에 대해 자신의 입장을 논리적으로 개진함.",
                            evaluation:
                              "논리적 논증 능력과 토론 참여 의지가 드러남.",
                            competencyTags: [
                              {
                                category: "community" as const,
                                subcategory: "협업 능력",
                                assessment: "보통" as const,
                              },
                            ],
                            highlight: "positive" as const,
                          },
                        ]
                      : s.subjectName === "수학Ⅰ"
                        ? [
                            {
                              sentence:
                                "지수함수와 로그함수의 성질을 활용하여 RSA 암호 알고리즘의 수학적 기반을 탐구함.",
                              evaluation:
                                "1학년부터 수학을 진로와 연결하는 탐구 자세가 돋보임.",
                              competencyTags: [
                                {
                                  category: "career" as const,
                                  subcategory: "전공 적합성",
                                  assessment: "우수" as const,
                                },
                              ],
                              highlight: "positive" as const,
                            },
                            {
                              sentence:
                                "소인수분해의 계산 복잡도가 암호 보안 강도를 결정한다는 점을 수학적으로 설명함.",
                              evaluation:
                                "수학적 개념을 정보보안에 적용하는 융합적 시각.",
                              competencyTags: [
                                {
                                  category: "academic" as const,
                                  subcategory: "탐구 역량",
                                  assessment: "보통" as const,
                                },
                              ],
                              highlight: "positive" as const,
                            },
                            {
                              sentence:
                                "등비급수의 극한값을 이용한 금융 수학 문제를 해결하는 과정을 발표함.",
                              evaluation:
                                "수학의 실생활 적용 능력을 보여주는 서술.",
                              competencyTags: [
                                {
                                  category: "academic" as const,
                                  subcategory: "교과 성취도",
                                  assessment: "보통" as const,
                                },
                              ],
                              highlight: "positive" as const,
                            },
                            {
                              sentence:
                                "수학에 대한 흥미가 높으며 다양한 분야와의 연결을 시도하는 적극적인 학생임.",
                              evaluation:
                                "교사 총평으로 학습 태도에 대한 긍정 평가.",
                              competencyTags: [
                                {
                                  category: "growth" as const,
                                  subcategory: "자기주도성",
                                },
                              ],
                              highlight: "neutral" as const,
                            },
                          ]
                        : s.subjectName === "영어Ⅱ"
                          ? [
                              {
                                sentence:
                                  "실리콘밸리 기업 문화에 대한 영어 에세이를 작성하고 혁신의 조건을 분석함.",
                                evaluation:
                                  "영어 작문 능력과 진로 관심을 동시에 보여주는 서술.",
                                competencyTags: [
                                  {
                                    category: "career" as const,
                                    subcategory: "전공 적합성",
                                    assessment: "보통" as const,
                                  },
                                ],
                                highlight: "positive" as const,
                              },
                              {
                                sentence:
                                  "TED 강연(AI 기술 관련)을 영어로 요약하고 핵심 논지를 발표함.",
                                evaluation:
                                  "영어 듣기·말하기 능력과 기술 이해를 결합.",
                                competencyTags: [
                                  {
                                    category: "academic" as const,
                                    subcategory: "교과 성취도",
                                    assessment: "보통" as const,
                                  },
                                ],
                                highlight: "positive" as const,
                              },
                              {
                                sentence:
                                  "영어로 의사소통하려는 적극적 태도가 인상적이며 발표에 자신감이 있음.",
                                evaluation: "교사 총평으로 학습 태도 평가.",
                                competencyTags: [
                                  {
                                    category: "growth" as const,
                                    subcategory: "자기주도성",
                                  },
                                ],
                                highlight: "neutral" as const,
                              },
                            ]
                          : s.subjectName === "국어"
                            ? [
                                {
                                  sentence:
                                    "문학 작품 감상문을 작성하고 작품의 주제 의식에 대해 토론에 참여함.",
                                  evaluation:
                                    "기본적 문학 감상 역량은 있으나 진로와의 연결이 부족.",
                                  competencyTags: [
                                    {
                                      category: "academic" as const,
                                      subcategory: "교과 성취도",
                                    },
                                  ],
                                  highlight: "neutral" as const,
                                  improvementSuggestion:
                                    "자연어 처리(NLP)와 인간 언어의 관계를 주제로 탐구하면 진로 연결성 확보 가능.",
                                },
                                {
                                  sentence:
                                    "디지털 시대의 언어 변화에 대해 발표하며 신조어와 줄임말의 생성 원리를 분석함.",
                                  evaluation:
                                    "언어학적 관심을 보여주는 시도이나 깊이가 부족함.",
                                  competencyTags: [
                                    {
                                      category: "academic" as const,
                                      subcategory: "탐구 역량",
                                    },
                                  ],
                                  highlight: "neutral" as const,
                                },
                                {
                                  sentence:
                                    "수업 참여도는 보통이나 글쓰기에서 논리적 구성력을 더 키울 필요가 있음.",
                                  evaluation:
                                    "교사 피드백으로 개선 방향을 제시하는 서술.",
                                  competencyTags: [
                                    {
                                      category: "academic" as const,
                                      subcategory: "교과 성취도",
                                    },
                                  ],
                                  highlight: "negative" as const,
                                  improvementSuggestion:
                                    "논증적 글쓰기 역량을 높이면 면접과 자기소개서 준비에도 도움이 됩니다.",
                                },
                              ]
                            : s.subjectName === "화학Ⅰ"
                              ? [
                                  {
                                    sentence:
                                      "반도체 소재인 실리콘의 결정 구조와 화학적 성질을 조사하여 발표함.",
                                    evaluation:
                                      "진로 연결 시도는 좋으나 화학적 분석의 깊이가 아쉬움.",
                                    competencyTags: [
                                      {
                                        category: "academic" as const,
                                        subcategory: "교과 성취도",
                                        assessment: "보통" as const,
                                      },
                                    ],
                                    highlight: "neutral" as const,
                                  },
                                  {
                                    sentence:
                                      "화학 실험에 성실하게 참여하고 실험 보고서를 정확하게 작성함.",
                                    evaluation:
                                      "기본적 실험 태도와 보고서 작성 능력 확인.",
                                    competencyTags: [
                                      {
                                        category: "growth" as const,
                                        subcategory: "성실성",
                                        assessment: "보통" as const,
                                      },
                                    ],
                                    highlight: "neutral" as const,
                                  },
                                  {
                                    sentence:
                                      "화학에 대한 기본적 이해는 갖추고 있으며 꾸준한 학습 태도를 보임.",
                                    evaluation:
                                      "교사 총평. 특별한 역량 근거보다는 태도 평가.",
                                    competencyTags: [
                                      {
                                        category: "growth" as const,
                                        subcategory: "성실성",
                                      },
                                    ],
                                    highlight: "neutral" as const,
                                  },
                                ]
                              : s.subjectName === "한국사"
                                ? [
                                    {
                                      sentence:
                                        "한국 과학기술 발전사를 시대별로 정리하고 디지털 전환 과정을 분석함.",
                                      evaluation:
                                        "과학기술사를 다룬 시도는 좋으나 분석보다 나열에 치우침.",
                                      competencyTags: [
                                        {
                                          category: "academic" as const,
                                          subcategory: "교과 성취도",
                                        },
                                      ],
                                      highlight: "neutral" as const,
                                    },
                                    {
                                      sentence:
                                        "역사적 사건의 인과관계를 파악하려는 노력이 보이며 성실한 학습 태도를 보임.",
                                      evaluation:
                                        "교사 총평으로 기본적 학습 태도 평가.",
                                      competencyTags: [
                                        {
                                          category: "growth" as const,
                                          subcategory: "성실성",
                                        },
                                      ],
                                      highlight: "neutral" as const,
                                    },
                                  ]
                                : s.subjectName === "영어Ⅰ"
                                  ? [
                                      {
                                        sentence:
                                          "빌 게이츠 자서전 영어 원서를 읽고 IT 기업가 정신에 대한 독후감을 작성함.",
                                        evaluation:
                                          "영어 원서 독서를 통한 진로 탐색 시도가 좋음.",
                                        competencyTags: [
                                          {
                                            category: "career" as const,
                                            subcategory: "전공 적합성",
                                            assessment: "보통" as const,
                                          },
                                        ],
                                        highlight: "positive" as const,
                                      },
                                      {
                                        sentence:
                                          "영어 발표에서 자신감 있게 의견을 전달하려는 적극적 태도를 보임.",
                                        evaluation:
                                          "교사 총평으로 학습 태도에 대한 긍정 평가.",
                                        competencyTags: [
                                          {
                                            category: "growth" as const,
                                            subcategory: "자기주도성",
                                          },
                                        ],
                                        highlight: "neutral" as const,
                                      },
                                    ]
                                  : s.subjectName === "통합과학"
                                    ? [
                                        {
                                          sentence:
                                            "에너지 효율 실험에서 데이터를 체계적으로 수집하고 그래프로 경향성을 분석함.",
                                          evaluation:
                                            "데이터 기반 분석 역량이 돋보이는 서술.",
                                          competencyTags: [
                                            {
                                              category: "academic" as const,
                                              subcategory: "탐구 역량",
                                              assessment: "보통" as const,
                                            },
                                          ],
                                          highlight: "positive" as const,
                                        },
                                        {
                                          sentence:
                                            "탐구 활동에서 변인 통제의 중요성을 이해하고 실험 설계에 반영함.",
                                          evaluation:
                                            "과학적 방법론에 대한 기본 이해가 갖춰져 있음.",
                                          competencyTags: [
                                            {
                                              category: "academic" as const,
                                              subcategory: "탐구 역량",
                                              assessment: "보통" as const,
                                            },
                                          ],
                                          highlight: "positive" as const,
                                        },
                                        {
                                          sentence:
                                            "과학적 사고력의 기초가 잘 잡혀 있으며 실험에 적극적으로 참여함.",
                                          evaluation:
                                            "교사 총평으로 과학 탐구 태도 평가.",
                                          competencyTags: [
                                            {
                                              category: "growth" as const,
                                              subcategory: "자기주도성",
                                            },
                                          ],
                                          highlight: "neutral" as const,
                                        },
                                      ]
                                    : s.subjectName === "통합사회"
                                      ? [
                                          {
                                            sentence:
                                              "정보화 사회의 명과 암에 대한 조별 발표에서 기술 발전의 사회적 영향을 분석함.",
                                            evaluation:
                                              "정보화 주제를 선택한 것은 적절하나 분석이 표면적 수준.",
                                            competencyTags: [
                                              {
                                                category: "academic" as const,
                                                subcategory: "교과 성취도",
                                              },
                                            ],
                                            highlight: "neutral" as const,
                                          },
                                          {
                                            sentence:
                                              "조별 활동에서 자료 조사 역할을 맡아 성실하게 수행함.",
                                            evaluation:
                                              "기본적 협업 참여는 확인되나 리더십이나 주도성은 드러나지 않음.",
                                            competencyTags: [
                                              {
                                                category: "community" as const,
                                                subcategory: "협업 능력",
                                              },
                                            ],
                                            highlight: "neutral" as const,
                                          },
                                        ]
                                      : s.subjectName === "한국어문학"
                                        ? [
                                            {
                                              sentence:
                                                "SF 소설 '멋진 신세계'를 읽고 과학기술과 인간성의 관계를 탐구하는 감상문을 작성함.",
                                              evaluation:
                                                "SF 문학을 통한 진로 관심 표현 시도. 비평적 분석은 미흡.",
                                              competencyTags: [
                                                {
                                                  category: "academic" as const,
                                                  subcategory: "교과 성취도",
                                                },
                                              ],
                                              highlight: "neutral" as const,
                                            },
                                            {
                                              sentence:
                                                "과학기술과 문학의 관계를 주제로 발표하며 기술이 서사에 미치는 영향을 논함.",
                                              evaluation:
                                                "흥미로운 주제 선정이나 문학적 분석 역량 보완 필요.",
                                              competencyTags: [
                                                {
                                                  category: "academic" as const,
                                                  subcategory: "탐구 역량",
                                                },
                                              ],
                                              highlight: "neutral" as const,
                                            },
                                          ]
                                        : s.subjectName === "체육"
                                          ? [
                                              {
                                                sentence:
                                                  "배드민턴 경기에서 상대 플레이 패턴을 분석하여 전략을 수립하고 팀원과 공유함.",
                                                evaluation:
                                                  "체육 활동에서도 데이터 분석적 사고를 적용한 독특한 접근.",
                                                competencyTags: [
                                                  {
                                                    category:
                                                      "community" as const,
                                                    subcategory: "협업 능력",
                                                    assessment: "보통" as const,
                                                  },
                                                ],
                                                highlight: "positive" as const,
                                              },
                                              {
                                                sentence:
                                                  "팀 경기에서 적극적으로 참여하고 페어플레이 정신을 보여줌.",
                                                evaluation:
                                                  "스포츠맨십과 협동심 확인.",
                                                competencyTags: [
                                                  {
                                                    category:
                                                      "community" as const,
                                                    subcategory: "협업 능력",
                                                    assessment: "보통" as const,
                                                  },
                                                ],
                                                highlight: "neutral" as const,
                                              },
                                            ]
                                          : s.subjectName === "음악"
                                            ? [
                                                {
                                                  sentence:
                                                    "알고리즘 작곡의 원리를 조사하고 MIDI 프로그래밍으로 간단한 멜로디를 생성하여 발표함.",
                                                  evaluation:
                                                    "음악과 프로그래밍을 연결한 참신한 시도.",
                                                  competencyTags: [
                                                    {
                                                      category:
                                                        "career" as const,
                                                      subcategory:
                                                        "전공 적합성",
                                                    },
                                                  ],
                                                  highlight:
                                                    "positive" as const,
                                                },
                                                {
                                                  sentence:
                                                    "음악 감상에 성실하게 참여하나 실기 역량은 평균적인 수준임.",
                                                  evaluation:
                                                    "교사 총평으로 음악 교과 전반의 역량 평가.",
                                                  competencyTags: [
                                                    {
                                                      category:
                                                        "academic" as const,
                                                      subcategory:
                                                        "교과 성취도",
                                                    },
                                                  ],
                                                  highlight: "neutral" as const,
                                                },
                                              ]
                                            : undefined,
  })),
};

// ─── 섹션 11: 행동특성 분석 ───

const behaviorAnalysis: BehaviorAnalysisSection = {
  sectionId: "behaviorAnalysis",
  title: "행동특성 분석",
  characterLabel: {
    label: "탐구형 성실가",
    rationale:
      "스스로 목표를 세우고 끈기 있게 달성하는 자기주도적 학습자. 과제 완수력이 높고 꾸준한 성장 곡선을 보이는 유형입니다.",
  },
  personalityScore: 82,
  personalityKeywords: ["책임감", "배려심", "자기관리"],
  yearlyAnalysis: [
    {
      year: 1,
      summary:
        "수업 시간에 집중력이 높고 과제 제출이 성실하며, 모둠 활동에서 맡은 역할을 묵묵히 수행하는 학생으로 평가됨",
      competencyTags: [
        { category: "growth", subcategory: "성실성", assessment: "보통" },
      ],
      keyQuotes: ["맡은 일에 대한 책임감이 강하고, 수업 태도가 모범적임"],
    },
    {
      year: 2,
      summary:
        "자기주도적 학습 태도가 형성되어 궁금한 부분을 스스로 찾아 학습하는 모습이 돋보이며, 정보 교과에서 특히 뛰어난 집중력과 탐구 열정을 보임",
      competencyTags: [
        { category: "growth", subcategory: "자기주도성", assessment: "우수" },
        { category: "academic", subcategory: "탐구 역량", assessment: "우수" },
      ],
      keyQuotes: [
        "컴퓨터 프로그래밍에 대한 강한 열정과 자기주도적 학습 태도가 돋보이는 학생",
        "어려운 문제에도 포기하지 않고 끝까지 해결하려는 끈기가 인상적임",
      ],
    },
  ],
  consistentTraits: ["성실성", "집중력", "탐구 열정", "끈기"],
  overallComment:
    "1학년부터 2학년까지 일관되게 성실하고 집중력 높은 학생으로 평가받고 있으며, 2학년에서 자기주도적 학습 태도가 뚜렷이 형성되었습니다. 다만 리더십이나 타인과의 소통에 대한 서술이 부족하여, 3학년에는 리더 역할이나 멘토링 경험을 통해 이 부분을 보완할 필요가 있습니다.",
  admissionRelevance:
    "행동특성에서 '자기주도성'과 '끈기'가 일관되게 드러나는 것은 서울대가 중시하는 '발전가능성' 평가에서 긍정적으로 작용합니다. 3학년에 리더십 관련 서술이 추가되면 '공동체 의식' 항목도 보강됩니다.",
};

// ============================================================
// Part 3: 전략
// ============================================================

// ─── 섹션 13: 부족한 부분 + 보완 전략 ───

const weaknessAnalysisLite: WeaknessAnalysisSection = {
  sectionId: "weaknessAnalysis",
  title: "부족한 부분 분석 및 보완 전략",
  areas: [
    {
      area: "공동체 역량 (리더십·봉사)",
      description:
        "동아리나 학급에서 공식적 리더 역할 경험이 없으며, 진로 연계 봉사 활동이 전무합니다. 서울대가 중시하는 '공동체 의식' 평가에서 감점 요인입니다.",
      suggestedActivities: [
        "3학년 코딩 동아리 부장 또는 학급 부반장 지원",
        "지역 아동센터 코딩 교육 봉사 (주 1회)",
        "교내 SW 멘토링 프로그램 참여 (후배 대상 프로그래밍 지도)",
      ],
    },
    {
      area: "인문 교과 연계 부족",
      description:
        "국어, 한국사 등 인문 교과의 세특이 진로와 연결되지 않아 '균형 잡힌 학업 역량'을 보여주기 어렵습니다.",
      suggestedActivities: [
        "국어 세특: 자연어 처리(NLP)와 한국어의 형태론적 특성 탐구",
        "한국사 세특: 조선 시대 수학·과학 기술의 현대적 의의 탐구",
        "사회 세특: AI 윤리와 개인정보 보호 관련 에세이 작성",
      ],
    },
    {
      area: "외부 활동 및 대회 실적",
      description:
        "교내 활동 위주로 외부 코딩 대회(정보올림피아드 등)나 프로젝트 경험이 부족하여 차별화가 어렵습니다.",
      suggestedActivities: [
        "한국정보올림피아드(KOI) 지역 예선 참가",
        "교내 SW 경진대회 출전 및 수상 목표",
        "개인 포트폴리오용 오픈소스 프로젝트 기여 경험",
      ],
    },
    {
      area: "진로 활동 기록의 깊이 부족",
      description:
        "진로 활동이 단순 기업 탐방, 직업인 인터뷰 수준에 머물러 있어 '체험형'으로 분류될 가능성이 높습니다. 서울대 학종에서 기대하는 '자기주도적 진로 탐색'의 깊이가 부족하며, 진로 활동에서 구체적 산출물이나 문제 인식-해결 과정이 드러나지 않습니다.",
      suggestedActivities: [
        "진로 탐색 보고서 작성: 특정 IT 분야(예: 자율주행)의 기술적 과제를 분석하는 심화 보고서",
        "대학교 컴퓨터공학과 전공 수업 청강 또는 공개 강의 수강 후 학습 기록 정리",
        "관심 분야 연구실 탐방 후 교수님 인터뷰 및 탐구 보고서 작성",
      ],
    },
    {
      area: "비전공 교과 세특 질적 수준 미흡",
      description:
        "국어, 한국사, 사회 교과의 세특이 수업 내용 요약이나 일반적 감상 수준에 머물러 있습니다. 진로와의 연계가 전혀 없어 '균형 잡힌 학업 역량'을 어필하기 어려우며, 서울대의 '교과별 세부능력 특기사항의 질적 수준' 평가에서 감점 요인이 됩니다.",
      suggestedActivities: [
        "국어 세특: 자연어 처리 관점에서 한국어 문장 구조 분석 탐구 보고서 작성",
        "한국사 세특: 조선 시대 천문 관측 기구의 정밀도를 현대 센서 기술과 비교 분석",
        "사회 세특: EU의 AI 규제법안(AI Act)과 한국의 AI 정책 비교 에세이 작성",
      ],
    },
    {
      area: "성장 서사의 구체성 부족",
      description:
        "생기부 전반에 걸쳐 실패-극복-성장의 구체적 에피소드가 부족합니다. 성적 향상 추세는 있으나, 어떤 어려움을 어떻게 극복했는지에 대한 구체적 서술이 세특에 반영되지 않아 '발전가능성' 역량에서 차별화가 어렵습니다.",
      suggestedActivities: [
        "3학년 프로젝트에서 의도적으로 도전적 과제를 선택하고, 실패-원인분석-재도전 과정을 기록",
        "자기주도 학습 과정에서의 어려움과 극복 방법을 학습 일지 형태로 정리하여 담임교사에게 공유",
        "해커톤이나 코딩 대회에서의 실패 경험을 돌아보고 개선점을 세특에 반영하도록 교사와 상의",
      ],
    },
    {
      area: "융합적 문제해결 경험 부족",
      description:
        "현재 활동이 정보·수학 교과 내에서만 이루어지고 있어 교과 간 연결 프로젝트가 부족합니다. 서울대가 강조하는 '다양한 분야의 지식을 융합하여 새로운 가치를 창출하는 능력'을 보여주기 어려우며, 특히 인문·사회 교과와 IT를 연결하는 시도가 전무합니다.",
      suggestedActivities: [
        "국어+정보 융합: 텍스트 마이닝으로 문학 작품 감성 분석 프로젝트 수행",
        "사회+정보 융합: 공공데이터 API를 활용한 지역 사회 문제 분석 대시보드 제작",
        "과학+정보 융합: 물리 시뮬레이션 프로그램 개발 (예: 포물선 운동 시각화)",
      ],
    },
    {
      area: "기록 충실도 편차",
      description:
        "전공 교과(정보, 수학)의 세특은 500자 내외로 충실하게 기재되어 있으나, 비전공 교과(국어, 한국사, 사회)는 200~300자 수준으로 기재 분량의 차이가 큽니다. 이러한 편차는 평가자에게 '관심 분야만 열심히 하는 학생'이라는 인상을 줄 수 있습니다.",
      suggestedActivities: [
        "비전공 교과 수업에서도 적극적으로 발표·질문하여 교사의 관찰 기록을 유도",
        "비전공 교과 관련 심화 탐구 활동(보고서, 발표)을 학기당 1건 이상 수행",
        "교과 담당 교사와 진로 연계 주제에 대해 상담하여 세특 기재 내용을 미리 협의",
      ],
    },
    {
      area: "독서활동 연계 부족",
      description:
        "독서 기록이 양적으로 부족할 뿐 아니라, 읽은 도서가 진로(컴퓨터공학)와 체계적으로 연결되지 않고 있습니다. 서울대는 독서를 통한 지적 호기심과 사고 확장을 중시하는데, 현재 독서 목록은 교양 수준에 머물러 있어 전공 분야에 대한 깊이 있는 탐구 의지를 보여주기 어렵습니다.",
      suggestedActivities: [
        "전공 관련 도서 정독 및 독서 감상문 작성: 『코드』(찰스 펫졸드), 『알고리즘, 인생을 계산하다』 등",
        "인문·사회 관련 도서와 IT를 연결하는 융합 독서: 『총균쇠』+ 빅데이터 분석, 『정의란 무엇인가』+ AI 윤리",
        "독서 후 세특 연계: 독서에서 얻은 아이디어를 교과 탐구 주제로 발전시키는 연결 고리 만들기",
      ],
    },
    {
      area: "자기소개서 소재 다양성 부족",
      description:
        "현재 생기부에 드러나는 활동이 대부분 코딩·알고리즘에 편중되어 있어, 자기소개서 작성 시 다양한 소재를 확보하기 어렵습니다. 서울대 자기소개서는 학업 역량, 전공 적합성, 인성·공동체 의식을 모두 보여줘야 하는데, 현재 소재로는 인성·공동체 항목에서 쓸 수 있는 경험이 부족합니다.",
      suggestedActivities: [
        "교내 멘토링 프로그램(코딩 교육)을 통해 나눔과 성장의 경험 확보",
        "학급 또는 학교 행사 기획에 IT 역량을 활용하는 봉사 경험 (예: 학교 홈페이지 개선 프로젝트)",
        "교과 외 관심사(예: 음악, 운동)와 IT를 연결하는 창의적 프로젝트 수행",
      ],
    },
  ],
};

const WEAKNESS_EVIDENCE_MAP: Record<string, string> = {
  "공동체 역량 (리더십·봉사)":
    "2년간 임원 경험 0회, 봉사시간은 있으나 전부 일반 봉사. 동아리에서 알고리즘 스터디 리드 경험은 있으나 공식 직함 없음.",
  "인문 교과 연계 부족":
    "국어 세특: 일반적 문학 감상에 머무름. 한국사 세특: 단원 요약 수준. 사회 세특: 진로 연결 없음.",
  "외부 활동 및 대회 실적":
    "교내 해커톤 1회 참가가 유일한 경쟁 활동. 정보올림피아드, SW 경진대회 등 미참가.",
  "진로 활동 기록의 깊이 부족":
    "1학년 IT기업 탐방 1회, 2학년 진로 체험의 날 참가가 전부. 진로 탐색 보고서나 심층 인터뷰 등 자기주도적 활동 기록 전무.",
  "비전공 교과 세특 질적 수준 미흡":
    "국어 세특 280자(평이한 감상문), 한국사 세특 220자(단원 요약), 사회 세특 250자(수업 정리). 전공 교과 세특 평균 480자 대비 현저히 부족.",
  "성장 서사의 구체성 부족":
    "2년간 세특에서 '어려움을 극복한 경험' 언급 0건. 성적 상승(2학기 내신 0.3등급 향상)은 있으나 과정이 기술되지 않음.",
  "융합적 문제해결 경험 부족":
    "교과 간 연결 프로젝트 0건. 정보·수학 교과 내 활동만 존재하며, 타 교과와의 융합 시도가 세특에 기록되지 않음.",
  "기록 충실도 편차":
    "전공 교과 세특 평균 480자(충실도 96%) vs 비전공 교과 세특 평균 250자(충실도 50%). 편차 46%p로 매우 큼.",
  "독서활동 연계 부족":
    "2년간 독서 기록 총 8권. 전공 관련 도서 2권, 나머지 교양서적. 독서-세특 연계 기록 0건.",
  "자기소개서 소재 다양성 부족":
    "주요 활동 10건 중 8건이 코딩/알고리즘 관련. 인성·공동체 활동 소재 2건(일반 봉사)으로 자소서 3번 항목 소재 부족.",
};

const WEAKNESS_TAG_MAP: Record<
  string,
  {
    category: "academic" | "career" | "community" | "growth";
    subcategory: string;
    assessment: "우수" | "보통" | "미흡" | "부족";
  }
> = {
  "공동체 역량 (리더십·봉사)": {
    category: "community",
    subcategory: "리더십",
    assessment: "미흡",
  },
  "인문 교과 연계 부족": {
    category: "academic",
    subcategory: "융합 사고",
    assessment: "미흡",
  },
  "외부 활동 및 대회 실적": {
    category: "career",
    subcategory: "진로 탐색 활동",
    assessment: "미흡",
  },
  "진로 활동 기록의 깊이 부족": {
    category: "career",
    subcategory: "진로 탐색 깊이",
    assessment: "미흡",
  },
  "비전공 교과 세특 질적 수준 미흡": {
    category: "academic",
    subcategory: "교과 균형",
    assessment: "미흡",
  },
  "성장 서사의 구체성 부족": {
    category: "growth",
    subcategory: "자기성찰",
    assessment: "부족",
  },
  "융합적 문제해결 경험 부족": {
    category: "academic",
    subcategory: "융합 탐구",
    assessment: "미흡",
  },
  "기록 충실도 편차": {
    category: "academic",
    subcategory: "기록 관리",
    assessment: "미흡",
  },
  "독서활동 연계 부족": {
    category: "growth",
    subcategory: "지적 호기심",
    assessment: "부족",
  },
  "자기소개서 소재 다양성 부족": {
    category: "career",
    subcategory: "자기표현",
    assessment: "미흡",
  },
};

const WEAKNESS_PRIORITY_MAP: Record<string, "high" | "medium" | "low"> = {
  "공동체 역량 (리더십·봉사)": "high",
  "인문 교과 연계 부족": "high",
  "외부 활동 및 대회 실적": "medium",
  "진로 활동 기록의 깊이 부족": "high",
  "비전공 교과 세특 질적 수준 미흡": "high",
  "성장 서사의 구체성 부족": "medium",
  "융합적 문제해결 경험 부족": "medium",
  "기록 충실도 편차": "high",
  "독서활동 연계 부족": "medium",
  "자기소개서 소재 다양성 부족": "low",
};

const weaknessAnalysisStandard: WeaknessAnalysisSection = {
  sectionId: "weaknessAnalysis",
  title: "부족한 부분 분석 및 보완 전략",
  areas: weaknessAnalysisLite.areas.map((a) => ({
    ...a,
    evidence: WEAKNESS_EVIDENCE_MAP[a.area] ?? "",
    competencyTag: WEAKNESS_TAG_MAP[a.area],
    priority: WEAKNESS_PRIORITY_MAP[a.area] ?? ("medium" as const),
  })),
};

const WEAKNESS_PREMIUM_MAP: Record<
  string,
  {
    urgency: "high" | "medium" | "low";
    effectiveness: "high" | "medium" | "low";
    executionStrategy: string;
    subjectLinkStrategy?: string;
    tierRating: "우수" | "보통" | "미흡";
    improvementTable?: {
      currentState: string;
      targetState: string;
      specificAction: string;
      timeline: string;
      expectedOutcome: string;
    };
    expectedScoreImpact?: {
      category: string;
      currentScore: number;
      projectedScore: number;
    };
    recordSource: string;
    detailedStrategy: string;
    actionItems: string[];
  }
> = {
  "공동체 역량 (리더십·봉사)": {
    urgency: "high",
    effectiveness: "high",
    executionStrategy:
      "3학년 시작과 동시에 동아리 부장에 지원하고, 코딩 교육 봉사를 학기 초부터 시작하여 지속적 기록을 확보합니다.",
    tierRating: "미흡",
    improvementTable: {
      currentState: "공식 리더 경험 0회, 진로 연계 봉사 0회",
      targetState: "리더 역할 1건 이상, 봉사 활동 월 2회 이상",
      specificAction: "동아리 부장 지원 + 코딩 교육 봉사 시작",
      timeline: "고2 겨울방학~고3 1학기",
      expectedOutcome: "공동체 역량 65→78점 상승 예상",
    },
    expectedScoreImpact: {
      category: "community",
      currentScore: 65,
      projectedScore: 78,
    },
    recordSource: "자율활동, 동아리활동, 봉사활동",
    detailedStrategy:
      "고2 겨울방학부터 지역 아동센터와 연계하여 주 1회 코딩 교육 봉사를 시작합니다. 3학년 시작과 동시에 코딩 동아리 부장에 지원하여 동아리 운영 계획을 수립하고, 후배 대상 알고리즘 스터디를 조직합니다. 봉사와 리더십 활동을 병행하면서 '기술로 사회에 기여하는 엔지니어'라는 서사를 구축합니다.",
    actionItems: [
      "지역 아동센터 코딩 교육 봉사 신청 (12월 중)",
      "코딩 동아리 부장 지원서 작성 및 제출",
      "동아리 운영 계획서 수립 (연간 활동 로드맵)",
      "후배 대상 알고리즘 스터디 그룹 조직 (주 1회)",
      "봉사 활동 일지 작성 및 담임교사 공유 (월 1회)",
    ],
  },
  "인문 교과 연계 부족": {
    urgency: "high",
    effectiveness: "high",
    executionStrategy:
      "3학년 1학기 국어/사회 수업에서 IT 관련 주제를 선정하여 세특 기록을 미리 준비합니다.",
    subjectLinkStrategy:
      "국어(자연어처리) → 정보(NLP 구현) → 영어(기술 논문 읽기)로 교과 간 연결 고리를 형성합니다.",
    tierRating: "미흡",
    improvementTable: {
      currentState: "비전공 교과 세특에 진로 연계 0건",
      targetState: "국어·사회·한국사 각 1건 이상 진로 연계 세특",
      specificAction: "교과별 IT 융합 주제 선정 및 탐구 보고서 작성",
      timeline: "고3 1학기",
      expectedOutcome: "학업 역량 82→87점 상승 예상",
    },
    expectedScoreImpact: {
      category: "academic",
      currentScore: 82,
      projectedScore: 87,
    },
    recordSource: "세특_국어, 세특_한국사, 세특_사회",
    detailedStrategy:
      "3학년 1학기 시작 전에 교과별 진로 연계 주제를 미리 선정합니다. 국어는 자연어 처리와 한국어 형태론을, 한국사는 조선 시대 과학 기술의 현대적 의의를, 사회는 AI 규제 정책 비교를 주제로 삼아 각각 심화 탐구 보고서를 작성합니다. 교과 담당 교사와 사전 상담하여 세특 기재 방향을 협의합니다.",
    actionItems: [
      "교과별 진로 연계 주제 리스트 작성 (방학 중)",
      "국어 교사와 NLP-한국어 형태론 탐구 주제 협의",
      "한국사 교사와 조선 과학기술 탐구 주제 협의",
      "사회 교사와 AI 규제 정책 비교 주제 협의",
    ],
  },
  "외부 활동 및 대회 실적": {
    urgency: "medium",
    effectiveness: "high",
    executionStrategy:
      "방학 중 알고리즘 대회 준비를 시작하고, 학기 중 교내 대회에 참가하여 실적을 쌓습니다.",
    tierRating: "보통",
    recordSource: "수상경력, 동아리활동",
    detailedStrategy:
      "겨울방학부터 백준 온라인 저지, 코드포스 등 플랫폼에서 알고리즘 문제풀이를 꾸준히 진행합니다. 한국정보올림피아드(KOI) 지역 예선을 목표로 준비하되, 교내 SW 경진대회에도 참가하여 입상 실적을 확보합니다. 대회 준비 과정 자체를 자기주도 학습의 기록으로 남깁니다.",
    actionItems: [
      "백준 온라인 저지 가입 및 일일 1문제 풀이 시작",
      "KOI 지역 예선 일정 확인 및 참가 신청",
      "교내 SW 경진대회 참가 신청 및 프로젝트 구상",
    ],
  },
  "진로 활동 기록의 깊이 부족": {
    urgency: "high",
    effectiveness: "medium",
    executionStrategy:
      "단순 체험을 넘어서 자기주도적 진로 탐색 프로젝트를 설계하고, 탐색 과정에서의 문제 인식과 해결 노력을 체계적으로 기록합니다.",
    tierRating: "미흡",
    improvementTable: {
      currentState: "진로 활동이 단순 탐방·체험 2건에 그침",
      targetState: "심화 진로 탐색 프로젝트 2건 이상, 산출물 포함",
      specificAction: "분야별 기술 분석 보고서 + 대학 연구실 탐방 보고서 작성",
      timeline: "고2 겨울방학~고3 1학기",
      expectedOutcome: "진로 역량 75→83점 상승 예상",
    },
    expectedScoreImpact: {
      category: "career",
      currentScore: 75,
      projectedScore: 83,
    },
    recordSource: "진로활동, 자율활동",
    detailedStrategy:
      "겨울방학 중 관심 분야(예: 자율주행, AI)의 기술적 과제를 분석하는 심화 보고서를 작성합니다. 대학교 컴퓨터공학과 공개 강의를 수강하고 학습 내용을 정리합니다. 가능하다면 관심 연구실을 방문하여 교수님 또는 대학원생과 인터뷰를 진행하고, 이를 탐구 보고서로 완성합니다. 각 활동에서 '내가 무엇을 알게 되었고, 무엇이 궁금해졌는지'를 반드시 기록합니다.",
    actionItems: [
      "자율주행 기술 현황 및 과제 분석 보고서 작성 (겨울방학)",
      "서울대 컴퓨터공학과 공개 강의 수강 및 학습 기록 정리",
      "관심 연구실 이메일 연락 및 탐방 일정 조율",
      "탐방 후 인터뷰 내용 + 느낀 점을 포함한 탐구 보고서 작성",
    ],
  },
  "비전공 교과 세특 질적 수준 미흡": {
    urgency: "high",
    effectiveness: "high",
    executionStrategy:
      "3학년 1학기 비전공 교과에서 진로와 연결되는 탐구 주제를 선정하여 질적으로 차별화된 세특 기록을 확보합니다. 교과 교사와 사전 협의하여 기재 방향을 조율합니다.",
    tierRating: "미흡",
    improvementTable: {
      currentState: "비전공 교과 세특 평균 250자, 진로 연계 0건",
      targetState: "비전공 교과 세특 평균 400자 이상, 진로 연계 3건 이상",
      specificAction: "교과별 IT 융합 주제 선정 + 탐구 보고서 작성 + 교사 협의",
      timeline: "고3 1학기",
      expectedOutcome: "학업 역량 82→88점 상승 예상",
    },
    expectedScoreImpact: {
      category: "academic",
      currentScore: 82,
      projectedScore: 88,
    },
    recordSource: "세특_국어, 세특_한국사, 세특_사회, 세특_영어",
    detailedStrategy:
      "국어에서는 자연어 처리와 한국어 형태론의 관계를, 한국사에서는 조선 시대 과학 기술(혼천의, 측우기)의 데이터 수집 원리를, 사회에서는 EU AI Act와 한국 AI 정책의 비교 분석을 주제로 삼습니다. 영어에서는 해외 IT 기업의 기술 블로그를 원문으로 읽고 요약·비평하는 활동을 합니다. 각 교과 교사에게 방학 중 사전 상담을 요청합니다.",
    actionItems: [
      "교과별 융합 주제 리스트 작성 (방학 중 완료)",
      "각 교과 담당 교사와 주제 협의 면담 (개학 전 1주)",
      "교과별 탐구 보고서 초안 작성 (3월 중)",
      "세특 기재 요청 시 교사에게 활동 내용 메모 제출",
      "중간고사 후 추가 탐구 활동 1건 이상 수행",
    ],
  },
  "성장 서사의 구체성 부족": {
    urgency: "medium",
    effectiveness: "medium",
    executionStrategy:
      "3학년 활동에서 의도적으로 도전적 과제를 선택하고, 실패-분석-재도전의 과정을 학습 일지와 교사 상담을 통해 기록으로 남깁니다.",
    tierRating: "미흡",
    improvementTable: {
      currentState: "실패-극복 서사 0건, 성장 과정 구체적 기술 없음",
      targetState: "도전-실패-극복 에피소드 2건 이상 세특 반영",
      specificAction: "도전적 프로젝트 수행 + 학습 일지 기록 + 교사 공유",
      timeline: "고3 1학기",
      expectedOutcome: "발전가능성 등급 B→A 상승 예상",
    },
    recordSource: "세특 전 교과, 행동특성 및 종합의견",
    detailedStrategy:
      "3학년 1학기에 수행하는 프로젝트(세특, 동아리)에서 현재 실력보다 한 단계 높은 난이도의 과제를 선택합니다. 프로젝트 진행 중 겪는 어려움과 시행착오를 학습 일지에 매주 기록하고, 이를 담임교사 및 교과 교사와 공유합니다. 특히 '처음에 실패했지만 원인을 분석하고 방법을 바꿔 성공한' 경험이 세특에 반영되도록 합니다.",
    actionItems: [
      "3학년 프로젝트에서 도전적 주제 1건 이상 선택",
      "주간 학습 일지 작성 (어려움, 시도, 결과 기록)",
      "월 1회 담임교사 면담에서 성장 과정 공유",
      "세특 기재 시 '실패-극복' 서사가 반영되도록 교사에게 요청",
    ],
  },
  "융합적 문제해결 경험 부족": {
    urgency: "medium",
    effectiveness: "high",
    executionStrategy:
      "3학년에 2개 이상의 교과를 연결하는 융합 프로젝트를 수행하고, 그 과정과 결과를 각 교과 세특에 교차 기재합니다.",
    subjectLinkStrategy:
      "국어(텍스트마이닝) → 정보(프로그래밍) → 사회(데이터분석) 3교과 연결 프로젝트를 설계합니다.",
    tierRating: "보통",
    improvementTable: {
      currentState: "교과 간 융합 프로젝트 0건",
      targetState: "2교과 이상 연결 프로젝트 2건",
      specificAction: "융합 프로젝트 기획 + 교과 교사 사전 협의 + 결과물 산출",
      timeline: "고3 1학기",
      expectedOutcome: "학업 역량 82→86점, 진로 역량 75→80점 상승 예상",
    },
    expectedScoreImpact: {
      category: "academic",
      currentScore: 82,
      projectedScore: 86,
    },
    recordSource: "세특 복수 교과, 동아리활동",
    detailedStrategy:
      "국어+정보 융합 프로젝트로 한국어 텍스트의 감성 분석 프로그램을 개발하고, 국어 세특에는 언어학적 분석을, 정보 세특에는 프로그래밍 과정을 기재합니다. 사회+정보 융합으로 공공데이터를 활용한 지역 문제 분석 대시보드를 제작하여, 사회 세특에는 문제 인식을, 정보 세특에는 기술 구현을 기재합니다.",
    actionItems: [
      "국어+정보 융합 프로젝트 기획서 작성",
      "사회+정보 융합 프로젝트 기획서 작성",
      "각 교과 교사에게 융합 프로젝트 사전 협의 요청",
      "프로젝트 결과물(코드, 보고서, 발표자료) 산출",
      "각 교과 세특에 교차 기재 요청",
    ],
  },
  "기록 충실도 편차": {
    urgency: "high",
    effectiveness: "medium",
    executionStrategy:
      "비전공 교과 수업에서의 참여도를 높이고, 교과 교사가 관찰할 수 있는 활동(발표, 질문, 토론)을 적극적으로 수행합니다.",
    tierRating: "미흡",
    improvementTable: {
      currentState: "전공 교과 세특 480자 vs 비전공 교과 250자 (편차 46%p)",
      targetState: "전 교과 세특 평균 400자 이상 (편차 15%p 이내)",
      specificAction: "비전공 교과 수업 참여 강화 + 교사 상담 + 추가 활동",
      timeline: "고3 1학기 전 기간",
      expectedOutcome: "전체 기록 충실도 81%→90% 상승 예상",
    },
    expectedScoreImpact: {
      category: "academic",
      currentScore: 82,
      projectedScore: 86,
    },
    recordSource: "세특 전 교과",
    detailedStrategy:
      "3학년 모든 교과에서 학기당 발표 1회 이상, 수업 중 질문 주 1회 이상을 목표로 합니다. 비전공 교과 교사와 학기 초에 면담하여 세특 기재를 위한 추가 활동(보고서, 발표, 토론 참여)을 미리 협의합니다. 수업 중 노트 필기를 충실히 하고, 중요 내용을 정리한 메모를 교과 교사에게 공유하여 관찰 기록을 유도합니다.",
    actionItems: [
      "비전공 교과별 학기 초 교사 면담 (세특 협의)",
      "전 교과 수업 중 발표·질문 횟수 목표 설정 (주간 체크리스트)",
      "비전공 교과 심화 탐구 활동 학기당 1건 이상 수행",
      "수업 내용 정리 노트를 교과 교사에게 월 1회 공유",
    ],
  },
  "독서활동 연계 부족": {
    urgency: "medium",
    effectiveness: "medium",
    executionStrategy:
      "전공 도서와 인문·사회 도서를 균형 있게 읽고, 독서 내용을 교과 탐구 주제로 발전시켜 세특에 반영합니다.",
    tierRating: "보통",
    expectedScoreImpact: {
      category: "growth",
      currentScore: 70,
      projectedScore: 77,
    },
    recordSource: "독서활동, 세특 연계",
    detailedStrategy:
      "월 2권 이상 독서를 목표로 하되, 전공 도서(알고리즘, AI, 프로그래밍)와 인문·사회 도서(윤리, 사회, 역사)를 1:1 비율로 읽습니다. 각 도서를 읽은 후 300자 이상의 독서 감상문을 작성하고, 이 중 핵심 아이디어를 교과 탐구 주제로 발전시킵니다. 예를 들어 『정의란 무엇인가』를 읽고 AI 윤리 탐구로 연결하는 식입니다.",
    actionItems: [
      "월별 독서 계획 수립 (전공 1권 + 인문사회 1권)",
      "독서 감상문 작성 (도서당 300자 이상)",
      "독서 내용 → 교과 탐구 주제 연결 아이디어 노트 작성",
      "교과 교사에게 독서 기반 탐구 주제 제안 (학기당 2건)",
    ],
  },
  "자기소개서 소재 다양성 부족": {
    urgency: "low",
    effectiveness: "medium",
    executionStrategy:
      "코딩 역량을 활용한 봉사·멘토링 활동, 학교 행사 기획 참여 등으로 인성·공동체 소재를 확보하고, 교과 외 관심사와 IT를 연결하는 창의적 경험을 추가합니다.",
    tierRating: "보통",
    recordSource: "봉사활동, 자율활동, 동아리활동",
    detailedStrategy:
      "자기소개서는 학업 역량, 전공 적합성, 인성·공동체를 균형 있게 보여줘야 합니다. 현재 코딩/알고리즘 위주의 활동에 더해, 코딩 교육 봉사, 학교 행사 기획(IT 활용), 교과 외 관심사와 IT의 융합 경험을 추가하여 소재 풀을 넓힙니다. 특히 '기술을 통한 사회 기여'라는 스토리를 일관되게 구축합니다.",
    actionItems: [
      "자기소개서 항목별 예상 소재 매핑표 작성",
      "인성·공동체 소재 확보를 위한 활동 2건 이상 계획",
      "교과 외 관심사(음악, 운동 등)와 IT 연결 경험 1건 기획",
    ],
  },
};

const weaknessAnalysisPremium: WeaknessAnalysisSection = {
  sectionId: "weaknessAnalysis",
  title: "부족한 부분 분석 및 보완 전략",
  // v4
  tierSummary: {
    excellent: 0,
    good: 3,
    needsImprovement: 7,
  },
  areas: weaknessAnalysisStandard.areas.map((a) => {
    const premiumData = WEAKNESS_PREMIUM_MAP[a.area];
    return {
      ...a,
      urgency: premiumData?.urgency ?? ("medium" as const),
      effectiveness: premiumData?.effectiveness ?? ("medium" as const),
      executionStrategy: premiumData?.executionStrategy ?? "",
      subjectLinkStrategy: premiumData?.subjectLinkStrategy,
      tierRating: premiumData?.tierRating ?? ("보통" as const),
      improvementTable: premiumData?.improvementTable,
      expectedScoreImpact: premiumData?.expectedScoreImpact,
      recordSource: premiumData?.recordSource,
      detailedStrategy: premiumData?.detailedStrategy,
      actionItems: premiumData?.actionItems,
    };
  }),
};

// ─── 섹션 14: 세특 주제 추천 ───

const topicRecommendationLite: TopicRecommendationSection = {
  sectionId: "topicRecommendation",
  title: "세특 주제 추천",
  topics: [
    {
      topic: "자연어 처리(NLP) 기반 한국어 감성 분석 프로그램 개발",
      relatedSubjects: ["정보", "국어"],
      description:
        "Python의 KoNLPy 라이브러리를 활용하여 한국어 텍스트의 감성(긍정/부정)을 분석하는 프로그램을 개발하고, 국어 교과의 '언어와 매체' 단원과 연계하여 디지털 시대의 언어 분석 방법론을 탐구합니다.",
      importance: "high",
    },
    {
      topic: "그래프 이론을 활용한 소셜 네트워크 분석",
      relatedSubjects: ["수학", "정보", "사회"],
      description:
        "그래프 이론(노드, 엣지, 중심성)을 학습하고, 실제 소셜 네트워크 데이터를 분석하여 영향력 있는 노드를 식별하는 알고리즘을 구현합니다. 사회 교과의 '정보사회' 단원과 연계 가능합니다.",
      importance: "high",
    },
    {
      topic: "강화학습을 활용한 간단한 게임 AI 구현",
      relatedSubjects: ["정보", "수학"],
      description:
        "Q-러닝 알고리즘을 활용하여 간단한 미로 탈출 게임 AI를 구현하고, 보상 함수 설계와 학습 과정을 분석합니다. 수학의 행렬 연산과 확률 개념이 활용됩니다.",
      importance: "medium",
    },
  ],
};

const topicRecommendationStandard: TopicRecommendationSection = {
  sectionId: "topicRecommendation",
  title: "세특 주제 추천",
  topics: [
    ...topicRecommendationLite.topics.map((t) => ({
      ...t,
      rationale: t.topic.includes("자연어")
        ? "국어 세특과 정보 세특을 동시에 강화할 수 있는 융합 주제로, 현재 약점인 '인문 교과 연계'를 직접적으로 보완합니다."
        : t.topic.includes("그래프")
          ? "기존 알고리즘 탐구의 연장선에서 그래프 이론으로 확장하여, 수학-정보-사회를 잇는 교과 간 연결성을 확보합니다."
          : "AI와 수학의 연결을 실습적으로 보여줄 수 있어, 서울대 컴퓨터공학과의 '인공지능' 연구 분야와 직접 연결됩니다.",
      existingConnection: t.topic.includes("자연어")
        ? "2학년 정보 세특의 알고리즘 탐구 경험을 '문자열 처리'로 확장하는 자연스러운 심화입니다."
        : t.topic.includes("그래프")
          ? "2학년에 학습한 다익스트라 알고리즘이 그래프 탐색의 일종이므로 자연스러운 확장입니다."
          : "수학Ⅱ에서 탐구한 경사하강법이 강화학습의 최적화에서도 활용되어 연결됩니다.",
    })),
    {
      topic: "암호학의 수학적 원리와 블록체인 기술 탐구",
      relatedSubjects: ["수학", "정보"],
      description:
        "RSA 암호 알고리즘의 수학적 원리(소인수분해, 모듈러 연산)를 학습하고, 이를 기반으로 간단한 암호화/복호화 프로그램을 구현합니다.",
      rationale:
        "수학과 정보보안의 접점을 탐구하여 컴퓨터공학의 폭넓은 관심을 보여줍니다.",
      existingConnection:
        "수학 교과에서 학습한 정수론 개념을 실제 암호 기술에 적용하는 심화입니다.",
      importance: "medium",
    },
    {
      topic: "컴퓨터 비전을 활용한 교내 쓰레기 분류 시스템 설계",
      relatedSubjects: ["정보", "과학", "사회"],
      description:
        "TensorFlow의 이미지 분류 모델을 활용하여 재활용 쓰레기를 자동으로 분류하는 시스템을 설계하고, 환경 문제 해결에 IT 기술을 적용하는 방안을 탐구합니다.",
      rationale:
        "사회 문제 해결에 IT를 적용하는 경험으로 '공동체 의식'과 '기술의 사회적 책임'을 동시에 보여줍니다.",
      existingConnection:
        "코딩 동아리 해커톤에서의 프로젝트 경험을 사회적 가치 창출로 확장합니다.",
      importance: "low",
    },
  ],
};

const topicRecommendationPremium: TopicRecommendationSection = {
  sectionId: "topicRecommendation",
  title: "세특 주제 추천",
  topics: topicRecommendationStandard.topics.map((t) => ({
    ...t,
    activityDesign: t.topic.includes("자연어")
      ? {
          steps: [
            "1주차: KoNLPy 라이브러리 학습 및 한국어 형태소 분석 실습",
            "2주차: 감성 사전 기반 감성 분석 알고리즘 설계",
            "3주차: 뉴스 기사 데이터 수집 및 감성 분석 프로그램 구현",
            "4주차: 분석 결과 시각화 및 정확도 평가",
            "5주차: 탐구 보고서 작성 및 교과 선생님 피드백",
          ],
          duration: "5주 (주 4시간)",
          expectedResult:
            "정보 + 국어 세특 연계 탐구 보고서 1편 + Python 프로그램 결과물",
        }
      : t.topic.includes("그래프")
        ? {
            steps: [
              "1주차: 그래프 이론 기본 개념 학습 (인접 행렬, 인접 리스트)",
              "2주차: 중심성 지표(degree, betweenness, closeness) 구현",
              "3주차: 실제 네트워크 데이터 수집 및 분석",
              "4주차: 분석 결과 시각화 및 해석, 보고서 작성",
            ],
            duration: "4주 (주 3시간)",
            expectedResult: "수학 + 정보 + 사회 세특 연계 탐구 보고서 1편",
          }
        : {
            steps: [
              "1주차: 관련 이론 학습 및 선행 연구 조사",
              "2주차: 알고리즘/모델 설계 및 구현",
              "3주차: 실험 및 결과 분석",
              "4주차: 보고서 작성 및 발표 준비",
            ],
            duration: "4주 (주 3~4시간)",
            expectedResult: "탐구 보고서 1편 + 교내 발표 실적",
          },
    sampleEvaluation: t.topic.includes("자연어")
      ? "자연어 처리 기술에 관심을 가지고 KoNLPy 라이브러리를 활용하여 한국어 텍스트의 감성을 분석하는 프로그램을 독립적으로 개발함. 형태소 분석 결과를 활용한 감성 사전 매칭 알고리즘을 설계하였으며, 뉴스 기사 300건에 대한 감성 분석 정확도를 검증하여 78%의 정확도를 달성함. 이 과정에서 언어의 구조적 특성과 컴퓨터 처리의 관계를 깊이 있게 이해하게 되었다고 보고함."
      : t.topic.includes("그래프")
        ? "그래프 이론의 기본 개념을 학습한 후, NetworkX 라이브러리를 활용하여 실제 소셜 네트워크 데이터를 분석하는 프로젝트를 수행함. 중심성 지표(연결 중심성, 매개 중심성, 근접 중심성)를 직접 구현하고, 이를 라이브러리 결과와 비교 검증하는 과정에서 알고리즘의 정확성을 확인함. 수학 교과에서 배운 행렬 연산을 인접 행렬 표현에 적용하여 교과 간 연결성을 보여주었으며, 분석 결과를 시각화하여 의미 있는 해석을 도출함."
        : t.topic.includes("강화학습")
          ? "Q-러닝 알고리즘의 원리를 학습하고, Python으로 간단한 미로 탈출 게임 AI를 구현함. 보상 함수 설계 시 즉각적 보상과 장기적 보상의 균형을 실험적으로 탐구하였으며, 학습률과 감가율 파라미터를 변경하며 수렴 속도의 차이를 분석함. 수학Ⅱ에서 학습한 극한과 수열의 개념이 강화학습의 수렴 조건 이해에 활용되었다고 보고하여 교과 연계성이 돋보임."
          : t.topic.includes("암호학")
            ? "RSA 암호 알고리즘의 수학적 원리를 탐구하고, 소인수분해와 모듈러 연산을 활용한 암호화/복호화 프로그램을 Python으로 구현함. 키 길이에 따른 암호 강도 차이를 실험적으로 검증하였으며, 양자 컴퓨팅이 기존 암호 체계에 미치는 위협에 대해서도 조사하여 보고함. 수학 교과의 정수론 개념을 실제 보안 기술에 적용하는 융합적 사고가 돋보임."
            : "TensorFlow의 사전 학습 모델을 활용하여 재활용 쓰레기를 자동 분류하는 이미지 분류 시스템을 설계함. 교내에서 직접 수집한 쓰레기 이미지 데이터를 전처리하고 학습 데이터셋을 구성하는 과정에서 데이터 품질의 중요성을 체감함. 분류 정확도 85%를 달성하였으며, 환경 문제 해결에 IT 기술을 적용하는 과정에서 기술의 사회적 책임에 대해 깊이 성찰함.",
  })),
};

// ─── 섹션 15: 예상 면접 질문 ───

const interviewPrepStandard: InterviewPrepSection = {
  sectionId: "interviewPrep",
  title: "예상 면접 질문",
  questions: [
    {
      question:
        "컴퓨터공학과에 지원한 동기와 고등학교에서 이를 위해 어떤 노력을 했는지 말씀해 주세요.",
      questionType: "진로기반",
      intent: "진로 동기의 진정성과 구체적인 준비 과정을 확인",
      importance: "high",
    },
    {
      question:
        "세특에 기록된 다익스트라 알고리즘 탐구에서 시간 복잡도를 최적화한 과정을 설명해 주세요.",
      questionType: "세특기반",
      intent: "알고리즘 이해도와 최적화 사고력을 평가",
      importance: "high",
    },
    {
      question:
        "수학 세특에서 경사하강법을 탐구했는데, 경사하강법의 한계점은 무엇이라고 생각하나요?",
      questionType: "세특기반",
      intent: "단순 학습을 넘어 비판적 사고력이 있는지 확인",
      importance: "high",
    },
    {
      question:
        "AI 기술의 발전이 사회에 미치는 부정적 영향에 대해 어떻게 생각하나요?",
      questionType: "진로기반",
      intent: "기술에 대한 사회적 책임 의식과 비판적 사고력 평가",
      importance: "medium",
    },
    {
      question:
        "코딩 동아리에서 팀 프로젝트를 수행한 경험과 본인의 역할을 말씀해 주세요.",
      questionType: "인성기반",
      intent: "협업 능력과 팀 내 역할을 확인",
      importance: "high",
    },
    {
      question:
        "프로그래밍을 하다가 해결하기 어려운 버그를 만났을 때 어떻게 대처하나요?",
      questionType: "세특기반",
      intent: "문제 해결 방법론과 끈기를 평가",
      importance: "medium",
    },
    {
      question:
        "컴퓨터공학과 수학의 관계를 어떻게 생각하며, 수학이 왜 중요한지 설명해 주세요.",
      questionType: "성적기반",
      intent: "전공에 대한 이해 깊이와 수학적 소양 확인",
      importance: "high",
    },
    {
      question:
        "대학에서 구체적으로 어떤 분야를 공부하고 싶은지 말씀해 주세요.",
      questionType: "진로기반",
      intent: "전공 분야에 대한 구체적인 학업 계획 확인",
      importance: "high",
    },
    {
      question: "고등학교 생활 중 가장 도전적이었던 경험은 무엇인가요?",
      questionType: "인성기반",
      intent: "도전 정신과 회복 탄력성 평가",
      importance: "medium",
    },
    {
      question:
        "개인정보 보호와 데이터 활용 사이의 균형에 대한 본인의 의견을 말씀해 주세요.",
      questionType: "진로기반",
      intent: "IT 윤리에 대한 인식과 논리적 사고력 평가",
      importance: "medium",
    },
    // ─── 추가 질문 11~27 ───
    {
      question:
        "물리 세특에서 반도체의 원리를 탐구했다고 되어 있는데, 반도체가 컴퓨터공학에서 왜 중요한지 설명해 주세요.",
      questionType: "세특기반",
      intent: "물리-전공 연결 사고력과 하드웨어 이해도를 확인",
      importance: "medium",
    },
    {
      question:
        "인문 교과(국어, 한국사 등)가 컴퓨터공학을 공부하는 데 어떤 도움이 된다고 생각하나요?",
      questionType: "성적기반",
      intent:
        "인문 교과 연계 부족에 대한 자기 인식과 균형 잡힌 학습 태도를 확인",
      importance: "medium",
    },
    {
      question:
        "코딩 교육 봉사를 계획하고 있다고 들었는데, 프로그래밍을 전혀 모르는 초등학생에게 어떻게 코딩을 가르칠 건가요?",
      questionType: "인성기반",
      intent: "교육적 역량과 공동체 기여 의지를 확인",
      importance: "high",
    },
    {
      question:
        "수학적 사고가 프로그래밍에 구체적으로 어떻게 활용되는지 본인의 경험을 바탕으로 말씀해 주세요.",
      questionType: "세특기반",
      intent: "수학-프로그래밍 융합 사고의 깊이와 실제 적용 경험을 확인",
      importance: "high",
    },
    {
      question:
        "ChatGPT와 같은 생성형 AI가 프로그래머의 역할을 대체할 수 있다고 생각하나요? 그렇다면/아니라면 그 이유는 무엇인가요?",
      questionType: "진로기반",
      intent:
        "최신 IT 트렌드에 대한 관심과 비판적 사고력, 진로에 대한 확신을 평가",
      importance: "medium",
    },
    {
      question:
        "팀 프로젝트에서 팀원 간 의견 충돌이 발생했을 때 어떻게 해결하나요?",
      questionType: "인성기반",
      intent: "갈등 해결 능력과 소통 역량을 평가",
      importance: "medium",
    },
    {
      question:
        "자율주행 자동차의 윤리적 딜레마(트롤리 문제)에 대해 프로그래머로서 어떻게 접근해야 한다고 생각하나요?",
      questionType: "진로기반",
      intent: "AI 윤리에 대한 깊이 있는 사고와 기술-인문 융합적 관점을 확인",
      importance: "low",
    },
    {
      question:
        "학업 스트레스가 심할 때 어떻게 관리하고, 공부와 생활의 균형을 어떻게 유지하나요?",
      questionType: "인성기반",
      intent: "자기관리 능력과 심리적 건강에 대한 인식을 확인",
      importance: "low",
    },
    {
      question:
        "대학 졸업 후 10년 뒤에 어떤 일을 하고 있을 것이라고 생각하나요?",
      questionType: "진로기반",
      intent: "장기적 진로 비전과 전공에 대한 진정성을 확인",
      importance: "medium",
    },
    {
      question:
        "스스로 학습 계획을 세우고 실행한 경험이 있나요? 구체적으로 어떤 방법으로 자기주도 학습을 해 왔는지 말씀해 주세요.",
      questionType: "성적기반",
      intent: "자기주도 학습 능력과 학습 전략을 평가",
      importance: "medium",
    },
    {
      question:
        "고등학교에서 가장 큰 실패 경험은 무엇이었고, 그것을 어떻게 극복했나요?",
      questionType: "인성기반",
      intent: "실패에 대한 태도와 회복 탄력성을 확인",
      importance: "medium",
    },
    {
      question:
        "교내 해커톤에 참가했다고 되어 있는데, 어떤 프로젝트를 만들었고 그 과정에서 무엇을 배웠나요?",
      questionType: "세특기반",
      intent: "프로젝트 수행 경험의 깊이와 학습 성찰 능력을 확인",
      importance: "high",
    },
    {
      question:
        "Python을 주로 사용한다고 했는데, 왜 Python을 선택했나요? 다른 프로그래밍 언어와 비교했을 때 장단점은 무엇인가요?",
      questionType: "세특기반",
      intent: "프로그래밍 언어에 대한 이해도와 기술적 판단력을 확인",
      importance: "low",
    },
    {
      question:
        "기하나 물리학Ⅱ를 이수하지 않은 이유가 있나요? 컴퓨터공학과에서 이 과목들이 필요할 수 있는데 어떻게 보완할 계획인가요?",
      questionType: "성적기반",
      intent: "교과 선택의 한계를 인식하고 있는지, 그리고 보완 의지를 확인",
      importance: "high",
    },
    {
      question:
        "교내 활동 외에 비교과 활동이 상대적으로 적은 편인데, 그 이유는 무엇인가요?",
      questionType: "성적기반",
      intent: "활동의 양적 부족에 대한 자기 인식과 질적 보완 논리를 확인",
      importance: "medium",
    },
    {
      question:
        "최근에 읽은 컴퓨터공학 관련 도서가 있나요? 어떤 내용이었고 어떤 점이 인상 깊었나요?",
      questionType: "진로기반",
      intent: "독서를 통한 지적 호기심과 전공 분야 탐구 의지를 확인",
      importance: "low",
    },
    {
      question:
        "오픈소스 소프트웨어에 대해 어떻게 생각하나요? 참여해 본 경험이 있다면 말씀해 주세요.",
      questionType: "진로기반",
      intent: "소프트웨어 생태계에 대한 이해와 협업 문화에 대한 관심을 확인",
      importance: "low",
    },
    // ─── 추가 질문 28~30 (Premium 30개 충족용) ───
    {
      question:
        "데이터베이스와 자료구조의 차이점은 무엇이며, 각각 어떤 상황에서 활용되는지 설명해 주세요.",
      questionType: "세특기반",
      intent: "컴퓨터공학 기초 개념에 대한 이해도와 실무 적용 사고력을 확인",
      importance: "medium",
    },
    {
      question:
        "학교 공동체를 위해 본인의 IT 역량을 활용해 기여한 경험이 있다면 말씀해 주세요.",
      questionType: "인성기반",
      intent: "공동체 의식과 전공 역량의 사회적 활용 의지를 평가",
      importance: "high",
    },
    {
      question:
        "컴퓨터공학을 전공한 후 사회적으로 어떤 문제를 해결하고 싶은지 구체적으로 말씀해 주세요.",
      questionType: "진로기반",
      intent: "기술을 통한 사회 기여 비전과 진로 목표의 구체성을 확인",
      importance: "high",
    },
  ],
};

const INTERVIEW_PREMIUM_MAP: Record<
  string,
  {
    answerStrategy: string;
    sampleAnswer: string;
    followUpQuestions: { question: string; context: string }[];
    difficulty: "상" | "중" | "하";
    frequency: "높음" | "보통" | "낮음";
    answerKeywords: string[];
  }
> = {
  "컴퓨터공학과에 지원한 동기": {
    answerStrategy:
      "관심의 시작(계기) → 심화 과정(탐구/활동) → 미래 비전의 3단계로 구성. 진정성이 핵심.",
    sampleAnswer:
      "중학교 때 간단한 게임을 만들어 본 것이 계기가 되어 프로그래밍에 관심을 갖게 되었습니다. 고등학교에 진학하여 정보 교과에서 알고리즘의 체계적인 세계를 접하면서 단순 코딩을 넘어 효율적인 문제 해결에 매료되었습니다. 특히 다익스트라 알고리즘을 학습하며 수학적 사고와 프로그래밍이 결합할 때 강력한 도구가 된다는 것을 깨달았고, 대학에서 이론적 기초를 탄탄히 다지고 싶습니다.",
    followUpQuestions: [
      {
        question: "컴퓨터공학 외에 다른 진로를 고민해 본 적은 없나요?",
        context: "진로 선택의 확신과 다른 분야에 대한 열린 태도를 확인",
      },
      {
        question:
          "게임 개발 경험이 알고리즘 학습으로 이어진 구체적인 계기가 있나요?",
        context: "진로 동기의 구체성과 연결성을 심층 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: ["진정성", "계기", "심화 과정", "미래 비전", "알고리즘"],
  },
  "다익스트라 알고리즘 탐구": {
    answerStrategy:
      "원래 구현(O(V²)) → 문제 인식 → 최적화 과정(우선순위 큐) → 결과와 배움의 흐름으로 답변.",
    sampleAnswer:
      "처음에 인접 행렬과 선형 탐색으로 구현했을 때 시간 복잡도가 O(V²)였습니다. 노드가 많아지면 비효율적이라는 점을 인식하고, 우선순위 큐(힙)를 활용하여 O((V+E)logV)로 최적화했습니다. 이 과정에서 자료구조의 선택이 알고리즘 성능에 직접적으로 영향을 준다는 것을 깨달았고, 이후 다른 알고리즘에서도 자료구조 선택을 먼저 고민하는 습관이 생겼습니다.",
    followUpQuestions: [
      {
        question:
          "다익스트라 알고리즘이 적용될 수 없는 경우는 어떤 상황인가요?",
        context:
          "음의 가중치 간선이 있는 그래프에서의 한계를 이해하고 있는지 확인",
      },
      {
        question: "다익스트라 외에 다른 최단 경로 알고리즘을 알고 있나요?",
        context:
          "벨만-포드, 플로이드-워셜 등 관련 알고리즘에 대한 학습 범위 확인",
      },
    ],
    difficulty: "상",
    frequency: "높음",
    answerKeywords: [
      "시간 복잡도",
      "우선순위 큐",
      "O(V²)",
      "O((V+E)logV)",
      "자료구조",
    ],
  },
  "경사하강법을 탐구": {
    answerStrategy:
      "학습한 내용 요약 → 한계점(local minimum, learning rate) → 대안(Adam, momentum) 순으로 논리적으로 전개.",
    sampleAnswer:
      "경사하강법은 함수의 기울기(gradient)를 이용하여 최솟값을 찾는 방법인데, 몇 가지 한계가 있습니다. 첫째, 지역 최솟값(local minimum)에 갇힐 수 있습니다. 둘째, 학습률(learning rate) 설정이 어렵습니다. 너무 크면 발산하고 너무 작으면 수렴이 느립니다. 이를 해결하기 위해 모멘텀이나 Adam과 같은 적응적 학습률 방법이 있다는 것도 탐구를 통해 알게 되었습니다.",
    followUpQuestions: [
      {
        question: "경사하강법이 실제로 어떤 분야에서 활용되나요?",
        context: "이론과 실제 응용의 연결 능력을 확인",
      },
      {
        question: "Adam 옵티마이저의 원리를 간단히 설명할 수 있나요?",
        context: "탐구의 깊이와 추가 학습 여부를 확인",
      },
    ],
    difficulty: "상",
    frequency: "보통",
    answerKeywords: ["기울기", "지역 최솟값", "학습률", "모멘텀", "Adam"],
  },
  "부정적 영향에 대해": {
    answerStrategy:
      "긍정적 측면 인정 → 부정적 영향 2~3가지 구체적 제시 → 해결 방향 제안의 구조로 균형 잡힌 답변.",
    sampleAnswer:
      "AI 기술은 생산성 향상과 의료 발전 등 긍정적 면이 크지만, 부정적 영향도 존재합니다. 첫째, 일자리 대체 문제입니다. 단순 반복 업무뿐 아니라 지식 노동까지 영향을 받을 수 있습니다. 둘째, 알고리즘 편향으로 인한 차별 문제입니다. 학습 데이터에 내재된 편견이 AI의 판단에 그대로 반영될 수 있습니다. 저는 기술을 개발하는 엔지니어로서 이런 문제에 대한 책임 의식을 갖고 공정한 AI를 만드는 데 기여하고 싶습니다.",
    followUpQuestions: [
      {
        question: "알고리즘 편향을 기술적으로 해결할 수 있는 방법이 있을까요?",
        context: "기술적 해결 방안에 대한 사고력을 확인",
      },
      {
        question: "AI 규제에 대해서는 어떻게 생각하나요?",
        context: "정책적 관점과 균형 잡힌 시각을 평가",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: ["일자리 대체", "알고리즘 편향", "책임 의식", "공정한 AI"],
  },
  "팀 프로젝트를 수행한 경험": {
    answerStrategy:
      "프로젝트 개요 → 본인 역할 구체적 서술 → 협업 과정에서 배운 점 순으로 답변.",
    sampleAnswer:
      "코딩 동아리에서 학교 급식 메뉴를 알려주는 챗봇을 개발하는 프로젝트를 수행했습니다. 저는 백엔드 개발을 담당하여 급식 데이터를 크롤링하고 API를 구현했습니다. 팀원이 프론트엔드를 맡았는데, 데이터 형식 불일치 문제가 있어 API 명세서를 함께 작성하며 해결했습니다. 이 경험을 통해 소통의 중요성과 문서화의 가치를 배웠습니다.",
    followUpQuestions: [
      {
        question: "팀원과 기술적 의견 차이가 있었을 때 어떻게 했나요?",
        context: "실제 갈등 상황에서의 대처 능력을 확인",
      },
      {
        question: "그 프로젝트에서 아쉬웠던 점이 있다면 무엇인가요?",
        context: "프로젝트에 대한 성찰 능력을 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: ["역할", "협업", "소통", "문서화", "문제 해결"],
  },
  "해결하기 어려운 버그": {
    answerStrategy:
      "구체적 에피소드 → 디버깅 과정(재현-원인추적-해결) → 배운 점의 흐름으로 답변.",
    sampleAnswer:
      "해커톤에서 정렬 알고리즘을 구현할 때, 특정 입력에서만 무한 루프가 발생하는 버그를 만났습니다. 먼저 문제가 발생하는 입력 패턴을 분석하고, print문을 활용하여 변수 변화를 추적했습니다. 결국 경계값 처리 오류라는 것을 발견하고 수정했습니다. 이 경험으로 체계적 디버깅의 중요성과 엣지 케이스 테스트의 필요성을 배웠습니다.",
    followUpQuestions: [
      {
        question: "디버깅 도구를 사용해 본 경험이 있나요?",
        context: "개발 도구 활용 능력을 확인",
      },
      {
        question: "테스트 코드를 작성하는 습관이 있나요?",
        context: "소프트웨어 품질에 대한 인식을 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: [
      "재현",
      "원인 추적",
      "경계값",
      "체계적 디버깅",
      "엣지 케이스",
    ],
  },
  "수학의 관계를 어떻게": {
    answerStrategy:
      "수학의 역할(이론적 기반) → 구체적 예시(알고리즘, AI) → 본인의 경험 연결 순으로 답변.",
    sampleAnswer:
      "컴퓨터공학에서 수학은 단순한 도구가 아니라 사고의 기반입니다. 알고리즘의 시간복잡도 분석에 수학적 증명이 필요하고, AI의 핵심인 신경망은 선형대수와 미적분에 기반합니다. 제가 경사하강법을 탐구할 때도 미분 개념이 있었기에 원리를 이해할 수 있었고, 다익스트라 알고리즘의 정당성도 수학적으로 증명할 수 있었습니다.",
    followUpQuestions: [
      {
        question:
          "컴퓨터공학에서 가장 중요한 수학 분야는 무엇이라고 생각하나요?",
        context: "수학 분야에 대한 이해 범위를 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: [
      "이론적 기반",
      "시간복잡도",
      "선형대수",
      "미적분",
      "수학적 증명",
    ],
  },
  "어떤 분야를 공부하고 싶은지": {
    answerStrategy:
      "관심 분야 명시 → 관심을 갖게 된 계기 → 대학에서의 구체적 학업 계획 순으로 답변.",
    sampleAnswer:
      "인공지능, 특히 기계학습 분야를 깊이 공부하고 싶습니다. 고등학교에서 경사하강법과 강화학습을 탐구하면서 AI의 학습 원리에 큰 흥미를 느꼈습니다. 대학에서는 1~2학년에 자료구조, 알고리즘, 선형대수 등 기초를 탄탄히 다지고, 3~4학년에 기계학습과 딥러닝 수업을 수강하며 연구실 인턴을 통해 실제 연구 경험을 쌓고 싶습니다.",
    followUpQuestions: [
      {
        question: "기계학습 외에 관심 있는 컴퓨터공학 분야가 있나요?",
        context: "전공 내 다양한 분야에 대한 관심도를 확인",
      },
      {
        question: "대학원 진학도 고려하고 있나요?",
        context: "장기적 학업 계획과 연구에 대한 관심을 확인",
      },
    ],
    difficulty: "하",
    frequency: "높음",
    answerKeywords: [
      "기계학습",
      "기초 과목",
      "연구실 인턴",
      "단계적 학업 계획",
    ],
  },
  "가장 도전적이었던 경험": {
    answerStrategy:
      "도전 상황 구체적 서술 → 어려움과 극복 과정 → 성장과 배움의 구조로 답변.",
    sampleAnswer:
      "2학년 교내 해커톤에서 24시간 동안 팀 프로젝트를 완성하는 것이 가장 도전적이었습니다. 시간 압박 속에서 기능을 줄여야 했고, 새벽에 핵심 기능의 버그를 발견하여 포기하고 싶었지만, 팀원들과 역할을 재분배하고 집중력을 발휘하여 결국 발표까지 마쳤습니다. 이 경험으로 제한된 조건에서 우선순위를 정하는 능력과 끈기를 배웠습니다.",
    followUpQuestions: [
      {
        question: "해커톤에서 만든 프로젝트를 이후에 발전시킨 적이 있나요?",
        context: "지속적인 발전 의지를 확인",
      },
    ],
    difficulty: "하",
    frequency: "높음",
    answerKeywords: ["도전", "극복", "우선순위", "끈기", "팀워크"],
  },
  "개인정보 보호와 데이터 활용": {
    answerStrategy:
      "양측 입장 정리 → 균형점 제시 → 기술적/제도적 해결 방안 제안의 구조로 답변.",
    sampleAnswer:
      "데이터 활용은 AI 발전과 서비스 개선에 필수적이지만, 개인의 프라이버시도 소중합니다. 저는 차등 프라이버시(Differential Privacy)나 연합학습(Federated Learning)처럼 개인 데이터를 직접 수집하지 않으면서도 AI를 학습시킬 수 있는 기술적 방법이 균형점이 될 수 있다고 생각합니다. 기술적 해결과 함께 투명한 동의 절차 같은 제도적 보완도 필요합니다.",
    followUpQuestions: [
      {
        question: "차등 프라이버시가 무엇인지 좀 더 설명해 줄 수 있나요?",
        context: "언급한 기술에 대한 실제 이해도를 확인",
      },
      {
        question: "GDPR이나 한국의 개인정보보호법에 대해 알고 있나요?",
        context: "법적 프레임워크에 대한 인식을 확인",
      },
    ],
    difficulty: "상",
    frequency: "보통",
    answerKeywords: [
      "차등 프라이버시",
      "연합학습",
      "동의 절차",
      "균형",
      "기술적 해결",
    ],
  },
  "반도체의 원리를 탐구": {
    answerStrategy:
      "반도체 기본 원리 → 컴퓨터공학과의 연결(CPU, GPU) → 본인이 탐구한 내용과 배운 점 순으로 답변.",
    sampleAnswer:
      "반도체는 컴퓨터의 모든 연산을 수행하는 CPU와 GPU의 핵심 소재입니다. 물리 수업에서 P-N 접합 다이오드의 원리를 학습한 후, 이것이 트랜지스터로 확장되어 논리 게이트를 구성하고 결국 컴퓨터의 연산 장치가 된다는 것을 탐구했습니다. 소프트웨어가 하드웨어 위에서 동작한다는 점에서, 반도체 원리를 이해하면 더 효율적인 프로그램을 설계할 수 있다고 생각합니다.",
    followUpQuestions: [
      {
        question:
          "무어의 법칙에 대해 알고 있나요? 현재 한계에 대해 어떻게 생각하나요?",
        context: "반도체 기술 발전과 한계에 대한 인식을 확인",
      },
      {
        question: "양자 컴퓨터에 대해 들어본 적 있나요?",
        context: "차세대 컴퓨팅 기술에 대한 관심도를 확인",
      },
    ],
    difficulty: "상",
    frequency: "보통",
    answerKeywords: [
      "P-N 접합",
      "트랜지스터",
      "논리 게이트",
      "하드웨어-소프트웨어",
    ],
  },
  "인문 교과(국어, 한국사 등)가": {
    answerStrategy:
      "인문학의 가치 인정 → 컴퓨터공학과의 구체적 연결점 제시 → 본인의 보완 계획 순으로 답변.",
    sampleAnswer:
      "인문 교과는 컴퓨터공학에서 중요한 역할을 합니다. 국어는 사용자 인터페이스 설계와 자연어 처리에서 언어 구조 이해가 필요하고, 역사와 사회는 기술이 사회에 미치는 영향을 비판적으로 바라보는 시각을 길러줍니다. 솔직히 고등학교에서 인문 교과와 전공을 연결하는 노력이 부족했다고 반성하고 있으며, 3학년에는 국어에서 NLP 관련 탐구를 하는 등 적극적으로 연결하려 합니다.",
    followUpQuestions: [
      {
        question: "NLP에 대해 어느 정도 공부해 보았나요?",
        context: "언급한 분야에 대한 실제 학습 수준을 확인",
      },
      {
        question:
          "인문 교과 성적이 상대적으로 낮은 이유를 어떻게 설명하시겠어요?",
        context: "성적 편차에 대한 솔직한 자기 인식을 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: [
      "NLP",
      "사용자 인터페이스",
      "비판적 시각",
      "자기반성",
      "보완 계획",
    ],
  },
  "코딩을 전혀 모르는 초등학생에게": {
    answerStrategy:
      "교육 철학 → 구체적 교수 방법 → 기대 효과와 본인에게의 의미 순으로 답변.",
    sampleAnswer:
      "초등학생에게는 코드 자체보다 '논리적 사고'를 먼저 가르치는 것이 중요하다고 생각합니다. 스크래치(Scratch) 같은 블록 코딩 도구를 활용하여 게임이나 애니메이션을 만들면서 조건문과 반복문의 개념을 자연스럽게 체득하도록 하겠습니다. 아이들이 '내가 만든 것이 작동한다'는 성취감을 느끼게 하는 것이 목표입니다. 가르치는 과정에서 저도 기초 개념을 더 깊이 이해하게 될 것이라 기대합니다.",
    followUpQuestions: [
      {
        question: "아이들이 흥미를 잃었을 때 어떻게 동기부여 하겠어요?",
        context: "교육적 상황 대처 능력과 공감 능력을 확인",
      },
      {
        question: "스크래치 외에 교육용 프로그래밍 도구를 알고 있나요?",
        context: "교육 도구에 대한 관심과 준비도를 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: [
      "논리적 사고",
      "블록 코딩",
      "성취감",
      "단계적 교육",
      "스크래치",
    ],
  },
  "수학적 사고가 프로그래밍에 구체적으로": {
    answerStrategy:
      "수학적 사고의 정의 → 프로그래밍에서의 구체적 적용 사례 → 본인 경험 연결 순으로 답변.",
    sampleAnswer:
      "수학적 사고의 핵심은 추상화와 논리적 추론인데, 이것이 프로그래밍의 본질과 같다고 생각합니다. 예를 들어, 다익스트라 알고리즘을 구현할 때 그래프를 수학적으로 모델링하고 최적해를 증명하는 과정이 필요했습니다. 또한 경사하강법 탐구에서 미분의 기하학적 의미를 이해한 것이 코드의 수렴 조건을 설정하는 데 직접적으로 도움이 되었습니다. 수학은 '왜 이 코드가 작동하는가'를 이해하게 해주는 도구입니다.",
    followUpQuestions: [
      {
        question:
          "수학이 약한 프로그래머도 좋은 개발자가 될 수 있다고 생각하나요?",
        context: "유연한 사고와 다양한 관점에 대한 인식을 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: ["추상화", "논리적 추론", "모델링", "수렴 조건", "증명"],
  },
  "생성형 AI가 프로그래머의 역할을": {
    answerStrategy:
      "현재 AI 코딩 능력 인정 → 대체 불가능한 영역 분석 → 미래 프로그래머의 역할 변화 전망 순으로 답변.",
    sampleAnswer:
      "ChatGPT와 Copilot 같은 AI가 코드 작성을 도와줄 수 있지만, 프로그래머를 완전히 대체하기는 어렵다고 생각합니다. AI는 기존 패턴을 모방하지만, 새로운 문제를 정의하고, 시스템 아키텍처를 설계하며, 사용자 요구를 이해하는 것은 인간의 역할입니다. 미래의 프로그래머는 AI를 도구로 활용하여 생산성을 높이되, 창의적 문제 해결과 시스템 설계에 집중하게 될 것이라 생각합니다.",
    followUpQuestions: [
      {
        question: "AI 코딩 도구를 실제로 사용해 본 적이 있나요?",
        context: "최신 도구에 대한 실제 경험을 확인",
      },
      {
        question: "AI가 만든 코드의 품질을 어떻게 검증할 수 있을까요?",
        context: "비판적 사고와 코드 품질에 대한 인식을 확인",
      },
      {
        question:
          "AI 시대에 프로그래머가 갖춰야 할 역량은 무엇이라고 생각하나요?",
        context: "미래 지향적 사고와 자기 발전 계획을 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: [
      "AI 도구",
      "문제 정의",
      "시스템 설계",
      "창의적 문제 해결",
      "생산성",
    ],
  },
  "팀원 간 의견 충돌이 발생": {
    answerStrategy:
      "갈등 상황 구체적 서술 → 해결 과정 → 배운 점의 흐름으로 답변. 경청과 합리적 근거를 강조.",
    sampleAnswer:
      "동아리 프로젝트에서 데이터베이스 설계 방식을 놓고 팀원과 의견이 달랐습니다. 저는 관계형 DB를, 팀원은 NoSQL을 주장했습니다. 각자 장단점을 정리하여 발표하고, 프로젝트 요구사항에 비추어 어떤 방식이 더 적합한지 객관적으로 비교했습니다. 결국 데이터 구조가 단순했기에 NoSQL이 적합하다는 결론에 합의했고, 이 과정에서 감정이 아닌 근거 기반 토론의 중요성을 배웠습니다.",
    followUpQuestions: [
      {
        question: "합의에 도달하지 못했다면 어떻게 했을 것 같나요?",
        context: "갈등 해결의 차선책에 대한 사고력을 확인",
      },
      {
        question: "리더 역할을 맡아본 경험이 있나요?",
        context: "리더십 경험과 의지를 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: [
      "경청",
      "근거 기반",
      "객관적 비교",
      "합의",
      "커뮤니케이션",
    ],
  },
  "자율주행 자동차의 윤리적 딜레마": {
    answerStrategy:
      "트롤리 문제 설명 → 프로그래머 관점에서의 접근 → 사회적 합의의 필요성 순으로 답변.",
    sampleAnswer:
      "자율주행의 트롤리 문제는 '누구를 보호할 것인가'라는 윤리적 판단을 알고리즘에 담아야 하는 어려운 문제입니다. 프로그래머로서 특정 윤리 이론(공리주의, 의무론)을 일방적으로 적용하기보다는, 사회적 합의를 기반으로 한 윤리 프레임워크를 설계에 반영해야 한다고 생각합니다. MIT의 Moral Machine 프로젝트처럼 다양한 문화와 가치관을 데이터로 수집하여 의사결정에 반영하는 방법이 하나의 접근법이 될 수 있습니다.",
    followUpQuestions: [
      {
        question: "공리주의와 의무론의 차이를 간단히 설명할 수 있나요?",
        context: "인문학적 소양과 윤리 개념 이해도를 확인",
      },
      {
        question: "자율주행 기술의 현재 수준에 대해 어떻게 알고 있나요?",
        context: "최신 기술 동향에 대한 관심도를 확인",
      },
    ],
    difficulty: "상",
    frequency: "낮음",
    answerKeywords: [
      "트롤리 문제",
      "윤리 프레임워크",
      "사회적 합의",
      "Moral Machine",
      "공리주의",
    ],
  },
  "학업 스트레스가 심할 때": {
    answerStrategy:
      "구체적 스트레스 관리 방법 → 학습과 생활의 균형 전략 → 효과와 성장의 흐름으로 답변.",
    sampleAnswer:
      "시험 기간에 스트레스가 심할 때는 운동으로 해소합니다. 30분 정도 달리기를 하면 머리가 맑아지고 집중력이 회복됩니다. 또한 공부 계획을 세울 때 반드시 휴식 시간을 포함하고, '포모도로 기법'으로 25분 집중-5분 휴식을 반복합니다. 취미인 코딩도 스트레스 해소에 도움이 됩니다. 시험공부와 다른 종류의 문제를 풀면서 머리를 전환하는 느낌이 좋습니다.",
    followUpQuestions: [
      {
        question: "공부가 잘 안 될 때 계획을 어떻게 수정하나요?",
        context: "유연성과 자기관리 능력을 확인",
      },
    ],
    difficulty: "하",
    frequency: "보통",
    answerKeywords: ["운동", "포모도로", "계획", "휴식", "자기관리"],
  },
  "대학 졸업 후 10년 뒤": {
    answerStrategy:
      "단기 목표(대학) → 중기 목표(취업/대학원) → 장기 비전(10년)의 단계적 구조로 답변.",
    sampleAnswer:
      "대학에서 기계학습과 AI를 깊이 공부한 후, 대학원에 진학하여 연구 경험을 쌓고 싶습니다. 졸업 후에는 AI 기술로 사회 문제를 해결하는 일에 참여하고 싶습니다. 10년 뒤에는 AI 기반 교육 기술 분야에서 모든 학생이 자신에게 맞는 교육을 받을 수 있는 적응형 학습 시스템을 개발하는 연구자 또는 엔지니어가 되어 있기를 희망합니다.",
    followUpQuestions: [
      {
        question: "적응형 학습 시스템에 대해 조사해 본 적이 있나요?",
        context: "구체적인 관심 분야에 대한 탐구 깊이를 확인",
      },
      {
        question: "창업에 대한 관심은 있나요?",
        context: "진로 다양성과 도전 의지를 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: [
      "대학원",
      "사회 문제 해결",
      "적응형 학습",
      "연구자",
      "단계적 계획",
    ],
  },
  "자기주도 학습을 해 왔는지": {
    answerStrategy:
      "자기주도 학습의 구체적 방법 → 실제 적용 사례 → 성과와 배운 점 순으로 답변.",
    sampleAnswer:
      "정보 교과에서 교과서 범위를 넘어 알고리즘을 독학한 경험이 있습니다. 백준 온라인 저지에서 단계별로 문제를 풀면서, 모르는 알고리즘은 직접 검색하고 구현해 보는 방식으로 학습했습니다. 학습 계획표를 주 단위로 작성하고, 풀지 못한 문제는 '오답 노트'에 기록하여 반복 학습했습니다. 이 방법으로 2학년 동안 약 200문제를 풀었고, 알고리즘 분류별 약점을 파악하여 집중적으로 보완할 수 있었습니다.",
    followUpQuestions: [
      {
        question: "자기주도 학습에서 가장 어려웠던 점은 무엇인가요?",
        context: "학습 과정에서의 어려움과 극복 경험을 확인",
      },
      {
        question: "학원이나 과외 없이 공부하는 것에 대해 어떻게 생각하나요?",
        context: "학습 방법에 대한 가치관을 확인",
      },
    ],
    difficulty: "하",
    frequency: "높음",
    answerKeywords: [
      "독학",
      "학습 계획표",
      "오답 노트",
      "단계별 학습",
      "약점 보완",
    ],
  },
  "가장 큰 실패 경험": {
    answerStrategy:
      "실패 상황 구체적 서술 → 실패 원인 분석 → 극복 과정과 성장 순으로 답변. 솔직함이 핵심.",
    sampleAnswer:
      "1학년 때 처음으로 참가한 교내 과학 탐구 발표 대회에서 준비 부족으로 질의응답에 제대로 답하지 못한 것이 가장 큰 실패입니다. 발표 자료는 잘 만들었지만, 탐구 과정에서 '왜?'라는 질문에 대한 깊은 이해가 부족했던 것이 원인이었습니다. 이후 2학년 해커톤에서는 프로젝트의 모든 기술적 결정에 '왜 이 방법을 선택했는가'를 문서로 정리하는 습관을 들였고, 발표에서 자신 있게 답변할 수 있었습니다.",
    followUpQuestions: [
      {
        question: "실패를 통해 바뀐 학습 습관이 구체적으로 무엇인가요?",
        context: "실패로부터의 학습 능력과 성장을 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: [
      "실패 인정",
      "원인 분석",
      "개선 노력",
      "문서화 습관",
      "성장",
    ],
  },
  "교내 해커톤에 참가했다고": {
    answerStrategy:
      "프로젝트 소개 → 개발 과정(기술 스택, 역할 분담) → 결과와 배운 점 순으로 답변.",
    sampleAnswer:
      "24시간 해커톤에서 '학교 분실물 관리 시스템'을 팀으로 개발했습니다. Python Flask로 백엔드를, HTML/CSS/JavaScript로 프론트엔드를 구현했습니다. 저는 분실물 데이터베이스 설계와 검색 기능 구현을 담당했습니다. 시간 내에 완성하기 위해 MVP(최소 기능 제품) 개념을 적용하여 핵심 기능에 집중했습니다. 완벽하지는 않았지만, 실제 작동하는 서비스를 만든 경험이 소프트웨어 개발의 전체 과정을 이해하는 데 큰 도움이 되었습니다.",
    followUpQuestions: [
      {
        question: "MVP 개념을 어디서 알게 되었나요?",
        context: "소프트웨어 개발 방법론에 대한 관심도를 확인",
      },
      {
        question: "그 프로젝트를 지금 다시 만든다면 어떻게 개선하겠어요?",
        context: "기술적 성장과 반성적 사고를 확인",
      },
      {
        question: "해커톤에서 시간 관리를 어떻게 했나요?",
        context: "프로젝트 관리 능력과 우선순위 설정을 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: [
      "MVP",
      "Flask",
      "데이터베이스",
      "시간 관리",
      "풀스택 경험",
    ],
  },
  "왜 Python을 선택했나요": {
    answerStrategy:
      "Python 선택 이유 → 다른 언어와의 비교 → 상황에 따른 언어 선택의 중요성 순으로 답변.",
    sampleAnswer:
      "Python을 주로 사용하는 이유는 문법이 직관적이어서 알고리즘의 로직에 집중할 수 있고, 데이터 분석과 AI 관련 라이브러리가 풍부하기 때문입니다. 하지만 실행 속도가 느리다는 단점이 있어, 성능이 중요한 경우에는 C/C++가 더 적합합니다. 해커톤에서 웹 서비스를 만들 때는 JavaScript도 사용했습니다. 언어는 도구이므로, 목적에 맞는 언어를 선택하는 것이 중요하다고 생각합니다.",
    followUpQuestions: [
      {
        question: "C나 Java를 배워 본 적이 있나요?",
        context: "프로그래밍 언어의 학습 범위를 확인",
      },
      {
        question: "대학에서 배우게 될 C언어에 대해 어떻게 생각하나요?",
        context: "저수준 언어에 대한 인식과 학습 의지를 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: [
      "직관적 문법",
      "라이브러리",
      "실행 속도",
      "도구 선택",
      "목적에 맞는 언어",
    ],
  },
  "기하나 물리학Ⅱ를 이수하지 않은": {
    answerStrategy:
      "미이수 이유 솔직히 설명 → 부족한 부분 인식 → 구체적 보완 계획 순으로 답변.",
    sampleAnswer:
      "기하와 물리학Ⅱ를 선택하지 않은 것은 당시 시간표 편성의 제약과 내신 관리를 고려한 결정이었습니다. 하지만 컴퓨터공학에서 기하학(컴퓨터 그래픽스)과 물리학(시뮬레이션)이 중요하다는 것을 알고 있습니다. 이를 보완하기 위해 방학 중 기하 교과서를 독학하고 있으며, Khan Academy의 선형대수 강의를 수강하고 있습니다. 대학 입학 전까지 기초를 다져 수업에 지장이 없도록 준비하겠습니다.",
    followUpQuestions: [
      {
        question: "선형대수에서 어떤 내용을 공부하고 있나요?",
        context: "자기 보완 노력의 구체성과 실제 학습 수준을 확인",
      },
      {
        question: "컴퓨터 그래픽스에 관심이 있나요?",
        context: "기하학 관련 전공 분야에 대한 관심도를 확인",
      },
    ],
    difficulty: "상",
    frequency: "높음",
    answerKeywords: [
      "시간표 제약",
      "보완 계획",
      "독학",
      "Khan Academy",
      "기초 준비",
    ],
  },
  "비교과 활동이 상대적으로 적은": {
    answerStrategy:
      "부족한 점 솔직히 인정 → 양보다 질을 강조 → 활동에서의 깊이와 배움 순으로 답변.",
    sampleAnswer:
      "비교과 활동의 양이 다른 학생들에 비해 적다는 것을 인정합니다. 다양한 활동에 참여하기보다는 코딩 동아리와 알고리즘 탐구에 깊이 있게 집중하는 것이 더 의미 있다고 판단했습니다. 동아리에서 2년간 꾸준히 알고리즘을 탐구하며 다익스트라 최적화, 해커톤 참가 등 실질적인 성과를 냈습니다. 다만 공동체 활동이 부족했다는 점은 반성하고 있으며, 3학년에 코딩 교육 봉사로 보완하려 합니다.",
    followUpQuestions: [
      {
        question: "깊이와 넓이 중 무엇이 더 중요하다고 생각하나요?",
        context: "활동에 대한 가치관과 자기 인식을 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: [
      "깊이 있는 집중",
      "솔직한 인정",
      "실질적 성과",
      "보완 계획",
    ],
  },
  "컴퓨터공학 관련 도서가 있나요": {
    answerStrategy:
      "도서명과 핵심 내용 → 인상 깊었던 점 → 본인의 진로와의 연결 순으로 답변.",
    sampleAnswer:
      "최근에 『클린 코드(Clean Code)』를 읽었습니다. 이 책은 좋은 코드를 작성하는 원칙과 실천 방법을 다루고 있는데, 특히 '이름 짓기'와 '함수는 한 가지 일만 해야 한다'는 원칙이 인상 깊었습니다. 이전에는 코드가 작동하기만 하면 된다고 생각했는데, 이 책을 읽고 나서는 '다른 사람이 읽기 쉬운 코드'를 쓰려고 노력하게 되었습니다. 앞으로 『알고리즘 도감』과 『컴퓨터 과학이 여는 세계』도 읽을 계획입니다.",
    followUpQuestions: [
      {
        question: "클린 코드의 원칙을 실제 코딩에 적용해 본 경험이 있나요?",
        context: "독서와 실천의 연결 능력을 확인",
      },
      {
        question: "인문학이나 사회과학 관련 도서도 읽은 적이 있나요?",
        context: "독서의 균형성과 지적 호기심의 범위를 확인",
      },
    ],
    difficulty: "하",
    frequency: "보통",
    answerKeywords: ["클린 코드", "가독성", "코딩 원칙", "지속적 독서 계획"],
  },
  "오픈소스 소프트웨어에 대해": {
    answerStrategy:
      "오픈소스의 의의 → 본인의 관심/경험 → 참여 계획 순으로 답변.",
    sampleAnswer:
      "오픈소스는 소프트웨어 개발의 민주화라고 생각합니다. 전 세계 개발자들이 협력하여 더 나은 소프트웨어를 만드는 모델이 인상적입니다. 제가 사용하는 Python, Flask, KoNLPy 등도 모두 오픈소스입니다. 아직 직접 오픈소스 프로젝트에 기여한 경험은 없지만, GitHub에서 관심 있는 프로젝트의 이슈를 읽으며 코드 구조를 학습하고 있습니다. 대학에 가면 문서 번역이나 버그 수정부터 시작하여 오픈소스에 기여하고 싶습니다.",
    followUpQuestions: [
      {
        question: "GitHub를 어떻게 활용하고 있나요?",
        context: "개발 도구 활용 수준과 협업 경험을 확인",
      },
      {
        question: "오픈소스의 라이선스에 대해 알고 있나요?",
        context: "소프트웨어 생태계에 대한 이해 깊이를 확인",
      },
    ],
    difficulty: "중",
    frequency: "낮음",
    answerKeywords: [
      "협력",
      "GitHub",
      "기여",
      "소프트웨어 민주화",
      "코드 학습",
    ],
  },
  "데이터베이스와 자료구조의 차이점": {
    answerStrategy:
      "개념 정의 → 차이점 비교 → 실제 활용 사례의 흐름으로 구성. 본인의 프로젝트 경험과 연결.",
    sampleAnswer:
      "자료구조는 데이터를 효율적으로 저장하고 접근하기 위한 메모리 내 구조이고, 데이터베이스는 대용량 데이터를 영속적으로 저장·관리하는 시스템입니다. 예를 들어 해시 테이블은 빠른 검색을 위한 자료구조이고, MySQL은 관계형 데이터를 체계적으로 관리하는 데이터베이스입니다. 코딩 동아리에서 알고리즘 문제를 풀 때는 적절한 자료구조 선택이 성능을 좌우했고, 웹 프로젝트에서는 데이터베이스 설계가 시스템의 안정성을 결정했습니다.",
    followUpQuestions: [
      {
        question: "NoSQL과 SQL의 차이를 알고 있나요?",
        context: "데이터베이스에 대한 이해 범위와 최신 기술 관심도를 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: ["메모리", "영속성", "효율성", "관계형", "검색"],
  },
  "IT 역량을 활용해 기여한 경험": {
    answerStrategy:
      "구체적 경험 서술 → 기여한 결과 → 느낀 점의 흐름으로 구성. 공동체 의식과 기술 활용을 강조.",
    sampleAnswer:
      "2학년 때 학교 홈페이지 개선 TF팀에 참여한 경험이 있습니다. 학생들이 불편해하는 공지사항 검색 기능과 모바일 UI를 분석하고, 프로토타입을 제작하여 학교에 제안했습니다. 이 과정에서 단순히 코드를 잘 짜는 것을 넘어 사용자의 필요를 이해하고 실제로 도움이 되는 결과물을 만드는 것이 중요하다는 것을 배웠습니다. IT 기술이 공동체에 실질적인 가치를 제공할 수 있다는 확신을 갖게 된 계기였습니다.",
    followUpQuestions: [
      {
        question: "TF팀에서 어떤 역할을 맡았고, 의견 조율은 어떻게 했나요?",
        context: "팀 내 역할과 소통 능력을 심층 확인",
      },
    ],
    difficulty: "중",
    frequency: "높음",
    answerKeywords: [
      "홈페이지 개선",
      "사용자 필요",
      "프로토타입",
      "공동체 기여",
    ],
  },
  "사회적으로 어떤 문제를 해결": {
    answerStrategy:
      "관심 있는 사회 문제 제시 → IT 기술 적용 방안 → 실현 가능성과 비전 순으로 구성.",
    sampleAnswer:
      "저는 교육 격차 해소에 관심이 있습니다. 코딩 교육 봉사를 계획하면서 지역 간 IT 교육 기회의 불균형을 실감했습니다. 대학에서 AI와 교육 공학을 접목하여, 학생 개인의 수준에 맞춰 학습 경로를 추천하는 적응형 학습 플랫폼을 개발하고 싶습니다. 이를 통해 도시와 농촌, 소득 수준에 관계없이 모든 학생이 양질의 교육을 받을 수 있는 환경을 만들고 싶습니다.",
    followUpQuestions: [
      {
        question:
          "적응형 학습 플랫폼을 구현하려면 어떤 기술이 필요하다고 생각하나요?",
        context: "기술적 실현 가능성에 대한 이해와 구체적인 학업 계획을 확인",
      },
    ],
    difficulty: "중",
    frequency: "보통",
    answerKeywords: ["교육 격차", "적응형 학습", "AI", "사회적 가치", "플랫폼"],
  },
};

/** Lite: 8~10개 기본 질문 */
const interviewPrepLite: InterviewPrepSection = {
  sectionId: "interviewPrep",
  title: "예상 면접 질문",
  questions: interviewPrepStandard.questions.slice(0, 10),
};

const interviewPrepPremium: InterviewPrepSection = {
  sectionId: "interviewPrep",
  title: "예상 면접 질문 및 심화 대비",
  questions: interviewPrepStandard.questions.map((q) => {
    const key = Object.keys(INTERVIEW_PREMIUM_MAP).find((k) =>
      q.question.includes(k)
    );
    const data = key ? INTERVIEW_PREMIUM_MAP[key] : undefined;
    return {
      ...q,
      answerStrategy: data?.answerStrategy,
      sampleAnswer: data?.sampleAnswer,
      followUpQuestions: data?.followUpQuestions,
      difficulty: data?.difficulty ?? ("중" as const),
      frequency: data?.frequency ?? ("보통" as const),
      answerKeywords: data?.answerKeywords ?? [],
    };
  }),
  // v4
  questionDistribution: [
    { type: "세특기반", count: 9 },
    { type: "진로기반", count: 9 },
    { type: "인성기반", count: 7 },
    { type: "성적기반", count: 5 },
  ],
  readinessScore: 62,
};

// ─── 섹션 16: 입시 전략 + 대학 추천 ───

const MOCK_CARD = (
  uni: string,
  dept: string,
  chance: "low" | "medium" | "high" = "medium"
) => ({
  university: uni,
  department: dept,
  comprehensive: {
    admissionType: "학생부종합-일반",
    chance,
    chanceRationale:
      chance === "medium"
        ? "전공 관련 세특이 확인되나 상위권 경쟁이 치열하여 적정 수준"
        : chance === "low"
          ? "전공 적합성은 있으나 상위권 경쟁이 치열하여 도전적 지원"
          : "현재 스펙으로 안정적 합격 가능",
    chancePercentLabel:
      chance === "medium" ? "40~55%" : chance === "low" ? "30~40%" : "70~85%",
  },
  subject: {
    admissionType: "학생부교과-지역균형",
    chance:
      chance === "high"
        ? ("medium" as const)
        : chance === "medium"
          ? ("low" as const)
          : ("very_low" as const),
    chanceRationale:
      chance === "medium"
        ? "내신 등급 기준 교과전형 지원 가능 수준"
        : chance === "low"
          ? "교과 합격선과 격차가 있어 어려운 편"
          : "내신 등급이 합격선을 충족하여 안정적",
    chancePercentLabel:
      chance === "medium" ? "30~45%" : chance === "low" ? "20~30%" : "60~75%",
  },
});

const admissionStrategyLite: AdmissionStrategySection = {
  sectionId: "admissionStrategy",
  title: "입시 전략 및 대학 추천",
  recommendedPath:
    "학생부종합전형을 주력으로, 전공 적합성과 탐구 역량을 중심으로 어필하는 전략을 추천합니다.",
  simulations: [
    {
      description: "학생의 성적과 생기부를 종합 분석한 대학 추천입니다.",
      cards: [
        MOCK_CARD("연세대학교", "컴퓨터과학과", "low"),
        MOCK_CARD("고려대학교", "컴퓨터학과", "medium"),
        MOCK_CARD("성균관대학교", "소프트웨어학과", "medium"),
        MOCK_CARD("한양대학교", "컴퓨터소프트웨어학부", "medium"),
        MOCK_CARD("중앙대학교", "소프트웨어학부", "medium"),
        MOCK_CARD("건국대학교", "컴퓨터공학부", "high"),
      ],
    },
  ],
};

const admissionStrategyStandard: AdmissionStrategySection = {
  ...admissionStrategyLite,
  typeStrategies: [
    {
      type: "학종",
      analysis:
        "세특 활동의 전공 적합성이 높고, 진로 일관성이 우수하여 학종에서 가장 큰 경쟁력을 발휘할 수 있습니다.",
      suitability: "적합",
      reason:
        "컴퓨터공학 관련 세특·동아리·탐구 활동이 풍부하며, 성적 상승 추세도 긍정적",
    },
    {
      type: "교과",
      analysis:
        "내신 2.1등급은 상위권 대학 교과전형 합격선에 다소 미달하여 메인 전략으로 권장하지 않습니다.",
      suitability: "보통",
      reason:
        "서울대 교과전형 합격선 1.5등급 이내에 미달, 중상위권 대학에서는 가능성 있음",
    },
    {
      type: "논술",
      analysis:
        "논술전형은 논술 성적 비중이 높아 내신이 다소 부족해도 역전 가능성이 있으나, 논술 실력은 검증 불가하므로 보수적으로 판단합니다.",
      suitability: "보통",
      reason:
        "내신 등급이 상위권이므로 논술전형에서도 기본 경쟁력을 갖추고 있으나, 논술 실력에 따라 결과가 달라짐",
    },
  ],
  schoolTypeAnalysis: {
    cautionTypes: ["특목고", "과학고"],
    advantageTypes: ["일반고"],
    rationale:
      "일반고 출신으로 학종에서 '교육과정 내 성취'를 강조할 수 있으며, 일반고에서의 상위권 성취가 긍정적으로 평가됩니다.",
  },
};

const admissionStrategyPremium: AdmissionStrategySection = {
  ...admissionStrategyStandard,
  universityGuideMatching: [
    {
      university: "서울대학교",
      emphasisKeywords: ["자기주도성", "학업 역량"],
      studentStrengthMatch: ["자기주도성", "학업 역량"],
      studentWeaknessMatch: ["공동체 의식"],
    },
    {
      university: "연세대학교",
      emphasisKeywords: ["창의성", "도전정신", "전공 적합성"],
      studentStrengthMatch: ["전공 적합성", "도전정신"],
      studentWeaknessMatch: ["리더십"],
    },
    {
      university: "고려대학교",
      emphasisKeywords: ["학업 역량", "자기개발 역량", "전공 적합성"],
      studentStrengthMatch: ["학업 역량"],
      studentWeaknessMatch: ["인성"],
    },
  ],
};

// ─── 섹션 17: 생기부 스토리 구조 분석 ───

const storyAnalysisStandard: StoryAnalysisSection = {
  sectionId: "storyAnalysis",
  title: "생기부 스토리 구조 분석",
  mainStoryline:
    "김민수 학생의 생기부는 '코딩에 대한 호기심 → 알고리즘 탐구 역량 형성 → IT로 사회 문제를 해결하는 엔지니어로의 성장'이라는 3단계 서사 구조를 가지고 있습니다.",
  yearProgressions: [
    {
      year: 1,
      theme: "호기심과 기초 역량 형성",
      description:
        "코딩 동아리 가입, Python 기초 학습, IT 기업 탐방을 통해 컴퓨터공학에 대한 기초적 관심과 역량을 형성한 시기",
    },
    {
      year: 2,
      theme: "탐구 심화와 융합적 사고",
      description:
        "알고리즘 탐구(다익스트라), 수학-AI 융합 탐구(경사하강법), 해커톤 참가 등을 통해 전공 역량을 심화하고 융합적 사고를 보여준 시기",
    },
  ],
  careerConsistencyGrade: "A",
  careerConsistencyComment:
    "1학년부터 2학년까지 컴퓨터공학이라는 진로 방향이 일관되게 유지되며 점진적으로 심화되고 있어 진로 일관성이 우수합니다.",
};

const storyAnalysisPremium: StoryAnalysisSection = {
  ...storyAnalysisStandard,
  crossSubjectLinks: [
    {
      from: "정보",
      to: "수학Ⅱ",
      topic: "알고리즘 최적화 → 경사하강법",
      depth: "심화",
    },
    {
      from: "물리학Ⅰ",
      to: "정보",
      topic: "반도체 원리 → 컴퓨터 하드웨어",
      depth: "확장",
    },
    {
      from: "영어Ⅱ",
      to: "정보",
      topic: "실리콘밸리 문화 → IT 진로 탐색",
      depth: "반복",
    },
  ],
  storyEnhancementSuggestions: [
    "3학년에서 '사회 문제 해결형 프로젝트'를 추가하여 '기술의 사회적 가치'라는 서사 요소를 완성하세요.",
    "국어·사회 교과에서 IT 윤리, 자연어 처리 등을 탐구하여 인문-과학 융합 서사를 강화하세요.",
    "코딩 교육 봉사 활동을 통해 '나눔과 성장'이라는 서사 축을 추가하면 스토리의 깊이가 달라집니다.",
  ],
  interviewStoryGuide:
    "면접에서는 '코딩에 대한 호기심(1학년) → 알고리즘의 아름다움 발견(2학년) → IT로 세상을 바꾸고 싶은 꿈(3학년)'이라는 3단계 성장 서사로 답변을 구성하세요. 각 단계에서 구체적 에피소드를 하나씩 준비하면 됩니다.",
  // v4
  timeline: [
    {
      year: 1,
      semester: 1,
      events: [
        {
          category: "동아리",
          title: "코딩 동아리 가입, Python 기초 학습",
          competencyTags: [{ category: "career", subcategory: "전공 적합성" }],
        },
      ],
    },
    {
      year: 1,
      semester: 2,
      events: [
        {
          category: "진로",
          title: "IT 기업 탐방 (네이버)",
          competencyTags: [
            { category: "career", subcategory: "진로 탐색 활동" },
          ],
        },
      ],
    },
    {
      year: 2,
      semester: 1,
      events: [
        {
          category: "세특",
          title: "다익스트라 알고리즘 탐구 (정보)",
          competencyTags: [
            {
              category: "academic",
              subcategory: "탐구 역량",
              assessment: "우수",
            },
          ],
        },
        {
          category: "세특",
          title: "경사하강법 탐구 (수학Ⅱ)",
          competencyTags: [
            {
              category: "academic",
              subcategory: "융합 사고",
              assessment: "우수",
            },
          ],
        },
      ],
    },
    {
      year: 2,
      semester: 2,
      events: [
        {
          category: "동아리",
          title: "알고리즘 스터디 리드, 교내 해커톤 참가",
          competencyTags: [
            {
              category: "academic",
              subcategory: "탐구 역량",
              assessment: "우수",
            },
            {
              category: "community",
              subcategory: "리더십",
              assessment: "보통",
            },
          ],
        },
      ],
    },
  ],
  storyCompletenessScore: 72,
  storyGaps: [
    {
      gap: "공동체 기여 서사 부재",
      suggestion:
        "3학년에 코딩 교육 봉사, 동아리 부장 활동으로 '나눔과 리더십' 서사 추가",
      priority: "high",
    },
    {
      gap: "인문-과학 융합 서사 부족",
      suggestion:
        "국어/사회 교과에서 IT 관련 주제 탐구로 '균형 잡힌 지식인' 서사 보강",
      priority: "high",
    },
  ],
  characterLabel: {
    label: "성장하는 탐구자",
    rationale:
      "호기심에서 시작해 체계적 탐구로 발전하는 일관된 성장 궤적을 보임",
  },
};

// ─── 섹션 18: 실행 로드맵 ───

const actionRoadmapStandard: ActionRoadmapSection = {
  sectionId: "actionRoadmap",
  title: "실행 로드맵",
  completionStrategy:
    "3학년 1학기에 세특 보강(인문 교과 연계, 융합 탐구)과 공동체 활동(동아리 부장, 봉사)을 동시에 추진하여 생기부의 완성도를 높입니다.",
  phases: [
    {
      phase: "1단계: 기반 강화",
      period: "고2 겨울방학 (12월~2월)",
      goals: [
        "국어·한국사 내신 대비 학습 시작",
        "코딩 교육 봉사 기관 섭외",
        "알고리즘 대회 준비 시작",
      ],
      tasks: [
        "국어 비문학 독해 연습 (주 3회, 하루 30분)",
        "한국사 개념 정리 노트 작성",
        "코딩 교육 봉사 기관(지역 아동센터 등) 탐색 및 연락",
        "백준 온라인 저지에서 알고리즘 문제 풀이 (주 5일)",
        "3학년 1학기 세특 주제 사전 조사 및 선정",
      ],
    },
    {
      phase: "2단계: 세특 보강 + 활동 강화",
      period: "고3 1학기 (3월~7월)",
      goals: [
        "국어·사회 세특에서 IT 연계 활동 기록",
        "코딩 동아리 부장 활동",
        "교내 SW 경진대회 참가",
      ],
      tasks: [
        "국어 세특: 자연어 처리 탐구 활동 수행",
        "사회 세특: AI 윤리 에세이 작성",
        "동아리 부장으로서 신입 부원 멘토링 및 연간 활동 기획",
        "코딩 교육 봉사 (월 2회)",
        "교내 SW 경진대회 출전",
        "전 교과 세특 진로 연결 활동 확보",
      ],
    },
    {
      phase: "3단계: 지원 준비",
      period: "고3 여름 (7월~9월)",
      goals: ["자기소개서 작성", "최종 지원 대학 확정", "면접 기초 준비"],
      tasks: [
        "자기소개서 초안 작성 (7월)",
        "선생님 피드백 반영 3회 이상 수정",
        "수시 6개 대학 최종 확정",
        "면접 예상 질문 리스트 작성 시작",
      ],
    },
  ],
};

const actionRoadmapPremium: ActionRoadmapSection = {
  ...actionRoadmapStandard,
  phases: [
    ...actionRoadmapStandard.phases,
    {
      phase: "4단계: 면접 집중",
      period: "고3 가을 (10월~11월)",
      goals: ["대학별 면접 완벽 대비", "생기부 기반 심층 질문 대응력 확보"],
      tasks: [
        "서울대 면접 기출 분석 및 모의 면접 (주 2회)",
        "생기부 전 항목 예상 질문 50개 답변 준비",
        "IT 시사 이슈 주간 정리",
        "대학별 면접 특성 분석 및 맞춤 답변 전략 수립",
      ],
    },
  ],
  prewriteProposals: [
    "겨울방학 중 NLP 기초 학습 및 간단한 챗봇 프로젝트 수행",
    "알고리즘 문제 100제 풀이 기록 정리",
    "코딩 교육 봉사 커리큘럼 사전 설계",
  ],
  evaluationWritingGuide: {
    structure: [
      "1단계: 활동 동기/문제 인식 (왜 이 주제를 선택했는지)",
      "2단계: 탐구 과정/방법론 (어떻게 수행했는지, 구체적 방법)",
      "3단계: 결과 및 배움 (무엇을 알게 되었는지, 성장 포인트)",
      "4단계: 확장/연결 (다른 교과·활동과의 연결, 향후 계획)",
    ],
    goodExample:
      "다익스트라 알고리즘의 시간 복잡도가 O(V²)로 대규모 그래프에서 비효율적임을 인식하고, 우선순위 큐(힙)를 활용한 최적화 방법을 자기주도적으로 학습하여 O((V+E)logV)로 개선하는 과정을 탐구함. 이를 실제 지도 데이터에 적용하여 성능 차이를 비교 분석함.",
    badExample:
      "다익스트라 알고리즘을 배우고 프로그램을 만들어 발표함. 모둠 활동에 적극적으로 참여함.",
  },
  interviewTimeline:
    "10월 1주: 생기부 전체 검토 및 예상 질문 작성 | 10월 2~3주: 모의 면접 연습 | 10월 4주~11월: 대학별 맞춤 면접 대비",
  // v4
  milestones: [
    {
      id: "ms-1",
      title: "코딩 교육 봉사 시작",
      deadline: "2026-03-10",
      category: "공동체",
      priority: "high",
      subtasks: ["지역 아동센터 연락 및 일정 확정", "코딩 교육 커리큘럼 설계"],
      estimatedImpact: "공동체 역량 +8점 예상",
    },
    {
      id: "ms-2",
      title: "국어 세특 NLP 탐구 착수",
      deadline: "2026-04-01",
      category: "학업",
      priority: "high",
      subtasks: ["KoNLPy 라이브러리 학습", "국어 선생님과 주제 상의"],
      estimatedImpact: "학업 역량 +5점, 인문 연계 강화",
    },
  ],
  projectedOutcome: [
    { category: "학업 역량", currentScore: 82, projectedScore: 87 },
    { category: "진로 역량", currentScore: 78, projectedScore: 82 },
    { category: "공동체 역량", currentScore: 65, projectedScore: 78 },
    { category: "총점", currentScore: 225, projectedScore: 247 },
  ],
};

// ─── AI 전공 추천 ───

const majorExploration: MajorExplorationSection = {
  sectionId: "majorExploration",
  title: "AI 전공 추천",
  currentTargetAssessment:
    "서울대 컴퓨터공학과는 김민수 학생의 알고리즘 탐구 역량과 수학적 사고력에 매우 적합한 선택입니다. 다만 입학 경쟁이 치열하므로 공동체 역량 보강이 필수적입니다.",
  suggestions: [
    {
      major: "컴퓨터공학",
      university: "서울대학교",
      fitScore: 88,
      rationale:
        "알고리즘 탐구, 코딩 프로젝트, 수학 융합 활동이 컴퓨터공학 전공과 직접적으로 연결됨",
      strengthMatch: ["알고리즘 역량", "수학적 사고력", "코딩 능력"],
      gapAnalysis: "공동체 역량(리더십, 봉사)이 부족하여 보강 필요",
    },
    {
      major: "인공지능학과",
      university: "성균관대학교",
      fitScore: 85,
      rationale:
        "경사하강법 탐구, 머신러닝에 대한 관심이 AI 전공과 높은 적합도를 보임",
      strengthMatch: ["수학-AI 융합 사고", "프로그래밍 역량"],
      gapAnalysis:
        "AI 관련 심화 활동(논문 읽기, 프로젝트)이 추가되면 더욱 강력해짐",
    },
    {
      major: "데이터사이언스학과",
      fitScore: 80,
      rationale:
        "통계적 사고와 프로그래밍 역량을 결합하는 분야로, 수학과 정보 교과의 강점을 잘 활용할 수 있음",
      strengthMatch: ["수학 성적 우수", "데이터 분석 경험"],
      gapAnalysis:
        "통계학 관련 심화 학습과 실제 데이터 분석 프로젝트 경험이 필요",
    },
  ],
};

// ============================================================
// 플랜별 리포트 조합
// ============================================================

const liteMeta: ReportMeta = {
  reportId: "rpt_lite_001",
  plan: "lite",
  studentInfo: BASE_STUDENT_INFO,
  createdAt: "2026-03-03T09:00:00Z",
  version: 1,
};

const standardMeta: ReportMeta = {
  reportId: "rpt_standard_001",
  plan: "standard",
  studentInfo: BASE_STUDENT_INFO,
  createdAt: "2026-03-03T09:00:00Z",
  version: 1,
};

const premiumMeta: ReportMeta = {
  reportId: "rpt_premium_001",
  plan: "premium",
  studentInfo: BASE_STUDENT_INFO,
  createdAt: "2026-03-03T09:00:00Z",
  version: 1,
};

/** Lite 플랜 mock 리포트 (10 섹션) */
export const LITE_MOCK_REPORT: ReportContent = {
  meta: liteMeta,
  sections: [
    // Part 1: 진단
    studentProfile,
    competencyScoreLite,
    // Part 2: 분석
    academicAnalysisLite,
    courseAlignment,
    attendanceAnalysis,
    activityAnalysisLite,
    subjectAnalysisLite,
    behaviorAnalysis,
    // Part 3: 전략
    interviewPrepLite,
    majorExploration,
  ],
};

/** Standard 플랜 mock 리포트 (12 섹션) */
export const STANDARD_MOCK_REPORT: ReportContent = {
  meta: standardMeta,
  sections: [
    // Part 1: 진단
    studentProfile,
    competencyScoreStandard,
    admissionPredictionStandard,
    // Part 2: 분석
    academicAnalysisStandard,
    courseAlignment,
    attendanceAnalysis,
    activityAnalysisStandard,
    subjectAnalysisStandard,
    behaviorAnalysis,
    // Part 3: 전략
    topicRecommendationStandard,
    interviewPrepStandard,
    majorExploration,
  ],
};

/** Premium 플랜 mock 리포트 (16 섹션) */
export const PREMIUM_MOCK_REPORT: ReportContent = {
  meta: premiumMeta,
  sections: [
    // Part 1: 진단
    studentProfile,
    competencyScoreStandard,
    admissionPredictionStandard,
    // Part 2: 분석
    academicAnalysisPremium,
    courseAlignment,
    attendanceAnalysis,
    activityAnalysisPremium,
    subjectAnalysisPremium,
    behaviorAnalysis,
    // Part 3: 전략
    weaknessAnalysisPremium,
    topicRecommendationPremium,
    interviewPrepPremium,
    admissionStrategyPremium,
    storyAnalysisPremium,
    actionRoadmapPremium,
    majorExploration,
  ],
};
