/**
 * 과목명 오타 보정 맵.
 *
 * PDF 파싱(Gemini OCR) 시 빈번하게 발생하는 과목명 오타를 정규화한다.
 * - 입력 단계: app/api/records/parse/route.ts (DB 저장 전 보정)
 * - 출력 단계: libs/report/pipeline/preprocessor.ts (리포트 생성 시 보정)
 *
 * 키: 오타 과목명 (정확히 일치해야 함)
 * 값: 올바른 과목명
 */
export const SUBJECT_NAME_CORRECTIONS: Record<string, string> = {
  // 통합과학 오타 (ㅌ↔ㄷ 혼동)
  동합과학1: "통합과학1",
  동합과학2: "통합과학2",
  "동합과학1·동합과학2": "통합과학1·통합과학2",

  // 공통수학 오타 (공통↔공등, 공동)
  공등수학1: "공통수학1",
  공등수학2: "공통수학2",
  공동수학1: "공통수학1",
  // 공통수학2는 이미 올바름

  // 공통국어 오타 (공통↔공동)
  공동국어1: "공통국어1",
  공동국어2: "공통국어2",

  // 공통영어 오타 (공통↔공동) — 2022 교육과정 공통영어
  공동영어1: "공통영어1",
  공동영어2: "공통영어2",

  // 세특 합본 과목명 오타
  "공등수학1·공동수학2": "공통수학1·공통수학2",
  "공통국어1·공동국어2": "공통국어1·공통국어2",
  "공동영어1·공동영어2": "공통영어1·공통영어2",

  // 진로선택 과목명 오타
  "생애 설계와 자림": "생애 설계와 자립",
  생애설계와자림: "생애설계와자립",
  "생애 설계와 자림립": "생애 설계와 자립",
};

/**
 * 과목명 보정 함수.
 * SUBJECT_NAME_CORRECTIONS 맵에 해당하면 올바른 이름으로 변환.
 */
export const correctSubjectName = (name: string): string => {
  return SUBJECT_NAME_CORRECTIONS[name] ?? name;
};

/**
 * AI 생성 텍스트 내 과목명 치환 맵.
 * AI가 2015 교육과정 과목명이나 약칭을 사용할 때 2022 교육과정 정식 명칭으로 보정.
 * 키: 잘못된 표현 (정규식 패턴이 아닌 문자열)
 * 값: 올바른 표현
 */
export const AI_TEXT_SUBJECT_CORRECTIONS: [string, string][] = [
  // 2015 → 2022 과목명 변환
  ["사회문화", "사회와 문화"],
  ["사회·문화", "사회와 문화"],
  ["정치와법", "정치"],
  ["정치와 법", "정치"],
  // 약칭 → 정식 명칭
  ["생활윤리", "생활과 윤리"],
  ["윤리사상", "윤리와 사상"],
];

/**
 * AI 생성 텍스트 내 과목명을 2022 교육과정 정식 명칭으로 보정.
 * 5등급제(2022 교육과정) 학생의 리포트에서만 사용.
 */
export const correctSubjectNamesInText = (text: string): string => {
  let result = text;
  for (const [wrong, correct] of AI_TEXT_SUBJECT_CORRECTIONS) {
    // 이미 올바른 이름의 일부가 아닌 경우에만 치환
    // 예: "사회와 문화"에 포함된 "사회문화"를 또 치환하면 안 됨
    result = result.split(wrong).join(correct);
  }
  return result;
};
