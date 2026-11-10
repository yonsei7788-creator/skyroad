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

/** 입결을 보유한 과거 학년도 (최근 3개년) */
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

/** 희망 지역 */
export type PreferredRegion = "서울" | "수도권" | "전국";

/** 지원 성향 */
export type RiskAppetite = "안정" | "균형" | "공격";

/** 희망 조건 */
export interface JeongsiPreference {
  /** 희망 학과명 또는 계열명 (DEPARTMENT_CATEGORY_MAP 으로 정규화) */
  target: string;
  /** target 이 개별 학과인지 계열 단위인지 */
  targetKind: "department" | "field";
  region: PreferredRegion;
  risk: RiskAppetite;
}

/** 정시 분석 요청 전체 입력 */
export interface JeongsiInput {
  score: SuneungScore;
  preference: JeongsiPreference;
}

// ─── 대학 전형 시행계획 ───

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
  quota: number;
  /**
   * 전형 총점 중 수능 비율(%). 100 이면 생략한다.
   * 나머지(학생부 교과 등)는 엔진이 계산하지 않으므로, 이 값이 있는
   * 모집단위는 수능 성적만으로 본 위치다.
   */
  suneungWeight?: number;
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

/** 지원 가능성 분류 */
export type AdmissionTier = "안정" | "적정" | "상향" | "지원불가";

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
   * 분류 기준이 된 **3개년 기준컷**.
   * 단년 컷이 아니라 2026·2025·2024 가중평균(0.5/0.3/0.2)에
   * 추세·모집인원 보정을 적용한 값이다. gapRatio 와 짝을 이룬다.
   * 연도별 원본 컷은 cutHistory 를 보라.
   * 쓸 수 있는 70%컷이 없으면 null (원문에 없는 컷은 만들지 않는다).
   */
  referenceCut: ResultCut | null;
  /** 전년도 경쟁률. 입결이 없으면 null */
  competitionRate: number | null;
  /** 최근 3개년 컷 추이. 입결이 없는 해는 cut 이 null */
  cutHistory: { year: ResultYear; cut: number | null }[];
  /** 환산 총점 대비 컷과의 격차 비율 (%). 표시용 */
  gapRatio: number | null;
  /**
   * 컷과의 격차를 백분위점으로 환산한 값. **분류의 실제 척도**.
   * 환산 총점 대비 비율(gapRatio)은 대학마다 민감도가 2배 이상 차이나
   * 대학 간 비교가 불가능하므로 분류에 쓰지 않는다.
   */
  percentileGap: number | null;
  /**
   * 백분위 1점당 환산점수 변화율 (%). 대학별 민감도.
   * 표준점수 반영 대학은 원문만으로 계산할 수 없어 null 이다.
   */
  sensitivity: number | null;
  /**
   * 분류에 사용된 컷 변동성 시그마 (백분위점).
   * 3개년 컷 표준편차에 모집인원 기반 하한을 적용한 값.
   */
  cutVolatility: number | null;
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
  /** 구분별 추천 — 각 3개 */
  recommendations: Record<"상향" | "적정" | "안정", PlanEvaluation[]>;
  combinations: GroupCombination[];
}
