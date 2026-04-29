/**
 * 비주요(비핵심) 과목 분류.
 *
 * 학종/교과 평가에서 핵심 변별 과목이 아닌 보조 과목 목록.
 * - 학업에 직접적인 영향이 없고 성실도(수업 태도) 참고 정도로만 반영됨
 * - 합불 여부에 결정적 영향 없음
 *
 * 핵심 과목: 국어, 수학, 영어, 사회탐구, 과학탐구
 * 비핵심 과목: 아래 BROAD/STRICT prefix + (예체능 지원자가 아닐 때만) ART_PE_PREFIXES
 */

/**
 * BROAD prefix — prefix로 시작하면 다음 글자가 한글이어도 매칭.
 * 외국어·한문은 핵심 과목 변형 없이 다양한 파생 과목명을 가지므로 broad 매칭.
 * 예: "일본어 회화", "중국어 독해와 작문", "한문 고전 읽기" 등.
 */
const BROAD_PREFIXES: readonly string[] = [
  // 제2외국어 (회화/독해/작문 등 변형 포함)
  "일본어",
  "중국어",
  "독일어",
  "프랑스어",
  "스페인어",
  "러시아어",
  "아랍어",
  "베트남어",
  "이탈리아어",
  "라틴어",
  "포르투갈어",
  "인도네시아어",
  // 한문 (한문 고전 읽기, 한문 작문 등)
  "한문",
];

/**
 * STRICT prefix — prefix 다음 글자가 한글이면 매칭하지 않음.
 * 같은 글자로 시작하는 핵심 과목(예: "정보처리", "정보과학")을 보호하기 위함.
 */
const STRICT_PREFIXES: readonly string[] = [
  // 기술·가정
  "기술·가정",
  "기술가정",
  // 정보 — "정보처리"·"정보과학" 등은 strict 규칙으로 핵심 분류 유지
  "정보",
  // 진로와 직업
  "진로와 직업",
  "진로와직업",
  // 교양
  "교양",
  "논리학",
  "철학",
  "심리학",
  "교육학",
  "종교학",
  "보건",
  "환경",
  "실용 경제",
  "실용경제",
];

/** 예체능 지원자일 때는 핵심으로 간주되는 과목 prefix (strict 규칙 적용) */
const ART_PE_PREFIXES: readonly string[] = ["체육", "음악", "미술"];

/** 공백 정규화 후 prefix로 시작하면 매칭 (다음 글자 제약 없음). */
const isBroadPrefixMatch = (subjectName: string, prefix: string): boolean => {
  const cleanedName = subjectName.replace(/\s+/g, "");
  const cleanedPrefix = prefix.replace(/\s+/g, "");
  return cleanedName.startsWith(cleanedPrefix);
};

/** 공백 정규화 후 prefix로 시작하고, prefix 다음 글자가 한글이 아닌 경우만 매칭. */
const isStrictPrefixMatch = (subjectName: string, prefix: string): boolean => {
  const cleanedName = subjectName.replace(/\s+/g, "");
  const cleanedPrefix = prefix.replace(/\s+/g, "");
  if (!cleanedName.startsWith(cleanedPrefix)) return false;
  const after = cleanedName.slice(cleanedPrefix.length);
  // 다음 글자가 한글이면 다른 과목명일 가능성이 높음 (예: "정보처리", "정보과학")
  return after.length === 0 || !/^[가-힣]/.test(after);
};

const matchesBroadAny = (
  subjectName: string,
  prefixes: readonly string[]
): boolean => {
  for (const p of prefixes) {
    if (isBroadPrefixMatch(subjectName, p)) return true;
  }
  return false;
};

const matchesStrictAny = (
  subjectName: string,
  prefixes: readonly string[]
): boolean => {
  for (const p of prefixes) {
    if (isStrictPrefixMatch(subjectName, p)) return true;
  }
  return false;
};

/**
 * 단일 과목명이 비주요(비핵심) 과목인지 판별.
 *
 * @param subjectName 과목명 (예: "일본어Ⅰ", "일본어 회화", "기술·가정", "정보")
 * @param isArtSportApplicant 예체능 학과 지원자 여부 — true면 체육/음악/미술은 핵심으로 간주
 */
export const isNonMainSubject = (
  subjectName: string,
  isArtSportApplicant: boolean
): boolean => {
  if (!subjectName) return false;
  if (matchesBroadAny(subjectName, BROAD_PREFIXES)) return true;
  if (matchesStrictAny(subjectName, STRICT_PREFIXES)) return true;
  if (!isArtSportApplicant && matchesStrictAny(subjectName, ART_PE_PREFIXES)) {
    return true;
  }
  return false;
};

/**
 * 과목명 목록에서 비주요과목만 추출 (중복 제거, 첫 등장 순서 유지).
 *
 * @param subjectNames 과목명 배열 (중복 가능)
 * @param isArtSportApplicant 예체능 학과 지원자 여부
 * @returns 비주요과목명 배열 (중복 제거)
 */
export const collectNonMainSubjects = (
  subjectNames: readonly string[],
  isArtSportApplicant: boolean
): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of subjectNames) {
    if (!name || seen.has(name)) continue;
    if (isNonMainSubject(name, isArtSportApplicant)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
};
