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

export const MEDICAL_COURSE_REQUIREMENTS: MedicalCourseRequirement[] = [
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
];

// ─── 2022 개정 교육과정 (고1·고2, grade <= 2) ───

export const MAJOR_COURSE_RECOMMENDATIONS_2022: MajorCourseRecommendation[] = [
  {
    major: "인문",
    coreSubjects: ["국어", "영어", "사회"],
    recommendedCourses: [
      "화법과 언어",
      "독서와 작문",
      "문학과 매체",
      "윤리와 사상",
      "한국지리",
      "세계지리",
      "동아시아사",
      "세계사",
    ],
  },
  {
    major: "사회과학",
    coreSubjects: ["사회", "수학"],
    recommendedCourses: [
      "정치와 법",
      "사회문화",
      "경제",
      "확률과 통계",
      "미적분Ⅰ",
      "세계지리",
      "윤리와 사상",
    ],
  },
  {
    major: "경영경제",
    coreSubjects: ["수학", "사회"],
    recommendedCourses: [
      "미적분Ⅰ",
      "확률과 통계",
      "경제",
      "미적분Ⅱ",
      "사회문화",
      "정치와 법",
    ],
  },
  {
    major: "자연과학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "기하",
      "확률과 통계",
      "물리학",
      "화학",
      "생명과학",
      "지구과학",
    ],
  },
  {
    major: "공학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "기하",
      "물리학",
      "역학과 에너지",
      "전자기와 양자",
      "정보",
      "프로그래밍",
    ],
  },
  {
    major: "컴퓨터AI",
    coreSubjects: ["수학", "정보"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "기하",
      "인공지능 수학",
      "정보",
      "프로그래밍",
      "확률과 통계",
    ],
  },
  {
    major: "의학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "화학",
      "생명과학",
      "세포와 물질대사",
      "화학 반응의 세계",
      "확률과 통계",
      "물리학",
    ],
  },
  {
    major: "약학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "화학",
      "화학 반응의 세계",
      "생명과학",
      "세포와 물질대사",
      "확률과 통계",
      "기하",
      "물리학",
    ],
  },
  {
    major: "간호보건",
    coreSubjects: ["과학"],
    recommendedCourses: [
      "생명과학",
      "세포와 물질대사",
      "화학",
      "미적분Ⅰ",
      "확률과 통계",
      "사회문화",
      "윤리와 사상",
    ],
  },
  {
    major: "생명바이오",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "생명과학",
      "세포와 물질대사",
      "화학",
      "화학 반응의 세계",
      "확률과 통계",
    ],
  },
  {
    major: "화학재료",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "화학",
      "화학 반응의 세계",
      "물리학",
      "기하",
    ],
  },
  {
    major: "지구과학환경",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분Ⅰ",
      "미적분Ⅱ",
      "지구과학",
      "행성우주과학",
      "물리학",
      "화학",
      "생태와 환경",
    ],
  },
];

// ─── 교육과정 버전 선택 헬퍼 ───

/**
 * 학년에 따라 적절한 교육과정 버전의 권장과목 목록을 반환한다.
 * - grade >= 3 → 2015 개정 교육과정 (고3/졸업생)
 * - grade <= 2 → 2022 개정 교육과정 (고1·고2)
 */
export const getMajorCourseRecommendations = (
  grade: number
): MajorCourseRecommendation[] =>
  grade >= 3
    ? MAJOR_COURSE_RECOMMENDATIONS_2015
    : MAJOR_COURSE_RECOMMENDATIONS_2022;

// ─── 하위 호환용 (deprecated) ───

/** @deprecated getMajorCourseRecommendations(grade)를 사용하세요. */
export const MAJOR_COURSE_RECOMMENDATIONS = MAJOR_COURSE_RECOMMENDATIONS_2022;

// ─── 계열 매칭 유틸리티 타입 ───

/**
 * Phase 1 전처리에서 학생의 목표 계열에 매칭한 결과.
 * AI 프롬프트에 `{recommendedCourseMatch}` 자리표시자로 전달된다.
 */
export interface RecommendedCourseMatch {
  targetMajor: string;
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
