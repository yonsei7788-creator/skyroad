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
  SafeCapReason,
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

// ─── 모집단위 판정 근거 (PART 2·3·4·5 공통) ───

/**
 * 모집단위 하나의 판정 근거. 엔진 평가 하나에서 만들어 PART 3·5 가 같은 값을
 * 싣는다(specs/014 A2). unitKey 로 PART 2·4 의 항목과 이어진다.
 * 이 필드가 생기기 전(2026-11-14)에 저장된 리포트에는 없다.
 */
export interface UnitJudgement {
  /** 모집단위 키 (시행계획 id). 페이지 간 같은 모집단위를 잇는다 */
  unitKey: string;
  /** 실제 구분 (적정 칸을 채우려고 끌어온 항목도 원래 구분) */
  tier: Exclude<AdmissionTier, "지원불가">;
  chance: PassChance;
  /** 판정 지표: 대학 환산점수 입결 또는 국·수·탐 평균 백분위 입결 */
  metric: ResultMetric;
  /** 판정 지표로 본 학생 값 */
  studentValue: number;
  /** 판정 기준컷 (학년도 가중평균 + 모집인원 보정) */
  referenceCut: number;
  /** 학생 값 − 기준컷 (지표 단위) */
  gapPoints: number;
  /** 구간 판정에 쓴 격차 (환산점수면 만점 대비 %, 백분위면 백분위점) */
  gapRatio: number;
  /** 환산 만점 (가산점 제외) */
  totalScore: number;
  /** 기준컷에 쓴 입결 학년도 */
  resultYears: number[];
  /** 격차는 안정 구간이지만 safeCapReasons 때문에 적정으로 낮췄는지 */
  safeCapped: boolean;
  /** 안정으로 매기지 않는 사유 (이전 버전 리포트에는 없다) */
  safeCapReasons?: SafeCapReason[];
  /** 기준컷에 쓴 입결 중 2027 과 모집군이 다른 학년도 (원문 군) */
  pastGroups?: { year: number; group: AdmissionGroup }[];
  /** 2027 최종 모집인원(수시 이월 반영)과 최신 입결 학년도 모집인원. 발표 전이면 null */
  finalQuotaChange?: {
    previousYear: number;
    previousQuota: number;
    finalQuota: number;
    ratio: number;
  } | null;
  /** 모집인원 변화와 기준컷 보정 (지표 단위) */
  quotaChange: {
    currentQuota: number;
    pastAverageQuota: number;
    cutAdjustment: number;
  } | null;
  /** 최신 입결 학년도 추가합격 인원 (판정에 쓰지 않는다) */
  additionalPass: { year: number; quota: number; count: number } | null;
  /** 같은 격차였던 학생이 다음 해 컷을 넘은 실측 비율 (0~1, 2025→2026). 없으면 null */
  historicalPassRate?: number | null;
  /** 최신 입결 학년도 합격자 50%·70% 컷 (지표 단위, 원문 값). 없으면 null */
  latestAdmitCuts?: {
    year: number;
    cut50: number | null;
    cut70: number;
  } | null;
}

/** PART 2 대학별 실제 점수 — 환산식을 그대로 적용한 값만 싣는다 */
export interface ScoreBreakdown {
  /** 영역별 반영. 영어는 반영비율에 포함하는 대학만 */
  areas: {
    area: ScoreArea;
    /** 이 학생에게 적용된 반영비율 (%) */
    ratio: number;
    /** 이 영역에서 받은 환산점수 */
    earned: number;
    /** 이 영역 만점 (반영비율 × 만점) */
    max: number;
  }[];
  /** 영어 등급으로 1등급 대비 달라진 점수 (0 이하). 영어 미반영이면 null */
  englishVsFirstGrade: number | null;
  /** 한국사 가감 점수 */
  historyAdjustment: number;
  /** 가산점 */
  bonusAdjustment: number;
  convertedScore: number;
  totalScore: number;
}

// ─── PART 2. 나에게 유리한 대학 분석 ───

export interface AdvantageItem {
  /** 모집단위 키 — PART 3 항목과 같은 값 */
  unitKey?: string;
  university: string;
  department: string;
  group: AdmissionGroup;
  /** 반영비율 요약 (예: "국30·수35·영10·탐25") */
  ratioSummary: string;
  /** 활용지표 요약 (예: "국·수 표준점수 / 탐구 변환표준점수") */
  metricSummary: string;
  /** 0~100. 학생 강점과 반영방식의 적합도 */
  advantageScore: number;
  /** 대학 환산식을 적용한 실제 점수 */
  breakdown?: ScoreBreakdown;
  /** 판정 근거 (PART 3 과 같은 값) */
  judgement?: UnitJudgement;
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
  /** 판정 기준컷 — 분류에 쓴 값 */
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
  /** 수능 외 전형 요소 원문 표기. 없으면 생략 */
  selectionNote?: string;
  chance: PassChance;
  /** 판정 근거 (PART 5 와 같은 값) */
  judgement?: UnitJudgement;
  /** 희망 학과와 다른 분류(같은 계열로 넓혀 담은 곳)면 true. PART 5 explanation.fitNote 가 근거다 */
  outsideTargetCategory?: true;
  /** AI: 한 줄 코멘트 */
  comment: string;
}

/** PART 3 — 희망 학과와 같은 분류로 비교했지만 목록에 넣지 않은 곳 (코드 작성) */
export interface NotListedRow {
  university: string;
  department: string;
  group: AdmissionGroup;
  /** 넣지 않은 이유 한 문장 */
  reason: string;
}

/** PART 3 — 희망 학과와 같은 분류인데 같은 기준으로 비교하지 못한 곳 (사유별 묶음, 코드 작성) */
export interface NotComparedGroup {
  /** 사유 한 문장 */
  reason: string;
  /** "대학 학과(군)" 목록 (최대 NOT_COMPARED_NAMES_PER_REASON 곳) */
  units: string[];
  /** units 밖에 더 있는 곳의 수 */
  moreCount?: number;
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
  /** 목록에 넣지 않은 곳과 이유 (이 필드가 생기기 전 리포트에는 없다) */
  notListed?: NotListedRow[];
  /** 비교하지 못한 곳과 사유 */
  notCompared?: NotComparedGroup[];
}

// ─── PART 4. 가·나·다군 지원 조합 ───

export interface CombinationSlot {
  /** 모집단위 키 — PART 3 항목과 같은 값 */
  unitKey?: string;
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
  /** 대표 조합 (리포트에 "추천"으로 표시). 하나만 true */
  recommended?: boolean;
  /** 세 칸의 구분이 성향의 기본 배분과 같은지 */
  matchesRiskAllocation?: boolean;
  /** 대표 조합의 칸별 선택 이유 (코드 작성). 대표 조합에만 있다 */
  slotReasons?: { group: AdmissionGroup; reason: string }[];
  /** 대표 조합의 원서별 실익과 위험, 원서를 바꿀 때의 변화 (코드 작성). 대표 조합에만 있다 */
  outlook?: CombinationOutlook;
  /** AI: 이 조합의 전략 설명 */
  strategy: string;
}

/** 원서 한 장을 목록의 다른 후보로 바꿀 때 */
export interface CombinationSwapOption {
  unitKey: string;
  university: string;
  department: string;
  tier: Exclude<AdmissionTier, "지원불가">;
  /** 바꾼 뒤의 구성과 달라지는 점 */
  text: string;
}

/** 대표 조합의 실익, 위험, 원서 교체 효과. 모든 문장은 코드가 엔진 값으로 쓴다 */
export interface CombinationOutlook {
  /** 세 원서 전체 구성과 전체 불합격 위험 */
  summary: string;
  /** 원서별 얻는 것과 감수할 위험 */
  slots: { group: AdmissionGroup; gain: string; risk: string }[];
  /** 군별로 다른 후보로 바꿀 때. 목록에 다른 후보가 없으면 options 가 비고 note 가 있다 */
  swaps: {
    group: AdmissionGroup;
    options: CombinationSwapOption[];
    note?: string;
  }[];
}

export interface JeongsiCombinationSection extends JeongsiBaseSection {
  sectionId: "jeongsiCombination";
  /** 학생이 고른 지원 성향 */
  risk: JeongsiInput["preference"]["risk"];
  combinations: CombinationItem[];
  /** 대표 조합을 고른 규칙 한 문장 (코드 작성). 대표 조합이 없으면 없다 */
  recommendationNote?: string;
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
  /** 학년도별 70%컷 (cutComparison.metric 과 같은 지표) */
  cutHistory: { year: number; cut: number | null }[];
  /** 컷과 같은 축의 비교값. 입결이 없으면 null */
  cutComparison?: CutComparison | null;
  /** 전형 총점 중 수능 비율(%). 수능 100% 전형이면 없다 */
  suneungWeight?: number;
  /** 수능 외 전형 요소 원문 표기. 없으면 생략 */
  selectionNote?: string;
  tier: Exclude<AdmissionTier, "지원불가">;
  chance: PassChance;
  /** 판정 근거 (PART 3 과 같은 값) */
  judgement?: UnitJudgement;
  /** 판정 설명 (코드 작성). 이 필드가 생기기 전 리포트에는 없다 */
  explanation?: UnitExplanation;
  /** AI: 추천 이유 */
  reason: string;
}

/**
 * 모집단위 하나의 판정 설명. 학생이 "왜 이 구분인지", "어떤 성적이 유리하고 불리했는지",
 * "판정이 바뀔 수 있는 조건", "합격선을 움직일 변수"를 리포트 안에서 찾게 한다.
 * 모두 엔진 값과 원문 값으로 코드가 쓴다(report/explanations.ts).
 */
export interface UnitExplanation {
  /** 왜 이 구분인지 (기준컷 산출, 구간, 실측 비율, 안정 제한 사유) */
  tierReason: string[];
  /** 이 대학에서 유리하게, 불리하게 작용한 성적 */
  factors: {
    effect: "유리" | "불리";
    text: string;
    /** 환산점수로 더 받거나 덜 받는 크기 (원서별 이유에서 큰 것부터 고르는 데 쓴다) */
    points?: number;
  }[];
  /** 판정이 성립하는 조건과 컷 변동 폭 */
  conditions: string[];
  /** 합격선에 영향을 줄 수 있는 원문 변수 (모집인원, 충원, 경쟁률, 반영방식 변경 등) */
  variables: string[];
  /** 희망 학과와 다른 분류로 넓혀 담은 곳의 근거 */
  fitNote?: string;
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
