/** Call A: 역량 추출 (내부용) */

export interface CompetencyExtractionInput {
  studentProfile: string;
  recordData: string;
}

export const buildCompetencyExtractionPrompt = (
  input: CompetencyExtractionInput
): string => {
  return `당신은 생기부에서 4대 평가 역량의 증거를 추출하는 분석가입니다.

## 작업
아래 생기부 데이터에서 학업역량, 진로역량, 공동체역량, 발전가능성의 증거를 체계적으로 추출하세요.

## 추출 단계
1. 생기부 전체를 통독하며 4대 역량(학업역량, 진로역량, 공동체역량, 발전가능성)의 하위 요소별로 해당하는 문장을 표시합니다.
2. 표시된 각 문장에서 1~2문장 단위로 증거(evidence)를 잘라내고, 출처(학년-과목 또는 학년-활동영역)를 기록합니다.
3. 각 증거를 긍정적(positive) 또는 부정적(negative)으로 분류합니다. 형식적이거나 구체성이 없는 표현은 negative로 분류합니다.
4. 2개 이상의 과목 또는 학년에 걸쳐 반복·심화되는 탐구 주제를 식별하여 crossSubjectConnections에 기록합니다.
5. 형식적 표현("적극적으로 참여함", "성실히 수행함" 등 구체적 내용 없는 표현)을 별도로 formalExpressions에 수집합니다.
6. 최종 JSON을 조립하여 출력합니다. 빈 배열이어도 키는 반드시 포함합니다.

## 규칙
1. 각 증거는 반드시 원문 인용과 함께 기록합니다.
2. 인용의 출처(학년, 과목명 또는 활동 영역)를 명시합니다.
3. 긍정적 증거와 부정적 증거(약점)를 모두 추출합니다.
4. 형식적 표현("적극적으로 참여함" 등)은 약점으로 분류합니다.
5. 과목 간/학년 간 연결되는 탐구 주제가 있으면 별도로 식별합니다.
6. 각 evidence는 생기부 원문에서 1~2문장 단위로 추출합니다. 3문장 이상을 하나의 evidence로 묶지 마세요.

## 분량 제한 (필수)
- 각 하위항목(achievement, attitude, inquiry 등)당 증거는 **최대 5개**까지만 추출합니다.
- 가장 중요하고 구체적인 증거를 우선 선별합니다.
- crossSubjectConnections는 **최대 5개**, formalExpressions는 **최대 5개**까지만 기록합니다.

## 생기부 기반 실제 강점 계열 판단 (detectedMajorGroup)

⚠️ **이것은 희망학과가 아닙니다.** 생기부 데이터(세특 탐구 주제, 성적 패턴, 활동 내용)에서 드러나는 **실제 강점 계열**을 판단하세요.

판단 기준:
1. **세특 탐구 주제의 주요 분야**: 어떤 교과/분야의 탐구가 가장 깊고 반복적인가?
2. **성적 강점 교과**: 어떤 교과군에서 성적이 가장 높은가?
3. **활동 패턴**: 창체/동아리/진로 활동이 어떤 분야에 집중되는가?
4. **crossSubjectConnections의 주요 테마**: 교과 간 연결의 핵심 분야는?

사용 가능한 계열:
- "인문" (국어/역사/철학/문학 탐구 중심)
- "사회과학" (사회/정치/법/심리 탐구 중심)
- "경영경제" (경제/경영/통계 탐구 중심)
- "자연과학" (수학/과학 전반 탐구 중심)
- "공학" (물리/기계/전자/건축 탐구 중심)
- "컴퓨터AI" (정보/코딩/AI/데이터 탐구 중심)
- "약학" (신약개발/약물 대사(ADME)/약물 표적·리간드/제약바이오/맞춤형 약제/약리학 등 약학·제약 중심 탐구 — 약사·신약개발연구원 지향)
- "의생명" (의학/치의학/한의학/수의학 등 임상·의료 직접 관련 탐구 중심 — 의사·의료인 지향이 명확한 경우만)
- "생명과학" (생명현상 탐구/실험/연구 중심 — 생물학자·연구자 지향, 해부·미생물·세포·유전학·생태 등)
- "바이오" (바이오공학/생명공학/유전공학 등 생명+공학 융합 — 바이오 산업·기술 응용 지향)
- "간호보건" (간호/보건/치료 관련)
- "교육" (교육학 자체를 탐구하는 경우만 — 교수학습이론, 교육과정론, 교육심리, 교육공학 등 교육학 내용이 세특의 주된 탐구 주제인 경우)
- "예체능교육" (체육교육/음악교육/미술교육 등 — 예체능 활동 + 교육/멘토링 활동이 함께 드러나는 경우)
- "예체능" (예술/체육/음악/미술/디자인/무용 활동 중심)
- "화학재료" (화학/재료/화공 관련)

⚠️ 희망학과가 "의학과"여도 생기부에서 사회탐구가 주력이면 "사회과학"으로 판단하세요.
⚠️ 희망학과가 없거나 불명확해도, 생기부 데이터만으로 계열을 판단할 수 있습니다.
⚠️ **"교사 희망 ≠ 교육 계열"**: "지리 교사", "수학 교사", "과학 교사"처럼 특정 교과의 교사를 희망하는 학생은 "교육"이 아니라 **해당 교과의 계열**로 분류하세요. "교사"는 진로 희망이지 학문 분야가 아닙니다.
  - 지리 교사 희망 + 지리 탐구 중심 → "사회과학" (교육 아님)
  - 수학 교사 희망 + 수학 탐구 중심 → "자연과학" (교육 아님)
  - 과학 교사 희망 + 과학 탐구 중심 → "자연과학" (교육 아님)
  - 국어 교사 희망 + 문학/국어 탐구 중심 → "인문" (교육 아님)
  - 교육학 자체 탐구 (교수법, 교육과정, 교육심리 등) → "교육"
  → detectedDepartments에서 "지리교육과", "수학교육과" 등 교육 경로를 포함하는 것은 허용합니다.
⚠️ "의생명"과 "약학"은 다릅니다:
  - 의생명: 환자 진료·임상·의료인 지향 (의사, 치과의사 등). 세특에서 질병 치료, 환자 사례, 임상 연구가 주력인 경우.
  - 약학: 약물·신약개발·제약 지향 (약사, 신약개발연구원 등). 세특에서 약물 대사, ADME, 신약개발, 약물 표적, 리간드, 제약바이오가 주력인 경우.
  → 생기부의 "희망분야"에 "의학"이 적혀 있어도, 실제 탐구 내용이 약물/신약/제약 중심이면 반드시 "약학"으로 판단하세요.

## 추천 학과명 (detectedDepartments)

detectedMajorGroup과 함께, 이 학생의 생기부에 적합한 **구체적 학과명 3~5개**를 출력하세요.
반드시 대학에서 실제로 사용하는 **완전한 학과명**("~학과", "~학부", "~공학과" 등)을 출력하세요.

예시:
- 전기전자 관련 생기부 → ["전기전자공학과", "전자공학과", "반도체공학과"]
- 컴퓨터 관련 생기부 → ["컴퓨터공학과", "소프트웨어학과", "인공지능학과"]
- 기계공학 관련 생기부 → ["기계공학과", "로봇공학과", "자동차공학과"]
- 경영 관련 생기부 → ["경영학과", "경제학과", "국제통상학과"]
- 간호 관련 생기부 → ["간호학과", "보건학과"]
- 체육교육 관련 생기부 → ["체육교육과", "스포츠과학과", "체육학과"]
- 화학 관련 생기부 → ["화학과", "화학공학과", "응용화학과"]
- 건축 관련 생기부 → ["건축학과", "건축공학과", "건설환경공학과"]
- 사회+통계 관련 생기부 → ["사회학과", "통계학과", "사회과학과"]
- 지리 탐구 + 도시/공간 분석 관련 생기부 → ["지리학과", "지리교육과", "도시계획학과"]
- 법 관련 생기부 → ["법학과", "정치외교학과"]
- 심리 관련 생기부 → ["심리학과", "상담심리학과"]

⚠️ "경영", "사회", "행정" 같은 1~2글자 짧은 키워드는 절대 사용하지 마세요. 반드시 "경영학과", "사회학과", "행정학과" 형태의 완전한 학과명을 사용하세요.
⚠️ 접두어가 다른 학과는 완전히 별개 분야입니다. 혼동하지 마세요:
  - "행정학과" ≠ "경찰행정학과"(치안), "소방행정학과"(소방), "보건행정학과"(보건)
  - "법학과" ≠ "해사법학부"(해양), "경찰법학과"(치안)
  - "경영학과" ≠ "호텔경영학과"(관광), "문화예술경영학과"(예술)
  - "교육학과" ≠ "건설공학교육과"(공학), "화학공학교육과"(공학)
  → 학생의 생기부 강점에 맞는 학과만 선별하세요.
⚠️ "공학", "자연과학", "인문" 같은 계열명은 사용하지 마세요.

## 출력 JSON 스키마
\`\`\`json
{
  "detectedMajorGroup": "string (생기부에서 드러나는 실제 강점 계열, 위 목록 중 하나)",
  "detectedMajorReason": "string (판단 근거 1~2문장, 예: '세특에서 체육·스포츠 관련 탐구가 3년간 일관되며, 체육 실기 관련 활동이 핵심')",
  "detectedDepartments": ["string (완전한 학과명 3~5개, 예: '사회학과', '화학공학과')"],
  "academic": {
    "achievement": [{ "evidence": "string (원문 인용 1~2문장)", "source": "string (예: 2학년-물리학I)", "sentiment": "positive | negative" }],
    "attitude": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "inquiry": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }]
  },
  "career": {
    "courseEffort": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "courseAchievement": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "exploration": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }]
  },
  "community": {
    "caring": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "collaboration": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "leadership": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "integrity": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }]
  },
  "growth": {
    "selfDirected": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "diversity": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "progression": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }],
    "creativeProblemSolving": [{ "evidence": "string", "source": "string", "sentiment": "positive | negative" }]
  },
  "crossSubjectConnections": [{ "theme": "string (탐구 주제)", "subjects": ["string"], "gradeProgression": "string (학년별 심화 과정 설명)", "depthAssessment": "deepening | maintaining | superficial" }],
  "formalExpressions": [{ "expression": "string (형식적 표현 원문)", "source": "string", "issue": "string (왜 형식적인지 설명)" }]
}
\`\`\`

## 학생 프로필
${input.studentProfile}

## 생기부 데이터
${input.recordData}`;
};

/**
 * Call A 출력 스키마 (Gemini responseSchema용)
 * 실제 Schema 객체는 schemas/phase2-schemas.ts에서 정의
 */
export interface CompetencyExtractionOutput {
  /** 생기부에서 드러나는 실제 강점 계열 (희망학과 무관) */
  detectedMajorGroup: string;
  /** 판단 근거 1~2문장 */
  detectedMajorReason: string;
  /** 추천 학과명 3~5개 (완전한 학과명, 예: "사회학과", "화학공학과") */
  detectedDepartments?: string[];
  /** @deprecated detectedDepartments로 대체됨. 하위 호환용. */
  detectedDepartmentKeywords?: string[];
  academic: {
    achievement: EvidenceItem[];
    attitude: EvidenceItem[];
    inquiry: EvidenceItem[];
  };
  career: {
    courseEffort: EvidenceItem[];
    courseAchievement: EvidenceItem[];
    exploration: EvidenceItem[];
  };
  community: {
    caring: EvidenceItem[];
    collaboration: EvidenceItem[];
    leadership: EvidenceItem[];
    integrity: EvidenceItem[];
  };
  growth: {
    selfDirected: EvidenceItem[];
    diversity: EvidenceItem[];
    progression: EvidenceItem[];
    creativeProblemSolving: EvidenceItem[];
  };
  crossSubjectConnections: CrossSubjectConnection[];
  formalExpressions: FormalExpression[];
}

interface EvidenceItem {
  evidence: string;
  source: string;
  sentiment: "positive" | "negative";
}

interface CrossSubjectConnection {
  theme: string;
  subjects: string[];
  gradeProgression: string;
  depthAssessment: "deepening" | "maintaining" | "superficial";
}

interface FormalExpression {
  expression: string;
  source: string;
  issue: string;
}
