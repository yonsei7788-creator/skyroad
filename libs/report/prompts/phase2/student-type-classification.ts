/** Call C: 학생 유형 분류 (내부용) */

export interface StudentTypeClassificationInput {
  competencyExtraction: string;
  preprocessedAcademicData: string;
  studentProfile: string;
  majorEvaluationContext?: string;
}

export const buildStudentTypeClassificationPrompt = (
  input: StudentTypeClassificationInput
): string => {
  return `당신은 학생의 생기부 역량 증거를 종합하여 학생 유형을 분류하는 분석가입니다.

## 작업
아래 역량 추출 결과와 성적 데이터를 바탕으로 학생의 유형을 분류하고 역량별 점수를 산출하세요.

## 학생 유형 분류 기준
학생의 강점 역량 조합에 따라 유형을 분류합니다. 유형명은 창의적이고 직관적으로 작성합니다.

유형명 예시:
- "탐구형 성장러": 학업 탐구력이 강하고 학년별 성장이 뚜렷한 학생
- "실행형 리더": 공동체 리더십이 강하고 실행력이 뛰어난 학생
- "융합형 사색가": 다양한 교과를 넘나드는 융합적 사고가 강한 학생
- "목표형 전문가": 진로 일관성이 높고 전공 분야 깊이가 있는 학생

## 역량 점수 산출 기준 (4대 역량, 각 0~100)
각 역량의 증거 품질과 양을 종합하여 0~100 점수를 부여합니다:

### 학업역량 (0~100)
- 학업성취도 (등급, 추이, 실질 위치): 40%
- 학업태도 (수업 참여, 자기주도 학습): 20%
- 탐구력 (탐구 깊이, 확장성): 40%

### 진로역량 (0~100)
- 전공 관련 교과 이수 노력: 30%
- 전공 관련 교과 성취도: 30%
- 진로 탐색 활동 및 경험: 40%

⚠️ **학과 맞춤 평가**: 아래에 "학과 맞춤 평가 기준"이 제공된 경우, 진로역량 채점 시 해당 계열의 핵심 교과 성취도와 주목 활동 유형을 반드시 반영하세요. 동일 점수라도 전공 관련 핵심 교과의 성취도가 높은 학생이 더 높은 진로역량 점수를 받아야 합니다.

### 공동체역량 (0~100)
- 나눔과 배려: 25%
- 소통 및 협업: 25%
- 리더십: 25%
- 성실성과 규칙준수: 25%

### 발전가능성 (0~100)
- 자기주도성: 25%
- 경험의 다양성: 25%
- 성장 과정: 25%
- 창의적 문제해결: 25%

## 역량 등급 기준
| 점수 구간 | 등급 |
|-----------|------|
| 85~100 | S (최우수) |
| 70~84 | A (우수) |
| 55~69 | B (보통) |
| 40~54 | C (미흡) |
| 0~39 | D (부족) |

## 핵심 키워드 태그 추출 기준
학생을 대표하는 키워드 3~5개를 추출합니다:
- 진로 관련 키워드 (예: "자동차공학", "AI윤리")
- 역량 관련 키워드 (예: "꼬리물기탐구", "팀리더십")
- 성장 관련 키워드 (예: "성적상승세", "활동심화")

## 역량 점수 앵커 (scoring anchors)
| 점수 구간 | 기준 |
|-----------|------|
| 90~100 | 매우 구체적인 증거가 다수 존재하며, 학년 간 심화·확장이 뚜렷함 |
| 70~89 | 구체적 증거가 존재하며, 일관된 활동 흐름이 확인됨 |
| 50~69 | 증거가 있으나 형식적이거나 깊이가 부족함 |
| 30~49 | 증거가 적고 형식적 표현 위주임 |
| 0~29 | 해당 역량의 증거가 거의 없음 |

## 캐치프레이즈 작성 기준
학생의 핵심 특성을 한 문장으로 요약합니다.
- 형식: "~하는 ~형 학생" 또는 자유 형식
- 예시: "자동차에 대한 열정을 학업으로 증명하는 탐구형 성장러"

## ⚠️ 생기부-학과 괴리 판단 (최우선)
학생의 생기부 내용(세특 주제, 탐구 방향, 활동 이력)과 희망 학과 간의 일치도를 반드시 평가합니다.

### 괴리 감지 기준
- 세특/활동에서 희망 학과 관련 주제·키워드가 전체의 30% 미만이면 "괴리가 큼"
- 예: 환경·생태 중심 생기부 → 컴퓨터공학과 지원 = 괴리가 큼

### 괴리가 큰 경우 반드시 적용할 규칙
1. **typeName에 괴리를 반영**: "환경 탐구형 학생(컴공 지원 시 재설계 필요)" 등 괴리를 숨기지 마세요. "융합형"이라고 포장하면 안 됩니다.
2. **진로역량 점수 상한 60점**: 생기부 내용이 희망 학과와 맞지 않으면 진로역량에서 높은 점수를 줄 수 없습니다. 아무리 활동이 많아도 방향이 다르면 진로역량은 60점을 넘길 수 없습니다.
3. **typeDescription에서 괴리 명시**: "생기부 내용은 환경·생태 분야에 집중되어 있으나, 희망 학과(컴퓨터공학)와 괴리가 있어 서류 평가에서 불리합니다" 등 솔직하게 서술하세요.
4. **scoringRationale의 career 항목**: "희망 학과와 생기부 내용의 괴리로 인해 ~점으로 채점"이라고 근거를 명확히 밝히세요.

### 괴리가 없는 경우
- 정상적으로 유형 분류 및 점수 산출

## 추가 지침
- competencyGrades는 radarChart 점수에서 역량 등급 기준 표를 적용하여 산출합니다. 점수를 먼저 결정한 뒤 등급을 매기세요.
- 유형명은 예시를 그대로 사용하지 않고 학생 고유의 이름을 만드세요. 예시는 참고용입니다.
- scoringRationale의 각 항목에는 해당 역량 점수를 부여한 근거를 2~3문장으로 작성합니다. 어떤 증거가 있었고 왜 해당 점수인지 설명하세요.

## 출력 JSON 스키마
\`\`\`json
{
  "typeName": "string (학생 고유 유형명, 예시를 그대로 쓰지 않을 것)",
  "typeDescription": "string (유형에 대한 2~3문장 설명)",
  "radarChart": {
    "academic": "number (0~100, 학업역량 점수)",
    "career": "number (0~100, 진로역량 점수)",
    "community": "number (0~100, 공동체역량 점수)",
    "growth": "number (0~100, 발전가능성 점수)"
  },
  "tags": ["string (3~5개 핵심 키워드 태그)"],
  "catchPhrase": "string (한 문장 캐치프레이즈)",
  "competencyGrades": {
    "academic": "S | A | B | C | D (radarChart.academic 점수 기반)",
    "career": "S | A | B | C | D (radarChart.career 점수 기반)",
    "community": "S | A | B | C | D (radarChart.community 점수 기반)",
    "growth": "S | A | B | C | D (radarChart.growth 점수 기반)"
  },
  "scoringRationale": {
    "academic": "string (학업역량 점수 부여 근거 2~3문장)",
    "career": "string (진로역량 점수 부여 근거 2~3문장)",
    "community": "string (공동체역량 점수 부여 근거 2~3문장)",
    "growth": "string (발전가능성 점수 부여 근거 2~3문장)"
  }
}
\`\`\`

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 전처리 결과
${input.preprocessedAcademicData}

### 학생 프로필
${input.studentProfile}

${input.majorEvaluationContext ? `### 학과 맞춤 평가 기준 (입학사정관 관점)\n${input.majorEvaluationContext}` : ""}`;
};

export interface StudentTypeClassificationOutput {
  typeName: string;
  typeDescription: string;
  radarChart: {
    academic: number;
    career: number;
    community: number;
    growth: number;
  };
  tags: string[];
  catchPhrase: string;
  competencyGrades: {
    academic: "S" | "A" | "B" | "C" | "D";
    career: "S" | "A" | "B" | "C" | "D";
    community: "S" | "A" | "B" | "C" | "D";
    growth: "S" | "A" | "B" | "C" | "D";
  };
  scoringRationale: {
    academic: string;
    career: string;
    community: string;
    growth: string;
  };
}
