/** 섹션 1: 학생 프로필 (studentProfile) */

import type { ReportPlan } from "../../types.ts";

export interface StudentProfilePromptInput {
  studentTypeClassification: string;
  studentProfile: string;
  /** Premium 전용: admissionStrategy 섹션 JSON 결과. strategy bullet의 일관성 확보용. */
  admissionStrategyResult?: string;
}

const STRATEGY_RULES = `### 전략 (strategy)
- 학생이 다음 학기에 바로 실행할 수 있는 **구체적 행동 항목** 2~4개를 string 배열로 작성합니다.
- 각 항목은 한 줄(20자 내외)로 짧게, 명사형/동사형 어미 자유.
- ✅ 좋은 예: "생명과학 심화 탐구 1개 추가", "실험 기반 활동 강화", "활동 간 스토리 연결"
- ❌ 나쁜 예 (추상적/공허): "학업에 더 집중", "다양한 활동 참여", "꾸준한 노력"
- ⛔ 금칙어: "기여한다", "강화한다" — 학생들이 인공지능 클리셰로 인지하므로 사용 금지. "추가", "확장", "연결", "구체화", "보완" 등 구체 동작 동사 사용.
- 학생 유형 분류 결과의 약점/보완 영역을 직접 참고하여 도출합니다.`;

const RECOMMENDED_TYPE_RULES = `### 추천 전형 (recommendedAdmissionType)
- 학생 유형 분류 결과의 강점(성적/활동 균형, 내신 등급, 세특 풍부도 등)을 보고 가장 적합한 전형 1개를 선택합니다.
- 허용 값(정확히 이 표현 중 하나): "학생부종합", "학생부교과", "논술", "정시", "실기"
- 단일 문자열, 부연 설명 금지.`;

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 추가 출력 필드
- 모든 텍스트 필드를 충분히 서술합니다.
- **반드시 \`recommendedAdmissionType\`(string)와 \`strategy\`(string 배열 2~4개)를 포함하세요.**
- 출력 예시(위 JSON에 다음 두 키를 추가):
  "recommendedAdmissionType": "학생부종합",
  "strategy": ["사회 정책 심화 탐구 1개 추가", "토론 동아리 활동 구체화", "활동 간 스토리 연결"]

${RECOMMENDED_TYPE_RULES}

${STRATEGY_RULES}`,
  standard: `## 추가 출력 필드
- **반드시 \`strategy\`(string 배열 2~4개)를 포함하세요.**
- \`recommendedAdmissionType\` 필드는 출력하지 마세요 (다른 섹션에서 자동 주입됩니다).

${STRATEGY_RULES}`,
  premium: `## 추가 출력 필드
- **반드시 \`strategy\`(string 배열 2~4개)를 포함하세요.**
- \`recommendedAdmissionType\` 필드는 출력하지 마세요 (다른 섹션에서 자동 주입됩니다).

${STRATEGY_RULES}

### strategy 도출 시 admissionStrategy 결과와 일관성 유지
- 입력 데이터의 \`admissionStrategy 결과\` JSON에서 \`recommendedPath\`, \`typeStrategies[].analysis\`, \`nextSemesterStrategy\` 같은 텍스트를 핵심 키워드 단위로 분해하여 strategy bullet의 기반으로 사용합니다.
- 즉, \`admissionStrategy\` 섹션의 전략 방향과 **방향성·핵심 키워드가 일치**해야 합니다 (학생 프로필 카드의 strategy와 입시 전략 섹션이 학생에게 모순되어 보이면 안 됨).
- 다만 표현은 학생 프로필 카드용으로 짧은 bullet(20자 내외) 2~4개로 압축합니다.
- \`admissionStrategy\` 결과가 비어 있거나 추출 가능한 전략이 없으면 학생 유형 분류 결과 기반으로 자체 도출합니다.`,
};

export const buildStudentProfilePrompt = (
  input: StudentProfilePromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생 유형 분류 결과를 바탕으로 학생 프로필 섹션을 작성하세요.

## 서술 관점: 프로필 요약가
이 섹션은 **학생 전체를 한눈에 보여주는 프로필 카드**입니다. 키워드와 핵심 수치 중심으로 간결하게 작성하세요.
- 서술을 최소화하고, 유형명·캐치프레이즈·태그 등 압축적 표현을 사용하세요.

## ⛔ 다른 섹션과의 역할 경계 (필수)
- ❌ 성적 해석, 약점 진단, 합격 가능성 판단, 활동 평가 → 각각 다른 섹션에서 다룸
- ✅ 이 섹션에서 할 것: **학생 유형과 핵심 키워드의 압축적 프로필**만

## 입력 데이터

### 학생 유형 분류 결과
${input.studentTypeClassification}

### 학생 프로필
${input.studentProfile}
${
  plan === "premium" && input.admissionStrategyResult
    ? `
### admissionStrategy 결과 (strategy bullet 도출 근거)
${input.admissionStrategyResult}
`
    : ""
}
## 출력 JSON 스키마

중요: radarChart는 절대 null이면 안 됩니다. 반드시 4개의 숫자 값을 가진 객체여야 합니다.

{
  "sectionId": "studentProfile",
  "title": "학생 프로필",
  "typeName": "사회문제 해결형 탐구러",
  "typeDescription": "사회 문제에 대한 깊은 관심을 바탕으로 정책 분석과 해결 방안을 탐구하는 학생입니다.",
  "radarChart": {"academic": 75, "career": 70, "community": 65, "growth": 68},
  "tags": ["사회문제해결", "정책분석", "성적상승세", "리더십"],
  "catchPhrase": "사회 문제에 대한 통찰과 해결 의지로 꾸준히 성장하는 인재",
  "strategy": ["사회 정책 심화 탐구 1개 추가", "토론 동아리 활동 구체화", "활동 간 스토리 연결"]
}

## 단계별 추론

1. Call C에서 산출된 학생 유형 분류 결과에서 typeName, catchPhrase, tags 원본을 확인합니다.
2. Call C에서 산출된 4대 역량 점수를 radarChart의 academic, career, community, growth 키에 매핑합니다.
3. typeName과 catchPhrase를 학생에게 더 와닿는 표현으로 다듬을지 판단합니다.
4. typeDescription을 강점 역량과 특징적 활동 패턴을 포함하여 2~3줄로 작성합니다.
5. tags를 진로, 강점 역량, 성장 특성을 대표하는 3~5개로 선정합니다.

## 출력 지시

### 유형명 (typeName)
- Call C에서 산출된 유형명을 그대로 사용하거나, 학생에게 더 와닿는 표현으로 다듬습니다.
- 4~8자의 간결한 표현 (예: "탐구형 성장러", "실행형 리더")

### 유형 설명 (typeDescription)
- 학생의 핵심 특성을 2~3줄로 설명합니다.
- 강점 역량과 특징적 활동 패턴을 포함합니다.
- **전공 맥락에서의 학업 흐름**을 중심으로 서술합니다 (단순 성적이 아닌, 전공과 연결된 탐구/활동 패턴).
- 학년별 성장 흐름(관심발견→탐구활동→심화연구)이 있으면 이를 포함합니다.
- 학생이 읽었을 때 공감할 수 있는 톤으로 작성합니다.

### 레이더 차트 데이터 (radarChart)
- Call C에서 산출된 4대 역량 점수(0~100)를 그대로 사용합니다.
- 수치를 직접 계산하지 마세요.

### 핵심 키워드 태그 (tags)
- Call C에서 산출된 태그를 기반으로 3~5개를 선정합니다.
- 학생의 진로, 강점 역량, 성장 특성을 대표하는 키워드를 선택합니다.

### 한줄 캐치프레이즈 (catchPhrase)
- Call C에서 산출된 캐치프레이즈를 그대로 사용하거나 다듬습니다.
- 학생의 핵심 특성을 한 문장으로 표현합니다.

${PLAN_SPECIFIC[plan]}`;
};
