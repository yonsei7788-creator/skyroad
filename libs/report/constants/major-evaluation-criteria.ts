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
    coreSubjects: [],
    recommendedSubjects: [
      "세계사",
      "경제",
      "정치와 법",
      "사회·문화",
      "사회문제 탐구",
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
 * majorGroup 이름으로 직접 평가 기준을 조회한다.
 * detectedMajorGroup 등 이미 계열명이 확정된 경우 사용.
 */
export const findCriteriaByMajorGroup = findCriteria;

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
  lines.push("");

  if (criteria.coreSubjects.length > 0) {
    lines.push(`### 핵심 권장과목 (importancePercent 30~40%에 해당)`);
    lines.push(criteria.coreSubjects.join(", "));
    lines.push("");
  }

  if (criteria.recommendedSubjects.length > 0) {
    lines.push(`### 권장과목 (importancePercent 15~25%에 해당)`);
    lines.push(criteria.recommendedSubjects.join(", "));
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
