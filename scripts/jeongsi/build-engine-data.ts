/**
 * 정규화 원본(libs/jeongsi/data/source) → 엔진 입력 JSON 변환기
 *
 * 출력
 * - libs/jeongsi/data/admission-plans-2027.json   JeongsiAdmissionPlan[]
 * - libs/jeongsi/data/admission-results.json      JeongsiResultEntry[]
 * - libs/jeongsi/data/source/engine-conversion-report.json  제외 사유·검증 통계
 *
 * 원칙 — 틀린 환산식보다 빠진 모집단위가 낫다.
 * 엔진의 ConversionFormula 로 **정확히** 표현되는 모집단위만 옮기고,
 * 나머지는 사유를 남기고 제외한다. 근거는 specs/012 §8.
 *
 * Usage: npx tsx scripts/jeongsi/build-engine-data.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateAdmissionPlans,
  validateAdmissionResults,
} from "../../libs/jeongsi/data/index.ts";
import { convertScore } from "../../libs/jeongsi/engine/convert-score.ts";
import { DEPARTMENT_CATEGORY_MAP } from "../../libs/report/constants/department-category-map.ts";

import type {
  SourceBonus,
  SourceCompetition,
  SourceConvertedTable,
  SourceFormula,
  SourceGradeScoreTable,
  SourceResultScore,
  SourceUnit,
} from "../../libs/jeongsi/source-types.ts";
import type {
  AreaSelectionRule,
  BonusPolicy,
  ConversionFormula,
  EnglishPolicy,
  GradeScoreTable,
  HistoryPolicy,
  JeongsiAdmissionPlan,
  JeongsiResultEntry,
  MathElective,
  ResultCut,
  ResultYear,
  ScoreArea,
  ScoreMetric,
  SelectionRankBasis,
  SubjectRestriction,
  SuneungGrade,
  SuneungScore,
} from "../../libs/jeongsi/types.ts";

const DATA_DIR = path.join(process.cwd(), "libs", "jeongsi", "data");
const SOURCE_DIR = path.join(DATA_DIR, "source");

const ADMISSION_YEAR = 2027;
const RESULT_YEARS: ResultYear[] = [2026, 2025, 2024];
const GRADES: SuneungGrade[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 일반전형 판정. 특별전형(농어촌·특성화고·기회균형 등)은 지원자격이
 * 있어야 해서 일반 학생 추천 후보가 될 수 없다.
 */
const GENERAL_TRACK_PATTERN = /일반|수능|정시/;
const SPECIAL_TRACK_PATTERN =
  /농|어촌|특성화|기초|차상위|저소득|기회|배려|재외|북한|서해|만학|성인|특수교육|장애|보훈|인재|지역|군사|실기|실적|특기|다문화|독립|직업|재직|선취업|평생|통합|위탁|국방|안보|계약|정원외|교과|외국인|특별|신학|성김대건|야간|교차|사범계|자율전공/;

/**
 * 표준점수 "전국 최고점" 추정치. 2027 최고점은 수능 이후에 정해진다.
 * 이 값으로 정규화하는 대학은 환산점수 절대값이 몇 % 어긋날 수 있어
 * 환산점수 입결 비교에 쓰지 않는다(confidence = "estimated").
 */
const ESTIMATED_STANDARD_MAX = { main: 140, inquiry: 72 };

/**
 * 전형 총점 중 수능 비율 하한(%). 서울대(80)·연세대(95)·중앙대(90) 같은
 * 주요 대학 일반전형이 교과 평가를 소폭 섞는다. 이 경우 수능만으로 계산한
 * 입결(백분위·수능 환산점수)만 비교하고, plan.suneungWeight 로 남긴다.
 */
const MIN_SUNEUNG_WEIGHT = 80;

/** 비율 합 허용 오차 */
const RATIO_SUM_TOLERANCE = 0.01;

/** 일관성 검증에서 이 이상 벗어나면 리포트에 경고로 남긴다 (%) */
const CONSISTENCY_WARN_RATIO = 8;

// ─── 제외 사유 ───

const REASON = {
  notRecruiting: "2027 미모집",
  groupUnknown: "모집군 가·나·다 아님",
  specialTrack: "특별전형(일반전형 아님)",
  suneungWeight: "수능 비율 80% 미만",
  formulaMissing: "2027 반영방법 없음",
  areaRule: "상위 영역 선택 규칙 미지원(한국사·과목 단위·중첩 선택 등)",
  metric: "활용지표 미지원(등급점수·미반영)",
  totalScore: "수능 환산 만점 미기재",
  baseConstant: "기본점수 상수 포함(엔진 미지원)",
  rankText: "산출식에 순위·가중치 규칙",
  commonDenominator: "공통 분모형 산출식(엔진 미지원)",
  denominator: "정규화 분모를 산출식에서 확정할 수 없음",
  ratioSum: "반영비율 합 100 아님(가중치형)",
  englishTable: "영어 환산표 없음·미확정",
  englishScale: "영어 환산표 스케일과 산출식 불일치",
  englishMode: "영어 반영방식 미지원",
  historyMode: "한국사 반영방식 미지원",
  inquiryCombine: "탐구 반영방식 미지원",
  convertedTable: "탐구 변환표준점수표 없음·불완전",
  convertedTableSplitMax:
    "사탐·과탐 변표 최고점이 달라 환산 분모를 원문으로 정할 수 없음",
  bonus: "가산점 유형 미지원",
  estimatedMax: "원문에 없는 최고점·만점이 필요한 환산식",
  mathRestriction: "수학 지정과목 해석 불가",
  inquiryRestriction: "탐구 지정 원문 확인 필요",
  quota: "2027 모집인원 미공개·0명",
  category: "표준 카테고리 매칭 실패",
  noResults: "공개 입결 없음(근거 없는 대학은 노출하지 않음)",
} as const;

type ReasonText = (typeof REASON)[keyof typeof REASON];

type Outcome<T> = { ok: true; value: T } | { ok: false; reason: ReasonText };

const ok = <T>(value: T): Outcome<T> => ({ ok: true, value });
const fail = <T>(reason: ReasonText): Outcome<T> => ({ ok: false, reason });

// ─── 원본 읽기 ───

const readSource = <T>(name: string): T[] =>
  JSON.parse(
    readFileSync(path.join(SOURCE_DIR, `${name}.json`), "utf-8")
  ) as T[];

const groupBy = <T>(
  entries: T[],
  keyOf: (entry: T) => string
): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(entry);
      continue;
    }
    map.set(key, [entry]);
  }
  return map;
};

const units = readSource<SourceUnit>("units");
const formulaById = new Map(
  readSource<SourceFormula>("formulas").map((entry) => [entry.id, entry])
);
const englishTableById = new Map(
  readSource<SourceGradeScoreTable>("english-tables").map((entry) => [
    entry.id,
    entry,
  ])
);
const historyTableById = new Map(
  readSource<SourceGradeScoreTable>("history-tables").map((entry) => [
    entry.id,
    entry,
  ])
);
const convertedTableById = new Map(
  readSource<SourceConvertedTable>("converted-standard-tables").map((entry) => [
    entry.id,
    entry,
  ])
);
const bonusesByFormula = groupBy(
  readSource<SourceBonus>("bonuses"),
  (entry) => entry.formulaId
);
const competitionsByUnit = groupBy(
  readSource<SourceCompetition>("competitions"),
  (entry) => `${entry.unitId}|${entry.year}`
);
const resultScoresByUnit = groupBy(
  readSource<SourceResultScore>("result-scores"),
  (entry) => `${entry.unitId}|${entry.year}`
);

// ─── 값 헬퍼 ───

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const nearlyEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= RATIO_SUM_TOLERANCE * Math.max(1, Math.abs(b));

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

/** 원본 등급표 → 9칸이 모두 숫자인 GradeScoreTable */
const toGradeTable = (
  table: SourceGradeScoreTable | undefined,
  transform: (value: number) => number = (value) => value
): GradeScoreTable | null => {
  if (!table) {
    return null;
  }
  const result = {} as GradeScoreTable;
  for (const grade of GRADES) {
    const value = toNumber(table.scoreByGrade[String(grade)]);
    if (value === null) {
      return null;
    }
    result[grade] = round3(transform(value));
  }
  return result;
};

const ZERO_TABLE = Object.fromEntries(
  GRADES.map((grade) => [grade, 0])
) as GradeScoreTable;

// ─── 환산식 변환 ───

const METRIC_BY_LABEL: Record<string, ScoreMetric> = {
  표준점수: "standard",
  백분위: "percentile",
  변환표준점수: "convertedStandard",
};

/** 정규화 분모 체계. 산출식 원문에서 판정한다 */
type DenominatorFamily = "percentile" | "fixed200" | "highest" | "weighted";

const BASE_CONSTANT_PATTERN =
  /기본\s*점수(?!\s*없음)|[{[(=]\s*\d{2,4}\s*\+|^\s*\d{2,4}\s*\+|\d+%\s*\+\s*\d+%|[×x]\s*\d+(?:\.\d+)?\s*\+\s*\d{2,4}(?![\d.]|\s*[×x%])/;
const RANK_TEXT_PATTERN = /정렬|순위별|가중치/;
const COMMON_DENOMINATOR_PATTERN = /Σ\s*\(?\s*영역\s*최고/;
const FIXED_200_PATTERN = /[÷/]\s*200(?![\d,])|200점\s*기준/;
/** "(최고 800점 기준)" 같은 만점 표기와 구분한다 */
const HIGHEST_PATTERN = /최고\s*(표준|표점|변표|변환|점)/;

/** "표준점수×비율×5" — 만점 1000 이면 ÷200 과 같다 (중앙대) */
const RATIO_MULTIPLIER_PATTERN = /×\s*비율\s*×\s*(\d+(?:\.\d+)?)/;

const detectFamily = (
  formula: SourceFormula,
  metrics: { korean: ScoreMetric; math: ScoreMetric; inquiry: ScoreMetric },
  totalScore: number
): DenominatorFamily | null => {
  const allPercentile = Object.values(metrics).every(
    (metric) => metric === "percentile"
  );
  if (allPercentile) {
    return "percentile";
  }
  const text = formula.formulaText ?? "";
  if (FIXED_200_PATTERN.test(text)) {
    return "fixed200";
  }
  const multiplier = Number(text.match(RATIO_MULTIPLIER_PATTERN)?.[1]);
  if (multiplier > 0 && nearlyEqual(multiplier * 200, totalScore)) {
    return "fixed200";
  }
  if (HIGHEST_PATTERN.test(text)) {
    return "highest";
  }
  return null;
};

/** 엔진 환산식 + 해석 메타 */
interface ConvertedFormula {
  formula: ConversionFormula;
  restrictions?: SubjectRestriction;
  family: DenominatorFamily;
  /**
   * exact: 정규화 분모가 확정값(백분위 100, ÷200)이라 환산점수 절대값을
   *        대학 산출식과 같게 재현한다.
   * estimated: 전국 최고점 추정치를 썼다. 환산점수 입결 비교에 쓰지 않는다.
   */
  confidence: "exact" | "estimated";
  /** 가중합 산출식 대학의 공시 가중치 표기 (plan.statedRatios) */
  statedRatios?: string;
  /** formula.ratios 를 원문에 없는 최고점 추정치로 역산했다 (plan.areaSharesEstimated) */
  sharesEstimated?: boolean;
}

/** 영역 지표 1점이 환산 총점에 기여하는 점수 */
const pointValue = (
  ratio: number,
  totalScore: number,
  baseMax: number
): number => ((ratio / 100) * totalScore) / baseMax;

const resolveBaseMax = (
  metric: ScoreMetric,
  family: DenominatorFamily,
  kind: "main" | "inquiry",
  tableMax: number | null
): number => {
  if (metric === "percentile") {
    return 100;
  }
  if (family === "fixed200") {
    // 탐구는 "2과목 합 ÷ 200" 또는 "평균 ÷ 100" 이고 둘은 같은 값이다.
    // 과목당 만점이 70 안팎이라 평균 ÷ 200 으로는 배점의 35% 밖에 못
    // 채운다. 원본에 '평균'으로 적힌 건국대도 입결 역산(백분위 85 →
    // 666.5 vs 공시 666.51)으로 합 ÷ 200 임을 확인했다.
    return kind === "inquiry" ? 100 : 200;
  }
  if (metric === "convertedStandard" && tableMax !== null) {
    return tableMax;
  }
  return kind === "main"
    ? ESTIMATED_STANDARD_MAX.main
    : ESTIMATED_STANDARD_MAX.inquiry;
};

/**
 * 변표의 열. 사탐·과탐 열이 같으면 하나(common)만, 다르면 두 열을 모두 싣는다.
 * 학생이 실제 응시한 과목의 열을 엔진이 고른다. 모집단위 계열(인문·자연)로
 * 한 열을 고르면 사탐 응시자에게 과탐 열 점수를 줄 수 있다(실측: 전북대).
 * 한 열이 원문에 "해당없음"이면 그 열은 null 이다 — 그 과목 응시자는 이 표로
 * 계산할 수 없다(값을 만들지 않는다).
 */
interface ConvertedColumns {
  common?: Record<number, number>;
  science?: Record<number, number> | null;
  social?: Record<number, number> | null;
}

const toColumn = (
  values: Map<number, number | null>
): Record<number, number> | null => {
  const result: Record<number, number> = {};
  for (let percentile = 0; percentile <= 100; percentile += 1) {
    const value = values.get(percentile);
    if (value === undefined || value === null) {
      return null;
    }
    result[percentile] = value;
  }
  return result;
};

const resolveConvertedTable = (
  formula: SourceFormula
): Outcome<ConvertedColumns> => {
  const table = convertedTableById.get(formula.inquiry.convertedTableId ?? "");
  if (!table) {
    return fail(REASON.convertedTable);
  }
  const social = new Map<number, number | null>();
  const science = new Map<number, number | null>();
  for (const row of table.rows) {
    social.set(row.percentile, toNumber(row.social));
    science.set(row.percentile, toNumber(row.science));
  }

  const sameColumns = table.rows.every(
    (row) => toNumber(row.social) === toNumber(row.science)
  );
  if (sameColumns) {
    const common = toColumn(science);
    return common ? ok({ common }) : fail(REASON.convertedTable);
  }
  const scienceColumn = toColumn(science);
  const socialColumn = toColumn(social);
  if (!scienceColumn && !socialColumn) {
    return fail(REASON.convertedTable);
  }
  return ok({ science: scienceColumn, social: socialColumn });
};

/** 열마다 최고점. 열이 없으면 넣지 않는다 */
const columnMaxima = (columns: ConvertedColumns): number[] =>
  [columns.common, columns.science, columns.social].flatMap((column) =>
    column ? [Math.max(...Object.values(column))] : []
  );

const MATH_ELECTIVE_PATTERNS: [MathElective, RegExp][] = [
  ["확률과통계", /확률과\s*통계|확통/],
  ["미적분", /미적분/],
  ["기하", /기하/],
];

const parseMathElectives = (text: string): MathElective[] =>
  MATH_ELECTIVE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(
    ([elective]) => elective
  );

const resolveRestrictions = (
  formula: SourceFormula,
  inquiryCount: 1 | 2
): Outcome<SubjectRestriction | undefined> => {
  const restrictions: SubjectRestriction = {};

  const mathText = formula.math.restriction ?? "없음";
  if (!/^없음|제한 없음|지정 없음/.test(mathText)) {
    const electives = parseMathElectives(mathText);
    if (electives.length === 0) {
      return fail(REASON.mathRestriction);
    }
    if (electives.length < MATH_ELECTIVE_PATTERNS.length) {
      restrictions.math = electives;
    }
  }

  const requirement = formula.inquiry.requirement ?? "무관";
  const note = formula.inquiry.restrictionNote ?? "";
  if (requirement === "과탐 필수") {
    restrictions.inquiry = inquiryCount === 2 ? "과탐필수" : "과탐1과목이상";
  } else if (requirement === "기타(제한 칸 참조)") {
    // "사탐·과탐 중 2과목" 처럼 계열 제한이 없는 원문만 받는다.
    if (!FREE_INQUIRY_NOTE_PATTERN.test(note) || /필수/.test(note)) {
      return fail(REASON.inquiryRestriction);
    }
  } else if (requirement !== "무관") {
    return fail(REASON.inquiryRestriction);
  }

  return ok(Object.keys(restrictions).length > 0 ? restrictions : undefined);
};

const FREE_INQUIRY_NOTE_PATTERN = /사탐·과탐 중|사회\/과학|사회·과학/;

/** 과탐 전체에 주는 가산 */
const SCIENCE_BONUS_TARGETS = new Set(["과학탐구(전체)", "과학탐구"]);
/** 과탐 2과목을 모두 응시해야 주는 가산 */
const SCIENCE_PAIR_BONUS_TARGET =
  /^과학탐구\s*\(?2(과목|개 과목)\)?(\s*응시)?$/;
/** 과학Ⅰ·과학Ⅱ 를 따로 적은 행. 두 행의 규칙이 같으면 과탐 전체 가산이다 */
const SCIENCE_LEVEL_BONUS_TARGET = /^과학(Ⅰ|Ⅱ)\(물·화·생·지\)$/;

const isSupportedBonusCondition = (condition: string): boolean => {
  if (condition.startsWith("없음")) {
    return true;
  }
  return (
    /응시|선택|반영 시/.test(condition) &&
    !/특성화|상위|자연계|합산|1과목/.test(condition)
  );
};

/** 일반전형과 무관한 제외 조건. 특성화고 특별전형만 빼는 문구다 */
const VOCATIONAL_ONLY_EXCLUSION =
  /특성화고(?:교졸업자)?(?:\s*특별)?(?:\s*전형)?\s*제외/;
/** "자연계열 지원자 과탐 응시"처럼 자연계 모집단위 응시자에게만 붙는 조건 */
const SCIENCE_TRACK_APPLICANT =
  /^자연계열?\s*지원자(?:가|의|중)?\s*(?:과탐|과학탐구|미적분 또는 기하)\s*응시(?:자|\s*시)?$/;
/** "미래산업약학전공 제외"처럼 특정 모집단위만 빼는 조건 */
const UNIT_EXCLUSION = /^(\S+?(?:전공|학과|학부))\s*제외$/;

type BonusConditionResult = "apply" | "skip" | "unsupported";

/**
 * 가산 조건이 이 모집단위에 붙는지. 원천 데이터는 그대로 두고 조건 문구를
 * 읽기만 한다. 뜻이 분명한 조건만 받아들이고, 나머지는 지원하지 않는다
 * (틀린 환산식보다 빠진 모집단위가 낫다).
 *
 * 이 조건들을 받지 않으면 같은 학과의 (자연) 모집단위만 빠지고 (인문)만
 * 남아, 자연계 학생에게 (인문) 모집단위가 추천됐다(경희대 한의예과 등).
 */
const resolveBonusCondition = (
  condition: string,
  unit: { track?: string; department?: string }
): BonusConditionResult => {
  if (isSupportedBonusCondition(condition)) {
    return "apply";
  }
  if (/상위|합산|1과목|2과목/.test(condition)) {
    return "unsupported";
  }
  if (VOCATIONAL_ONLY_EXCLUSION.test(condition)) {
    return "apply";
  }
  if (SCIENCE_TRACK_APPLICANT.test(condition)) {
    if (!unit.track) return "unsupported";
    return unit.track === "자연" || unit.track === "의약" ? "apply" : "skip";
  }
  const excluded = condition.match(UNIT_EXCLUSION)?.[1];
  if (excluded) {
    if (!unit.department) return "unsupported";
    return unit.department.includes(excluded) ? "skip" : "apply";
  }
  return "unsupported";
};

/** 원천 데이터에 같은 가산 행이 두 번 들어 있으면 한 번만 읽는다 */
const bonusRowKey = (row: SourceBonus): string =>
  JSON.stringify([
    row.area,
    row.targetSubjects,
    row.value,
    row.unit,
    row.scope,
    row.appliesTo,
    row.condition,
  ]);

const requiresTwoSciences = (row: SourceBonus): boolean =>
  SCIENCE_PAIR_BONUS_TARGET.test(row.targetSubjects ?? "") ||
  /2과목|2개 과목/.test(row.condition ?? "");

/**
 * 가산점 변환. 엔진은 percent 를 영역 환산점수에 곱하고 point 를 총점에
 * 더한다. 대학이 "취득 점수에 +n점" 으로 정했으면 총점 기여분으로 바꾼다.
 */
const resolveBonus = (
  formula: SourceFormula,
  base: Pick<
    ConversionFormula,
    "ratios" | "totalScore" | "baseMax" | "inquiryCount"
  >,
  /** 상위 영역 선택 대상. 비율이 학생마다 달라 지표당 점수가 고정되지 않는다 */
  selectedAreas: ScoreArea[] = [],
  /** 가산 조건이 모집단위에 붙는지 판단할 때 쓴다 */
  unit: { track?: string; department?: string } = {}
): Outcome<BonusPolicy | undefined> => {
  const seen = new Set<string>();
  const candidates = (bonusesByFormula.get(formula.id) ?? []).filter((row) => {
    // 직업탐구는 엔진 입력에 없는 과목이라 가산이 적용될 학생이 없다.
    if ((row.targetSubjects ?? "").includes("직업")) return false;
    const key = bonusRowKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const rows: SourceBonus[] = [];
  for (const row of candidates) {
    const applies = resolveBonusCondition(row.condition ?? "없음", unit);
    if (applies === "unsupported") {
      return fail(REASON.bonus);
    }
    if (applies === "apply") {
      rows.push(row);
    }
  }
  if (rows.length === 0) {
    return ok(undefined);
  }

  const bonus: BonusPolicy = {};
  const levelRules = new Set<string>();
  for (const row of rows) {
    const value = toNumber(row.value);
    const { unit } = row;
    if (value === null || (unit !== "%" && unit !== "점")) {
      return fail(REASON.bonus);
    }
    const onRawScore = (row.appliesTo ?? "").startsWith("취득");
    const area = row.area === "수학" ? "math" : "inquiry";
    if (onRawScore && selectedAreas.includes(area)) {
      return fail(REASON.bonus);
    }

    if (row.area === "수학") {
      const electives = parseMathElectives(row.targetSubjects ?? "");
      if (electives.length === 0) {
        return fail(REASON.bonus);
      }
      const points = onRawScore
        ? value *
          pointValue(base.ratios.math, base.totalScore, base.baseMax.math)
        : value;
      const rule =
        unit === "%"
          ? { type: "percent" as const, value }
          : { type: "point" as const, value: round3(points) };
      bonus.mathElective = bonus.mathElective ?? {};
      for (const elective of electives) {
        if (bonus.mathElective[elective]) {
          return fail(REASON.bonus);
        }
        bonus.mathElective[elective] = rule;
      }
      continue;
    }

    const target = row.targetSubjects ?? "";
    const isLevelRow = SCIENCE_LEVEL_BONUS_TARGET.test(target);
    const isScienceRow =
      SCIENCE_BONUS_TARGETS.has(target) ||
      SCIENCE_PAIR_BONUS_TARGET.test(target) ||
      isLevelRow;
    if (row.area !== "탐구" || !isScienceRow) {
      return fail(REASON.bonus);
    }

    const appliesTo = row.scope === "응시 과목마다" ? "each" : "total";
    // 과목 하나의 지표 +1 은 영역 평균을 1/반영과목수 만큼 올린다.
    const perSubject =
      pointValue(base.ratios.inquiry, base.totalScore, base.baseMax.inquiry) /
      base.inquiryCount;
    const points = onRawScore ? value * perSubject : value;
    const rule =
      unit === "%"
        ? { type: "percent" as const, value, appliesTo }
        : { type: "point" as const, value: round3(points), appliesTo };
    const scienceRule = requiresTwoSciences(row)
      ? { ...rule, minCount: 2 as const }
      : rule;

    if (isLevelRow) {
      if (bonus.scienceInquiry && levelRules.size === 0) {
        return fail(REASON.bonus);
      }
      levelRules.add(JSON.stringify(scienceRule));
      if (levelRules.size > 1) {
        return fail(REASON.bonus);
      }
    } else if (bonus.scienceInquiry) {
      return fail(REASON.bonus);
    }
    bonus.scienceInquiry = scienceRule;
  }

  // 과학Ⅰ·Ⅱ 를 나눠 적었으면 두 행이 모두 있어야 과탐 전체 가산이다.
  const levelTargets = rows.filter((row) =>
    SCIENCE_LEVEL_BONUS_TARGET.test(row.targetSubjects ?? "")
  );
  if (levelTargets.length === 1) {
    return fail(REASON.bonus);
  }

  return ok(Object.keys(bonus).length > 0 ? bonus : undefined);
};

/**
 * 배율 적용 전 가감은 백분위 체계(Σ비율×백분위 → ×영역 배점/100)에서만
 * 환산 가능하다. areaBase 는 국·수·탐(·영) 배점의 합계 기준점이다.
 */
const preMultiplierScale = (
  formula: SourceFormula,
  family: DenominatorFamily,
  areaBase: number
): number | null =>
  FORMULA_OVERRIDES[formula.universityCode]?.preScale ??
  (family === "percentile" ? areaBase / 100 : null);

/** 영어 등급표 최댓값 (배율 적용 후 점수) */
const englishTableMax = (formula: SourceFormula, scale = 1): number | null => {
  const table = toGradeTable(
    englishTableById.get(formula.english.tableId ?? "")
  );
  if (!table) {
    return null;
  }
  return (
    Math.max(...Object.values(table).map((value) => Math.abs(value))) * scale
  );
};

const resolveEnglish = (
  formula: SourceFormula,
  family: DenominatorFamily,
  totalScore: number,
  englishRatio: number,
  areaBase: number
): Outcome<EnglishPolicy> => {
  const source = englishTableById.get(formula.english.tableId ?? "");
  const { mode } = formula.english;

  if (mode === "비율포함") {
    const table = toGradeTable(source);
    if (!table) {
      return fail(REASON.englishTable);
    }
    // 엔진은 표 최댓값으로 자기정규화한다. 대학 분모가 그 최댓값과
    // 같아야(100·200·배점 그대로) 같은 점수가 나온다.
    const max = Math.max(...Object.values(table));
    const allowed =
      family === "percentile"
        ? [100, (englishRatio / 100) * totalScore]
        : [100, 200, (englishRatio / 100) * totalScore];
    if (!allowed.some((value) => nearlyEqual(max, value))) {
      return fail(REASON.englishScale);
    }
    return ok({ type: "ratioIncluded", scoreByGrade: table });
  }

  if (mode !== "가산" && mode !== "감산") {
    return fail(REASON.englishMode);
  }

  let scale = 1;
  if (formula.english.applyPosition === "배율 적용 전 가감") {
    const preScale = preMultiplierScale(formula, family, areaBase);
    if (preScale === null) {
      return fail(REASON.englishMode);
    }
    scale = preScale;
  }

  if (mode === "가산") {
    const table = toGradeTable(source, (value) => value * scale);
    return table
      ? ok({ type: "add", scoreByGrade: table })
      : fail(REASON.englishTable);
  }
  // 감산표는 음수로 기재되어 있다.
  const table = toGradeTable(source, (value) => Math.abs(value) * scale);
  return table
    ? ok({ type: "subtract", penaltyByGrade: table })
    : fail(REASON.englishTable);
};

const resolveHistory = (
  formula: SourceFormula,
  family: DenominatorFamily,
  areaBase: number
): Outcome<HistoryPolicy> => {
  const { mode, applyPosition } = formula.history;
  if (mode === "응시만 필수" || mode === "미반영") {
    return ok({ type: "add", scoreByGrade: ZERO_TABLE });
  }
  if (mode !== "가산" && mode !== "감산") {
    return fail(REASON.historyMode);
  }

  let scale = 1;
  if (applyPosition === "배율 적용 전 가감") {
    const preScale = preMultiplierScale(formula, family, areaBase);
    if (preScale === null) {
      return fail(REASON.historyMode);
    }
    scale = preScale;
  } else if (applyPosition !== "배율 적용 후 가감") {
    return fail(REASON.historyMode);
  }

  const source = historyTableById.get(formula.history.tableId ?? "");
  if (mode === "가산") {
    const table = toGradeTable(source, (value) => value * scale);
    return table
      ? ok({ type: "add", scoreByGrade: table })
      : fail(REASON.historyMode);
  }
  const table = toGradeTable(source, (value) => Math.abs(value) * scale);
  return table
    ? ok({ type: "subtract", penaltyByGrade: table })
    : fail(REASON.historyMode);
};

// ─── 배점 체계 ───
//
// 엔진 환산식은 영역마다 (지표 / baseMax) × (ratio / 100) × totalScore 다.
// 대학 산출식이 영역 지표 1점당 c 점을 주는 선형식이면, ratio·baseMax 를
// 골라 c 를 정확히 재현할 수 있다. 배점 체계는 두 가지다.
//
// - 비율형: 반영비율(%) 합이 100(영어 가산형이면 100 − 영어 배점)이고
//   정규화 분모(백분위 100·÷200·전국 최고점)가 정해진 대학
// - 가중치형: "국 표준×1.5 + 수 표준 + …" 처럼 원점수 가중합에 배율을
//   곱하는 대학. 배율은 산출식 원문에서 읽는다(explicitScaleOf).

type AreaWeights = Record<"korean" | "math" | "english" | "inquiry", number>;

interface FormulaOverride {
  /** 원본에 수능 환산 만점이 비어 있을 때의 값 */
  totalScore?: number;
  /** 산출식 원문으로 판정이 안 되는 정규화 분모 체계 */
  family?: DenominatorFamily;
  /** 가중치형 배율 (원점수 가중합 × scale) */
  scale?: number;
  /** 배율 적용 전 가감의 배율. 배율 전 합계가 100점 기준이 아닌 대학 */
  preScale?: number;
}

/**
 * 산출식 원문만으로는 해석되지 않아 대학 공식 계산예시로 확정한 값.
 * 대학코드 단위로 적용한다. 항목을 늘릴 때는 근거를 함께 적는다.
 */
const FORMULA_OVERRIDES: Record<string, FormulaOverride> = {
  // 경희대: [Y÷2×(수능반영총점÷100)], Y = Σ 표준점수×비율.
  // 공식 예시 "국128·수136·탐 변표 65.45+63.03 → 390.504"(인문)에서
  // 수능반영총점 = 600, 즉 표준점수 ÷ 200 × 비율 × 600 이다.
  KHU: { totalScore: 600, family: "fixed200" },
  // 서울대: 국어 + 수학×1.2 + 탐구 과목별 합×0.8 − 감점. 배율 없음.
  // 수능 환산 만점이 공시되지 않아 추정 최고점으로 만점을 산출한다.
  SNU: { scale: 1 },
  // 서강대: 국·수 표준점수 중 높은 영역×1.3 + 낮은 영역×1.1 + 탐구 변표
  // 2과목 합×0.6 + 영어·한국사 가산. 배율 없음, 만점 미공시.
  // 공식 예시 "국128·수135·탐 64.3+67.4·영2(99.5)·한3(10) → 504.82" 재현.
  SGU: { scale: 1 },
  // 경일대: 영역점수 = 백분위 × 비율 × 4 (400점 기준) 합 + 한국사 → × 0.9.
  // 배율 전 합계가 400점 기준이라 한국사 가산 배율은 3.6 이 아니라 0.9.
  // 공식 예시 "간호 297.00 × 0.9 = 267.30", "인문 309.97 × 0.9 = 278.97".
  KIU: { preScale: 0.9 },
};

/** 가중치형 배율: "× 1,000/800", "총점(800) × 반영점수/800", "합계 560점 … ×1,000" */
const explicitScaleOf = (text: string): number | null => {
  const ratio = text.match(/×\s*([\d,]+)\s*\/\s*([\d,]+)/);
  if (ratio && /표준\s*×\s*1\.\d|국 표준 \+|국 표준×/.test(text)) {
    return (
      Number(ratio[1].replace(",", "")) / Number(ratio[2].replace(",", ""))
    );
  }
  const yonsei = text.match(/총점\((\d+)\)\s*×\s*반영점수\/(\d+)/);
  if (yonsei && yonsei[1] === yonsei[2]) {
    return Number.NaN; // 반영점수(= 만점) ÷ 총점. 만점을 알아야 하므로 호출부에서 계산
  }
  const korea = text.match(/합계\s*(\d+)점/);
  if (korea && /×\s*1,?000/.test(text)) {
    return 1000 / Number(korea[1]);
  }
  return null;
};

interface Scaling {
  totalScore: number;
  ratios: AreaWeights;
  baseMax: ConversionFormula["baseMax"];
  family: DenominatorFamily;
  confidence: ConvertedFormula["confidence"];
  /** 배율 적용 전 가감의 기준 배점 (비율형 = 영역 배점 합) */
  areaBase: number;
  /** 가중치형은 영어를 원점수 가산으로 바꿔 넣는다 */
  englishPolicy?: EnglishPolicy;
  /** 영역 비중(ratios)을 원문에 없는 최고점 추정치로 역산했다 */
  sharesEstimated?: boolean;
}

type Metrics = ConversionFormula["metric"];

/** 영역 지표의 자연 최댓값. 가중치형 배점 비중 계산에 쓴다 */
const naturalMax = (
  metric: ScoreMetric,
  kind: "main" | "inquiry",
  tableMax: number | null
): number => {
  if (metric === "percentile") {
    return 100;
  }
  if (metric === "convertedStandard" && tableMax !== null) {
    return tableMax;
  }
  return kind === "main"
    ? ESTIMATED_STANDARD_MAX.main
    : ESTIMATED_STANDARD_MAX.inquiry;
};

const resolvePercentScaling = (
  formula: SourceFormula,
  metrics: Metrics,
  weights: AreaWeights,
  tableMax: number | null,
  override: FormulaOverride | undefined
): Outcome<Scaling> => {
  const totalScore =
    toNumber(formula.totalScore) ?? override?.totalScore ?? null;
  if (totalScore === null || totalScore <= 0) {
    return fail(REASON.totalScore);
  }
  const family = override?.family ?? detectFamily(formula, metrics, totalScore);
  if (!family) {
    return fail(REASON.denominator);
  }

  const areaSum =
    weights.korean + weights.math + weights.english + weights.inquiry;
  let ratios = weights;
  let areaBase = totalScore;
  if (!nearlyEqual(areaSum, 100)) {
    // 영어 가산형: 국·수·탐 배점 = (만점 − 영어 최대) 이고 비율은 그 안의
    // 비중이다. 예) 한양대 910 − 100 = 810 = 900 × 90%.
    const englishMax =
      formula.english.mode === "가산" &&
      formula.english.applyPosition === "배율 적용 후 가감"
        ? englishTableMax(formula)
        : null;
    if (englishMax === null || englishMax >= totalScore) {
      return fail(REASON.ratioSum);
    }
    areaBase = ((totalScore - englishMax) * 100) / areaSum;
    const factor = areaBase / totalScore;
    ratios = {
      korean: round3(weights.korean * factor),
      math: round3(weights.math * factor),
      english: round3((englishMax / totalScore) * 100),
      inquiry: round3(weights.inquiry * factor),
    };
  }

  const baseMax = {
    korean: resolveBaseMax(metrics.korean, family, "main", null),
    math: resolveBaseMax(metrics.math, family, "main", null),
    inquiry: resolveBaseMax(metrics.inquiry, family, "inquiry", tableMax),
  };
  const usesEstimate =
    family === "highest" &&
    Object.values(metrics).some((metric) => metric === "standard");

  return ok({
    totalScore,
    ratios,
    baseMax,
    family,
    confidence: usesEstimate ? "estimated" : "exact",
    areaBase,
  });
};

const resolveWeightedScaling = (
  formula: SourceFormula,
  metrics: Metrics,
  weights: AreaWeights,
  combine: SourceFormula["inquiry"]["combine"],
  tableMax: number | null,
  override: FormulaOverride | undefined
): Outcome<Scaling> => {
  const nominalTotal =
    toNumber(formula.totalScore) ?? override?.totalScore ?? null;
  let scale = override?.scale ?? explicitScaleOf(formula.formulaText ?? "");
  if (scale !== null && Number.isNaN(scale)) {
    const areaTotal = Number(
      (formula.formulaText ?? "").match(/총점\((\d+)\)/)?.[1] ?? Number.NaN
    );
    scale = nominalTotal !== null ? nominalTotal / areaTotal : null;
  }
  if (scale === null || !Number.isFinite(scale) || scale <= 0) {
    return fail(REASON.denominator);
  }
  if (formula.english.applyPosition === "배율 적용 전 가감") {
    return fail(REASON.englishMode);
  }

  // 영역 지표 1점당 환산점수. 탐구 "2과목 합" 은 엔진의 평균 기준으로 2배.
  const inquiryFactor = combine === "합" ? 2 : 1;
  const coefficient = {
    korean: (weights.korean / 100) * scale,
    math: (weights.math / 100) * scale,
    inquiry: (weights.inquiry / 100) * scale * inquiryFactor,
  };
  const maxima = {
    korean: naturalMax(metrics.korean, "main", null),
    math: naturalMax(metrics.math, "main", null),
    inquiry: naturalMax(metrics.inquiry, "inquiry", tableMax),
  };
  // 표준점수(또는 표가 없는 변환표준점수) 최댓값은 원문에 없어 추정치를 쓴다.
  // 환산점수는 지표 × 계수라 이 값과 무관하게 정확하지만, 영역 비중(%)은
  // 추정치에 따라 달라지므로 분석·해설에 쓰지 않게 표시한다.
  const usesEstimatedMax = (metric: ScoreMetric, table: number | null) =>
    metric === "standard" || (metric === "convertedStandard" && table === null);
  const sharesEstimated =
    (weights.korean > 0 && usesEstimatedMax(metrics.korean, null)) ||
    (weights.math > 0 && usesEstimatedMax(metrics.math, null)) ||
    (weights.inquiry > 0 && usesEstimatedMax(metrics.inquiry, tableMax));

  // 영어는 원점수 표에 같은 가중치·배율을 곱해 가산으로 넣는다.
  let englishPolicy: EnglishPolicy | undefined;
  let englishMax = 0;
  if (formula.english.mode === "비율포함") {
    const englishScale = (weights.english / 100) * scale;
    const table = toGradeTable(
      englishTableById.get(formula.english.tableId ?? ""),
      (value) => value * englishScale
    );
    if (!table) {
      return fail(REASON.englishTable);
    }
    englishPolicy = { type: "add", scoreByGrade: table };
    englishMax = Math.max(...Object.values(table));
  } else if (formula.english.mode === "가산") {
    // 배율 적용 후 가산(위에서 확인)은 등급표 점수를 그대로 더한다 (서강대).
    const table = toGradeTable(
      englishTableById.get(formula.english.tableId ?? "")
    );
    if (!table) {
      return fail(REASON.englishTable);
    }
    englishPolicy = { type: "add", scoreByGrade: table };
    englishMax = Math.max(...Object.values(table));
  } else if (formula.english.mode !== "감산") {
    return fail(REASON.englishMode);
  }

  const areaPoints = {
    korean: coefficient.korean * maxima.korean,
    math: coefficient.math * maxima.math,
    inquiry: coefficient.inquiry * maxima.inquiry,
  };
  const pointSum =
    areaPoints.korean + areaPoints.math + areaPoints.inquiry + englishMax;
  if (pointSum <= 0) {
    return fail(REASON.denominator);
  }
  const totalScore = nominalTotal ?? Math.round(pointSum);

  const ratios: AreaWeights = {
    korean: round3((areaPoints.korean / pointSum) * 100),
    math: round3((areaPoints.math / pointSum) * 100),
    english: round3((englishMax / pointSum) * 100),
    inquiry: round3((areaPoints.inquiry / pointSum) * 100),
  };
  // (지표 / baseMax) × ratio% × 만점 = 지표 × coefficient 가 되도록 맞춘다.
  const baseMaxOf = (area: "korean" | "math" | "inquiry"): number =>
    coefficient[area] > 0
      ? ((ratios[area] / 100) * totalScore) / coefficient[area]
      : maxima[area];

  return ok({
    totalScore,
    ratios,
    baseMax: {
      korean: baseMaxOf("korean"),
      math: baseMaxOf("math"),
      inquiry: baseMaxOf("inquiry"),
    },
    family: "weighted",
    confidence: nominalTotal === null ? "estimated" : "exact",
    areaBase: totalScore,
    englishPolicy,
    ...(sharesEstimated ? { sharesEstimated: true } : {}),
  });
};

// ─── 상위 영역 선택 ───
//
// "국·수·영·탐 중 상위 N개 영역에 순위별 비율" 을 AreaSelectionRule 로
// 옮긴다. 원본 selection 칸(targets·count·rankRatios·rankBasis)을 쓰고,
// 엔진이 정확히 재현하지 못하는 변형은 규칙 원문으로 걸러 제외한다.

const SELECTION_AREA_RULES = new Set([
  "상위 영역 선택",
  "국·수 순위별 가중",
  "혼합",
]);

/**
 * 엔진 규칙으로 옮길 수 없는 선택 반영 원문.
 * - 한국사·제2외국어/한문이 선택 후보 (엔진 영역이 아님)
 * - 탐구 과목 단위 선택 (탐구1·탐구2 를 각각 한 영역으로 셈)
 * - 가산점 포함 점수로 순위 결정
 * - 중첩 선택 ("1순위 제외 … 중", "나머지 … 중", 두 묶음 각각 순위)
 */
const UNSUPPORTED_SELECTION_PATTERN =
  /한국사|제2외국어|한문|가산|탐구\s*1\s*·|탐구1|탐구2|묶음|1순위\s*제외|나머지|필수\s*미반영|또는/;

const RANK_BASIS_BY_LABEL: Record<string, SelectionRankBasis> = {
  표준점수: "standard",
  백분위: "percentile",
  "영역 환산점수": "areaScore",
};

const SELECTION_AREAS: ScoreArea[] = ["korean", "math", "english", "inquiry"];

/**
 * 33.33 처럼 3등분을 반올림해 적은 비율을 100/3 로 되돌린다.
 * 정수·0.5 단위 비율은 그대로 남는다.
 * 산출식이 0.3333 을 그대로 곱하는 대학(금오공대·경일대 공식 예시)은
 * 되돌리지 않는다 — LITERAL_THIRD_PATTERN.
 */
const LITERAL_THIRD_PATTERN = /0\.333|33\.33/;

const snapThirds = (value: number): number => {
  const thirds = Math.round(value * 3);
  return Math.abs(value * 3 - thirds) <= 0.03 ? thirds / 3 : value;
};

/** 순위별 비율. 원본 칸은 3순위까지라 4순위는 원문 "35/30/20/15%" 에서 읽는다 */
const parseRankRatios = (
  selection: NonNullable<SourceFormula["selection"]>,
  count: number
): number[] | null => {
  const listed = [
    selection.rankRatios?.first,
    selection.rankRatios?.second,
    selection.rankRatios?.third,
  ]
    .map(toNumber)
    .filter((value): value is number => value !== null);
  if (listed.length >= count) {
    return listed.slice(0, count);
  }
  const spelled = (selection.rule ?? "").match(
    /(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))+\s*%/
  );
  if (!spelled) {
    return null;
  }
  const values = spelled[0]
    .replace("%", "")
    .split("/")
    .map((value) => Number(value.trim()));
  return values.length === count ? values : null;
};

const resolveSelection = (
  formula: SourceFormula,
  metrics: { korean: ScoreMetric; math: ScoreMetric; inquiry: ScoreMetric }
): Outcome<AreaSelectionRule | undefined> => {
  if (formula.areaRule === "전영역 필수") {
    return ok(undefined);
  }
  const { selection } = formula;
  if (!SELECTION_AREA_RULES.has(String(formula.areaRule)) || !selection) {
    return fail(REASON.areaRule);
  }
  if (UNSUPPORTED_SELECTION_PATTERN.test(selection.rule ?? "")) {
    return fail(REASON.areaRule);
  }

  const areas = SELECTION_AREAS.filter(
    (area) => selection.targets?.[area] === true
  );
  const count = toNumber(selection.count);
  const rankBasis = RANK_BASIS_BY_LABEL[String(selection.rankBasis)];
  if (
    areas.length < 2 ||
    count === null ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > areas.length ||
    !rankBasis
  ) {
    return fail(REASON.areaRule);
  }
  const listedRatios = parseRankRatios(selection, count);
  if (!listedRatios) {
    return fail(REASON.areaRule);
  }
  const rankRatios = LITERAL_THIRD_PATTERN.test(formula.formulaText ?? "")
    ? listedRatios
    : listedRatios.map(snapThirds);

  // 순위 비교값이 대상 영역끼리 같은 척도여야 한다.
  if (rankBasis === "standard") {
    const allStandard = areas.every(
      (area) => area !== "english" && metrics[area] === "standard"
    );
    if (!allStandard) {
      return fail(REASON.areaRule);
    }
  }
  if (areas.includes("english") && formula.english.mode !== "비율포함") {
    return fail(REASON.areaRule);
  }

  return ok({ areas, rankRatios, rankBasis });
};

/**
 * 원본 순위별 비율 → 엔진 비율 단위.
 * 배점 체계가 원본 비율을 엔진 비율로 바꾼 배수(영어 가산형 축소,
 * 가중치형 배점 비중)를 대상 영역에서 읽어 순위별 비율에 똑같이
 * 곱한다. 대상 영역마다 배수가 다르면(지표 만점이 다른 가중치형)
 * 순위에 따라 1점당 점수가 달라져 엔진 식으로 표현되지 않는다.
 */
const scaleSelection = (
  rule: AreaSelectionRule,
  weights: AreaWeights,
  ratios: AreaWeights,
  family: DenominatorFamily
): Outcome<AreaSelectionRule> => {
  const placed = rule.areas.filter((area) => weights[area] > 0);
  if (family === "weighted" && placed.length !== rule.areas.length) {
    return fail(REASON.areaRule);
  }
  const factors = placed.map((area) => ratios[area] / weights[area]);
  const [factor] = factors;
  if (
    factor === undefined ||
    factors.some((value) => !nearlyEqual(value, factor))
  ) {
    return fail(REASON.areaRule);
  }
  return ok({
    ...rule,
    rankRatios: rule.rankRatios.map((value) => value * factor),
  });
};

const convertFormula = (
  formula: SourceFormula,
  track: string | undefined,
  department?: string
): Outcome<ConvertedFormula> => {
  const korean = METRIC_BY_LABEL[String(formula.korean.metric)];
  const math = METRIC_BY_LABEL[String(formula.math.metric)];
  const inquiry = METRIC_BY_LABEL[String(formula.inquiry.metric)];
  if (
    !korean ||
    !math ||
    !inquiry ||
    korean === "convertedStandard" ||
    math === "convertedStandard"
  ) {
    return fail(REASON.metric);
  }

  const override = FORMULA_OVERRIDES[formula.universityCode];
  const text = formula.formulaText ?? "";
  if (BASE_CONSTANT_PATTERN.test(text)) {
    return fail(REASON.baseConstant);
  }
  const selection = resolveSelection(formula, { korean, math, inquiry });
  if (!selection.ok) {
    return fail(selection.reason);
  }
  // 선택 반영 대학의 순위·가중치 서술은 selection 이 옮긴다.
  if (!selection.value && RANK_TEXT_PATTERN.test(text)) {
    return fail(REASON.rankText);
  }
  if (COMMON_DENOMINATOR_PATTERN.test(text)) {
    return fail(REASON.commonDenominator);
  }

  const { combine } = formula.inquiry;
  let inquiryCount: 1 | 2;
  if (combine === "상위 1과목") {
    inquiryCount = 1;
  } else if (
    (combine === "합" || combine === "평균") &&
    formula.inquiry.count === 2
  ) {
    inquiryCount = 2;
  } else {
    return fail(REASON.inquiryCombine);
  }

  let convertedColumns: ConvertedColumns | undefined;
  if (inquiry === "convertedStandard") {
    const table = resolveConvertedTable(formula);
    if (!table.ok) {
      return fail(table.reason);
    }
    convertedColumns = table.value;
  }
  const maxima = convertedColumns ? columnMaxima(convertedColumns) : [];
  // 열마다 최고점이 다르면 "변표 최고점으로 나누는" 환산식의 분모가 응시 과목에
  // 따라 달라진다. 원문은 그중 무엇인지 말하지 않으므로 그런 환산식은 뺀다(아래).
  const splitMax = new Set(maxima).size > 1;
  const tableMax = maxima.length > 0 ? Math.max(...maxima) : null;

  const ratios: Record<ScoreArea, number | null> = {
    korean: toNumber(formula.korean.ratio),
    math: toNumber(formula.math.ratio),
    english:
      formula.english.mode === "비율포함" ? toNumber(formula.english.ratio) : 0,
    inquiry: toNumber(formula.inquiry.ratio),
  };
  // 선택 대상 영역은 원본 비율이 비어 있다. 순위별 비율을 대상 영역
  // 순서대로 채운 자리값을 넣는다(엔진이 학생 순위로 다시 배정한다).
  selection.value?.areas.forEach((area, index) => {
    ratios[area] = selection.value?.rankRatios[index] ?? 0;
  });
  if (Object.values(ratios).some((value) => value === null)) {
    return fail(REASON.ratioSum);
  }
  const snapsThirds =
    selection.value !== undefined && !LITERAL_THIRD_PATTERN.test(text);
  const weights = Object.fromEntries(
    Object.entries(ratios).map(([area, value]) => [
      area,
      snapsThirds ? snapThirds(value ?? 0) : value,
    ])
  ) as AreaWeights;
  const metrics = { korean, math, inquiry };

  const weightSum = Object.values(weights).reduce(
    (sum, value) => sum + value,
    0
  );
  const isWeighted =
    override?.scale !== undefined ||
    (!nearlyEqual(weightSum, 100) && explicitScaleOf(text) !== null);
  const scaling = isWeighted
    ? resolveWeightedScaling(
        formula,
        metrics,
        weights,
        combine,
        tableMax,
        override
      )
    : resolvePercentScaling(formula, metrics, weights, tableMax, override);
  if (!scaling.ok) {
    return fail(scaling.reason);
  }
  const { totalScore, baseMax, family, confidence, englishPolicy } =
    scaling.value;
  // 가중치형(지표 × 계수)과 ÷200 고정형은 변표 최고점을 분모로 쓰지 않는다.
  if (splitMax && family !== "weighted" && family !== "fixed200") {
    return fail(REASON.convertedTableSplitMax);
  }
  const ratioValues = scaling.value.ratios;

  const engineSelection = selection.value
    ? scaleSelection(selection.value, weights, ratioValues, family)
    : ok(undefined);
  if (!engineSelection.ok) {
    return fail(engineSelection.reason);
  }
  // 가중치형은 영역별 비율을 반올림한 뒤 baseMax 를 역산해 대상 영역끼리
  // 미세하게 어긋난다. 순위가 바뀌어도 1점당 점수가 같도록 맞춘다.
  if (engineSelection.value && family === "weighted") {
    const [first] = engineSelection.value.areas;
    if (first !== "english") {
      for (const area of engineSelection.value.areas) {
        if (area !== "english") {
          baseMax[area] = baseMax[first];
        }
      }
    }
  }

  const english = englishPolicy
    ? ok(englishPolicy)
    : resolveEnglish(
        formula,
        family,
        totalScore,
        ratioValues.english,
        scaling.value.areaBase
      );
  if (!english.ok) {
    return fail(english.reason);
  }
  const history = resolveHistory(formula, family, scaling.value.areaBase);
  if (!history.ok) {
    return fail(history.reason);
  }

  const base = { ratios: ratioValues, totalScore, baseMax, inquiryCount };
  const bonus = resolveBonus(formula, base, selection.value?.areas, {
    track,
    department,
  });
  if (!bonus.ok) {
    return fail(bonus.reason);
  }
  const restrictions = resolveRestrictions(formula, inquiryCount);
  if (!restrictions.ok) {
    return fail(restrictions.reason);
  }

  const result: ConversionFormula = {
    formulaVersion: 1,
    totalScore,
    ratios: ratioValues,
    metric: metrics,
    inquiryCount,
    ...(convertedColumns?.common
      ? { convertedStandardTable: convertedColumns.common }
      : {}),
    ...(convertedColumns && !convertedColumns.common
      ? {
          convertedStandardTableByTrack: {
            science: convertedColumns.science ?? null,
            social: convertedColumns.social ?? null,
          },
        }
      : {}),
    english: english.value,
    history: history.value,
    ...(bonus.value ? { bonus: bonus.value } : {}),
    baseMax,
    ...(engineSelection.value ? { selection: engineSelection.value } : {}),
  };

  // 가중합 대학의 formula.ratios 는 역산한 배점 비중이다. 해설·화면이
  // 대학 공시값처럼 인용하지 않도록 공시 가중치를 따로 남긴다.
  const statedRatios =
    family === "weighted" && !engineSelection.value
      ? formatStatedWeights(weights, combine)
      : undefined;

  return ok({
    formula: result,
    restrictions: restrictions.value,
    family,
    confidence,
    ...(statedRatios ? { statedRatios } : {}),
    // 가중치형은 열 최고점이 다르면 영역 비중(%)이 응시 과목에 따라 달라진다
    ...(scaling.value.sharesEstimated || (splitMax && family === "weighted")
      ? { sharesEstimated: true }
      : {}),
  });
};

/** 공시 가중치 표기. 예) "국100·수120·탐80(탐구 과목별 합)" */
const formatStatedWeights = (
  weights: AreaWeights,
  combine: SourceFormula["inquiry"]["combine"]
): string => {
  const parts = [
    `국${weights.korean}`,
    `수${weights.math}`,
    ...(weights.english > 0 ? [`영${weights.english}`] : []),
    `탐${weights.inquiry}`,
  ];
  const inquiryNote = combine === "합" ? "(탐구 과목별 합)" : "";
  return `${parts.join("·")}${inquiryNote}`;
};

// ─── 카테고리 ───

const DEPARTMENT_SUFFIX_VARIANTS = ["학과", "학부", "과", "전공", "계열", ""];

const stripDecorations = (department: string): string =>
  department
    .replace(/\s+/g, "")
    .replace(/[([［][^)\]］]*[)\]］]$/g, "")
    .replace(/[([［][^)\]］]*[)\]］]$/g, "");

const withSuffixVariants = (name: string): string[] => {
  const stem = name.replace(/(학과|학부|전공|계열|과)$/, "");
  return [
    name,
    ...DEPARTMENT_SUFFIX_VARIANTS.map((suffix) => `${stem}${suffix}`),
  ];
};

/**
 * 학과명 → 표준 카테고리. 맵에 없으면 표기 변형을 차례로 시도한다.
 * "정치행정학부 정치외교학" 처럼 학부 뒤에 전공이 붙으면 전공 쪽이
 * 더 구체적이므로 뒤 토큰부터 본다.
 */
const resolveCategory = (department: string): string | null => {
  const stripped = stripDecorations(
    department.replace(/[–-](인문|자연)계?$/, "")
  );
  const tokens = department
    .split(/\s+/)
    .map((token) => stripDecorations(token))
    .filter((token) => token.length >= 2)
    .reverse();
  const candidates = new Set<string>([
    department,
    department.replace(/\s+/g, ""),
    ...withSuffixVariants(stripped),
    ...tokens.flatMap(withSuffixVariants),
  ]);
  for (const candidate of candidates) {
    const category = DEPARTMENT_CATEGORY_MAP[candidate];
    if (category) {
      return category;
    }
  }
  return null;
};

// ─── 입결 ───

/** 같은 모집단위·학년도에 행이 여럿이면 계열 표기·전형명으로 하나를 고른다 */
const pickRow = <T extends { department?: string; admissionType?: string }>(
  rows: T[],
  unit: SourceUnit
): T | null => {
  if (rows.length === 1) {
    return rows[0];
  }
  const byTrack = rows.filter((row) =>
    (row.department ?? "").includes(unit.track ?? "-")
  );
  if (byTrack.length === 1) {
    return byTrack[0];
  }
  const byType = rows.filter((row) => row.admissionType === unit.admissionType);
  return byType.length === 1 ? byType[0] : null;
};

const isPercentileRow = (row: SourceResultScore): boolean => {
  if (row.scoreType !== "백분위 평균" || row.basisGroup !== "최종등록자") {
    return false;
  }
  const areas = row.areas ?? {};
  if (
    !(areas.korean === true && areas.math === true && areas.inquiry === true)
  ) {
    return false;
  }
  if (areas.english !== false) {
    return false;
  }
  // 엔진의 simpleAverage 는 탐구 2과목 평균이다. 상위 1과목 기준 입결과
  // 비교하면 1~3 백분위점(1σ 이상) 어긋난다.
  // 원문에 "2과목 평균"으로 적힌 입결만 쓴다. 탐구 처리가 "미공개"인 입결을
  // 2과목 평균으로 간주하지 않는다(원문에 없는 값 — 사용자 결정 2026-11-08).
  return row.inquiryHandling === "2과목 평균";
};

const cutOf = (
  value: unknown,
  metric: ResultCut["metric"],
  bonusIncluded?: boolean
): ResultCut | undefined => {
  const number = toNumber(value);
  if (number === null) {
    return undefined;
  }
  return bonusIncluded === undefined
    ? { metric, value: number }
    : { metric, value: number, bonusIncluded };
};

/** cut70 ≤ cut50 ≤ average 를 어기는 보조 컷은 버린다 */
const orderedCuts = (
  cuts: Pick<JeongsiResultEntry, "cut70" | "cut50" | "average">
) => {
  const result = { ...cuts };
  if (result.cut50 && result.cut70 && result.cut50.value < result.cut70.value) {
    delete result.cut50;
  }
  const floor = result.cut50 ?? result.cut70;
  if (result.average && floor && result.average.value < floor.value) {
    delete result.average;
  }
  return result;
};

/** 학년도별 반영방법이 2027 과 같은 환산식으로 변환되는지 */
const formulaForYear = (
  formulaId: string,
  year: number,
  track: string | undefined,
  department?: string
): ConversionFormula | null => {
  const yearId = formulaId.replace(`-${ADMISSION_YEAR}-`, `-${year}-`);
  const formula = formulaById.get(yearId);
  if (!formula) {
    return null;
  }
  const converted = convertFormula(formula, track, department);
  return converted.ok ? converted.value.formula : null;
};

const sameFormula = (
  a: ConversionFormula,
  b: ConversionFormula | null
): boolean => b !== null && JSON.stringify(a) === JSON.stringify(b);

interface ResultRow {
  year: ResultYear;
  row: SourceResultScore;
}

const collectResultRows = (
  unit: SourceUnit,
  converted: ConvertedFormula
): { metric: ResultCut["metric"] | null; rows: ResultRow[] } => {
  const percentileRows: ResultRow[] = [];
  const convertedRows: ResultRow[] = [];
  const allowConverted =
    converted.confidence === "exact" && !converted.formula.bonus;

  for (const year of RESULT_YEARS) {
    const rows = resultScoresByUnit.get(`${unit.unitId}|${year}`) ?? [];
    const percentile = pickRow(
      rows.filter((row) => isPercentileRow(row)),
      unit
    );
    if (percentile && toNumber(percentile.cut70) !== null) {
      percentileRows.push({ year, row: percentile });
    }
    if (!allowConverted) {
      continue;
    }
    const score = pickRow(
      rows.filter(
        (row) =>
          row.scoreType === "환산점수" &&
          row.basisGroup === "최종등록자" &&
          toNumber(row.scaleMax) === converted.formula.totalScore
      ),
      unit
    );
    if (
      score &&
      toNumber(score.cut70) !== null &&
      sameFormula(
        converted.formula,
        formulaForYear(unit.formulaId ?? "", year, unit.track, unit.department)
      )
    ) {
      convertedRows.push({ year, row: score });
    }
  }

  if (percentileRows.length > 0) {
    return { metric: "percentile", rows: percentileRows };
  }
  if (convertedRows.length > 0) {
    return { metric: "convertedScore", rows: convertedRows };
  }
  return { metric: null, rows: [] };
};

const quotaForYear = (unit: SourceUnit, year: number): number | null => {
  const competition = pickRow(
    competitionsByUnit.get(`${unit.unitId}|${year}`) ?? [],
    unit
  );
  const fromCompetition = toNumber(competition?.quota);
  if (fromCompetition !== null) {
    return fromCompetition;
  }
  const quota = unit.quotas.find((entry) => entry.year === year);
  return toNumber(quota?.finalQuota) ?? toNumber(quota?.initialQuota);
};

const buildResults = (
  unit: SourceUnit,
  plan: JeongsiAdmissionPlan,
  converted: ConvertedFormula
): JeongsiResultEntry[] => {
  const { metric, rows } = collectResultRows(unit, converted);
  if (!metric) {
    return [];
  }

  const entries: JeongsiResultEntry[] = [];
  for (const { year, row } of rows) {
    const quota = quotaForYear(unit, year);
    if (quota === null) {
      continue;
    }
    // 가산점 없는 환산식만 환산점수 입결을 쓰므로 가산 포함 여부가 무관하다.
    const bonusIncluded = metric === "convertedScore" ? true : undefined;
    const cut70 = cutOf(row.cut70, metric, bonusIncluded);
    if (!cut70) {
      continue;
    }
    const competition = pickRow(
      competitionsByUnit.get(`${unit.unitId}|${year}`) ?? [],
      unit
    );
    const competitionRate = toNumber(competition?.competitionRate);
    const additionalPassCount = toNumber(competition?.additionalPassCount);

    entries.push({
      planKey: plan.id,
      admissionYear: year,
      university: plan.university,
      department: plan.department,
      group: plan.group,
      quota,
      ...(competitionRate !== null ? { competitionRate } : {}),
      ...(additionalPassCount !== null && Number.isInteger(additionalPassCount)
        ? { additionalPassCount }
        : {}),
      ...orderedCuts({
        cut70,
        cut50: cutOf(row.cut50, metric, bonusIncluded),
        average: cutOf(row.average, metric, bonusIncluded),
      }),
    });
  }
  return entries;
};

// ─── 모집단위 ───

/**
 * 대학별 본교 캠퍼스 코드.
 * 캠퍼스명에 "본교" → "서울" 이 들어간 쪽을 우선하고, 없으면 모집단위가
 * 가장 많은 캠퍼스로 본다. 모집단위 수만 보면 상명대처럼 분교(천안)가
 * 더 큰 대학에서 서울캠퍼스가 분교로 잡힌다. 규칙으로 안 되는 대학은
 * MAIN_CAMPUS_OVERRIDES 에 둔다.
 */
const MAIN_CAMPUS_OVERRIDES: Record<string, string> = {
  단국대학교: "DKU", // 죽전캠퍼스가 본교
  경기대학교: "KGU", // 수원캠퍼스가 본교
};

const mainCampusCode = (() => {
  const campuses = new Map<
    string,
    Map<string, { campus: string; count: number }>
  >();
  for (const unit of units) {
    const byCode = campuses.get(unit.university) ?? new Map();
    const entry = byCode.get(unit.universityCode) ?? {
      campus: unit.campus ?? "",
      count: 0,
    };
    entry.count += 1;
    byCode.set(unit.universityCode, entry);
    campuses.set(unit.university, byCode);
  }
  const priority = (campus: string): number => {
    if (campus.includes("본교")) {
      return 2;
    }
    return campus.includes("서울") ? 1 : 0;
  };
  const result = new Map<string, string>(Object.entries(MAIN_CAMPUS_OVERRIDES));
  for (const [university, byCode] of campuses) {
    if (result.has(university)) {
      continue;
    }
    const [main] = [...byCode.entries()].sort(
      (a, b) =>
        priority(b[1].campus) - priority(a[1].campus) || b[1].count - a[1].count
    );
    result.set(university, main[0]);
  }
  return result;
})();

const isGeneralTrack = (admissionType: string | undefined): boolean =>
  GENERAL_TRACK_PATTERN.test(admissionType ?? "") &&
  !SPECIAL_TRACK_PATTERN.test(admissionType ?? "");

interface Candidate {
  unit: SourceUnit;
  plan: JeongsiAdmissionPlan;
  converted: ConvertedFormula;
}

const toCandidate = (unit: SourceUnit): Outcome<Candidate> => {
  if (unit.unitStatus === "2027 미모집") {
    return fail(REASON.notRecruiting);
  }
  const { group } = unit;
  if (group !== "가" && group !== "나" && group !== "다") {
    return fail(REASON.groupUnknown);
  }
  if (!isGeneralTrack(unit.admissionType)) {
    return fail(REASON.specialTrack);
  }
  const suneungWeight = toNumber(unit.selectionWeights?.suneung);
  if (suneungWeight === null || suneungWeight < MIN_SUNEUNG_WEIGHT) {
    return fail(REASON.suneungWeight);
  }
  const formula = formulaById.get(unit.formulaId ?? "");
  if (!formula) {
    return fail(REASON.formulaMissing);
  }
  const converted = convertFormula(formula, unit.track, unit.department);
  if (!converted.ok) {
    return fail(converted.reason);
  }
  // 원문 데이터만 쓴다. 전국 최고점·환산 만점이 원문에 없으면 그 값을
  // 추정해 환산점수를 만들지 않고 모집단위를 뺀다(사용자 결정 2026-11-04:
  // "원문 데이터는 없으면 진짜 없는 것").
  if (converted.value.confidence === "estimated") {
    return fail(REASON.estimatedMax);
  }
  const quota = toNumber(
    unit.quotas.find((entry) => entry.year === ADMISSION_YEAR)?.initialQuota
  );
  if (quota === null || quota <= 0 || !Number.isInteger(quota)) {
    return fail(REASON.quota);
  }
  const category = resolveCategory(unit.department);
  if (!category) {
    return fail(REASON.category);
  }

  const isMain = mainCampusCode.get(unit.university) === unit.universityCode;
  const campus = isMain ? undefined : unit.campus;
  const universityKey = campus
    ? `${unit.university}(${campus})`
    : unit.university;

  const plan: JeongsiAdmissionPlan = {
    id: `${universityKey}-${unit.department}-${group}`,
    admissionYear: ADMISSION_YEAR,
    university: unit.university,
    ...(campus ? { campus } : {}),
    department: unit.department,
    category,
    region: unit.region,
    group,
    quota,
    ...(suneungWeight < 100 ? { suneungWeight } : {}),
    ...(converted.value.statedRatios
      ? { statedRatios: converted.value.statedRatios }
      : {}),
    ...(converted.value.sharesEstimated
      ? { areaSharesEstimated: true as const }
      : {}),
    formula: converted.value.formula,
    ...(converted.value.restrictions
      ? { restrictions: converted.value.restrictions }
      : {}),
  };
  return ok({ unit, plan, converted: converted.value });
};

/** 같은 대학·학과·군에 일반전형이 둘 이상이면 전형명을 붙여 구분한다 */
const disambiguate = (candidates: Candidate[]): Candidate[] => {
  const byId = groupBy(candidates, (candidate) => candidate.plan.id);
  return candidates.map((candidate) => {
    if ((byId.get(candidate.plan.id) ?? []).length === 1) {
      return candidate;
    }
    const department = `${candidate.unit.department} (${candidate.unit.admissionType})`;
    const universityKey = candidate.plan.campus
      ? `${candidate.plan.university}(${candidate.plan.campus})`
      : candidate.plan.university;
    return {
      ...candidate,
      plan: {
        ...candidate.plan,
        department,
        id: `${universityKey}-${department}-${candidate.plan.group}`,
      },
    };
  });
};

// ─── 일관성 검증 ───
//
// 같은 학년도에 백분위 컷과 환산점수 컷이 모두 공시된 모집단위에서,
// 백분위 컷 수준의 가상 학생을 변환한 환산식에 넣어 환산점수 컷과
// 비교한다. 컷 학생의 영역별 편차가 있어 정확히 같지는 않지만,
// 정규화 분모·배율을 잘못 읽으면 수십 % 단위로 벌어지므로 해석 오류를
// 잡아낼 수 있다.

const standardAt = (percentile: number, kind: "main" | "inquiry"): number => {
  const top =
    kind === "main"
      ? ESTIMATED_STANDARD_MAX.main
      : ESTIMATED_STANDARD_MAX.inquiry;
  let score = top;
  for (let p = 100; p > percentile; p -= 1) {
    const slope = slopeAt(p - 1);
    score -= kind === "main" ? slope.main : slope.inquiry;
  }
  return score;
};

/**
 * 일관성 검증용 가상 학생의 영어 등급을 고르는 표(등급 구간 중앙 백분위).
 * 원문 값이 아니므로 서비스 데이터·엔진에는 쓰지 않고, 이 검증 보고에만 쓴다.
 */
/**
 * 일관성 검증용 가상 학생의 백분위 → 표준점수 기울기(구간 하한 이상).
 * 원문 값이 아니므로 서비스 데이터·엔진에는 쓰지 않고, 이 검증 보고에만 쓴다.
 */
const VALIDATION_SLOPES: {
  minPercentile: number;
  main: number;
  inquiry: number;
}[] = [
  { minPercentile: 99, main: 5.0, inquiry: 2.0 },
  { minPercentile: 98, main: 3.0, inquiry: 2.0 },
  { minPercentile: 95, main: 2.0, inquiry: 1.0 },
  { minPercentile: 94, main: 1.0, inquiry: 1.0 },
  { minPercentile: 92, main: 1.5, inquiry: 1.0 },
  { minPercentile: 90, main: 1.0, inquiry: 0.5 },
  { minPercentile: 85, main: 1.0, inquiry: 0.67 },
  { minPercentile: 80, main: 0.8, inquiry: 0.4 },
  { minPercentile: 60, main: 0.6, inquiry: 0.4 },
  { minPercentile: 0, main: 0.6, inquiry: 0.3 },
];

const slopeAt = (percentile: number) =>
  VALIDATION_SLOPES.find((band) => percentile >= band.minPercentile) ??
  VALIDATION_SLOPES[VALIDATION_SLOPES.length - 1];

const VALIDATION_GRADE_PERCENTILE: Record<SuneungGrade, number> = {
  1: 98,
  2: 92.5,
  3: 83,
  4: 68.5,
  5: 50,
  6: 31.5,
  7: 17,
  8: 7,
  9: 2,
};

const gradeAt = (percentile: number): SuneungGrade =>
  GRADES.reduce((best, grade) =>
    Math.abs(VALIDATION_GRADE_PERCENTILE[grade] - percentile) <
    Math.abs(VALIDATION_GRADE_PERCENTILE[best] - percentile)
      ? grade
      : best
  );

const syntheticScore = (percentile: number): SuneungScore => {
  const p = Math.round(percentile);
  const main = { standardScore: standardAt(p, "main"), percentile: p };
  const inquiry = { standardScore: standardAt(p, "inquiry"), percentile: p };
  return {
    examYear: 2026,
    korean: { ...main, elective: "언어와매체" },
    math: { ...main, elective: "확률과통계" },
    english: { grade: gradeAt(p) },
    inquiry1: { ...inquiry, subject: "생활과윤리" },
    inquiry2: { ...inquiry, subject: "사회문화" },
    history: { grade: 1 },
  };
};

interface ConsistencySample {
  planId: string;
  year: number;
  family: DenominatorFamily;
  percentileCut: number;
  convertedCut: number;
  simulated: number;
  deviationPercent: number;
}

const checkConsistency = (candidate: Candidate): ConsistencySample[] => {
  const samples: ConsistencySample[] = [];
  for (const year of RESULT_YEARS) {
    const rows =
      resultScoresByUnit.get(`${candidate.unit.unitId}|${year}`) ?? [];
    const percentile = pickRow(
      rows.filter((row) => isPercentileRow(row)),
      candidate.unit
    );
    const score = pickRow(
      rows.filter(
        (row) =>
          row.scoreType === "환산점수" &&
          toNumber(row.scaleMax) === candidate.plan.formula.totalScore
      ),
      candidate.unit
    );
    const percentileCut = toNumber(percentile?.cut70);
    const convertedCut = toNumber(score?.cut70);
    if (percentileCut === null || convertedCut === null || convertedCut <= 0) {
      continue;
    }
    const simulated = convertScore(
      syntheticScore(percentileCut),
      candidate.plan.formula
    ).convertedScore;
    samples.push({
      planId: candidate.plan.id,
      year,
      family: candidate.converted.family,
      percentileCut,
      convertedCut,
      simulated: round3(simulated),
      deviationPercent: round3(
        ((simulated - convertedCut) / convertedCut) * 100
      ),
    });
  }
  return samples;
};

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

// ─── 실행 ───

const countBy = <T>(
  entries: T[],
  keyOf: (entry: T) => string
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const key = keyOf(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
};

const main = (): void => {
  const excluded: {
    unitId: string;
    university: string;
    department: string;
    reason: string;
  }[] = [];
  const accepted: Candidate[] = [];

  for (const unit of units) {
    const candidate = toCandidate(unit);
    if (candidate.ok) {
      accepted.push(candidate.value);
      continue;
    }
    excluded.push({
      unitId: unit.unitId,
      university: unit.university,
      department: unit.department,
      reason: candidate.reason,
    });
  }

  // 🔴 쓸 수 있는 입결이 없는 모집단위는 시행계획에서 뺀다. 추천 근거가 되는
  // 컷이 없는 대학을 학생에게 보여주지 않는다(specs/013 §6.1).
  const candidates: Candidate[] = [];
  const results: JeongsiResultEntry[] = [];
  const plansWithoutResults: JeongsiAdmissionPlan[] = [];
  for (const candidate of disambiguate(accepted)) {
    const entries = buildResults(
      candidate.unit,
      candidate.plan,
      candidate.converted
    );
    if (entries.length === 0) {
      excluded.push({
        unitId: candidate.unit.unitId,
        university: candidate.unit.university,
        department: candidate.unit.department,
        reason: REASON.noResults,
      });
      plansWithoutResults.push(candidate.plan);
      continue;
    }
    candidates.push(candidate);
    results.push(...entries);
  }
  const plans = candidates.map((candidate) => candidate.plan);

  const planIds = new Set(plans.map((plan) => plan.id));
  if (planIds.size !== plans.length) {
    throw new Error("시행계획 id 가 중복되었습니다.");
  }

  const planErrors = validateAdmissionPlans(plans).errors;
  const resultErrors = validateAdmissionResults(results).errors;
  if (planErrors.length > 0 || resultErrors.length > 0) {
    console.error([...planErrors, ...resultErrors].join("\n"));
    throw new Error("엔진 스키마 검증에 실패했습니다.");
  }

  const samples = candidates.flatMap(checkConsistency);
  const deviationByFamily = Object.fromEntries(
    (["percentile", "fixed200", "highest", "weighted"] as const).map(
      (family) => {
        const values = samples
          .filter((sample) => sample.family === family)
          .map((sample) => Math.abs(sample.deviationPercent));
        return [
          family,
          {
            samples: values.length,
            medianAbsDeviationPercent: round3(median(values)),
          },
        ];
      }
    )
  );
  const deviationByUniversity = Object.fromEntries(
    [...groupBy(samples, (sample) => sample.planId.split("-")[0]).entries()]
      .map(([university, entries]) => {
        const deviations = entries.map((entry) => entry.deviationPercent);
        return [
          university,
          {
            family: entries[0].family,
            samples: entries.length,
            medianDeviationPercent: round3(median(deviations)),
          },
        ] as const;
      })
      .sort(
        (a, b) =>
          Math.abs(b[1].medianDeviationPercent) -
          Math.abs(a[1].medianDeviationPercent)
      )
  );
  const warnings = samples
    .filter(
      (sample) => Math.abs(sample.deviationPercent) >= CONSISTENCY_WARN_RATIO
    )
    .sort(
      (a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent)
    );

  const plansWithResults = new Set(results.map((entry) => entry.planKey));
  const unresolvedDepartments = countBy(
    excluded.filter((entry) => entry.reason === REASON.category),
    (entry) => entry.department
  );

  const report = {
    generatedAt: new Date().toISOString().slice(0, 10),
    summary: {
      sourceUnits: units.length,
      plans: plans.length,
      plansWithResults: plansWithResults.size,
      plansWithoutResults: plans.length - plansWithResults.size,
      results: results.length,
      excluded: excluded.length,
    },
    plansByGroup: countBy(plans, (plan) => plan.group),
    plansByRegion: countBy(plans, (plan) => plan.region),
    plansByMetric: countBy(plans, (plan) =>
      Object.values(plan.formula.metric).join("/")
    ),
    plansByFamily: countBy(
      candidates,
      (candidate) => candidate.converted.family
    ),
    plansByConfidence: countBy(
      candidates,
      (candidate) => candidate.converted.confidence
    ),
    resultsByMetric: countBy(results, (entry) => entry.cut70?.metric ?? "none"),
    universities: new Set(plans.map((plan) => plan.university)).size,
    excludedByReason: countBy(excluded, (entry) => entry.reason),
    consistency: {
      description:
        "백분위 70%컷 수준 가상 학생의 환산점수 vs 공시 환산점수 70%컷. 컷 학생의 영역 편차가 있어 0 이 되지는 않는다.",
      byFamily: deviationByFamily,
      byUniversity: deviationByUniversity,
      warnThresholdPercent: CONSISTENCY_WARN_RATIO,
      warnings: warnings.slice(0, 50),
    },
    unresolvedDepartments,
    excludedUnits: excluded,
  };

  const writeJson = (filePath: string, value: unknown): void =>
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");

  writeJson(path.join(DATA_DIR, "admission-plans-2027.json"), plans);
  writeJson(path.join(DATA_DIR, "admission-results.json"), results);
  writeJson(path.join(SOURCE_DIR, "engine-conversion-report.json"), report);
  // 서비스에는 쓰지 않는다. 환산식 해석 회귀 테스트(공식 계산예시)만 읽는다.
  writeJson(
    path.join(SOURCE_DIR, "plans-without-results.json"),
    plansWithoutResults
  );

  console.log(
    JSON.stringify(
      {
        ...report.summary,
        plansByFamily: report.plansByFamily,
        excludedByReason: report.excludedByReason,
        consistency: deviationByFamily,
      },
      null,
      2
    )
  );
};

main();
