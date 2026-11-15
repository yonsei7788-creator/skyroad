/** 섹션 17: 생기부 스토리 구조 분석 (storyAnalysis) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface StoryAnalysisPromptInput {
  allSubjectData: string;
  creativeActivities: string;
  behavioralAssessment: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: "",
  standard: `## 출력 수준: 기본
- 메인 스토리라인
- 학년별 심화 흐름 (각 학년 테마 + 설명)
- 진로 일관성 등급 + 코멘트
- crossSubjectLinks, storyEnhancementSuggestions, interviewStoryGuide 필드는 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- mainStoryline은 반드시 **300자 이내**로 작성합니다. 300자 초과 금지.
- yearProgressions는 **최대 3개** (학년 수만큼)이며, 각 description은 **120자 이내**로 작성합니다.
- careerConsistencyComment는 **150자 이내**로 작성합니다.`,
  premium: `## 출력 수준: 확장
Standard의 모든 항목 + 다음을 추가로 출력하세요:

### 4. 과목 간 연결 그래프 (crossSubjectLinks)
- 과목 A의 탐구가 과목 B로 이어지는 연결 관계를 식별합니다.
- **상위 5개 연결만** 출력합니다 (가장 의미 있는 연결 우선).
- 각 연결에 대해: from(출발 과목), to(도착 과목), topic(연결 주제), depth(심화/반복/확장/무관)

#### 주제 반복 vs 심화 구분 기준
| 구분 | 기준 | 예시 |
|------|------|------|
| **심화** | 동일 주제이지만 새로운 관점/방법론/깊이 추가 | 1학년: 자동차 역사 조사 -> 2학년: 전기차 배터리 효율 실험 |
| **확장** | 관련 주제로 범위 확대 | 자동차 -> 자율주행 알고리즘 -> 교통 시스템 최적화 |
| **반복** | 동일 주제, 동일 수준, 새로운 내용 없음 | 1학년: 전기차 조사 -> 2학년: 전기차 보고서 (내용 유사) |
| **무관** | 주제적 연결 없음 | 물리학-역학 <-> 국어-시 분석 |

- **반복은 감점 요인**: 사정관은 같은 키워드 반복을 부정적으로 인식
- 주제 반복이면서 심화가 없는 경우를 명확히 지적합니다.

### 5. 스토리 강화 제안 (storyEnhancementSuggestions)
- 현재 생기부를 관통하는 스토리를 3학년에서 어떻게 완성할지 구체적으로 제안합니다.

### 6. 면접 스토리텔링 가이드 (interviewStoryGuide)
- 면접에서 생기부를 어떤 흐름으로 설명할지 가이드합니다.
- "자기소개 → 탐구 계기 → 심화 과정 → 미래 계획" 구조로 정리합니다.
- **톤 주의**: 시스템 프롬프트의 지시형 종결어미 금지 규칙 적용. "~구성하는 것이 효과적입니다", "~하면 좋겠습니다" 형태를 사용합니다.

⚠️ **분량 제한 (반드시 준수)**:
- mainStoryline은 반드시 **300자 이내**로 작성합니다. 300자 초과 금지.
- yearProgressions는 **최대 3개**, 각 description은 **120자 이내**로 작성합니다.
- crossSubjectLinks는 **최대 5개**입니다. 6개 이상 절대 출력하지 마세요.
- storyEnhancementSuggestions는 **최대 3개**, 각 **100자 이내**로 작성합니다.
- interviewStoryGuide는 **200자 이내**로 작성합니다.`,
};

export const buildStoryAnalysisPrompt = (
  input: StoryAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부 전체를 하나의 스토리로 분석하세요.

## 서술 관점: 내러티브 분석가
이 섹션은 **생기부 전체를 하나의 성장 스토리로 해석**합니다. 시간 순서에 따른 변화와 연결성을 중심으로 서술하세요.
- "1학년 ~에서 출발하여 ~으로 발전했다", "~경험이 ~로 이어지며 일관된 흐름을 형성한다" 등 내러티브 어투를 사용하세요.

## ⛔ 다른 섹션과의 역할 경계 (필수)
- ❌ 성적·등급 해석 → academicAnalysis에서 다룸
- ❌ 개별 활동/세특의 질적 평가 → activityAnalysis·subjectAnalysis에서 다룸
- ❌ 약점 진단 → weaknessAnalysis에서 다룸
- ✅ 이 섹션에서 할 것: **시간 순서에 따른 성장 흐름과 과목 간 연결성**만 분석

## 출력 JSON 스키마

중요: yearProgressions, crossSubjectLinks 배열의 각 요소는 반드시 완전한 객체여야 합니다.

{
  "sectionId": "storyAnalysis",
  "title": "스토리 분석",
  "mainStoryline": "사회 문제에 대한 깊은 관심을 바탕으로 정치·행정 분야를 탐색하는 학생으로...",
  "yearProgressions": [
    {"year": 1, "theme": "사회 문제 인식", "description": "통합사회에서 사회 불평등 문제에 관심을 갖고..."},
    {"year": 2, "theme": "정책 분석 심화", "description": "정치와법에서 복지 정책을 비교 분석하며..."}
  ],
  "careerConsistencyGrade": "A",
  "careerConsistencyComment": "사회과학 분야에 대한 일관된 관심이...",
  "crossSubjectLinks": [
    {"from": "통합사회", "to": "사회·문화", "topic": "사회 불평등", "depth": "심화"},
    {"from": "사회·문화", "to": "정치와법", "topic": "복지 정책", "depth": "확장"}
  ],
  "storyEnhancementSuggestions": ["3학년에서 사회문제 해결 프로젝트 수행"],
  "interviewStoryGuide": "사회 문제 인식 → 정책 분석 → 해결 방안 모색의 흐름으로..."
}

**CompetencyGrade 등급 기준:**
- S: 전 학년에 걸쳐 일관된 진로 방향 + 뚜렷한 심화 흐름
- A: 일관된 방향이지만 일부 학년에서 심화가 부족
- B: 큰 방향은 유지되나 구체성이 부족하거나 일부 흔들림
- C: 진로 방향이 불분명하거나 학년 간 연결이 약함
- D: 진로 일관성이 거의 없음, 매 학년 다른 방향

## 분석 항목

### 1. 메인 스토리라인 (mainStoryline)
- 학생의 생기부가 말하는 핵심 이야기를 3~5줄로 서술합니다.
- "~하는 학생"이라는 한 문장으로 시작합니다.
- 사정관이 이 생기부를 10분 안에 읽었을 때 떠올릴 학생 이미지를 담으세요.

### 2. 학년별 심화 흐름 (yearProgressions)
- 1학년 -> 2학년 -> 3학년(있는 경우)의 심화 흐름을 분석합니다.
- 각 학년의 핵심 키워드(theme)와 설명(description)을 포함합니다.
- **description은 1~2줄(80자 이내)**로 핵심만 서술합니다.
- 학년 간 심화가 있는지, 탐색 -> 구체화 -> 심화 구조인지 판단합니다.

### 3. 진로 일관성 등급 (careerConsistencyGrade)
- S/A/B/C/D 등급으로 평가합니다.
- 일관성 분석 코멘트(careerConsistencyComment)를 포함합니다.
- 방향 변화가 있다면 그 맥락이 자연스럽게 설명 가능한지 분석합니다.
- ⚠️ 사정관은 진로 일관성을 "이 학생이 정말 이 분야에 관심이 있는가"의 핵심 판단 기준으로 봅니다. 일관성이 높으면 그 강점을, 낮으면 사정관이 의문을 가질 수 있는 지점을 구체적으로 언급하세요.

${PLAN_SPECIFIC[plan]}

## 입력 데이터

### 전체 세특 원문
${input.allSubjectData}

### 창체 원문
${input.creativeActivities}

### 행동특성
${input.behavioralAssessment}

### 학생 프로필
${input.studentProfile}`;
};
