/** 섹션 6: 성적 분석 (academicAnalysis) */

import type { ReportPlan } from "../../types.ts";
import { getMajorGroupLabel } from "../../constants/major-evaluation-criteria.ts";

export interface AcademicAnalysisPromptInput {
  quantitativeAnalysis: string;
  preprocessedAcademicData: string;
  studentProfile: string;
  gradingSystem: "5등급제" | "9등급제";
  /** Phase 2에서 감지된 생기부 기반 강점 계열 (예: "예체능교육", "의생명") */
  detectedMajorGroup?: string;
  /** 학년별 이수 완료 과목 요약 (이수 완료 과목 성적 개선 권고 방지용) */
  completedSubjectsByYear?: string;
  isGyogwaOnly?: boolean;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- 공통 항목(전과목 평균, 학년별 평균, 교과 조합별 평균, 등급 추이, 과목별 등급, 해석)을 출력합니다.
- 간단 해석 (2~3줄)만 포함합니다.
- subjectGrades는 **주요 5과목만** 출력합니다. 나머지 과목은 생략합니다.
- subjectStatAnalyses, careerSubjectAnalyses, gradeInflationContext, gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis, schoolTypeAdjustment 등 Standard+ 전용 필드는 출력하지 않습니다.

⚠️ **분량 제한**: 이 섹션은 A4 1페이지 이내로 작성합니다.`,
  standard: `## 플랜별 출력: 상세
공통 항목에 추가로 **아래 핵심 3개 필드만 반드시 출력**합니다:

1. **gradeDeviationAnalysis** (필수): 과목 간 편차에 대한 **입학사정관 관점 해석**
   형식: {"highestSubject": "영어", "lowestSubject": "수학", "deviationRange": 3, "riskAssessment": "입학사정관 해석..."}
   ⚠️ riskAssessment에 단순히 "N등급 차이가 있다"로 끝내면 안 됩니다. 생기부를 보면 알 수 있는 사실입니다.
   반드시 **입학사정관이 이 편차를 어떻게 해석하는지** 서술하세요:
   - 예: "국수영 간 2등급 편차는 사정관이 '특정 교과 편중 학습'으로 판단할 수 있으며, 학종에서 학업역량의 균형성 평가에서 감점 요인입니다."
   - 예: "수학-과학 간 편차가 작고 둘 다 상위 등급이므로, 사정관은 이공계 학업 기초가 탄탄하다고 판단할 것입니다."
2. **majorRelevanceAnalysis** (필수): 전공 관련 교과 이수 노력/성취도
   형식: {"enrollmentEffort": "...", "achievement": "...", "recommendedSubjects": ["과목1", "과목2"]}
3. **gradeChangeAnalysis** (필수): 등급 변화 가능성
   형식: {"currentTrend": "상승|유지|하락", "prediction": "...", "actionItems": ["구체적 실행 항목 문장1", "구체적 실행 항목 문장2"], "actionItemPriorities": ["high", "medium"]}
   - **actionItems는 반드시 1~3개의 구체적 실행 항목을 포함**해야 합니다. 빈 배열 금지.
   - ⛔ **actionItems는 string[] 형식만 허용.** object 배열 절대 금지. 올바른 예: ["전략1", "전략2"]. 잘못된 예: [{"item": "전략1", "note": "참고"}]
   - 상승 추세 → 유지/강화 전략, 하락 추세 → 반등 전략, 유지 → 다음 단계 전략을 제시하세요.
   - ⚠️ 성적 추이는 **발전가능성 역량의 직접 증거**입니다. prediction에서 "상승 추세는 사정관이 발전가능성을 높게 평가하는 핵심 근거", "하락 추세는 학업 태도에 대한 의문으로 이어질 수 있다" 등 입시적 의미를 반드시 포함하세요.
   - actionItems는 학생이 앞으로 실행 가능한 것만 제시하세요. "이수 완료 과목 정보"에 나열된 과목은 확정된 성적이므로 조언 대상에서 제외하세요.
     - ✅ "국어 교과 영역에서 2학년 선택과목 성적을 높이세요" (향후 이수 가능한 과목)
     - ✅ "사회탐구 영역에서 사회와 문화, 윤리와 사상 등 선택과목 성적 확보가 중요합니다" (향후 이수 가능)
     - ✅ "수능 성적을 통해 정시전형에서 보완하는 전략이 필요합니다" (졸업생의 경우)

⚠️ **분량 제한 (반드시 준수)**:
- gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis **3개 필드만** 출력합니다. 이 3개 외 추가 분석 필드는 절대 출력하지 마세요.
- 각 필드의 텍스트(riskAssessment, enrollmentEffort, achievement, prediction 등)는 반드시 **200자 이내**로 작성합니다. 200자 초과 금지.
- careerSubjectAnalyses는 **최대 5개**만 출력하며, 각 interpretation은 **100자 이내**로 작성합니다.
- smallClassSubjectAnalyses, schoolTypeAdjustment, gradeInflationContext는 출력하지 않습니다.
- ⚠️ schoolTypeAdjustment는 절대 출력하지 마세요.`,
  premium: `## 플랜별 출력: 정밀
Standard의 **모든 필수 항목(gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis 포함)**을 반드시 출력하고 (actionItems 빈 배열 금지), 추가로 다음을 출력합니다:
- 5등급제 전환 시뮬레이션 (fiveGradeSimulation):
  - ⚠️ **고1·고2 학생(5등급제 적용)**: 이미 5등급제이므로 9등급 전환 시뮬레이션이 아님.
    - currentGrade: 학생의 현재 5등급제 등급 (정수, 1~5)
    - simulatedGrade: currentGrade와 동일 값
    - interpretation: 5등급제 환경에서의 해당 등급의 의미 해석 (예: "5등급제 1등급(상위 10%)으로, 동일 등급 내 동점자가 많아 원점수와 세특으로 차별화 필요")
  - ⚠️ **고3/졸업생(9등급제 적용)**: 9등급→5등급 전환 시뮬레이션
    - currentGrade: 학생의 현재 9등급제 등급 (정수)
    - simulatedGrade: 전처리 데이터의 fiveGradeConversion 환산값 사용 (소수점 포함)
    - 환산 기준: 0.1 단위 정밀 환산 테이블 적용 (예: 9등급 2.0→5등급 1.33, 3.0→1.89, 4.0→2.43, 5.0→3.03, 6.0→3.63, 7.0→4.19, 8.0→4.72)
    - 예시: {"subject": "국어", "currentGrade": 3, "simulatedGrade": 1.89, "interpretation": "9등급제 3등급은 5등급제 기준 약 1.89등급(2등급 상위)으로 환산"}
  - **주요 5과목만** 배열 형태로 출력
  - **subject, currentGrade, simulatedGrade 필드는 필수입니다. 절대 빈값이면 안 됩니다.**
- 대학별 반영 방법 시뮬레이션 (universityGradeSimulations): **목표 대학 상위 3개만** 출력
  - **모든 필드(university, department, reflectionMethod, calculatedScore, interpretation)에 값이 있어야 합니다. 빈 문자열 금지.**
  - reflectionMethod: "학생부교과 등급 반영", "교과 평균 등급", "Z점수 환산" 등 구체적 방법
  - calculatedScore: 실제 수치 또는 등급 (예: "2.85", "상위 30%")
  - ⚠️ interpretation은 반드시 **80자 이내**로 핵심만 작성합니다 (테이블 셀이므로 간결해야 함).
  - 데이터 부족으로 정밀 시뮬이 불가능하면 이 필드를 아예 생략하세요 (빈 배열 출력).
- 성적 개선 우선순위 (improvementPriority): **3개 이내** 문자열 배열 형태, 각 항목 **50자 이내**
  ⛔ 이수 완료 과목의 성적 향상을 우선순위로 제시하면 안 됩니다. 반드시 향후 이수 가능한 과목/영역 기준으로 작성하세요.
  예시: "improvementPriority": ["사회탐구 영역 선택과목 2등급 확보", "과학탐구 선택과목 성적 안정화"]

⚠️ **schoolTypeAdjustment 출력 금지.**

⚠️ **분량 제한 (반드시 준수)**:
- 모든 필드 출력 가능하지만, 각 분석 텍스트(riskAssessment, enrollmentEffort, achievement, prediction 등)는 반드시 **200자 이내**로 작성합니다. 200자 초과 금지.
- universityGradeSimulations의 interpretation은 **80자 이내**로 작성합니다 (테이블 내 간결 표시).
- careerSubjectAnalyses는 **최대 5개**만 출력합니다. 5개 초과 금지.
- subjectStatAnalyses 등 해석 필드도 각 **150자 이내**로 간결하게 서술합니다.
- ⚠️ 이 섹션의 대학별 반영 방법 시뮬레이션 + 성적 개선 우선순위는 **A4 1페이지 이내**에 들어와야 합니다.`,
};

// ── 교과전형 전용 플랜별 출력 (추세/편차/사정관 해석 개념 없음) ──
const GYOGWA_PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- 공통 항목(전과목 평균, 학년별 평균, 등급 추이, 과목별 등급, 해석)을 출력합니다.
- 간단 해석 (2~3줄)만 포함합니다.
- subjectGrades는 **주요 5과목만** 출력합니다.

⚠️ **분량 제한**: 이 섹션은 A4 1페이지 이내로 작성합니다.`,
  standard: `## 플랜별 출력: 상세
공통 항목에 추가로 **아래 핵심 3개 필드만 반드시 출력**합니다:

1. **gradeDeviationAnalysis** (필수): 최고/최저 과목과 최종 평균의 합격선 대비 위치
   형식: {"highestSubject": "통합사회", "lowestSubject": "영어 I", "deviationRange": 3, "riskAssessment": "..."}
   riskAssessment 작성법: "최종 평균 N등급은 합격선 대비 ~한 위치입니다" 형식으로만 작성하세요.
   - 모범 예시: "최종 평균 2.55등급은 인서울 중위권 합격선(2.0~2.5등급)에 근접한 수준입니다. 전체 평균을 끌어올리는 것이 핵심입니다."
2. **majorRelevanceAnalysis** (필수): 전공 관련 교과 이수 현황
   형식: {"enrollmentEffort": "...", "achievement": "...", "recommendedSubjects": ["과목1", "과목2"]}
3. **gradeChangeAnalysis** (필수): **합격선 도달을 위한 남은 학기 목표**
   형식: {"currentTrend": "상승|유지|하락", "prediction": "...", "actionItems": ["구체적 실행 항목1", "구체적 실행 항목2"], "actionItemPriorities": ["high", "medium"]}
   - **actionItems는 반드시 1~3개의 구체적 실행 항목을 포함.** 빈 배열 금지.
   - ⛔ **actionItems는 string[] 형식만 허용.** object 배열 절대 금지.
   - prediction: "3학년 1학기 평균 N등급을 달성하면 최종 평균이 X등급이 되어 합격선 도달 가능" 형태로 작성.
   - actionItems는 학생이 앞으로 실행 가능한 것만 제시하세요. 졸업생은 수능/면접/지원 전략 위주로 작성하세요.

⚠️ **분량 제한 (반드시 준수)**:
- 위 3개 필드만 출력. 추가 분석 필드 절대 출력 금지.
- 각 텍스트 필드는 **200자 이내**.`,
  premium: `## 플랜별 출력: 정밀
Standard의 **모든 필수 항목(gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis 포함)**을 Standard와 동일한 규칙으로 출력하고, 추가로:
- 5등급제 전환 시뮬레이션 (fiveGradeSimulation): 주요 5과목만 배열 형태로 출력
- 대학별 반영 방법 시뮬레이션 (universityGradeSimulations): 목표 대학 상위 3개만
  - reflectionMethod, calculatedScore, interpretation 필수
  - ⚠️ interpretation은 **80자 이내**
- 성적 개선 우선순위 (improvementPriority): 3개 이내 문자열 배열, 각 50자 이내
  ⛔ 이수 완료 과목 성적 향상을 우선순위로 제시하면 안 됩니다.

⚠️ **schoolTypeAdjustment 출력 금지.**
⚠️ 각 분석 텍스트는 **200자 이내**. universityGradeSimulations의 interpretation은 **80자 이내**.
⚠️ gradeDeviationAnalysis.riskAssessment, gradeChangeAnalysis.prediction은 "최종 평균 N등급은 합격선 대비 ~" 형식으로만 작성하세요.`,
};

/**
 * 교과전형 전용 성적 분석 프롬프트.
 * 추세/편차의 유불리 해석, 사정관 관점, 발전가능성 개념이 존재하지 않음.
 * 최종 등급과 합격선 비교 중심.
 */
export const buildGyogwaAcademicAnalysisPrompt = (
  input: AcademicAnalysisPromptInput,
  plan: ReportPlan
): string => {
  const gradingSystemWarning =
    input.gradingSystem === "5등급제"
      ? `⚠️⚠️⚠️ **최우선 규칙: 이 학생은 5등급제 적용 학생입니다 (고1·고2, 2022 개정 교육과정)**
- 이 학생의 등급은 1~5 범위입니다. 절대 6~9등급이 존재하지 않습니다.
- fiveGradeSimulation 출력 시: currentGrade = 학생의 실제 5등급제 등급, simulatedGrade = currentGrade와 동일 값
- 5등급제 비율: 1등급(상위 10%), 2등급(상위 34%), 3등급(상위 66%), 4등급(상위 90%), 5등급(하위 10%)`
      : `⚠️ 이 학생은 9등급제 적용 학생입니다 (고3/졸업생, 2015 개정 교육과정)
- 이 학생의 등급은 1~9 범위입니다.
- fiveGradeSimulation 출력 시: 9등급→5등급 전환 시뮬레이션을 수행하세요.`;

  return `${gradingSystemWarning}

## ⚠️ 환산 등급 노출 금지 (필수)
- "환산 등급", "보정 등급", "환산 내신", "보정 내신" 등의 표현을 절대 사용하지 마세요.
- schoolTypeAdjustment 필드를 출력하지 마세요.

## 작업
이 학생은 모든 희망대학이 **학생부교과전형**입니다.
정량 분석 결과를 바탕으로, **최종 등급과 합격선 비교** 중심의 성적 분석을 작성하세요.

## 교과전형 성적 분석 핵심 원칙
- 교과전형은 **최종 평균 등급**으로만 합격 여부가 결정됩니다.
- 성적 분석은 "최종 평균 등급이 합격선 대비 어디에 위치하는가"에 집중하세요.
- interpretation 작성 시 최종 평균 등급과 대학 합격선 비교만 서술하세요.
- ✅ 좋은 예시: "최종 평균 2.41등급으로, 인서울 중위권 교과전형에서 경쟁력이 있는 수준입니다."
- ✅ 좋은 예시: "전교과 평균 2.41등급은 광운대·명지대 합격선에 여유가 있습니다."

## 입력 데이터

### 정량 분석 결과
${input.quantitativeAnalysis}

### 성적 전처리 결과 (코드 계산 완료)
${input.preprocessedAcademicData}

### 학생 프로필
${input.studentProfile}

${input.completedSubjectsByYear ? `### 이수 완료 과목 정보\n${input.completedSubjectsByYear}` : ""}

## 출력 JSON 스키마

중요: gradesByYear, subjectGrades 배열의 각 요소는 반드시 완전한 객체여야 합니다. gradeTrend는 반드시 "상승", "유지", "하락" 중 하나여야 합니다.

{
  "sectionId": "academicAnalysis",
  "title": "학업 분석",
  "overallAverageGrade": 2.85,
  "gradesByYear": [
    {"year": 1, "semester": 1, "averageGrade": 3.20},
    {"year": 1, "semester": 2, "averageGrade": 2.90},
    {"year": 2, "semester": 1, "averageGrade": 2.60}
  ],
  "gradeTrend": "상승",
  "subjectGrades": [
    {"subject": "국어", "year": 1, "semester": 1, "grade": 3, "rawScore": 78, "classAverage": 65.2, "standardDeviation": 12.5, "studentCount": 250}
  ],
  "interpretation": "최종 평균 2.85등급으로, 인서울 중위권 교과전형 합격선(2.0~2.5등급)에 다소 미달합니다. 지방 거점국립대 교과전형에서는 경쟁력이 있는 등급입니다."
}
Standard/Premium 플랜은 위 기본 필드에 추가 필드가 포함됩니다 (아래 플랜별 출력 참조).
⚠️ subjectCombinations 필드는 출력하지 마세요. 후처리에서 자동 주입됩니다.

## 데이터 출처 구분 (필수 준수)

⚠️ **아래 필드는 코드에서 확정된 수치입니다. 절대 직접 계산하거나 다른 값을 출력하지 마세요.**
후처리에서 코드값으로 강제 덮어쓰기되므로, AI가 다른 값을 출력해도 무시됩니다.

- **코드 전처리 → 그대로 복사**:
  - overallAverageGrade: 전처리 결과의 "overallAverage" 값을 그대로 복사
  - gradesByYear: 전처리 결과의 "averageByGrade" 배열을 그대로 복사
  - gradeTrend: 전처리 결과의 "gradeTrend.direction"을 한글로 변환 (ascending→상승, stable→유지, descending→하락)
- **AI 해석 → 생성**: interpretation, gradeDeviationAnalysis, majorRelevanceAnalysis, gradeChangeAnalysis 등

⚠️ **데이터 부족 시**: 빈 문자열 출력 금지. 가용 정보를 활용해 작성하세요.

## 비핵심 과목 구분

아래 과목은 교과전형에서도 전 과목 반영 시 포함되지만, 핵심 변별 과목이 아닙니다:
- 기술·가정, 정보, 제2외국어, 한문, 교양, 진로와 직업
- 체육, 음악, 미술 (예체능 지원자 제외)
이 과목의 성적이 낮더라도 "핵심 약점"으로 지목하지 마세요.
핵심 과목: 국어, 수학, 영어, 사회탐구, 과학탐구.

## 생기부 기반 강점 계열

**이 학생의 생기부 기반 강점 계열: "${getMajorGroupLabel(input.detectedMajorGroup ?? "미확정")}"**
- "희망 전공", "희망 학과" 등 희망학과를 전제로 한 표현을 사용하지 마세요.
- 위 강점 계열 기준으로 서술하세요.

## 출력 지시

### 전 플랜 공통
- 전과목 평균 등급 (overallAverageGrade)
- 학년/학기별 평균 등급 (gradesByYear)
- 학년별 등급 추이 (gradeTrend: 상승/유지/하락)
- 과목별 등급 요약 테이블 (subjectGrades)
- 해석 (interpretation): **최종 평균 등급이 교과전형 합격선 대비 어디에 위치하는지만** 서술.
  - ✅ "최종 평균 2.55등급으로, 인서울 중위권 교과전형 합격선(2.0~2.5등급)에 근접한 수준입니다."
  - ✅ "전교과 평균 2.41등급으로, 광운대·명지대 교과전형에서 합격 가능성이 있습니다."
  - ✅ "국영수사과 평균 2.45등급, 전교과 평균 2.41등급으로, 인서울 중위권 교과전형 합격선 내에 있습니다."
3. improvementPriority에 "반영 과목에서 높은 등급" 같은 조언이 있지 않은가? → "전체 평균 등급을 끌어올리는 것이 최우선"으로 대체

${GYOGWA_PLAN_SPECIFIC[plan]}`;
};

export const buildAcademicAnalysisPrompt = (
  input: AcademicAnalysisPromptInput,
  plan: ReportPlan
): string => {
  const gradingSystemWarning =
    input.gradingSystem === "5등급제"
      ? `⚠️⚠️⚠️ **최우선 규칙: 이 학생은 5등급제 적용 학생입니다 (고1·고2, 2022 개정 교육과정)**
- 이 학생의 등급은 1~5 범위입니다. 절대 6~9등급이 존재하지 않습니다.
- "9등급제 N등급은 5등급제 N등급으로 변환" 같은 표현을 사용하면 안 됩니다.
- fiveGradeSimulation 출력 시: currentGrade = 학생의 실제 5등급제 등급, simulatedGrade = currentGrade와 동일 값
- interpretation: "5등급제 N등급(상위 X%)" 형태로 5등급제 환경에서의 의미를 해석하세요.
- 5등급제 비율: 1등급(상위 10%), 2등급(상위 34%), 3등급(상위 66%), 4등급(상위 90%), 5등급(하위 10%)

### 5등급제 성적 분석 심화 원칙 (반드시 적용)
1. **원점수 기반 실질 위치 분석**: 5등급제는 등급 구간이 넓어 동일 등급 내 학생 수가 많습니다. 따라서 등급만으로 평가하지 말고, 반드시 원점수가 과목 평균 대비 어느 위치인지, 표준편차 대비 몇 시그마 위인지를 분석하세요. 예: "2등급이지만 원점수 87점은 평균(66.4) 대비 +20.6점으로, 2등급 내에서도 상위권에 해당합니다."
2. **성적 인플레이션 맥락**: 5등급제 도입 후 고1 주요 5과목 평균이 70.1점(전년 67.1점 대비 3점 상승)으로 1등급 학생 수가 증가했습니다. 이로 인해 동일 등급 내 동점자가 많아져 실질적 경쟁이 심화되고 있으므로, "N등급은 우수합니다" 같은 단순 평가가 아니라 원점수·수강자수·세특 차별화 관점에서 해석하세요.
3. **수강자 수와 경쟁 신뢰도**: 수강자 수가 많을수록(200명+) 해당 등급의 신뢰도가 높습니다. 소수 선택과목(5명 이하)은 소인수 과목으로 성취도+등급 병기 대상이므로 맥락적으로 해석하세요.
4. **교과전형 변화 반영**: 5등급제 도입으로 교과전형에서도 서류종합평가를 부분 반영하는 대학이 확대되고 있습니다(동국대 등). 등급만으로 변별이 어려워져 세특·선택과목 이수 현황이 추가 평가 요소로 활용됩니다.`
      : `⚠️ 이 학생은 9등급제 적용 학생입니다 (고3/졸업생, 2015 개정 교육과정)
- 이 학생의 등급은 1~9 범위입니다.
- fiveGradeSimulation 출력 시: 9등급→5등급 전환 시뮬레이션을 수행하세요.`;

  const gyogwaOnlyContext = input.isGyogwaOnly
    ? `## ⛔ 교과전형 전용 (이 규칙이 다른 모든 지시보다 우선)
이 학생은 모든 희망대학이 학생부교과전형입니다.
- "학종", "학생부종합전형", "사정관이 ~로 판단" 등의 표현을 사용하지 마세요.
- 성적 분석은 최종 등급과 교과 조합 평균 중심으로 작성하세요.
- 교과전형 평가는 최종 평균 등급과 합격선 비교가 전부입니다. 개별 과목이나 학기별 등급 변동은 교과전형 평가에 영향을 주지 않습니다.

`
    : "";

  return `${gyogwaOnlyContext}${gradingSystemWarning}

## ⚠️ 환산 등급 노출 금지 (필수)
- ⚠️ **"환산 등급", "보정 등급", "환산 내신", "보정 내신" 등의 표현을 리포트 텍스트에 절대 사용하지 마세요.**
- ⚠️ **schoolTypeAdjustment 필드를 출력하지 마세요.**
- 리포트에 노출되는 모든 수치(overallAverageGrade, gradesByYear 등)는 원래 등급을 그대로 사용하세요.

## 작업
정량 분석 결과를 바탕으로 학생의 교과 성적에 대한 해석과 전략적 분석을 작성하세요.

## 입력 데이터

### 정량 분석 결과
${input.quantitativeAnalysis}

### 성적 전처리 결과 (코드 계산 완료)
${input.preprocessedAcademicData}

### 학생 프로필
${input.studentProfile}

${input.completedSubjectsByYear ? `### 이수 완료 과목 정보\n${input.completedSubjectsByYear}` : ""}

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

핵심 평가 과목은 국어, 수학, 영어, 사회탐구(한국사, ${input.gradingSystem === "5등급제" ? "사회와 문화, 정치, 법과 사회, 경제" : "사회·문화, 정치와법, 경제"} 등), 과학탐구(물리학, 화학, 생명과학, 지구과학 등)입니다.

## ⚠️ 생기부 기반 강점 계열 (필수 준수)

**이 학생의 생기부 기반 강점 계열: "${getMajorGroupLabel(input.detectedMajorGroup ?? "미확정")}"**

이 섹션의 모든 AI 생성 텍스트(interpretation, subjectStatAnalyses, gradeChangeAnalysis, gradeDeviationAnalysis, majorRelevanceAnalysis 등)에서:
- **"희망 전공", "희망 학과", "~계열 진학 시", "~계열이라면" 등 희망학과를 전제로 한 조건부 표현을 절대 사용하지 마세요.**
- **반드시 위에 명시된 "생기부 기반 강점 계열"을 기준으로 서술하세요.** AI가 독자적으로 계열을 추측하면 안 됩니다.
- majorRelevanceAnalysis의 enrollmentEffort, achievement에서 반드시 "${getMajorGroupLabel(input.detectedMajorGroup ?? "미확정")}"을 기준으로 전공 관련 교과를 평가하세요.
- ❌ BAD: "이공계열 관련 과목에서..." (생기부 강점 계열이 이공계열이 아닌데 임의로 언급)
- ❌ BAD: "희망 전공이 공학 계열이라면 물리학 성적은 2등급 이내로 끌어올리는 것이 좋습니다"
- ✅ GOOD: "${getMajorGroupLabel(input.detectedMajorGroup ?? "해당")} 진학을 위해, 관련 교과의 성적 보완이 필요합니다"
- **gradeChangeAnalysis의 actionItems에서도 "${getMajorGroupLabel(input.detectedMajorGroup ?? "해당")}" 기준으로 서술하세요.**

## 출력 지시

### 전 플랜 공통
- 전과목 평균 등급 (overallAverageGrade)
- 학년/학기별 평균 등급 (gradesByYear)
- 주요 교과 조합별 평균 (subjectCombinations: 국수영사, 국수영과 등)
- 학년별 등급 추이 (gradeTrend: 상승/유지/하락)
- 과목별 등급 요약 테이블 (subjectGrades)
- 간단 해석 (interpretation): **단순 사실 나열이 아니라 입학사정관이 이 성적 구조를 어떻게 해석할지** 서술
  - ❌ "전체 평균 2.42등급이며 상승 추세입니다" (사실 나열)
  - ✅ "5등급제 2.42등급은 중위권으로, 인서울 중하위권 교과전형은 어렵지만 학종에서는 세특 품질에 따라 가능성이 열려 있습니다. 상승 추세(2.57→2.0)는 사정관이 긍정적으로 평가하는 요소입니다."

${PLAN_SPECIFIC[plan]}`;
};
