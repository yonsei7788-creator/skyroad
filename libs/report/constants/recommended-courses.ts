/**
 * 2028학년도 계열별 권장 선택과목 상수
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
    math: ["미적분II", "기하"],
    science: ["물리학II", "화학II", "생명과학II"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "고려대학교",
    department: "의예과",
    math: ["미적분II", "기하"],
    science: ["물리학II", "화학II", "생명과학II"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "경희대학교",
    department: "의예과",
    math: ["미적분II"],
    science: ["물리학II", "화학II", "생명과학II"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "중앙대학교",
    department: "의예과",
    math: ["미적분II"],
    science: ["물리학II", "화학II", "생명과학II"],
    scienceCondition: "2과목 이상",
  },
  {
    university: "성균관대학교",
    department: "의예과",
    math: ["미적분II", "기하"],
    science: ["물리학II", "화학II", "생명과학II"],
    scienceCondition: "3과목",
  },
  {
    university: "한양대학교",
    department: "의예과",
    math: ["미적분II"],
    science: ["물리학II", "화학II", "생명과학II"],
    scienceCondition: "2과목 이상",
  },
];

// ─── 일반 계열별 권장과목 ───

interface MajorCourseRecommendation {
  major: string;
  coreSubjects: string[];
  recommendedCourses: string[];
}

export const MAJOR_COURSE_RECOMMENDATIONS: MajorCourseRecommendation[] = [
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
      "미적분I",
      "세계지리",
      "윤리와 사상",
    ],
  },
  {
    major: "경영경제",
    coreSubjects: ["수학", "사회"],
    recommendedCourses: [
      "미적분I",
      "확률과 통계",
      "경제",
      "미적분II",
      "사회문화",
      "정치와 법",
    ],
  },
  {
    major: "자연과학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분II",
      "기하",
      "확률과 통계",
      "물리학II",
      "화학II",
      "생명과학II",
      "지구과학II",
    ],
  },
  {
    major: "공학",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분II",
      "기하",
      "물리학II",
      "화학II",
      "지구과학II",
      "정보",
      "프로그래밍",
    ],
  },
  {
    major: "컴퓨터AI",
    coreSubjects: ["수학", "정보"],
    recommendedCourses: [
      "미적분II",
      "기하",
      "확률과 통계",
      "정보",
      "프로그래밍",
      "인공지능 기초",
      "물리학II",
    ],
  },
  {
    major: "화학재료",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: ["미적분II", "화학II", "물리학II", "기하"],
  },
  {
    major: "생명바이오",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분II",
      "생명과학II",
      "화학II",
      "확률과 통계",
      "생태와 환경",
    ],
  },
  {
    major: "간호보건",
    coreSubjects: ["과학"],
    recommendedCourses: [
      "생명과학II",
      "화학II",
      "미적분I",
      "확률과 통계",
      "사회문화",
      "윤리와 사상",
    ],
  },
  {
    major: "지구과학환경",
    coreSubjects: ["수학", "과학"],
    recommendedCourses: [
      "미적분II",
      "지구과학II",
      "물리학II",
      "화학II",
      "생태와 환경",
    ],
  },
];

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
