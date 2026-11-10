/**
 * mock-data.ts 의 `notices` 가 `buildRecommendationNotices()` 출력과 일치하는지
 * 검사한다.
 *
 * `notices` 는 AI 가 아니라 코드가 확정하는 값이라, 생성 함수가 바뀌면 목도
 * 따라가야 한다. 사람이 기억해서 맞추는 구조는 반드시 어긋난다 — 실제로 한
 * 라운드에서 같은 문제로 세 번 돌았고, 읽고 추론해 넣은 값이 네 픽스처 중
 * 셋에서 틀렸다("컴퓨터공학과·의예과는 정시 모집 대학이 많으니 poolStage 1
 * 이겠지" → 샘플 데이터에서 둘 다 2).
 *
 * 실패하면 메시지에 찍힌 블록을 mock-data.ts 의 해당 `notices` 에 그대로
 * 붙여넣으면 된다. 다시 추론하지 말 것.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  resetJeongsiDataSource,
  setJeongsiDataSource,
} from "@/libs/jeongsi/data";
import type { JeongsiDataSource } from "@/libs/jeongsi/data";
import { analyzeJeongsi } from "@/libs/jeongsi/engine/analyze";
import {
  JEONGSI_MOCK_REPORT,
  JEONGSI_MOCK_REPORT_BLOCKED,
  JEONGSI_MOCK_REPORT_EDGE,
  JEONGSI_MOCK_REPORT_MEDICAL,
} from "@/libs/jeongsi/mock-data";
import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";
import { buildRecommendationNotices } from "@/libs/jeongsi/report/build";
import type { JeongsiInput } from "@/libs/jeongsi/types";

/** JSON 로딩 때문에 기본 5초로는 빠듯할 수 있다 */
const TIMEOUT_MS = 30_000;

/** 실데이터 교체 전 개발용 샘플 데이터 (2026-10 동결) */
const readFixture = async (name: string): Promise<unknown> =>
  JSON.parse(
    await readFile(path.join(__dirname, "fixtures", `${name}.json`), "utf-8")
  ) as unknown;

const SAMPLE_DATA_SOURCE: JeongsiDataSource = {
  readAdmissionPlans: () => readFixture("sample-admission-plans"),
  readAdmissionResults: () => readFixture("sample-admission-results"),
};

/**
 * 목 객체를 그대로 넘기면 analyzeJeongsi 결과의 input 이 목과 같은 참조가 되어,
 * 아래에서 target 을 바꿀 때 목 자체가 오염된다. 항상 복제해서 넘긴다.
 */
const cloneInput = (input: JeongsiInput): JeongsiInput =>
  JSON.parse(JSON.stringify(input)) as JeongsiInput;

const readMockNotices = (
  content: JeongsiReportContent,
  label: string
): string[] => {
  const section = content.sections.find(
    (item) => item.sectionId === "jeongsiRecommendation"
  );
  if (section === undefined || section.sectionId !== "jeongsiRecommendation") {
    throw new Error(`${label}: jeongsiRecommendation 섹션을 찾지 못했습니다.`);
  }
  return section.notices;
};

/** 실패 메시지에 그대로 복사해 붙일 수 있는 형태로 찍는다 */
const asPasteBlock = (notices: string[], indent: string): string => {
  if (notices.length === 0) {
    return `${indent}notices: [],`;
  }
  return [
    `${indent}notices: [`,
    ...notices.map((notice) => `${indent}  ${JSON.stringify(notice)},`),
    `${indent}],`,
  ].join("\n");
};

const expectNoticesMatch = (
  label: string,
  mockNotices: string[],
  generated: string[],
  indent: string
): void => {
  try {
    expect(mockNotices).toEqual(generated);
  } catch (error) {
    throw new Error(
      [
        `${label}: mock 의 notices 가 buildRecommendationNotices() 출력과 다릅니다.`,
        "",
        "아래 블록을 libs/jeongsi/mock-data.ts 의 해당 notices 에 그대로 붙여넣으세요:",
        "",
        asPasteBlock(generated, indent),
        "",
        (error as Error).message,
      ].join("\n")
    );
  }
};

/** 픽스처의 meta.input 을 그대로 돌려 비교하는 표준 경로 */
const expectGeneratedFromOwnInput = async (
  label: string,
  content: JeongsiReportContent,
  indent: string
): Promise<void> => {
  const analysis = await analyzeJeongsi(cloneInput(content.meta.input));
  expectNoticesMatch(
    label,
    readMockNotices(content, label),
    buildRecommendationNotices(analysis),
    indent
  );
};

describe("mock-data 의 notices 는 생성 함수 출력과 일치해야 한다", () => {
  it(
    "기본 픽스처",
    async () => {
      await expectGeneratedFromOwnInput("기본", JEONGSI_MOCK_REPORT, "  ");
    },
    TIMEOUT_MS
  );

  /**
   * 지원 불가 픽스처만 개발용 샘플 데이터(fixtures/sample-*.json)로 돌린다.
   *
   * 2027 실데이터에서는 고려대·부산대·경북대 등 의예과가 수학·탐구 지정을
   * 폐지해, 확률과통계+사탐 응시자도 의예과에 지원할 수 있다. 이 입력으로는
   * 지원 불가 경로가 재현되지 않으므로(아래 테스트가 고정), 그 경로의 문구는
   * 지정과목 제한이 남아 있던 샘플 데이터로 검증한다.
   */
  it(
    "지원 불가 픽스처 (샘플 데이터)",
    async () => {
      setJeongsiDataSource(SAMPLE_DATA_SOURCE);
      try {
        await expectGeneratedFromOwnInput(
          "지원 불가",
          JEONGSI_MOCK_REPORT_BLOCKED,
          "      "
        );
      } finally {
        resetJeongsiDataSource();
      }
    },
    TIMEOUT_MS
  );

  it(
    "지원 불가 픽스처의 입력은 실데이터에서 지원 불가가 아니다",
    async () => {
      const analysis = await analyzeJeongsi(
        cloneInput(JEONGSI_MOCK_REPORT_BLOCKED.meta.input)
      );

      expect(analysis.selection.blockedByRestrictions).toBe(false);
    },
    TIMEOUT_MS
  );

  it(
    "의약 극상위 픽스처",
    async () => {
      await expectGeneratedFromOwnInput(
        "의약 극상위",
        JEONGSI_MOCK_REPORT_MEDICAL,
        "      "
      );
    },
    TIMEOUT_MS
  );

  /**
   * 극단 픽스처만 경로가 다르다.
   *
   * 이 픽스처는 레이아웃 스트레스용이라 밴드 구성을 손으로 짰고, 그래서
   * meta.input 을 엔진에 돌린 결과와 밴드가 다르다. 그 입력으로 돌리면 후보가
   * 전부 걸러져 밴드가 비는데, 목록이 비면 생성 함수는 확대·대체 안내를
   * 내보내지 않으므로 notices 가 [] 로 끝난다(아래 테스트가 이를 고정한다).
   *
   * 반면 목이 그리려는 화면은 "상향·적정에 항목이 있고, 긴 안내 문구가 2건
   * 붙은" 상태다. 그래서 그 상황을 명시적으로 세운 뒤 문구를 다시 만들어
   * 비교한다. 문구 템플릿이 바뀌면 여기서 걸린다.
   */
  it(
    "극단 픽스처 — poolStage 2 + 적정 근접 대체 상황을 세워 비교",
    async () => {
      const analysis = await analyzeJeongsi(
        cloneInput(JEONGSI_MOCK_REPORT.meta.input)
      );

      analysis.input.preference.target =
        JEONGSI_MOCK_REPORT_EDGE.meta.input.preference.target;
      analysis.selection.poolStage = 2;
      analysis.selection.moderateBandSubstituted = true;

      expect(analysis.recommendations.적정.length).toBeGreaterThan(0);

      expectNoticesMatch(
        "극단",
        readMockNotices(JEONGSI_MOCK_REPORT_EDGE, "극단"),
        buildRecommendationNotices(analysis),
        "  "
      );
    },
    TIMEOUT_MS
  );

  /**
   * 위 극단 테스트가 왜 우회 경로를 쓰는지 고정해 둔다.
   * 이 전제가 깨지면(= 엔진이 그 입력에서 추천을 내기 시작하면)
   * 극단 픽스처는 우회 없이 표준 경로로 검사해야 한다.
   */
  it(
    "극단 픽스처의 입력은 추천이 비어 생성 함수가 빈 배열을 돌려준다",
    async () => {
      const analysis = await analyzeJeongsi(
        cloneInput(JEONGSI_MOCK_REPORT_EDGE.meta.input)
      );

      const total =
        analysis.recommendations.상향.length +
        analysis.recommendations.적정.length +
        analysis.recommendations.안정.length;

      expect(total).toBe(0);
      expect(buildRecommendationNotices(analysis)).toEqual([]);
    },
    TIMEOUT_MS
  );
});
