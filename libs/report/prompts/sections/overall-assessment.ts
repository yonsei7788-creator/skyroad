/** 섹션 12: 기록 충실도 종합 (overallAssessment) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface OverallAssessmentPromptInput {
  recordVolumeData: string;
  competencyExtraction: string;
  studentProfile: string;
}

export const buildOverallAssessmentPrompt = (
  input: OverallAssessmentPromptInput,
  _plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부 전체 기록 분량과 충실도를 종합 평가하세요.

## 입력 데이터

### 기록 분량 데이터 (코드 전처리 결과)
${input.recordVolumeData}

### 역량 추출 결과
${input.competencyExtraction}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 항목별 기록 분량 분석 (volumeAnalysis)
각 항목에 대해:
- category: 항목명 (예: "교과 세특", "자율활동", "동아리활동", "진로활동", "행동특성")
- maxCapacity: 최대 허용 분량 (예: "과목당 500자(1500바이트)")
- actualVolume: 실제 기록 분량 (예: "평균 420자")
- fillRate: 채움률 (0~100, 코드에서 산출된 값 사용)
- assessment: 분량 평가 코멘트 (1줄)

### 전체 기록 충실도 (overallFillRate)
- 전체 항목의 평균 채움률 (0~100)

### 분량 대비 질 평가 (qualityAssessment)
- 분량이 많다고 반드시 좋은 것은 아닙니다.
- 분량 대비 내용의 질을 평가합니다:
  - 분량 많고 질 좋음: "기록 충실도 우수"
  - 분량 많으나 질 낮음: "형식적 채움, 내용 보강 필요"
  - 분량 적으나 질 좋음: "핵심에 집중된 기록"
  - 분량 적고 질 낮음: "기록 보강 시급"

### 경쟁력 종합 요약 (competitivenessSum)
- 학업/진로/공동체/발전가능성 각 역량에 대해 한 줄씩 경쟁력을 요약합니다.

### 최종 종합 의견 (finalComment)
- 생기부 전체의 경쟁력을 3~5줄로 종합합니다.
- 강점과 보완점을 균형 있게 서술합니다.`;
};
