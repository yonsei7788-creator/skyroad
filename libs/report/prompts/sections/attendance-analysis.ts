/** 섹션 8: 출결 분석 (attendanceAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface AttendanceAnalysisPromptInput {
  attendanceSummary: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 출결 요약 + 전체 평가 + 영향 분석 + 성실성 기여도
- improvementAdvice 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- Lite의 모든 항목
- 개선 방향(improvementAdvice): 주의/경고일 때 구체적 개선 조언`,
  premium: `## 플랜별 출력: 정밀
- Standard와 동일`,
};

export const buildAttendanceAnalysisPrompt = (
  input: AttendanceAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 출결 데이터를 분석하고 입시에 미치는 영향을 평가하세요.

## 중요: 수치 계산 금지
- 아래 제공된 출결 데이터는 코드에서 정규화된 결과입니다.
- 이 수치를 그대로 인용하여 해석에 활용하세요.

## 입력 데이터

### 출결 데이터 (코드 전처리 결과)
${input.attendanceSummary}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 학년별 출결 요약 (summaryByYear)
- 각 학년의 출결 현황을 정리합니다:
  - year: 학년
  - totalAbsence: 총 결석일
  - illness: 질병 결석
  - unauthorized: 미인정 결석
  - etc: 기타 결석
  - lateness: 지각
  - earlyLeave: 조퇴

### 전체 평가 (overallRating)
다음 기준으로 평가합니다:
| 등급 | 기준 |
|------|------|
| 우수 | 미인정 결석 0, 총 결석 3일 이하 |
| 양호 | 미인정 결석 0, 총 결석 10일 이하 |
| 주의 | 미인정 결석 1~2일 또는 총 결석 11~20일 |
| 경고 | 미인정 결석 3일 이상 또는 총 결석 20일 초과 |

### 출결이 입시에 미치는 영향 (impactAnalysis)
- 학종, 교과전형에서 출결이 어떻게 반영되는지 분석합니다.
- 질병 결석은 일반적으로 감점 요인이 아님을 명시합니다.
- 미인정 결석/지각이 있는 경우 구체적 영향을 서술합니다.

### 성실성 점수 기여도 (integrityContribution)
- 출결이 공동체역량(성실성) 평가에 어떻게 기여하는지 분석합니다.

${PLAN_SPECIFIC[plan]}`;
};
