/**
 * 계열별 입학사정관 평가 기준
 *
 * 입학사정관이 생활기록부를 평가할 때 학과/계열별로 중점적으로 보는
 * 교과, 활동 유형, 역량 가중치를 정의한다.
 *
 * AI 프롬프트에 `{majorEvaluationContext}` 자리표시자로 전달되어
 * 학과 맞춤형 분석을 가능하게 한다.
 */

// ─── 타입 정의 ───

export interface MajorEvaluationCriteria {
  /** 계열 코드 (매칭용) */
  majorGroup: string;
  /** 계열 표시명 */
  label: string;
  /** 이 계열에서 입학사정관이 중점 평가하는 핵심 교과 */
  keySubjects: string[];
  /** 핵심 교과의 평가 포인트 */
  keySubjectFocus: string;
  /** 입학사정관이 주목하는 탐구/활동 유형 */
  valuedActivities: string[];
  /** 4대 역량별 가중치 (합 = 100%) */
  competencyWeights: {
    academic: number;
    career: number;
    community: number;
    growth: number;
  };
  /** 진로역량 평가 시 특별히 중요한 요소 */
  careerFocusPoints: string[];
  /** 이 계열에서 약점으로 작용할 수 있는 요소 */
  riskFactors: string[];
}

// ─── 계열별 평가 기준 데이터 ───

export const MAJOR_EVALUATION_CRITERIA: MajorEvaluationCriteria[] = [
  {
    majorGroup: "의생명",
    label: "의학/생명과학 계열",
    keySubjects: ["생명과학", "화학", "수학", "물리"],
    keySubjectFocus:
      "생명과학과 화학의 성취도를 가장 중시하며, 수학(미적분II, 확률과 통계)의 기초 역량도 확인한다.",
    valuedActivities: [
      "실험 설계 및 수행 경험",
      "생명 현상에 대한 탐구 보고서",
      "의료/보건 관련 봉사 또는 체험 활동",
      "과학 교과 심화 탐구 (논문 읽기, 실험 재현 등)",
    ],
    competencyWeights: { academic: 35, career: 35, community: 15, growth: 15 },
    careerFocusPoints: [
      "생명과학II/화학II 이수 여부 및 성취도",
      "실험 기반 탐구의 과학적 방법론 적용",
      "의료/생명 분야에 대한 지속적 관심과 활동 심화",
    ],
    riskFactors: [
      "과학 핵심 과목(생명과학/화학) 미이수 또는 낮은 성취도",
      "탐구 활동이 단순 조사 수준에 그침",
      "진로 방향의 잦은 변경",
    ],
  },
  {
    majorGroup: "공학",
    label: "공학 계열 (기계/전자/화학공학 등)",
    keySubjects: ["수학", "물리", "화학", "정보"],
    keySubjectFocus:
      "수학(미적분II, 기하)과 물리의 성취도를 가장 중시하며, 문제 해결 과정에서의 공학적 사고를 확인한다.",
    valuedActivities: [
      "수학/물리 심화 문제 해결 과정",
      "공학적 설계 또는 제작 프로젝트",
      "프로그래밍/코딩 관련 탐구",
      "문제 정의 → 해결 방안 도출 → 검증의 구조적 탐구",
    ],
    competencyWeights: { academic: 35, career: 30, community: 15, growth: 20 },
    careerFocusPoints: [
      "수학(미적분II, 기하)과 물리학II 이수 및 높은 성취도",
      "문제 해결 능력을 보여주는 구체적 탐구 사례",
      "공학적 사고(설계-제작-평가)의 흔적",
    ],
    riskFactors: [
      "수학 또는 물리 성취도 부진",
      "탐구가 이론 나열에 그치고 실제 적용 사례가 없음",
      "공학 관련 활동 경험 부족",
    ],
  },
  {
    majorGroup: "컴퓨터AI",
    label: "컴퓨터/AI/소프트웨어 계열",
    keySubjects: ["수학", "정보", "물리"],
    keySubjectFocus:
      "수학(미적분, 확률과 통계)의 논리적 사고력을 중시하며, 정보/프로그래밍 과목의 이수와 자기주도적 개발 경험을 확인한다.",
    valuedActivities: [
      "프로그래밍/알고리즘 관련 자기주도 프로젝트",
      "수학적 모델링 또는 데이터 분석 탐구",
      "AI/머신러닝 관련 탐구 활동",
      "소프트웨어 개발 또는 앱/웹 제작 경험",
    ],
    competencyWeights: { academic: 30, career: 35, community: 10, growth: 25 },
    careerFocusPoints: [
      "정보/프로그래밍 과목 이수 및 자기주도적 코딩 경험",
      "수학적 사고력을 활용한 문제 해결 사례",
      "기술 트렌드에 대한 관심과 자기주도 학습 증거",
    ],
    riskFactors: [
      "수학 성취도 부진",
      "정보/프로그래밍 과목 미이수",
      "단순 사용 경험만 있고 원리 이해나 개발 경험이 없음",
    ],
  },
  {
    majorGroup: "경영경제",
    label: "경영/경제 계열",
    keySubjects: ["수학", "사회", "경제"],
    keySubjectFocus:
      "수학적 사고력(확률과 통계, 미적분)과 사회/경제 현상에 대한 분석력을 함께 평가한다.",
    valuedActivities: [
      "경제/경영 현상 분석 탐구 (사례 연구, 시장 분석 등)",
      "수학적 모델을 활용한 사회 현상 해석",
      "창업/기업 경영 관련 프로젝트",
      "통계 데이터 기반 탐구 보고서",
    ],
    competencyWeights: { academic: 30, career: 30, community: 20, growth: 20 },
    careerFocusPoints: [
      "확률과 통계/미적분 이수 및 양호한 성취도",
      "경제 과목 이수 및 경제 현상에 대한 분석적 시각",
      "리더십 또는 팀 프로젝트 경험 (경영 역량의 간접 증거)",
    ],
    riskFactors: [
      "수학 성취도 부진 (특히 확률과 통계)",
      "사회/경제 관련 탐구 활동 부족",
      "단순 정보 나열형 탐구에 그침",
    ],
  },
  {
    majorGroup: "사회과학",
    label: "사회과학 계열 (법학/정치외교/행정/사회학 등)",
    keySubjects: ["사회", "국어", "수학", "영어"],
    keySubjectFocus:
      "국어와 사회 과목에서 나타나는 논리적 사고력, 비판적 분석력, 사회 현상에 대한 이해도를 중심으로 평가한다.",
    valuedActivities: [
      "사회 이슈에 대한 비판적 분석 및 토론",
      "정책 제안 또는 사회문제 해결 프로젝트",
      "법/정치/사회 관련 독서와 심화 탐구",
      "논술/에세이 등 글쓰기 역량을 보여주는 활동",
    ],
    competencyWeights: { academic: 25, career: 30, community: 25, growth: 20 },
    careerFocusPoints: [
      "정치와 법, 사회문화 등 사회 과목 이수 및 높은 성취도",
      "사회 현상에 대한 분석적/비판적 시각의 증거",
      "토론, 모의재판, 정책 연구 등 전공 관련 심화 활동",
    ],
    riskFactors: [
      "사회 관련 과목 성취도 부진",
      "탐구가 표면적 정보 수집에 그침 (비판적 분석 부족)",
      "진로 관련 활동의 일관성 부족",
    ],
  },
  {
    majorGroup: "인문",
    label: "인문 계열 (국문/영문/사학/철학 등)",
    keySubjects: ["국어", "영어", "사회", "역사"],
    keySubjectFocus:
      "국어와 영어의 성취도, 텍스트 분석력, 인문학적 사유 능력을 중심으로 평가하며, 독서 이력과 글쓰기 역량도 확인한다.",
    valuedActivities: [
      "인문학적 주제의 독서와 심화 탐구",
      "글쓰기/논술/에세이 활동",
      "역사/철학/문학 관련 비교 분석 또는 비평",
      "다양한 텍스트(문학/비문학) 해석 및 토론",
    ],
    competencyWeights: { academic: 30, career: 25, community: 20, growth: 25 },
    careerFocusPoints: [
      "국어/영어 과목의 높은 성취도와 텍스트 분석 역량",
      "인문학적 주제에 대한 지속적 관심과 독서 이력",
      "비판적 사고와 창의적 글쓰기 능력의 증거",
    ],
    riskFactors: [
      "국어/영어 성취도 부진",
      "독서 이력이 빈약하거나 피상적",
      "인문학적 탐구보다 단순 감상에 그침",
    ],
  },
  {
    majorGroup: "자연과학",
    label: "자연과학 계열 (수학/물리/화학/생물 등)",
    keySubjects: ["수학", "물리", "화학", "생명과학"],
    keySubjectFocus:
      "수학과 해당 전공 과학 과목의 심화 이수(II 과목)와 높은 성취도를 중시하며, 학문적 호기심과 탐구 깊이를 확인한다.",
    valuedActivities: [
      "과학 실험 설계 및 데이터 분석",
      "수학/과학 심화 탐구 (증명, 모델링, 시뮬레이션 등)",
      "학술 논문 읽기 및 재현 탐구",
      "교과 간 융합적 탐구 (수학+과학 연계)",
    ],
    competencyWeights: { academic: 35, career: 30, community: 10, growth: 25 },
    careerFocusPoints: [
      "수학II/과학II 과목 이수 및 우수한 성취도",
      "탐구의 과학적 방법론 적용 (가설-실험-결론)",
      "학문적 호기심과 자기주도적 심화 학습",
    ],
    riskFactors: [
      "수학 또는 과학 핵심 과목 성취도 부진",
      "탐구가 교과서 수준에 머무름",
      "과학적 방법론 없이 결론만 제시",
    ],
  },
  {
    majorGroup: "교육",
    label: "교육 계열 (사범대/교육학 등)",
    keySubjects: ["국어", "수학", "영어", "사회"],
    keySubjectFocus:
      "전반적인 교과 균형과 성실성을 중시하며, 가르치는 활동이나 또래 학습 도움 경험을 중요하게 평가한다.",
    valuedActivities: [
      "또래 튜터링/멘토링 경험",
      "교육 봉사 또는 학습 도움 활동",
      "수업 참여도와 발표/토론 역량",
      "교육 관련 탐구 (교수법, 학습 이론 등)",
    ],
    competencyWeights: { academic: 25, career: 25, community: 30, growth: 20 },
    careerFocusPoints: [
      "전공 관련 교과의 안정적 성취도",
      "가르치는 경험 또는 또래 학습 도움의 구체적 사례",
      "교육에 대한 관심과 교직 소명의식의 증거",
    ],
    riskFactors: [
      "교과 성적 편차가 지나치게 큼",
      "타인과의 소통/협업 경험 부족",
      "교육 관련 활동이 전무",
    ],
  },
  {
    majorGroup: "간호보건",
    label: "간호/보건 계열",
    keySubjects: ["생명과학", "화학", "수학", "사회"],
    keySubjectFocus:
      "생명과학과 화학의 기초 역량을 확인하며, 돌봄/봉사 경험과 성실성을 특히 중요하게 평가한다.",
    valuedActivities: [
      "보건/의료 관련 봉사 활동",
      "생명과학 실험 및 탐구",
      "돌봄/나눔 관련 활동 경험",
      "보건 이슈에 대한 탐구 보고서",
    ],
    competencyWeights: { academic: 25, career: 30, community: 30, growth: 15 },
    careerFocusPoints: [
      "생명과학II/화학II 이수 및 양호한 성취도",
      "봉사/돌봄 경험의 지속성과 진정성",
      "보건/간호 분야에 대한 구체적 관심 증거",
    ],
    riskFactors: [
      "과학 과목 미이수 또는 낮은 성취도",
      "봉사/돌봄 활동 경험 부족",
      "출결 불량 (성실성 의문)",
    ],
  },
  {
    majorGroup: "예체능",
    label: "예술/체육 계열",
    keySubjects: ["국어", "영어"],
    keySubjectFocus:
      "실기 역량이 핵심이나, 국어/영어 등 기초 교과의 최소 성취도와 예술적/체육적 활동의 지속성을 확인한다.",
    valuedActivities: [
      "전공 분야의 지속적 활동 이력",
      "작품 제작/공연/대회 참가 경험",
      "예술/체육 관련 자기주도적 심화 학습",
      "창작 과정이나 훈련 과정의 기록",
    ],
    competencyWeights: { academic: 15, career: 40, community: 15, growth: 30 },
    careerFocusPoints: [
      "전공 분야 활동의 지속성과 성장 과정",
      "기초 교과(국어/영어)의 최소 성취도 확보",
      "예술적/체육적 열정과 자기주도성의 증거",
    ],
    riskFactors: [
      "기초 교과 성취도가 지나치게 낮음",
      "전공 관련 활동 이력이 빈약",
      "활동의 지속성 없이 산발적",
    ],
  },
];

// ─── 계열 매칭 유틸리티 ───

/**
 * 학생의 목표 학과명에서 가장 적합한 계열 평가 기준을 찾는다.
 * recommended-courses.ts의 extractMajorKeywords보다 정밀한 매칭을 수행한다.
 */
export const matchMajorEvaluationCriteria = (
  targetDept: string
): MajorEvaluationCriteria => {
  const lower = targetDept.toLowerCase();

  // 의생명 계열 (의예, 약학, 치의예, 한의예, 수의예)
  if (
    /의[예학]|약[학대]|치[의학]|한의|수의/.test(lower) ||
    lower.includes("의과")
  ) {
    return findCriteria("의생명");
  }

  // 간호/보건 계열
  if (/간호|보건|물리치료|작업치료|방사선|임상/.test(lower)) {
    return findCriteria("간호보건");
  }

  // 컴퓨터/AI 계열 (공학보다 먼저 체크)
  if (/컴퓨터|소프트웨어|인공지능|AI|정보[통보]|데이터|사이버|IT/.test(lower)) {
    return findCriteria("컴퓨터AI");
  }

  // 공학 계열
  if (/공학|기계|전자|전기|건축|토목|산업|재료|신소재|화공/.test(lower)) {
    return findCriteria("공학");
  }

  // 자연과학 계열
  if (/수학과|물리[학과]|화학과|생[명물]|천문|지구과학|통계학/.test(lower)) {
    return findCriteria("자연과학");
  }

  // 경영/경제 계열
  if (/경영|경제|회계|금융|무역|세무|국제통상/.test(lower)) {
    return findCriteria("경영경제");
  }

  // 교육 계열
  if (/교육|사범|교직/.test(lower)) {
    return findCriteria("교육");
  }

  // 사회과학 계열
  if (
    /법[학과]|정치|외교|행정|사회[학과]|심리|미디어|언론|신문|광고|복지/.test(
      lower
    )
  ) {
    return findCriteria("사회과학");
  }

  // 인문 계열
  if (
    /국[어문]|영[어문]|불[어문]|독[어문]|일[어문]|중[어문]|사학|역사|철학|문학|어문|인문|문헌정보/.test(
      lower
    )
  ) {
    return findCriteria("인문");
  }

  // 예체능 계열
  if (/예술|미술|음악|체육|무용|디자인|영화|연극|실용음악/.test(lower)) {
    return findCriteria("예체능");
  }

  // 기본값: 자연과학 (이공계 기본)
  return findCriteria("자연과학");
};

const findCriteria = (majorGroup: string): MajorEvaluationCriteria => {
  return (
    MAJOR_EVALUATION_CRITERIA.find((c) => c.majorGroup === majorGroup) ??
    MAJOR_EVALUATION_CRITERIA.find((c) => c.majorGroup === "자연과학")!
  );
};

/**
 * 매칭된 계열 평가 기준을 프롬프트용 텍스트로 직렬화한다.
 * AI가 이해하기 쉬운 구조화된 텍스트로 변환한다.
 */
export const formatMajorEvaluationContext = (
  criteria: MajorEvaluationCriteria,
  targetDept: string
): string => {
  const lines: string[] = [];

  lines.push(`## 학과 맞춤 평가 기준: ${targetDept} (${criteria.label})`);
  lines.push("");
  lines.push(
    "아래는 입학사정관이 이 계열 지원자를 평가할 때 실제로 중점적으로 보는 기준입니다."
  );
  lines.push("분석 시 이 기준을 반드시 반영하세요.");
  lines.push("");

  lines.push(`### 핵심 평가 교과: ${criteria.keySubjects.join(", ")}`);
  lines.push(criteria.keySubjectFocus);
  lines.push("");

  lines.push("### 입학사정관이 주목하는 활동 유형");
  for (const activity of criteria.valuedActivities) {
    lines.push(`- ${activity}`);
  }
  lines.push("");

  lines.push("### 4대 역량 가중치 (이 계열 기준)");
  lines.push(
    `- 학업역량: ${criteria.competencyWeights.academic}% (${criteria.competencyWeights.academic >= 30 ? "핵심" : "보조"})`
  );
  lines.push(
    `- 진로역량: ${criteria.competencyWeights.career}% (${criteria.competencyWeights.career >= 30 ? "핵심" : "보조"})`
  );
  lines.push(
    `- 공동체역량: ${criteria.competencyWeights.community}% (${criteria.competencyWeights.community >= 25 ? "중요" : "보조"})`
  );
  lines.push(
    `- 발전가능성: ${criteria.competencyWeights.growth}% (${criteria.competencyWeights.growth >= 25 ? "중요" : "보조"})`
  );
  lines.push("");

  lines.push("### 진로역량 핵심 평가 포인트");
  for (const point of criteria.careerFocusPoints) {
    lines.push(`- ${point}`);
  }
  lines.push("");

  lines.push("### 이 계열에서 약점으로 작용하는 요소");
  for (const risk of criteria.riskFactors) {
    lines.push(`- ${risk}`);
  }

  return lines.join("\n");
};
