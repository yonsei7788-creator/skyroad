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

  /** 핵심 권장과목 (importancePercent 30~40% 대상) */
  coreSubjects: string[];
  /** 권장과목 (importancePercent 15~25% 대상) */
  recommendedSubjects: string[];
}

// ─── 계열별 평가 기준 데이터 ───

export const MAJOR_EVALUATION_CRITERIA: MajorEvaluationCriteria[] = [
  {
    majorGroup: "의생명",
    label: "의학 계열",
    keySubjects: ["생명과학", "화학", "수학", "물리"],
    keySubjectFocus:
      "생명과학과 화학의 성취도를 가장 중시하며, 수학(미적분II, 확률과 통계)의 기초 역량도 확인한다.",
    valuedActivities: [
      "의료/보건 관련 봉사 또는 체험 활동",
      "임상·환자·의료 맥락의 탐구 보고서",
      "과학 교과 심화 탐구 (논문 읽기, 실험 재현 등)",
      "의료인 지향 진로 활동",
    ],
    competencyWeights: { academic: 35, career: 35, community: 15, growth: 15 },
    careerFocusPoints: [
      "생명과학II/화학II 이수 여부 및 성취도",
      "실험 기반 탐구의 과학적 방법론 적용",
      "의료 분야에 대한 지속적 관심과 활동 심화",
    ],
    riskFactors: [
      "과학 핵심 과목(생명과학/화학) 미이수 또는 낮은 성취도",
      "탐구 활동이 단순 조사 수준에 그침",
      "진로 방향의 잦은 변경",
    ],
    coreSubjects: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "화학Ⅰ",
      "생명과학Ⅰ",
      "생명과학Ⅱ",
    ],
    recommendedSubjects: ["확률과 통계", "물리학Ⅰ", "화학Ⅱ"],
  },
  {
    majorGroup: "약학",
    label: "약학 계열",
    keySubjects: ["화학", "생명과학", "수학"],
    keySubjectFocus:
      "화학의 성취도를 가장 중시하며, 생명과학과 수학(미적분, 확률과 통계)의 기초 역량도 확인한다.",
    valuedActivities: [
      "약물 대사(ADME)·약리학 관련 탐구",
      "신약개발·제약바이오 관련 연구 활동",
      "약물 표적·리간드 등 분자 수준 탐구",
      "화학 실험 설계 및 수행 (합성, 분석, 정량 등)",
    ],
    competencyWeights: { academic: 35, career: 35, community: 15, growth: 15 },
    careerFocusPoints: [
      "화학II/생명과학II 이수 여부 및 성취도",
      "약물·제약 분야에 대한 지속적 관심과 활동 심화",
      "실험 기반 탐구의 과학적 방법론 적용",
    ],
    riskFactors: [
      "화학 핵심 과목 미이수 또는 낮은 성취도",
      "탐구 활동이 단순 조사 수준에 그침",
      "약학·제약 관련 활동 일관성 부족",
    ],
    coreSubjects: ["수학Ⅰ", "수학Ⅱ", "미적분", "화학Ⅰ", "화학Ⅱ", "생명과학Ⅰ"],
    recommendedSubjects: ["생명과학Ⅱ", "확률과 통계", "물리학Ⅰ"],
  },
  {
    majorGroup: "생명과학",
    label: "생명과학 계열",
    keySubjects: ["생명과학", "화학", "수학"],
    keySubjectFocus:
      "생명과학의 성취도를 가장 중시하며, 화학과 수학의 기초 역량도 확인한다.",
    valuedActivities: [
      "실험 설계 및 수행 경험 (해부, 미생물 배양, 세포 관찰 등)",
      "생명 현상에 대한 탐구 보고서",
      "생태/환경/유전학 관련 연구 활동",
      "과학 교과 심화 탐구 (논문 읽기, 실험 재현 등)",
    ],
    competencyWeights: { academic: 35, career: 35, community: 15, growth: 15 },
    careerFocusPoints: [
      "생명과학II 이수 여부 및 성취도",
      "실험 기반 탐구의 과학적 방법론 적용",
      "생명과학 연구자 지향의 지속적 활동 심화",
    ],
    riskFactors: [
      "과학 핵심 과목(생명과학) 미이수 또는 낮은 성취도",
      "탐구 활동이 단순 조사 수준에 그침",
      "진로 방향의 잦은 변경",
    ],
    coreSubjects: ["수학Ⅰ", "수학Ⅱ", "화학Ⅰ", "생명과학Ⅰ", "생명과학Ⅱ"],
    recommendedSubjects: ["확률과 통계", "화학Ⅱ", "지구과학Ⅰ"],
  },
  {
    majorGroup: "바이오",
    label: "바이오공학 계열",
    keySubjects: ["생명과학", "화학", "수학", "정보"],
    keySubjectFocus:
      "생명과학과 화학을 기반으로, 공학적 응용과 기술 활용 역량을 확인한다.",
    valuedActivities: [
      "바이오/유전공학 관련 실험 및 탐구",
      "생명공학 기술 응용 프로젝트",
      "AI/데이터 기반 생명정보 분석 활동",
      "신소재/신약 관련 탐구",
    ],
    competencyWeights: { academic: 30, career: 35, community: 15, growth: 20 },
    careerFocusPoints: [
      "생명과학/화학 이수 및 성취도",
      "공학적 응용 사고 (기술·산업 연결)",
      "바이오 산업·기술에 대한 관심과 활동",
    ],
    riskFactors: [
      "과학 핵심 과목 미이수 또는 낮은 성취도",
      "순수 연구만 있고 공학·기술 응용 활동이 부족",
      "진로 방향의 잦은 변경",
    ],
    coreSubjects: ["수학Ⅰ", "수학Ⅱ", "화학Ⅰ", "생명과학Ⅰ"],
    recommendedSubjects: ["미적분", "화학Ⅱ", "생명과학Ⅱ", "정보"],
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
    coreSubjects: [
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "기하",
      "물리학Ⅰ",
      "물리학Ⅱ",
      "화학Ⅰ",
    ],
    recommendedSubjects: ["확률과 통계", "화학Ⅱ"],
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
    coreSubjects: ["수학Ⅰ", "수학Ⅱ", "미적분", "기하"],
    recommendedSubjects: ["확률과 통계", "인공지능 수학"],
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
      "확률과 통계/미적분 이수 및 보통 이상의 성취도",
      "경제 과목 이수 및 경제 현상에 대한 분석적 시각",
      "리더십 또는 팀 프로젝트 경험 (경영 역량의 간접 증거)",
    ],
    riskFactors: [
      "수학 성취도 부진 (특히 확률과 통계)",
      "사회/경제 관련 탐구 활동 부족",
      "단순 정보 나열형 탐구에 그침",
    ],
    coreSubjects: ["미적분", "확률과 통계"],
    recommendedSubjects: ["경제 수학", "경제", "사회·문화"],
  },
  {
    majorGroup: "사회과학",
    label: "사회과학 계열 (법학/정치외교/행정/사회학/지리학 등)",
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
    coreSubjects: [],
    recommendedSubjects: [
      "세계사",
      "경제",
      "정치와 법",
      "사회·문화",
      "사회문제 탐구",
      "한국지리",
      "세계지리",
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
    coreSubjects: [],
    recommendedSubjects: [
      "세계사",
      "동아시아사",
      "한국지리",
      "세계지리",
      "윤리와 사상",
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
    coreSubjects: ["수학Ⅰ", "수학Ⅱ", "미적분", "기하"],
    recommendedSubjects: ["확률과 통계", "물리학Ⅰ", "화학Ⅰ", "생명과학Ⅰ"],
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
    coreSubjects: [],
    recommendedSubjects: [],
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
      "생명과학II/화학II 이수 및 보통 이상의 성취도",
      "봉사/돌봄 경험의 지속성과 진정성",
      "보건/간호 분야에 대한 구체적 관심 증거",
    ],
    riskFactors: [
      "과학 과목 미이수 또는 낮은 성취도",
      "봉사/돌봄 활동 경험 부족",
      "출결 불량 (성실성 의문)",
    ],
    coreSubjects: ["수학Ⅰ", "수학Ⅱ", "확률과 통계", "생명과학Ⅰ", "생명과학Ⅱ"],
    recommendedSubjects: ["미적분", "화학Ⅰ", "화학Ⅱ"],
  },
  {
    majorGroup: "예체능교육",
    label: "예체능 교육 계열 (체육교육/음악교육/미술교육 등)",
    keySubjects: ["국어", "영어", "사회"],
    keySubjectFocus:
      "예체능의 전공 실기·활동 역량과 사범대의 교직 소명·교과 균형을 함께 평가한다. 체육/예술 활동의 지속성뿐 아니라, 또래 지도 경험과 인문·사회적 소양도 중요하게 본다.",
    valuedActivities: [
      "전공 분야(체육/예술)의 지속적 활동 이력",
      "또래 튜터링/멘토링 또는 교육 봉사 경험",
      "수업 참여도와 발표/토론 역량",
      "교육 관련 탐구 (스포츠 교육학, 교수법 등)",
    ],
    competencyWeights: { academic: 20, career: 30, community: 25, growth: 25 },
    careerFocusPoints: [
      "전공 분야 활동의 지속성과 성장 과정",
      "가르치는 경험 또는 또래 학습 도움의 구체적 사례",
      "기초 교과(국어/영어/사회)의 안정적 성취도 확보",
      "교직 소명의식과 교육에 대한 관심 증거",
    ],
    riskFactors: [
      "기초 교과 성취도가 지나치게 낮음",
      "전공 관련 활동 이력이 빈약",
      "타인과의 소통/협업 경험 부족",
      "교육 관련 활동이 전무",
    ],
    coreSubjects: [],
    recommendedSubjects: [],
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
    coreSubjects: [],
    recommendedSubjects: [],
  },
];

// ─── 세특 표현 분석 가이드 ───

export const SESPEC_EXPRESSION_GUIDE = `
## 입학사정관의 세특 표현 해석 기준

### ⛔ 부정적으로 해석되는 표현 패턴
| 표현 패턴 | 사정관 해석 | evaluationComment 반영 |
|-----------|------------|----------------------|
| "자기주도적으로 탐구함" (구체적 과정 없음) | 형식적 서술, 다른 학생에게도 동일하게 기재 가능 | "구체적 탐구 과정이 서술되지 않아 독창성이 드러나지 않음" |
| "~을 알게 됨", "~을 이해함" | 단순 조사 수준, 탐구 깊이 부족 | "단순 학습 기록으로, 심화 탐구 활동으로 평가되기 어려움" |
| "~하고 싶다" 반복 | 의지만 표명, 실천 부재 | "실천 사례 없이 의지만 반복되어 실천력 측면에서 부정적" |
| "~을 기대함" | 원론적 의견, 평가 영향 없음 | "단순 의견 제시로 평가에 유의미한 영향 없음" |
| "~을 탐색함" (결과 없음) | 관심 표명 수준, 탐구 아님 | "탐색 수준에 그쳐 탐구력 근거로 불충분" |

### ⛔ 추가 부정 패턴 (원론적 해결책·일반적 서술)
| 표현 패턴 | 사정관 해석 | evaluationComment 반영 |
|-----------|------------|----------------------|
| "제도를 개선해야 한다", "정책적 지원이 필요하다" | 누구나 할 수 있는 원론적 주장, 창의성 제한적 | "원론적 해결방안에 그쳐 학생만의 관점이 드러나지 않음" |
| "다양한 활동을 통해 ~역량을 키움" | 구체적 내용 없는 나열, 변별력 없음 | "구체적 활동 내용이 빠져 있어 사정관이 역량을 확인하기 어려움" |
| "관심을 갖게 되었다" (후속 탐구 없음) | 관심 표명 수준, 탐구 깊이 없음 | "관심 표명에 그치고 후속 탐구가 없어 진로역량 근거로 부족" |

### ✅ 긍정적으로 해석되는 표현 패턴
| 표현 패턴 | 사정관 해석 |
|-----------|------------|
| 구체적 해결방안 제시 (학생만의 관점) | 창의적 문제해결 역량 득점 (단, 원론적이면 제한적) |
| 가설→실험→결론→한계인식 구조 | 과학적 방법론 충실, 탐구력 우수 |
| 교과 간 연결·융합 탐구 | 통합적 사고, 학업역량 우수 |
| 문제 인식→추가 탐구→심화 학습 | 자기주도적 탐구 역량 |

### ⚠️ 반드시 단점도 서술
- 모든 과목의 evaluationComment에 장점뿐 아니라 단점(표현상 한계, 탐구 깊이 부족 등)을 함께 서술하세요.
- 단점이 전혀 없는 세특은 존재하지 않습니다.
`;

// ─── 활동 평가 가이드 ───

export const ACTIVITY_EVALUATION_GUIDE = `
## 입학사정관의 활동 유형별 평가 기준

⚠️ **핵심 원칙: "기록에 드러난 것"과 "드러나지 않은 것" 모두 판단하세요.**
입학사정관은 기록된 내용뿐 아니라, 기록에 빠져 있는 것(구체적 과정, 결과, 심화 내용)도 함께 봅니다.
좋은 활동이라도 기록이 부실하면 평가에 반영되지 않습니다.

### 공동체 활동 (토론회, 체육대회, 청소, 수련회 등)
- 인성/공동체역량의 보조 자료로만 활용됨
- 전공 적합성 판단에는 무관
- 인성 영역 반영 비율이 높은 전형(예: 학생부교과전형, 지역균형)에서만 긍정 요소
- 대부분의 학생이 갖고 있는 기록이므로 변별력 없음

📝 **Few-shot 예시 (입학사정관 시점)**:
- "교내 토론 대회 참여 기록은 인성 영역에서는 긍정적이나, 전공역량 평가에는 큰 영향 없음. 다만 인성 비율이 높은 전형에서 협력성·의사소통 근거로 활용될 수 있다."
- "체육대회 반장으로 참여한 기록은 일반적 수준의 공동체 활동으로 평가에 큰 영향은 없다. 다만 반 친구들을 격려하며 참여를 이끈 구체적 서술이 있어 책임감 측면에서 참고 요소가 된다."

### 자율활동 (학급 활동, 발표 등)
- 전공 관련성은 제한적 — 소재가 전공과 일치해도 변별력 낮음
- 탐구 과정의 구체성과 깊이가 중요
- 다수 학생이 참여하는 활동이므로 독창성이 드러나야 의미 있음
- **자율적 교육과정(자율동아리 등) 활동은 흔하므로, 차별화하려면 활동의 깊이가 필수**

📝 **Few-shot 예시 (입학사정관 시점)**:
- "학급 발표에서 SWOT 분석을 진행한 기록이 있으나, 분석의 구체적 내용이 서술되지 않아 실제 탐구력을 판단하기 어렵다. 입학사정관은 '분석 프레임을 사용했다'는 것보다 '어떤 결론을 도출했는가'를 본다."
- "자율활동에서 전공 관련 주제로 발표한 기록이 있지만, 소재 자체가 전공과 관련있다고 해서 진로역량에 직접적 영향을 주지는 않는다. 발표 내용의 깊이, 질문 대응, 추가 탐구 여부가 평가의 핵심이다."

### 진로 관련 활동 (대학 연계 프로그램 등)
- 진로 일관성과 관심 증거로 작용
- 단순 참여는 평가 영향 미미 → 지식 확장·추가 탐구·심화 학습이 드러나야 함
- 활동의 깊이가 부족하면 탐구력·학업적 성장 측면에서 높은 평가 어려움
- **"참여했다" 수준의 기록은 형식적 참여로 판단됨**

📝 **Few-shot 예시 (입학사정관 시점)**:
- "진로 체험활동 참여 기록이 있으나, 체험 후 본인의 진로관 변화나 심화 탐구 과정이 기술되지 않아 형식적 참여로 볼 가능성이 높다. 진로역량을 인정받으려면 '체험 → 질문 발생 → 추가 탐구'의 흐름이 드러나야 한다."
- "대학 연계 프로그램에 참여한 기록은 있지만, 프로그램에서 무엇을 배웠고 그것이 진로 결정에 어떤 영향을 미쳤는지가 빠져 있어, 입학사정관 입장에서는 '참여 자체'만으로 높게 평가하기 어렵다."

### 세특(세부능력 및 특기사항) 평가
- 구체적 탐구 과정 없이 결론만 서술된 경우 → 감점 요인
- 진로 관련 활동인데도 탐구 깊이 부족 → 진로역량 부정적 요인
- 해결방안 제시 시: 학생만의 관점이면 창의성 득점, 원론적이면 제한적

### ⛔ 세특 부정적 표현 패턴 (활동 분석에서도 적용)
| 표현 패턴 | 사정관 해석 | 평가 서술 방향 |
|-----------|------------|--------------|
| "~을 알게 됨" 마무리 | 실제로 심화 탐구를 했더라도 기록상 단순 조사로 보임 | "~을 알게 됨"으로 마무리되어 탐구 깊이가 드러나지 않음 |
| "~하고 싶다" 반복 | 의지만 표명, 실천 부재 → 성실성·실천력 부정적 | 의지 표명만 반복되어 실천력 측면에서 부정적으로 평가될 수 있음 |
| "~을 기대함" | 원론적 의견, 평가 무관 | 단순 의견 제시로 평가에 유의미한 영향 없음 |
| "탐색함" (결과 없음) | 관심 표명 수준, 탐구 아님 → 진로역량에도 부정적 | 탐색 수준에 그쳐 탐구력 근거로 불충분, 진로역량에서도 높은 평가 어려움 |
| "제도를 개선해야 한다" 등 원론적 해결책 | 누구나 할 수 있는 주장 → 창의성 제한적 | 원론적 해결방안으로 학생만의 관점이 드러나지 않아 창의성 득점이 제한적 |
`;

// ─── 계열 매칭 유틸리티 ───

/**
 * 학생의 목표 학과명에서 가장 적합한 계열 평가 기준을 찾는다.
 * recommended-courses.ts의 extractMajorKeywords보다 정밀한 매칭을 수행한다.
 */
export const matchMajorEvaluationCriteria = (
  rawDept: string
): MajorEvaluationCriteria => {
  // ─── 0. 자유전공/자율전공 — 명시적 계열 indicator 우선 라우팅 ───
  if (
    /자유전공|자율전공|무전공|자율학부|자유선택|광역|통합모집|통합선발|전공자유|전공자율/.test(
      rawDept
    )
  ) {
    if (/^인문|인문계열|인문사회|인문학|문과대학|\(인문/.test(rawDept))
      return findCriteria("인문");
    if (
      /^자연|자연계열|자연과학|이과대학|이공|Science기반|생명과학대학|\(자연/.test(
        rawDept
      )
    )
      return findCriteria("자연과학");
    if (/^예체능|^예능|^아트|예체능계열|아트&컬처|\(예체능/.test(rawDept))
      return findCriteria("예체능");
    if (/^공학|^공과|공학계열|공과대학|\(공학/.test(rawDept))
      return findCriteria("공학");
    if (/^사회|사회계열|사회과학|\(사회/.test(rawDept))
      return findCriteria("사회과학");
    if (/^경영|^경상|^상경|경영계열|경영대학|\(경영/.test(rawDept))
      return findCriteria("경영경제");
    if (/^IT반도체|^AI반도체/.test(rawDept)) return findCriteria("공학");
    if (/^IT|^컴퓨터|^SW|IT계열|IT대학|\(IT/.test(rawDept))
      return findCriteria("컴퓨터AI");
    // 명시적 indicator 없는 순수 자유전공 → 자연과학 fallback (아래로 계속)
  }

  // 메타 표시 제거
  const cleaned = rawDept
    .replace(/\[(?:교직|자연|인문|야|주|남|여)\]/g, "")
    .replace(
      /\((?:야|주|남|여|여수|자연|인문|학교장추천|인문계열|자연계열|통합|특성화)\)/g,
      ""
    )
    .trim();
  const lower = cleaned.toLowerCase();

  // ─── 0.5a. audit2 정밀 매칭 (모든 다른 패턴보다 우선) ───
  if (
    /^건축디자인|^실내건축|실내건축|^인테리어|^조경(?!산림학과)|^조형학부\(건축|^디자인·건축공학|^조경·지역시스템|^조경학과|^조경학전공|건축학부\(실내건축|건축학부 실내건축|^건축학부\(실내건축/.test(
      cleaned
    )
  )
    return findCriteria("공학");
  if (
    /^문화재보존과학|^역사·문화콘텐츠|^한일문화콘텐츠|^독일문화콘텐츠|^중국어문화콘텐츠|^한국문화콘텐츠|중국학부 중국어문|중국학부 중국경경|^역사콘텐츠전공|^역사콘텐츠/.test(
      cleaned
    )
  )
    return findCriteria("인문");
  if (
    /^게임그래픽|^게임디자인|^AI디자인|^AI그래픽|^디지털콘텐츠디자인/.test(
      cleaned
    )
  )
    return findCriteria("예체능");
  if (/^식물의학|^수산생명의학|^해양식품생명의학/.test(cleaned))
    return findCriteria("자연과학");
  if (/^식품공학|^식품가공/.test(cleaned)) return findCriteria("공학");
  if (/^식품학과/.test(cleaned)) return findCriteria("자연과학");
  if (/^글로벌의료뷰티|^뷰티메디컬/.test(cleaned))
    return findCriteria("예체능");
  if (/^사회계열|^기독교상담/.test(cleaned)) return findCriteria("사회과학");
  if (/^해양영어영문|^국제한국어/.test(cleaned)) return findCriteria("인문");
  if (/^철도경영|^철도물류/.test(cleaned)) return findCriteria("경영경제");
  if (/^항공운항서비스/.test(cleaned)) return findCriteria("경영경제");
  if (/^ICT로봇/.test(cleaned)) return findCriteria("공학");
  if (/^소방행정/.test(cleaned)) return findCriteria("사회과학");
  if (/위성정보융합공학/.test(cleaned)) return findCriteria("자연과학");
  if (/^행정정보융합/.test(cleaned)) return findCriteria("사회과학");
  if (/^IT융합경영/.test(cleaned)) return findCriteria("경영경제");
  if (/^광고사진영상/.test(cleaned)) return findCriteria("예체능");
  if (/^레저스포츠학부\(스포츠지도|^레저스포츠학부\(건강/.test(rawDept))
    return findCriteria("간호보건");
  if (/^레저스포츠학부\(스포츠마케팅/.test(rawDept))
    return findCriteria("경영경제");
  if (/^바이오신약의과/.test(cleaned)) return findCriteria("약학");
  if (/^청소년교육·상담/.test(cleaned)) return findCriteria("사회과학");
  if (/^생명정보융합/.test(cleaned)) return findCriteria("의생명");
  if (/^화학공학교육/.test(cleaned)) return findCriteria("공학");
  if (
    /^기독교교육과미디어|^문예창작미디어콘텐츠홍보|^미디어문예창작/.test(
      cleaned
    )
  )
    return findCriteria("인문");

  // ─── 0.5. 충돌 사전 처리 (복합 키워드는 가장 강한 의미를 우선) ───
  // 경영/금융/교육 + 공학 → 공학이 아니라 해당 분야
  if (/경영공학|금융공학|빅데이터경영공학/.test(cleaned))
    return findCriteria("경영경제");
  if (/교육공학/.test(cleaned)) return findCriteria("교육");
  // AI/IT + 공학 분야 → 공학
  if (
    /AI로봇|AI반도체|AI모빌리티|AI시스템반도체|IT반도체|AI자율주행|AI전기자동차|AI에너지/.test(
      cleaned
    )
  )
    return findCriteria("공학");
  // 통계/수리 + 데이터 → 자연과학(통계)
  if (
    /빅데이터응용통계|통계데이터사이언스|수리통계데이터사이언스|정보통계·보험수리|데이터정보물리|빅데이터.*통계|통계.*데이터/.test(
      cleaned
    )
  )
    return findCriteria("자연과학");
  // 경영/마케팅 + 빅데이터/데이터사이언스 → 경영경제
  if (
    /경영빅데이터|마케팅빅데이터|빅데이터경영|데이터사이언스경영|AI빅데이터융합경영|G2빅데이터경영|경제·정보통계|경제정보통계|경제통계|스마트유통물류/.test(
      cleaned
    )
  )
    return findCriteria("경영경제");
  // 디자인 + 공학 → 공학 (디자인이 보조 키워드)
  if (
    /기계시스템디자인공학|기계·시스템디자인공학|서비스디자인공학|제품디자인공학|조경·정원디자인/.test(
      cleaned
    )
  )
    return findCriteria("공학");
  // 디자인 + 비즈/경영 → 경영경제
  if (
    /디자인비즈|디자인비즈니스|패션비즈니스|뷰티비즈니스|문화예술경영|예술경영전공|예술경영학과|서비스마케팅디자인/.test(
      cleaned
    )
  )
    return findCriteria("경영경제");
  // 사회과학/사회복지 우선 (substring "공학"/"화학과" 차단)
  if (
    /^사회과학대학|^사회과학|행정·경찰|경찰공공|^공공정책|^공공인재|^공공안전|^공공인권|^공공학|글로벌리더학부|글로벌협력|글로벌학부|보건행정경영|장례문화산업|가족자원경영|디지털콘텐츠경영|복지·보건|^법·경찰|관광경찰|^지역사회/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");
  // 외국 지역학/문화학 → 인문 vs 사회과학 명시 처리
  // 1) 지역학(국가/권역) → 사회과학
  if (
    /동북아문화산업|^글로벌문화학|^동아시아학|^동북아|^아시아중동|^아시아학|^캠퍼스아시아|^글로벌지역|^국제지역학|^유러피언스터디즈|^국가안보|^국제법무|^지역학|^지역개발|^아랍지역|^중국학|^일본학(?!부)|^독일유럽|^러시아·유라시아|^러시아중앙아시아|^러시아학|^태국학과|^일본대학|^문화와사회융합|드론봇군사|^게페르트|융합과학수사|^스페인중남미전공|^스페인·중남미|^유럽일본러시아|^터키|^태교시아|^린튼|^프랑스·아프리카/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");
  // 2) 외국 어/문화/문학 학과는 인문
  // 유럽중남미학부(독일학전공) 등 학부+전공 형식은 사회과학(지역학)
  if (/^유럽중남미학부/.test(cleaned)) return findCriteria("사회과학");
  if (
    /^동양문화|^동양학(?!철학)|^중국문화|^일본어일본문화|^유럽문화|^유럽일본|^문화인류|^인류학|^고고문화인류|^문화인류고고|^불교문화|^불교학|^사림아너스|^석당인재|^혜화리버럴|K-남도문화|^특수외국어|^스페인어중남미|^스페인중남미|^글로벌한국|^독일학과|^한국학|^Language&AI/.test(
      cleaned
    )
  )
    return findCriteria("인문");
  // 의약생명/의생명공학 → 의생명 (약학 substring 차단)
  if (/^의약생명|^의생명/.test(cleaned)) return findCriteria("의생명");
  // 디지털헬스케어공학 → 의생명, 디지털헬스케어학과 → 간호보건
  if (/^디지털헬스케어공학/.test(cleaned)) return findCriteria("의생명");
  if (/^디지털헬스케어|^바이오메디컬학|^바이오메디컬헬스/.test(cleaned))
    return findCriteria("간호보건");
  // 의료상담/직업치료/의료정보 → 간호보건; 보건의료정보/의료IT → 컴퓨터AI
  if (/^의료상담|^직업치료|^의료정보/.test(cleaned))
    return findCriteria("간호보건");
  if (/^의료IT|^보건의료정보/.test(cleaned)) return findCriteria("컴퓨터AI");
  // 경호 + 종목 → 예체능
  if (/경호학과\(씨름|경호학과\(펜싱|경호학과\(골프/.test(rawDept))
    return findCriteria("예체능");
  // 환경디자인원예 → 자연과학 (디자인 substring 차단)
  if (/^환경디자인원예|^조리예술|^조리과학/.test(cleaned))
    return findCriteria("자연과학");
  // 도시계획·부동산/부동산건설 → 사회과학 (공학/경영 substring 차단)
  if (
    /도시계획·부동산|^부동산건설|^부동산·지적|^부동산지적|^부동산학과|^부동산학부|^주거환경/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");
  // 산업/사이버 + 보안 + 사회과학 키워드 → 사회과학
  if (/^사이버보안경찰|Social Science/.test(cleaned))
    return findCriteria("사회과학");
  // 산업보안 → 컴퓨터AI (audit)
  if (/^산업보안/.test(cleaned)) return findCriteria("컴퓨터AI");
  // 디지털콘텐츠 → 컴퓨터AI
  if (/^디지털콘텐츠(?!경영)/.test(cleaned)) return findCriteria("컴퓨터AI");
  // 항공운항서비스학과 → 경영경제 (audit2)
  if (/^항공운항서비스/.test(cleaned)) return findCriteria("경영경제");
  // 호텔외식조리학부[교직] → 경영경제 (audit)
  if (/^호텔외식조리학부/.test(cleaned)) return findCriteria("경영경제");
  // 테솔(TESL)전공 → 교육
  if (/^테솔|^TESL/.test(cleaned)) return findCriteria("교육");
  // 동양무예/애견미용·행동교정 → 예체능
  if (/^동양무예|^동양체육|^애견미용/.test(cleaned))
    return findCriteria("예체능");
  // 뷰티보건학과 → 예체능 (사용자 manual)
  if (/^뷰티보건/.test(cleaned)) return findCriteria("예체능");
  // 운동/건강관리/재활 학과는 expected가 예체능 — 간호보건으로 send 안 함
  // 전자바이오물리/신소재물리 → 자연과학 (공학 substring 차단)
  if (/^전자바이오물리|^신소재물리|^나노전자물리/.test(cleaned))
    return findCriteria("자연과학");
  // 바이오섬유소재/바이오시스템·소재 → 공학 (자연과학 substring 차단)
  if (
    /^바이오섬유소재|^바이오시스템·소재|^화학·에너지융합|^지능형반도체|^나노반도체|^나노전자|^차세대반도체|^차세대통신|^반도체융합|^반도체학|^반도체학부|^나노융합/.test(
      cleaned
    )
  )
    return findCriteria("공학");
  // 식품콘텐츠/식품가공외식/국제사무/스마트물류/보험계리/문화관광조경 → 경영경제 또는 공학
  if (
    /^식품콘텐츠|^식품가공외식|^국제사무|^스마트물류|^보험계리|^스마트유통|^스마트항만물류|^스마트호스피탈리티|^글로벌문화통상|^국제무역|^글로벌경제|^글로벌법무역|^농경제|^농업경제|^식자원경제|^식품자원경제|^식품경제외식|^디지털금융|^중국경제통상|^중국외교통상|^해양수산경영|^사회적경제기업/.test(
      cleaned
    )
  )
    return findCriteria("경영경제");
  // 추가: 다양한 fallback misclassifications
  // 인문 (어문/사학/외국어 광범위)
  // 군사학과/과학수사 → 사회과학 (사학과 substring 차단)
  if (
    /^군사학|^국방군사|^의무군사|드론봇군사|^경찰과학수사|^융합과학수사|과학수사학/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");
  if (
    /(?<![군])사학과|(?<![군])사학전공|^한국사학|한국역사|한문학|한국어문학|국사학|^노어|서어서문|^외국어학부|^핵심외국어|^글로벌어문|^글로벌인문|^크리에이티브인문|^융합인문|아시아문화학부|아시아언어문명|^응용영어|^응용중국어|^항공외국어|중국언어문화/.test(
      cleaned
    )
  )
    return findCriteria("인문");
  // 사회과학 (행정/복지/심리/사회/법 광범위)
  if (
    /^공항행정|^도시행정|^자치행정|^정부행정|^중앙행정|^해양행정|^법경찰|^법행정|^법·경찰|^법행정세무|^해사법|^도시사회|^정보사회|^사회심리|^산업심리|^산업·광고심리|^재활심리|^의료심리|^명상심리|^가족복지|^가족아동복지|^보건복지|^생활복지|^재활복지|^융합인문사회|^미래융합사회과학|^국제스포츠|^문화재보존|^정보사회학|^스포츠경찰/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");
  // 공학 (광범위 anchored 추가)
  if (
    /^안전공학|^우주항공공학|^나노신소재|^나노화학|^신소재화학공학|^신소재공학|^공업화학|^기관공학|^환경·토목|^해양건설|^해양건축|^해양공학|^해양산업공학|^해양신소재|^해양토목|^항공·기계|^항노화신소재|^화학생명공학|^화학생물공학|^화학소재공학|^화학에너지공학|^환경재료|^바이오시스템공학|^바이오화학산업|^반도체학|^반도체학부|^생명화학공학|^식품생명화학공학|^신소재화학공학부|^스마트기계융합/.test(
      cleaned
    )
  )
    return findCriteria("공학");
  // 컴퓨터AI (게임/데이터/정보보호 광범위)
  if (
    /^게임(?!교육)|^데이터과학|^지능정보보호|^지능형전자시스템|^정보보호|^정보보안/.test(
      cleaned
    )
  )
    return findCriteria("컴퓨터AI");
  // 예체능 (영상/콘텐츠/공예/스포츠 광범위)
  if (
    /^디지털영상|^문화영상|^융합콘텐츠|^귀금속보석|입체조형|^역사콘텐츠|^스포츠과학|^재활스포츠|^실버스포츠|^해양스포츠|^국제스포츠학부|^해양스포츠과학/.test(
      cleaned
    )
  )
    return findCriteria("예체능");
  // 간호보건 (보건/공중보건/융합보건 광범위)
  if (/^공중보건|^융합보건|^보건계열|^보건과학대학|^보건학부\(/.test(cleaned))
    return findCriteria("간호보건");
  // 자유전공 표시 학과 (자연과학 fallback)
  if (/공대자유전공학부/.test(cleaned)) return findCriteria("공학");
  if (/^글로벌인문학부|^크리에이티브인문|^융합인문/.test(cleaned))
    return findCriteria("인문");
  // 문화관광조경 → 공학 (조경)
  if (/문화관광조경|조경·정원|조경산림학과/.test(cleaned))
    return findCriteria("공학");
  // IT반도체융합 → 공학
  if (/IT반도체/.test(cleaned)) return findCriteria("공학");
  // 바이오신약융합학부 → 약학
  if (/^바이오신약융합/.test(cleaned)) return findCriteria("약학");
  // 스마트헬스케어학부(해양스포츠전공) → 간호보건
  if (/^스마트헬스케어학부/.test(cleaned)) return findCriteria("간호보건");
  // 영유아보육학과 → 사회과학 (audit)
  if (
    /^영유아보육|^창의문화융합|^도시·자치융합|^고용서비스정책|^유아특수보육학전공/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");
  // 경기외국어고교과 → 교육
  if (/^경기외국어고교과/.test(cleaned)) return findCriteria("교육");

  // ─── audit2 추가 케이스 ───
  // 건축디자인/실내건축/인테리어/조경 → 공학 (예체능 substring 차단)
  if (
    /^건축디자인|^실내건축|실내건축|^인테리어|^조경|^조형학부\(건축|^디자인·건축공학|^조경·지역시스템|^조경학과|^조경학전공|건축학부\(실내건축|건축학부 실내건축/.test(
      cleaned
    )
  )
    return findCriteria("공학");
  // 외국 문화콘텐츠/지역 어문 → 인문
  if (
    /^문화재보존과학|^역사·문화콘텐츠|^한일문화콘텐츠|^독일문화콘텐츠|^중국어문화콘텐츠|^한국문화콘텐츠|중국학부 중국어문|중국학부 중국경경|^역사콘텐츠/.test(
      cleaned
    )
  )
    return findCriteria("인문");
  // 게임그래픽/AI디자인/AI그래픽콘텐츠/디지털콘텐츠디자인 → 예체능 (5순위 컴퓨터AI 매칭 차단)
  if (
    /^게임그래픽|^게임디자인|^AI디자인|^AI그래픽|^디지털콘텐츠디자인/.test(
      cleaned
    )
  )
    return findCriteria("예체능");
  // 식물의학/수산생명의학/해양식품생명의학 → 자연과학 (의생명 substring 차단)
  if (/^식물의학|^수산생명의학|^해양식품생명의학/.test(cleaned))
    return findCriteria("자연과학");
  // AI디자인/게임그래픽/디지털콘텐츠디자인/AI그래픽콘텐츠 → 예체능
  if (/^AI디자인|^게임그래픽|^디지털콘텐츠디자인|^AI그래픽콘텐츠/.test(cleaned))
    return findCriteria("예체능");
  // 식품공학/식품가공 → 공학; 식품학과 → 자연과학
  if (/^식품공학|^식품가공/.test(cleaned)) return findCriteria("공학");
  if (/^식품학과/.test(cleaned)) return findCriteria("자연과학");
  // 글로벌의료뷰티/뷰티메디컬 → 예체능
  if (/^글로벌의료뷰티|^뷰티메디컬/.test(cleaned))
    return findCriteria("예체능");
  // 사회계열(법학과...)/기독교상담 → 사회과학
  if (/^사회계열|^기독교상담/.test(cleaned)) return findCriteria("사회과학");
  // 해양영어영문/국제한국어 → 인문
  if (/^해양영어영문|^국제한국어/.test(cleaned)) return findCriteria("인문");
  // 철도경영·물류 → 경영경제 (공학 substring 차단)
  if (/^철도경영|^철도물류/.test(cleaned)) return findCriteria("경영경제");
  // 항공운항서비스 → 경영경제 (이전 충돌 처리에서 공학으로 보냈던 것 override)
  if (/^항공운항서비스/.test(cleaned)) return findCriteria("경영경제");
  // ICT로봇 → 공학
  if (/^ICT로봇/.test(cleaned)) return findCriteria("공학");
  // 소방행정 → 사회과학 (공학 substring 차단)
  if (/^소방행정/.test(cleaned)) return findCriteria("사회과학");
  // 위성정보융합공학 → 자연과학
  if (/위성정보융합공학/.test(cleaned)) return findCriteria("자연과학");
  // 행정정보융합 → 사회과학
  if (/^행정정보융합/.test(cleaned)) return findCriteria("사회과학");
  // IT융합경영 → 경영경제
  if (/^IT융합경영/.test(cleaned)) return findCriteria("경영경제");
  // 광고사진영상 → 예체능
  if (/^광고사진영상/.test(cleaned)) return findCriteria("예체능");
  // 레저스포츠학부(스포츠지도·건강재활) → 간호보건; (스포츠마케팅) → 경영경제
  if (/^레저스포츠학부\(스포츠지도|^레저스포츠학부\(건강/.test(rawDept))
    return findCriteria("간호보건");
  if (/^레저스포츠학부\(스포츠마케팅/.test(rawDept))
    return findCriteria("경영경제");
  // 바이오신약의과학부 → 약학
  if (/^바이오신약의과/.test(cleaned)) return findCriteria("약학");
  // 청소년교육·상담학과 → 사회과학
  if (/^청소년교육·상담/.test(cleaned)) return findCriteria("사회과학");
  // 생명정보융합학과 → 의생명
  if (/^생명정보융합/.test(cleaned)) return findCriteria("의생명");
  // 화학공학교육과 → 공학 (사범대 화학공학 교과)
  if (/^화학공학교육/.test(cleaned)) return findCriteria("공학");
  // audit2 추가: 미디어/문예창작 → 인문
  if (
    /^기독교교육과미디어|^문예창작미디어콘텐츠홍보|^미디어문예창작/.test(
      cleaned
    )
  )
    return findCriteria("인문");

  // ─── 1. 사범대 교과교육 (가장 구체적 — 일반 교육보다 먼저) ───
  // ⚠️ 교과 전공이 핵심이므로 해당 교과의 계열로 분류
  if (/체육교육|음악교육|미술교육|무용교육|특수체육교육/.test(cleaned))
    return findCriteria("예체능교육");
  if (
    /수학교육|과학교육|물리교육|화학교육|생물교육|지구과학교육|환경교육|기술교육|기술ㆍ가정교육|기술·가정교육|가정교육|농업교육|식품영양교육/.test(
      cleaned
    )
  )
    return findCriteria("자연과학");
  if (
    /지리교육|역사교육|사회교육|사회과교육|일반사회교육|인문사회교육|윤리교육|경영금융교육|상업교육/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");
  if (
    /국어교육|영어교육|불어교육|독어교육|일어교육|중국어교육|한문교육|한국어교육과|한국어교육전공|한국어교원|외국어교육/.test(
      cleaned
    )
  )
    return findCriteria("인문");
  if (/컴퓨터교육|정보교육|문헌정보교육|정보·컴퓨터교육/.test(cleaned))
    return findCriteria("컴퓨터AI");

  // ─── 2. 의생명 (창의/문화 부분일치 차단) ───
  if (
    /(?<![창문])의예|(?<![창문])의학[과부전대]|치의예|치의학|한의예|한의학|수의예|수의학|^의과|의과대학|바이오메디컬|디지털헬스케어|의생명(?!공학|화학)|의료생명|식물의학|스포츠의학|스포츠재활의학|한방재활스포츠의학|수산생명의학|해양식품생명의학|바이오시스템의과|바이오신약의과|글로벌바이오메디컬|메디컬바이오/.test(
      cleaned
    )
  )
    return findCriteria("의생명");

  // ─── 3. 약학 ───
  if (
    /약학|^제약|^신약|첨단융합신약|혁신신약|한약학|미래산업약학|식품제약|바이오의약|바이오제약|첨단바이오의약|의약바이오|^의약(?!학)|제약공학|제약생명/.test(
      cleaned
    )
  )
    return findCriteria("약학");

  // ─── 4. 간호보건 (정밀, 보건은 강한 키워드만) ───
  if (
    /^간호|간호학|간호대학|^물리치료|^작업치료|^방사선|^임상병리|^임상의약|^응급구조|^치위생|^안경광학|^치기공|치기공학|^언어치료|^청각치료|언어청각|언어치료청각|^재활치료|^재활학과|^재활건강|^재활자립|재활건강증진|재활상담치료|재활상담학|^재활의료|재활의료공학|^의료재활|의료재활공학|^건강보건|^건강관리|^건강재활|디지털헬스케어|바이오헬스|^헬스케어(?!운동)|메디컬뷰티|글로벌의료뷰티|뷰티메디컬|스포츠건강|스포츠재활|스포츠헬스케어|휴먼케어|휴먼헬스케어|휴먼재활/.test(
      cleaned
    )
  )
    return findCriteria("간호보건");

  // ─── 5. 컴퓨터AI ───
  if (
    /컴퓨터(?!교육)|소프트웨어|인공지능|데이터사이언스|데이터공학|빅데이터(?!경영|융합경영)|사이버보안|정보보안|^정보통신(?!군사)|사물인터넷|^게임공학|게임소프트웨어|메타버스|가상현실|hci|^ict|^sw|^aisw|^ai(?!융합경영|빅데이터융합경영)|융합보안|디지털보안|스마트보안|스마트융합보안|스마트it|^it (?:융합|공과|대학|반도체|첨단)|^it(?:융합|공과|대학|반도체|첨단)|첨단it|첨단컴퓨팅|정보기술|정보융합|해킹보안|^msde|디지펜게임공학|^language&ai|social science&ai/.test(
      lower
    )
  )
    return findCriteria("컴퓨터AI");

  // ─── 6. 예체능 ───
  if (
    /예술(?!심리치료|경영|치료)|미술(?!사|심리치료|치료)|음악|체육(?!교육)|무용|디자인(?!공학|비즈|비즈니스)|^영화|연극|연출|시나리오|공연|실용음악|작곡|^회화|^조소|방송영상|애니메이션|만화|패션디자인|패션머천다이징|^패션(?!비즈니스|마케팅)|패션산업|뷰티(?!보건|메디컬)|^사진|모델학|^성악|^국악|^기악|^연기|뮤지컬|연희|판소리|한국화|서양화|^조형|^공예|^스포츠(?!경영|마케팅|비즈|산업|의학|재활|건강|헬스|복지|과학|의료)|태권도|^축구학|골프(?:학|전공)|^씨름|^펜싱|필드하키|^무도|^무예|큐레이터|엔터테인먼트|^웹툰|^아트&|^아트앤|^관현악|^피아노|^희화|향장미용|향장아트|^미용과학|악기제작|Fine Arts|실내건축|인테리어|^조경(?!산림학과)|문화관광조경|^영상(?!공학)|^아트앤웹툰|디지털콘텐츠|콘텐츠제작|K-콘텐츠|표현스토리텔링|^피트니스|운동레저|^레저|^경기지도|^창의예술|^외식조리|^호텔조리|호텔외식조리|^조리예술|^한식조리|^조리학|^조리과학|^화장품|^코스메디컬|^코스메틱|^바이오코스메틱|^의류|^의상|뷰티보건|^건강운동관리|^운동처방|헬스케어운동|^운동건강관리|^운동$|^운동레저/.test(
      cleaned
    )
  )
    return findCriteria("예체능");

  // ─── 7. 자연과학 (broad) ───
  if (
    /^수학(?!교육)|^수리과학|^응용수학|^응용수리|^물리(?!치료)|^물리학|^물리천문|^수학물리|^나노과학|^나노화학|^생명과학|^생명공학|^생명자원|^생명시스템|^생명경보|^생물과학|^생물학|^생화학|^생명환경화학|^생명학|^천문|^지구과학|^지구시스템|^지구해양|^지구환경|^지질|^통계|^응용통계|^정보통계|^통계데이터|^통계학|^수리통계|^수리데이터|^농학|^농생명|^농업생명|^식물|^식량|^원예|^산림|^임학|^임산|^축산|^동물(?!학과)|^반려동물(?!보건)|^특수동물|^특용식물|^애견미용|^수산|^해양(?!경찰|안보)|^환경생명|^환경생태|^환경원예|^환경산림|^환경화학|^환경과학|^환경디자인원예|^식품(?!의약|영양교육)|^조리과학|^뇌·인지|^뇌인지|^시스템생물|^미생물|^분자생물|^분자생명|^분자의약|^식품영양|^식품학|^식품과학|^식품생명|^식품가공|^정밀화학|^에코응용화학|^융합응용화학|^응용화학(?!공)|^응용생명|^응용생물|^보험계리|^이학|^자연과학|^문화재보존과학|^목재|^종이과학|^환경생태조경|^식품영양학과\[교직\]|^식물생명공학|^생명자원공학부|^생명자원학부|^원예생명공학|^임산생명공학|^농업생명환경자율전공|^수산과학대학자유전공|^바이오발효|^바이오시스템(?!의과)|^바이오소재과학|^바이오융합학부|^바이오한약자원|^바이오환경에너지|^생활과학|^생활학과|^동물보건|^환경보건|^보건환경융합|^반려동물보건|^환경보건·산림조경|^환경생태공학|^바이오섬유소재|^정보수학|^지능형반도체전공|^나노반도체|^화학(?!공학)|^화학과|^화학부|^화학·|^화학생명|^화학에너지|^농생명화학|^생명화학|^생명환경화학|^환경생명화학|^생물환경화학|^융합응용화학|^에코응용화학|^정밀화학|^공업화학|^분자생화학|^화학생화학|^나노소재화학|^신소재화학|^화학신소재/.test(
      cleaned
    )
  )
    return findCriteria("자연과학");

  // ─── 8. 공학 ───
  if (
    /(?<![공전관])공학(?!교육)|^기계|^전자(?!상거래)|^전기(?!차)|^건축|^토목|^산업공학|^산업경영공학|^재료(?!공예)|^신소재(?!화학)|^화공|^조선|^항공우주|^항공정비|^항공운항(?!서비스)|^항공교통(?!물류)|^항공관제|^자동차|^모빌리티|^로봇|^드론|^반도체(?!물리)|^디스플레이|^이차전지|^배터리|^에너지공학|^원자력|^통신학과|^차세대통신|^소방방재|^소방안전|^방재|^소방|^산업안전|^산업재난|^산업보안|^메카트로닉스|^시스템공학|^정밀공학|^헬리콥터|^항해|^무인항공기|^그린스마트시티|^도시철도|^철도|^한옥|^미래자동차|^미래형자동차|^미래모빌리티|^소방재난|^재난안전|^수소안전|^환경에너지공간|^공과대학|^공업화학|^금속(?!공예)|^기관전공|^차세대반도체|^지능로봇|^첨단과학기술|^미래에너지|^에너지바이오|^에너지융합|^에너지학과|^에너지과학|^에너지배터리|^이차전지에너지|^전파모빌리티|^나노반도체|^환경공학|^환경시스템|^도시계획(?!·부동산)|^도시공학|^건설(?!스마트안전)|^에너지리사이클|^항공모빌리티|^항공안전관리|^창의공과|^전기차|^오토모티브|^조선해양|^스마트도시|^스마트시티|^스마트모빌리티|^스마트자동차|^스마트배터리|^스마트안전|^스마트에너지|^스마트팜|^스마트원예|^스마트시스템|^건설스마트|^에너지·화학공학|^보건안전공학|^안전보건|^보건안전|^산업안전보건|^환경안전|^바이오시스템·소재|^바이오섬유소재학과|^건설공학|^치기공학|^환경에너지공학/.test(
      cleaned
    )
  )
    return findCriteria("공학");

  // ─── 9. 경영경제 ───
  if (
    /경영(?!금융교육|학교)|^경제(?!통계학과)|^회계|^금융(?!공학)|^무역|^세무|국제통상|^통상|마케팅|^관광|^호텔(?!조리|외식조리)|외식산업|외식경영|외식사업|외식상품|^외식$|^물류|^유통|^비즈니스|^비즈$|^재무|^보험(?!계리)|핀테크|^창업|앙트러프러너십|^항공서비스|^항공관광|^항공운항서비스|호스피탈리티|^e비즈니스|^MICE|항만물류|디지털마케팅|^컨벤션|^카지노|^프랜차이즈|산업유통|^상경|^경상|글로벌비즈니스|글로벌통상|글로벌MICE|글로벌관광|문화관광(?!조경)|디지털콘텐츠경영|^스포츠경영|^스포츠마케팅|^스포츠비즈|^스포츠산업|e스포츠산업|장례문화산업|^벤처|벤처중소기업|^MSDE|문화관광전공|^항만|^승무원|식품가공외식|식품콘텐츠|^Trade|Trade학부|^K-푸드산업|^전자상거래|관광문화콘텐츠|호텔관광|호텔카지노관광|호텔컨벤션|^항공교통물류|^항만물류시스템|^아태물류|^글로컬|^국제물류|보건경영|보건의료경영|호텔외식조리학부\[교직\]|^글로벌리더|^글로벌비즈니스/.test(
      cleaned
    )
  )
    return findCriteria("경영경제");

  // ─── 10. 사회과학 ───
  if (
    /^법(?:학|률|무|과|부|전공|대)|^법률|^정치|^외교|^행정(?!학장)|^사회학|사회복지|^복지|^심리|상담심리|임상심리|미디어|^언론|^신문|^광고|^홍보|커뮤니케이션|^인류학|문화인류|^사회과학|^군사|^국방|^안보|^경찰|^경호|무도경호|^범죄|^수사|^과학수사|국제관계|^국제학|국제개발|^지역학|지역사회개발|동아시아|동북아|캠퍼스아시아|아시아중동|글로벌지역|공공정책|공공인재|공공안전|공공인권|^공공|^다문화|^문화학|문화콘텐츠|문화산업|글로벌문화|글로벌커뮤니케이션|청소년지도|청소년문화|^가족자원|^소비자|아동가족|^아동학|^아동·|아동상담|아동심리|청소년상담|보건정책|보건행정|보건의료행정|^의료상담|^상담학|미술심리치료|예술심리치료|디지털밀리터리|정보통신군사|사이버보안경찰|군사학|국토안보|해양안보|해병안보|해양경찰|항공보안|^표준지식|^인권|휴먼서비스|^지리(?!학)|지리학|^지적|^GIS|평생교육실버복지|^Diplomacy|Social\s*Science|^아동(?!심리교육|청소년교육|교육)|^청소년(?!교육)|글로벌MICE융합|소방인권|^장례문화학|^부동산|^주거환경|^도시·부동산|^도시계획·부동산|^공간환경|^지역사회|^인재개발|^리더십|국제어문|^Language&Diplomacy|상담·임상심리|복지·보건학부|보건관리|보건의료상담복지|보건의료복지|드론봇군사|국방군사|의무군사|의료뷰티|문화창의|법·경찰|^K-글로벌|^글로벌리더학부|^사회과학대학융합|사회자유전공|가족자원경영|^지적학|^지적·|^지적재산권|^글로벌학부|관광경찰|^글로벌협력|^글로벌MICE융합|^글로벌통상학과|^글로벌통상학부|독일유럽|러시아·유라시아|러시아중앙아시아/.test(
      cleaned
    )
  )
    return findCriteria("사회과학");

  // ─── 11. 인문 ───
  if (
    /^국어(?!교육)|^국문|^영어(?!교육)|^영문|^영미|^불어(?!교육)|^불문|^독어(?!교육)|^독문|^일어(?!교육)|^일본어|일본언어|일어일문|일본어일본|일본어전공|일본학|일본대학|^중어|^중문|^중국어|중국문화|중국학|^러시아어|러시아언어|러시아학과|^스페인어|스페인.*중남미|스페인중남미|^아랍어|아랍지역|^이탈리아어|^포르투갈어|^네덜란드어|네덜란드어과|^몽골어|^몽골/.test(
      cleaned
    ) ||
    /^베트남어|^태국어|태국학과|^인도어|^스칸디나비아어|^말레이|^히브리어|^페르시아어|^사학|^역사학|^철학|^문학|^어문|^어학|^인문|문헌정보|문예창작|^창작|^언어학|^종교|^신학|^기독교|^불교|^원불교|^미학|^동양학|동양문화|미술사|^고고|고고미술사|역사문화|^성서|^선교|^유학|영미문학|영미문화|영미학|한국언어|한국학|^언어정보|^테솔|^TESL|글로벌커뮤니케이션학부|국제어문|^독일|^프랑스|^러시아|^이탈리아|^포르투갈|^네덜란드|^몽골|^베트남|^태국|^스칸디나비아|^아랍|^인도|^터키|^태교시아|^게페르트|^린튼|^KFL|^ELLT|Language&Trade|^스페인|^한국언어|^동양$|^문화유산|^웹문예|^문예|^동양어|^아시아어|독일언어|^독일학과|독일유럽학과/.test(
      cleaned
    ) ||
    /노어과|프랑스·아프리카학과|^글로벌한국|^K-남도문화|^유럽문화|^유럽일본|^유럽중남미|불교문화콘텐츠|불교학|^글로벌한국융합|^글로벌한국학|^사림아너스|^석당인재|^혜화리버럴|일본어일본문화|기독교문화/.test(
      cleaned
    )
  )
    return findCriteria("인문");

  // ─── 12. 일반 교육 (마지막 — 교과교육은 위에서 처리됨) ───
  if (
    /^교육학|교육학과|교육학부|교육과$|교육전공|^사범|사범대|사범학부|^교직|^교원|평생교육(?!실버)|특수교육|유아교육|초등교육|중등교육|^영유아|^보육|아동심리교육|아동청소년교육|아동교육상담|환경교육과|자연교육과정|글로벌교육|기독교교육|^교육공학/.test(
      cleaned
    )
  )
    return findCriteria("교육");

  // 기본값: 자연과학
  return findCriteria("자연과학");
};

const findCriteria = (majorGroup: string): MajorEvaluationCriteria => {
  return (
    MAJOR_EVALUATION_CRITERIA.find((c) => c.majorGroup === majorGroup) ??
    MAJOR_EVALUATION_CRITERIA.find((c) => c.majorGroup === "자연과학")!
  );
};

/**
 * majorGroup 이름으로 직접 평가 기준을 조회한다.
 * detectedMajorGroup 등 이미 계열명이 확정된 경우 사용.
 */
export const findCriteriaByMajorGroup = findCriteria;

/**
 * detectedMajorGroup 코드를 리포트 표시용 정식 명칭으로 변환한다.
 * 예: "의생명" → "의학 계열", "약학" → "약학 계열", "컴퓨터AI" → "컴퓨터/AI/소프트웨어 계열"
 *
 * MAJOR_EVALUATION_CRITERIA에 없는 코드는 별도 매핑으로 처리.
 * 리포트 전체에서 동일한 계열 명칭을 사용하기 위해 이 함수만 사용할 것.
 */
const EXTRA_MAJOR_GROUP_LABELS: Record<string, string> = {
  생명바이오: "생명과학 계열", // 레거시 호환
  화학재료: "화학/재료 계열",
};

export const getMajorGroupLabel = (code: string): string => {
  const criteria = MAJOR_EVALUATION_CRITERIA.find((c) => c.majorGroup === code);
  if (criteria) return criteria.label;
  if (EXTRA_MAJOR_GROUP_LABELS[code]) return EXTRA_MAJOR_GROUP_LABELS[code];
  return code;
};

/**
 * 매칭된 계열 평가 기준을 프롬프트용 텍스트로 직렬화한다.
 * AI가 이해하기 쉬운 구조화된 텍스트로 변환한다.
 */
/** 2015 → 2022 교육과정 과목명 변환 맵 */
const SUBJECT_NAME_2015_TO_2022: Record<string, string> = {
  수학Ⅰ: "대수",
  수학Ⅱ: "대수",
  미적분: "미적분Ⅰ",
  물리학Ⅰ: "물리학",
  물리학Ⅱ: "역학과 에너지",
  화학Ⅰ: "화학",
  화학Ⅱ: "화학 반응의 세계",
  생명과학Ⅰ: "생명과학",
  생명과학Ⅱ: "세포와 물질대사",
  지구과학Ⅰ: "지구과학",
  지구과학Ⅱ: "지구시스템과학",
  "사회·문화": "사회와 문화",
  "경제 수학": "경제",
  "사회문제 탐구": "사회와 문화",
};

const convertSubjectsTo2022 = (subjects: string[]): string[] => {
  const converted = new Set<string>();
  for (const s of subjects) {
    converted.add(SUBJECT_NAME_2015_TO_2022[s] ?? s);
  }
  return [...converted];
};

/** 텍스트 내 2015 과목명을 2022 과목명으로 일괄 치환 */
const convertTextTo2022 = (text: string): string => {
  let result = text;
  // 긴 패턴부터 치환 (부분 매칭 방지)
  const sortedEntries = Object.entries(SUBJECT_NAME_2015_TO_2022).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [from, to] of sortedEntries) {
    result = result.replaceAll(from, to);
  }
  return result;
};

export const formatMajorEvaluationContext = (
  criteria: MajorEvaluationCriteria,
  targetDept: string,
  gradingSystem?: "5등급제" | "9등급제",
  mode: "detected" | "hope" = "detected"
): string => {
  const lines: string[] = [];

  if (mode === "hope") {
    lines.push(
      `## 학생 희망 학과 평가 기준: ${targetDept} (${criteria.label} 계열)`
    );
    lines.push("");
    lines.push(
      "아래는 입학사정관이 이 계열 지원자를 평가할 때 실제로 중점적으로 보는 기준입니다."
    );
    lines.push(
      "⚠️ 이 기준은 학생이 희망하는 학과의 평가 기준입니다. 학생의 실제 활동·탐구·교과 이수가 이 기준에 부합하는지 정확히 판단하세요."
    );
    lines.push(
      "⚠️ 학생의 생기부가 이 기준과 부합하지 않으면, 솔직하게 낮은 평가를 내리세요. 부합하지 않는데 부합한다고 말하면 안 됩니다."
    );
    lines.push("");
  } else {
    lines.push(`## 생기부 기반 계열 평가 기준: ${criteria.label} 계열`);
    lines.push("");
    lines.push(
      "아래는 입학사정관이 이 계열 지원자를 평가할 때 실제로 중점적으로 보는 기준입니다."
    );
    lines.push(
      "⚠️ 이 기준은 생기부에서 도출된 강점 계열 기반입니다. 희망 학과명이 아닌 계열 기준으로 분석하세요."
    );
    lines.push("");
  }

  const t = gradingSystem === "5등급제" ? convertTextTo2022 : (s: string) => s;

  lines.push(`### 핵심 평가 교과: ${criteria.keySubjects.join(", ")}`);
  lines.push(t(criteria.keySubjectFocus));
  lines.push("");

  lines.push("### 입학사정관이 주목하는 활동 유형");
  for (const activity of criteria.valuedActivities) {
    lines.push(`- ${t(activity)}`);
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
    lines.push(`- ${t(point)}`);
  }
  lines.push("");

  lines.push("### 이 계열에서 약점으로 작용하는 요소");
  for (const risk of criteria.riskFactors) {
    lines.push(`- ${t(risk)}`);
  }
  lines.push("");

  const coreSubjects =
    gradingSystem === "5등급제"
      ? convertSubjectsTo2022(criteria.coreSubjects)
      : criteria.coreSubjects;
  const recommendedSubjects =
    gradingSystem === "5등급제"
      ? convertSubjectsTo2022(criteria.recommendedSubjects)
      : criteria.recommendedSubjects;

  if (coreSubjects.length > 0) {
    lines.push(`### 핵심 권장과목 (importancePercent 30~40%에 해당)`);
    lines.push(coreSubjects.join(", "));
    lines.push("");
  }

  if (recommendedSubjects.length > 0) {
    lines.push(`### 권장과목 (importancePercent 15~25%에 해당)`);
    lines.push(recommendedSubjects.join(", "));
    lines.push("");
  }

  if (
    criteria.coreSubjects.length > 0 ||
    criteria.recommendedSubjects.length > 0
  ) {
    lines.push(
      "⚠️ 위 목록에 없는 과목은 importancePercent 15% 이하로 설정하세요."
    );
  }

  return lines.join("\n");
};
