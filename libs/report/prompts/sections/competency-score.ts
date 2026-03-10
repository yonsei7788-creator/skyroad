/** 섹션 2: 역량 정량 스코어 (competencyScore) */

import type { ReportPlan } from "../../types.ts";

export interface CompetencyScorePromptInput {
  studentTypeClassification: string;
  competencyExtraction: string;
  preprocessedAcademicData: string;
  attendanceSummary: string;
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

### 출결 데이터 (성실성 채점 시 필수 참조)
${input.attendanceSummary}

### 학생 프로필
${input.studentProfile}

## 출력 JSON 스키마

중요: scores 배열은 반드시 3개의 완전한 객체(academic, career, community)를 포함해야 합니다. 문자열 배열 절대 금지.
subcategories도 반드시 객체 배열이어야 합니다. comparison은 null이 아닌 객체로 출력하세요.

{
  "sectionId": "competencyScore",
  "title": "역량 점수",
  "totalScore": 210,
  "growthGrade": "B",
  "growthComment": "학년별 성장이 보이나 심화 단계에서 추가 발전 필요...",
  "scores": [
    {
      "category": "academic",
      "label": "학업역량",
      "score": 75,
      "maxScore": 100,
      "subcategories": [
        {"name": "학업성취도", "score": 30, "maxScore": 40, "comment": "내신 평균 2.5등급으로..."},
        {"name": "학업태도", "score": 15, "maxScore": 20, "comment": "수업 참여도가 높으며..."},
        {"name": "탐구력", "score": 30, "maxScore": 40, "comment": "탐구 주제가 구체적이며..."}
      ],
      "grade": "A",
      "gradeComment": "학업 성취도와 탐구력이 균형있게..."
    },
    {
      "category": "career",
      "label": "진로역량",
      "score": 70,
      "maxScore": 100,
      "subcategories": [
        {"name": "교과이수노력", "score": 20, "maxScore": 30, "comment": "전공 관련 과목 이수율이..."},
        {"name": "교과성취도", "score": 25, "maxScore": 30, "comment": "전공 관련 과목 성적이..."},
        {"name": "진로탐색", "score": 25, "maxScore": 40, "comment": "진로 방향이 일관되며..."}
      ],
      "grade": "B",
      "gradeComment": "진로 방향은 명확하나..."
    },
    {
      "category": "community",
      "label": "공동체역량",
      "score": 65,
      "maxScore": 100,
      "subcategories": [
        {"name": "나눔과배려", "score": 15, "maxScore": 25, "comment": "또래 학습 도움 사례가..."},
        {"name": "소통및협업", "score": 18, "maxScore": 25, "comment": "모둠 활동에서..."},
        {"name": "리더십", "score": 17, "maxScore": 25, "comment": "학급 임원 경험이..."},
        {"name": "성실성", "score": 15, "maxScore": 25, "comment": "출결이 양호하며..."}
      ],
      "grade": "B",
      "gradeComment": "공동체 활동 참여는 있으나..."
    }
  ],
  "interpretation": "총점 210점으로 학업역량이 가장 강한 편이며...",
  "percentile": 65,
  "percentileLabel": "상위 35%",
  "comparison": {"myScore": 210, "targetRangeAvg": 230, "overallAvg": 180}
}

## 단계별 채점 절차

1. Call C의 radarChart에서 academic, career, community 점수를 각 역량의 총점(score)으로 확정합니다.
2. 각 역량 내 하위항목 점수를 배분합니다. 하위항목 점수의 합 = 해당 역량 총점이어야 합니다.
3. 각 하위항목에 대해 근거 기반 코멘트를 **1줄(50~80자)** 로 간결하게 작성합니다.
4. 역량별 등급(grade)을 부여합니다: S(90~100), A(75~89), B(60~74), C(40~59), D(0~39).
5. growthGrade는 Call C의 growth 점수 기반으로 같은 등급 기준을 적용합니다.
6. totalScore = academic.score + career.score + community.score 으로 합산합니다.
7. interpretation에 총점의 의미, 강점 역량, 보완 필요 역량을 서술합니다.

⚠️ **데이터 정합성 규칙**: 코멘트에서 언급하는 내신 등급, 평균 등은 반드시 성적 전처리 결과의 "overallAverage" 값과 일치해야 합니다. 전처리 데이터에 없는 수치를 임의로 생성하지 마세요.

## 주의: category 값은 반드시 영문
- scores 배열의 category는 반드시 "academic", "career", "community" (영문)을 사용합니다.
- label은 "학업역량", "진로역량", "공동체역량" (한글)을 사용합니다.

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
- 역량 등급 (grade: S/A/B/C/D) + 등급 사유 (gradeComment: **1~2줄, 100자 이내**)

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

⚠️ **성실성 채점 시 출결 데이터 필수 반영:**
- 미인정(무단) 결석이 있으면 반드시 감점합니다. 절대 "무단결석 없음"이라고 작성하지 마세요.
- 미인정 결석 감점 기준: 연간 1~2일 → -3점, 3~5일 → -8점, 6~10일 → -13점, 11일+ → -18점 이상
- 출결 데이터에 unauthorized(미인정) 항목이 0보다 크면, 코멘트에 반드시 미인정 결석 일수를 명시하세요.
- 질병 결석은 감점하지 않습니다.

### 점수 해석 (interpretation)
- 총점이 의미하는 바를 2~3줄로 해석합니다.
- 강점 역량과 보완 필요 역량을 명시합니다.

${PLAN_SPECIFIC[plan]}`;
};
