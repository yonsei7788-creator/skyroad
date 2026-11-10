// ============================================================
// 정시 입력 폼 선택지 상수
//
// libs/jeongsi/types.ts 의 유니온 타입을 런타임 배열로 옮긴 것.
// `satisfies readonly T[]` 로 타입과 배열이 어긋나면 컴파일 에러가 난다.
// ============================================================

import type {
  ExamYear,
  InquirySubject,
  KoreanElective,
  MathElective,
  PreferredRegion,
  RiskAppetite,
  ScienceInquirySubject,
  SocialInquirySubject,
  SuneungGrade,
} from "@/libs/jeongsi/types";

/** 수능 응시연도. 현재는 2026년(2027학년도 정시) 단일 */
export const EXAM_YEAR_OPTIONS = [2026] as const satisfies readonly ExamYear[];

export const DEFAULT_EXAM_YEAR: ExamYear = 2026;

export const KOREAN_ELECTIVE_OPTIONS = [
  "화법과작문",
  "언어와매체",
] as const satisfies readonly KoreanElective[];

export const MATH_ELECTIVE_OPTIONS = [
  "확률과통계",
  "미적분",
  "기하",
] as const satisfies readonly MathElective[];

export const SOCIAL_INQUIRY_OPTIONS = [
  "생활과윤리",
  "윤리와사상",
  "한국지리",
  "세계지리",
  "동아시아사",
  "세계사",
  "경제",
  "정치와법",
  "사회문화",
] as const satisfies readonly SocialInquirySubject[];

export const SCIENCE_INQUIRY_OPTIONS = [
  "물리학I",
  "화학I",
  "생명과학I",
  "지구과학I",
  "물리학II",
  "화학II",
  "생명과학II",
  "지구과학II",
] as const satisfies readonly ScienceInquirySubject[];

export const INQUIRY_SUBJECT_OPTIONS = [
  ...SOCIAL_INQUIRY_OPTIONS,
  ...SCIENCE_INQUIRY_OPTIONS,
] as const satisfies readonly InquirySubject[];

export const PREFERRED_REGION_OPTIONS = [
  "서울",
  "수도권",
  "전국",
] as const satisfies readonly PreferredRegion[];

export const RISK_APPETITE_OPTIONS = [
  "안정",
  "균형",
  "공격",
] as const satisfies readonly RiskAppetite[];

/** 지원 성향별 설명. 선택 버튼 아래 보조 문구로 사용 */
export const RISK_APPETITE_DESCRIPTION: Record<RiskAppetite, string> = {
  안정: "합격 확률을 최우선으로 조합합니다.",
  균형: "안정과 상향을 고르게 섞습니다.",
  공격: "상향 지원 비중을 높게 잡습니다.",
};

// ─── 점수 입력 범위 ───

/** 국어·수학 표준점수 상한 */
export const MAX_MAIN_STANDARD_SCORE = 150;

/** 탐구 표준점수 상한 */
export const MAX_INQUIRY_STANDARD_SCORE = 100;

export const MAX_PERCENTILE = 100;

/** 수능 등급 1~9. 영어·한국사 선택지와 검증이 공유하는 단일 출처 */
export const SUNEUNG_GRADE_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const satisfies readonly SuneungGrade[];

export const [MIN_GRADE] = SUNEUNG_GRADE_OPTIONS;

export const MAX_GRADE =
  SUNEUNG_GRADE_OPTIONS[SUNEUNG_GRADE_OPTIONS.length - 1];

/**
 * 표준점수와 백분위의 정합성 경고 기준 (백분위 포인트).
 *
 * 표준점수 분포를 정규분포로 보고 기대 백분위를 추정한 뒤,
 * 실제 입력 백분위와 이 값 이상 벌어지면 입력 실수일 가능성이 높다고
 * 보고 경고만 띄운다. (제출을 차단하지는 않는다)
 */
export const SCORE_MISMATCH_WARNING_THRESHOLD = 20;

/** 국어·수학 표준점수 분포 (평균 100, 표준편차 20) */
export const MAIN_SCORE_DISTRIBUTION = { mean: 100, deviation: 20 } as const;

/** 탐구 표준점수 분포 (평균 50, 표준편차 10) */
export const INQUIRY_SCORE_DISTRIBUTION = { mean: 50, deviation: 10 } as const;
