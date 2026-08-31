import { buildActionRoadmapPrompt } from "../../prompts/sections/action-roadmap";
import { stripUnactionableRoadmapAdvice } from "../postprocessor";

const baseInput = {
  weaknessAnalysisResult: "[]",
  admissionStrategyResult: "{}",
  studentProfile: "3학년 재학생",
  studentGrade: 3,
};

describe("buildActionRoadmapPrompt — 생기부 확정 학생 분기", () => {
  it("확정 학생에게는 세특 서술 가이드를 요구하지 않는다", () => {
    // Arrange & Act
    const prompt = buildActionRoadmapPrompt(
      { ...baseInput, isRecordFinalized: true },
      "premium"
    );

    // Assert
    expect(prompt).toContain("evaluationWritingGuide 필드를 출력하지 않습니다");
    expect(prompt).not.toContain("### 3. 세특 서술 전략");
    expect(prompt).not.toContain("방학 중 미리 작성해둘 보고서/활동 제안");
  });

  it("확정 학생의 prewriteProposals는 면접·서류 준비 범위로 제한된다", () => {
    // Arrange & Act
    const prompt = buildActionRoadmapPrompt(
      { ...baseInput, isRecordFinalized: true },
      "premium"
    );

    // Assert
    expect(prompt).toContain("면접·서류 준비 자료 (prewriteProposals)");
    expect(prompt).toContain("새 탐구·새 보고서·새 활동을 제안하지 않습니다");
  });

  it("확정 학생에게는 생기부 작성 기간 계산 절차를 지시하지 않는다", () => {
    // Arrange & Act
    const prompt = buildActionRoadmapPrompt(
      { ...baseInput, isRecordFinalized: true },
      "premium"
    );

    // Assert
    expect(prompt).not.toContain("남은 생기부 작성 기간을 계산");
    expect(prompt).toContain("생기부는 이미 확정되었습니다");
  });

  it("확정 전 학생에게는 기존 세특 서술 가이드 규칙을 유지한다", () => {
    // Arrange & Act
    const prompt = buildActionRoadmapPrompt(
      { ...baseInput, studentGrade: 2, isRecordFinalized: false },
      "premium"
    );

    // Assert
    expect(prompt).toContain("### 3. 세특 서술 전략");
    expect(prompt).toContain("남은 생기부 작성 기간을 계산");
  });

  it("의·치·한·약·수 확정 학생에게 성적 관리 지시를 넣지 않는다", () => {
    // Arrange & Act
    const prompt = buildActionRoadmapPrompt(
      { ...baseInput, isRecordFinalized: true, isMedical: true },
      "premium"
    );

    // Assert
    expect(prompt).not.toContain("핵심 교과 성적 관리와 세특 심화 탐구");
    expect(prompt).toContain("수능 최저학력기준 충족");
  });
});

describe("stripUnactionableRoadmapAdvice", () => {
  it("세특 서술 가이드를 제거한다", () => {
    // Arrange
    const section: Record<string, unknown> = {
      completionStrategy: "면접 준비에 집중해주세요.",
      evaluationWritingGuide: { structure: ["활동동기"] },
    };

    // Act
    stripUnactionableRoadmapAdvice(section, "[test]");

    // Assert
    expect(section.evaluationWritingGuide).toBeUndefined();
  });

  it("성적 보완 전제 제안만 제거하고 면접 준비 제안은 남긴다", () => {
    // Arrange
    const section: Record<string, unknown> = {
      completionStrategy: "면접 준비에 집중해주세요.",
      prewriteProposals: [
        "면접 대비를 위해, 2학년 동아리 활동의 탐구 과정과 결론을 중심으로 예상 질문을 도출하고 답변을 구체화하는 보고서를 작성하는 것이 좋습니다.",
        "수능 최저학력기준 충족을 위해, 생명과학Ⅰ 과목의 취약점을 보완할 수 있는 학습 계획을 수립하고, 수학 및 과학 과목의 최상위권 성적을 유지하기 위한 학습 전략을 점검하는 보고서를 작성하는 것이 좋습니다.",
      ],
    };

    // Act
    stripUnactionableRoadmapAdvice(section, "[test]");

    // Assert
    expect(section.prewriteProposals).toHaveLength(1);
    expect((section.prewriteProposals as string[])[0]).toContain("면접 대비");
  });

  it("모든 제안이 실행 불가능하면 필드를 제거한다", () => {
    // Arrange
    const section: Record<string, unknown> = {
      completionStrategy: "면접 준비에 집중해주세요.",
      prewriteProposals: ["세특을 보완할 수 있는 심화 탐구를 준비하세요."],
    };

    // Act
    stripUnactionableRoadmapAdvice(section, "[test]");

    // Assert
    expect(section.prewriteProposals).toBeUndefined();
  });

  it("completionStrategy의 성적 향상 문장을 제거한다", () => {
    // Arrange
    const section: Record<string, unknown> = {
      completionStrategy:
        "면접 준비와 수능 마무리에 집중해주세요. 수학 성적을 끌어올리는 학습 계획을 수립하세요.",
    };

    // Act
    stripUnactionableRoadmapAdvice(section, "[test]");

    // Assert
    expect(section.completionStrategy).toBe(
      "면접 준비와 수능 마무리에 집중해주세요."
    );
  });

  it("completionStrategy가 통째로 제거되면 확정 학생용 문장으로 대체한다", () => {
    // Arrange
    const section: Record<string, unknown> = {
      completionStrategy: "내신 성적을 개선하기 위한 학습 계획을 수립하세요.",
    };

    // Act
    stripUnactionableRoadmapAdvice(section, "[test]");

    // Assert
    expect(section.completionStrategy).toContain(
      "생기부가 최종 확정되었으므로"
    );
  });

  it("실행 가능한 조언만 있으면 그대로 둔다", () => {
    // Arrange
    const original = {
      completionStrategy:
        "확정된 기록 중 전공과 연결되는 활동을 면접에서 설명할 수 있도록 정리해주세요.",
      prewriteProposals: ["생기부 기반 예상 질문과 답변을 정리해주세요."],
    };
    const section: Record<string, unknown> = { ...original };

    // Act
    stripUnactionableRoadmapAdvice(section, "[test]");

    // Assert
    expect(section.completionStrategy).toBe(original.completionStrategy);
    expect(section.prewriteProposals).toEqual(original.prewriteProposals);
  });
});
