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
}

export const SectionRenderer = ({
  section,
  plan,
  sectionNumber,
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
