import type { ReportPlan, ReportSection } from "@/libs/report/types";

import {
  AcademicAnalysisRenderer,
  ActionRoadmapRenderer,
  ActivityAnalysisRenderer,
  AdmissionPredictionRenderer,
  AdmissionStrategyRenderer,
  AttendanceAnalysisRenderer,
  BehaviorAnalysisRenderer,
  CompetencyScoreRenderer,
  CompetitiveProfilingRenderer,
  ConsultantReviewRenderer,
  CourseAlignmentRenderer,
  DirectionGuideRenderer,
  InterviewPrepRenderer,
  MajorExplorationRenderer,
  StoryAnalysisRenderer,
  StudentProfileRenderer,
  SubjectAnalysisRenderer,
  TopicRecommendationRenderer,
  WeaknessAnalysisRenderer,
} from "../_components";

interface SectionRendererProps {
  section: ReportSection;
  plan: ReportPlan;
  sectionNumber: number;
  isGraduate?: boolean;
}

export const SectionRenderer = ({
  section,
  plan,
  sectionNumber,
  isGraduate,
}: SectionRendererProps) => {
  switch (section.sectionId) {
    // Part 1: 진단
    case "studentProfile":
      return (
        <StudentProfileRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
        />
      );
    case "competencyScore":
      return (
        <CompetencyScoreRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
        />
      );
    case "admissionPrediction":
      return (
        <AdmissionPredictionRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
        />
      );

    // Part 2: 분석
    case "academicAnalysis":
      return (
        <AcademicAnalysisRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "courseAlignment":
      if (isGraduate) return null;
      return (
        <CourseAlignmentRenderer data={section} sectionNumber={sectionNumber} />
      );
    case "attendanceAnalysis":
      return (
        <AttendanceAnalysisRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "activityAnalysis":
      return (
        <ActivityAnalysisRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
        />
      );
    case "subjectAnalysis":
      return (
        <SubjectAnalysisRenderer data={section} sectionNumber={sectionNumber} />
      );
    case "behaviorAnalysis":
      return (
        <BehaviorAnalysisRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );

    // Part 3: 전략
    case "weaknessAnalysis":
      return (
        <WeaknessAnalysisRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
        />
      );
    case "topicRecommendation":
      return (
        <TopicRecommendationRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "interviewPrep":
      return (
        <InterviewPrepRenderer data={section} sectionNumber={sectionNumber} />
      );
    case "admissionStrategy":
      return (
        <AdmissionStrategyRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
        />
      );
    case "competitiveProfiling":
      return (
        <CompetitiveProfilingRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "directionGuide":
      return (
        <DirectionGuideRenderer data={section} sectionNumber={sectionNumber} />
      );
    case "storyAnalysis":
      return (
        <StoryAnalysisRenderer data={section} sectionNumber={sectionNumber} />
      );
    case "actionRoadmap":
      return (
        <ActionRoadmapRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
        />
      );

    // 전임 컨설턴트 총평
    case "consultantReview":
      return (
        <ConsultantReviewRenderer
          data={section}
          sectionNumber={sectionNumber}
          plan={plan}
          isGraduate={isGraduate}
        />
      );

    // 부록
    case "majorExploration":
      return (
        <MajorExplorationRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );

    default:
      return null;
  }
};
