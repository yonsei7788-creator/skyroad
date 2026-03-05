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
- 메인 스토리라인 (3~5줄)
- 학년별 심화 흐름 (각 학년 테마 + 설명)
- 진로 일관성 등급 + 코멘트
- crossSubjectLinks, storyEnhancementSuggestions, interviewStoryGuide 필드는 출력하지 않습니다.`,
  premium: `## 출력 수준: 확장
Standard의 모든 항목 + 다음을 추가로 출력하세요:

### 4. 과목 간 연결 그래프 (crossSubjectLinks)
- 과목 A의 탐구가 과목 B로 이어지는 연결 관계를 식별합니다.
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
- "자기소개 -> 탐구 계기 -> 심화 과정 -> 미래 계획" 구조로 정리합니다.`,
};

export const buildStoryAnalysisPrompt = (
  input: StoryAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부 전체를 하나의 스토리로 분석하세요.

## 분석 항목

### 1. 메인 스토리라인 (mainStoryline)
- 학생의 생기부가 말하는 핵심 이야기를 3~5줄로 서술합니다.
- "~하는 학생"이라는 한 문장으로 시작합니다.

### 2. 학년별 심화 흐름 (yearProgressions)
- 1학년 -> 2학년 -> 3학년(있는 경우)의 심화 흐름을 분석합니다.
- 각 학년의 핵심 키워드(theme)와 설명(description)을 포함합니다.
- 학년 간 심화가 있는지, 탐색 -> 구체화 -> 심화 구조인지 판단합니다.

### 3. 진로 일관성 등급 (careerConsistencyGrade)
- S/A/B/C/D 등급으로 평가합니다.
- 일관성 분석 코멘트(careerConsistencyComment)를 포함합니다.
- 방향 변화가 있다면 그 맥락이 자연스럽게 설명 가능한지 분석합니다.

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
