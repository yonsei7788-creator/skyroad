import {
  loadAdmissionPlans,
  loadAdmissionResultIndex,
  resetJeongsiDataSource,
} from "../../data";
import { findResults } from "../analyze";
import {
  GAP_BANDS,
  GAP_BAND_PASS_RATES,
  SNIPING_MIN_GAP,
  SNIPING_PASS_RATE_MIN,
} from "../classify";
import { buildCutMovement, passRateFor } from "../cut-movement";
import { makePlan, makeResult } from "./fixtures";

describe("buildCutMovement", () => {
  it("2025 기준컷 대비 2026 컷 이동을 격차 단위로 잰다", () => {
    // Arrange
    // 만점 1000 → 격차 1 = 10점. 880 → 895 는 +1.5
    const plan = makePlan({ id: "A-컴퓨터공학과-가" });
    const results = [
      makeResult({
        admissionYear: 2025,
        cut70: { metric: "convertedScore", value: 880 },
      }),
      makeResult({
        admissionYear: 2026,
        cut70: { metric: "convertedScore", value: 895 },
      }),
    ];

    // Act
    const movement = buildCutMovement([plan], () => results);

    // Assert
    expect(movement.deltas).toEqual([1.5]);
    expect(passRateFor(movement, 1.5)).toBe(1);
    expect(passRateFor(movement, 1.4)).toBe(0);
  });

  it("한 해만 있거나 지표가 다르면 쓰지 않는다", () => {
    // Arrange
    const plan = makePlan({ id: "B-컴퓨터공학과-가" });
    const mixed = [
      makeResult({
        admissionYear: 2025,
        cut70: { metric: "percentile", value: 90 },
      }),
      makeResult({
        admissionYear: 2026,
        cut70: { metric: "convertedScore", value: 880 },
      }),
    ];

    // Act
    const movement = buildCutMovement([plan], () => mixed);

    // Assert
    expect(movement.deltas).toEqual([]);
    expect(passRateFor(movement, 3)).toBeNull();
  });
});

describe("판정 구간 — 실데이터 실측 대조", () => {
  afterEach(() => resetJeongsiDataSource());

  it("구간 경계가 실측 통과율(10·40·75·90%)과 맞는다", async () => {
    // Arrange
    const [plans, index] = await Promise.all([
      loadAdmissionPlans(),
      loadAdmissionResultIndex(),
    ]);

    // Act
    const movement = buildCutMovement(plans, (plan) =>
      findResults(index, plan)
    );

    // Assert — 경계의 실측 통과율이 정한 비율에서 3%p 안이어야 한다
    expect(movement.deltas.length).toBeGreaterThan(300);
    (Object.keys(GAP_BANDS) as (keyof typeof GAP_BANDS)[]).forEach((key) => {
      const rate = passRateFor(movement, GAP_BANDS[key]) ?? 0;
      expect(Math.abs(rate - GAP_BAND_PASS_RATES[key])).toBeLessThanOrEqual(
        0.03
      );
    });
  });

  it("소신 하한의 실측 통과율이 안내하는 비율과 맞는다", async () => {
    // Arrange
    const [plans, index] = await Promise.all([
      loadAdmissionPlans(),
      loadAdmissionResultIndex(),
    ]);

    // Act
    const movement = buildCutMovement(plans, (plan) =>
      findResults(index, plan)
    );

    // Assert
    const rate = passRateFor(movement, SNIPING_MIN_GAP) ?? 0;
    expect(Math.abs(rate - SNIPING_PASS_RATE_MIN)).toBeLessThanOrEqual(0.03);
  });

  it("실측 표본은 환산점수 입결이고 세 학년도 모집군이 같은 곳만 쓴다", () => {
    // Arrange — 2026 에 군이 바뀐 곳, 백분위 입결인 곳
    const regrouped = makePlan({ id: "군변경-가", group: "가" });
    const percentile = makePlan({ id: "백분위-가", group: "가" });
    const results: Record<string, ReturnType<typeof makeResult>[]> = {
      "군변경-가": [
        makeResult({ admissionYear: 2025, group: "다" }),
        makeResult({ admissionYear: 2026, group: "가" }),
      ],
      "백분위-가": [2025, 2026].map((year) =>
        makeResult({
          admissionYear: year as 2025 | 2026,
          cut70: { metric: "percentile", value: 90 },
        })
      ),
    };

    // Act
    const movement = buildCutMovement(
      [regrouped, percentile],
      (plan) => results[plan.id] ?? []
    );

    // Assert
    expect(movement.deltas).toEqual([]);
  });
});
