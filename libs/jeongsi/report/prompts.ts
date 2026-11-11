// ============================================================
// 정시 리포트 PART 1~5 해설 생성 프롬프트
//
// 설계 원칙:
// - 프롬프트 입력은 "엔진이 이미 계산한 섹션 데이터"다. 각 Input 타입을
//   report-types.ts 의 섹션 타입에서 AI 필드만 Omit 해 만들어, 계약이
//   바뀌면 타입 에러로 드러나게 한다.
// - 문장마다 쓸 값과 그 값의 의미(판정)를 코드가 확정해 넣는다
//   (judged-facts.ts, 수시 admissionPrediction 의 라벨·문장 틀 방식).
//   모델에는 그 문장에 쓸 값만 넘긴다.
// - 각 AI 필드에 문장 수와 글자 수 상한을 명시한다. 문장별 역할까지
//   지정하는 방식(수시 admission-prediction 에서 검증됨)을 그대로 쓴다.
// - 지시는 positive instruction 으로만 쓴다.
// ============================================================

import type {
  AdvantageItem,
  AreaScoreRow,
  CombinationItem,
  RecommendationItem,
  UniversityDetailItem,
} from "../report-types.ts";
import type {
  AdmissionTier,
  PassChance,
  RiskAppetite,
  ScoreArea,
} from "../types.ts";

import { formatCardAllocation, parseSimpleRatio } from "./commentary-guards.ts";
import {
  composeChanceSentence,
  composeGapClause,
} from "./commentary-validation.ts";
import type { JudgedFact } from "./judged-facts.ts";
import { JEONGSI_CHANCE_PHRASES } from "./system-prompt.ts";

// ─── 공통 직렬화 헬퍼 ───

export const JEONGSI_AREA_LABEL: Record<ScoreArea, string> = {
  korean: "국어",
  math: "수학",
  english: "영어",
  inquiry: "탐구",
};

const NO_DATA = "정보 없음";

const formatNumber = (value: number | null): string =>
  value === null ? NO_DATA : String(value);

const formatSigned = (value: number | null): string => {
  if (value === null) {
    return NO_DATA;
  }
  return value > 0 ? `+${value}` : String(value);
};

/**
 * 기준컷 대비 격차는 백분위점으로만 말한다.
 * 환산 총점 대비 비율(gapRatio)은 대학마다 민감도가 2배 이상 차이나
 * 학생이 대학 간 비교를 할 때 오해한다. 해설이 인용할 척도는 이 값이다.
 */
const formatPercentileGap = (value: number | null): string => {
  if (value === null) {
    return NO_DATA;
  }
  // 화면과 같은 소수 첫째 자리. 해설은 받은 자릿수 그대로 인용한다.
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}백분위점`;
};

/** 화면과 같은 소수 첫째 자리. 해설은 받은 자릿수 그대로 인용한다 */
const roundForDisplay = (value: number): number => Math.round(value * 10) / 10;

/** 합격 가능성 라벨의 문장 표기 */
const formatChance = (chance: RecommendationItem["chance"]): string =>
  chance === "매우낮음" ? "매우 낮음" : chance;

const formatAreaList = (areas: ScoreArea[]): string =>
  areas.length === 0
    ? "지정된 영역 없음"
    : areas.map((area) => JEONGSI_AREA_LABEL[area]).join("·");

/** 확정값 전제를 각 프롬프트 선두에 동일한 문장으로 선언한다. */
const FIXED_VALUE_NOTICE = `## 아래 수치는 이미 확정된 값입니다

아래 표와 목록의 모든 숫자·라벨은 코드가 대학별 환산식으로 계산을 마친 확정값입니다. 표에 적힌 값을 그대로 인용해 해설을 작성하고, 계산이 필요한 값은 표 안에서 찾아 씁니다.`;

/**
 * 문장 재료 안내. 수시 admissionPrediction 처럼 코드가 판정을 확정하고,
 * 모델은 그 판정을 컨설턴트의 문장으로 푼다. 원시 수치를 통째로 주면
 * 모델이 쓰지 말아야 할 값을 집어 들고 해석을 지어냈다(실측).
 */
const FACT_GUIDE = `## 문장 재료를 쓰는 방법

문장마다 코드가 확정한 재료 두 가지가 적혀 있습니다.
- 인용할 값: 문장에서 근거로 드는 수치입니다. 적힌 표기 그대로 옮깁니다.
- 판단: 그 값이 이 학생에게 갖는 의미로, 컨설턴트가 확정한 결론입니다. 판단의 방향(유리함·부담)과 내용을 그대로 담아 컨설턴트의 말로 풀어 씁니다.

한 문장은 "인용할 값"을 근거로 먼저 두고 "판단"으로 맺습니다.`;

/** 문장별 재료 줄. 예) "  - 1문장 — 인용할 값: 수학 40% / 판단: …" */
const formatFactLines = (facts: JudgedFact[], indent = ""): string =>
  facts
    .map(
      (fact, order) =>
        `${indent}- ${order + 1}문장 — 인용할 값: ${fact.value} / 판단: ${fact.meaning}`
    )
    .join("\n");

/**
 * 후보 선정 과정의 사실. 문구는 코드(build.ts)가 만들고 프롬프트는 그것을
 * 읽기만 한다. 같은 사실을 코드 notices 와 프롬프트에서 각자 문장으로
 * 만들면 리포트 안에서 두 설명이 어긋난다.
 */
export interface JeongsiSelectionNotes {
  /** JeongsiRecommendationSection.notices 와 같은 문구 */
  notices: string[];
  /** 희망 계열 후보가 전부 선택과목 제한에 걸린 상태 */
  blockedByRestrictions: boolean;
}

const buildSelectionNotes = (selection: JeongsiSelectionNotes): string => {
  if (selection.notices.length === 0) {
    return "";
  }

  const lines = selection.notices.map((notice) => `- ${notice}`).join("\n");

  // 지원 불가일 때 해설이 멈출 자리를 지정한다.
  // 다른 계열 추천은 §6.1-e 가 금지하고, 재응시·교차지원 안내는 자동
  // 리포트가 재수를 권하는 것으로 읽힌다. 둘 다 금지문으로 열거하는 대신
  // "안내 문구에 적힌 범위 안에서 쓰고 끝낸다"로 범위를 좁혔다.
  const usage = selection.blockedByRestrictions
    ? "해설은 위 사실과 그 사유를 가장 먼저 서술하고, 어떤 응시 과목 조건이 지원을 막고 있는지까지 설명한 뒤 마무리합니다. 서술 범위는 위 안내 문구에 적힌 내용까지로 둡니다."
    : "위 사실은 화면에 안내 문구로 그대로 표시됩니다. 해설은 위 사실을 전제로 받아들이고, 목록 자체의 해석에 집중해 서술합니다.";

  return `
## 후보 선정 과정에서 알아야 할 사실

${lines}

${usage}
`;
};

/**
 * 항목마다 해설 첫머리 소재를 하나씩 돌려 배정한다.
 * "항목마다 다르게 쓰라"는 지시만으로는 모델이 같은 소재로 시작한다
 * (실측: PART 3 코멘트 7개 중 5개가 "모집인원…"). 소재를 코드가 정해 주면
 * 문장 첫머리가 기계적으로 갈린다. null 은 그 항목에 쓸 수 없는 소재다.
 */
export const assignRotatingTopics = (
  candidates: (string | null)[][]
): string[] => {
  let previousSlot = -1;
  return candidates.map((options, index) => {
    for (let step = 0; step < options.length; step += 1) {
      const slot = (index + step) % options.length;
      const topic = options[slot];
      if (topic !== null && slot !== previousSlot) {
        previousSlot = slot;
        return topic;
      }
    }
    previousSlot = -1;
    return options.find((topic): topic is string => topic !== null) ?? "";
  });
};

interface PartPerspective {
  /** 이 파트에서 해설자가 맡는 역할 */
  role: string;
  /** 이 파트가 답하는 질문 */
  focus: string;
  /** 다른 파트가 다루는 내용. 파트마다 같은 말이 반복되지 않게 범위를 나눈다 */
  elsewhere: string;
}

/**
 * 파트별 서술 관점과 역할 경계 (수시 섹션 프롬프트의 "서술 관점" ·
 * "다른 섹션과의 역할 경계" 블록을 정시 파트 구조에 옮김).
 */
const PART_PERSPECTIVES = {
  score: {
    role: "입시 컨설턴트",
    focus:
      "이 학생의 현재 성적 수준(백분위가 뜻하는 응시자 중 위치)은 어디이고, 영역별 강점·약점이 정시 지원에서 어떤 의미를 갖는가",
    elsewhere:
      "개별 대학의 이름·반영비율은 PART 2·5, 합격 가능성과 기준컷 격차는 PART 3·5가 다룹니다. 이 파트는 반영방식의 유형(수학 비율이 높은 대학, 표준점수를 쓰는 대학 등)으로 말합니다.",
  },
  match: {
    role: "입시 컨설턴트",
    focus:
      "이 학생에게 실제로 적용되는 반영 구조가 강점·약점과 어떻게 맞물려, 같은 성적이 왜 이 대학에서 더 유리하게 환산되는가",
    elsewhere:
      "합격 가능성과 기준컷 격차는 PART 3·5가 다룹니다. 이 파트는 반영비율·활용지표가 학생의 강약 구조와 맞물리는 방식에 집중합니다.",
  },
  recommendation: {
    role: "지원 라인 설계자",
    focus:
      "각 대학이 왜 그 구분(상향·적정·안정)에 놓였고, 원서 3장 안에서 어떤 쓰임인가",
    elsewhere:
      "반영비율·활용지표의 상세 해석은 PART 2·5가 다룹니다. 이 파트는 기준컷 대비 격차와 구분의 의미에 집중합니다.",
  },
  combination: {
    role: "원서 설계사",
    focus:
      "가·나·다군 세 장을 이렇게 놓으면 무엇을 얻고 무엇을 덜 따지게 되는가",
    elsewhere:
      "대학별 격차와 반영방식은 PART 3·5가 다룹니다. 이 파트는 칸마다 구분과 원서의 역할로 부르고, 조합 사이의 맞바꿈에 집중합니다.",
  },
} satisfies Record<string, PartPerspective>;

const buildPartPerspective = ({
  role,
  focus,
  elsewhere,
}: PartPerspective): string => `## 서술 관점: ${role}

이 파트의 해설은 "${focus}"에 답합니다.
- 다루는 범위: ${elsewhere}`;

/** 항목 수 규칙. 목록이 비면 총평만 쓰도록 출구를 열어 둔다. */
const buildItemCountRule = (count: number, overallLabel: string): string =>
  count === 0
    ? `- 지원 가능 목록이 비어 있으므로 items 는 빈 배열([])로 두고 ${overallLabel}만 작성합니다.`
    : `- items 는 위 목록과 같은 ${count}개를 채우고, 각 요소의 index 는 위에 적힌 index 값을 그대로 씁니다.`;

/**
 * 항목별 합격 가능성 해석 문구. 같은 라벨이 이어져도 문장 끝이 겹치지
 * 않게 라벨 안에서 정해진 문구 두 가지를 번갈아 배정한다.
 */
export const assignChanceMeanings = (
  items: { chance: PassChance }[]
): string[] => {
  const seen = new Map<PassChance, number>();
  return items.map(({ chance }) => {
    const order = seen.get(chance) ?? 0;
    seen.set(chance, order + 1);
    const { meanings } = JEONGSI_CHANCE_PHRASES[chance];
    return meanings[order % meanings.length];
  });
};

/** 영역 요약 한 줄. PART 2~5 에서 학생 강약점 맥락으로 재사용한다. */
export const buildAreaSummaryLine = (rows: AreaScoreRow[]): string =>
  rows
    .map((row) => {
      const metric =
        row.standardScore !== null
          ? `표준점수 ${row.standardScore}·백분위 ${formatNumber(row.percentile)}`
          : `${formatNumber(row.grade)}등급`;
      return `${row.label} ${metric}`;
    })
    .join(" / ");

// ─── PART 1. 성적 종합 분석 ───

export interface ScoreAnalysisPromptInput {
  rows: AreaScoreRow[];
  /** 영역별 응시자 중 위치(describeAreaLevel). 영어는 없다 */
  areaLevels: Partial<Record<ScoreArea, string>>;
  /** 총평 세 문장의 재료 (judgeScoreOverall) */
  overallFacts: JudgedFact[];
  averagePercentile: number;
  totalStandardScore: number;
  strengthAreas: ScoreArea[];
  weaknessAreas: ScoreArea[];
}

/**
 * 영역 표의 빈칸.
 * 영어에 표준점수가 없는 것은 데이터 누락이 아니라 영역 특성이므로
 * "정보 없음" 대신 하이픈으로 둔다. 반대로 입결 컷처럼 실제로 값이
 * 없는 자리는 formatNumber 로 "정보 없음"을 그대로 노출한다.
 */
const EMPTY_CELL = "-";

const formatCell = (value: number | null): string =>
  value === null ? EMPTY_CELL : String(value);

const buildAreaTable = (
  rows: AreaScoreRow[],
  levels: Partial<Record<ScoreArea, string>>
): string => {
  const header =
    "| 영역 | 과목 | 표준점수 | 백분위 | 응시자 중 위치 | 등급 | 국·수·탐 중 순위 | 국·수·탐 평균 백분위 대비 편차 |\n| --- | --- | --- | --- | --- | --- | --- | --- |";
  const body = rows
    .map((row) =>
      [
        row.label,
        row.subjectName ?? EMPTY_CELL,
        formatCell(row.standardScore),
        formatCell(row.percentile),
        levels[row.area] ?? EMPTY_CELL,
        formatCell(row.grade),
        row.rank === null ? EMPTY_CELL : `${row.rank}순위`,
        formatSigned(
          row.deviation === null ? null : roundForDisplay(row.deviation)
        ),
      ].join(" | ")
    )
    .map((line) => `| ${line} |`)
    .join("\n");

  return `${header}\n${body}`;
};

export const buildScoreAnalysisPrompt = (
  input: ScoreAnalysisPromptInput
): string => `## 작업

학생의 수능 성적 진단 결과에 해설 3개(총평·강점·약점)를 붙입니다.

${buildPartPerspective(PART_PERSPECTIVES.score)}

${FIXED_VALUE_NOTICE}

${FACT_GUIDE}

### 영역별 성적
${buildAreaTable(input.rows, input.areaLevels)}
"응시자 중 위치"는 백분위의 정의(그 점수보다 낮은 응시자의 비율)로 정해지는 값입니다. 영어는 등급만 있어 위치를 적지 않습니다.

### 종합 지표
- 국·수·탐 평균 백분위: ${roundForDisplay(input.averagePercentile)}
- 국·수·탐 표준점수 합: ${input.totalStandardScore}
- 코드가 판정한 강점 영역: ${formatAreaList(input.strengthAreas)}
- 코드가 판정한 약점 영역: ${formatAreaList(input.weaknessAreas)}

## 출력 JSON

각 해설 필드는 문장 하나를 배열 원소 하나로 씁니다.

{
  "overallComment": ["1문장", "2문장", "3문장"],
  "strengthComment": ["1문장", "2문장"],
  "weaknessComment": ["1문장", "2문장"]
}

## 필드별 작성 지침

### overallComment — 문장 3개, 합계 300자 이내
아래 재료로 한 문장씩 씁니다.
${formatFactLines(input.overallFacts)}

- 권장 작성 형태: 인용할 값 "<값>", 판단 "<판단>" → "<값>의 성적은 <판단의 내용을 컨설턴트의 말로 푼 문장>" (<> 자리는 그 문장 재료로 채웁니다. 판단의 방향은 재료에 적힌 그대로 씁니다.)

### strengthComment — 문장 2개, 합계 200자 이내
1문장: 강점 영역의 수준을 진단합니다. 백분위와 표의 "응시자 중 위치", 국·수·탐 평균 백분위 대비 편차를 인용해 이 영역이 어느 수준이고 다른 영역보다 얼마나 앞서 있는지 씁니다.
2문장: 컨설턴트로서 이 강점을 원서 선택에 어떻게 쓰면 되는지 조언합니다(해당 영역 비율이 높은 대학, 표준점수 활용 대학을 먼저 살피는 등).

### weaknessComment — 문장 2개, 합계 200자 이내
1문장: 약점 영역의 수준을 진단합니다. 백분위와 표의 "응시자 중 위치", 국·수·탐 평균 백분위 대비 편차를 인용해 이 영역이 어느 수준이고 다른 영역보다 얼마나 뒤처져 있는지 씁니다.
2문장: 컨설턴트로서 이 약점이 어떤 반영비율의 대학에서 환산 손실로 이어지는지, 원서 선택에서 어떻게 피하거나 줄이면 되는지 조언합니다. 이 파트의 입력에는 대학별 활용지표가 없으므로, 반영방식은 반영비율 기준으로 말합니다.

세 필드 모두 위에 지정된 개수의 문장으로 배열을 채웁니다.`;

// ─── PART 2. 나에게 유리한 대학 분석 ───

export interface UniversityMatchPromptItem extends Omit<
  AdvantageItem,
  "reason"
> {
  /** 상위 영역 선택 대학에서 이 학생에게 실제로 적용되는 비율 */
  appliedRatioSummary?: string;
}

export interface UniversityMatchPromptInput {
  /** 항목마다 두 문장의 재료 (assignMatchFacts) */
  facts: [JudgedFact, JudgedFact][];
  areaSummary: string;
  strengthAreas: ScoreArea[];
  weaknessAreas: ScoreArea[];
  items: UniversityMatchPromptItem[];
  selection: JeongsiSelectionNotes;
}

/** 값이 목록 안에서 어디쯤인지. 해설이 "가장 높으나 영향이 적다" 처럼 모순되지 않게 코드가 판정한다 */
const describeListPosition = (value: number, values: number[]): string => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return "모두 같음";
  if (value === max) return "가장 높음";
  if (value === min) return "가장 낮음";
  return "중간";
};

/** 대학 하나의 영역 반영비율과 목록 안 위치. 0% 는 이 학생에게 반영에서 빠진 영역이다 */
export interface AreaRatioFact {
  label: string;
  value: number;
  /** 목록 안 위치 판정. 비교할 대학이 하나뿐이거나 0% 면 null */
  position: string | null;
  /** 목록 대학의 같은 영역 반영 범위. 예) "35~40%" */
  range: string | null;
}

/**
 * 영역이 대학마다 몇 % 반영되는지와 목록 안 위치. 상위 영역 선택 대학은
 * 이 학생에게 실제로 적용되는 비율을 쓴다. 높낮이 판단은 코드가 정한다.
 */
export const collectAreaRatios = (
  items: UniversityMatchPromptItem[],
  areas: ScoreArea[]
): AreaRatioFact[][] => {
  const ratios = items.map((item) =>
    parseSimpleRatio(item.appliedRatioSummary ?? item.ratioSummary)
  );
  const areaValues = areas.map((area) => {
    const label = JEONGSI_AREA_LABEL[area];
    // 반영에서 빠진 대학(0%)은 범위에 넣지 않는다. 넣으면 반영하는 대학끼리의
    // 높낮이가 흐려진다(탐구 10% 가 "가장 낮음" 대신 "중간").
    const values = ratios.flatMap((ratio) => {
      const value = ratio?.get(label);
      return value === undefined || value === 0 ? [] : [value];
    });
    return { label, values };
  });
  return ratios.map((ratio) =>
    areaValues.flatMap(({ label, values }) => {
      const value = ratio?.get(label);
      if (value === undefined) return [];
      const compared = value !== 0 && values.length > 1;
      return [
        {
          label,
          value,
          position: compared ? describeListPosition(value, values) : null,
          range: compared
            ? `${Math.min(...values)}~${Math.max(...values)}%`
            : null,
        },
      ];
    })
  );
};

export const buildUniversityMatchPrompt = (
  input: UniversityMatchPromptInput
): string => {
  // 항목마다 두 문장의 재료(값 + 판정)만 싣는다. 반영비율·활용지표·강약 영역
  // 줄을 모두 실었더니 모델이 판정과 반대 방향으로 쓰거나(동국대 탐구 25% →
  // "부담을 줄여 줌") 같은 문장을 되풀이했다(실측).
  const itemBlock = input.items
    .map((item, index) =>
      [
        `- index ${index}: ${item.university} ${item.department} (${item.group}군)`,
        formatFactLines(input.facts[index], "  "),
      ].join("\n")
    )
    .join("\n");

  const task =
    input.items.length === 0
      ? "반영방식이 유리한 대학 목록이 비어 있습니다. 아래 사실을 근거로 반영방식 관점의 총평 1개만 작성합니다."
      : `학생의 강약점 구조에 반영방식이 유리한 대학 ${input.items.length}곳에, 각각 "왜 유리한지" 해설을 붙이고 전체 총평 1개를 작성합니다.`;

  return `## 작업

${task}

${buildPartPerspective(PART_PERSPECTIVES.match)}

${FIXED_VALUE_NOTICE}

${FACT_GUIDE}
${buildSelectionNotes(input.selection)}
### 학생 영역별 성적
${input.areaSummary}
- 강점 영역: ${formatAreaList(input.strengthAreas)}
- 약점 영역: ${formatAreaList(input.weaknessAreas)}

### 반영방식이 유리한 대학 (유리한 순서, 코드 선정 결과)
${itemBlock}

## 출력 JSON

각 해설 필드는 문장 하나를 배열 원소 하나로 씁니다.

{
  "overallComment": [
    "1문장 (80자 이내): 강점 영역이 유리하게 잡히는 반영 구조",
    "2문장 (80자 이내): 목록 대학들의 공통된 반영 특징",
    "3문장 (90자 이내): 함께 살필 점과 한 방향의 결론"
  ],
  "items": [
    { "index": 0, "reason": ["1문장", "2문장"] }
  ]
}

## 필드별 작성 지침

### overallComment — 문장 3개, 합계 250자 이내
1문장: 학생의 강점 영역을 인용해, 어떤 반영 구조에서 환산점수가 유리하게 잡히는지 서술합니다.
2문장: 목록에 오른 대학들의 공통된 반영 특징(강점 영역 비율이 높음, 특정 활용지표를 씀 등)을 서술합니다.
3문장: 목록 대학을 고를 때 학생이 함께 살필 점(약점 영역 비율이 높은 대학 등)을 짚고, 반영방식을 먼저 확인하는 선택이 어떤 이득으로 이어지는지 한 방향의 결론으로 맺습니다.

### items[].reason — 문장 2개, 항목마다 합계 120자 이내
컨설턴트가 학생에게 "이 대학의 반영방식이 왜 당신에게 유리한지"를 설명하는 근거 두 문장입니다. 항목에 적힌 1문장·2문장 재료로 한 문장씩 쓰고, 문장은 재료의 값으로 시작합니다(대학명은 화면 카드 제목에 표시됩니다). 이 대학이 어떤 후보인지의 판단 문장은 코드가 근거 뒤에 붙이므로, 두 문장은 근거에 집중합니다.
- 권장 작성 형태 (<> 자리는 재료의 값으로 채웁니다):
  - 인용할 값 "<영역> <비율>%", 판단 "목록 대학 중 <영역> 비중이 가장 커, 강점 영역의 백분위 <값>점이 환산점수를 가장 크게 끌어올립니다" → "<영역>을 <비율>% 반영해 목록 대학 중 비중이 가장 크므로, 강점인 <영역> 백분위 <값>점이 환산점수를 가장 크게 끌어올립니다."
  - 인용할 값 "<영역> <비율>%", 판단 "목록 대학 중 <영역> 비중이 가장 작아, 약점 영역의 환산 손실이 가장 적습니다" → "약점인 <영역>은 <비율>%만 반영되어 목록 대학 중 비중이 가장 작고, 그만큼 환산 손실도 가장 적습니다."
  - 인용할 값 "<대학명>와 같은 반영 구조", 판단 "…모집군과 합격 가능성으로 원서를 고르는 편이 합리적입니다" → "<대학명>와 반영 구조가 같아, 두 대학 중에서는 모집군과 합격 가능성으로 원서를 고르는 편이 합리적입니다."

## 출력 규칙

${buildItemCountRule(input.items.length, "overallComment")}
- 대학명·학과명·모집군은 위 목록의 표기를 그대로 사용합니다.`;
};

// ─── PART 3. 지원 가능 대학·학과 ───

export type RecommendationTier = Exclude<AdmissionTier, "지원불가">;

export interface RecommendationPromptEntry extends Omit<
  RecommendationItem,
  "comment"
> {
  tier: RecommendationTier;
  /** 분류의 실제 척도. 해설이 인용할 격차 값 */
  percentileGap: number | null;
  /** 연도별 공개 컷 요약. 코멘트가 대학마다 다른 근거를 쓰게 한다 */
  cutTrend?: string;
  /** 적정이 비어 다른 구분에서 끌어온 항목의 실제 구분 */
  substitutedFrom?: RecommendationTier;
}

export interface RecommendationPromptInput {
  areaSummary: string;
  /** 총평 세 문장의 재료 (judgeRecommendationOverall) */
  overallFacts: JudgedFact[];
  risk: RiskAppetite;
  items: RecommendationPromptEntry[];
  selection: JeongsiSelectionNotes;
}

/**
 * 같은 구분 안에서 격차 순위를 코멘트 첫머리 구절로 쓴다.
 * 예) "안정 3곳 중 여유가 가장 큰 곳으로"
 */
const describeTierPosition = (
  item: RecommendationPromptEntry,
  items: RecommendationPromptEntry[]
): string | null => {
  if (item.percentileGap === null) return null;
  const gaps = items
    .flatMap(({ tier, percentileGap }) =>
      tier === item.tier && percentileGap !== null ? [percentileGap] : []
    )
    .sort((a, b) => b - a);
  if (gaps.length < 2) return null;
  // 기준컷에 못 미친 곳은 "여유"가 아니다(실측: "여유가 가장 커, 기준컷에
  // 0.3백분위점 모자라"). 못 미친 곳끼리 컷과의 거리로 말한다.
  // 격차 문구와 같은 기준(소수 한 자리 반올림)으로 판단한다. -0.04 를 "기준컷
  // 아래"라 하고 격차 문구는 "기준컷과 같은 수준"이라 쓰면 어긋난다(실측).
  const roundGap = (gap: number) => Math.round(gap * 10) / 10;
  if (roundGap(item.percentileGap) < 0) {
    const below = gaps.filter((gap) => roundGap(gap) < 0);
    const rank = below.indexOf(item.percentileGap) + 1;
    const near =
      rank === 1
        ? "기준컷에 가장 가까운"
        : rank === below.length
          ? "기준컷과 가장 먼"
          : `기준컷에 ${rank}번째로 가까운`;
    const position =
      below.length === gaps.length
        ? near
        : below.length === 1
          ? "유일하게 기준컷 아래인"
          : `기준컷 아래 ${below.length}곳 중 ${near.replace("기준컷", "컷")}`;
    return `${item.tier} ${gaps.length}곳 중 ${position} 곳으로`;
  }
  const rank = gaps.indexOf(item.percentileGap) + 1;
  const position =
    rank === 1
      ? "여유가 가장 큰"
      : rank === gaps.length
        ? "여유가 가장 작은"
        : `여유가 ${rank}번째인`;
  return `${item.tier} ${gaps.length}곳 중 ${position} 곳으로`;
};

/**
 * 컷 흐름 첫머리 구절. 연도별 컷을 모두 싣는다(일부 구간만 인용하면
 * 96.22→94.88→96 을 "하락"으로 전했다 — 실측).
 * 예) "2024 75 → 2026 82, 상승" → "컷 흐름이 상승(2024 75 → 2026 82)인 곳으로"
 */
export const composeTrendLead = (
  cutTrend: string | undefined
): string | null => {
  if (!cutTrend?.includes("→")) return null;
  const [series, direction] = cutTrend.split(", ");
  return direction
    ? `컷 흐름이 ${direction}(${series})인 곳으로`
    : `컷 흐름(${series})을 보인 곳으로`;
};

/** 구간별 격차 범위. 예) "상향 -1.3백분위점, 적정 -0.4~+3.1백분위점" */
export const formatTierGapRanges = (
  items: RecommendationPromptEntry[]
): string =>
  (["상향", "적정", "안정"] as const)
    .flatMap((tier) => {
      const gaps = items.flatMap((item) =>
        item.tier === tier && item.percentileGap !== null
          ? [item.percentileGap]
          : []
      );
      if (gaps.length === 0) return [];
      const min = formatPercentileGap(Math.min(...gaps));
      const max = formatPercentileGap(Math.max(...gaps));
      return [`${tier} ${min === max ? min : `${min}~${max}`}`];
    })
    .join(", ");

/**
 * 총평에서 신중하게 다룰 대학. 합격 가능성이 낮거나 기준컷에 못 미친 곳을
 * 코드가 골라, 모델이 "~를 제외한 나머지" 처럼 방향을 뒤집지 않게 한다(실측).
 */
export const collectCautionItems = (
  items: RecommendationPromptEntry[]
): string[] =>
  // 이유를 길게 붙이면 모델이 괄호째 옮겨 총평이 372자로 넘쳤다(실측).
  // 격차 하나만 짧게 싣는다.
  items.flatMap((item) => {
    const isLow = item.chance === "낮음" || item.chance === "매우낮음";
    const isBelow = item.percentileGap !== null && item.percentileGap < 0;
    if (!isLow && !isBelow) return [];
    return [
      item.percentileGap === null
        ? `${item.university} ${item.department}`
        : `${item.university} ${item.department}(${formatPercentileGap(item.percentileGap)})`,
    ];
  });

/** PART 3 코멘트 첫머리 소재 */
/** PART 3 코멘트 첫머리 구절. 항목마다 소재 종류를 돌려 배정한다 */
export const assignRecommendationOpenings = (
  items: RecommendationPromptEntry[]
): string[] =>
  assignRotatingTopics(
    items.map((item) =>
      item.substitutedFrom
        ? // 끌어온 항목은 실제 구분부터 밝힌다(칸 이름으로 부르면 틀린 정보)
          [
            `${item.substitutedFrom} 판정이지만 적정 후보가 부족해 함께 담은 곳으로`,
          ]
        : [
            composeTrendLead(item.cutTrend),
            describeTierPosition(item, items),
            `${item.group}군 ${item.tier} 원서로`,
            `${item.quota}명을 뽑는 모집단위로`,
          ]
    )
  );

/**
 * PART 3 한 줄 코멘트. 첫머리 구절 + 격차 문구 + 합격 가능성 해석 문구를
 * 코드가 잇는다. 세 조각을 모델에 주고 잇게 했더니 "여유가 가장 작음으로",
 * "보합으로 컷이 보합했고"처럼 이음새가 틀렸다(실측). 모델이 더하는 정보가 없다.
 */
export const composeRecommendationComment = (
  opening: string,
  gap: number | null,
  meaning: string
): string => `${opening} ${composeChanceSentence(gap, meaning)}`;

export const buildRecommendationPrompt = (
  input: RecommendationPromptInput
): string => {
  // 항목 코멘트는 코드가 잇는다(composeRecommendationComment). 모델은 총평만 쓴다.
  // 표는 총평이 목록을 정확히 말하도록 구분·모집군·격차만 싣는다. 환산점수·
  // 기준컷·연도별 컷을 모두 주면 모델이 무관한 값을 끼워 넣었다(실측).
  // 격차는 부호 있는 수치 대신 코드가 쓴 문구로 준다. 수치를 주자 모델이
  // "기준컷을 -1.3백분위점 모자라"처럼 부호와 조사를 섞어 썼다(실측).
  const header =
    "| index | 구분 | 모집군 | 격차 문구 |\n| --- | --- | --- | --- |";
  const body = input.items
    .map((item, index) =>
      [
        String(index),
        item.tier,
        `${item.group}군`,
        composeGapClause(item.percentileGap),
      ].join(" | ")
    )
    .map((line) => `| ${line} |`)
    .join("\n");

  const task =
    input.items.length === 0
      ? "지원 가능 대학 목록이 비어 있습니다. 아래 사실을 근거로 지원 전략 총평 1개만 작성합니다."
      : `코드가 상향·적정·안정으로 분류한 지원 가능 대학 ${input.items.length}곳의 지원 전략 총평 1개를 작성합니다. 대학별 한 줄 코멘트는 코드가 씁니다.`;

  return `## 작업

${task}

${buildPartPerspective(PART_PERSPECTIVES.recommendation)}

${FIXED_VALUE_NOTICE}

${FACT_GUIDE}

## 기준컷 대비 격차

- 구분(상향·적정·안정)과 합격 가능성은 기준컷 대비 백분위점 격차로 코드가 확정한 결과입니다.
- 표의 "격차 문구"는 코드가 격차의 방향과 크기를 확정해 쓴 문구입니다.
${buildSelectionNotes(input.selection)}
### 지원 가능 대학 (코드 분류 결과)
${header}
${body}

## 출력 JSON

overallComment는 문장 하나를 배열 원소 하나로 씁니다.

{
  "overallComment": ["1문장 (100자 이내)", "2문장 (90자 이내)", "3문장 (110자 이내)"]
}

## 필드별 작성 지침

### overallComment — 문장 3개, 합계 300자 이내
아래 재료로 한 문장씩 씁니다.
${formatFactLines(input.overallFacts)}

- 권장 작성 형태: 인용할 값 "<값>", 판단 "<판단>" → "지원 가능 대학은 <값>으로, <판단의 내용을 컨설턴트의 말로 푼 문장>" (<> 자리는 그 문장 재료로 채웁니다. 판단의 내용은 재료에 적힌 그대로 씁니다.)

## 출력 전 자가 점검
1. overallComment 세 문장이 재료의 판단을 각각 담고 있는가?`;
};

// ─── PART 4. 가·나·다군 지원 조합 ───

export interface CombinationPromptInput {
  risk: RiskAppetite;
  /** 총평 2문장의 재료: 기본 배분과 같은 조합 (judgeCombinationAllocation) */
  allocationFact: JudgedFact;
  combinations: Omit<CombinationItem, "strategy">[];
  selection: JeongsiSelectionNotes;
}

/**
 * 조합 라벨별 정해진 문장 (engine/combination.ts COMBINATION_AXES 의 정렬 기준).
 * 선정 기준과 맞바꿈은 라벨의 정의라 학생마다 달라지지 않는다. 모델에 맡기면
 * 이 정의를 베껴 쓰면서 문장 틀이 조합마다 같아지고 세 칸을 나열했다(실측).
 * 정의 문장은 코드가 쓰고, 모델은 이 학생의 조합에서만 나오는 해석
 * (달라지는 칸의 효과) 한 문장을 쓴다 — 수시 admissionPrediction 의
 * "정해진 문장 구조 + 해석 자리만 채우기" 방식.
 */
export const COMBINATION_LABEL_SENTENCES: Record<
  string,
  { criterion: string; tradeoff: string }
> = {
  "희망 우선형": {
    criterion: "희망 학과·계열과 가장 가까운 학과를 먼저 고른 조합입니다.",
    tradeoff:
      "원하는 전공으로 진학할 가능성을 얻는 대신, 대학 선호도나 합격 여유는 덜 따지는 선택입니다.",
  },
  "반영방식 우선형": {
    criterion: "학생 성적이 유리하게 반영되는 대학을 먼저 고른 조합입니다.",
    tradeoff:
      "환산점수상의 이점을 얻는 대신, 희망 학과와의 일치도는 덜 따지는 선택입니다.",
  },
  "대학 우선형": {
    criterion: "대학 선호도가 높은 곳을 먼저 고른 조합입니다.",
    tradeoff:
      "선호도 높은 대학에 진학할 가능성을 얻는 대신, 희망 학과와의 일치도나 합격 여유는 덜 따지는 선택입니다.",
  },
  "합격 여유형": {
    criterion: "기준컷 대비 여유가 큰 곳을 먼저 고른 조합입니다.",
    tradeoff: "합격 안정성을 얻는 대신, 대학·학과 선호는 덜 따지는 선택입니다.",
  },
};

/** 정해진 선정 기준 → 모델의 해석 문장 → 정해진 맞바꿈 순으로 전략 설명을 잇는다 */
/**
 * 조합 라벨의 기본 이름. 빈 군이 있으면 엔진이 "희망 우선형 (다군 지원처 없음)"
 * 처럼 덧붙여, 라벨로 정해진 문장을 찾지 못하고 1문장만 나갔다(실측).
 */
/**
 * 엔진은 조합이 모자라면 앞선 조합에 쓰인 대학을 빼고 첫 축으로 다시 만든
 * "<라벨> 대안"을 더한다(engine/combination.ts). 이 조합도 정해진 문장이
 * 있어야 카드 문장 구조가 같다(실측: "희망 우선형 대안"이 1문장).
 */
/**
 * 조합 라벨에서 지원처 없음 같은 괄호 설명을 뗀다. 괄호는 끝에만 오지 않는다
 * (실측: "희망 우선형 (나·다군 지원처 없음) 대안" 의 정해진 문장을 못 찾음).
 */
const stripLabelNote = (label: string): string =>
  label.replace(/\s*\([^)]*\)/g, "");

const findLabelSentences = (label: string) => {
  const base = stripLabelNote(label);
  const alternativeOf = base.match(/^(.+?)\s*대안$/)?.[1];
  if (!alternativeOf) return COMBINATION_LABEL_SENTENCES[base];
  const original = COMBINATION_LABEL_SENTENCES[alternativeOf];
  return original
    ? {
        criterion: `앞선 조합에 쓰인 대학을 빼고 ${alternativeOf} 기준으로 다시 고른 조합입니다.`,
        // 원래 조합의 맞바꿈 문장을 그대로 쓰면 같은 섹션에 같은 문장이 된다
        tradeoff: `앞선 조합과 다른 대학으로 비교할 선택지를 얻는 대신, ${alternativeOf}에서 먼저 고른 대학은 빠진 선택입니다.`,
      }
    : undefined;
};

export const composeCombinationStrategy = (
  label: string,
  difference: string
): string => {
  const sentences = findLabelSentences(label);
  return sentences
    ? `${sentences.criterion} ${difference} ${sentences.tradeoff}`
    : difference;
};

/**
 * 다른 조합에 없는 칸. "다른 조합과 달라지는 칸" 을 모델에 맡기면 세 칸을
 * 모두 나열했다(실측). 같은 군에 같은 학과를 둔 조합이 없으면 그 칸이 고유하다.
 */
type CombinationDraft = CombinationPromptInput["combinations"][number];

export const findDistinctSlots = (
  combination: CombinationDraft,
  combinations: CombinationDraft[]
): CombinationDraft["slots"] =>
  combination.slots.filter(
    (slot) =>
      !combinations.some(
        (other) =>
          other !== combination &&
          other.slots.some(
            (candidate) =>
              candidate.group === slot.group &&
              candidate.university === slot.university &&
              candidate.department === slot.department
          )
      )
  );

const sameSlot = (
  a: CombinationDraft["slots"][number],
  b: CombinationDraft["slots"][number]
): boolean =>
  a.group === b.group &&
  a.university === b.university &&
  a.department === b.department;

/**
 * 칸마다 다른 조합에도 쓰여 "이 조합에만 있는 칸"이 없을 때의 차이 문장.
 * 가장 많이 겹치는 조합과 견줘 어느 칸이 다른지 코드가 쓴다
 * (실측: 달라지는 칸이 없어 차이 문장이 빈 채로 나감).
 */
export const composeOverlapSentence = (
  combination: CombinationDraft,
  combinations: CombinationDraft[]
): string | null => {
  const others = combinations.filter((other) => other !== combination);
  const [nearest] = others
    .map((other) => ({
      other,
      shared: combination.slots.filter((slot) =>
        other.slots.some((candidate) => sameSlot(slot, candidate))
      ).length,
    }))
    .sort((a, b) => b.shared - a.shared);
  if (!nearest) return null;
  const differing = combination.slots.filter(
    (slot) =>
      !nearest.other.slots.some((candidate) => sameSlot(slot, candidate))
  );
  if (differing.length === 0) return null;
  const label = stripLabelNote(nearest.other.label);
  const cells = differing
    .map((slot) => `${slot.group}군(${slot.university} ${slot.department})`)
    .join("·");
  return `${label}과 비교하면 ${cells} 칸만 다르고, 나머지 칸은 같습니다.`;
};

/** 모든 칸이 다른 조합과 겹치지 않는다. 이때 해석 문장은 코드가 쓴다 */
export const isFullyDistinct = (
  combination: CombinationDraft,
  combinations: CombinationDraft[]
): boolean =>
  combination.slots.length > 1 &&
  findDistinctSlots(combination, combinations).length ===
    combination.slots.length;

const SLOT_COUNT_WORD: Record<number, string> = { 2: "두", 3: "세" };

/** "세 칸" · "두 칸". 지원처가 없는 군은 칸이 빠진다 */
const describeSlotCount = (count: number): string =>
  `${SLOT_COUNT_WORD[count] ?? count} 칸`;

/**
 * 칸이 모두 다른 조합에 없을 때의 해석 문장. "세 칸의 공통 성격으로 묶어
 * 말하라" 고 지시해도 세 칸을 모두 나열했다(실측) — 사실 그대로를 코드가 쓴다.
 * 이런 조합이 여럿이면 같은 문장이 4번 반복돼(실측) 조합 라벨을 넣는다.
 * 지원처가 없는 군이 있으면 칸이 둘이다(실측: 두 칸인데 "세 칸 모두").
 */
export const composeFullyDistinctSentence = (
  label: string,
  slotCount: number
): string =>
  `${describeSlotCount(slotCount)} 모두 다른 조합과 겹치지 않아, ${stripLabelNote(label)} 기준만으로 고른 별도의 선택지입니다.`;

const formatDistinctSlots = (
  combination: CombinationDraft,
  combinations: CombinationDraft[]
): string => {
  const distinct = findDistinctSlots(combination, combinations);
  if (distinct.length === 0) return "없음 (다른 조합과 칸 구성이 같음)";
  if (isFullyDistinct(combination, combinations)) {
    return `${describeSlotCount(combination.slots.length)} 모두 — 이 조합의 해석 문장은 코드가 쓰므로 difference는 빈 문자열로 둡니다`;
  }
  return distinct
    .map(
      (slot) =>
        `${slot.group}군 ${slot.university} ${slot.department} (${slot.tier})`
    )
    .join(", ");
};

export const buildCombinationPrompt = (
  input: CombinationPromptInput
): string => {
  const block = input.combinations
    .map((combination, index) => {
      const slots = combination.slots
        .map(
          (slot) =>
            `  - ${slot.group}군: ${slot.university} ${slot.department} (${slot.tier} / 합격 가능성 ${formatChance(slot.chance)})`
        )
        .join("\n");
      const fixed = findLabelSentences(combination.label);
      return [
        `- index ${index}: ${combination.label}`,
        fixed
          ? `  - 화면에 함께 표시되는 정해진 문장: "${fixed.criterion}" / "${fixed.tradeoff}"`
          : "",
        `  - 다른 조합과 달라지는 칸: ${formatDistinctSlots(combination, input.combinations)}`,
        slots,
      ]
        .filter((line) => line.length > 0)
        .join("\n");
    })
    .join("\n");

  const task =
    input.combinations.length === 0
      ? "구성 가능한 지원 조합이 없습니다. 아래 사실을 근거로 조합 선택 가이드 1개만 작성합니다."
      : `코드가 구성한 가·나·다군 지원 조합 ${input.combinations.length}개에 각각 해석 문장 1개를 붙이고, 조합 선택 가이드 1개를 작성합니다.`;

  return `## 작업

${task}

${buildPartPerspective(PART_PERSPECTIVES.combination)}

${FIXED_VALUE_NOTICE}

조합의 구성(어느 군에 어느 대학을 넣을지)과 각 칸의 구분·합격 가능성은 코드가 확정한 결과입니다. 각 조합의 선정 기준과 맞바꿈(얻는 것과 덜 따지는 것)은 정해진 문장으로 화면에 표시되므로, 해설은 이 학생의 조합에서만 나오는 해석을 맡습니다.
${buildSelectionNotes(input.selection)}
### 학생 지원 성향
${input.risk}

### 조합 목록 (코드 구성 결과)
${block}

## 출력 JSON

overallComment는 문장 하나를 배열 원소 하나로 씁니다.

{
  "overallComment": [
    "1문장 (70자 이내): 정시 원서 구조를 전제로 한 조합 선택 기준",
    "2문장 (90자 이내): 지원 성향의 기본 배분과 가장 가까운 조합",
    "3문장 (80자 이내): 조합 사이에서 고민할 때 먼저 따질 한 가지"
  ],
  "items": [
    { "index": 0, "difference": "다른 조합과 달라지는 칸의 효과 1문장" }
  ]
}

## 필드별 작성 지침

### overallComment — 문장 3개, 합계 250자 이내
1문장: 가·나·다군에서 각 1장씩 쓰는 정시 구조를 전제로, 조합을 고를 때의 기준을 서술합니다.
2문장: 아래 재료로 씁니다. 기본 배분과 같은 조합은 코드가 칸을 세어 확정한 결과이므로, 판단에 적힌 조합을 그대로 씁니다.
  - 인용할 값: ${input.allocationFact.value} / 판단: ${input.allocationFact.meaning}
3문장: 조합 사이에서 고민할 때 먼저 따질 한 가지(희망 학과·대학 선호·합격 안정성 중 무엇을 앞세울지)를 짚는 데 집중합니다. 조합마다 얻는 것과 덜 따지는 것은 각 조합 카드의 정해진 문장이 보여 줍니다.

### items[].difference — 각 1문장, 항목마다 90자 이내
항목의 "다른 조합과 달라지는 칸" 줄에 적힌 칸을 짚고, 그 칸이 이 조합에서 맡는 역할을 컨설턴트의 판단으로 씁니다. 이 문장은 정해진 두 문장 사이에 놓입니다.
- 칸은 "다군 안정 원서"처럼 군과 구분으로 부르고, 대학·학과명은 그 칸 하나만 적습니다. 나머지 칸은 화면 카드에 표시됩니다.
- 좋은 예시 (<> 자리는 목록의 값으로 채웁니다): "<군> <구분> 원서에 <대학명> <학과명>을 두어, <그 칸이 이 조합에서 맡는 역할과 그 의미>."

## 출력 규칙

${buildItemCountRule(input.combinations.length, "overallComment")}
- 대학명·학과명·모집군·구분·합격 가능성·조합 라벨은 위 목록의 표기를 그대로 사용합니다.

## 출력 전 자가 점검
1. 각 difference가 "다른 조합과 달라지는 칸" 줄의 칸만 짚는가?
2. overallComment의 원서 배분이 "${formatCardAllocation(input.risk)}"와 같은가?
3. overallComment 배열이 문장 3개인가?`;
};

// ─── PART 5. 대학별 상세 분석 ───

export interface UniversityDetailPromptItem extends Omit<
  UniversityDetailItem,
  "reason"
> {
  /** 분류의 실제 척도. 해설이 인용할 격차 값 */
  percentileGap: number | null;
}

/** PART 5 추천 이유 1문장(코드 판정 문장)의 상한. 2문장은 격차·합격 가능성 문장이다 */
export const DETAIL_SENTENCE_MAX_CHARS = 70;

// ─── 위반 칸 다시 쓰기 ───

export interface RepairPromptEntry {
  /** 재요청 응답에서 이 칸을 찾는 위치 */
  target: { field: string; index?: number };
  /** 1차 해설 */
  text: string;
  /** 고칠 점 (코드 검사 결과) */
  problems: string[];
  /** 이 칸의 문장 수 */
  sentences: number;
}

const formatRepairTarget = ({ field, index }: RepairPromptEntry["target"]) =>
  index === undefined ? field : `items index ${index} (${field})`;

const formatRepairShape = ({ sentences }: RepairPromptEntry): string =>
  sentences === 1
    ? '"1문장"'
    : `[${Array.from({ length: sentences }, (_, order) => `"${order + 1}문장"`).join(", ")}]`;

/**
 * 규칙을 어긴 칸만 다시 쓰게 하는 프롬프트. 원래 프롬프트 뒤에 다시 쓸 칸과
 * 그 칸이 갖출 모양(긍정 지시)만 붙인다. 이전 문장은 싣지 않는다 — 낮은
 * 모델은 보여 준 문장을 따라 쓰므로, 고칠 문장도 나쁜 예시가 된다.
 */
export const buildRepairPrompt = (
  originalPrompt: string,
  entries: RepairPromptEntry[]
): string => {
  const block = entries
    .map((entry) =>
      [
        `- ${formatRepairTarget(entry.target)}`,
        ...entry.problems.map((problem) => `  - ${problem}`),
      ].join("\n")
    )
    .join("\n");
  const fields = entries.filter(({ target }) => target.index === undefined);
  const items = entries.filter(({ target }) => target.index !== undefined);
  const shape = [
    ...fields.map(
      (entry) => `  "${entry.target.field}": ${formatRepairShape(entry)}`
    ),
    ...(items.length > 0
      ? [
          `  "items": [\n${items
            .map(
              (entry) =>
                `    { "index": ${entry.target.index}, "${entry.target.field}": ${formatRepairShape(entry)} }`
            )
            .join(",\n")}\n  ]`,
        ]
      : []),
  ].join(",\n");

  return `${originalPrompt}

## 다시 쓰기

아래 칸을 위 지침과 재료로 새로 씁니다. 칸마다 적힌 모양을 모두 갖추고, 나머지는 위 지침을 그대로 따릅니다.

${block}

## 다시 쓰기 출력 JSON

다시 쓰기 응답은 아래 형식으로, 다시 쓴 칸만 담습니다. 여러 문장 칸은 문장 하나를 배열 원소 하나로 씁니다.

{
${shape}
}`;
};
