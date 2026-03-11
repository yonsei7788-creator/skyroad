/** 섹션 13: 부족한 부분 + 보완 전략 (weaknessAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface WeaknessAnalysisPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- **3개** 부족 영역을 출력합니다.
- 각 영역: area + description(**2줄 이내**) + suggestedActivities(**1개만**)
- evidence, competencyTag, priority 필드는 출력하지 않습니다.

## 분량 가이드
- 핵심 약점 3개. A4 1페이지 이내.`,
  standard: `## 플랜별 출력: 상세
- 각 영역: area + description + suggestedActivities + evidence(상세 근거) + competencyTag(역량 매핑) + priority(보완 우선순위 high/medium/low)

⚠️ **분량 제한 (반드시 준수)**:
- areas 배열은 **최대 3개**입니다. 4개 이상 절대 출력하지 마세요.
- 각 description은 반드시 **100자 이내**로 작성합니다. 100자 초과 금지.
- 각 suggestedActivities의 항목은 **150자 이내**로 작성합니다.
- evidence는 **100자 이내**로 작성합니다.`,
  premium: `## 플랜별 출력: 정밀
- Standard의 모든 항목 + urgency(시급도) + effectiveness(효과도) 매트릭스 + executionStrategy(실행 전략, 2줄 이내) + subjectLinkStrategy(진로-선택과목 연계 전략, 1줄)

⚠️ **분량 제한 (반드시 준수)**:
- areas 배열은 **최대 5개**입니다. 6개 이상 절대 출력하지 마세요.
- 각 description은 반드시 **150자 이내**로 작성합니다. 150자 초과 금지.
- 각 suggestedActivities의 항목은 **250자 이내**로 작성합니다.
- executionStrategy는 **150자 이내**, subjectLinkStrategy는 **80자 이내**로 작성합니다.`,
};

export const buildWeaknessAnalysisPrompt = (
  input: WeaknessAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부에서 부족한 부분을 구체적으로 식별하고 보완 방향을 제시하세요.

## 단계별 분석 절차
1. **역량 추출 결과에서 "미흡"/"부족" 평가 항목 식별**: 4대 역량(학업/진로/공동체/발전가능성) 각각에서 점수가 낮거나 부족 판정을 받은 하위항목을 나열합니다.
2. **부족 유형 체크리스트와 매칭**: 아래 체크리스트의 8가지 유형 중 학생에게 해당하는 유형을 매칭합니다.
3. **성적-세특 교차분석 수행**: 성적 데이터와 세특 평가 간 불일치를 찾아 추가 약점을 식별합니다.
4. **우선순위 결정**: 입시 영향도(high/medium/low)와 개선 가능성을 기준으로 priority를 배정합니다.
5. **보완 활동 설계**: 각 약점에 대해 고등학생이 실제 수행 가능한 구체적 활동을 제안합니다.

## 출력 JSON 스키마

중요: areas 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "weaknessAnalysis",
  "title": "부족한 부분 + 보완 전략",
  "areas": [
    {
      "area": "탐구 깊이 부족",
      "description": "세특에서 '조사함', '발표함'으로 끝나는 기록이 다수 발견되며...",
      "suggestedActivities": ["탐구 보고서 작성 시 가설-실험-결론 구조를 갖추기", "교과 내 소논문 작성"],
      "evidence": "2학년 사회·문화 세특에서 '복지 정책을 조사하고 발표함'이라고만...",
      "competencyTag": {"category": "academic", "subcategory": "탐구력"},
      "priority": "high",
      "urgency": "high",
      "effectiveness": "high",
      "executionStrategy": "3학년 1학기 세특에서 탐구 과정을 구체적으로...",
      "subjectLinkStrategy": "사회·문화와 정치와법 연계 탐구..."
    }
  ]
}

플랜별로 불필요한 필드는 생략하되, areas의 각 요소는 반드시 위와 같은 객체여야 합니다.

## 부족 유형 체크리스트
다음 유형의 약점이 존재하는지 확인하고, 해당되는 경우 포함하세요:

| 유형 | 설명 |
|------|------|
| 탐구 깊이 부족 | "조사함", "발표함"으로 끝나고 구체적 탐구 내용 없음 |
| 나열식 서술 | 여러 활동을 깊이 없이 나열, 핵심 탐구 불명확 |
| 추상적 결론 | "흥미를 느낌", "유익했음" 등 일반적 소감으로 마무리 |
| 과목 간 연결 부재 | 같은 주제를 다른 과목에서 다루면서 연결성 미언급 |
| 전공 부적합 | 진로와 관련 없는 활동이 과다, 전공 연관성 부족 |
| 성적-세특 불일치 | 성적은 낮은데 세특은 우수하다고 서술되는 모순 |
| 과목다운 세특 부재 | 과목 본질과 무관한 소재만 활용, 교과 특성이 드러나지 않음 |
| 주제 반복 without 심화 | 같은 주제가 여러 과목에서 반복되지만 깊이가 동일 수준에 머무름 |

## 성적-세특 교차분석 규칙
- 성적이 낮은데 세특 평가가 우수한 경우: 사정관이 의구심을 가질 수 있음을 지적
- 성적이 높은데 세특이 빈약한 경우: 학업역량은 있으나 탐구 어필이 안 되는 것이 약점
- 전공 관련 과목 성적이 비관련 과목보다 낮은 경우: 진로역량에 감점 요인
- 이 교차분석 결과를 부족 영역 식별에 반영하세요.

## 외부 활동 보완 제안 금지
- suggestedActivities에 학원, 온라인 강좌, 외부 대회, 사설 프로그램 등 학교 밖 활동을 절대 포함하지 마세요.
- 보완 활동은 반드시 교과 수업, 창체, 교내 활동 범위 내에서만 제안합니다.

## 우선순위 정렬 규칙
- areas 배열은 반드시 priority 기준 내림차순으로 정렬합니다: high → medium → low 순서.
- 입시 영향도가 높은 약점이 먼저 노출되어야 합니다.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
