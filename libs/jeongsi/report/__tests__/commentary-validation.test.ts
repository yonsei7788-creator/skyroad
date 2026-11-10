import {
  collectNumbers,
  composeChanceSentence,
  composeGapClause,
  ensureUniqueSentences,
  findForeignUniversityNames,
  findMismatchedAreaScores,
  findTextViolations,
  findUngroundedNumbers,
  findWeaknessCalledStrength,
  keepFrameSentences,
  resolveSlots,
  splitSentences,
  type CommentarySlot,
} from "../commentary-validation";

describe("splitSentences", () => {
  it("소수점은 문장 끝으로 보지 않는다", () => {
    // Arrange
    const text = "평균 백분위 94.8입니다. 수학이 강점입니다.";

    // Act & Assert
    expect(splitSentences(text)).toEqual([
      "평균 백분위 94.8입니다.",
      "수학이 강점입니다.",
    ]);
  });
});

describe("findTextViolations", () => {
  it("문장 수·글자 수·금지 표현·소재 이름·해석 문구를 검사한다", () => {
    // Arrange
    const text =
      "활용지표 — 표준점수를 써 카드로 삼기 좋습니다. 둘째 문장입니다.";

    // Act
    const problems = findTextViolations(text, {
      sentences: 1,
      maxChars: 20,
      requiredAnyOf: ["당해 지원자 분포에 따라 결과가 갈리는 구조"],
    });

    // Assert
    expect(problems).toEqual([
      "문장 1개로 씁니다",
      "20자 이내로 씁니다",
      "담백한 표현(도움이 됩니다, 유리하게 작용합니다, 보완합니다 등)으로 씁니다",
      "소재 이름 없이 값으로 문장을 시작합니다",
      '"당해 지원자 분포에 따라 결과가 갈리는 구조입니다"로 문장을 맺습니다',
    ]);
  });

  it("규칙을 지킨 문장은 위반이 없다", () => {
    // Arrange / Act
    const problems = findTextViolations("수학을 40% 반영합니다.", {
      sentences: 1,
      maxChars: 70,
    });

    // Assert
    expect(problems).toEqual([]);
  });
});

describe("composeGapClause", () => {
  it("격차 부호에 맞춰 넘겨·모자라를 쓰고 소수 첫째 자리로 적는다", () => {
    // Arrange & Act & Assert
    expect(composeGapClause(4.24)).toBe("기준컷을 4.2백분위점 넘겨");
    expect(composeGapClause(-1.26)).toBe("기준컷에 1.3백분위점 모자라");
    expect(composeGapClause(0.02)).toBe("기준컷과 같은 수준으로");
    expect(composeGapClause(null)).toBe(
      "공개 기준컷이 없어 반영방식과 모집 규모로 판단한 구분으로"
    );
  });

  it("해석 문구를 붙여 한 문장으로 맺는다", () => {
    // Arrange & Act & Assert
    expect(
      composeChanceSentence(
        -0.4,
        "지원은 가능하나 결과를 단정하기 어려운 라인입니다"
      )
    ).toBe(
      "기준컷에 0.4백분위점 모자라, 지원은 가능하나 결과를 단정하기 어려운 라인입니다."
    );
  });
});

describe("resolveSlots", () => {
  const createItemSlot = (index: number, text: string): CommentarySlot => ({
    target: { field: "reason", index },
    text,
    rule: { sentences: 1, maxChars: 30 },
    finalize: (raw) => raw.trim(),
    fallback: () => `폴백 ${index}입니다.`,
  });

  it("모두 규칙을 지키면 다시 요청하지 않는다", async () => {
    // Arrange
    const requestRepair = jest.fn();

    // Act
    const texts = await resolveSlots(
      [
        createItemSlot(0, "첫째 해설입니다."),
        createItemSlot(1, "둘째 해설입니다."),
      ],
      { requestRepair }
    );

    // Assert
    expect(texts).toEqual(["첫째 해설입니다.", "둘째 해설입니다."]);
    expect(requestRepair).not.toHaveBeenCalled();
  });

  it("위반 칸만 다시 요청하고, 다시 받은 문장이 규칙을 지키면 쓴다", async () => {
    // Arrange
    const requestRepair = jest.fn().mockResolvedValue({
      fields: new Map(),
      items: new Map([["reason", new Map([[1, "  고친 해설입니다. "]])]]),
    });

    // Act
    const texts = await resolveSlots(
      [
        createItemSlot(0, "첫째 해설입니다."),
        createItemSlot(1, "둘째 해설입니다. 덧붙인 문장입니다."),
      ],
      { requestRepair }
    );

    // Assert
    expect(texts).toEqual(["첫째 해설입니다.", "고친 해설입니다."]);
    expect(requestRepair.mock.calls[0][0]).toHaveLength(1);
  });

  it("다시 받은 문장도 어기거나 응답이 없으면 폴백을 쓴다", async () => {
    // Arrange
    const requestRepair = jest.fn().mockResolvedValue(null);

    // Act
    const texts = await resolveSlots(
      [createItemSlot(0, "첫째 해설입니다. 덧붙인 문장입니다.")],
      { requestRepair }
    );

    // Assert
    expect(texts).toEqual(["폴백 0입니다."]);
  });
});

describe("findTextViolations — 수능 이후 조언", () => {
  it("성적을 바꾸라는 조언을 위반으로 본다", () => {
    // Arrange / Act
    const problems = findTextViolations(
      "탐구 반영 비율이 높아 성적 관리가 중요합니다.",
      { sentences: 1, maxChars: 120 }
    );

    // Assert
    expect(problems).toEqual(["원서 선택과 지원 판단으로 문장을 맺습니다"]);
  });
});

describe("findWeaknessCalledStrength", () => {
  it("약점 영역만 나온 문장에서 강점이라고 쓰면 위반이다", () => {
    // Arrange
    const text =
      "탐구 과목별 3% 가산점은 표준점수 66.5점의 강점을 더욱 부각시킵니다.";

    // Act & Assert
    expect(findWeaknessCalledStrength(text, ["수학"], ["탐구"])).toEqual([
      "탐구 영역은 이 학생의 약점 영역이므로, 약점 영역 기준으로 서술합니다",
    ]);
    expect(
      findWeaknessCalledStrength(
        "과탐 가산점이 강점을 키웁니다.",
        ["수학"],
        ["탐구"]
      )
    ).toHaveLength(1);
  });

  it("강점 영역이 함께 나오거나 '강점 영역'을 가리키면 위반이 아니다", () => {
    // Arrange & Act & Assert
    expect(
      findWeaknessCalledStrength(
        "탐구 부담이 적어 수학 강점을 크게 살립니다.",
        ["수학"],
        ["탐구"]
      )
    ).toEqual([]);
    expect(
      findWeaknessCalledStrength(
        "탐구 반영이 0%라 강점 영역에 집중할 수 있습니다.",
        ["수학"],
        ["탐구"]
      )
    ).toEqual([]);
  });
});

describe("keepFrameSentences", () => {
  it("문장이 넘치면 앞 문장들과 마지막 결론 문장을 남긴다", () => {
    // Arrange
    const text = "하나입니다. 둘입니다. 셋입니다. 넷입니다. 결론입니다.";

    // Act & Assert
    expect(keepFrameSentences(text, 3)).toBe(
      "하나입니다. 둘입니다. 결론입니다."
    );
    expect(keepFrameSentences("하나입니다. 둘입니다.", 3)).toBe(
      "하나입니다. 둘입니다."
    );
  });
});

describe("ensureUniqueSentences", () => {
  it("앞 칸에 나온 문장과 똑같은 문장은 그 위치의 다른 문장으로 바꾼다", () => {
    // Arrange
    const entries = [
      { text: "수학 비중이 큽니다. 기준컷을 넘깁니다." },
      {
        text: "수학 비중이 큽니다. 탐구 손실이 적습니다.",
        alternatives: [["수학 반영이 높은 축입니다."], []],
      },
    ];

    // Act
    const result = ensureUniqueSentences(entries);

    // Assert
    expect(result[1]).toBe("수학 반영이 높은 축입니다. 탐구 손실이 적습니다.");
  });

  it("같은 단어를 다시 쓴 문장은 반복으로 보지 않는다", () => {
    // Arrange
    const entries = [
      { text: "수학 비중이 큽니다." },
      { text: "수학 비중이 가장 큽니다." },
    ];

    // Act & Assert
    expect(ensureUniqueSentences(entries)).toEqual([
      "수학 비중이 큽니다.",
      "수학 비중이 가장 큽니다.",
    ]);
  });

  it("바꿀 문장이 규칙을 어기면 건너뛰고 다음 문장을 쓴다", () => {
    // Arrange
    const entries = [
      { text: "가. 나." },
      {
        text: "가. 다.",
        rule: { sentences: 2, maxChars: 10 },
        alternatives: [["아주 길어서 상한을 넘는 문장입니다.", "라."], []],
      },
    ];

    // Act & Assert
    expect(ensureUniqueSentences(entries)[1]).toBe("라. 다.");
  });

  it("바꿀 문장이 없으면 반복 문장을 빼고 알린다", () => {
    // Arrange
    const onUnresolved = jest.fn();
    const entries = [{ text: "가. 나." }, { text: "가. 다." }];

    // Act
    const result = ensureUniqueSentences(entries, onUnresolved);

    // Assert
    expect(result[1]).toBe("다.");
    expect(onUnresolved).toHaveBeenCalledWith({ position: 1, sentence: "가." });
  });
});

describe("findUngroundedNumbers", () => {
  it("그 칸에 준 값만 쓴 문장은 통과한다", () => {
    // Arrange: 편차 1.75 는 프롬프트에 +1.8 로 실린다
    const allowed = collectNumbers("수학 98 137", "1.75", "수학 40%");

    // Act & Assert
    expect(
      findUngroundedNumbers(
        "수학 백분위 98점, 표준점수 137점, 평균 대비 +1.8점이며 수학 40%입니다.",
        allowed
      )
    ).toEqual([]);
  });

  it("입력과 다른 점수나 다른 대학의 값은 위반으로 돌려준다", () => {
    // Arrange
    const allowed = collectNumbers("수학 98 137", "수학 40%");

    // Act
    const problems = findUngroundedNumbers(
      "수학 백분위 97점에 수학 35%를 반영합니다.",
      allowed
    );

    // Assert
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("97, 35");
  });
});

describe("findMismatchedAreaScores", () => {
  const scores = [
    { label: "국어", percentile: 84, standardScore: 120 },
    { label: "영어", percentile: 92.5, standardScore: null },
  ];

  it("영역에 붙인 성적이 그 영역의 실제 값이면 통과한다", () => {
    // Act & Assert
    expect(
      findMismatchedAreaScores("국어 백분위 84점, 영어 백분위 92.5점", scores)
    ).toEqual([]);
  });

  it("다른 영역의 값을 붙이면 위반으로 돌려준다", () => {
    // Act
    const problems = findMismatchedAreaScores(
      "강점인 영어 백분위 84점이 반영됩니다.",
      scores
    );

    // Assert
    expect(problems).toEqual(["영어 백분위는 92.5 그대로 씁니다"]);
  });

  it("표준점수가 없는 영역에 표준점수를 붙이면 위반이다", () => {
    // Act & Assert
    expect(
      findMismatchedAreaScores("영어 표준점수 130점", scores)
    ).toHaveLength(1);
  });
});

describe("findForeignUniversityNames", () => {
  it("그 칸 재료에 없는 대학 이름을 돌려준다", () => {
    // Arrange
    const allowed = "국민대학교 경영정보학부(자연)";

    // Act
    const problems = findForeignUniversityNames(
      "여유가 두 번째인 중앙대학교 경영학과는 기준컷을 넘깁니다.",
      allowed
    );

    // Assert
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("중앙대학교");
  });

  it("재료에 있는 대학 이름은 통과한다", () => {
    // Act & Assert
    expect(
      findForeignUniversityNames(
        "국민대학교와 반영 구조가 같습니다.",
        "건국대학교 국민대학교와 같은 반영비율"
      )
    ).toEqual([]);
  });
});
