/** 섹션 6: 성적 분석 (academicAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface AcademicAnalysisPromptInput {
  quantitativeAnalysis: string;
  preprocessedAcademicData: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- 공통 항목(전과목 평균, 학년별 평균, 교과 조합별 평균, 등급 추이, 과목별 등급, 해석)을 출력합니다.
- 간단 해석 (2~3줄)만 포함합니다.
- subjectGrades는 **주요 5과목만** 출력합니다. 나머지 과목은 생략합니다.
- subjectStatAnalyses, careerSubjectAnalyses, gradeInflationContext, gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis 등 Standard+ 전용 필드는 출력하지 않습니다.

⚠️ **분량 제한**: 이 섹션은 A4 1페이지 이내로 작성합니다.`,
  standard: `## 플랜별 출력: 상세
공통 항목에 추가로 **아래 핵심 3개 필드만 반드시 출력**합니다:

1. **gradeDeviationAnalysis** (필수): 과목 간 편차 리스크
   형식: {"highestSubject": "영어", "lowestSubject": "수학", "deviationRange": 3, "riskAssessment": "과목 간 편차가 3등급으로..."}
2. **majorRelevanceAnalysis** (필수): 전공 관련 교과 이수 노력/성취도
   형식: {"enrollmentEffort": "...", "achievement": "...", "recommendedSubjects": ["과목1", "과목2"]}
3. **gradeChangeAnalysis** (필수): 등급 변화 가능성
   형식: {"currentTrend": "상승|유지|하락", "prediction": "...", "actionItems": ["항목1", "항목2"], "actionItemPriorities": ["high", "medium"]}
   - **actionItems는 반드시 1~3개의 구체적 실행 항목을 포함**해야 합니다. 빈 배열 금지.
   - 상승 추세 → 유지/강화 전략, 하락 추세 → 반등 전략, 유지 → 다음 단계 전략을 제시하세요.

⚠️ **분량 제한 (반드시 준수)**:
- gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis **3개 필드만** 출력합니다. 이 3개 외 추가 분석 필드는 절대 출력하지 마세요.
- 각 필드의 텍스트(riskAssessment, enrollmentEffort, achievement, prediction 등)는 반드시 **200자 이내**로 작성합니다. 200자 초과 금지.
- careerSubjectAnalyses는 **최대 3개**만 출력하며, 각 interpretation은 **100자 이내**로 작성합니다.
- smallClassSubjectAnalyses, schoolTypeAdjustment, gradeInflationContext는 출력하지 않습니다.`,
  premium: `## 플랜별 출력: 정밀
Standard의 **모든 필수 항목(gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis 포함)**을 반드시 출력하고 (actionItems 빈 배열 금지), 추가로 다음을 출력합니다:
- 5등급제 전환 시뮬레이션 (fiveGradeSimulation): **주요 5과목만** 배열 형태로 출력
  - **subject, currentGrade, simulatedGrade 필드는 필수입니다. 절대 빈값이면 안 됩니다.**
  - currentGrade: 학생의 현재 9등급제 등급 (정수)
  - simulatedGrade: 5등급제 전환 시 등급 (정수)
  - 전환 기준: 1등급→1, 2~3등급→2, 4~5등급→3, 6~7등급→4, 8~9등급→5
  - 예시: {"subject": "국어", "currentGrade": 6, "simulatedGrade": 4, "interpretation": "5등급제 전환 시 6등급은 4등급으로 변환"}
- 대학별 반영 방법 시뮬레이션 (universityGradeSimulations): **목표 대학 상위 3개만** 출력
  - **모든 필드(university, department, reflectionMethod, calculatedScore, interpretation)에 값이 있어야 합니다. 빈 문자열 금지.**
  - reflectionMethod: "학생부교과 등급 반영", "교과 평균 등급", "Z점수 환산" 등 구체적 방법
  - calculatedScore: 실제 수치 또는 등급 (예: "2.85", "상위 30%")
  - ⚠️ interpretation은 반드시 **80자 이내**로 핵심만 작성합니다 (테이블 셀이므로 간결해야 함).
  - 데이터 부족으로 정밀 시뮬이 불가능하면 이 필드를 아예 생략하세요 (빈 배열 출력).
- 성적 개선 우선순위 (improvementPriority): **3개 이내** 문자열 배열 형태, 각 항목 **50자 이내**
  예시: "improvementPriority": ["수학 등급 개선 (현 3등급 → 2등급 목표)", "과학탐구 과목 성적 안정화"]

⚠️ **분량 제한 (반드시 준수)**:
- 모든 필드 출력 가능하지만, 각 분석 텍스트(riskAssessment, enrollmentEffort, achievement, prediction 등)는 반드시 **200자 이내**로 작성합니다. 200자 초과 금지.
- universityGradeSimulations의 interpretation은 **80자 이내**로 작성합니다 (테이블 내 간결 표시).
- careerSubjectAnalyses는 **최대 5개**만 출력합니다. 5개 초과 금지.
- subjectStatAnalyses 등 해석 필드도 각 **150자 이내**로 간결하게 서술합니다.
- ⚠️ 이 섹션의 대학별 반영 방법 시뮬레이션 + 성적 개선 우선순위는 **A4 1페이지 이내**에 들어와야 합니다.`,
};

export const buildAcademicAnalysisPrompt = (
  input: AcademicAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
정량 분석 결과를 바탕으로 학생의 교과 성적에 대한 해석과 전략적 분석을 작성하세요.

## 입력 데이터

### 정량 분석 결과
${input.quantitativeAnalysis}

### 성적 전처리 결과 (코드 계산 완료)
${input.preprocessedAcademicData}

### 학생 프로필
${input.studentProfile}

## 출력 JSON 스키마

중요: gradesByYear, subjectCombinations, subjectGrades 배열의 각 요소는 반드시 완전한 객체여야 합니다. gradeTrend는 반드시 "상승", "유지", "하락" 중 하나여야 합니다.

{
  "sectionId": "academicAnalysis",
  "title": "학업 분석",
  "overallAverageGrade": 2.85,
  "gradesByYear": [
    {"year": 1, "semester": 1, "averageGrade": 3.20},
    {"year": 1, "semester": 2, "averageGrade": 2.90},
    {"year": 2, "semester": 1, "averageGrade": 2.60}
  ],
  "subjectCombinations": [
    {"combination": "국수영사", "averageGrade": 2.50},
    {"combination": "국수영과", "averageGrade": 3.10}
  ],
  "gradeTrend": "상승",
  "subjectGrades": [
    {"subject": "국어", "year": 1, "semester": 1, "grade": 3, "rawScore": 78, "classAverage": 65.2, "standardDeviation": 12.5, "studentCount": 250}
  ],
  "interpretation": "전체 평균 2.85등급으로 상위권에 위치하며, 학기별 등급이 점진적으로 상승하는 추세..."
}
Standard/Premium 플랜은 위 기본 필드에 추가 필드가 포함됩니다 (아래 플랜별 출력 참조).

## 데이터 출처 구분 (필수 준수)

⚠️ **아래 필드는 코드에서 확정된 수치입니다. 절대 직접 계산하거나 다른 값을 출력하지 마세요.**
후처리에서 코드값으로 강제 덮어쓰기되므로, AI가 다른 값을 출력해도 무시됩니다.

- **코드 전처리 → 그대로 복사** (후처리에서 강제 대체됨):
  - overallAverageGrade: 전처리 결과의 "overallAverage" 값을 그대로 복사
  - gradesByYear: 전처리 결과의 "averageByGrade" 배열을 그대로 복사
  - subjectCombinations: 전처리 결과의 "subjectCombinations" 배열에서 "name" → "combination", "average" → "averageGrade"로 매핑
  - gradeTrend: 전처리 결과의 "gradeTrend.direction"을 한글로 변환 (ascending→상승, stable→유지, descending→하락)
- **AI 해석 → 생성**: interpretation, subjectStatAnalyses, gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis 등
  → 이 필드들은 전처리 데이터를 바탕으로 해석하여 작성하세요.

⚠️ **데이터 부족 시 처리 규칙 (필수)**:
- 전처리 결과에 성적 데이터가 없거나 부족하더라도 interpretation, gradeDeviationAnalysis.riskAssessment 등 AI 해석 필드를 **빈 문자열로 남기지 마세요**.
- 데이터가 부족한 경우: "일반 교과 성적 데이터가 부족하여 정밀한 분석이 어렵습니다. 세특 및 활동 내용을 기반으로 볼 때..." 등으로 가용한 정보를 활용해 작성하세요.
- 모든 텍스트 필드는 반드시 의미 있는 내용이 포함되어야 합니다. 빈 문자열("") 출력 금지.
  → 이 필드들은 전처리 데이터를 바탕으로 해석하여 작성하세요.
  → interpretation에서 언급하는 평균 등급은 반드시 전처리 결과의 overallAverage 값과 동일해야 합니다.

## 비핵심 과목 구분 (필수 준수)

⚠️ **아래 과목군은 학종 서류 평가에서 핵심 평가 대상이 아닙니다.**
이 과목들의 성적이 낮더라도 "약점", "발목", "불리" 등으로 표현하지 마세요.

- **성실성 확인 과목**: 기술·가정, 정보, 제2외국어(일본어, 중국어, 독일어 등), 한문, 교양, 진로와 직업
- **예체능 과목**: 체육, 음악, 미술 (예체능 계열 지원자 제외)

이 과목들은 학종에서 "성실하게 수업에 참여했는가"를 확인하는 정도의 역할입니다.
- 성적이 낮아도: "성실성 영역에서 참고 사항" 정도로 언급 (약점이라고 하면 안 됨)
- 성적이 높아도: 핵심 경쟁력이라고 과대평가하지 마세요
- **gradeChangeAnalysis, gradeDeviationAnalysis 등에서 이 과목들을 핵심 약점으로 지목하지 마세요.**

핵심 평가 과목은 국어, 수학, 영어, 사회탐구(한국사, 사회·문화, 정치와법, 경제 등), 과학탐구(물리학, 화학, 생명과학, 지구과학 등)입니다.

## 출력 지시

### 전 플랜 공통
- 전과목 평균 등급 (overallAverageGrade)
- 학년/학기별 평균 등급 (gradesByYear)
- 주요 교과 조합별 평균 (subjectCombinations: 국수영사, 국수영과 등)
- 학년별 등급 추이 (gradeTrend: 상승/유지/하락)
- 과목별 등급 요약 테이블 (subjectGrades)
- 간단 해석 (interpretation: 성적 추이와 특징 요약)

${PLAN_SPECIFIC[plan]}`;
};
