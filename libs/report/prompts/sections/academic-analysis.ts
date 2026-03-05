/** 섹션 6: 성적 분석 (academicAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface AcademicAnalysisPromptInput {
  quantitativeAnalysis: string;
  preprocessedAcademicData: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 공통 항목(전과목 평균, 학년별 평균, 교과 조합별 평균, 등급 추이, 과목별 등급, 해석)을 출력합니다.
- 간단 해석 (3~5줄)만 포함합니다.
- Standard+ 전용 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
공통 항목에 추가로 다음을 출력합니다:
- 과목별 원점수-평균-표준편차 실질 위치 분석 (subjectStatAnalyses)
- 과목 간 편차 리스크 (gradeDeviationAnalysis)
- 전공 관련 교과 이수 노력/성취도 (majorRelevanceAnalysis)
- 고교 유형별 환산 (schoolTypeAdjustment)
- 등급 변화 가능성 (gradeChangeAnalysis)
- 진로선택과목 분석 (careerSubjectAnalyses)
- 소인수 과목 분석 (smallClassSubjectAnalyses)
- 성적 인플레이션 맥락 (gradeInflationContext)`,
  premium: `## 플랜별 출력: 정밀
Standard의 모든 항목에 추가로 다음을 출력합니다:
- 5등급제 전환 시뮬레이션 (fiveGradeSimulation)
- 대학별 반영 방법 시뮬레이션 (universityGradeSimulations)
- 성적 개선 우선순위 (improvementPriority)`,
};

export const buildAcademicAnalysisPrompt = (
  input: AcademicAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
정량 분석 결과를 바탕으로 학생의 교과 성적에 대한 해석과 전략적 분석을 작성하세요.

## 입력 데이터

### 정량 분석 결과
${input.quantitativeAnalysis}

### 성적 전처리 결과 (코드 계산 완료)
${input.preprocessedAcademicData}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 전 플랜 공통
- 전과목 평균 등급 (overallAverageGrade)
- 학년/학기별 평균 등급 (gradesByYear)
- 주요 교과 조합별 평균 (subjectCombinations: 국수영사, 국수영과 등)
- 학년별 등급 추이 (gradeTrend: 상승/유지/하락)
- 과목별 등급 요약 테이블 (subjectGrades)
- 간단 해석 (interpretation: 성적 추이와 특징 요약)

${PLAN_SPECIFIC[plan]}`;
};
