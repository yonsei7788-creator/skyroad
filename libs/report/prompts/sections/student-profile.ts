/** 섹션 1: 학생 프로필 (studentProfile) */

import type { ReportPlan } from "../../types.ts";

export interface StudentProfilePromptInput {
  studentTypeClassification: string;
  studentProfile: string;
}

export const buildStudentProfilePrompt = (
  input: StudentProfilePromptInput,
  _plan: ReportPlan
): string => {
  return `## 작업
학생 유형 분류 결과를 바탕으로 학생 프로필 섹션을 작성하세요.

## 입력 데이터

### 학생 유형 분류 결과
${input.studentTypeClassification}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 유형명 (typeName)
- Call C에서 산출된 유형명을 그대로 사용하거나, 학생에게 더 와닿는 표현으로 다듬습니다.
- 4~8자의 간결한 표현 (예: "탐구형 성장러", "실행형 리더")

### 유형 설명 (typeDescription)
- 학생의 핵심 특성을 2~3줄로 설명합니다.
- 강점 역량과 특징적 활동 패턴을 포함합니다.
- 학생이 읽었을 때 공감할 수 있는 톤으로 작성합니다.

### 레이더 차트 데이터 (radarChart)
- Call C에서 산출된 4대 역량 점수(0~100)를 그대로 사용합니다.
- 수치를 직접 계산하지 마세요.

### 핵심 키워드 태그 (tags)
- Call C에서 산출된 태그를 기반으로 3~5개를 선정합니다.
- 학생의 진로, 강점 역량, 성장 특성을 대표하는 키워드를 선택합니다.

### 한줄 캐치프레이즈 (catchPhrase)
- Call C에서 산출된 캐치프레이즈를 그대로 사용하거나 다듬습니다.
- 학생의 핵심 특성을 한 문장으로 표현합니다.`;
};
