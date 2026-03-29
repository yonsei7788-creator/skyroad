# competitiveProfiling UI/UX 설계서

> **작성일**: 2026-03-29
> **버전**: v1.0
> **대상**: 풀스택 개발자 (구현 가이드)
> **기반**: `competitive-profiling-spec.md`, 기존 리포트 디자인 시스템

---

## 1. 디자인 시스템 분석 요약

기존 리포트는 `report.module.css`의 CSS Module 기반 디자인 시스템을 사용한다. Tailwind가 아닌 **CSS 변수 + CSS Module 클래스** 체계이므로, 이 설계서의 색상값은 CSS 변수 또는 hex 값으로 표기한다.

### 1.1 핵심 패턴 (기존 컴포넌트에서 추출)

| 패턴            | CSS 클래스                                         | 사용처           |
| --------------- | -------------------------------------------------- | ---------------- |
| 섹션 헤더       | `sectionHeader` + `sectionNumber` + `sectionTitle` | 모든 섹션 상단   |
| 기본 카드       | `card` (border + radius-md + padding 20px 24px)    | 정보 블록        |
| 강조 카드       | `cardAccent` (card + border-top 2px accent)        | 추천 경로, 전략  |
| 하이라이트 카드 | `cardHighlight` (card + ::before accent bar)       | 키워드 카드      |
| 인용 박스       | `quoteBox` (왼쪽 큰따옴표 + italic)                | 평가 문구 인용   |
| 콜아웃          | `callout` (flex + gap 14px + bg slate-50)          | 핵심 해석        |
| AI 코멘터리     | `aiCommentary` (left border 3px + icon + label)    | 점수 해석        |
| 태그            | `tag` (pill shape, 50px radius)                    | 우선순위, 키워드 |
| 강점/약점 태그  | `tagStrength` / `tagWeakness`                      | 긍정/부정 라벨   |
| 히어로 패널     | `competencyHero` (center-aligned, score + bar)     | 종합 점수        |
| 판정 박스       | `verdict` (center, rounded-lg, border)             | 총평             |
| 3열 그리드      | `cardGridThree` (grid 3col)                        | 키워드 카드      |
| 프로그레스 바   | `progressBar` + `progressFill`                     | 진행률 표시      |
| 형광펜          | `markerYellow` / `markerSky`                       | 강조 텍스트      |

### 1.2 타이포그래피 스케일

| 용도           | 클래스               | 크기            |
| -------------- | -------------------- | --------------- |
| 디스플레이     | -                    | 2.5rem          |
| h1             | `h1`                 | 2rem / 800      |
| h2 (섹션 제목) | `h2`, `sectionTitle` | 1.5rem / 700    |
| h3 (서브섹션)  | `h3`                 | 1.25rem / 600   |
| 부제           | `subtitle`           | 1.0625rem / 500 |
| 본문           | `body`               | 1rem / 400      |
| 작은 본문      | `small`              | 0.9375rem / 400 |
| 캡션           | `caption`            | 0.875rem / 500  |
| 오버라인       | `overline`           | 0.8125rem / 600 |

### 1.3 간격 유틸리티

`mt4`, `mt6`, `mt8`, `mt10`, `mt12`, `mt16`, `mt20`, `mt24`, `mb4` ~ `mb20` 등 사용 가능.

---

## 2. 레벨별 색상 팔레트

기존 디자인 시스템의 시맨틱 색상을 활용하되, **이 섹션 전용 레벨 색상**을 CSS 변수로 추가 정의한다.

### 2.1 색상 정의

```css
/* competitiveProfiling 레벨 색상 — report.module.css에 추가 */

/* 상 (합격권) — 기존 strength 계열 활용 */
--cp-high-fg: #059669; /* emerald-600 */
--cp-high-bg: #ecfdf5; /* emerald-50 */
--cp-high-border: #a7f3d0; /* emerald-200 */
--cp-high-accent: #10b981; /* emerald-500 (바/게이지 fill) */

/* 중 (경쟁 구간) — 기존 caution 계열 활용 */
--cp-mid-fg: #d97706; /* amber-600 */
--cp-mid-bg: #fffbeb; /* amber-50 */
--cp-mid-border: #fde68a; /* amber-200 */
--cp-mid-accent: #f59e0b; /* amber-500 (바/게이지 fill) */

/* 하 (비경쟁 구간) — 기존 weakness 계열 활용 */
--cp-low-fg: #dc2626; /* red-600 */
--cp-low-bg: #fef2f2; /* red-50 */
--cp-low-border: #fecaca; /* red-200 */
--cp-low-accent: #ef4444; /* red-500 (바/게이지 fill) */
```

### 2.2 레벨 매핑 테이블

| 요소        | 상                     | 중                               | 하                |
| ----------- | ---------------------- | -------------------------------- | ----------------- |
| 배경색      | `#ecfdf5`              | `#fffbeb`                        | `#fef2f2`         |
| 텍스트      | `#059669`              | `#d97706`                        | `#dc2626`         |
| 테두리      | `#a7f3d0`              | `#fde68a`                        | `#fecaca`         |
| 게이지 fill | `#10b981`              | `#f59e0b`                        | `#ef4444`         |
| 뱃지 스타일 | `ratingExcellent` 계열 | `ratingAverage` 계열(amber 변형) | `ratingWeak` 계열 |

### 2.3 레벨 뱃지 CSS 클래스 (신규)

```css
.cpBadgeHigh {
  composes: ratingBadge;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.cpBadgeMid {
  composes: ratingBadge;
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.cpBadgeLow {
  composes: ratingBadge;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
```

---

## 3. 전체 레이아웃 구조

```
CompetitiveProfilingRenderer
├── [Block 0] SectionHeader + 핵심 요약 카드
├── [Block 1] 정량 분석 (히어로 패널 + 게이지)
├── [Block 2] 현재 학생 특징 (태그 + 메타 + 평가)
├── [Block 3] 실제 탈락 구조 (콜아웃)
├── [Block 4] 합격 전환 메커니즘 (3단계 스텝)
├── [Block 5] 경쟁자 대비 핵심 차이 (3열 카드 + 인용)
├── [Block 6] 입학사정관 한줄 평가 (인용 박스)
├── [Block 7] 실행 전략 (체크리스트 카드)
└── [Block 8] 최종 결론 (배너)
```

각 Block은 `<div>`로 감싸서 `AutoPaginatedSection`의 페이지 분할 단위가 된다. 이는 기존 `WeaknessAnalysisRenderer`, `AdmissionStrategyRenderer` 등과 동일한 패턴이다.

---

## 4. 서브섹션별 상세 설계

### 4.0 핵심 요약 (Block 0)

**UI 패턴**: `SectionHeader` + 레벨 컬러 `cardAccent` 변형

**구조**:

```
┌─────────────────────────────────────────────┐
│ [17]  비교과 경쟁력 정밀 분석               │  ← SectionHeader
├─────────────────────────────────────────────┤
│                                             │
│  ┌── 레벨컬러 border-top 카드 ────────────┐ │
│  │  현재 상태                     [뱃지]  │ │  ← overline + cpBadge{level}
│  │                                        │ │
│  │  "합격권에는 진입했으나, 최종 선발을    │ │  ← body, fontWeight: 500
│  │   결정짓는 차별성은 다소 부족한 구조"   │ │
│  │                                        │ │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │ │  ← divider dashed
│  │                                        │ │
│  │  합격 분기점                            │ │  ← overline
│  │  "{전공 방향} 전공에 대한 설득력"과     │ │  ← small, emphasis로 변수 부분 강조
│  │  "활동 간 연결 구조 형성 여부"에서      │ │
│  │  결과가 결정될 가능성이 높습니다.       │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 카드: `card` 기반, `border-top: 2px solid {cp-level-accent}` 동적 적용
- "현재 상태" 라벨: `overline` 클래스
- 레벨 뱃지: `cpBadge{High|Mid|Low}` (cardHeader 우측 배치)
- 고정 멘트: `body` + `fontWeight: 500`
- 구분선: `border-top: 1px dashed var(--report-border)` (인라인 또는 유틸 클래스)
- "합격 분기점" 라벨: `overline` + `mt12`
- 합격 분기점 문장: `small`, `{전공 방향}` 부분은 `emphasis` 클래스로 래핑

---

### 4.1 정량 분석 (Block 1)

**UI 패턴**: `competencyHero` 변형 (히어로 패널 + 게이지 바 + 구간 뱃지)

**구조**:

```
┌─────────────────────────────────────────────┐
│           ┌── 히어로 패널 ──────────────┐   │
│           │  비교과 경쟁력 점수          │   │  ← competencyHeroOverline 변형
│           │                              │   │
│           │         72                   │   │  ← competencyHeroScore (레벨 색상)
│           │        / 100                 │   │  ← competencyHeroDenom
│           │                              │   │
│           │  ████████████░░░░  [합격권]  │   │  ← 게이지 바 + 뱃지
│           │                              │   │
│           └──────────────────────────────┘   │
│                                             │
│  ┌── aiCommentary ──────────────────────┐   │
│  │ ✦  핵심 해석                          │   │
│  │    현재 평가는 단순한 우열이 아니라    │   │
│  │    "얼마나 명확하게 해석되는가"에      │   │
│  │    따라 갈리는 구간입니다.             │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 히어로 패널: `competencyHero` 클래스 재사용
- 점수 숫자: `competencyHeroScore`에 레벨 색상 동적 적용 (`color: {cp-level-fg}`)
- 게이지 바: `competencyHeroBar` 재사용, fill 색상을 `{cp-level-accent}`로
- 구간 뱃지: 게이지 바 우측에 `cpBadge{level}` 배치 (inline-flex, gap 12px)
- 핵심 해석: `aiCommentary` 패턴 그대로 사용
- 게이지 바와 뱃지를 감싸는 row: `display: flex; align-items: center; justify-content: center; gap: 12px;`

**게이지 구간 시각화** (선택적 개선):

- 게이지 바 아래에 구간 표시선(tick marks) 추가 가능: 30, 50, 70 지점
- 현재 점수 위치에 작은 삼각형 인디케이터
- 복잡도를 고려하여 v1에서는 단순 fill + 뱃지로 충분

---

### 4.2 현재 학생 특징 (Block 2)

**UI 패턴**: 태그 그룹 + 메타 정보 행 + 평가 결과 카드

**구조**:

```
┌─────────────────────────────────────────────┐
│  ── 현재 학생 특징 ──                        │  ← h3 (competencySectionLabel 패턴)
│                                             │
│  핵심 활동 키워드                             │  ← overline
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │
│  │데이터분석│ │마케팅기획 │ │소비자심리   │  │  ← tagAccent (pill)
│  └─────────┘ └──────────┘ └─────────────┘  │
│                                             │
│  ┌── 메타 정보 행 ──────────────────────┐   │
│  │  비교과 수준: [중]    연결성: [보통]   │   │  ← caption + cpBadge
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── 평가 결과 카드 (레벨 컬러) ────────┐   │
│  │  평가 결과                            │   │  ← overline
│  │  "1차 통과 후, 최종 단계에서           │   │  ← small, emphasis
│  │   탈락 가능성 존재"                    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 서브섹션 제목: `h3` 또는 `competencySectionLabel` 패턴
- 키워드 태그: `tagGroup` + 각 키워드는 `tagAccent` 클래스
- 메타 정보 행: `display: flex; gap: 24px;` 래퍼 안에 각 항목은 `caption` + 뱃지
  - "비교과 수준" 라벨: `caption`
  - 수준 값: `cpBadge{level}` (레벨에 따라)
  - "연결성" 라벨: `caption`
  - 연결성 값: 연결성 전용 뱃지 (있음=green계, 보통=neutral, 없음=red계)
- 평가 결과 카드: `card` + `border-left: 3px solid {cp-level-accent}` (callout 변형)
  - "평가 결과" 라벨: `overline`
  - 멘트: `small` + `emphasis` 색상을 레벨 색상으로

**연결성 뱃지 색상**:
| 연결성 | bg | color | border |
|--------|------|--------|---------|
| 있음 | `#ecfdf5` | `#059669` | `#a7f3d0` |
| 보통 | `#f1f5f9` | `#1e293b` | `#e2e8f0` |
| 없음 | `#fef2f2` | `#dc2626` | `#fecaca` |

---

### 4.3 실제 탈락 구조 (Block 3)

**UI 패턴**: 강조 콜아웃(callout) + 레벨별 원인 박스

**구조**:

```
┌─────────────────────────────────────────────┐
│  ── 실제 탈락 구조 ──                        │  ← h3
│                                             │
│  ┌── 콜아웃 (공통 핵심) ────────────────┐   │
│  │  ⚠                                    │   │  ← calloutCaution 변형
│  │  "현재 탈락은 부족해서가 아니라,       │   │
│  │   평가 과정에서 '명확하게 설명되지     │   │
│  │   않기 때문'에 발생합니다."            │   │  ← calloutContent, 작은따옴표 부분 emphasis
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── 레벨별 원인 카드 (레벨 컬러) ──────┐   │
│  │  구체적 탈락 원인                      │   │  ← overline
│  │  "유사한 상위권 학생 간 비교에서       │   │  ← body, fontWeight: 500
│  │   밀리는 구조"                         │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 공통 문장: `callout` 클래스 사용, `calloutCaution` 변형 (amber 계열 bg)
  - 아이콘: 텍스트로 "!" 또는 경고 아이콘 SVG, `calloutIcon` 위치
  - 강조: `'명확하게 설명되지 않기 때문'` 부분에 `emphasis` 적용
- 레벨별 원인: `card` + `background: {cp-level-bg}` + `border-color: {cp-level-border}`
  - "구체적 탈락 원인" 라벨: `overline`
  - 멘트: `body`, `fontWeight: 500`

---

### 4.4 합격 전환 메커니즘 (Block 4)

**UI 패턴**: 3단계 스텝 (번호 원형 + 연결선) + 예상 변화 리스트

**구조**:

```
┌─────────────────────────────────────────────┐
│  ── 합격 전환 메커니즘 ──                    │  ← h3
│                                             │
│  핵심 조건 3가지                             │  ← overline
│                                             │
│  ① ── 핵심 방향성 정의 ─────────────────    │
│  │   "이 학생은 {키워드 기반}으로           │
│  │    {전공 방향}을 준비한 학생"             │
│  │                                          │
│  ② ── 활동 재해석 ──────────────────────    │
│  │   "{키워드 활동}을 중심으로               │
│  │    모든 경험 재정렬"                      │
│  │                                          │
│  ③ ── 세특 구조 강화 ───────────────────    │
│      "탐구 → 결과 → 의미 → 진로 연결"       │
│                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                             │
│  예상 변화                                   │  ← overline
│  ┌── accent card ───────────────────────┐   │
│  │  1. 이해도 상승                       │   │
│  │  2. 평가 시간 단축                    │   │
│  │  3. 기억에 남는 학생으로 전환          │   │
│  │  → 결과: 합격 가능성 상승              │   │  ← emphasis + markerYellow
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 스텝 UI: 커스텀 CSS (신규 추가 필요)

  ```css
  .cpStep {
    display: flex;
    gap: 16px;
    padding: 12px 0;
  }

  .cpStepNumber {
    /* accent 색상 원형 번호 */
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--report-accent);
    color: #fff;
    font-size: var(--report-fs-caption);
    font-weight: 700;
    flex-shrink: 0;
  }

  .cpStepContent {
    flex: 1;
  }

  .cpStepTitle {
    font-size: var(--report-fs-small);
    font-weight: 600;
    color: var(--report-fg);
    margin-bottom: 4px;
  }

  .cpStepBody {
    font-size: var(--report-fs-caption);
    color: var(--report-fg-secondary);
    line-height: 1.5;
  }

  /* 스텝 간 연결선: cpStep + cpStep에 border-top 또는 left border */
  .cpStep + .cpStep {
    border-top: 1px dashed var(--report-border);
  }
  ```

- 예상 변화: `cardAccent` 안에 번호 리스트
  - 1~3번: `caption` 클래스
  - 4번 결과: `caption` + `emphasis` + `markerYellow`

---

### 4.5 경쟁자 대비 핵심 차이 (Block 5)

**UI 패턴**: 3열 카드 그리드 + 인용 박스

**구조**:

```
┌─────────────────────────────────────────────┐
│  ── 경쟁자 대비 핵심 차이 ──                 │  ← h3
│                                             │
│  차이 발생 영역                              │  ← overline
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 방향성   │ │ 메시지   │ │ 구조     │    │  ← cardHighlight (3열 그리드)
│  │ 명확도   │ │ 전달력   │ │ 완성도   │    │
│  │          │ │          │ │          │    │
│  │ (아이콘) │ │ (아이콘) │ │ (아이콘) │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                             │
│  ┌── 인용 박스 ─────────────────────────┐   │
│  │  "  핵심 차이                         │   │  ← quoteBox 패턴
│  │     경쟁자는 한 문장으로 설명되지만,   │   │
│  │     현재 학생은 설명이 필요한           │   │
│  │     상태입니다.                        │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 3열 그리드: `cardGridThree` 재사용
- 각 영역 카드: `cardHighlight` (상단 accent bar)
  - 영역명: `cardTitle` + `mb8`
  - 아이콘: 간단한 이모지 또는 SVG (선택적)
    - 방향성 명확도: 나침반 / "🧭" 또는 생략
    - 메시지 전달력: 메가폰 / "📢" 또는 생략
    - 구조 완성도: 블록 / "🏗" 또는 생략
    - **권장: 아이콘 생략하고 텍스트만** (기존 리포트에 이모지 패턴 없음)
  - 설명: 필요시 `small`로 짧은 부연 가능 (v1에서는 영역명만으로 충분)
- 인용 박스: `quoteBox` 패턴 그대로 사용
  - `quoteText` 클래스로 멘트 렌더링

---

### 4.6 입학사정관 한줄 평가 (Block 6)

**UI 패턴**: `quoteBox` (인용 박스)

**구조**:

```
┌─────────────────────────────────────────────┐
│  ── 입학사정관 시선 ──                        │  ← h3
│                                             │
│  ┌── quoteBox ──────────────────────────┐   │
│  │  "  {전공 방향} 전공에 대한 관심과     │   │
│  │     준비는 확인되지만, 선발을 결정할   │   │
│  │     만큼의 명확한 설득력은 다소        │   │
│  │     부족하다.                          │   │
│  │                                       │   │
│  │     — 입학사정관 관점 평가             │   │  ← quoteEvaluation (출처)
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- `quoteBox` 패턴 그대로 사용
- 멘트: `quoteText` (italic)
- 출처 라벨: `quoteEvaluation` 에 "— 입학사정관 관점 평가" 고정 텍스트
- `{전공 방향}` 부분: 별도 강조 없이 자연스럽게 치환 (italic 안에서 bold가 오히려 어색)

---

### 4.7 실행 전략 (Block 7)

**UI 패턴**: 번호 카드 리스트 (체크리스트 스타일)

**구조**:

```
┌─────────────────────────────────────────────┐
│  ── 반드시 해야 할 3가지 ──                  │  ← h3 + markerYellow
│                                             │
│  ┌── card ──────────────────────────────┐   │
│  │  01  핵심 캐릭터 정의                 │   │  ← 번호 + cardTitle (bold)
│  │  "이 학생은 {키워드 기반}으로          │   │  ← small
│  │   {전공 방향}을 준비한 학생"           │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── card ──────────────────────────────┐   │
│  │  02  활동 구조 재정리                 │   │
│  │  "핵심 활동 중심으로 강조"             │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── card ──────────────────────────────┐   │
│  │  03  세특 구조 통일                   │   │
│  │  "탐구 흐름 기반 재구성"               │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 제목: `h3` + `markerYellow` ("반드시 해야 할 3가지")
- 각 항목: `card` 클래스
  - 번호: 인라인으로 `"01"` 형식, `emphasis` 또는 accent 색상 적용
  - 항목명: `cardTitle` 급 (h3 크기는 아니고, `tableCellBold` 정도가 적당)
  - 멘트: `small` 클래스
- 번호 + 항목명을 하나의 행으로: `display: flex; align-items: baseline; gap: 8px;`

**대안 (cpStep 재사용)**: 4.4의 `cpStep` 패턴을 여기서도 재사용하면 시각적 일관성이 높아진다. 다만 여기는 "전략 항목"이므로 카드로 감싸는 것이 더 적합.

---

### 4.8 최종 결론 (Block 8)

**UI 패턴**: 레벨 컬러 풀 배너 (`verdict` 변형)

**구조**:

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌── 배너 (레벨 컬러 bg) ───────────────┐  │
│  │                                       │  │
│  │            최종 결론                   │  │  ← verdictTitle 변형
│  │                                       │  │
│  │   "합격 가능성은 있으나, 현재          │  │  ← verdictBody
│  │    구조로는 선택받기 어려운 상태"       │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

**CSS 구현 가이드**:

- 기존 `verdict` 클래스를 기반으로 레벨별 변형:

  ```css
  .cpVerdictHigh {
    composes: verdict;
    background: #ecfdf5;
    border-color: #a7f3d0;
  }

  .cpVerdictMid {
    composes: verdict;
    background: #fffbeb;
    border-color: #fde68a;
  }

  .cpVerdictLow {
    composes: verdict;
    background: #fef2f2;
    border-color: #fecaca;
  }
  ```

- "최종 결론" 제목: `verdictTitle` (center-aligned)
- 멘트: `verdictBody` + `fontWeight: 500`
- 전체 배너 패딩: 기존 verdict의 `var(--report-space-lg)` 유지

---

## 5. 신규 CSS 클래스 요약

기존 `report.module.css`에 추가해야 할 클래스 목록:

| 클래스          | 용도                              | 기반                  |
| --------------- | --------------------------------- | --------------------- |
| `cpBadgeHigh`   | 상 레벨 뱃지                      | `ratingBadge` compose |
| `cpBadgeMid`    | 중 레벨 뱃지                      | `ratingBadge` compose |
| `cpBadgeLow`    | 하 레벨 뱃지                      | `ratingBadge` compose |
| `cpVerdictHigh` | 상 최종 결론 배너                 | `verdict` compose     |
| `cpVerdictMid`  | 중 최종 결론 배너                 | `verdict` compose     |
| `cpVerdictLow`  | 하 최종 결론 배너                 | `verdict` compose     |
| `cpStep`        | 스텝 항목 래퍼                    | 신규                  |
| `cpStepNumber`  | 스텝 번호 원형                    | 신규                  |
| `cpStepContent` | 스텝 콘텐츠 영역                  | 신규                  |
| `cpStepTitle`   | 스텝 제목                         | 신규                  |
| `cpStepBody`    | 스텝 본문                         | 신규                  |
| `cpMetaRow`     | 메타 정보 행 (수준 + 연결성)      | 신규 (flex row)       |
| `cpMetaItem`    | 메타 정보 개별 항목               | 신규                  |
| `cpLevelCard`   | 레벨 색상 카드 (동적 border-left) | `card` 변형           |

총 약 14개 신규 클래스. 기존 클래스 약 20개+ 재사용.

---

## 6. 컴포넌트 파일 구조

```
app/report/_components/
├── CompetitiveProfilingRenderer.tsx   ← 메인 렌더러
├── report.module.css                  ← 신규 클래스 추가
```

별도 서브 컴포넌트 분리는 불필요하다. 기존 패턴(WeaknessAnalysisRenderer, AdmissionStrategyRenderer 등)과 동일하게 **단일 파일**로 모든 서브섹션을 렌더링한다.

### 6.1 Props 인터페이스

```typescript
interface CompetitiveProfilingRendererProps {
  data: CompetitiveProfilingSection;
  sectionNumber: number;
  plan?: ReportPlan;
}
```

### 6.2 프론트엔드 상수 파일

고정 멘트 상수는 렌더러 파일 상단 또는 별도 상수 파일에 정의:

```
app/report/_components/competitive-profiling-templates.ts
```

`TEMPLATES` 객체로 기획서 3장의 전체 멘트 사전을 관리한다.

---

## 7. 기존 디자인과의 일관성 체크리스트

| 항목                              | 일관성 확인 | 비고                                    |
| --------------------------------- | ----------- | --------------------------------------- |
| SectionHeader 사용                | O           | 동일 패턴                               |
| card / cardAccent / cardHighlight | O           | 기존 클래스 재사용                      |
| quoteBox / callout / aiCommentary | O           | 기존 클래스 재사용                      |
| tagGroup + tag 계열               | O           | 기존 클래스 재사용                      |
| competencyHero 패턴               | O           | 점수 패널 재사용                        |
| verdict 패턴                      | O           | 배너 재사용                             |
| 타이포그래피 스케일               | O           | h3, overline, body, small, caption 사용 |
| 간격 유틸                         | O           | mt/mb 시리즈 사용                       |
| 색상 체계                         | O           | strength/caution/weakness 계열 확장     |
| PDF 페이지 분할                   | O           | Block 단위 div 래핑                     |
| 형광펜 마커                       | O           | markerYellow, markerSky 활용            |
| 플랜별 분기                       | 해당 없음   | 전 플랜 동일 구조                       |

---

## 8. 구현 우선순위

전체 Block이 동일 수준의 중요도이므로 순서대로 구현하되, 아래를 먼저 완료:

1. **CSS 클래스 추가** (report.module.css에 14개 클래스)
2. **상수 파일** (고정 멘트 + 변수 치환 함수)
3. **렌더러 구현** (Block 0~8 순차)
4. **SectionRenderer 등록** (기존 섹션 라우팅에 추가)
5. **PDF 렌더링 확인** (AutoPaginatedSection 동작 검증)
