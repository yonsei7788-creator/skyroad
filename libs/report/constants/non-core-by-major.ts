/**
 * 학과 카테고리(majorGroup)별 "진로 무관 핵심 과목" 분류.
 *
 * 비주요 과목(non-main-subjects.ts)은 모든 학생 공통으로 약점 분석에서 제외되지만,
 * 핵심 과목 중에서도 학생 진로(majorGroup)와 무관한 영역은 약점으로 거론하지
 * 않는 것이 사용자 의도(예: 전기전자공학 학생에게 독서·문학·세계사 등을
 * 약점으로 거론하면 진로와 무관한 평가).
 *
 * 핵심 과목 중 진로 무관 영역으로 분류된 것은 분석용 데이터(subjectStats /
 * gradeVariance / rawAcademicDataText)에서 제외하여 AI가 거론할 수 없게 만든다.
 *
 * 적용 대상은 majorGroup이 자연·공학·의학 계열인 학생부터(사용자 명시 케이스).
 * 인문·사회·예체능은 정책 결정 시 확장 가능한 구조로 둔다.
 */

/** 자연·공학·의학 계열로 묶이는 majorGroup (major-evaluation-criteria.ts의 majorGroup 값). */
const NATURAL_LIKE_GROUPS: ReadonlySet<string> = new Set([
  "의생명",
  "약학",
  "생명과학",
  "바이오",
  "공학",
  "컴퓨터AI",
  "자연과학",
  "간호보건",
]);

/**
 * 자연·공학·의학 계열에서 약점 분석 대상이 아닌 핵심 과목 prefix.
 * - 국어 일반선택(독서/문학/화법과 작문/언어와 매체/심화 국어): 진로 무관
 * - 사회 일반선택(세계사/세계지리/한국지리/동아시아사/사회·문화/정치와 법/경제/
 *   윤리와 사상/생활과 윤리/여행지리/사회문제 탐구): 진로 무관
 *
 * 1학년 통합국어("국어")·통합사회·통합과학·한국사는 모든 학생 공통 평가 영역이므로
 * 여기 포함하지 않음. 수학·과학·영어·정보처리 등도 자연·공학·의학 핵심이므로 제외 X.
 */
const NATURAL_LIKE_NON_CORE_PREFIXES: readonly string[] = [
  // 국어 일반선택
  "독서",
  "문학",
  "화법과 작문",
  "화법",
  "작문",
  "언어와 매체",
  "심화 국어",
  // 사회 일반선택
  "세계사",
  "세계지리",
  "동아시아사",
  "한국지리",
  "사회·문화",
  "사회와 문화",
  "정치와 법",
  "경제",
  "윤리와 사상",
  "생활과 윤리",
  "여행지리",
  "사회문제 탐구",
];

/**
 * Broad prefix 매칭 — prefix로 시작하면 다음 글자가 한글이어도 매칭.
 * "독서와 토론", "문학사" 같은 변형까지 포함하기 위함.
 */
const isBroadPrefixMatch = (subjectName: string, prefix: string): boolean => {
  const cleanedName = subjectName.replace(/\s+/g, "");
  const cleanedPrefix = prefix.replace(/\s+/g, "");
  return cleanedName.startsWith(cleanedPrefix);
};

const matchesAny = (
  subjectName: string,
  prefixes: readonly string[]
): boolean => {
  for (const p of prefixes) {
    if (isBroadPrefixMatch(subjectName, p)) return true;
  }
  return false;
};

/**
 * 학과 카테고리(majorGroup) 기준 "진로 무관 핵심 과목" 여부.
 *
 * @param subjectName 과목명
 * @param majorGroup major-evaluation-criteria.ts의 majorGroup 값
 * @returns 진로 무관 핵심 과목이면 true (= 분석 대상에서 제외)
 */
export const isNonCoreForMajor = (
  subjectName: string,
  majorGroup: string | undefined
): boolean => {
  if (!subjectName || !majorGroup) return false;
  if (NATURAL_LIKE_GROUPS.has(majorGroup)) {
    return matchesAny(subjectName, NATURAL_LIKE_NON_CORE_PREFIXES);
  }
  // 인문·사회·예체능은 별도 정책 필요 시 확장 (현재는 false — 약점 분석 대상 유지)
  return false;
};
