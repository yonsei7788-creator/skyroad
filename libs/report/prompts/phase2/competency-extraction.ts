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

## 출력 JSON 스키마
\`\`\`json
{
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
