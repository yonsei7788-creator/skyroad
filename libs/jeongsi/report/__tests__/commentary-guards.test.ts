import {
  countByTier,
  formatCardAllocation,
  normalizeCardAllocation,
  normalizeChanceWording,
  normalizeEnglishCitation,
  normalizeGapDirection,
  normalizeRatioCitation,
  normalizeTierCounts,
  normalizeWeightCitation,
  parseSimpleRatio,
  sanitizeCommentaryTone,
  sanitizeJeongsiTone,
  stripLeadingSubject,
  stripTopicLabel,
} from "../commentary-guards";

describe("formatCardAllocation", () => {
  it("성향별 배분은 항상 3장이다", () => {
    // Arrange & Act & Assert
    expect(formatCardAllocation("균형")).toBe("상향 1장, 적정 1장, 안정 1장");
    expect(formatCardAllocation("공격")).toBe("상향 2장, 적정 1장");
    expect(formatCardAllocation("안정")).toBe("적정 2장, 안정 1장");
  });
});

describe("normalizeCardAllocation", () => {
  it("합이 3장이 아닌 배분을 성향 배분으로 고친다", () => {
    // Arrange
    const text =
      "균형 성향에 맞춰 상향 1장, 적정 1장, 안정 2장으로 배분합니다.";

    // Act
    const result = normalizeCardAllocation(text, "균형");

    // Assert
    expect(result).toBe(
      "균형 성향에 맞춰 상향 1장, 적정 1장, 안정 1장으로 배분합니다."
    );
  });

  it("합이 3장이면 표현을 그대로 둔다", () => {
    // Arrange
    const text = "상향 2장과 적정 1장으로 씁니다.";

    // Act & Assert
    expect(normalizeCardAllocation(text, "균형")).toBe(text);
  });
});

describe("normalizeWeightCitation", () => {
  it("가중합 대학의 퍼센트 인용을 가중치로 고친다", () => {
    // Arrange
    const text = "수학 반영비율 120%인 고려대에서 유리합니다.";

    // Act
    const result = normalizeWeightCitation(
      text,
      "국100·수120·탐80(탐구 과목별 합) 가중합"
    );

    // Assert
    expect(result).toBe("수학 가중치 120인 고려대에서 유리합니다.");
  });

  it("가중치 뒤에 붙은 퍼센트도 고친다", () => {
    // Arrange
    const text = "수학 표준점수 가중치 120% 반영은 강점입니다.";

    // Act
    const result = normalizeWeightCitation(
      text,
      "국100·수120·탐100(탐구 과목별 합) 가중합"
    );

    // Assert
    expect(result).toBe("수학 표준점수 가중치 120 반영은 강점입니다.");
  });

  it("비율 대학의 퍼센트 인용은 건드리지 않는다", () => {
    // Arrange
    const text = "수학 반영비율 40%인 대학입니다.";

    // Act & Assert
    expect(normalizeWeightCitation(text, "국30·수40·영10·탐20")).toBe(text);
  });
});

describe("normalizeChanceWording", () => {
  it("라벨 원문을 띄어 쓴 문장 표기로 바꾼다", () => {
    // Arrange & Act & Assert
    expect(normalizeChanceWording("합격 가능성 매우낮음입니다.")).toBe(
      "합격 가능성 매우 낮음입니다."
    );
  });

  it("라벨보다 센 강도 표현을 라벨에 맞춘다", () => {
    // Arrange
    const text = "매우 높은 합격 가능성을 가진 안정판입니다.";

    // Act & Assert
    expect(normalizeChanceWording(text, "높음")).toBe(
      "높은 합격 가능성을 가진 안정판입니다."
    );
    expect(
      normalizeChanceWording("기준컷을 웃도는 매우 안전한 지원입니다.", "높음")
    ).toBe("기준컷을 웃도는 안전한 지원입니다.");
    expect(normalizeChanceWording("매우 낮은 가능성입니다.", "낮음")).toBe(
      "낮은 가능성입니다."
    );
    expect(normalizeChanceWording("매우 낮은 가능성입니다.", "매우낮음")).toBe(
      "매우 낮은 가능성입니다."
    );
  });
});

describe("parseSimpleRatio", () => {
  it("고정 비율 표기를 영역별 비율로 푼다", () => {
    // Arrange & Act
    const ratios = parseSimpleRatio("국35·수35·탐30");

    // Assert
    expect(ratios && [...ratios]).toEqual([
      ["국어", 35],
      ["수학", 35],
      ["탐구", 30],
    ]);
  });

  it("상위순·가중합 표기는 풀지 않는다", () => {
    // Arrange & Act & Assert
    expect(parseSimpleRatio("영20 / 국·수·탐 중 상위순 40·40")).toBeNull();
    expect(
      parseSimpleRatio("국100·수120·탐100(탐구 과목별 합) 가중합")
    ).toBeNull();
  });
});

describe("normalizeRatioCitation", () => {
  it("국수탐을 같은 비율로 뭉뚱그린 인용을 실제 비율로 고친다", () => {
    // Arrange
    const text = "국수탐 35%씩 반영하는 방식은 균등합니다.";

    // Act
    const result = normalizeRatioCitation(text, "국35·수35·탐30");

    // Assert
    expect(result).toBe(
      "국어 35%·수학 35%·탐구 30% 반영하는 방식은 균등합니다."
    );
  });

  it("영역 비율을 틀리게 인용하면 실제 값으로 고친다", () => {
    // Arrange
    const text = "수학 반영 비율이 40%로 높습니다.";

    // Act & Assert
    expect(normalizeRatioCitation(text, "국25·수35·영15·탐25")).toBe(
      "수학 반영 비율이 35%로 높습니다."
    );
  });

  it("맞게 인용한 비율과 가산점 표현은 그대로 둔다", () => {
    // Arrange
    const text = "수학 반영비율 35%와 과탐 가산점 3%는 유리합니다.";

    // Act & Assert
    expect(normalizeRatioCitation(text, "국30·수35·영15·탐20")).toBe(text);
  });
});

describe("normalizeTierCounts", () => {
  const counts = countByTier([
    { tier: "상향" },
    { tier: "적정" },
    { tier: "적정" },
    { tier: "적정" },
    { tier: "안정" },
  ]);

  it("원서를 말하는 문장의 대학 수 표현을 원서 배분으로 바꾼다", () => {
    // Arrange
    const text =
      "상향 1곳, 적정 2곳, 안정 3곳으로 구성한 3장의 원서는 균형 성향에 맞습니다.";

    // Act
    const result = normalizeTierCounts(text, counts, "균형");

    // Assert
    expect(result).toBe(
      "상향 1장, 적정 1장, 안정 1장으로 구성한 3장의 원서는 균형 성향에 맞습니다."
    );
  });

  it("같은 문장에 원서가 있어도 목록을 말하는 대학 수는 목록 수로 고친다", () => {
    // Arrange
    const text =
      "상향 1곳, 적정 2곳, 안정 3곳으로 구성된 지원 가능 대학 목록은 상향 1장, 적정 1장, 안정 1장으로 원서를 배분하는 전략에 맞습니다.";

    // Act
    const result = normalizeTierCounts(text, counts, "균형");

    // Assert
    expect(result).toBe(
      "상향 1곳, 적정 3곳, 안정 1곳으로 구성된 지원 가능 대학 목록은 상향 1장, 적정 1장, 안정 1장으로 원서를 배분하는 전략에 맞습니다."
    );
  });

  it("목록 대학 수를 틀리게 쓰면 실제 수로 고친다", () => {
    // Arrange
    const text = "목록에는 적정 2곳과 안정 3곳이 있습니다.";

    // Act & Assert
    expect(normalizeTierCounts(text, counts, "균형")).toBe(
      "목록에는 적정 3곳과 안정 1곳이 있습니다."
    );
  });
});

describe("normalizeGapDirection", () => {
  it("기준컷에 못 미친 항목을 넘었다고 쓰면 방향을 고친다", () => {
    // Arrange
    const text = "기준컷을 1.3백분위점 넘겨, 소신 지원으로 걸어 볼 만합니다.";

    // Act & Assert
    expect(normalizeGapDirection(text, -1.3)).toBe(
      "기준컷에 1.3백분위점 모자라, 소신 지원으로 걸어 볼 만합니다."
    );
  });

  it("기준컷을 넘은 항목을 모자라다고 쓰면 방향과 크기를 고친다", () => {
    // Arrange
    const text = "기준컷에 0.5백분위점 모자라 주력 지원처입니다.";

    // Act & Assert
    expect(normalizeGapDirection(text, 0.4)).toBe(
      "기준컷을 0.4백분위점 넘겨 주력 지원처입니다."
    );
  });

  it("방향이 맞는 표현은 그대로 둔다", () => {
    // Arrange
    const above = "기준컷을 12.2백분위점 상회하며, 여유가 많습니다.";
    const below = "기준컷 대비 1.3백분위점 낮아 소신 지원에 가깝습니다.";

    // Act & Assert
    expect(normalizeGapDirection(above, 12.2)).toBe(above);
    expect(normalizeGapDirection(below, -1.3)).toBe(below);
  });
});

describe("sanitizeCommentaryTone", () => {
  it("응답 JSON 의 모든 문자열에서 AI 클리셰를 바꾼다", () => {
    // Arrange
    const raw = {
      overallComment: "수학 강점을 극대화합니다.",
      items: [{ index: 0, reason: "환산점수에 기여합니다." }],
    };

    // Act & Assert
    expect(sanitizeCommentaryTone(raw)).toEqual({
      overallComment: "수학 강점을 크게 살립니다.",
      items: [{ index: 0, reason: "환산점수에 도움이 됩니다." }],
    });
  });
});

describe("normalizeEnglishCitation", () => {
  const summary =
    "영어 감산(1등급 0 · 2등급 3 · 3등급 6) / 한국사 감산(1등급 0 · 2등급 0 · 3등급 0)";

  it("영어 등급별 감점을 틀리게 인용하면 실제 점수로 고친다", () => {
    // Arrange
    const text = "영어 2등급 감점이 0.4점이라 영어 부담이 적습니다.";

    // Act & Assert
    expect(normalizeEnglishCitation(text, summary)).toBe(
      "영어 2등급 감점이 3점이라 영어 부담이 적습니다."
    );
  });

  it("맞게 인용한 점수는 그대로 둔다", () => {
    // Arrange
    const text = "영어 3등급 감점은 6점입니다.";

    // Act & Assert
    expect(normalizeEnglishCitation(text, summary)).toBe(text);
  });
});

describe("sanitizeJeongsiTone", () => {
  it("지시대명사로 여는 문장의 첫머리를 걷어 낸다", () => {
    // Arrange
    const text =
      "탐구 백분위가 낮습니다. 이는 탐구 비율이 높은 대학에서 손실입니다.";

    // Act & Assert
    expect(sanitizeJeongsiTone(text)).toBe(
      "탐구 백분위가 낮습니다. 탐구 비율이 높은 대학에서 손실입니다."
    );
  });
});

describe("sanitizeJeongsiTone — 서열 표현", () => {
  it("대학·성적을 서열로 묶는 표현을 바꾼다", () => {
    // Arrange
    const text = "평균 백분위 94.8은 상위권 대학 지원에 유리한 성적대입니다.";

    // Act & Assert
    expect(sanitizeJeongsiTone(text)).toBe(
      "평균 백분위 94.8은 희망 대학 지원에 유리한 성적대입니다."
    );
  });
});

describe("stripTopicLabel", () => {
  it("해설 첫머리에 베껴 붙은 소재 이름을 걷어 낸다", () => {
    // Arrange
    const text =
      "연도별 컷의 흐름 — 2024 96.22 → 2026 96, 하락 후 반등했지만 기준컷에 1.3백분위점 모자랍니다.";

    // Act & Assert
    expect(stripTopicLabel(text)).toBe(
      "2024 96.22 → 2026 96, 하락 후 반등했지만 기준컷에 1.3백분위점 모자랍니다."
    );
    expect(stripTopicLabel("가군 적정 원서로, 기준컷을 넘깁니다.")).toBe(
      "가군 적정 원서로, 기준컷을 넘깁니다."
    );
  });
});

describe("stripLeadingSubject", () => {
  it("해설 첫머리의 대학·학과 주어를 걷어 낸다", () => {
    // Arrange
    const text =
      "국민대학교 소프트웨어학부는 수학 반영 비율이 40%로 가장 높습니다.";

    // Act & Assert
    expect(stripLeadingSubject(text, "국민대학교")).toBe(
      "수학 반영 비율이 40%로 가장 높습니다."
    );
    // 모델이 "(자연)" 을 떼고 쓴 학과명도 걷어 낸다
    expect(
      stripLeadingSubject(
        "동국대학교 컴퓨터·AI학부는 탐구를 25% 반영합니다.",
        "동국대학교"
      )
    ).toBe("탐구를 25% 반영합니다.");
    expect(
      stripLeadingSubject(
        "국민대학교 전자공학부 지능형반도체융합전자전공은 수학을 40% 반영합니다.",
        "국민대학교"
      )
    ).toBe("수학을 40% 반영합니다.");
    expect(
      stripLeadingSubject("동국대학교는 탐구를 25% 반영합니다.", "동국대학교")
    ).toBe("탐구를 25% 반영합니다.");
  });

  it("주어로 시작하지 않는 문장은 그대로 둔다", () => {
    // Arrange
    const texts = [
      "수학 40% 반영은 국민대학교 소프트웨어학부의 강점입니다.",
      "국민대학교 수학 반영은 40%입니다.",
    ];

    // Act & Assert
    texts.forEach((text) => {
      expect(stripLeadingSubject(text, "국민대학교")).toBe(text);
    });
  });
});

describe("sanitizeJeongsiTone — 극대화·매우 유리", () => {
  it("활용형이 달라도 과장 표현을 바꾼다", () => {
    // Arrange
    const text = "강점을 극대화하거나 매우 유리한 선택지가 됩니다.";

    // Act & Assert
    expect(sanitizeJeongsiTone(text)).toBe(
      "강점을 크게 살리거나 유리한 선택지가 됩니다."
    );
  });
});

describe("정시 해설 보정 — 뜻이 뒤집히는 표현과 학과명 주어", () => {
  it("'0% 반영하지 않는'의 수치를 떼어 이중 부정을 없앤다", () => {
    // Act & Assert
    expect(
      sanitizeJeongsiTone("약점인 국어 영역을 0% 반영하지 않는 구조라")
    ).toBe("약점인 국어 영역을 반영하지 않는 구조라");
    expect(sanitizeJeongsiTone("수학 0%를 반영해 손실이 없습니다.")).toBe(
      "수학 0%를 반영해 손실이 없습니다."
    );
  });

  it("'과'로 끝나는 학과명 주어도 뗀다", () => {
    // Act & Assert
    expect(
      stripLeadingSubject(
        "고려대학교 의예과는 강점인 수학의 표준점수가 그대로 들어갑니다.",
        "고려대학교"
      )
    ).toBe("강점인 수학의 표준점수가 그대로 들어갑니다.");
  });
});
