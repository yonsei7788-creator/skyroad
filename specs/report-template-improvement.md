# 리포트 템플릿 개선 명세서

> **버전**: v1.0
> **작성일**: 2026-03-06
> **기반 문서**: `improve-report-template.md`, 5등급제 분석 문서
> **대상 코드**: `libs/report/types.ts`, `libs/report/schemas.ts`, `libs/report/mock-data.ts`, `app/report/_components/`, `app/report/_templates/`

---

## 1. 공통 변경사항

### 1-1. 브랜딩 변경: SKYLOAD → SKYROAD

모든 "SKYLOAD" 문자열을 "SKYROAD"로 변경해야 한다.

| 파일                        | 위치                | 현재 값          | 변경 값          |
| --------------------------- | ------------------- | ---------------- | ---------------- |
| `ReportCover.tsx`           | L41 coverBrand      | `SKYLOAD`        | `SKYROAD`        |
| `ReportPage.tsx`            | L26 watermark       | `SKYLOAD`        | `SKYROAD`        |
| `ReportPage.tsx`            | L30 pageHeaderBrand | `SKYLOAD REPORT` | `SKYROAD REPORT` |
| `ReportPage.tsx`            | L42 pageFooter      | `© 2026 SKYLOAD` | `© 2026 SKYROAD` |
| `PartPage.tsx`              | L43 partFooterBrand | `SKYLOAD`        | `SKYROAD`        |
| `ReportTableOfContents.tsx` | L223 tocFooterText  | `© 2026 SKYLOAD` | `© 2026 SKYROAD` |

> CSS 내 변수명(`styles.coverBrand` 등)은 기능적 네이밍이므로 변경 불필요.

### 1-2. 4대 역량 등급 + 사유 표시 (현재 발전가능성만)

**피드백**: "P.5 발전 가능성만 영어 등급으로 표시된 부분은, 학업역량/진로역량/공동체역량 모두 영어 등급 및 그 이유를 서술 필요"

**현재 상태**: `CompetencyScoreSection`에서 `growthGrade`/`growthComment`만 등급+사유 제공. `scores` 배열의 학업/진로/공동체는 점수만 있고 등급/사유가 없다.

**변경 필요**:

- `CompetencyScoreDetail` 인터페이스에 `grade: CompetencyGrade`와 `gradeComment: string` 필드 추가
- `CompetencyScoreRenderer`에서 각 역량 카드에 등급 배지 + 사유 코멘트 렌더링

### 1-3. 외부활동/수상경력 제외

**피드백**: "외부활동, 수상경력 제외 필요(입시 반영 X)"

이는 주로 **AI 프롬프트** 레벨 변경이다. 타입/스키마 변경보다는 AI 생성 시 외부활동을 추천하지 않도록 프롬프트를 수정해야 한다. 다만, 다음 위치에서 렌더링 레벨 가드를 추가한다:

- `WeaknessAnalysisRenderer`: `suggestedActivities`에서 외부활동 필터링 또는 AI가 생성하지 않도록 프롬프트 제한
- `TopicRecommendationRenderer`: 외부활동 관련 주제 제외
- `ActivityAnalysisRenderer`: 수상경력 관련 데이터 렌더링 제외

**타입 변경**: 없음 (AI 프롬프트 제어)

### 1-4. 5등급제 반영 사항

**5등급제 배경**: 1등급 10%, 2등급 24%, 3등급 32%, 4등급 24%, 5등급 10%

**영향 범위**:

1. `FiveGradeSimulation.interpretation` — 백분위 표현 정확도 필수 (예: 2등급 = "상위 34%" (10%+24%), 아닌 "상위 35%")
2. `SubjectStatAnalysis.percentileEstimate` — 5등급 기준 백분위 산출 로직
3. 표준편차 해석 — "표준편차보다 높다"와 같은 부적절한 표현 방지 (AI 프롬프트)
4. `AcademicAnalysisSection` — 5등급제 기준 등급 색상/범위 로직 변경 필요

**타입 변경**: `FiveGradeSimulation`에 `percentileCumulative` 필드 추가 고려 (아래 상세)

---

## 2. 타입 변경 명세 (`libs/report/types.ts`)

### 2-1. 추가할 필드

#### `CompetencyScoreDetail` (L160-173)

```typescript
interface CompetencyScoreDetail {
  // 기존 필드 유지
  category: CompetencyCategory;
  label: string;
  score: number;
  maxScore: 100;
  subcategories: CompetencySubScore[];

  // === 추가 필드 ===
  /** 역량 등급 (S/A/B/C/D) */
  grade: CompetencyGrade;
  /** 등급 사유 (2~3줄) */
  gradeComment: string;
}
```

| 필드           | 타입              | 피드백 대응                   |
| -------------- | ----------------- | ----------------------------- |
| `grade`        | `CompetencyGrade` | 공통: 4대 역량 등급 표시      |
| `gradeComment` | `string`          | 공통: 4대 역량 등급 사유 서술 |

#### `ActivityTypeAnalysis` (L662-724) — 평가 사유 필드

```typescript
interface ActivityTypeAnalysis {
  // 기존 필드 유지...

  yearlyAnalysis: {
    year: number;
    summary: string;
    rating: SubjectRating;
    competencyTags: CompetencyTag[];

    // === 추가 필드 ===
    /** 평가 사유 (3~4줄) */
    ratingRationale: string;
  }[];
}
```

| 필드              | 타입     | 피드백 대응                          |
| ----------------- | -------- | ------------------------------------ |
| `ratingRationale` | `string` | Lite: 창체 활동 분석 평가 사유 3~4줄 |

#### `TopicRecommendationItem` (L990-1015) — 중요도 필드

```typescript
export interface TopicRecommendationItem {
  // 기존 필드 유지...

  // === 추가 필드 ===
  /** 중요도 (Standard+) */
  importance?: Priority;
}
```

| 필드         | 타입                  | 피드백 대응                  |
| ------------ | --------------------- | ---------------------------- |
| `importance` | `Priority` (optional) | Standard: 주제별 중요도 표시 |

#### `InterviewQuestion` (L1041-1066) — 중요도 필드

```typescript
export interface InterviewQuestion {
  // 기존 필드 유지...

  // === 추가 필드 ===
  /** 중요도 (Standard+) */
  importance?: Priority;
}
```

| 필드         | 타입                  | 피드백 대응                     |
| ------------ | --------------------- | ------------------------------- |
| `importance` | `Priority` (optional) | Standard: 면접 질문 중요도 표시 |

#### `SubjectAnalysisItem` (L758-801) — 평가 사유 최소 분량 보장

타입 변경 없음. AI 프롬프트에서 `evaluationComment` 최소 3~4줄 생성을 강제한다. `detailedEvaluation`도 동일하게 최소 3~4줄.

#### `UniversityRecommendation` (L1086-1103) — 추천 퍼센트 필드

```typescript
interface UniversityRecommendation {
  // 기존 필드 유지...

  // === 추가 필드 ===
  /** 합격 가능성 퍼센트 레이블 (예: "60~70%") */
  chancePercentLabel?: string;
}
```

| 필드                 | 타입                | 피드백 대응                      |
| -------------------- | ------------------- | -------------------------------- |
| `chancePercentLabel` | `string` (optional) | Premium: 추천 퍼센트-멘트 일관성 |

#### `FiveGradeSimulation` (L479-484) — 누적 백분위

```typescript
interface FiveGradeSimulation {
  subject: string;
  currentGrade: number;
  simulatedGrade: number;
  interpretation: string;

  // === 추가 필드 ===
  /** 5등급제 누적 백분위 (예: 1등급=10, 2등급=34, 3등급=66...) */
  percentileCumulative?: number;
}
```

| 필드                   | 타입                | 피드백 대응                    |
| ---------------------- | ------------------- | ------------------------------ |
| `percentileCumulative` | `number` (optional) | Premium: 5등급제 백분위 정확도 |

#### `GradeChangeAnalysis` (L472-476) — 실행 항목 우선순위

```typescript
interface GradeChangeAnalysis {
  currentTrend: "상승" | "유지" | "하락";
  prediction: string;
  actionItems: string[];

  // === 추가 필드 ===
  /** 실행 항목별 우선순위/중요도 */
  actionItemPriorities?: Priority[];
}
```

| 필드                   | 타입                    | 피드백 대응                        |
| ---------------------- | ----------------------- | ---------------------------------- |
| `actionItemPriorities` | `Priority[]` (optional) | Premium: 실행 항목 우선순위/중요도 |

#### `AdmissionStrategySection` (L1130-1177) — 조합별 추천 구조

```typescript
export interface AdmissionStrategySection extends BaseSection {
  // 기존 필드 유지...

  // === 추가 필드 ===
  /** Premium: 조합별 대학 추천 (상향위주/안정위주/하향위주 각 6개) */
  tierGroupedRecommendations?: {
    tierGroup: "상향 위주" | "안정 위주" | "하향 위주";
    recommendations: UniversityRecommendation[];
  }[];

  /** Standard+: 다음 학기 전략 */
  nextSemesterStrategy?: string;
}
```

| 필드                         | 타입                   | 피드백 대응                             |
| ---------------------------- | ---------------------- | --------------------------------------- |
| `tierGroupedRecommendations` | 조합별 배열 (optional) | Premium: 조합별 6개씩 총 18개 대학 추천 |
| `nextSemesterStrategy`       | `string` (optional)    | Standard: 다음 학기 전략 서술 추가      |

### 2-2. 삭제/비활성화할 필드

#### `AdmissionRiskBand` 관련 (Premium에서 삭제)

**피드백**: "p.70 대학별 리스크 밴드 삭제 필요(대학별 합격가능성 분석 등 기존 내용과 겹침)"

- `AdmissionStrategySection.universityRiskBands` — Premium 렌더러에서 렌더링 제외 (타입은 유지, Standard에서는 사용 가능)
- `CompetencyScoreSection.scoreBand` — 동일하게 Premium에서 비표시 검토

> 타입 자체를 삭제하지 않고, 렌더러 레벨에서 Premium일 때 숨긴다.

#### `ActionRoadmapSection.interviewTimeline` (Premium에서 삭제)

**피드백**: "p.75 AI 면접 대비 타임라인 삭제(해당 페이지 본문 내용과 맞지 않음)"

- 렌더러에서 Premium일 때 `interviewTimeline` 블록 렌더링 제외

### 2-3. 타입 변경이 필요한 필드

#### `InterviewPrepSection.questions` 개수 제한

**현재**: 주석에 "Standard: 10~12개, Premium: 12~15개"

**변경**:

- Standard: 최대 20개
- Premium: 30개

주석 업데이트 + AI 프롬프트에서 개수 제한 변경.

#### `WeaknessAnalysisRenderer` — 요약 도표

**피드백**: "P.20 영역, 우선순위, 활동 수 표시한 도표 삭제(우선순위가 없고 활동 수가 같아 불필요)"

Lite 플랜에서 상단 요약 테이블을 렌더링하지 않도록 조건부 처리. 타입 변경 없음.

---

## 3. 플랜별 변경사항

### 3-1. Lite

| 항목                                 | 현재                             | 변경                                    | 대응 위치                                        |
| ------------------------------------ | -------------------------------- | --------------------------------------- | ------------------------------------------------ |
| 대학 추천 개수                       | 6개 초과 가능                    | **상향 2 + 안정 2 + 하향 2 = 6개 고정** | AI 프롬프트 + `AdmissionStrategyRenderer` 필터링 |
| 창체 활동 평가 사유                  | 1~2줄                            | **3~4줄** (신규 `ratingRationale` 필드) | `ActivityAnalysisRenderer` + 타입 추가           |
| 세특 분석 사유 (`evaluationComment`) | 1~2줄                            | **최소 3~4줄**                          | AI 프롬프트 제어                                 |
| 약점 분석 요약 도표                  | 영역/우선순위/활동수 테이블 표시 | **Lite에서 삭제**                       | `WeaknessAnalysisRenderer` 조건부 렌더링         |
| 약점 분석 근거 (`description`)       | 1~2줄                            | **최소 3~4줄**                          | AI 프롬프트 제어                                 |

### 3-2. Standard

| 항목                 | 현재                      | 변경                                                           | 대응 위치                                     |
| -------------------- | ------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| 추천 전형 원형 도형  | 별도 원형 표시            | **삭제**, 정식 명칭만 표시 (학생부종합전형, 학생부교과전형 등) | `AdmissionPredictionRenderer`                 |
| 다음 학기 전략       | 없음                      | **추가** (`nextSemesterStrategy` 필드)                         | `AdmissionStrategySection` 타입 추가 + 렌더러 |
| 세특 분석 사유       | 1~2줄                     | **최소 3~4줄**                                                 | AI 프롬프트 제어                              |
| 주제 추천 중요도     | 미표시                    | **중요도 표시** (`importance` 필드)                            | `TopicRecommendationItem` 타입 + 렌더러       |
| 면접 질문 개수       | 10~12개                   | **최대 20개 + 중요도 표시**                                    | `InterviewQuestion.importance` + AI 프롬프트  |
| 합격가능성 분석 분량 | 1~2줄                     | **3~4줄**                                                      | AI 프롬프트 (`analysis` 필드 최소 길이)       |
| 진로역량 평가 기준   | 직업 탐구 = 진로역량 우수 | **단순 직업 탐구 ≠ 전공 관련 역량**                            | AI 프롬프트 평가 기준 수정                    |

### 3-3. Premium

| 항목                        | 현재                        | 변경                                        | 대응 위치                                       |
| --------------------------- | --------------------------- | ------------------------------------------- | ----------------------------------------------- |
| 서울대 교과전형 제외        | 서울대 교과전형 포함        | **서울대는 교과전형 데이터 생성 제외**      | AI 프롬프트 + 검증 로직                         |
| 추천 퍼센트-멘트 일관성     | 불일치 가능                 | **퍼센트 순위와 추천 멘트 일관**            | AI 프롬프트 + `chancePercentLabel` 필드         |
| 분석 과목 수                | 하위 플랜과 동일            | **Premium은 더 많은 과목 분석**             | AI 프롬프트 (최소 과목 수 상향)                 |
| 실행 항목 우선순위/중요도   | 미표시                      | **표시** (`actionItemPriorities` 필드)      | `GradeChangeAnalysis` 타입 + 렌더러             |
| 5등급제 백분위 정확도       | "상위 35%" 같은 부정확 표현 | **정확한 누적 백분위** (2등급=34%)          | `FiveGradeSimulation.percentileCumulative` + AI |
| 세특 서술 예시              | 1번 주제만                  | **모든 주제에 `sampleEvaluation` 필수**     | AI 프롬프트 (모든 topic에 생성)                 |
| 면접 질문 개수              | 12~15개                     | **30개**                                    | AI 프롬프트 + 주석 업데이트                     |
| 대학 추천                   | 기존 목록                   | **조합별 6개씩 (상향/안정/하향) = 총 18개** | `tierGroupedRecommendations` 타입 + 렌더러      |
| 대학별 리스크 밴드          | 표시                        | **삭제** (합격가능성 분석과 중복)           | 렌더러 조건부 비표시                            |
| AI 면접 타임라인            | 표시                        | **삭제** (본문과 무관)                      | 렌더러 조건부 비표시                            |
| 종합 코멘트 분량            | 하위 유형보다 적음          | **하위 유형 이상 분량**                     | AI 프롬프트 (최소 글자 수 제한)                 |
| 대학별 반영 시뮬레이션 해석 | 1~2줄                       | **최소 3~4줄**                              | AI 프롬프트 제어                                |
| 표준편차 표현               | "표준편차보다 높다"         | **적절한 통계 표현 사용**                   | AI 프롬프트 제어                                |
| 지원 조합 시뮬레이션        | 학종+교과 5개               | **수시 6개 꽉 채움 + 정시 1개**             | AI 프롬프트                                     |
| 면접 질문 레이아웃          | 요약 후 다음 페이지         | **요약 바로 밑에서 질문 시작**              | `InterviewPrepRenderer` 레이아웃 변경           |

---

## 4. 렌더러 변경 목록

### 4-1. `ReportCover.tsx`

- L41: `SKYLOAD` → `SKYROAD`

### 4-2. `ReportPage.tsx`

- L26: 워터마크 `SKYLOAD` → `SKYROAD`
- L30: 헤더 `SKYLOAD REPORT` → `SKYROAD REPORT`
- L42: 푸터 `© 2026 SKYLOAD` → `© 2026 SKYROAD`

### 4-3. `PartPage.tsx`

- L43: `SKYLOAD` → `SKYROAD`

### 4-4. `ReportTableOfContents.tsx`

- L223: `© 2026 SKYLOAD` → `© 2026 SKYROAD`

### 4-5. `CompetencyScoreRenderer.tsx`

**변경**: 각 역량 카드(학업/진로/공동체)에 등급 배지 + 사유 코멘트 추가

- 현재 `scores` 맵에서 점수만 표시 → `score.grade` 배지 + `score.gradeComment` 텍스트 추가
- 기존 발전가능성 블록은 유지하되 동일한 카드 스타일로 통일 검토

### 4-6. `AdmissionPredictionRenderer.tsx`

**Standard/Premium 변경**:

- 추천 전형 배너 영역에서 원형 도형(둥근 배지) 삭제
- `TYPE_LABEL` 매핑에서 정식 명칭 사용: `학종` → `학생부종합전형`, `교과` → `학생부교과전형`, `정시` → `수능(정시)전형`
- 합격 예측 `analysis` 텍스트가 3~4줄 미만이면 안됨 (데이터 레벨 제어)

**Premium 변경**:

- 서울대 교과전형 데이터가 있으면 렌더링에서 필터링

### 4-7. `ActivityAnalysisRenderer.tsx`

**Lite 변경**:

- 학년별 분석 테이블에 `ratingRationale` 컬럼(또는 행 아래 확장 영역) 추가
- 평가 사유 3~4줄 서술 표시

### 4-8. `SubjectAnalysisRenderer.tsx`

- `evaluationComment` 표시 영역의 최소 높이를 3~4줄 분량으로 설정 (CSS 또는 데이터)
- Standard+ `detailedEvaluation` 분량 확인

### 4-9. `WeaknessAnalysisRenderer.tsx`

**Lite 변경**:

- 상단 요약 테이블(영역/우선순위/활동수) 블록을 Lite에서 숨김 → `plan` prop 전달 필요
- `WeaknessAnalysisRendererProps`에 `plan?: ReportPlan` 추가
- `SectionRenderer.tsx`에서 `plan` 전달

**공통**:

- 분석 근거 (`description`) 최소 3~4줄 표시

### 4-10. `TopicRecommendationRenderer.tsx`

**Standard+ 변경**:

- 요약 테이블에 "중요도" 컬럼 추가 (`importance` 필드)
- 각 주제 상세에서 중요도 배지 표시

**Premium 변경**:

- 모든 주제에 `sampleEvaluation` (세특 서술 예시) 필수 렌더링
- 현재 `sampleEvaluation`이 있을 때만 표시하는 조건부 블록 → 모든 주제에 표시되어야 함 (데이터 보장)

### 4-11. `InterviewPrepRenderer.tsx`

**Standard 변경**:

- 질문 최대 20개 (현재 10~12개)
- 각 질문에 `importance` 배지 표시

**Premium 변경**:

- 질문 30개
- 질문 배열을 요약 블록(예상 질문 수/준비도/유형별) 바로 아래에서 시작하도록 레이아웃 변경
- 현재: 요약 블록이 Block 1 → 질문이 Block 2부터 별도 페이지
- 변경: 요약 블록 + 첫 질문들을 같은 Block에 포함

### 4-12. `AdmissionStrategyRenderer.tsx`

**Lite 변경**:

- 추천 대학이 6개(상향2/안정2/하향2) 고정되도록 데이터 검증 또는 슬라이싱

**Standard 변경**:

- `nextSemesterStrategy` 필드가 있으면 렌더링하는 블록 추가

**Premium 변경**:

- `tierGroupedRecommendations`가 있으면 기존 `recommendations` 테이블 대신 조합별 그룹 테이블 렌더링
- 대학별 리스크 밴드 블록(Block 5) 숨김 (L266-294)
- 지원 조합 시뮬레이션: 수시 6개 + 정시 1개 구조 표시

### 4-13. `AcademicAnalysisRenderer.tsx`

**Premium 변경**:

- 5등급제 시뮬레이션 테이블에 `percentileCumulative` 컬럼 추가
- `gradeChangeAnalysis.actionItems`에 우선순위 표시 (번호 옆에 `actionItemPriorities` 배지)
- 대학별 반영 시뮬레이션 `interpretation` 3~4줄 보장

### 4-14. `ActionRoadmapRenderer.tsx`

**Premium 변경**:

- `interviewTimeline` 블록(L181-195) 렌더링 제외

### 4-15. `CourseAlignmentRenderer.tsx`

**Premium 변경**:

- "권장과목 이수율" 텍스트 줄바꿈 처리 (CSS `word-break` 또는 `<wbr>` 태그)

### 4-16. `SectionRenderer.tsx`

- `WeaknessAnalysisRenderer`에 `plan` prop 전달 추가
- `ActivityAnalysisRenderer`에 `plan` prop 전달 추가 (Lite에서 ratingRationale 표시)

---

## 5. Mock 데이터 변경 목록

### 5-1. `CompetencyScoreDetail` — grade/gradeComment 추가

모든 플랜의 `competencyScore.scores` 배열에:

```typescript
{
  category: "academic",
  label: "학업 역량",
  score: 78,
  maxScore: 100,
  grade: "A",
  gradeComment: "교과 성적이 전반적으로 우수하며, 특히 국어와 수학 교과에서 상위권을 유지하고 있습니다. 탐구 교과에서도 적극적인 학습 태도를 보이고 있으나, 영어 교과의 편차가 다소 존재하여 보완이 필요합니다.",
  subcategories: [...]
}
```

### 5-2. `ActivityTypeAnalysis.yearlyAnalysis` — ratingRationale 추가

```typescript
yearlyAnalysis: [{
  year: 1,
  summary: "학급 환경 개선 프로젝트에 참여하여 교실 IT 환경 구축을 제안하고 실행",
  rating: "good",
  competencyTags: [...],
  ratingRationale: "학급 환경 개선 프로젝트에서 IT 환경 구축을 제안하고 실행한 점은 문제해결능력과 실행력을 보여주나, 프로젝트의 범위가 교실 내로 한정되어 있고 타 학생과의 협업 깊이나 결과물의 구체적 성과가 생기부에 충분히 드러나지 않아 '양호'로 평가하였습니다."
}]
```

### 5-3. `TopicRecommendationItem` — importance 추가

```typescript
{
  topic: "머신러닝을 활용한 학교 에너지 효율 분석",
  importance: "high",
  relatedSubjects: ["수학", "정보"],
  description: "...",
  // ...
}
```

### 5-4. `InterviewQuestion` — importance 추가

```typescript
{
  question: "정보과학 분야에 관심을 갖게 된 계기는 무엇인가요?",
  importance: "high",
  questionType: "진로기반",
  intent: "...",
  // ...
}
```

### 5-5. `UniversityRecommendation` — chancePercentLabel 추가

```typescript
{
  university: "고려대학교",
  department: "컴퓨터학과",
  admissionType: "학생부종합",
  tier: "안정",
  chance: "high",
  chancePercentLabel: "65~75%",
  chanceRationale: "..."
}
```

### 5-6. Premium mock — tierGroupedRecommendations 추가

```typescript
tierGroupedRecommendations: [
  {
    tierGroup: "상향 위주",
    recommendations: [
      // 6개 대학 (상향 4 + 안정 1 + 하향 1 등 상향 위주 조합)
    ],
  },
  {
    tierGroup: "안정 위주",
    recommendations: [
      // 6개 대학
    ],
  },
  {
    tierGroup: "하향 위주",
    recommendations: [
      // 6개 대학
    ],
  },
];
```

### 5-7. Premium mock — nextSemesterStrategy 추가

```typescript
nextSemesterStrategy: "다음 학기에는 컴퓨터공학 관련 심화 탐구 활동에 집중하고, 수학II와 미적분 교과에서 1등급 유지를 목표로 합니다. 특히 동아리 활동에서 AI 관련 프로젝트를 기획하여 진로 일관성을 강화하는 것이 중요합니다.";
```

### 5-8. `FiveGradeSimulation` — percentileCumulative 추가

```typescript
{
  subject: "국어",
  currentGrade: 2,
  simulatedGrade: 2,
  percentileCumulative: 34,
  interpretation: "5등급제 전환 시에도 2등급(상위 34% 이내) 유지가 예상됩니다. 원점수-평균-표준편차를 종합하면 상위 약 28% 수준으로, 안정적인 2등급 위치입니다."
}
```

### 5-9. `GradeChangeAnalysis` — actionItemPriorities 추가

```typescript
gradeChangeAnalysis: {
  currentTrend: "상승",
  prediction: "...",
  actionItems: ["영어 1등급 도전", "국어 원점수 5점 향상", "탐구 선택과목 A 성취"],
  actionItemPriorities: ["high", "high", "medium"]
}
```

### 5-10. 면접 질문 수 증가

- Standard mock: 질문 20개로 확장
- Premium mock: 질문 30개로 확장

### 5-11. Premium mock — sampleEvaluation 모든 주제에 추가

현재 일부 주제에만 `sampleEvaluation`이 있는 것을 모든 `TopicRecommendationItem`에 필수 제공.

---

## 6. 스키마 변경 목록 (`libs/report/schemas.ts`)

타입 변경에 대응하여 다음 Zod 스키마를 업데이트해야 한다:

| 스키마                                     | 변경 내용                                                       |
| ------------------------------------------ | --------------------------------------------------------------- |
| `CompetencyScoreDetailSchema`              | `grade: CompetencyGradeSchema`, `gradeComment: z.string()` 추가 |
| `ActivityYearlyAnalysisSchema` (해당 위치) | `ratingRationale: z.string()` 추가                              |
| `TopicRecommendationItemSchema`            | `importance: PrioritySchema.optional()` 추가                    |
| `InterviewQuestionSchema`                  | `importance: PrioritySchema.optional()` 추가                    |
| `UniversityRecommendationSchema`           | `chancePercentLabel: z.string().optional()` 추가                |
| `FiveGradeSimulationSchema`                | `percentileCumulative: z.number().optional()` 추가              |
| `GradeChangeAnalysisSchema`                | `actionItemPriorities: z.array(PrioritySchema).optional()` 추가 |
| `AdmissionStrategySectionSchema`           | `tierGroupedRecommendations`, `nextSemesterStrategy` 추가       |

---

## 7. AI 프롬프트 변경 요약

타입/렌더러가 아닌 AI 생성 단계에서 제어해야 할 사항 정리:

| 항목                    | 프롬프트 변경 내용                                                               |
| ----------------------- | -------------------------------------------------------------------------------- |
| 외부활동 제외           | 보완 전략/주제 추천에서 외부활동 추천 금지                                       |
| 수상경력 제외           | 입시 반영 대상에서 제외                                                          |
| 평가 사유 분량          | 모든 평가 코멘트 최소 3~4줄 (200자 이상)                                         |
| 서울대 교과전형         | 서울대 교과전형 데이터 생성 금지                                                 |
| 표준편차 표현           | "표준편차보다 높다" 대신 "평균 대비 Z점수가 양수" 등 적절한 통계 표현 사용       |
| 진로역량 평가           | 단순 직업 탐구 ≠ 전공 관련 역량 구분                                             |
| 추천 퍼센트-멘트 일관성 | 합격률 높은 전형 = 주력 추천 전형으로 일치                                       |
| Lite 대학 추천          | 상향 2 + 안정 2 + 하향 2 = 6개 고정                                              |
| Standard 면접 질문      | 최대 20개                                                                        |
| Premium 면접 질문       | 30개                                                                             |
| Premium 세특 서술 예시  | 모든 주제 추천에 `sampleEvaluation` 필수                                         |
| Premium 분석 과목 수    | Standard보다 많은 과목 분석 (최소 2배)                                           |
| Premium 종합 코멘트     | 하위 플랜 이상 분량                                                              |
| Premium 지원 조합       | 수시 6개 + 정시 1개                                                              |
| 5등급제 백분위          | 정확한 누적 백분위 사용 (1등급=10%, 2등급=34%, 3등급=66%, 4등급=90%, 5등급=100%) |

---

## 8. 변경 우선순위

### P0 (즉시)

1. 브랜딩 SKYLOAD → SKYROAD (6개 파일)
2. 4대 역량 등급+사유 (`CompetencyScoreDetail` 타입 + 렌더러)
3. 외부활동/수상경력 제외 (AI 프롬프트)

### P1 (높음)

4. Lite 대학 추천 6개 고정
5. 평가 사유 최소 3~4줄 강제
6. Standard 주제 중요도 + 면접 질문 중요도/개수
7. Premium 면접 질문 30개
8. Premium 대학 추천 18개 조합별

### P2 (중간)

9. Premium 리스크 밴드/면접 타임라인 삭제
10. 5등급제 백분위 정확도
11. 서울대 교과전형 제외
12. Standard 다음 학기 전략 추가
13. Premium 실행 항목 우선순위

### P3 (낮음)

14. 권장과목 이수율 줄바꿈
15. 표준편차 표현 개선
16. 면접 질문 레이아웃 (요약 바로 밑 배치)
