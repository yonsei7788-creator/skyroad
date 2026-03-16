/** 섹션 7: 권장과목 이수 분석 (courseAlignment) */

import type { ReportPlan } from "../../types.ts";

export interface CourseAlignmentPromptInput {
  recommendedCourseMatch: string;
  competencyExtraction: string;
  studentProfile: string;
  studentGrade: number;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 목표 계열 + 이수율 + 이수/미이수 상세 + 미이수 영향 분석 + 이수 전략
- medicalRequirements 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- Lite의 모든 항목
- 메디컬 계열 대학별 요구사항 매칭(medicalRequirements, 해당 계열 학생만)

⚠️ **분량 제한 (반드시 준수)**:
- courses 배열은 **최대 5개**입니다. 6개 이상 절대 출력하지 마세요.
- 각 course의 관련 설명(reason 등)은 **80자 이내**로 작성합니다.
- missingCourseImpact는 **100자 이내**, recommendation은 **100자 이내**로 작성합니다.`,
  premium: `## 플랜별 출력: 정밀
- Standard와 동일

⚠️ **분량 제한 (반드시 준수)**:
- courses 배열은 **최대 6개**입니다. 7개 이상 절대 출력하지 마세요.
- 각 course의 관련 설명(reason 등)은 **80자 이내**로 작성합니다.
- missingCourseImpact는 **100자 이내**, recommendation은 **100자 이내**로 작성합니다.
- ⚠️ 이 섹션은 **A4 1페이지 이내**에 들어와야 합니다. 간결하게 작성하세요.`,
};

export const buildCourseAlignmentPrompt = (
  input: CourseAlignmentPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 목표 계열 대비 권장과목 이수 상태를 분석하고 영향을 평가하세요.

## ⚠️ 분석 방향 원칙
⚠️ 희망 대학/학과는 참고 정보일 뿐입니다. 과목 적합도 분석은 반드시 생기부 데이터 자체에서 도출된 강점과 특성을 기반으로 해야 하며, 희망 학과에 끼워맞추려 해서는 안 됩니다.
- **targetMajor 필드에는 희망 학과가 아닌, 생기부 탐구·세특·성적에서 도출된 실제 강점 계열을 넣으세요.**
  예: 생기부에서 생명과학 탐구가 주력이면 "생명과학", 정보/코딩이 주력이면 "컴퓨터/SW"
- 아래 "권장과목 매칭 데이터"는 희망학과 기준이지만, 이는 참고용입니다.
  AI는 생기부에서 드러나는 실제 강점 계열 기준으로 과목 적합도를 재해석해야 합니다.
- 희망 학과와 생기부 방향이 다를 경우, 생기부가 가리키는 계열의 과목 이수 상태를 우선 분석하세요.

## 입력 데이터

### 권장과목 매칭 데이터 (코드 전처리 결과)
${input.recommendedCourseMatch}

### 역량 추출 결과 (⚠️ targetMajor는 이 데이터에서 도출하세요)
${input.competencyExtraction}

⚠️ 위 역량 추출 결과에서 학생의 실제 강점 계열을 파악하여 targetMajor 필드에 넣으세요.
위 "권장과목 매칭 데이터"의 targetMajor는 희망학과 기준이므로 무시하세요.

### 학생 프로필
${input.studentProfile}

### 학년별 분석 방향
- 학생 학년: ${input.studentGrade}학년
${
  input.studentGrade >= 3
    ? `- 이 학생은 3학년으로 **과목 선택이 완료된 상태**입니다.
- "남은 기간에 이수하라"는 조언은 부적절합니다.
- 현재 이수한 과목 기준으로 입시 영향만 분석하세요.
- 미이수 과목이 있다면: "이미 선택 기회가 지났으므로, 면접에서 해당 과목 미이수 사유를 설명할 준비가 필요합니다"와 같은 방향으로 분석하세요.
- recommendation 필드는 이수 전략 대신 "미이수 상태에서의 대응 전략"을 작성하세요.`
    : `- 이 학생은 ${input.studentGrade}학년으로 남은 학기에 추가 이수가 가능합니다.
- 미이수 과목에 대해 구체적인 이수 전략을 제안하세요.`
}

## 출력 JSON 스키마

중요: courses 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "courseAlignment",
  "title": "과목 적합도",
  "targetMajor": "사회과학",
  "matchRate": 75,
  "courses": [
    {"course": "정치와법", "status": "이수", "importance": "필수"},
    {"course": "사회·문화", "status": "이수", "importance": "필수"},
    {"course": "경제", "status": "미이수", "importance": "권장"}
  ],
  "missingCourseImpact": "경제 과목 미이수는 사회과학 계열 진학 시...",
  "recommendation": "3학년에서 경제 과목 이수를 권장합니다..."
}

## 출력 지시

### 목표 계열 (targetMajor)
- ⚠️ 희망 학과가 아닌, **생기부 탐구 활동·세특·성적 패턴에서 도출된 실제 강점 계열**을 명시합니다.
- 예: 생기부에서 생명과학 탐구가 주력이면 "생명과학" 계열, 정보/코딩 탐구가 주력이면 "컴퓨터/SW" 계열.
- 희망 학과와 생기부 방향이 다를 경우, 생기부 기반 계열을 우선합니다.

### 권장과목 이수율 (matchRate)
- 코드 전처리에서 산출된 이수율(0~100)을 그대로 사용합니다.
- 만약 전처리 데이터에 이수율이 없거나 0이면, courses 배열에서 직접 계산하세요: (이수 과목 수 / 전체 과목 수) × 100, 정수로 반올림.

### 이수/미이수 상세 (courses)
- 각 권장과목에 대해:
  - course: 과목명
  - status: "이수" 또는 "미이수"
  - importance: "핵심 권장" 또는 "권장" (⚠️ "필수"라는 표현은 사용하지 마세요. 대학 입시에서 과목 이수는 필수가 아니라 권장사항입니다.)

### 미이수 과목 영향 분석 (missingCourseImpact)
- 미이수 과목이 입시에 미치는 영향을 구체적으로 서술합니다.
- 특히 학종에서 "교과 이수 노력" 평가에 미치는 영향을 분석합니다.

### 이수 전략 제안 (recommendation)
- 고1~2 학생에 해당하는 경우, 남은 학기에 이수할 과목을 제안합니다.
- 고3이거나 이미 이수 완료인 경우 생략 가능합니다.

## 미이수 과목 이수 전략 (두 가지 시나리오 필수)
미이수 과목에 대해 반드시 **두 가지 시나리오**로 나누어 분석하세요:
- **A. 향후 수강할 경우**: 해당 과목을 앞으로 이수한다면 전공적합성과 입시 경쟁력에 어떤 긍정적 변화가 있는지 서술합니다.
- **B. 미이수가 유지될 경우**: 해당 과목 없이 지원할 때의 불이익과 이를 보완할 수 있는 대안 전략을 제시합니다.
⚠️ 단, 졸업생(학생 프로필의 "학생 상태"가 "졸업생")의 경우 A 시나리오는 생략하고 B 시나리오만 작성합니다.

${PLAN_SPECIFIC[plan]}`;
};
