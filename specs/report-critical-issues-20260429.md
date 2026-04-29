# 리포트 Critical 이슈 정리 (2026-04-29 검증)

**검토 대상**

- Report ID: `6b3904e1-fa82-49c4-942b-f6c27c5bcd22`
- Record ID: `a651e586-1be9-4b04-ab8d-0c0535f3676b`
- Plan: `standard` / Schema v4 / Model: `gemini-2.5-flash-lite`
- 학생 컨텍스트: 보정고(일반고) 3학년, 1지망 연세대 생물학과(학종), 진로 약학연구원

**범위**

리포트 본문 자체의 결함 중 **즉각 신뢰가 무너지거나 면접 준비에서 학생에게 직접 피해가 발생할** 항목만. 데이터 무결성·잠재적 오류·표현 일관성 등은 별도.

---

## 1. 점수 시스템이 산술적으로 안 맞음 (`competencyScore`) - 수정 완료 (미검증)

| 항목                                   | 출력값                       | 검증                                                             |
| -------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `totalScore` / `comparison.myScore`    | **321**                      | 학업 91 + 진로 86 + 공동체 74 = **251** (70점 차이)              |
| `interpretation`                       | "총점 321점(**300점 만점**)" | 만점 300인데 321 — **만점 초과**                                 |
| `growthGrade` / `growthScore`          | "B" / 67                     | `growthComment` 끝에 "**A등급으로 평가됩니다**" — 등급 라벨 모순 |
| `scores[].subcategories[교과이수노력]` | score=18 / max=25            | comment "**-2점 감점**"인데 실제 25-18=−7                        |
| `scores[].subcategories[교과성취도]`   | score=33 / max=35            | comment "**-3점 감점**"인데 실제 35-33=−2                        |

**왜 critical**: 한 화면에 점수와 설명이 같이 노출됨. 학생/학부모가 단순 검산만 해도 즉시 모순 인지 → 리포트 전체 신뢰도가 즉시 무너짐.

**수정 방향**

- 합산은 코드에서 결정론적으로 계산 후 LLM에 주입하거나 postprocessor에서 강제 덮어쓰기 (`postprocessor.ts`의 force-override 패턴 활용)
- subcategory comment의 "-N점 감점" 문구를 LLM이 자유 서술하지 못하게, 코드 산출 점수와 자동으로 동기화되는 템플릿으로 강제
- `growthGrade`/`growthComment`도 동일 — grade는 score에서 결정, comment는 grade와 일치하도록 검증

---

## 2. 두 섹션이 정반대 권고 (미이수 과목 처리) - 수정 완료 (미검증)

```
courseAlignment.recommendation
  → "미이수 과목은 이미 이수 기회가 지났으므로, 면접에서 미이수 사유를
     명확히 설명하고 관련 지식을 독학으로 보완했음을 어필"

academicAnalysis.gradeChangeAnalysis.actionItems[1]
  → "3학년 1학기 선택 과목으로 미적분, 확률과 통계 등을 이수하며
     수학 심화 역량을 강화하세요"

consultantReview.completionDirection
  → "3학년 1학기에는 이수 예정인 심화 수학 과목(미적분, 확률과 통계 등)과
     연계하여 약학 연구에서의 수학적 모델링 활용 방안에 대한 탐구를 추가하면…"
```

**왜 critical**: 한쪽은 "끝났다, 디펜스 준비해", 다른 쪽들은 "지금 이수해". 학생이 어느 쪽을 따라야 하는지 결정 불가. 더구나 4월 말 시점 = 3학년 1학기 시작 단계라 선택 가능 → **`courseAlignment` 쪽이 사실 오류**.

**수정 방향**

- `courseAlignment` 프롬프트에서 "이수 기회가 지났음" 단정 표현 금지
- 학생의 현재 학년/학기 컨텍스트를 입력에 명시하고, 잔여 학기에 이수 가능한 과목/시점을 코드로 판단해서 LLM에 제공
- 프롬프트에서 "졸업생/3학년 2학기 이후" 케이스 분기와 그 이전 케이스 분기를 명시적으로 분리

---

## 3. 학생이 안 한 활동·안 들은 과목으로 분석이 들어감 - 수정 완료 (미검증)

### 3-a. `subjectAnalysis.subjects[]`에 "물리학1"

- 학생 이수 과목 27개 어디에도 **물리학Ⅰ 부재** (record_general_subjects / career_subjects / arts_physical_subjects 모두 확인)
- 같은 리포트의 `courseAlignment`에서는 정확히 "물리학Ⅰ — **미이수**"로 표시
- 분석에 인용된 keyQuotes(아치 구조, 화성 테라포밍, 게이트웨이 아치)는 실제로는 **1학년 「과학탐구실험」** 출처를 잘못 라벨링한 것

### 3-b. `activityAnalysis`의 "학급 규칙 제정 프로젝트 (1학년)"

- 1학년 자율활동 본문(record_creative_activities, year=1, area=자율활동) 전체 검토 결과 "**학급 규칙 제정**" 활동·표현 부재
  - 실제 1학년 자율활동 = 학급자치회 회장(2학기), 영어 스피치(동물실험), 세계시민의식 발표, 자율 독서 클럽
- `activityAnalysis.activities[자율].yearlyAnalysis[year=1].summary`에서 "**학급 회장으로서 규칙 제정에 주도적으로 참여**"로 환각이 반복
- 동 섹션의 insight: "면접에서 '학급 규칙 제정 시 가장 어려웠던 점과 해결 과정'에 대한 질문이 나올 수 있으니 구체적인 사례를 준비"

**왜 critical**: 환각된 활동이 **면접 추천 질문의 근거**로 들어감. 학생이 그 질문에 "그런 적 없는데요"라고 답해야 함 — 면접 직전 준비 자료로 활용 시 직접 피해.

**수정 방향**

- subjectAnalysis 프롬프트에서 분석 대상 과목 라벨을 학생 이수 과목 리스트로 화이트리스트 강제
- activityAnalysis의 keyActivities는 입력 데이터(record_creative_activities)에 실제로 등장한 표현으로 quote 강제 (생기부 원문 인용 의무화 + 미존재 어휘 금지)
- postprocessor에서 subjectAnalysis 과목명이 학생 이수 과목 집합에 속하는지 검증 후 누락 처리

---

## 4. 3학년 데이터 0건인데 3학년 성장 평가가 단정적 - 수정 완료 (미검증)

```
consultantReview.growthPotential
  → "1학년부터 3학년까지 꾸준히 약학 계열에 대한 관심이 심화되고
     탐구의 깊이가 확장되는 성장 궤적이 명확하게 나타납니다"

competencyScore.growthComment
  → "2학년에서 3학년으로 넘어가는 시점의 학업 성취도 상승 폭이
     다소 아쉬워 A등급으로 평가됩니다"
```

- 학생 데이터: 1·2학년만 존재. record_creative_activities에 year=3 행은 hours=0/note=빈값 (더미). 출결·성적·세특·수상·봉사 모두 3학년 0건
- 4월 말 시점 = 3학년 1학기 시작 단계

**왜 critical**: 존재하지 않는 데이터로 단정 평가. growthScore=67 자체의 근거 부재.

**수정 방향**

- 3학년 활동/성적 데이터 존재 여부를 입력 메타로 LLM에 전달
- 프롬프트에 "3학년 데이터 부재 시 3학년 평가 금지, 1·2학년만으로 서술" 가드 추가
- competencyScore의 growth 항목 자체를 "데이터 부족"으로 처리하거나 score/grade를 "평가 보류" 상태로 설계

## 부수 이슈 (수정하면 좋지만 즉각 신뢰 붕괴는 아님)

같은 검토에서 발견된, **위 5건에 묶이지 않는 항목** — 우선순위 낮음:

- `academicAnalysis.subjectStatAnalyses[수학]` interpretation에 "**2학년 1학기 화학Ⅰ**" 한 줄 끼어듦 → 정보 오염이나 한 문장
- `gradeTrend = "유지"` vs interpretation/prediction에서는 "상승 추세" → 표현 일관성. 실제 학기별 평균은 V자 회복(2.21→2.54→2.83→2.26)
- `majorRelevanceAnalysis` 내부 두 문장 미세 톤 충돌 ("전공 평균 2.98로 낮음" vs "약학 관련 과목 우수")
- `majorRelevanceAnalysis`에서 **지구과학Ⅰ을 약학 계열 관련 과목**으로 분류 (약학 핵심교과 아님)
- `consultantReview.courseEffort`: "1학년 때 4등급을 기록했던 **수학Ⅰ**이 2학년 때 4등급으로 유지" → 1학년 과목명은 "수학"(수학Ⅰ는 2학년 과목). 다른 과목을 같은 이름으로 묶음
- `subjectAnalysis`가 7개 과목만 다루며 핵심(2학년 수학Ⅰ·수학Ⅱ·영어Ⅰ·Ⅱ·지구과학Ⅰ) 누락 → standard 플랜 분량 한계 가능성. 단 interviewPrep는 2학년 수학Ⅱ를 인용하므로 두 섹션이 단절됨 (3-a와 함께 해결되면 자동 정리)
- `subjectAnalysis.subjects[화학Ⅰ].competencyTags[2].assessment = "very_high"` → 다른 곳은 "우수/보통" 한글, 여기만 영문 enum (형식 일관성)
- `attendanceAnalysis`에서 "개근" 텍스트 + 0/0/0/0… 숫자 동시 출력 → 정보 중복

---

## 우선순위 요약

| 우선 | 이슈                                              | 수정 위치                                                            |
| ---- | ------------------------------------------------- | -------------------------------------------------------------------- |
| P0   | 점수 합산/만점/감점 표기/growth grade 모순        | `competencyScore` 프롬프트 + postprocessor force-override            |
| P0   | 미이수 과목 정반대 권고                           | `courseAlignment` 프롬프트 + 학년/학기 컨텍스트 주입                 |
| P0   | 물리학1 환각 라벨링 / 학급 규칙 제정 환각         | `subjectAnalysis` 화이트리스트 + `activityAnalysis` 인용 의무화      |
| P0   | 3학년 데이터 부재 평가                            | 입력 메타 가드 + competencyScore.growth 평가 보류 처리               |
| P0   | majorExploration 약학과 부재 + 섹션 간 1지망 충돌 | suggestions 진로 일관성 강화 + admissionPrediction과의 컨텍스트 공유 |
| P1   | 부수 이슈(위 목록)                                | 점진적 개선                                                          |
