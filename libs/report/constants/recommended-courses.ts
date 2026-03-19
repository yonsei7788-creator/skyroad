/**
 * 계열별 권장 선택과목 상수 (교육과정 버전별 분리)
 *
 * - 2015 개정 교육과정: 고3/졸업생 (grade >= 3)
 * - 2022 개정 교육과정: 고1·고2 (grade <= 2)
 *
 * AI 프롬프트 Phase 1 전처리에서 학생의 목표 계열/학과에 매칭하여
 * 권장과목 이수 여부를 판단하는 데 사용한다.
 *
 * @see require/recommended-courses-by-major.md - 상세 참조 문서
 */

// ─── 메디컬 계열: 대학별 상세 ───

interface MedicalCourseRequirement {
  university: string;
  department: string;
  math: string[];
  science: string[];
  scienceCondition: string;
}

// ─── 2015 개정 교육과정 메디컬 요구사항 (고3/졸업생) ───

export const MEDICAL_COURSE_REQUIREMENTS_2015: MedicalCourseRequirement[] = [
  {
    university: "서울대학교",
    department: "의예과",
    math: ["미적분", "기하"],
    science: ["물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "고려대학교",
    department: "의예과",
    math: ["미적분", "기하"],
    science: ["물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "경희대학교",
    department: "의예과",
    math: ["미적분"],
    science: ["물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "중앙대학교",
    department: "의예과",
    math: ["미적분"],
    science: ["물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "성균관대학교",
    department: "의예과",
    math: ["미적분", "기하"],
    science: ["물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ"],
    scienceCondition: "3과목",
  },
  {
    university: "한양대학교",
    department: "의예과",
    math: ["미적분"],
    science: ["물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ"],
    scienceCondition: "2과목 이상",
  },
];

// ─── 2022 개정 교육과정 메디컬 요구사항 (고1·고2, 5등급제) ───

export const MEDICAL_COURSE_REQUIREMENTS_2022: MedicalCourseRequirement[] = [
  // ─── 의대 ───
  {
    university: "서울대학교",
    department: "의예과",
    math: ["기하", "미적분Ⅱ"],
    science: ["생명과학", "세포와 물질대사", "생물의 유전"],
    scienceCondition:
      "생명과학 + 진로선택 3과목 이상 (세포와 물질대사, 생물의 유전 포함)",
  },
  {
    university: "고려대학교",
    department: "의예과",
    math: ["미적분Ⅱ"],
    science: [
      "물질과 에너지",
      "화학 반응의 세계",
      "세포와 물질대사",
      "생물의 유전",
    ],
    scienceCondition: "2과목 이상",
  },
  {
    university: "경희대학교",
    department: "의예과",
    math: ["대수", "미적분Ⅰ", "미적분Ⅱ", "확률과 통계"],
    science: [
      "물리학",
      "화학",
      "생명과학",
      "물질과 에너지",
      "세포와 물질대사",
      "생물의 유전",
      "화학 반응의 세계",
    ],
    scienceCondition: "3과목",
  },
  {
    university: "중앙대학교",
    department: "의예과",
    math: ["미적분Ⅱ", "기하"],
    science: [
      "생명과학",
      "화학",
      "물질과 에너지",
      "화학 반응의 세계",
      "세포와 물질대사",
      "생물의 유전",
    ],
    scienceCondition: "3과목 이상",
  },
  {
    university: "성균관대학교",
    department: "의예과",
    math: [],
    science: [],
    scienceCondition: "별도 요건 미공시",
  },
  {
    university: "한양대학교",
    department: "의예과",
    math: ["기하", "미적분Ⅱ"],
    science: ["물리학", "화학", "생명과학"],
    scienceCondition: "1과목 이상 + 진로선택 2과목 이상",
  },
  // ─── 치대 ───
  {
    university: "서울대학교",
    department: "치의예과",
    math: ["기하", "미적분Ⅱ"],
    science: [],
    scienceCondition: "진로선택 3과목 이상",
  },
  {
    university: "경희대학교",
    department: "치의예과",
    math: ["대수", "미적분Ⅰ", "미적분Ⅱ", "확률과 통계"],
    science: [
      "물리학",
      "화학",
      "생명과학",
      "세포와 물질대사",
      "생물의 유전",
      "물질과 에너지",
      "화학 반응의 세계",
    ],
    scienceCondition: "3과목",
  },
  // ─── 한의대 ───
  {
    university: "경희대학교",
    department: "한의예과",
    math: ["대수", "미적분Ⅰ", "미적분Ⅱ", "확률과 통계"],
    science: [
      "물리학",
      "화학",
      "생명과학",
      "세포와 물질대사",
      "생물의 유전",
      "물질과 에너지",
      "화학 반응의 세계",
    ],
    scienceCondition: "3과목",
  },
  // ─── 약대 ───
  {
    university: "경희대학교",
    department: "약학과",
    math: ["대수", "미적분Ⅰ", "미적분Ⅱ", "확률과 통계"],
    science: [
      "물리학",
      "화학",
      "생명과학",
      "물질과 에너지",
      "세포와 물질대사",
      "생물의 유전",
      "화학 반응의 세계",
    ],
    scienceCondition: "3과목",
  },
  {
    university: "서울대학교",
    department: "약학과",
    math: ["기하", "미적분Ⅱ"],
    science: ["화학", "생명과학"],
    scienceCondition: "화학 또는 생명과학 + 진로선택 3과목 이상",
  },
  {
    university: "중앙대학교",
    department: "약학과",
    math: ["기하", "미적분Ⅱ"],
    science: [
      "생명과학",
      "화학",
      "물질과 에너지",
      "화학 반응의 세계",
      "세포와 물질대사",
      "생물의 유전",
    ],
    scienceCondition: "3과목 이상",
  },
  {
    university: "성균관대학교",
    department: "약학과",
    math: [],
    science: [],
    scienceCondition: "별도 요건 미공시",
  },
  // ─── 수의대 ───
  {
    university: "서울대학교",
    department: "수의예과",
    math: ["기하", "미적분Ⅱ"],
    science: [],
    scienceCondition: "진로선택 3과목 이상",
  },
];

/** 학년에 따라 적절한 메디컬 요구사항을 반환 */
export const getMedicalCourseRequirements = (
  grade: number
): MedicalCourseRequirement[] =>
  grade >= 3
    ? MEDICAL_COURSE_REQUIREMENTS_2015
    : MEDICAL_COURSE_REQUIREMENTS_2022;

/** @deprecated getMedicalCourseRequirements(grade)를 사용하세요. */
export const MEDICAL_COURSE_REQUIREMENTS = MEDICAL_COURSE_REQUIREMENTS_2015;

// ─── 일반 계열별 권장과목 ───

interface MajorCourseRecommendation {
  major: string;
  coreSubjects: string[];
  recommendedCourses: string[];
}

// ─── 2015 개정 교육과정 (고3/졸업생, grade >= 3) ───

export const MAJOR_COURSE_RECOMMENDATIONS_2015: MajorCourseRecommendation[] = [
  {
    major: "인문",
    coreSubjects: ["국어", "영어", "사회"],
    recommendedCourses: [
      "세계사",
      "동아시아사",
      "한국지리",
      "세계지리",
      "윤리와 사상",
    ],
  },
  {
    major: "사회과학",
    coreSubjects: ["사회"],
    recommendedCourses: [
      "세계사",
      "경제",
      "정치와 법",
      "사회·문화",
      "사회문제 탐구",
    ],
  },
  {
    major: "경영경제",
    coreSubjects: ["수학"],
    recommendedCourses: ["미적분", "확률과 통계", "경제 수학", "경제"],
  },
  {
    major: "자연과학",
    coreSubjects: ["수학"],
    recommendedCourses: ["수학Ⅰ", "수학Ⅱ", "미적분", "기하", "확률과 통계"],
  },
  {
    major: "공학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "기하",
      "물리학Ⅰ",
      "물리학Ⅱ",
      "화학Ⅰ",
      "확률과 통계",
      "화학Ⅱ",
    ],
  },
  {
    major: "컴퓨터AI",
    coreSubjects: ["수학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "기하",
      "확률과 통계",
      "인공지능 수학",
    ],
  },
  {
    major: "의학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "화학Ⅰ",
      "생명과학Ⅰ",
      "생명과학Ⅱ",
      "확률과 통계",
      "물리학Ⅰ",
      "화학Ⅱ",
    ],
  },
  {
    major: "약학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "화학Ⅰ",
      "화학Ⅱ",
      "생명과학Ⅰ",
      "생명과학Ⅱ",
      "확률과 통계",
      "기하",
      "물리학Ⅰ",
    ],
  },
  {
    major: "간호보건",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "확률과 통계",
      "생명과학Ⅰ",
      "생명과학Ⅱ",
      "미적분",
      "화학Ⅰ",
      "화학Ⅱ",
    ],
  },
  {
    major: "생명바이오",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "화학Ⅰ",
      "생명과학Ⅰ",
      "생명과학Ⅱ",
      "미적분",
      "확률과 통계",
      "화학Ⅱ",
    ],
  },
  {
    major: "화학재료",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "물리학Ⅰ",
      "화학Ⅰ",
      "화학Ⅱ",
      "확률과 통계",
      "기하",
      "물리학Ⅱ",
    ],
  },
  {
    major: "지구과학환경",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "물리학Ⅰ",
      "지구과학Ⅰ",
      "지구과학Ⅱ",
      "확률과 통계",
      "기하",
      "화학Ⅰ",
      "물리학Ⅱ",
    ],
  },
  {
    major: "교육",
    coreSubjects: ["국어", "영어", "사회"],
    recommendedCourses: [
      "윤리와 사상",
      "사회·문화",
      "확률과 통계",
      "세계사",
      "생활과 윤리",
    ],
  },
  {
    major: "예체능",
    coreSubjects: ["국어", "영어"],
    recommendedCourses: ["국어", "영어", "사회·문화", "생활과 윤리", "한국사"],
  },
  {
    major: "예체능교육",
    coreSubjects: ["국어", "영어", "사회"],
    recommendedCourses: [
      "국어",
      "영어",
      "사회·문화",
      "생활과 윤리",
      "한국사",
      "윤리와 사상",
    ],
  },
];

// ─── 2022 개정 교육과정 (고1·고2, grade <= 2) ───

export const MAJOR_COURSE_RECOMMENDATIONS_2022: MajorCourseRecommendation[] = [
  {
    major: "인문",
    coreSubjects: ["국어", "영어", "사회"],
    recommendedCourses: [
      "사회와 문화",
      "정치",
      "법과 사회",
      "경제",
      "세계사",
      "윤리와 사상",
      "한국지리 탐구",
      "세계시민과 지리",
      "제2외국어",
    ],
  },
  {
    major: "사회과학",
    coreSubjects: ["국어", "영어", "사회", "수학"],
    recommendedCourses: [
      "정치",
      "법과 사회",
      "경제",
      "사회와 문화",
      "세계시민과 지리",
    ],
  },
  {
    major: "경영경제",
    coreSubjects: ["수학", "영어"],
    recommendedCourses: ["확률과 통계", "미적분Ⅰ", "경제"],
  },
  {
    major: "자연과학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: ["미적분Ⅱ", "기하", "물리학", "화학", "생명과학"],
  },
  {
    major: "공학",
    coreSubjects: ["수학", "물리"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "기하",
      "물리학",
      "역학과 에너지",
      "전자기와 양자",
    ],
  },
  {
    major: "컴퓨터AI",
    coreSubjects: ["수학"],
    recommendedCourses: ["미적분Ⅰ", "미적분Ⅱ", "기하", "인공지능 수학"],
  },
  {
    major: "의학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅱ",
      "기하",
      "화학",
      "생명과학",
      "세포와 물질대사",
      "생물의 유전",
      "화학 반응의 세계",
      "물질과 에너지",
    ],
  },
  {
    major: "약학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅱ",
      "기하",
      "화학",
      "화학 반응의 세계",
      "생명과학",
      "세포와 물질대사",
      "생물의 유전",
      "물질과 에너지",
    ],
  },
  {
    major: "간호보건",
    coreSubjects: ["생명과학", "화학"],
    recommendedCourses: ["세포와 물질대사", "생물의 유전"],
  },
  {
    major: "생명바이오",
    coreSubjects: ["화학", "생명과학"],
    recommendedCourses: ["세포와 물질대사", "생물의 유전"],
  },
  {
    major: "화학재료",
    coreSubjects: ["수학", "화학"],
    recommendedCourses: ["물질과 에너지", "화학 반응의 세계"],
  },
  {
    major: "지구과학환경",
    coreSubjects: ["물리", "지구과학"],
    recommendedCourses: ["지구시스템과학", "행성우주과학"],
  },
  {
    major: "교육",
    coreSubjects: ["국어", "영어", "사회"],
    recommendedCourses: ["사회와 문화", "윤리와 사상", "확률과 통계", "세계사"],
  },
  {
    major: "예체능",
    coreSubjects: ["국어", "영어"],
    recommendedCourses: ["사회와 문화", "윤리와 사상"],
  },
  {
    major: "예체능교육",
    coreSubjects: ["국어", "영어", "사회"],
    recommendedCourses: ["사회와 문화", "윤리와 사상", "확률과 통계", "세계사"],
  },
];

// ─── 교육과정 버전 선택 헬퍼 ───

/**
 * 교육과정 버전에 따라 적절한 권장과목 목록을 반환한다.
 * - curriculumVersion 우선 사용 (생기부 데이터 기반 정확한 판별)
 * - curriculumVersion이 없으면 grade 기반 폴백 (하위 호환)
 */
export const getMajorCourseRecommendations = (
  grade: number,
  curriculumVersion?: "2015" | "2022"
): MajorCourseRecommendation[] => {
  if (curriculumVersion) {
    return curriculumVersion === "2015"
      ? MAJOR_COURSE_RECOMMENDATIONS_2015
      : MAJOR_COURSE_RECOMMENDATIONS_2022;
  }
  return grade >= 3
    ? MAJOR_COURSE_RECOMMENDATIONS_2015
    : MAJOR_COURSE_RECOMMENDATIONS_2022;
};

// ─── 하위 호환용 (deprecated) ───

/** @deprecated getMajorCourseRecommendations(grade)를 사용하세요. */
export const MAJOR_COURSE_RECOMMENDATIONS = MAJOR_COURSE_RECOMMENDATIONS_2022;

// ─── 계열 매칭 유틸리티 타입 ───

/**
 * Phase 1 전처리에서 학생의 목표 계열에 매칭한 결과.
 * AI 프롬프트에 `{recommendedCourseMatch}` 자리표시자로 전달된다.
 */
export interface RecommendedCourseMatch {
  /** 희망학과 기반 참고용 계열 (AI 출력의 targetMajor에 사용 금지) */
  _referenceTargetMajor: string;
  requiredCourses: string[];
  takenCourses: string[];
  missingCourses: string[];
  matchRate: number;
  isCompleted: boolean;
}

// ─── 메디컬 계열 판별 ───

const MEDICAL_MAJORS = [
  "의예",
  "의학",
  "치의예",
  "치의학",
  "한의예",
  "한의학",
  "약학",
  "수의예",
  "수의학",
];

export const isMedicalMajor = (major: string): boolean =>
  MEDICAL_MAJORS.some((m) => major.includes(m));
