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
 *
 * 가정·실과 계열 진로선택(아동발달과 부모, 식품과 영양, 가정과학 등)도
 * "기술·가정"의 진로선택 변형으로 학종 평가에서 비핵심이며, 핵심 과목과
 * 시작 글자가 겹치지 않으므로 broad 매칭이 안전하다.
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
  // 한문 변형 (교양한문, 생활과 한문, 언어생활과 한문/한자 등)
  "교양한문",
  "생활과 한문",
  "언어생활과 한문",
  "언어생활과 한자",
  // 가정·실과 진로선택 (가정과학, 가정생활 등 — "가정"으로 시작하는 핵심 과목 없음)
  "가정",
  // 가정·실과 진로선택 변형
  "아동",
  "식품",
  "의복",
  "주거",
  "패션",
  "인간발달",
  "가사",
  "보육",
  "노작",
  // 기술·가정 변형 ("기술과 가정" 같은 표기 변형)
  "기술과 가정",
  // 보건/간호 진로선택 (간호의 기초, 보건 간호, 인체 구조와 기능 등)
  "간호",
  "보건 간호", // STRICT "보건"은 다음 글자 한글이면 매칭 실패하므로 별도 추가
  "인체 구조",
  // 농림·수산·해양 진로선택
  "농업",
  "원예",
  "재배",
  "화훼",
  "조경",
  // 인쇄·출판·공예 진로선택
  "도자기",
  "공예",
  // 직업·산업·공학 진로선택 (학종 일반에서 비핵심)
  "건축",
  "기업과 경영",
  "마케팅",
  "광고",
  "로봇",
  "공학 일반",
  // 자체개발 교양·진로 모듈 (학교별 자율 과목)
  "교육의 이해",
  "성공적인 직업",
  "미래주제",
  "후마니타스",
  "글로벌 이슈",
  "인문학적",
  "인간과", // 인간과 경제생활/심리/철학 등 (사회 일반선택과 충돌 없음 — 사회 핵심은 "사회·문화", "정치와 법" 등)
  "생태와",
  "창의융합",
  "창의적 문제",
  "과제연구",
  "과학교양",
  "과학융합",
  "데이터로",
  // 사회 진로선택 중 자체개발/시민교육 모듈 (사회 핵심 일반선택과는 별개)
  "민주시민",
  "세계시민",
  "지식 재산",
  "지식재산",
];

/**
 * STRICT prefix — prefix 다음 글자가 한글이면 매칭하지 않음.
 * 같은 글자로 시작하는 핵심 과목(예: "정보처리", "정보과학")을 보호하기 위함.
 */
const STRICT_PREFIXES: readonly string[] = [
  // 기술·가정
  "기술·가정",
  "기술가정",
  "기가",
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

/**
 * 예체능 지원자일 때는 핵심으로 간주되는 과목 prefix (broad 규칙 적용).
 *
 * BROAD로 매칭해야 "체육 탐구", "스포츠 생활", "음악 연주", "미술 창작",
 * "음악 감상과 비평" 같은 변형까지 잡힌다. 핵심 과목 중 이들 prefix로
 * 시작하는 것은 없다.
 */
const ART_PE_PREFIXES: readonly string[] = [
  // 체육·예술 기본
  "체육",
  "음악",
  "미술",
  // 체육 변형 (스포츠 생활/문화/과학, 운동과 건강 등)
  "스포츠",
  "운동",
  // 예술 진로선택 변형 (드로잉/합주/비평/연극/영상 제작)
  "드로잉",
  "합주",
  "비평",
  "연극",
  "영상 제작",
];

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
  if (!isArtSportApplicant && matchesBroadAny(subjectName, ART_PE_PREFIXES)) {
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
