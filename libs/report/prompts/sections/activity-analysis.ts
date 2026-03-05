/** 섹션 9: 창체 활동 분석 (activityAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface ActivityAnalysisPromptInput {
  creativeActivities: string;
  competencyExtraction: string;
  studentProfile: string;
  curriculumVersion: "2015" | "2022";
}

const COMPETENCY_TAG_GUIDE = `## 역량 태깅 가이드
사용 가능한 태그:
- 학업역량-학업성취도, 학업역량-학업태도, 학업역량-탐구력
- 진로역량-교과이수노력, 진로역량-교과성취도, 진로역량-진로탐색
- 공동체역량-나눔과배려, 공동체역량-소통및협업, 공동체역량-리더십, 공동체역량-성실성
- 발전가능성-자기주도성, 발전가능성-경험다양성, 발전가능성-성장과정, 발전가능성-창의적문제해결`;

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 영역별(자율·자치/동아리/진로) 학년별 요약 + 등급(excellent/good/average/weak) + 역량 태그 + 종합 코멘트
- volumeAssessment, keyActivities, improvementDirection 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- Lite의 모든 항목
- 기록 분량 평가(volumeAssessment) + 핵심 활동 상세(keyActivities) + 개선 방향(improvementDirection)`,
  premium: `## 플랜별 출력: 정밀
- Standard와 동일 (창체는 Standard 수준으로 충분)`,
};

export const buildActivityAnalysisPrompt = (
  input: ActivityAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 창의적 체험활동(창체)을 영역별로 분석하세요.

## 교육과정 버전 확인
- 2015 개정 교육과정: 자율활동, 동아리활동, 봉사활동, 진로활동 (4영역)
- 2022 개정 교육과정: 자율·자치활동, 동아리활동, 진로활동 (3영역, 봉사활동 분리)
- 학생의 교육과정 버전: ${input.curriculumVersion}
- 해당 교육과정의 영역 구분에 맞춰 분석합니다.

## 규칙
1. 창체만 분석합니다 (교과 세특은 subjectAnalysis에서 별도 분석).
2. 각 영역의 특성에 맞는 평가 관점을 적용합니다:
   - 자율·자치: 학교 행사 참여, 자치 활동, 주도적 기획
   - 동아리: 전공 관련성, 활동의 지속성과 깊이, 성과
   - 진로: 진로 탐색의 구체성, 체험 활동의 질, 진로 일관성
3. 학년별 변화와 심화 과정을 분석합니다.
4. 기록 분량(바이트 수)도 평가 요소로 고려합니다.

${COMPETENCY_TAG_GUIDE}

## 입력 데이터

### 창체 원문 데이터
${input.creativeActivities}

### 역량 추출 결과
${input.competencyExtraction}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
