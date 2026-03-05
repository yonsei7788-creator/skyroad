/** 섹션 7: 권장과목 이수 분석 (courseAlignment) */

import type { ReportPlan } from "../../types.ts";

export interface CourseAlignmentPromptInput {
  recommendedCourseMatch: string;
  competencyExtraction: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 목표 계열 + 이수율 + 이수/미이수 상세 + 미이수 영향 분석 + 이수 전략
- medicalRequirements 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- Lite의 모든 항목
- 메디컬 계열 대학별 요구사항 매칭(medicalRequirements, 해당 계열 학생만)`,
  premium: `## 플랜별 출력: 정밀
- Standard와 동일`,
};

export const buildCourseAlignmentPrompt = (
  input: CourseAlignmentPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 목표 계열 대비 권장과목 이수 상태를 분석하고 영향을 평가하세요.

## 입력 데이터

### 권장과목 매칭 데이터 (코드 전처리 결과)
${input.recommendedCourseMatch}

### 역량 추출 결과
${input.competencyExtraction}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 목표 계열 (targetMajor)
- 학생의 목표 학과/계열을 명시합니다.

### 권장과목 이수율 (matchRate)
- 코드 전처리에서 산출된 이수율(0~100)을 그대로 사용합니다.

### 이수/미이수 상세 (courses)
- 각 권장과목에 대해:
  - course: 과목명
  - status: "이수" 또는 "미이수"
  - importance: "필수" 또는 "권장"

### 미이수 과목 영향 분석 (missingCourseImpact)
- 미이수 과목이 입시에 미치는 영향을 구체적으로 서술합니다.
- 특히 학종에서 "교과 이수 노력" 평가에 미치는 영향을 분석합니다.

### 이수 전략 제안 (recommendation)
- 고1~2 학생에 해당하는 경우, 남은 학기에 이수할 과목을 제안합니다.
- 고3이거나 이미 이수 완료인 경우 생략 가능합니다.

${PLAN_SPECIFIC[plan]}`;
};
