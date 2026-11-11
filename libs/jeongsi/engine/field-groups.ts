// ============================================================
// 계열그룹 — category 를 묶는 단위
//
// category 완전일치로만 후보를 뽑으면 추천 9개(3밴드 x 3개)를
// 채우지 못하는 희망 학과가 많아 밴드가 빈다. 그래서 후보 풀을
// 계열그룹 → 대계열 순으로 단계 확대한다.
//
// 🔴 시행계획(data/admission-plans-2027.json)에 나오는 category 는
// 반드시 정확히 한 그룹에 속해야 한다. 그룹이 없으면 확대 단계에서
// 후보로 잡히지 않는다. 데이터를 다시 만들면 field-groups.test.ts 가
// 빠진 category 를 알려준다.
//
// 근거: specs/013-jeongsi-domain-rules.md §6.1-b, §6.1-c
// ============================================================

export type FieldGroupName =
  | "경상"
  | "사회"
  | "인문"
  | "교육"
  | "컴퓨터·IT"
  | "전기전자"
  | "기계·건설"
  | "화학·생명"
  | "수리·자연"
  | "의약"
  | "보건"
  | "예체능·디자인"
  | "계열무관";

/** 계열그룹별 category 목록 */
export const FIELD_GROUPS: Record<FieldGroupName, readonly string[]> = {
  경상: [
    "경영학",
    "경제학",
    "회계학",
    "무역학",
    "국제통상학",
    "행정학",
    "관광학",
    "호텔경영학",
    "금융학",
    "보험학",
    "세무학",
    "물류학",
    "해운경영",
    "글로벌비즈니스",
    "기술경영학",
    "상경",
    "부동산학",
    "농경제사회",
    "Language&Trade",
    "외식경영학",
    "융합경영",
    "창업",
    "유통마케팅",
    "항공교통물류학",
  ],
  사회: [
    "사회학",
    "정치학",
    "심리학",
    "사회복지학",
    "언론학",
    "미디어학",
    "광고홍보학",
    "국제학",
    "Language&Diplomacy",
    "법학",
    "지리학",
    "아동학",
    "소비자학",
    "가족학",
    "상담학",
    "경찰학",
    "공공안전",
    "공공인재",
    "국제관계학",
    "산업심리학",
    "리더십과조직과학",
    "휴먼서비스",
    "도시계획학",
    "도시학",
    "디지털미디어",
    "커뮤니케이션학",
    "노인복지학",
    "경호학",
    "군사학",
    "법·경찰",
  ],
  인문: [
    "국어국문학",
    "영어영문학",
    "불어불문학",
    "중국학",
    "철학",
    "역사학",
    "인문학",
    "중어중문학",
    "독어독문학",
    "일어일문학",
    "러시아어문학",
    "스페인어문학",
    "이탈리아어문학",
    "포르투갈어문학",
    "네덜란드어문학",
    "스칸디나비아어문학",
    "아랍어문학",
    "한문학",
    "언어학",
    "한국어학",
    "일본학",
    "러시아학",
    "문헌정보학",
    "고고학",
    "인류학",
    "문화학",
    "문화콘텐츠학",
    "문예창작학",
    "신학",
    "지역학",
    "동아시아",
    "인문대학",
    "동북아문화산업",
    "Language&AI융합",
    "박물관학",
    "유럽문화",
    "글로벌한국",
    "크리에이티브인문",
    "일본어문학",
    "어문학",
    "K-글로벌",
  ],
  // 사범 — 교원자격 연계 트랙. 국어교육 지망생에게 국어국문학을
  // 섞지 않도록 인문과 분리한다(specs/013 §6.1-b).
  교육: [
    "교육학",
    "국어교육",
    "윤리교육",
    "유아교육",
    "특수교육",
    "초등교육",
    "가정교육",
    "사회교육",
    "일반사회교육",
    "과학교육",
    "교육공학",
    "체육교육",
    "기술교육",
    "독어교육",
    "유아특수교육",
  ],
  "컴퓨터·IT": [
    "컴퓨터공학",
    "소프트웨어공학",
    "인공지능",
    "데이터사이언스",
    "정보보안",
    "정보통신공학",
    "게임공학",
    "모바일공학",
    "IT융합",
    "스마트보안",
    "정보학",
    "디지털밀리터리",
    // 2027 데이터 재생성으로 들어온 자연계 모집단위(중앙대 산업보안학과(자연)·예술공학부)
    "산업보안",
    "예술공학",
    "가상현실",
    "멀티미디어",
    "의료IT",
  ],
  전기전자: [
    "전기전자공학",
    "전자공학",
    "전기공학",
    "반도체공학",
    "제어계측공학",
  ],
  "기계·건설": [
    "기계공학",
    "산업공학",
    "도시공학",
    "토목공학",
    "신소재공학",
    "에너지공학",
    "건축학",
    "건축공학",
    "건설공학",
    "환경공학",
    "로봇공학",
    "자동차공학",
    "항공우주공학",
    "항공공학",
    "조선공학",
    "교통공학",
    "재료공학",
    "고분자공학",
    "섬유공학",
    "유기재료공학",
    "나노공학",
    "배터리공학",
    "메카트로닉스공학",
    "기관공학",
    "냉동공조공학",
    "안전공학",
    "공간정보공학",
    "자율운항시스템공학",
    "항해융합",
    "스마트모빌리티",
    "융합공학",
    "조경학",
    "공간환경",
    "철도공학",
    "드론공학",
    "소방학",
    "산업안전공학",
    "지적학",
    "의료신소재",
  ],
  "화학·생명": [
    "화학공학",
    "생명공학",
    "생명과학",
    "식품공학",
    "원예학",
    "산림학",
    "생물학",
    "농학",
    "식품학",
    "동물과학",
    "바이오시스템공학",
    "의생명공학",
    "식물과학",
    "바이오공학",
    "의공학",
    "의용공학",
    "응용화학",
    "수산생명의학",
    "제약학",
    "바이오메디컬",
    "미생물학",
    "화장품학",
    "생화학",
    "생명정보학",
    "바이오산업",
    "임산공학",
    "축산학",
    "식물학",
    "바이오소재",
    "해양생명과학",
    "뇌·인지과학",
    "환경학",
    "환경과학",
    "바이오헬스",
    "반려동물학",
  ],
  "수리·자연": [
    "수학",
    "물리학",
    "화학",
    "통계학",
    "지구과학",
    "해양학",
    "지질학",
    "천문학",
    "대기과학",
    "자연과학계열",
  ],
  // 의약과 보건은 컷 분포가 겹치지 않아 분리한다(실데이터 중앙값
  // 의약 97 / 보건 74). 의대 지망생의 하향 선택지는 치·한·수의·약이고
  // 간호는 별도 트랙이다(specs/013 §6.1-b). 한약학은 컷 91 이라 보건.
  의약: ["의학", "치의학", "한의학", "약학", "수의학"],
  보건: [
    "간호학",
    "재활학",
    "보건학",
    "식품영양학",
    "물리치료학",
    "치위생학",
    "임상병리학",
    "작업치료학",
    "보건환경학",
    "보건정책학",
    "보건행정학",
    "한약학",
    "응급구조학",
    "안경광학",
    "방사선학",
    "의료경영학",
  ],
  "예체능·디자인": [
    "디자인",
    "패션디자인",
    "시각디자인",
    "산업디자인",
    "실내건축",
    "의류학",
    "주거환경학",
    "영화",
    "사진",
    "만화애니메이션",
    "디지털콘텐츠",
    "체육학",
    "예술",
    "뷰티학",
    "의료공간디자인",
    "음악",
  ],
  계열무관: ["자유전공", "공학계열", "한양인터칼리지"],
};

/**
 * 의약 그룹 (의·치·한·약·수의).
 * 🔴 다른 그룹과 섞지 않는다. 컷이 백분위 96.8~99.6 으로 극단적이어서
 * 함께 묶으면 비의약 지망생의 밴드가 전부 왜곡된다. 역방향(의약
 * 지망생 → 비의약 확대)도 금지하므로 대계열 확대 단계도 없다.
 */
export const MEDICAL_GROUP: FieldGroupName = "의약";

/** 어느 그룹으로 확대할 때나 포함할 수 있는 그룹 */
export const NEUTRAL_GROUP: FieldGroupName = "계열무관";

/**
 * 서로 확대를 허용하는 인접 그룹 (양방향).
 * 보건과 화학·생명은 컷 분포와 지망 패턴이 겹친다.
 */
const COMPANION_GROUPS: Partial<Record<FieldGroupName, FieldGroupName[]>> = {
  보건: ["화학·생명"],
  "화학·생명": ["보건"],
};

/** 대계열 */
export type BroadField = "인문" | "자연";

/**
 * 그룹 → 대계열. 교육(국어교육·과학교육이 한 그룹)·예체능·디자인·
 * 계열무관은 판정 불가라 넣지 않는다(specs/013 §6.1-c).
 */
const BROAD_FIELD_BY_GROUP: Partial<Record<FieldGroupName, BroadField>> = {
  경상: "인문",
  사회: "인문",
  인문: "인문",
  "컴퓨터·IT": "자연",
  전기전자: "자연",
  "기계·건설": "자연",
  "화학·생명": "자연",
  "수리·자연": "자연",
  의약: "자연",
  보건: "자연",
};

const GROUP_BY_CATEGORY = new Map<string, FieldGroupName>();
for (const [group, categories] of Object.entries(FIELD_GROUPS)) {
  for (const category of categories) {
    GROUP_BY_CATEGORY.set(category, group as FieldGroupName);
  }
}

/**
 * 계열무관 모집단위 이름에 드러난 선발 계열 (인문 신호를 먼저 본다).
 * "자유전공학부" 의 "공학" 에 걸리지 않도록 "전공학" 은 제외한다.
 */
const NEUTRAL_HUMANITIES_NAME =
  /인문|사회|경상|경영|휴먼서비스|문화콘텐츠|복지|외국어/;
const NEUTRAL_SCIENCE_NAME =
  /자연|(?<!전)공학|공과|IT|AI|첨단|과학기술|프런티어|생명|농업|산림|보건/;
const NEUTRAL_ARTS_NAME = /예체능/;

/**
 * 계열무관 모집단위가 희망 대계열과 어긋나지 않는지.
 * category 가 자유전공이어도 "서울대 인문계열"은 이과 지망생의
 * 대안이 아니다. 이름에 계열이 드러나지 않으면 양쪽 모두 허용한다.
 */
export const matchesNeutralPlanField = (
  department: string,
  targetCategory: string
): boolean => {
  const targetField = toBroadField(targetCategory);
  if (!targetField) {
    return true;
  }
  if (NEUTRAL_ARTS_NAME.test(department)) {
    return false;
  }
  if (NEUTRAL_HUMANITIES_NAME.test(department)) {
    return targetField === "인문";
  }
  if (NEUTRAL_SCIENCE_NAME.test(department)) {
    return targetField === "자연";
  }
  return true;
};

/** category 가 속한 계열그룹. 매핑에 없으면 null */
export const findFieldGroup = (category: string): FieldGroupName | null =>
  GROUP_BY_CATEGORY.get(category) ?? null;

/**
 * 면허·자격 연계 트랙 — 대계열 확대를 금지한다.
 *
 * 학과 전환이 자유롭지 않은 트랙이라 계열그룹을 넘는 추천이
 * 사용자에게 쓸모가 없다. 간호 지망생의 상향에 전자공학과가 들어오는
 * 식이 된다. 관련 있고 불완전한 추천이 완전하고 무관한 추천보다
 * 낫다(specs/013 §6.1-b).
 */
const LICENSE_TRACK_GROUPS: readonly FieldGroupName[] = [
  "의약",
  "보건",
  "교육",
];

/** 대계열(Stage 3) 확대를 금지하는 희망 계열인지 */
export const blocksBroadFieldExpansion = (category: string): boolean => {
  const group = findFieldGroup(category);
  return group !== null && LICENSE_TRACK_GROUPS.includes(group);
};

/**
 * category 의 대계열 판정.
 * 자유전공·공학계열은 판정 불가(null)이며, 호출부는 그 경우
 * 전체 모집단위를 모집단으로 써야 한다.
 */
export const toBroadField = (category: string): BroadField | null => {
  const group = findFieldGroup(category);
  if (!group) {
    return null;
  }
  return BROAD_FIELD_BY_GROUP[group] ?? null;
};

/** 의약 계열인지 (보건은 포함하지 않는다) */
export const isMedicalCategory = (category: string): boolean =>
  findFieldGroup(category) === MEDICAL_GROUP;

/**
 * 후보 풀 확대 시 함께 볼 category 집합.
 * 의약·보건은 양방향 모두 섞지 않는다.
 */
export const expandableCategories = (targetCategory: string): Set<string> => {
  const group = findFieldGroup(targetCategory);
  if (!group) {
    return new Set([targetCategory]);
  }

  // 의약은 그룹 안에서만 본다. 계열무관(자유전공)조차 섞지 않는다.
  if (group === MEDICAL_GROUP) {
    return new Set(FIELD_GROUPS[MEDICAL_GROUP]);
  }

  const companions = COMPANION_GROUPS[group] ?? [];
  return new Set([
    ...FIELD_GROUPS[group],
    ...companions.flatMap((name) => [...FIELD_GROUPS[name]]),
    ...FIELD_GROUPS[NEUTRAL_GROUP],
  ]);
};
