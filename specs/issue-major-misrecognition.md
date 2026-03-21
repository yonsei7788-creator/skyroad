# 이슈: 희망학과 오인식 (토목공학과 → 건축학과)

## 현상

사용자가 "토목공학과"를 희망학과로 입력했으나, AI 리포트 내에서 "건축학과"로 인식하여 분석이 진행됨.

## 근본 원인

### 1. 계열 수준 뭉개짐 (`major-evaluation-criteria.ts`)

`matchMajorEvaluationCriteria()`의 정규식이 토목공학과와 건축학과를 동일한 "공학" 계열로 분류:

```typescript
/공학|기계|전자|전기|건축|토목|산업|재료|신소재|화공/;
```

- 토목공학과 → "공학" 계열
- 건축학과 → "공학" 계열
- 두 학과의 평가기준(`keySubjects`, 가중치 등)이 완전히 동일하게 적용됨
- `keySubjects`는 `["수학", "물리", "화학", "정보"]`로, 토목공학과 특화 교과(지구과학, 건설공학 일반 등) 미반영

### 2. 대부분의 AI 프롬프트에 구체 학과명 미전달

`formatStudentProfile()`이 **의도적으로** `targetDepartment`를 제외하여, AI가 받는 `studentProfileText`에는 구체 학과명이 포함되지 않음.

| 섹션                             | 희망학과 전달 여부                                          |
| -------------------------------- | ----------------------------------------------------------- |
| `competencyExtraction` (Phase 2) | 전달 안 함 — 생기부에서 `detectedMajorGroup` 자체 판단      |
| `admissionPrediction`            | `targetUniversitiesText`로만 전달                           |
| `majorExploration`               | `targetDepartment` 직접 전달 (유일)                         |
| 그 외 모든 섹션                  | 전달 안 함 — `majorEvaluationContextText`(계열 기준)만 사용 |

결과적으로 AI는 "공학 계열 (기계/전자/화학공학 등)"이라는 포괄적 컨텍스트만 보고 구체 학과를 추론하게 되며, 건축학과처럼 더 일반적인 학과명으로 귀결될 가능성이 높음.

### 3. 커리어넷 컨텍스트의 보완 한계

`findMajorInfo("토목공학과")`는 DB에서 정확 매칭되어 토목공학과 고유 관련 교과를 `careerNetContext`로 추가하지만, 이 정보는 평가기준의 핵심 가중치(`keySubjects`)를 덮어쓰지 않아 보완 효과가 제한적.

## 영향 범위

- `academicAnalysis`: 전공 관련 교과 분석 시 토목 특화 교과 인식 부족
- `competencyExtraction`: 역량 추출 시 "공학" 포괄 기준 적용
- `admissionStrategy`: 입시 전략이 건축학과 기준으로 작성될 수 있음
- `majorExploration`은 `targetDepartment`를 직접 받으므로 영향 적음

## 해결 방향 (제안)

### 방안 A: `majorEvaluationCriteria` 세분화

"공학" 계열을 하위 분류로 세분화:

- 건설/토목 계열 → `keySubjects`: 수학, 물리, 지구과학
- 건축 계열 → `keySubjects`: 수학, 물리, 미술
- 기계/전자 계열 → `keySubjects`: 수학, 물리, 정보
- 화학공학 계열 → `keySubjects`: 수학, 화학, 물리

### 방안 B: AI 프롬프트에 구체 학과명 전달 확대

현재 `majorExploration`에서만 전달하는 `targetDepartment`를 더 많은 섹션(특히 `competencyExtraction`, `admissionStrategy`)에 전달하되, "끼워맞춤 금지" 가드레일은 유지.

### 방안 C: A + B 병행 (권장)

계열 기준 세분화와 학과명 전달을 병행하여, 구조적 정확성(코드)과 문맥적 정확성(AI)을 동시에 개선.
