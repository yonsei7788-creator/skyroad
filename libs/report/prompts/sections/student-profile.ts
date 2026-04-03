/** 섹션 1: 학생 프로필 (studentProfile) */

import type { ReportPlan } from "../../types.ts";

export interface StudentProfilePromptInput {
  studentTypeClassification: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- 모든 텍스트 필드를 **1~2줄 이내**로 간결하게 작성합니다.
- typeDescription은 1줄로 핵심만 서술합니다.
- catchPhrase는 간결한 한 문장으로 작성합니다.`,
  standard: "",
  premium: "",
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
- 다른 섹션에서 이미 사용한 표현이나 문장 구조를 반복하지 마세요.

## 입력 데이터

### 학생 유형 분류 결과
${input.studentTypeClassification}

### 학생 프로필
${input.studentProfile}

## 출력 JSON 스키마

중요: radarChart는 절대 null이면 안 됩니다. 반드시 4개의 숫자 값을 가진 객체여야 합니다.

{
  "sectionId": "studentProfile",
  "title": "학생 프로필",
  "typeName": "사회문제 해결형 탐구러",
  "typeDescription": "사회 문제에 대한 깊은 관심을 바탕으로 정책 분석과 해결 방안을 탐구하는 학생입니다.",
  "radarChart": {"academic": 75, "career": 70, "community": 65, "growth": 68},
  "tags": ["사회문제해결", "정책분석", "성적상승세", "리더십"],
  "catchPhrase": "사회 문제에 대한 통찰과 해결 의지로 꾸준히 성장하는 인재"
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
