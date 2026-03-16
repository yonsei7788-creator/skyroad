/** 섹션 20: AI 전공 추천 (majorExploration) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface MajorExplorationPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: "",
  standard: `## 플랜별 출력: 상세
- 현재 목표 평가(currentTargetAssessment) + AI 추천 전공 3~5개
- 각 전공: major + fitScore + rationale + strengthMatch
- university, gapAnalysis 필드는 출력하지 않습니다.`,
  premium: `## 플랜별 출력: 정밀
- 현재 목표 평가 + AI 추천 전공 **3개** (초과 금지)
- Standard의 모든 항목 + 대학 추천 연계(university) + 보완 분석(gapAnalysis, 1줄)
- rationale은 2줄 이내로 간결하게 서술`,
};

export const buildMajorExplorationPrompt = (
  input: MajorExplorationPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 역량과 활동 이력을 분석하여 적합한 전공/학과를 추천하세요.

## ⚠️ 분석 방향 원칙
⚠️ 희망 대학/학과는 참고 정보일 뿐입니다. 전공 추천은 반드시 생기부 데이터 자체에서 도출된 강점과 특성을 기반으로 해야 하며, 희망 학과에 끼워맞추려 해서는 안 됩니다.
- 희망 학과가 있더라도 추천 전공 목록을 희망 학과 위주로 구성하면 안 됩니다.
- 생기부에서 실제로 드러나는 역량, 탐구 깊이, 활동 일관성을 기준으로 적합 전공을 독립적으로 판단하세요.
- 희망 학과에 대해서는 currentTargetAssessment에서 적합도를 솔직하게 평가하되, suggestions 목록은 생기부 기반으로 구성하세요.

## 출력 JSON 스키마

중요: suggestions 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "majorExploration",
  "title": "학과 탐색",
  "currentTargetAssessment": "현재 목표인 행정학과는 학생의 사회 문제 관심과...",
  "suggestions": [
    {
      "major": "행정학과",
      "university": "서울대학교",
      "fitScore": 85,
      "rationale": "사회 문제 해결에 대한 지속적 관심과 정책 분석 경험이...",
      "strengthMatch": ["사회 문제 분석 역량", "정책 비교 탐구 경험", "리더십"],
      "gapAnalysis": "통계적 분석 역량 보완 필요"
    }
  ]
}

**조건부 필드 규칙:**
- 학생 프로필에 목표 학과(targetDepartment)가 있으면 → currentTargetAssessment를 생성하여 적합도 평가를 서술
- 학생 프로필에 목표 학과가 없으면 → currentTargetAssessment는 null로 설정

**strengthMatch 형식 주의:** 문자열이 아닌 문자열 배열(string[])입니다. 각 매칭 포인트를 개별 항목으로 분리하세요.

## ⛔ 추천 기준 (최우선 — 생기부 기반 필수)
1. **세특에서 가장 많이, 깊게 탐구한 분야**가 추천 전공의 1순위입니다.
2. **창체/동아리/진로활동에서 일관되게 나타나는 관심 분야**가 2순위입니다.
3. 학생이 이수한 교과 선택이 해당 전공의 핵심 권장과목과 일치하는지 확인합니다.
4. 학생의 성적 수준에서 경쟁력이 있는 전공을 고려합니다.
5. 학생이 미처 고려하지 못한 **관련** 전공도 제안합니다 (단, 생기부 내용과 연결되어야 함).

⚠️ **절대 금지**: 생기부의 **주된 방향**과 다른 전공을 추천하면 안 됩니다.
- 생기부에서 가장 많은 비중을 차지하는 2~3개 분야를 먼저 식별하세요.
- 추천 전공 3개 중 **최소 2개는 반드시 이 주된 분야**에서 나와야 합니다.
- 세특에서 한두 문장 언급된 수준의 분야를 전공으로 추천하면 안 됩니다.
  - BAD: 체육/교육 생기부인데 "다윈 진화론 한 번 언급" → 생명과학과 추천
  - GOOD: 체육/교육 생기부 → 체육교육과, 스포츠과학과, 교육학과 추천
- 추천 전공은 반드시 생기부에서 **3개 이상의 구체적 근거**(세특 주제, 활동명, 탐구 키워드)를 인용하여 정당화하세요. 근거가 3개 미만이면 해당 전공을 추천하지 마세요.
- fitScore가 70점 미만인 전공은 추천하지 마세요.

### fitScore 산정 시 가중치
- 세특/창체에서의 전공 관련 탐구 깊이: 40%
- 교과 선택의 전공 적합성: 25%
- 역량 프로필 매칭: 20%
- 성적 경쟁력: 15%

## 규칙
- 학생의 현재 목표 학과가 있다면 그에 대한 평가(currentTargetAssessment)를 먼저 제공합니다.
- 각 추천 전공에 대해 적합도 점수(0~100)와 근거를 포함합니다.
- 학생의 강점과 매칭되는 포인트(strengthMatch)를 명시합니다.
- 보완이 필요한 부분(gapAnalysis)도 솔직하게 제시합니다.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
