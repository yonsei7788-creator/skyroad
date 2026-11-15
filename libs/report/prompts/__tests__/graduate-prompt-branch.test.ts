import {
  buildAcademicAnalysisPrompt,
  buildGraduateAcademicAnalysisPrompt,
} from "../sections/academic-analysis";
import { buildAttendanceAnalysisPrompt } from "../sections/attendance-analysis";
import { buildBehaviorAnalysisPrompt } from "../sections/behavior-analysis";
import {
  buildCourseAlignmentPrompt,
  buildGraduateCourseAlignmentPrompt,
} from "../sections/course-alignment";
import { buildMajorExplorationPrompt } from "../sections/major-exploration";
import {
  buildSubjectAnalysisPrompt,
  buildGraduateSubjectAnalysisPrompt,
} from "../sections/subject-analysis";
import {
  buildTopicRecommendationPrompt,
  buildGraduateTopicRecommendationPrompt,
} from "../sections/topic-recommendation";

describe("졸업생 프롬프트 분기", () => {
  /**
   * 졸업생 분기 검증의 핵심 원칙:
   * 1. 졸업생 전용 함수는 positive instruction 위주로 작성 (Gemini 오판 방지)
   * 2. "면접", "면접에서", "면접 활용" 등 면접 관점 어휘 포함
   * 3. 비졸업생 함수에는 졸업생 분기가 더 이상 포함되지 않음
   */

  describe("majorExploration (단일 함수 + isGraduate 분기 유지)", () => {
    const baseMajor = {
      competencyExtraction: "x",
      academicAnalysis: "x",
      studentProfile: "x",
      studentGrade: 3,
      dataYearsPresent: { year1: true, year2: true, year3: true },
    };

    it("졸업생: 면접·지원 전략 관점 안내 포함", () => {
      const grad = buildMajorExplorationPrompt({
        ...baseMajor,
        isGraduate: true,
      });

      expect(grad).toContain("졸업생");
      expect(grad).toContain("면접");
    });

    it("재학생(고3)은 미래형 가이드 표현 유지", () => {
      const stu = buildMajorExplorationPrompt({
        ...baseMajor,
        isGraduate: false,
      });

      expect(stu).toContain("남은 학기에서 ~ 선택과목을 이수하면");
    });
  });

  describe("attendanceAnalysis (단일 함수 + isGraduate 분기 유지)", () => {
    it("졸업생: 출결 확정 컨텍스트", () => {
      const grad = buildAttendanceAnalysisPrompt(
        {
          attendanceSummary: "x",
          studentProfile: "x",
          studentGrade: 3,
          isGraduate: true,
        },
        "standard"
      );

      expect(grad).toContain("졸업생");
      expect(grad).toContain("improvementAdvice");
    });
  });

  describe("behaviorAnalysis (단일 함수 + isGraduate 분기 유지)", () => {
    it("졸업생: 면접 활용 관점 안내", () => {
      const grad = buildBehaviorAnalysisPrompt(
        {
          behavioralAssessment: "x",
          competencyExtraction: "x",
          studentProfile: "x",
          studentGrade: 3,
          isGraduate: true,
        },
        "standard"
      );

      expect(grad).toContain("졸업생");
      expect(grad).toContain("면접에서 이 행동특성을 어떻게 활용");
    });
  });

  describe("subjectAnalysis 졸업생 전용 함수", () => {
    const base = {
      subjectData: "x",
      studentProfile: "x",
      studentGrade: 3,
      gradingSystem: "9등급제" as const,
    };

    it("졸업생 전용: 면접 활용 관점 schema 출력", () => {
      const grad = buildGraduateSubjectAnalysisPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain("졸업생 전용 세특 분석");
      expect(grad).toContain("면접에서 어떻게 활용·설명할지");
      expect(grad).toContain("면접 답변 예시");
    });

    it("졸업생 전용: 비졸업생용 미래형 가이드 표현 미포함", () => {
      const grad = buildGraduateSubjectAnalysisPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      // 비졸업생 가이드의 "2학년 물리학·화학 세특에서 정량 분석으로 확장" 형태 미포함
      expect(grad).not.toContain(
        "2학년 물리학·화학 세특에서 정량 분석으로 확장"
      );
    });

    it("비졸업생 함수: 졸업생 전용 헤더 없음", () => {
      const stu = buildSubjectAnalysisPrompt(
        { ...base, isGraduate: false },
        "premium"
      );

      expect(stu).not.toContain("졸업생 전용 세특 분석");
    });
  });

  describe("topicRecommendation 졸업생 전용 함수", () => {
    const base = {
      subjectData: "x",
      weaknessAnalysisResult: "x",
      studentProfile: "x",
      studentGrade: 3,
    };

    it("졸업생 전용: 면접 답변 설계 단계 안내", () => {
      const grad = buildGraduateTopicRecommendationPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain("졸업생 전용 주제 추천");
      expect(grad).toContain("면접 답변용 STAR 구조 정리");
      expect(grad).toContain("꼬리질문 대비");
    });

    it("졸업생 전용: 출력 schema의 expectedResult가 면접 산출물", () => {
      const grad = buildGraduateTopicRecommendationPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain(
        '"expectedResult": "면접 답변 정리물 + 꼬리질문 대비 노트"'
      );
    });

    it("비졸업생 함수: 졸업생 전용 헤더 없음, 기존 보고서 작성 단계 유지", () => {
      const stu = buildTopicRecommendationPrompt(
        { ...base, isGraduate: false },
        "premium"
      );

      expect(stu).not.toContain("졸업생 전용 주제 추천");
      expect(stu).toContain("3단계: 분석 및 보고서 작성");
    });
  });

  describe("courseAlignment 졸업생 전용 함수", () => {
    const base = {
      recommendedCourseMatch: "x",
      competencyExtraction: "x",
      studentProfile: "x",
      studentGrade: 3,
      gradingSystem: "9등급제" as const,
    };

    it("졸업생 전용: 면접 대응 관점 안내", () => {
      const grad = buildGraduateCourseAlignmentPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain("졸업생 전용 권장과목 이수율 분석");
      expect(grad).toContain("면접 대응 관점");
    });

    it("졸업생 전용 schema 예시의 recommendation: 면접에서 어필 톤", () => {
      const grad = buildGraduateCourseAlignmentPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      const recommendationMatch = grad.match(/"recommendation":\s*"([^"]+)"/);
      expect(recommendationMatch).not.toBeNull();
      const recommendationValue = recommendationMatch?.[1] ?? "";

      expect(recommendationValue).toContain("면접");
      // 미래형 학사 권고 표현 미포함
      expect(recommendationValue).not.toMatch(/우회\s*보완|보완\s*전략/);
    });

    it("비졸업생 함수(고3): 졸업생 전용 헤더 없음, 기존 우회 보완 가이드 유지", () => {
      const stu = buildCourseAlignmentPrompt(
        { ...base, isGraduate: false },
        "premium"
      );

      expect(stu).not.toContain("졸업생 전용 권장과목");
      expect(stu).toContain("우회 보완");
    });
  });

  describe("academicAnalysis 졸업생 전용 함수", () => {
    const base = {
      quantitativeAnalysis: "x",
      preprocessedAcademicData: "x",
      studentProfile: "x",
      gradingSystem: "9등급제" as const,
      studentGrade: 3,
    };

    it("졸업생 전용: 확정된 성적 데이터 자체에 대한 사실적 평가만 안내 (면접·서류 판단 없음)", () => {
      const grad = buildGraduateAcademicAnalysisPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain("졸업생 전용 성적 분석");
      expect(grad).toContain("확정된 성적 데이터 자체");
      // academicAnalysis는 교과 성적 평가 섹션이므로 면접·서류 판단이 섞이면 안 됨
      expect(grad).not.toContain("면접");
      expect(grad).not.toContain("자기소개서");
    });

    it("졸업생 전용: 성적이 확정되어 gradeChangeAnalysis에 실행 항목을 요구하지 않음", () => {
      const grad = buildGraduateAcademicAnalysisPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain('"actionItems": []');
      expect(grad).toContain('"actionItemPriorities": []');
    });

    it("졸업생 전용: recommendedSubjects가 빈 배열 출력 명시", () => {
      const grad = buildGraduateAcademicAnalysisPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain('"recommendedSubjects": []');
    });

    it("졸업생 전용 Premium: improvementPriority·fiveGradeSimulation 빈 배열", () => {
      const grad = buildGraduateAcademicAnalysisPrompt(
        { ...base, isGraduate: true },
        "premium"
      );

      expect(grad).toContain("improvementPriority: 빈 배열");
      expect(grad).toContain("fiveGradeSimulation: 빈 배열");
    });

    it("비졸업생 함수: 졸업생 전용 헤더 없음", () => {
      const stu = buildAcademicAnalysisPrompt(
        { ...base, isGraduate: false },
        "premium"
      );

      expect(stu).not.toContain("졸업생 전용 성적 분석");
    });
  });
});
