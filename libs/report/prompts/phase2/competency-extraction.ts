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
- "의생명" (생명과학/의학/보건 탐구 중심)
- "간호보건" (간호/보건/치료 관련)
- "교육" (교육/교직 관련 활동 중심)
- "예체능교육" (체육교육/음악교육/미술교육 등 — 예체능 활동 + 교육/멘토링 활동이 함께 드러나는 경우)
- "예체능" (예술/체육/음악/미술/디자인/무용 활동 중심)
- "생명바이오" (생명과학/바이오 심화)
- "약학" (화학/약학 관련)
- "화학재료" (화학/재료/화공 관련)

⚠️ 희망학과가 "의학과"여도 생기부에서 사회탐구가 주력이면 "사회과학"으로 판단하세요.
⚠️ 희망학과가 없거나 불명확해도, 생기부 데이터만으로 계열을 판단할 수 있습니다.

## 학과 검색 키워드 (detectedDepartmentKeywords)

detectedMajorGroup과 함께, 실제 대학 학과명을 검색할 수 있는 **구체적 키워드 2~3개**를 출력하세요.
이 키워드는 대학의 실제 학과/학부명에 포함되는 단어여야 합니다.

예시:
- 전기전자 관련 생기부 → ["전기전자", "전자공학", "반도체"]
- 컴퓨터 관련 생기부 → ["컴퓨터", "소프트웨어", "인공지능"]
- 기계공학 관련 생기부 → ["기계공학", "기계", "로봇"]
- 경영 관련 생기부 → ["경영", "경제", "통상"]
- 간호 관련 생기부 → ["간호", "보건"]
- 체육교육 관련 생기부 → ["체육교육", "체육", "스포츠"]
- 화학 관련 생기부 → ["화학", "화공", "재료"]
- 건축 관련 생기부 → ["건축", "건설환경"]

⚠️ "공학", "자연과학", "인문" 같은 너무 넓은 키워드는 사용하지 마세요.
⚠️ 실제 대학 학과명에 포함될 만한 구체적 단어만 사용하세요.

## 출력 JSON 스키마
\`\`\`json
{
  "detectedMajorGroup": "string (생기부에서 드러나는 실제 강점 계열, 위 목록 중 하나)",
  "detectedMajorReason": "string (판단 근거 1~2문장, 예: '세특에서 체육·스포츠 관련 탐구가 3년간 일관되며, 체육 실기 관련 활동이 핵심')",
  "detectedDepartmentKeywords": ["string (학과 검색용 키워드 2~3개)"],
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
  /** 학과 검색용 키워드 2~3개 (대학 실제 학과명에 포함되는 구체적 단어) */
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
