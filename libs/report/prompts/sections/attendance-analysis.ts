/** 섹션 8: 출결 분석 (attendanceAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface AttendanceAnalysisPromptInput {
  attendanceSummary: string;
  studentProfile: string;
  studentGrade: number;
  /** 졸업생 여부 — 출결이 이미 확정이므로 개선 조언 금지 */
  isGraduate?: boolean;
  /**
   * 생기부가 더 이상 바뀔 수 없는 상태 — 졸업생이거나, 3학년 1학기까지만
   * 데이터가 있고 7월 이후(1학기 기말고사 종료)인 경우 true.
   */
  isRecordFinalized?: boolean;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 출결 요약 + 전체 평가 + 영향 분석 + 성실성 기여도
- improvementAdvice 필드는 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- impactAnalysis는 반드시 **250자 이내**로 작성합니다. 250자 초과 금지.
- integrityContribution은 **150자 이내**로 작성합니다.`,
  standard: `## 플랜별 출력: 상세
- Lite의 모든 항목
- 개선 방향(improvementAdvice): 주의/경고일 때 구체적 개선 조언

⚠️ **분량 제한 (반드시 준수)**:
- impactAnalysis는 반드시 **250자 이내**로 작성합니다. 250자 초과 금지.
- integrityContribution은 **150자 이내**로 작성합니다.
- improvementAdvice는 **150자 이내**로 작성합니다.`,
  premium: `## 플랜별 출력: 정밀
- Standard와 동일하되, 학년별 추이를 포함합니다.

⚠️ **분량 제한 (반드시 준수)**:
- impactAnalysis는 반드시 **250자 이내**로 작성합니다. 250자 초과 금지.
- integrityContribution은 **150자 이내**로 작성합니다.
- 학년별 추이를 포함하되 간결하게 서술하세요.`,
};

export const buildAttendanceAnalysisPrompt = (
  input: AttendanceAnalysisPromptInput,
  plan: ReportPlan
): string => {
  const isLocked = input.isGraduate || input.isRecordFinalized;
  const statusLabel = input.isGraduate
    ? "졸업생"
    : "생기부가 최종 확정된 3학년";
  return `## 작업
${isLocked ? `이 학생은 **${statusLabel}**입니다. 출결이 이미 확정되었으므로 면접·지원 전략 관점에서만 영향을 평가하세요.` : `이 학생은 현재 **${input.studentGrade}학년**입니다. 이 학년에 맞는 분석과 제안을 하세요.`}

학생의 출결 데이터를 분석하고 입시에 미치는 영향을 평가하세요.${isLocked ? `\n\n## ⚠️ 생기부 확정 규칙 (최우선)\n이 학생은 **${statusLabel}**입니다. 출결은 이미 확정이므로 개선 조언을 절대 하지 마세요.\n- improvementAdvice 필드는 overallRating에 관계없이 **반드시 빈 문자열("")**로 출력하세요.\n- impactAnalysis, integrityContribution에서도 "앞으로", "남은 기간", "개선", "보완" 같은 미래형·개선형 표현을 사용하지 마세요.\n- 출결이 좋지 않다면 "면접 시 자기소개·태도 측면에서 설명을 보강하면 좋습니다" 같은 면접 활용 관점으로만 서술하세요.` : ""}

## 서술 관점: 출결 기록 분석가
이 섹션은 **출석 데이터의 입시 영향도**를 객관적으로 평가합니다. 출결 수치와 그 의미를 중심으로 서술하세요.
- "미인정 결석 N일로 ~에 해당한다", "출결 기록상 ~으로 판단된다" 등 기록 기반 어투를 사용하세요.

## ⛔ 다른 섹션과의 역할 경계 (필수)
- ❌ 성적·등급 언급 → academicAnalysis에서 다룸
- ❌ 합격 가능성 판단 → admissionPrediction에서 다룸
- ✅ 이 섹션에서 할 것: **출결 데이터의 사실적 해석과 입시 영향도**만 평가

## ⛔ 출결 해석 prism (절대 규칙)
- ✅ 출결은 **오직 성실도·규칙 준수·책임감·학교생활 적응** 측면에서만 해석합니다.
- ✅ 출결이 좋을 때의 권장 표현 톤: "성실성 평가에서 긍정적 근거가 됩니다", "교과전형 출결 감점 여부 측면에서 ~합니다", "공동체역량의 성실성 항목에서 ~로 평가받을 가능성이 높습니다".
- ⚠️ 출결은 입시 평가 지표일 뿐입니다. 학생의 신체·정신·생활 전반에 대한 진술 근거로 사용하지 마세요.
- ⚠️ 결석·지각의 사유는 데이터에 명시된 분류(미인정/질병/기타)만 사실대로 서술하고, 그 외 사유를 추측하지 마세요.

## 중요: 수치 계산 금지
- 아래 제공된 출결 데이터는 코드에서 정규화된 결과입니다.
- 이 수치를 그대로 인용하여 해석에 활용하세요.

## 입력 데이터

### 출결 데이터 (코드 전처리 결과)
${input.attendanceSummary}

### 학생 프로필
${input.studentProfile}

## 출력 JSON 스키마

중요: summaryByYear 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "attendanceAnalysis",
  "title": "출결 분석",
  "summaryByYear": "<입력 attendanceSummary에 실제로 존재하는 학년만 객체로 변환 (각 객체: {year, totalAbsence, illness, unauthorized, etc, lateness, earlyLeave}). 입력에 없는 학년은 출력에도 포함하지 않음>",
  "overallRating": "<우수|보통|주의|경고 중 하나, 아래 기준표대로 선택>",
  "impactAnalysis": "<입력 attendanceSummary에 존재하는 학년의 수치만 인용하여 입시 영향을 서술>",
  "integrityContribution": "<출결 기록을 성실성 평가 측면에서 서술>",
  "improvementAdvice": "<주의/경고 시 개선 조언, 우수/보통 시 빈 문자열. ⚠️ 졸업생이면 overallRating 무관하게 반드시 빈 문자열>"
}

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

### 전체 평가 (overallRating) — 필수, 절대 빈 문자열 금지
반드시 아래 4개 값 중 하나를 출력하세요:
| 등급 | 기준 |
|------|------|
| 우수 | 미인정 결석 0, 총 결석 3일 이하 |
| 보통 | 미인정 결석 0, 총 결석 10일 이하 |
| 주의 | 미인정 결석 1~2일 또는 총 결석 11~20일 |
| 경고 | 미인정 결석 3일 이상 또는 총 결석 20일 초과 |

### 출결이 입시에 미치는 영향 (impactAnalysis)
- 학종, 교과전형에서 출결이 어떻게 반영되는지 분석합니다.
- 질병 결석은 일반적으로 감점 요인이 아님을 명시합니다.
- 미인정 결석/지각이 있는 경우 구체적 영향을 서술합니다.
- ⚠️ 위 "출결 해석 prism" 규칙을 그대로 따라 입시 평가 측면으로만 서술합니다.
- ⚠️ **합격 가능성 단정 표현은 사용하지 않습니다.** 출결은 감점 여부만 판단할 수 있을 뿐, 출결만으로 합격 안정성을 결론지을 수는 없습니다.
  - ❌ "안정적인 지원이 가능합니다", "차별화 포인트로 작용할 겁니다", "합격선 대비 여유" — 합격 가능성 단정 (admissionPrediction 영역)
  - ✅ "교과전형 출결 감점 요인이 없습니다."
  - ✅ "성실성 평가에서 긍정적 근거가 됩니다."
  - ✅ "공동체역량의 성실성 항목에서 안정적인 기록입니다."

### 성실성 점수 기여도 (integrityContribution)
- 출결이 공동체역량(성실성) 평가에 어떻게 영향을 주는지 분석합니다.
- ⚠️ 시스템 프롬프트의 개근/출결 평가 기준을 반드시 적용하세요 (3년 개근 불가, 출결만으로 성실성 최고 평가 금지).
- ⚠️ **성실도 측면에서 좋은 평가를 받을 수 있다**는 취지로만 서술합니다.
- ⚠️ "차별화 포인트로 작용할 겁니다", "다른 지원자와 차별화" 류 합격 가능성 단정 표현은 사용하지 않습니다. "성실성 평가에서 긍정적 근거" 정도로만 서술합니다.

${PLAN_SPECIFIC[plan]}`;
};
