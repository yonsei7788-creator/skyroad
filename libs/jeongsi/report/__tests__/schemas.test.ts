import {
  JEONGSI_COMMENTARY_FALLBACK,
  parseCombinationCommentary,
  parseRecommendationCommentary,
  parseScoreAnalysisCommentary,
  parseUniversityMatchCommentary,
} from "../schemas";

describe("parseScoreAnalysisCommentary", () => {
  it("정상 응답은 공백을 정리해 그대로 통과시킨다", () => {
    // Arrange
    const raw = {
      overallComment: "  총평입니다.\n  이어지는 문장입니다. ",
      strengthComment: "강점입니다.",
      weaknessComment: "약점입니다.",
    };

    // Act
    const parsed = parseScoreAnalysisCommentary(raw);

    // Assert
    expect(parsed.overallComment).toBe("총평입니다. 이어지는 문장입니다.");
    expect(parsed.strengthComment).toBe("강점입니다.");
  });

  it("응답이 객체가 아니면 세 해설을 모두 폴백 문구로 채운다", () => {
    // Arrange
    const raw = "해설을 JSON 이 아닌 문장으로 돌려준 경우";

    // Act
    const parsed = parseScoreAnalysisCommentary(raw);

    // Assert
    expect(parsed).toEqual({
      overallComment: JEONGSI_COMMENTARY_FALLBACK.scoreOverall,
      strengthComment: JEONGSI_COMMENTARY_FALLBACK.scoreStrength,
      weaknessComment: JEONGSI_COMMENTARY_FALLBACK.scoreWeakness,
    });
  });

  it("일부 필드만 어긋나면 그 필드만 폴백으로 바꾸고 나머지는 살린다", () => {
    // Arrange: strengthComment 는 숫자, weaknessComment 는 누락
    const raw = {
      overallComment: "총평입니다.",
      strengthComment: 42,
    };

    // Act
    const parsed = parseScoreAnalysisCommentary(raw);

    // Assert
    expect(parsed.overallComment).toBe("총평입니다.");
    expect(parsed.strengthComment).toBe(
      JEONGSI_COMMENTARY_FALLBACK.scoreStrength
    );
    expect(parsed.weaknessComment).toBe(
      JEONGSI_COMMENTARY_FALLBACK.scoreWeakness
    );
  });

  it("빈 문자열과 공백만 있는 해설도 폴백으로 바꾼다", () => {
    // Arrange
    const raw = {
      overallComment: "",
      strengthComment: "   \n ",
      weaknessComment: "약점입니다.",
    };

    // Act
    const parsed = parseScoreAnalysisCommentary(raw);

    // Assert
    expect(parsed.overallComment).toBe(
      JEONGSI_COMMENTARY_FALLBACK.scoreOverall
    );
    expect(parsed.strengthComment).toBe(
      JEONGSI_COMMENTARY_FALLBACK.scoreStrength
    );
    expect(parsed.weaknessComment).toBe("약점입니다.");
  });

  it("상한을 넘긴 해설은 마지막 문장 끝에서 자른다", () => {
    // Arrange: 600자 안전 상한을 넘는 응답
    const sentence = "같은 문장이 반복되는 긴 해설입니다.";
    const raw = { overallComment: sentence.repeat(40) };

    // Act
    const parsed = parseScoreAnalysisCommentary(raw);

    // Assert
    expect(parsed.overallComment.length).toBeLessThanOrEqual(600);
    expect(parsed.overallComment.endsWith("다.")).toBe(true);
  });
});

describe("목록 해설 파싱", () => {
  it("index 를 키로 해설을 매핑한다", () => {
    // Arrange
    const raw = {
      overallComment: "총평입니다.",
      items: [
        { index: 2, reason: "세 번째입니다." },
        { index: 0, reason: "첫 번째입니다." },
      ],
    };

    // Act
    const parsed = parseUniversityMatchCommentary(raw);

    // Assert
    expect(parsed.overallComment).toBe("총평입니다.");
    expect(parsed.byIndex.get(0)).toBe("첫 번째입니다.");
    expect(parsed.byIndex.get(2)).toBe("세 번째입니다.");
    expect(parsed.byIndex.has(1)).toBe(false);
  });

  it("index 가 문자열이거나 누락돼도 배열 순서로 복구한다", () => {
    // Arrange
    const raw = {
      overallComment: "총평입니다.",
      items: [
        { comment: "순서로 복구됩니다." },
        { index: "1", comment: "문자열 index 입니다." },
      ],
    };

    // Act
    const parsed = parseRecommendationCommentary(raw);

    // Assert
    expect(parsed.byIndex.get(0)).toBe("순서로 복구됩니다.");
    expect(parsed.byIndex.get(1)).toBe("문자열 index 입니다.");
  });

  it("items 가 배열이 아니면 총평만 살리고 항목 해설은 비운다", () => {
    // Arrange
    const raw = { overallComment: "총평입니다.", items: "문자열" };

    // Act
    const parsed = parseCombinationCommentary(raw);

    // Assert
    expect(parsed.overallComment).toBe("총평입니다.");
    expect(parsed.byIndex.size).toBe(0);
  });

  it("해설 텍스트가 없는 요소는 건너뛴다", () => {
    // Arrange
    const raw = {
      overallComment: "총평입니다.",
      items: [
        { index: 0 },
        { index: 1, strategy: "" },
        { index: 2, strategy: "살아남는 해설입니다." },
        "요소가 문자열인 경우",
      ],
    };

    // Act
    const parsed = parseCombinationCommentary(raw);

    // Assert
    expect(parsed.byIndex.size).toBe(1);
    expect(parsed.byIndex.get(2)).toBe("살아남는 해설입니다.");
  });

  it("총평이 어긋나면 폴백 문구로 바꾸고 항목 해설은 유지한다", () => {
    // Arrange
    const raw = { items: [{ index: 0, comment: "항목 해설입니다." }] };

    // Act
    const parsed = parseRecommendationCommentary(raw);

    // Assert
    expect(parsed.overallComment).toBe(
      JEONGSI_COMMENTARY_FALLBACK.recommendationOverall
    );
    expect(parsed.byIndex.get(0)).toBe("항목 해설입니다.");
  });
});

describe("문장 배열 해설 파싱", () => {
  it("문장 하나씩 담긴 배열을 한 칸으로 잇는다", () => {
    // Arrange
    const raw = {
      overallComment: ["첫 문장입니다.", " 둘째 문장입니다.", "셋째입니다."],
      strengthComment: ["강점입니다.", "유리합니다."],
      weaknessComment: "문자열로 와도 받습니다.",
    };

    // Act
    const result = parseScoreAnalysisCommentary(raw);

    // Assert
    expect(result.overallComment).toBe(
      "첫 문장입니다. 둘째 문장입니다. 셋째입니다."
    );
    expect(result.strengthComment).toBe("강점입니다. 유리합니다.");
    expect(result.weaknessComment).toBe("문자열로 와도 받습니다.");
  });

  it("항목 해설 배열과 PART 4 difference 키를 읽는다", () => {
    // Arrange
    const raw = {
      overallComment: ["총평입니다."],
      items: [
        { index: 0, reason: ["이유 하나입니다.", "이유 둘입니다."] },
        { index: 1, difference: "달라지는 칸입니다." },
      ],
    };

    // Act
    const result = parseCombinationCommentary(raw);

    // Assert
    expect(result.byIndex.get(0)).toBe("이유 하나입니다. 이유 둘입니다.");
    expect(result.byIndex.get(1)).toBe("달라지는 칸입니다.");
  });
});
