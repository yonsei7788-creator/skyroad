# 이슈: 희망학과 오인식 (토목공학과 → 건축학과)

## 현상

사용자가 "토목공학과"를 희망학과로 입력했으나, AI 리포트 내에서 "건축학과"로 인식하여 분석이 진행됨.

## 설계 원칙

- **합격 예측(`admissionPrediction`) 외에는 희망학과를 AI에 전달하지 않음**
- `formatStudentProfile()`이 의도적으로 `targetDepartment`를 제외
- AI는 생기부만으로 `detectedMajorGroup`을 자체 판단하고, 이후 섹션은 이를 기반으로 동작
- 이 원칙은 "희망학과 끼워맞춤" 방지를 위한 핵심 설계이므로 유지해야 함

## 근본 원인: `majorEvaluationCriteria`의 "공학" 계열 과도 통합

`matchMajorEvaluationCriteria()`의 정규식이 성격이 다른 공학 학과들을 하나의 "공학" 계열로 뭉개고 있음:

```typescript
/공학|기계|전자|전기|건축|토목|산업|재료|신소재|화공/;
```

### 문제점

- 토목공학과, 건축학과, 기계공학과, 화학공학과가 **모두 동일한 평가 기준** 적용
- `keySubjects: ["수학", "물리", "화학", "정보"]` — 토목(지구과학), 건축(미술), 화공(화학 심화) 등 학과별 특성 미반영
- 이 `keySubjects`가 전처리의 핵심 계산에 직접 사용됨:
  - `extractMajorKeywords()` → 전공 관련 교과 필터링
  - `computeMajorRelated()` → 전공 관련 성적 vs 전체 성적 차이 계산
  - `formatMajorEvaluationContext()` → AI에 전달되는 계열 평가 기준 텍스트
  - `matchRecommendedCourses()` → 권장과목 매칭

### 오인식 흐름

```
토목공학과 → matchMajorEvaluationCriteria() → "공학" 계열
                                                  ↓
                                    keySubjects: [수학, 물리, 화학, 정보]
                                                  ↓
                          majorEvaluationContextText: "공학 계열 (기계/전자/화학공학 등)"
                                                  ↓
                AI가 "공학 계열"이라는 포괄적 컨텍스트만 보고 → 건축학과로 귀결
```

### 커리어넷 컨텍스트의 보완 한계

`findMajorInfo("토목공학과")`는 DB에서 정확 매칭되어 토목공학과 고유 관련 교과를 `careerNetContext`로 추가하지만, 이 정보는 `keySubjects`를 덮어쓰지 않아 보완 효과가 제한적.

## 영향 범위

- `computeMajorRelated()`: 전공 관련 교과 성적 산출 시 토목 특화 교과 누락
- `majorEvaluationContextText`: AI가 받는 계열 설명이 토목과 무관한 "공학 전반"
- `recommendedCourseMatch`: 권장과목이 토목이 아닌 일반 공학 기준
- `admissionStrategy`: detectedMajorGroup 기반 대학군/전략이 부정확할 수 있음

## 해결 방향

### "공학" 계열을 하위 분류로 세분화

`major-evaluation-criteria.ts`에서 "공학" 단일 계열을 학과 특성별로 분리:

| 하위 계열      | 정규식 예시                        | keySubjects          |
| -------------- | ---------------------------------- | -------------------- |
| 건설/토목      | `/토목\|건설\|도시\|환경공/`       | 수학, 물리, 지구과학 |
| 건축           | `/건축/`                           | 수학, 물리, 미술     |
| 기계/전자/전기 | `/기계\|전자\|전기\|로봇\|자동차/` | 수학, 물리, 정보     |
| 화학공학       | `/화공\|화학공\|재료\|신소재/`     | 수학, 화학, 물리     |
| 산업/시스템    | `/산업\|시스템\|경영공/`           | 수학, 정보, 경제     |

이렇게 하면 AI에 희망학과를 전달하지 않아도, 전처리 단계에서 정확한 `keySubjects` → 정확한 `majorEvaluationContextText` → AI의 정확한 분석으로 이어진다.
