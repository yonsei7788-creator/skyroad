// ============================================================
// 정시 분석 리포트 콘텐츠 타입 (PART 1~5)
//
// 설계 원칙:
// - 각 섹션은 "코드가 계산한 데이터" + "AI가 쓴 해설 문장"으로 나뉜다.
//   계산 필드는 엔진(JeongsiAnalysis)에서 그대로 옮겨오고,
//   AI 필드(주로 commentary / reason / summary)만 Gemini 가 채운다.
// - sectionId 디스크리미네이티드 유니온은 기존 수시 리포트와 동일한
//   패턴을 따르되, jeongsi 프리픽스로 네임스페이스를 분리한다.
// ============================================================

import type {
  AdmissionGroup,
  AdmissionTier,
  JeongsiInput,
  PassChance,
  ResultMetric,
  ScoreArea,
} from "./types";

/** 모든 정시 섹션의 공통 필드 */
interface JeongsiBaseSection {
  sectionId: string;
  title: string;
}

// ─── PART 1. 성적 종합 분석 ───

/** 영역 한 칸. 수치는 전부 코드 계산값 */
export interface AreaScoreRow {
  area: ScoreArea;
  /** 화면 표기용 영역명 (국어/수학/영어/탐구) */
  label: string;
  /** 선택과목 또는 탐구 과목명. 영어는 null */
  subjectName: string | null;
  standardScore: number | null;
  percentile: number | null;
  grade: number | null;
  /** 국어·수학·탐구 중 상대 순위. 영어는 원문에 백분위가 없어 null */
  rank: number | null;
  /** 국·수·탐 평균 백분위 대비 편차. 영어는 null */
  deviation: number | null;
}

export interface JeongsiScoreAnalysisSection extends JeongsiBaseSection {
  sectionId: "jeongsiScoreAnalysis";
  rows: AreaScoreRow[];
  averagePercentile: number;
  totalStandardScore: number;
  strengthAreas: ScoreArea[];
  weaknessAreas: ScoreArea[];
  /** AI: 현재 성적 수준 총평 */
  overallComment: string;
  /** AI: 강점 해설 */
  strengthComment: string;
  /** AI: 약점 해설 */
  weaknessComment: string;
}

// ─── PART 2. 나에게 유리한 대학 분석 ───

export interface AdvantageItem {
  university: string;
  department: string;
  group: AdmissionGroup;
  /** 반영비율 요약 (예: "국30·수35·영10·탐25") */
  ratioSummary: string;
  /** 활용지표 요약 (예: "국·수 표준점수 / 탐구 변환표준점수") */
  metricSummary: string;
  /** 0~100. 학생 강점과 반영방식의 적합도 */
  advantageScore: number;
  /** AI: 왜 유리한지 한두 문장 */
  reason: string;
}

export interface JeongsiUniversityMatchSection extends JeongsiBaseSection {
  sectionId: "jeongsiUniversityMatch";
  items: AdvantageItem[];
  /** AI: 반영방식 관점의 총평 */
  overallComment: string;
}

// ─── PART 3. 지원 가능 대학·학과 ───

/**
 * 입결 컷과 학생을 **같은 축**에서 비교한 값.
 *
 * 실데이터 입결은 대부분 백분위(국·수·탐 평균)로 공시되고 일부만 대학
 * 환산점수다. 백분위 컷 옆에 환산점수를 나란히 두면 "659점 vs 96" 처럼
 * 단위가 다른 숫자를 비교하게 되므로, 컷의 지표와 그 지표로 본 학생 값을
 * 함께 싣는다. 이 필드가 생기기 전에 저장된 리포트에는 없다(그때 컷은
 * 전부 환산점수 기준이었다).
 */
export interface CutComparison {
  metric: ResultMetric;
  /** 컷과 같은 지표로 본 학생 값 (백분위면 국·수·탐 평균 백분위) */
  studentValue: number;
  /** 3개년 기준컷 — 분류에 쓴 값 */
  referenceCut: number;
  /** 가장 최근 학년도의 실제 70% 컷 */
  previousYear: { year: number; cut: number } | null;
}

export interface RecommendationItem {
  university: string;
  department: string;
  group: AdmissionGroup;
  quota: number;
  /** 학생의 대학별 환산점수 */
  convertedScore: number;
  /** 전년도 입결 컷 (같은 환산 기준) */
  referenceCut: number | null;
  /** 컷 대비 격차 비율 (%) */
  gapRatio: number | null;
  /** 컷과 같은 축의 비교값. 입결이 없으면 null */
  cutComparison?: CutComparison | null;
  /** 전형 총점 중 수능 비율(%). 수능 100% 전형이면 없다 */
  suneungWeight?: number;
  chance: PassChance;
  /** AI: 한 줄 코멘트 */
  comment: string;
}

export interface JeongsiRecommendationSection extends JeongsiBaseSection {
  sectionId: "jeongsiRecommendation";
  /** 구분별 3개씩 */
  groups: {
    tier: Exclude<AdmissionTier, "지원불가">;
    items: RecommendationItem[];
  }[];
  /** AI: 지원 전략 총평 */
  overallComment: string;
  /**
   * 추천 목록을 그대로 읽으면 오해할 수 있는 사실을 알리는 안내 문구.
   * 예: 선택과목 제한으로 희망 계열 지원이 불가능함, 후보를 유사 계열까지
   * 넓혀 비교했음, 적정 구간에 해당하는 곳이 없어 가장 가까운 곳을 제시했음.
   * 없으면 빈 배열.
   */
  notices: string[];
}

// ─── PART 4. 가·나·다군 지원 조합 ───

export interface CombinationSlot {
  group: AdmissionGroup;
  university: string;
  department: string;
  tier: Exclude<AdmissionTier, "지원불가">;
  chance: PassChance;
}

export interface CombinationItem {
  id: string;
  /** 조합 성격 라벨 (예: "균형 조합") */
  label: string;
  slots: CombinationSlot[];
  /** AI: 이 조합의 전략 설명 */
  strategy: string;
}

export interface JeongsiCombinationSection extends JeongsiBaseSection {
  sectionId: "jeongsiCombination";
  /** 학생이 고른 지원 성향 */
  risk: JeongsiInput["preference"]["risk"];
  combinations: CombinationItem[];
  /** AI: 조합 선택 가이드 */
  overallComment: string;
}

// ─── PART 5. 대학별 상세 분석 ───

export interface UniversityDetailItem {
  university: string;
  department: string;
  group: AdmissionGroup;
  quota: number;
  competitionRate: number | null;
  /** 반영비율 요약 */
  ratioSummary: string;
  /** 활용지표 요약 */
  metricSummary: string;
  /** 영어·한국사 반영 요약 */
  englishHistorySummary: string;
  /** 가산점 요약. 없으면 null */
  bonusSummary: string | null;
  /** 선택과목 제한 요약. 없으면 null */
  restrictionSummary: string | null;
  convertedScore: number;
  totalScore: number;
  referenceCut: number | null;
  /** 최근 3개년 컷 추이 (cutComparison.metric 과 같은 지표) */
  cutHistory: { year: number; cut: number | null }[];
  /** 컷과 같은 축의 비교값. 입결이 없으면 null */
  cutComparison?: CutComparison | null;
  /** 전형 총점 중 수능 비율(%). 수능 100% 전형이면 없다 */
  suneungWeight?: number;
  tier: Exclude<AdmissionTier, "지원불가">;
  chance: PassChance;
  /** AI: 추천 이유 */
  reason: string;
}

export interface JeongsiUniversityDetailSection extends JeongsiBaseSection {
  sectionId: "jeongsiUniversityDetail";
  items: UniversityDetailItem[];
}

// ─── 최상위 ───

export type JeongsiSection =
  | JeongsiScoreAnalysisSection
  | JeongsiUniversityMatchSection
  | JeongsiRecommendationSection
  | JeongsiCombinationSection
  | JeongsiUniversityDetailSection;

export type JeongsiSectionId = JeongsiSection["sectionId"];

/** PART 순서. 렌더러와 생성 파이프라인이 공유하는 단일 출처 */
export const JEONGSI_SECTION_ORDER: JeongsiSectionId[] = [
  "jeongsiScoreAnalysis",
  "jeongsiUniversityMatch",
  "jeongsiRecommendation",
  "jeongsiCombination",
  "jeongsiUniversityDetail",
];

export interface JeongsiReportMeta {
  reportId: string;
  input: JeongsiInput;
  createdAt: string;
  version: number;
}

/** jeongsi_reports.content 에 JSONB 로 저장되는 단위 */
export interface JeongsiReportContent {
  meta: JeongsiReportMeta;
  sections: JeongsiSection[];
}

/** sectionId 로 섹션 타입을 뽑아내는 헬퍼 */
export type ExtractJeongsiSection<T extends JeongsiSectionId> = Extract<
  JeongsiSection,
  { sectionId: T }
>;
