// ============================================================
// 정시 분석 도메인 타입 정의
//
// 설계 원칙:
// - 모든 수치 계산은 코드가 담당한다. AI는 해설 문장만 생성한다.
// - 대학별 환산식은 "코드"가 아니라 "데이터"로 표현한다.
//   (ConversionFormula 를 JSON 으로 기술 → 엔진이 해석)
// - 데이터 출처가 바뀌어도(JSON → DB → 외부 API) 엔진이 영향받지
//   않도록 loadAdmissionPlans() 등 로더 인터페이스로 격리한다.
// ============================================================

// ─── 수능 과목 ───

/** 수능 응시 연도. 현재는 2026년 응시(= 2027학년도 정시)만 지원 */
export type ExamYear = 2026;

/** 정시 모집 학년도 */
export type AdmissionYear = 2027;

/** 입결 학년도 타입. 엔진 판정은 2025·2026 만 쓴다 (2024 입결 없음) */
export type ResultYear = 2024 | 2025 | 2026;

export type KoreanElective = "화법과작문" | "언어와매체";

export type MathElective = "확률과통계" | "미적분" | "기하";

export type SocialInquirySubject =
  | "생활과윤리"
  | "윤리와사상"
  | "한국지리"
  | "세계지리"
  | "동아시아사"
  | "세계사"
  | "경제"
  | "정치와법"
  | "사회문화";

export type ScienceInquirySubject =
  | "물리학I"
  | "화학I"
  | "생명과학I"
  | "지구과학I"
  | "물리학II"
  | "화학II"
  | "생명과학II"
  | "지구과학II";

export type InquirySubject = SocialInquirySubject | ScienceInquirySubject;

/** 수능 등급 (1~9) */
export type SuneungGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 등급별 점수/감점 테이블 */
export type GradeScoreTable = Record<SuneungGrade, number>;

// ─── 학생 입력 ───

/** 표준점수 + 백분위로 성적이 주어지는 영역 */
export interface ScoredSubject {
  standardScore: number;
  percentile: number;
}

export interface KoreanScore extends ScoredSubject {
  elective: KoreanElective;
}

export interface MathScore extends ScoredSubject {
  elective: MathElective;
}

export interface InquiryScore extends ScoredSubject {
  subject: InquirySubject;
}

/** 수능 성적 원본 입력 */
export interface SuneungScore {
  examYear: ExamYear;
  korean: KoreanScore;
  math: MathScore;
  english: { grade: SuneungGrade };
  inquiry1: InquiryScore;
  inquiry2: InquiryScore;
  history: { grade: SuneungGrade };
}

/** 희망 지역 (예전 입력에만 있다. 2026-11-15 입력에서 뺐고 분석에 쓰지 않는다) */
export type PreferredRegion = "서울" | "수도권" | "전국";

/** 지원 성향 */
export type RiskAppetite = "안정" | "균형" | "공격";

/** 희망 조건 */
export interface JeongsiPreference {
  /** 희망 학과명 또는 계열명 (DEPARTMENT_CATEGORY_MAP 으로 정규화) */
  target: string;
  /** target 이 개별 학과인지 계열 단위인지 */
  targetKind: "department" | "field";
  /** 예전 입력에만 있다. 분석에 쓰지 않는다(사용자 결정 2026-11-15) */
  region?: PreferredRegion;
  risk: RiskAppetite;
}

/** 학생 성별 — 남학생이면 여자대학교를 후보에서 뺀다 (수시와 같은 규칙) */
export type StudentGender = "male" | "female";

/** 정시 분석 요청 전체 입력 */
export interface JeongsiInput {
  score: SuneungScore;
  preference: JeongsiPreference;
  /** 성별을 받기 전에 저장된 입력에는 없다. 없으면 여자대학교를 빼지 않는다 */
  gender?: StudentGender;
}

// ─── 대학 전형 시행계획 ───

/** 한 입결 학년도의 경쟁률과 충원율 (원문 값) */
export interface RecentCompetition {
  year: 2025 | 2026;
  competitionRate?: number;
  /** 충원율(%) = 충원합격 인원 ÷ 모집인원 × 100, 원문에 적힌 값 */
  additionalPassRate?: number;
}

/** 모집군 */
export type AdmissionGroup = "가" | "나" | "다";

/** 대학 소재 권역 */
export type UniversityRegion = "서울" | "수도권" | "지방";

/** 영역별 활용지표 */
export type ScoreMetric = "standard" | "percentile" | "convertedStandard";

/** 영역별 반영비율 (합계 100) */
export interface AreaRatios {
  korean: number;
  math: number;
  english: number;
  inquiry: number;
}

/** 영역별 활용지표 지정 */
export interface MetricByArea {
  korean: Exclude<ScoreMetric, "convertedStandard">;
  math: Exclude<ScoreMetric, "convertedStandard">;
  inquiry: ScoreMetric;
}

/** 영어 반영 방식 */
export type EnglishPolicy =
  | { type: "ratioIncluded"; scoreByGrade: GradeScoreTable }
  | { type: "add"; scoreByGrade: GradeScoreTable }
  | { type: "subtract"; penaltyByGrade: GradeScoreTable };

/** 한국사 반영 방식 */
export type HistoryPolicy =
  | { type: "add"; scoreByGrade: GradeScoreTable }
  | { type: "subtract"; penaltyByGrade: GradeScoreTable };

/** 가산점 적용 단위 */
export interface BonusRule {
  type: "percent" | "point";
  value: number;
}

/** 가산점 묶음 */
export interface BonusPolicy {
  /** 수학 선택과목 가산 (예: 미적분·기하 +5%) */
  mathElective?: Partial<Record<MathElective, BonusRule>>;
  /** 과탐 응시 가산 */
  scienceInquiry?: BonusRule & {
    appliesTo: "each" | "total";
    /** 반영 과목 중 과탐이 이 수 이상일 때만 가산. 미지정이면 1 */
    minCount?: 2;
  };
}

/** 영역별 기준 만점 (표준점수 정규화용) */
export interface AreaBaseMax {
  korean: number;
  math: number;
  inquiry: number;
}

/** 선택과목 응시 제한 */
export interface SubjectRestriction {
  /** 허용되는 수학 선택과목. 미지정이면 제한 없음 */
  math?: MathElective[];
  /** 탐구 영역 제한 */
  inquiry?: "과탐필수" | "과탐1과목이상" | "제한없음";
}

/**
 * 순위 비교 기준.
 * - standard: 표준점수 (대상 영역이 모두 표준점수 지표일 때만)
 * - percentile: 백분위. 영어는 영어 환산표를 100점 만점으로 맞춘 값
 * - areaScore: 영역 환산점수. 같은 반영비율을 줬을 때의 기여 점수
 *   (지표값 / 기준만점, 영어는 표값 / 표 최댓값)
 */
export type SelectionRankBasis = "standard" | "percentile" | "areaScore";

/**
 * 상위 영역 선택 반영 규칙.
 *
 * 대상 영역을 rankBasis 로 줄 세워 n 번째 영역에 rankRatios[n] 을
 * 반영비율로 준다. 대상 영역이 rankRatios 보다 많으면 남는 영역은
 * 반영하지 않는다(비율 0).
 * 예) 성균관대 "국어·수학 중 우수 영역 45%, 다른 영역 35%"
 *     → areas [korean, math], rankRatios [45, 35]
 *     충주대 "국·수·영·탐 중 상위 3개 영역 평균"
 *     → areas 4개, rankRatios [33.33, 33.33, 33.33]
 */
export interface AreaSelectionRule {
  /** 순위를 매길 대상 영역 (2개 이상) */
  areas: ScoreArea[];
  /** 순위별 반영비율 (ratios 와 같은 단위). 길이 = 선택 영역 수 */
  rankRatios: number[];
  rankBasis: SelectionRankBasis;
}

/**
 * 대학별 수능 환산식.
 *
 * 계산 순서:
 *   1. 선택과목 제한 통과 확인
 *   2. 영역별 지표값 추출 (표준점수 / 백분위 / 변환표준점수)
 *   2-1. 상위 영역 선택 규칙이 있으면 순위별 반영비율 확정
 *   3. 정규화: 지표값 / 기준만점 x 반영비율 x 총점
 *   4. 가산점 적용 (수학 선택, 과탐)
 *   5. 영어 반영 (비율 포함 / 가산 / 감산)
 *   6. 한국사 반영 (가산 / 감산)
 */
export interface ConversionFormula {
  /** 환산식 스키마 버전. 데이터 구조 변경 시 마이그레이션 기준 */
  formulaVersion: 1;
  /** 수능 환산 총점 만점 (예: 1000) */
  totalScore: number;
  ratios: AreaRatios;
  metric: MetricByArea;
  /** 탐구 반영 과목 수. 1이면 상위 1과목, 2면 두 과목 평균 */
  inquiryCount: 1 | 2;
  /**
   * 백분위 → 변환표준점수 대응표 (사탐·과탐 공통).
   * metric.inquiry 가 convertedStandard 이면 이것 또는 convertedStandardTableByTrack 중 하나가 있다.
   */
  convertedStandardTable?: Record<number, number>;
  /**
   * 사탐·과탐 열이 다른 변표. 학생이 응시한 과목의 열을 쓴다.
   * 원문에 "해당없음"인 열은 null 이고, 그 과목은 이 표로 환산할 수 없다.
   */
  convertedStandardTableByTrack?: {
    science: Record<number, number> | null;
    social: Record<number, number> | null;
  };
  english: EnglishPolicy;
  history: HistoryPolicy;
  bonus?: BonusPolicy;
  baseMax: AreaBaseMax;
  /**
   * 상위 영역 선택 반영. 있으면 selection.areas 의 ratios 값은
   * rankRatios 를 대상 영역 순서대로 채운 자리값이고, 실제 비율은
   * 학생 성적으로 정한다(engine resolveAreaRatios).
   */
  selection?: AreaSelectionRule;
}

/** 대학-학과-모집군 단위의 정시 전형 시행계획 */
export interface JeongsiAdmissionPlan {
  /** "서울대학교-컴퓨터공학부-가" 형태의 고유 키 */
  id: string;
  admissionYear: AdmissionYear;
  university: string;
  campus?: string;
  department: string;
  /** DEPARTMENT_CATEGORY_MAP 기준 표준 카테고리 */
  category: string;
  region: UniversityRegion;
  group: AdmissionGroup;
  /** 2027 최초 모집인원 (원문) */
  quota: number;
  /**
   * 2027 최종 모집인원 (수시 이월 반영, 원문). 원문이 "발표전"이면 생략한다.
   * 스나이핑 신호(최종 모집인원 증가)에만 쓴다.
   */
  finalQuota?: number;
  /**
   * 최근 입결 학년도(2025, 2026)의 경쟁률과 충원율(%) (원문 40_입결_경쟁충원).
   * 원문에 없는 해와 값은 싣지 않는다. 스나이핑 우선순위 신호에만 쓴다.
   */
  recentCompetitions?: RecentCompetition[];
  /**
   * 전형 총점 중 수능 비율(%). 100 이면 생략한다.
   * 나머지(학생부 교과 등)는 엔진이 계산하지 않으므로, 이 값이 있는
   * 모집단위는 수능 성적만으로 본 위치다.
   */
  suneungWeight?: number;
  /**
   * 수능 외 전형 요소 원문 표기 (학생부·기타 비율, 원문 비고). 예)
   * "학생부 10% · 학생부 출결 10%", "학교폭력 조치사항 감점". 없으면 생략.
   */
  selectionNote?: string;
  /**
   * 가중합 산출식 대학의 공시 가중치 표기 (예: "국100·수120·탐80").
   * 이런 대학의 formula.ratios 는 엔진이 계수에서 역산한 배점 비중이라
   * 대학이 공시한 반영비율과 다르다. 화면·해설에는 이 표기를 쓴다.
   */
  statedRatios?: string;
  /**
   * formula.ratios(영역 비중)를 원문에 없는 표준점수 최고점 추정치로 역산했다.
   * 환산점수 계산에는 그대로 쓰되(값이 상쇄돼 결과는 정확하다), 비중 비교·유리도·
   * 해설에는 쓰지 않는다(engine resolveAreaShares 가 null 을 돌려준다).
   */
  areaSharesEstimated?: true;
  formula: ConversionFormula;
  restrictions?: SubjectRestriction;
}

// ─── 입시 결과 (입결) ───

/** 입결이 공개되는 지표 */
export type ResultMetric = "percentile" | "convertedScore";

/**
 * 백분위 입결의 산출 기준.
 * 공개 입결은 거의 전부 국·수·탐 단순평균이므로 기본값은 simpleAverage 이다.
 * 대학 반영비율로 가중된 백분위(weightedPercentile)와 비교하면
 * 강점이 뚜렷한 학생이 체계적으로 과대평가되므로 반드시 구분한다.
 */
export type PercentileBasis = "simpleAverage" | "universityWeighted";
// 영어 포함 평균(withEnglish)은 두지 않는다. 영어 백분위는 원문에 없다
// (사용자 결정 2026-11-05). 그런 입결이 생기면 비교할 수 없는 컷이다.

export interface ResultCut {
  metric: ResultMetric;
  value: number;
  /** metric 이 percentile 일 때의 산출 기준. 미지정 시 simpleAverage 로 간주 */
  basis?: PercentileBasis;
  /**
   * metric 이 convertedScore 일 때, 이 컷이 가산점·감점을 반영한 값인지.
   * 미지정 시 true(반영됨)로 간주한다.
   *
   * false 인데 학생 점수에는 가산이 붙으면 **가산 수혜자만 선택적으로
   * 과대평가**된다(미적분·과탐 응시자는 1.6~5% 부풀려지고 확률과통계
   * 응시자는 영향 없음). 모두가 똑같이 틀리는 편향과 달리 발견이 어렵고
   * 피해가 일부 학생에게 집중되므로 반드시 구분한다.
   *
   * false 일 때의 비교값 = convertedScore − bonusAdjustment.
   * percentile 지표 입결은 환산 전 값이라 이 필드와 무관하다.
   */
  bonusIncluded?: boolean;
}

/** 대학-학과-모집군-학년도 단위 정시 입결 */
export interface JeongsiResultEntry {
  /** 대응하는 JeongsiAdmissionPlan.id (학년도 접미사 제외) */
  planKey: string;
  admissionYear: ResultYear;
  university: string;
  department: string;
  group: AdmissionGroup;
  quota: number;
  /** 경쟁률. 미공개면 생략 (실데이터 입결의 약 1/4) */
  competitionRate?: number;
  /** 충원인원 */
  additionalPassCount?: number;
  /** 최종등록자 상위 70% 컷 */
  cut70?: ResultCut;
  /** 최종등록자 상위 50% 컷 */
  cut50?: ResultCut;
  /** 최종등록자 평균 */
  average?: ResultCut;
}

// ─── 엔진 산출물 ───

/**
 * 안정으로 매기지 않는 사유. 격차가 안정 구간이어도 하나라도 있으면 적정으로 둔다.
 * 자세한 근거는 engine/classify.ts 의 MIN_YEARS_FOR_SAFE·SafeCapReason 주석.
 */
export type SafeCapReason = "1개년 입결" | "모집군 변경" | "백분위 입결";

/** 지원 가능성 분류 */
/**
 * 지원 가능성 분류. 스나이핑은 추천 범위(상향하한) 바로 아래로, 합격 가능성은
 * 낮지만 시도해 볼 곳이다(specs/014 마지막 피드백). 그 아래는 지원불가.
 */
export type AdmissionTier = "안정" | "적정" | "상향" | "소신" | "지원불가";

/** 합격 가능성 라벨 */
export type PassChance = "높음" | "보통" | "낮음" | "매우낮음";

/** 영역 식별자 */
export type ScoreArea = "korean" | "math" | "english" | "inquiry";

/** 학생 성적의 영역별 위치 */
export interface AreaStanding {
  area: ScoreArea;
  /** 백분위. 영어는 원문에 등급만 있어 null */
  percentile: number | null;
  /** 표준점수. 영어는 null */
  standardScore: number | null;
  /** 국어·수학·탐구 중 상대 순위 (1이 가장 강함). 영어는 null */
  rank: number | null;
  /** 국·수·탐 평균 백분위 대비 편차. 영어는 null */
  deviation: number | null;
}

/** PART 1 — 성적 종합 분석의 계산 결과 */
export interface ScoreDiagnosis {
  areas: AreaStanding[];
  /** 국·수·탐 평균 백분위 */
  averagePercentile: number;
  /** 국·수·탐 표준점수 합 */
  totalStandardScore: number;
  strengths: ScoreArea[];
  weaknesses: ScoreArea[];
}

/** 특정 대학 전형에 대한 학생의 환산 결과 */
export interface PlanEvaluation {
  plan: JeongsiAdmissionPlan;
  /** 선택과목 제한 통과 여부 */
  eligible: boolean;
  /** 제한에 걸렸을 때의 사유 */
  ineligibleReason?: string;
  /** 대학 환산식 적용 결과 */
  convertedScore: number;
  /**
   * 대학 반영비율로 가중한 국·수·탐 평균 백분위.
   * 비중이 추정값인 대학(areaSharesEstimated)은 null 이다.
   */
  weightedPercentile: number | null;
  /**
   * 국·수·탐 단순평균 백분위.
   * percentile 지표 입결과 비교할 때는 반드시 이 값을 쓴다.
   */
  simpleAveragePercentile: number;
  /**
   * 판정 기준컷. 쓸 수 있는 입결 학년도(2025·2026)의 70%컷을 가중평균
   * (0.5/0.3, 결측 연도는 재정규화)하고 모집인원 보정을 더한 값이다.
   * 연도별 원본 컷은 cutHistory 를 보라. 쓸 수 있는 70%컷이 없으면 null.
   */
  referenceCut: ResultCut | null;
  /** 최신 입결 학년도 경쟁률. 입결이 없으면 null */
  competitionRate: number | null;
  /** 학년도별 70%컷 (2025·2026). 입결이 없는 해는 cut 이 null */
  cutHistory: { year: ResultYear; cut: number | null }[];
  /**
   * 판정 격차 — **분류의 척도**. 모든 대학에 같은 고정 구간을 적용한다.
   * 환산점수 입결이면 (내 환산점수 − 기준컷) ÷ 만점 × 100 (만점 대비 %),
   * 백분위 입결이면 내 국·수·탐 평균 백분위 − 기준컷 (백분위점).
   */
  gapRatio: number | null;
  /** 판정 지표 단위의 차이 (환산점수 점 또는 백분위점). 표시용 */
  gapPoints: number | null;
  /** 기준컷 산출에 쓴 입결 학년도 */
  resultYears: ResultYear[];
  /** 모집인원 변화와 그에 따른 기준컷 보정 (표시용) */
  quotaChange: {
    currentQuota: number;
    pastAverageQuota: number;
    cutAdjustment: number;
  } | null;
  /** 최신 입결 학년도 추가합격 인원 (표시용, 판정에 쓰지 않는다) */
  additionalPass: { year: ResultYear; quota: number; count: number } | null;
  /** 격차는 안정 구간이지만 safeCapReasons 때문에 적정으로 낮췄는지 */
  safeCapped: boolean;
  /** 안정으로 매기지 않는 사유 (1개년 입결·모집군 변경·백분위 입결) */
  safeCapReasons: SafeCapReason[];
  /** 기준컷에 쓴 입결 중 2027 과 모집군이 다른 학년도 (원문 군) */
  pastGroups: { year: ResultYear; group: AdmissionGroup }[];
  /**
   * 2027 최종 모집인원(수시 이월 반영)과 최신 입결 학년도 모집인원.
   * 최종 인원이 원문에 아직 없으면("발표전") null. 스나이핑 신호에 쓴다.
   */
  finalQuotaChange: {
    previousYear: ResultYear;
    previousQuota: number;
    finalQuota: number;
    ratio: number;
  } | null;
  /** 추천 범위 안인지 (안정상한을 넘는 곳은 성적보다 크게 낮아 추천하지 않는다) */
  withinRecommendRange: boolean;
  /**
   * 기준컷 대비 같은 격차였던 학생이 다음 해 컷을 넘은 실측 비율 (0~1).
   * 2025 기준컷 → 2026 실제 컷 이동 분포(engine/cut-movement.ts)로 구한다.
   * 실측은 환산점수 입결·같은 모집군 모집단위에서만 잰 값이라, 백분위 입결로
   * 판정한 곳과 단독 평가는 null.
   */
  historicalPassRate: number | null;
  /** 최신 입결 학년도 합격자 50%·70% 컷 (판정 지표 단위, 원문 값) */
  latestAdmitCuts: {
    year: ResultYear;
    cut50: number | null;
    cut70: number;
  } | null;
  /**
   * 백분위 1점당 환산점수 변화율 (%). 대학별 민감도.
   * 표준점수 반영 대학은 원문만으로 계산할 수 없어 null 이다.
   */
  sensitivity: number | null;
  tier: AdmissionTier;
  chance: PassChance;
  /**
   * 반영방식 유리도 (0~100).
   * 이 대학의 반영비율이 학생의 강점 영역에 얼마나 유리한지.
   */
  advantageScore: number;
}

/** PART 4 — 가·나·다군 지원 조합 하나 */
export interface GroupCombination {
  id: string;
  /** 조합의 성격 라벨 (예: "균형 조합", "소신지원형") */
  label: string;
  가: PlanEvaluation | null;
  나: PlanEvaluation | null;
  다: PlanEvaluation | null;
  /** 대표 조합 (리포트에 "추천"으로 표시). 조합 목록에서 하나만 true */
  recommended: boolean;
  /** 세 칸의 구분이 성향의 기본 배분과 같은지 */
  matchesRiskAllocation: boolean;
}

/**
 * 후보군을 고르는 과정에서 일어난 일.
 * AI 해설이 "왜 이런 목록이 나왔는지"를 설명하려면 이 사실이 필요하다.
 */
export interface CandidateSelection {
  /**
   * 후보 풀을 어디까지 넓혔는지.
   * 1 = 희망 학과 완전일치, 2 = 같은 계열그룹, 3 = 같은 대계열.
   * 2 이상이면 해설에 "유사 계열까지 넓혀 비교했다"를 밝혀야 한다.
   */
  poolStage: 1 | 2;
  /** 적정 밴드가 비어 가장 가까운 항목으로 대체했는지 */
  moderateBandSubstituted: boolean;
  /**
   * 희망 계열 후보가 전부 선택과목 제한에 걸려 지원 자체가 불가능한 상태.
   * 이때 recommendations / combinations / advantageousPlans 가 모두 비고,
   * 해설은 다른 계열을 권하는 대신 **지원 불가 사실과 그 사유**를
   * 최우선으로 서술해야 한다.
   */
  blockedByRestrictions: boolean;
  /**
   * 희망 범위 후보 중 추천 범위를 벗어나 뺀 곳의 수.
   * tooHigh: 기준컷이 성적보다 높아 상향 하한에도 못 미치는 곳
   * tooLow: 기준컷이 성적보다 크게 낮아 안정 상한을 넘는 곳
   */
  outOfRange?: { tooHigh: number; tooLow: number };
}

/** 엔진 전체 산출물. 이 값이 AI 프롬프트의 입력이 된다. */
export interface JeongsiAnalysis {
  input: JeongsiInput;
  diagnosis: ScoreDiagnosis;
  /** 후보 선정 과정의 메타정보 */
  selection: CandidateSelection;
  /**
   * 선택과목 제한에 걸려 지원 불가로 판정된 모집단위.
   * 학생에게 "왜 이 대학이 목록에 없는지" 설명하는 근거가 된다.
   */
  ineligiblePlans: PlanEvaluation[];
  /** 반영방식이 유리한 대학 (advantageScore 내림차순) */
  advantageousPlans: PlanEvaluation[];
  /**
   * 구분별 추천 — 각 최대 4곳. 리포트의 대학 목록 전체다.
   * advantageousPlans·combinations 의 모집단위는 모두 이 안에 있다.
   */
  recommendations: Record<"상향" | "적정" | "안정", PlanEvaluation[]>;
  /**
   * 스나이핑 후보 (최대 SNIPING_SIZE 곳). 리포트 목록(PART 3·5)에 별도 칸으로 싣고,
   * 공격 성향이면 이 중 한 곳을 넣은 조합을 하나 더 보인다.
   */
  sniping: PlanEvaluation[];
  combinations: GroupCombination[];
}
