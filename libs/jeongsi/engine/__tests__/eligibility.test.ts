import {
  checkEligibility,
  excludeOtherTrackSplits,
  excludeWomensUniversities,
  isWomensUniversity,
  resolveApplicantTrack,
} from "../eligibility";
import { baseScore, socialScore } from "./fixtures";

import type { SubjectRestriction, SuneungScore } from "../../types";

describe("checkEligibility", () => {
  it("제한이 없으면 통과한다", () => {
    // Arrange & Act
    const result = checkEligibility(baseScore);

    // Assert
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("허용 수학 선택과목을 응시했으면 통과한다", () => {
    // Arrange
    const restrictions: SubjectRestriction = { math: ["미적분", "기하"] };

    // Act
    const result = checkEligibility(baseScore, restrictions);

    // Assert
    expect(result.eligible).toBe(true);
  });

  it("수학 선택과목 제한에 걸리면 사유를 한국어로 반환한다", () => {
    // Arrange
    const restrictions: SubjectRestriction = { math: ["미적분", "기하"] };

    // Act
    const result = checkEligibility(socialScore, restrictions);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(
      "수학 확률과통계 응시자는 지원할 수 없습니다. (지원 가능: 미적분·기하)"
    );
  });

  it("과탐필수 대학에 사탐 응시자는 지원할 수 없다", () => {
    // Arrange
    const restrictions: SubjectRestriction = { inquiry: "과탐필수" };

    // Act
    const result = checkEligibility(socialScore, restrictions);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("탐구 2과목 모두 과학탐구");
    expect(result.reason).toContain("생활과윤리·사회문화");
  });

  it("과탐필수 대학에 과탐 2과목 응시자는 통과한다", () => {
    // Arrange
    const restrictions: SubjectRestriction = { inquiry: "과탐필수" };

    // Act
    const result = checkEligibility(baseScore, restrictions);

    // Assert
    expect(result.eligible).toBe(true);
  });

  it("과탐1과목이상 대학은 과탐 1과목만 있어도 통과한다", () => {
    // Arrange
    const mixedScore: SuneungScore = {
      ...baseScore,
      inquiry2: { subject: "사회문화", standardScore: 66, percentile: 90 },
    };
    const restrictions: SubjectRestriction = { inquiry: "과탐1과목이상" };

    // Act
    const mixed = checkEligibility(mixedScore, restrictions);
    const social = checkEligibility(socialScore, restrictions);

    // Assert
    expect(mixed.eligible).toBe(true);
    expect(social.eligible).toBe(false);
    expect(social.reason).toContain("과학탐구를 1과목 이상");
  });

  it("제한없음은 탐구 조건을 보지 않는다", () => {
    // Arrange
    const restrictions: SubjectRestriction = { inquiry: "제한없음" };

    // Act
    const result = checkEligibility(socialScore, restrictions);

    // Assert
    expect(result.eligible).toBe(true);
  });

  it("수학 제한과 탐구 제한이 겹치면 수학 사유를 먼저 알린다", () => {
    // Arrange
    const restrictions: SubjectRestriction = {
      math: ["미적분"],
      inquiry: "과탐필수",
    };

    // Act
    const result = checkEligibility(socialScore, restrictions);

    // Assert
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("수학 확률과통계");
  });
});

describe("resolveApplicantTrack", () => {
  it("미적분·기하와 과탐을 응시했으면 자연, 확통과 사탐이면 인문이다", () => {
    // Act & Assert
    expect(resolveApplicantTrack(baseScore)).toBe("자연");
    expect(resolveApplicantTrack(socialScore)).toBe("인문");
  });

  it("수학과 탐구가 엇갈리면 판정하지 않는다", () => {
    // Arrange
    const mixed: SuneungScore = {
      ...socialScore,
      math: { ...baseScore.math },
    };

    // Act & Assert
    expect(resolveApplicantTrack(mixed)).toBeNull();
  });
});

describe("excludeOtherTrackSplits", () => {
  const plans = [
    { university: "가대학교", department: "의예과(인문)" },
    { university: "가대학교", department: "의예과(자연)" },
    { university: "나대학교", department: "지리학과(인문)" },
    { university: "다대학교", department: "경영학과" },
  ];

  it("같은 학과에 자기 계열 단위가 있으면 반대 계열 단위를 뺀다", () => {
    // Act
    const result = excludeOtherTrackSplits(plans, "자연");

    // Assert: 짝이 없는 (인문) 단위는 교차 지원 선택지로 남는다
    expect(result.map((plan) => plan.department)).toEqual([
      "의예과(자연)",
      "지리학과(인문)",
      "경영학과",
    ]);
  });

  it("계열을 판정하지 못하면 그대로 둔다", () => {
    // Act & Assert
    expect(excludeOtherTrackSplits(plans, null)).toEqual(plans);
  });
});

describe("excludeWomensUniversities", () => {
  const plans = [
    { university: "성신여자대학교" },
    { university: "동덕여자대학교" },
    { university: "건국대학교" },
  ];

  it("대학명이 여자대학교로 끝나면 여자대학교로 본다", () => {
    // Arrange & Act & Assert
    expect(isWomensUniversity("서울여자대학교")).toBe(true);
    expect(isWomensUniversity("서울대학교")).toBe(false);
  });

  it("남학생이면 여자대학교를 뺀다", () => {
    // Arrange & Act
    const result = excludeWomensUniversities(plans, "male");

    // Assert
    expect(result.map((plan) => plan.university)).toEqual(["건국대학교"]);
  });

  it("여학생이거나 성별을 모르면 그대로 둔다", () => {
    // Arrange & Act & Assert
    expect(excludeWomensUniversities(plans, "female")).toHaveLength(3);
    expect(excludeWomensUniversities(plans, undefined)).toHaveLength(3);
  });
});
