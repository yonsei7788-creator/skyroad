/** 섹션 2: 역량 정량 스코어 (competencyScore) */

import type { ReportPlan } from "../../types.ts";

export interface CompetencyScorePromptInput {
  studentTypeClassification: string;
  competencyExtraction: string;
  preprocessedAcademicData: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력
- 총점 + 역량별 점수 + 하위항목 점수 + 발전가능성 등급 + 점수 해석만 출력합니다.
- percentile, percentileLabel, comparison 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력
- 총점 + 역량별 점수 + 하위항목 점수 + 발전가능성 등급 + 점수 해석을 출력합니다.
- 추가로 백분위 추정(percentile), 백분위 라벨(percentileLabel), 비교 데이터(comparison: 내 점수 vs 지원적정구간 평균 vs 전체 평균)를 포함합니다.`,
  premium: `## 플랜별 출력
- 총점 + 역량별 점수 + 하위항목 점수 + 발전가능성 등급 + 점수 해석을 출력합니다.
- 추가로 백분위 추정(percentile), 백분위 라벨(percentileLabel), 비교 데이터(comparison: 내 점수 vs 지원적정구간 평균 vs 전체 평균)를 포함합니다.`,
};

export const buildCompetencyScorePrompt = (
  input: CompetencyScorePromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 역량을 300점 만점 체계로 정량 평가하고, 발전가능성은 별도 등급으로 평가하세요.

## 점수 체계
- 총점: 학업역량(100) + 진로역량(100) + 공동체역량(100) = 300점 만점
- 발전가능성: 총점에 미포함, S/A/B/C/D 등급으로 별도 표시

## 입력 데이터

### 학생 유형 분류 결과 (점수 기반)
${input.studentTypeClassification}

### 역량 추출 결과
${input.competencyExtraction}

### 성적 전처리 결과
${input.preprocessedAcademicData}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 총점 (totalScore)
- 학업 + 진로 + 공동체 3개 역량 점수의 합산 (0~300)
- Call C의 radarChart 점수를 기반으로 산출합니다.

### 발전가능성 등급 (growthGrade)
- Call C의 growth 점수를 기반으로 S/A/B/C/D 등급 부여
- 등급에 대한 1~2줄 코멘트 포함

### 역량별 점수 상세 (scores)
학업역량, 진로역량, 공동체역량 각각에 대해:
- 역량 총점 (0~100)
- 하위항목별 점수, 만점, 코멘트

#### 학업역량 하위항목:
| 항목 | 만점 | 설명 |
|------|------|------|
| 학업성취도 | 40 | 내신 등급, 추이, 실질 위치 |
| 학업태도 | 20 | 수업 참여, 자기주도 학습 |
| 탐구력 | 40 | 탐구 깊이, 확장성, 과정 중심 |

#### 진로역량 하위항목:
| 항목 | 만점 | 설명 |
|------|------|------|
| 교과 이수 노력 | 30 | 권장과목 이수, 공동교육과정 |
| 교과 성취도 | 30 | 전공 관련 과목 성적 |
| 진로 탐색 활동 | 40 | 진로 일관성, 활동 깊이 |

#### 공동체역량 하위항목:
| 항목 | 만점 | 설명 |
|------|------|------|
| 나눔과 배려 | 25 | 타인 도움, 배려 사례 |
| 소통 및 협업 | 25 | 모둠/토론/팀 활동 |
| 리더십 | 25 | 임원, 주도적 역할 |
| 성실성 | 25 | 출결, 역할 이행 |

### 점수 해석 (interpretation)
- 총점이 의미하는 바를 2~3줄로 해석합니다.
- 강점 역량과 보완 필요 역량을 명시합니다.

${PLAN_SPECIFIC[plan]}`;
};
