/** 섹션 9: 창체 활동 분석 (activityAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface ActivityAnalysisPromptInput {
  creativeActivities: string;
  competencyExtraction: string;
  studentProfile: string;
  curriculumVersion: "2015" | "2022";
}

const COMPETENCY_TAG_GUIDE = `## 역량 태깅 가이드
역량 태그는 반드시 아래의 객체 형식으로 출력합니다 (문자열 형식 사용 금지):
\`\`\`json
{ "category": "<영문 카테고리>", "subcategory": "<한글 하위항목>" }
\`\`\`

사용 가능한 태그:
| category     | subcategory 예시                                    |
|-------------|---------------------------------------------------|
| "academic"  | "학업성취도", "학업태도", "탐구력"                    |
| "career"    | "교과이수노력", "교과성취도", "진로탐색"              |
| "community" | "나눔과배려", "소통및협업", "리더십", "성실성"         |
| "growth"    | "자기주도성", "경험다양성", "성장과정", "창의적문제해결" |`;

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- 영역별(자율·자치/동아리/진로) 학년별 요약 + 등급(excellent/good/average/weak) + 역량 태그 + 종합 코멘트
- 각 영역별 yearlyAnalysis의 summary를 **2줄 이내**로 간결 작성합니다.
- rating과 competencyTags만 포함합니다.
- volumeAssessment, keyActivities, improvementDirection 필드는 출력하지 않습니다.

## 분량 가이드
- 핵심 활동 3개 이내로 요약. A4 1페이지 이내.`,
  standard: `## 플랜별 출력: 상세
- Lite의 모든 항목
- 기록 분량 평가(volumeAssessment) + 핵심 활동 상세(keyActivities) + 개선 방향(improvementDirection)

⚠️ **분량 제한 (반드시 준수)**:
- activities 배열은 **최대 4개**입니다. 5개 이상 절대 출력하지 마세요.
- 각 activity의 overallComment은 **150자 이내**, improvementDirection은 **100자 이내**로 작성합니다.
- keyActivities의 각 evaluation은 **100자 이내**로 작성합니다.
- keyActivities 배열은 영역당 **최대 3개**입니다.`,
  premium: `## 플랜별 출력: 정밀
- Standard와 동일 항목을 출력하되 더 상세하게 작성합니다.

⚠️ **분량 제한 (반드시 준수)**:
- activities 배열은 **최대 6개**입니다. 7개 이상 절대 출력하지 마세요.
- 각 activity의 overallComment은 **250자 이내**, improvementDirection은 **150자 이내**로 작성합니다.
- keyActivities의 각 evaluation은 **150자 이내**로 작성합니다.`,
};

export const buildActivityAnalysisPrompt = (
  input: ActivityAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 창의적 체험활동(창체)을 영역별로 분석하세요.

## 교육과정 버전 확인
- 2015 개정 교육과정: 자율활동, 동아리활동, 진로활동 (봉사활동은 별도 분석에서 제외)
- 2022 개정 교육과정: 자율·자치활동, 동아리활동, 진로활동 (3영역)
- 학생의 교육과정 버전: ${input.curriculumVersion}
- 해당 교육과정의 영역 구분에 맞춰 분석합니다.

## 규칙
1. 창체만 분석합니다 (교과 세특은 subjectAnalysis에서 별도 분석).
2. 각 영역의 특성에 맞는 평가 관점을 적용합니다:
   - 자율·자치: 학교 행사 참여, 자치 활동, 주도적 기획
   - 동아리: 전공 관련성, 활동의 지속성과 깊이, 성과
   - 진로: 진로 탐색의 구체성, 체험 활동의 질, 진로 일관성
   ※ 봉사활동은 별도 영역으로 분석하지 않습니다. 공동체역량(나눔과배려) 평가 시 참고 데이터로만 활용됩니다.
3. 학년별 변화와 심화 과정을 분석합니다.
4. 기록 분량(바이트 수)도 평가 요소로 고려합니다.
5. **자율활동, 동아리활동, 진로활동을 반드시 출력하세요.** 봉사활동은 별도 영역으로 출력하지 않습니다.
6. **summary는 2~3줄(100~150자) 이내**로 간결하게 작성합니다. 핵심 활동과 역량만 포함하세요.

${COMPETENCY_TAG_GUIDE}

## 출력 JSON 스키마

중요: activities 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다. 문자열 배열 절대 금지.

{
  "sectionId": "activityAnalysis",
  "title": "활동 분석",
  "curriculumVersion": "2015",
  "activities": [
    {
      "type": "자율·자치활동",
      "yearlyAnalysis": [
        {
          "year": 1,
          "summary": "학급 회장으로서 학급 규칙 제정에 주도적 역할...",
          "rating": "good",
          "competencyTags": [
            {"category": "community", "subcategory": "리더십"}
          ]
        }
      ],
      "overallComment": "자율활동에서 리더십이 잘 드러나며...",
      "volumeAssessment": "기록 분량이 적절하며...",
      "keyActivities": [
        {
          "activity": "학급 규칙 제정 프로젝트",
          "evaluation": "주도적으로 기획하고...",
          "competencyTags": [{"category": "community", "subcategory": "리더십"}]
        }
      ],
      "improvementDirection": "3학년에서는 학교 차원의 활동으로 확대..."
    },
    {
      "type": "동아리활동",
      "yearlyAnalysis": [
        {
          "year": 1,
          "summary": "사회탐구 동아리에서...",
          "rating": "good",
          "competencyTags": [{"category": "career", "subcategory": "진로탐색"}]
        }
      ],
      "overallComment": "동아리 활동을 통해...",
      "volumeAssessment": "",
      "keyActivities": [],
      "improvementDirection": ""
    }
  ],
  "overallComment": "창체 전반에서 사회 분야에 대한 관심이..."
}

플랜별로 volumeAssessment, keyActivities, improvementDirection은 생략 가능하지만, activities와 yearlyAnalysis의 각 요소는 반드시 위와 같은 객체여야 합니다.

## 단계별 분석 절차

1. 교육과정 버전(2015/2022)을 확인하고 해당하는 영역 구분(3영역 또는 4영역)을 결정합니다.
2. 각 영역별로 학년별 원문 데이터를 읽고, 핵심 활동과 성과를 요약합니다.
3. 각 학년별 활동에 역량 태그를 객체 형식으로 부여합니다.
4. 학년 간 성장/심화 패턴을 파악하여 rating을 부여합니다.
5. 영역 종합 코멘트와 전체 종합 코멘트를 작성합니다.

## 입력 데이터

### 창체 원문 데이터
${input.creativeActivities}

### 역량 추출 결과
${input.competencyExtraction}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
