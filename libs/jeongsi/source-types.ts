// ============================================================
// 정시 입시자료 정규화 원본 타입
//
// libs/jeongsi/data/source/*.json 의 형태. 외주 엑셀(정시_입시자료.xlsx)
// 의 데이터 시트를 scripts/jeongsi/normalize-excel.py 가 손실 없이 옮긴다.
//
// 엔진은 이 파일을 직접 읽지 않는다. scripts/jeongsi/build-engine-data.ts
// 가 여기서 엔진이 계산 가능한 모집단위만 골라 types.ts 의
// JeongsiAdmissionPlan / JeongsiResultEntry 로 변환한다.
//
// 값 규칙:
// - 빈 칸(아직 조사 안 함)은 키가 없다.
// - 공개 상태는 특수값 문자열로 남는다. '미공개'(대학이 공개 안 함)와
//   '해당없음'(개념상 없음)은 의미가 다르므로 구분해서 다룬다.
// - 코드표(01_코드표)에 없는 서술형 값이 섞여 있어 enum 칸도 string 을
//   허용한다. 대표값만 리터럴로 적어 자동완성을 돕는다.
// ============================================================

/** 수치 칸에 숫자 대신 들어가는 공개 상태 */
export type SourceSpecialValue =
  | "미공개"
  | "해당없음"
  | "발표전"
  | "확인필요"
  | "미조사";

/** 숫자 또는 공개 상태 */
export type SourceNumber = number | SourceSpecialValue;

/** Y/N 칸. Y/N 외의 값('일부', '해당없음' 등)은 문자열 그대로 */
export type SourceFlag = boolean | string;

/** 코드표 대표값 + 서술형 원문 */
type Coded<T extends string> = T | (string & {});

/** 등급별 점수표. 키는 "1"~"9" */
export type SourceGradeTable = Partial<Record<string, SourceNumber>>;

/** 출처 (sources.json). 같은 출처는 한 번만 저장하고 ID 로 참조한다 */
export interface SourceReference {
  id: string;
  url?: string;
  /** 문서명·쪽 */
  doc?: string;
}

// ─── 10_공개현황 → universities.json ───

/** 항목별 공개 상태 (공개 / 일부공개 / 미공개 / 발표전 / 해당없음) */
export interface SourceDisclosure {
  guide2027?: string;
  guide2026?: string;
  guide2025?: string;
  formula?: string;
  englishTable?: string;
  historyTable?: string;
  convertedTable2026?: string;
  convertedTable2027?: string;
  finalQuota2027?: string;
  competitionRate2026?: string;
  additionalPass2026?: string;
  cut50?: string;
  cut70?: string;
  registrantAverage?: string;
  lowestPass?: string;
  results3y?: string;
}

export interface SourceUniversity {
  /** 대학코드 (캠퍼스 단위. 예: KU / KUS) */
  code: string;
  university: string;
  campus?: string;
  baseYear?: number;
  admissionsUrl?: string;
  disclosure: SourceDisclosure;
  resultUnit?: string;
  resultMetricNote?: string;
  checkedAt?: string;
  /** 변환 단계 보강값. 엑셀에 소재지 칸이 없다 */
  region: "서울" | "수도권" | "지방";
}

// ─── 20_모집단위 + 21_모집인원 → units.json ───

export type SourceTrack = Coded<
  "인문" | "자연" | "통합" | "예체능" | "의약" | "사범" | "미공개"
>;

export type SourceGroup = Coded<"가" | "나" | "다" | "군외" | "미공개">;

export type SourceUnitStatus = Coded<
  "유지" | "신설" | "통합" | "분리" | "명칭변경" | "모집군변경" | "2027 미모집"
>;

/** 전형 총점 중 요소별 비율 (%) */
export interface SourceSelectionWeights {
  suneung?: SourceNumber;
  schoolRecord?: SourceNumber;
  other?: SourceNumber;
  otherNote?: string;
}

/** 학년도별 모집인원 (21_모집인원 1행) */
export interface SourceQuota {
  year: number;
  /** 그 학년도의 모집단위명 (명칭변경 전 이름일 수 있다) */
  department?: string;
  group?: SourceGroup;
  admissionType?: string;
  initialQuota?: SourceNumber;
  /** 수시 이월 인원 */
  carryOver?: SourceNumber;
  finalQuota?: SourceNumber;
  initialSourceId?: string;
  finalSourceId?: string;
}

export interface SourceUnit {
  /** 모집단위ID (예: KSU-001). 모집군·전형이 다르면 별개 ID */
  unitId: string;
  universityCode: string;
  university: string;
  campus?: string;
  department: string;
  track?: SourceTrack;
  /** 2027 모집군 */
  group?: SourceGroup;
  admissionType?: string;
  unitStatus?: SourceUnitStatus;
  /** 2027 반영방법ID → formulas.json */
  formulaId?: string;
  selectionWeights?: SourceSelectionWeights;
  changed2027?: SourceFlag;
  changeSummary?: string;
  sourceId?: string;
  baseYear?: number;
  checkedAt?: string;
  /** 변환 단계 보강값 */
  region: "서울" | "수도권" | "지방";
  /** 최신 학년도 우선 */
  quotas: SourceQuota[];
}

// ─── 30_수능반영방법 → formulas.json ───

export type SourceMetric = Coded<
  "표준점수" | "백분위" | "변환표준점수" | "등급점수" | "미반영"
>;

export type SourceAreaRule = Coded<
  "전영역 필수" | "국·수 순위별 가중" | "상위 영역 선택" | "혼합"
>;

export type SourceEnglishMode = Coded<
  "비율포함" | "가산" | "감산" | "미반영" | "평균등급에 포함"
>;

export type SourceHistoryMode = Coded<
  "가산" | "감산" | "비율포함" | "응시만 필수" | "미반영"
>;

/** 영어·한국사 점수를 더하는 위치 */
export type SourceApplyPosition = Coded<
  "영역점수(비율 곱함)" | "배율 적용 전 가감" | "배율 적용 후 가감" | "해당없음"
>;

export type SourceInquiryCombine = Coded<
  "합" | "평균" | "상위 1과목" | "가중합" | "해당없음"
>;

/** 상위 영역 선택 반영 규칙 */
export interface SourceSelectionRule {
  rule?: string;
  targets?: {
    korean?: SourceFlag;
    math?: SourceFlag;
    english?: SourceFlag;
    inquiry?: SourceFlag;
  };
  count?: SourceNumber;
  rankRatios?: {
    first?: SourceNumber;
    second?: SourceNumber;
    third?: SourceNumber;
  };
  rankBasis?: string;
}

export interface SourceFormula {
  /** 반영방법ID (예: KSU-2027-인문) */
  id: string;
  universityCode: string;
  university: string;
  year: number;
  /** 적용 모집단위 (원문) */
  appliesTo?: string;
  totalScore?: SourceNumber;
  areaRule?: SourceAreaRule;
  selection?: SourceSelectionRule;
  korean: {
    metric?: SourceMetric;
    /** 반영비율(%). 대학에 따라 합이 100 이 아닌 가중치일 수 있다 */
    ratio?: SourceNumber;
    restriction?: string;
  };
  math: {
    metric?: SourceMetric;
    ratio?: SourceNumber;
    /** 수학 지정과목 (원문) */
    restriction?: string;
  };
  english: {
    mode?: SourceEnglishMode;
    ratio?: SourceNumber;
    /** → english-tables.json */
    tableId?: string;
    applyPosition?: SourceApplyPosition;
  };
  inquiry: {
    metric?: SourceMetric;
    ratio?: SourceNumber;
    count?: SourceNumber;
    combine?: SourceInquiryCombine;
    /** → converted-standard-tables.json */
    convertedTableId?: string;
    requirement?: Coded<
      "무관" | "사탐 필수" | "과탐 필수" | "기타(제한 칸 참조)"
    >;
    restrictionNote?: string;
    secondLanguageSubstitute?: string;
  };
  history: {
    mode?: SourceHistoryMode;
    ratio?: SourceNumber;
    /** → history-tables.json */
    tableId?: string;
    applyPosition?: SourceApplyPosition;
  };
  rounding?: {
    stage?: string;
    digits?: SourceNumber;
    mode?: string;
  };
  hasBonus?: SourceFlag;
  otherAdjustmentsText?: string;
  /** 산출식 원문 — 구조화 칸에 없는 정규화 분모·배율은 여기에만 있다 */
  formulaText?: string;
  officialExample?: string;
  changed2027?: SourceFlag;
  change2027?: string;
  sourceId?: string;
  checkedAt?: string;
}

// ─── 31_영어환산 / 32_한국사환산 → english-tables.json / history-tables.json ───

export interface SourceGradeScoreTable {
  id: string;
  universityCode: string;
  university: string;
  year: number;
  scope?: string;
  mode?: string;
  /** 감산 방식이면 음수로 기재되어 있다 */
  scoreByGrade: SourceGradeTable;
  changed2027?: SourceFlag;
  sourceId?: string;
  checkedAt?: string;
}

// ─── 33_탐구변표 → converted-standard-tables.json ───

export interface SourceConvertedRow {
  percentile: number;
  social?: SourceNumber;
  science?: SourceNumber;
  vocational?: SourceNumber;
}

export interface SourceConvertedTable {
  id: string;
  universityCode: string;
  university: string;
  /** 표의 학년도. 2027 표는 수능 성적 발표 후 공개된다 */
  year: number;
  scope?: string;
  status?: string;
  /** 백분위 내림차순, 100~0 101행 */
  rows: SourceConvertedRow[];
  sourceId?: string;
  checkedAt?: string;
  note?: string;
}

// ─── 34_가산점 → bonuses.json ───

export interface SourceBonus {
  formulaId: string;
  university: string;
  year: number;
  area?: Coded<"수학" | "탐구" | "국어" | "영어">;
  targetSubjects?: string;
  value?: SourceNumber;
  unit?: Coded<"%" | "점">;
  /** 가산을 곱하거나 더하는 대상 점수 */
  appliesTo?: Coded<
    "취득 표준점수" | "취득 백분위" | "취득 변환표준점수" | "영역 환산점수"
  >;
  scope?: Coded<"응시 과목마다" | "영역에 1회">;
  condition?: string;
  text?: string;
  changed2027?: SourceFlag;
  sourceId?: string;
  checkedAt?: string;
  note?: string;
}

// ─── 36_등급점수표 → grade-score-tables.json ───

export interface SourceAreaGradeTable {
  id: string;
  universityCode: string;
  university: string;
  year: number;
  kind?: string;
  area?: string;
  input?: string;
  scoreByGrade: SourceGradeTable;
  formulaId?: string;
  sourceId?: string;
  checkedAt?: string;
}

// ─── 40_입결_경쟁충원 → competitions.json ───

export interface SourceCompetition {
  unitId: string;
  year: number;
  university: string;
  campus?: string;
  department?: string;
  group?: SourceGroup;
  admissionType?: string;
  /** 그 학년도 최종 모집인원 */
  quota?: SourceNumber;
  competitionRate?: SourceNumber;
  additionalPassCount?: SourceNumber;
  additionalPassRate?: SourceNumber;
  sourceType?: Coded<"입학처" | "대학어디가">;
  sourceId?: string;
}

// ─── 41_입결_성적 → result-scores.json ───

export type SourceScoreType = Coded<
  "환산점수" | "백분위 평균" | "백분위 합" | "표준점수 합" | "등급 평균"
>;

export interface SourceResultScore {
  unitId: string;
  year: number;
  university: string;
  department?: string;
  group?: SourceGroup;
  admissionType?: string;
  scoreType: SourceScoreType;
  areaText?: string;
  areaDecision?: Coded<"당해 반영방법 따름" | "영역 직접 지정" | "미공개">;
  /** 지표에 포함된 영역. 환산점수면 '해당없음' */
  areas?: {
    korean?: SourceFlag;
    math?: SourceFlag;
    english?: SourceFlag;
    inquiry?: SourceFlag;
  };
  inquiryHandling?: Coded<"상위 1과목" | "2과목 평균" | "해당없음" | "미공개">;
  /** 지표 만점. 환산점수면 대학 환산 총점 */
  scaleMax?: SourceNumber;
  formulaId?: string;
  basisGroup?: Coded<"최종등록자" | "최종합격자" | "최초합격자">;
  cut50?: SourceNumber;
  cut70?: SourceNumber;
  average?: SourceNumber;
  lowestPass?: SourceNumber;
  highest?: SourceNumber;
  otherCutPercent?: SourceNumber;
  otherCutValue?: SourceNumber;
  englishGradeAverage?: SourceNumber;
  sourceType?: Coded<"입학처" | "대학어디가">;
  sourceId?: string;
}

// ─── 50_2027변경사항 → changes.json ───

export interface SourceChange {
  id: string;
  universityCode: string;
  university: string;
  /** 모집단위ID 또는 모집단위명·'전체' (원문) */
  unitRef?: string;
  scope?: string;
  kind?: string;
  before?: string;
  after?: string;
  beforeSourceId?: string;
  afterSourceId?: string;
  note?: string;
}

// ─── manifest.json ───

export interface SourceManifest {
  sourceFile: string;
  sourceSha256: string;
  generatedAt: string;
  admissionYear: number;
  counts: Record<string, number>;
}
