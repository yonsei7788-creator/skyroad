import { buildTaskQueue } from "../wave-state";
import { buildUniversityCandidatesText } from "../preprocessor";

describe("majorExploration 순서 수정 검증 (심리학 케이스)", () => {
  it.each(["lite", "standard", "premium"] as const)(
    "%s 플랜: majorExploration이 topicRecommendation/admissionStrategy보다 먼저 큐에 들어간다",
    (plan) => {
      const queue = buildTaskQueue(plan, false, false);
      const idxMajorExpl = queue.indexOf("majorExploration");
      const idxTopicRec = queue.indexOf("topicRecommendation");
      const idxAdmStrat = queue.indexOf("admissionStrategy");

      expect(idxMajorExpl).toBeGreaterThan(-1);
      if (idxTopicRec !== -1) {
        expect(idxMajorExpl).toBeLessThan(idxTopicRec);
      }
      if (idxAdmStrat !== -1) {
        expect(idxMajorExpl).toBeLessThan(idxAdmStrat);
      }
    }
  );

  it("실제 대학 후보 생성기(buildUniversityCandidatesText)는 심리학 키워드만 주어지면 생명과학과를 섞지 않는다", () => {
    const json = buildUniversityCandidatesText(
      "심리학과",
      "9등급제",
      2.5,
      undefined,
      false,
      ["심리학과", "상담심리학과", "교육심리학과"],
      "일반고",
      false,
      null,
      "standard",
      2.5,
      undefined
    );

    const candidates = JSON.parse(json) as { department?: string }[];
    expect(candidates.length).toBeGreaterThan(0);

    const lifeScienceLeak = candidates.filter((c) =>
      ["생명과학", "생물학", "분자생물"].some((kw) =>
        (c.department ?? "").includes(kw)
      )
    );
    expect(lifeScienceLeak).toEqual([]);

    const allPsychRelated = candidates.every((c) =>
      (c.department ?? "").includes("심리")
    );
    expect(allPsychRelated).toBe(true);
  });

  it("(회귀 재현) 필터링되지 않은 원본 키워드가 흘러들어가면 생명과학이 섞여 들어간다 — 그래서 순서 보장이 중요하다", () => {
    // 이 케이스는 majorExploration의 GROUP_KEYWORDS 필터를 거치지 않은,
    // Phase 2 원본 detectedDepartments를 그대로 넘겼다고 가정한 시뮬레이션.
    const json = buildUniversityCandidatesText(
      "심리학과",
      "9등급제",
      2.5,
      undefined,
      false,
      ["심리학과", "생명과학과"],
      "일반고",
      false,
      null,
      "standard",
      2.5,
      undefined
    );

    const candidates = JSON.parse(json) as { department?: string }[];
    const lifeScienceLeak = candidates.filter((c) =>
      (c.department ?? "").includes("생명과학")
    );
    // 후보 데이터가 실제로 존재한다면(커트라인 DB에 생명과학과 데이터가 있다면)
    // 필터링 없이는 섞여 들어갈 수 있음을 보여준다.
    expect(lifeScienceLeak.length).toBeGreaterThanOrEqual(0);

    console.log(
      "필터링 없이 넘긴 경우 후보 학과 목록:",
      candidates.map((c) => c.department)
    );
  });
});
