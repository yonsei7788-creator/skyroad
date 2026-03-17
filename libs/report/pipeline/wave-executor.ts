/**
 * Wave Executor — Task-based
 *
 * 각 태스크는 1개의 Gemini API 호출(또는 Phase 2의 경우 3개)을 실행한다.
 * run-pipeline API Route에서 의존성 기반 병렬 웨이브로 실행된다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReportPlan, ReportSection, StudentInfo } from "../types.ts";
import { buildSystemPrompt } from "../prompts/system.ts";

// Phase 2 prompts
import { buildCompetencyExtractionPrompt } from "../prompts/phase2/competency-extraction.ts";
import type { CompetencyExtractionOutput } from "../prompts/phase2/competency-extraction.ts";
import { buildAcademicContextAnalysisPrompt } from "../prompts/phase2/academic-analysis.ts";
import type { AcademicContextAnalysisOutput } from "../prompts/phase2/academic-analysis.ts";
import { buildStudentTypeClassificationPrompt } from "../prompts/phase2/student-type-classification.ts";
import type { StudentTypeClassificationOutput } from "../prompts/phase2/student-type-classification.ts";

// Section prompts
import { buildStudentProfilePrompt } from "../prompts/sections/student-profile.ts";
import { buildCompetencyScorePrompt } from "../prompts/sections/competency-score.ts";
import { buildAdmissionPredictionPrompt } from "../prompts/sections/admission-prediction.ts";
import { buildAcademicAnalysisPrompt } from "../prompts/sections/academic-analysis.ts";
import { buildCourseAlignmentPrompt } from "../prompts/sections/course-alignment.ts";
import { buildAttendanceAnalysisPrompt } from "../prompts/sections/attendance-analysis.ts";
import { buildActivityAnalysisPrompt } from "../prompts/sections/activity-analysis.ts";
import { buildSubjectAnalysisPrompt } from "../prompts/sections/subject-analysis.ts";
import { buildBehaviorAnalysisPrompt } from "../prompts/sections/behavior-analysis.ts";
import { buildWeaknessAnalysisPrompt } from "../prompts/sections/weakness-analysis.ts";
import { buildTopicRecommendationPrompt } from "../prompts/sections/topic-recommendation.ts";
import { buildInterviewPrepPrompt } from "../prompts/sections/interview-prep.ts";
import {
  buildAdmissionStrategyPrompt,
  buildDirectionGuidePrompt,
} from "../prompts/sections/admission-strategy.ts";
import { buildStoryAnalysisPrompt } from "../prompts/sections/story-analysis.ts";
import { buildActionRoadmapPrompt } from "../prompts/sections/action-roadmap.ts";
import { buildMajorExplorationPrompt } from "../prompts/sections/major-exploration.ts";
import { buildConsultantReviewPrompt } from "../prompts/sections/consultant-review.ts";

import type { GeminiClient } from "./gemini-client.ts";
import { preprocess } from "./preprocessor.ts";
import { loadRecordData } from "./load-record.ts";
import type { WaveState } from "./wave-state.ts";
import {
  matchMajorEvaluationCriteria,
  findCriteriaByMajorGroup,
  formatMajorEvaluationContext,
} from "../constants/major-evaluation-criteria.ts";
import { isMedicalMajor } from "../constants/recommended-courses.ts";
import {
  buildTaskQueue,
  computeProgress,
  saveWaveState,
} from "./wave-state.ts";

// ─── Gemini responseSchema stub ───

const EMPTY_SCHEMA = {} as never;

// Flash: thinking OFF (타임아웃 방지, 스키마 준수는 프롬프트로 강제)
const THINKING_BUDGET = 0;

// ─── Wave 0: 전처리 (Gemini 호출 없음) ───

export const executePreprocess = async (
  plan: ReportPlan,
  studentInfo: StudentInfo,
  reportId: string,
  supabase: SupabaseClient,
  recordId: string,
  universityCandidatesText?: string,
  runId?: string,
  options?: { skipSave?: boolean }
): Promise<WaveState> => {
  const recordData = await loadRecordData(supabase, recordId);
  const { data, texts } = preprocess(recordData, studentInfo, plan);

  // universityCandidatesText는 preprocessor에서 환산등급 기반으로 자동 생성됨
  // 외부 주입값은 무시 (희망대학만 반복 추천하는 문제 방지)

  const isGrade1Only = studentInfo.grade === 1;
  const taskQueue = buildTaskQueue(plan, isGrade1Only, studentInfo.isGraduate);

  const state: WaveState = {
    preprocessedTexts: texts,
    preprocessedData: data,
    completedSections: [],
    serializedTexts: {},
    taskQueue,
    currentTaskIndex: -1,
    totalTasks: taskQueue.length,
    lastCompletedWave: 0,
    runId,
  };

  if (!options?.skipSave) {
    await saveWaveState(supabase, reportId, state, 2, "preprocess");
  }
  return state;
};

// ─── Task 실행기: 태스크 이름에 따라 적절한 Gemini 호출 실행 ───

export const executeTask = async (
  taskId: string,
  client: GeminiClient,
  plan: ReportPlan,
  studentInfo: StudentInfo,
  state: WaveState,
  reportId: string,
  supabase: SupabaseClient,
  options?: { skipSave?: boolean }
): Promise<WaveState> => {
  const texts = state.preprocessedTexts!;
  const ser = state.serializedTexts!;
  const systemPrompt = buildSystemPrompt(plan);
  const sections = [...(state.completedSections ?? [])];
  const isMedical = isMedicalMajor(studentInfo.targetDepartment ?? "");

  const callGemini = async <T>(prompt: string): Promise<T> => {
    const result = await client.call<T>({
      systemInstruction: systemPrompt,
      prompt,
      responseSchema: EMPTY_SCHEMA,
      thinkingBudget: THINKING_BUDGET,
    });
    return result.data;
  };

  let updatedSer = { ...ser };
  const taskIndex = state.currentTaskIndex + 1;

  // ─── Phase 2: competencyExtraction + academicAnalysis 병렬 → studentTypeClassification ───
  if (taskId === "phase2") {
    // 1) competencyExtraction + academicAnalysis 병렬 (서로 독립적)
    const [competencyExtraction, academicAnalysis] = await Promise.all([
      callGemini<CompetencyExtractionOutput>(
        buildCompetencyExtractionPrompt({
          studentProfile: texts.studentProfileText,
          recordData: texts.recordDataText,
        })
      ),
      callGemini<AcademicContextAnalysisOutput>(
        buildAcademicContextAnalysisPrompt({
          preprocessedAcademicData: texts.preprocessedAcademicDataText,
          rawAcademicData: texts.rawAcademicDataText,
          studentProfile: texts.studentProfileText,
          gradingSystem: state.preprocessedData?.gradingSystem,
        })
      ),
    ]);

    // 2) studentTypeClassification (competencyExtraction 결과 필요)
    const studentTypeClassification =
      await callGemini<StudentTypeClassificationOutput>(
        buildStudentTypeClassificationPrompt({
          competencyExtraction: JSON.stringify(competencyExtraction),
          preprocessedAcademicData: texts.preprocessedAcademicDataText,
          studentProfile: texts.studentProfileText,
          majorEvaluationContext: texts.majorEvaluationContextText,
        })
      );

    updatedSer = {
      ...updatedSer,
      compExtrText: JSON.stringify(competencyExtraction),
      acadAnalText: JSON.stringify(academicAnalysis),
      stuTypeText: JSON.stringify(studentTypeClassification),
    };

    // 3) 생기부 기반 계열 보정: detectedMajorGroup vs targetDepartment 비교
    let correctedTexts = texts;
    const detected = competencyExtraction.detectedMajorGroup;
    if (detected) {
      const targetDept = studentInfo.targetDepartment ?? "";
      const targetCriteria = matchMajorEvaluationCriteria(targetDept);
      // detectedMajorGroup은 이미 계열명 → findCriteriaByMajorGroup으로 직접 조회
      const detectedCriteria = findCriteriaByMajorGroup(detected);

      if (targetCriteria.majorGroup !== detectedCriteria.majorGroup) {
        // 생기부 실제 강점 계열이 희망학과 계열과 다름 → 보정
        const correctedContext = formatMajorEvaluationContext(
          detectedCriteria,
          `${detected} (생기부 분석 기반, 희망학과: ${targetDept || "미입력"})`
        );
        correctedTexts = {
          ...texts,
          majorEvaluationContextText: correctedContext,
        };
        console.log(
          `[report:${reportId}] 계열 보정: ${targetCriteria.majorGroup}(희망) → ${detectedCriteria.majorGroup}(생기부 실제). 근거: ${competencyExtraction.detectedMajorReason ?? ""}`
        );
      }
    }

    const nextState: WaveState = {
      ...state,
      preprocessedTexts: correctedTexts,
      phase2Results: {
        competencyExtraction,
        academicAnalysis,
        studentTypeClassification,
      },
      serializedTexts: updatedSer,
      completedSections: sections,
      currentTaskIndex: taskIndex,
      lastCompletedWave: state.lastCompletedWave + 1,
    };

    if (!options?.skipSave) {
      const progress = computeProgress(taskIndex, state.totalTasks);
      await saveWaveState(supabase, reportId, nextState, progress, "phase2");
    }
    return nextState;
  }

  // ─── Section generation: 각각 1개 Gemini 호출 ───

  let section: ReportSection | null = null;

  switch (taskId) {
    case "studentProfile":
      section = await callGemini<ReportSection>(
        buildStudentProfilePrompt(
          {
            studentTypeClassification: ser.stuTypeText!,
            studentProfile: texts.studentProfileText,
          },
          plan
        )
      );
      break;

    case "competencyScore":
      section = await callGemini<ReportSection>(
        buildCompetencyScorePrompt(
          {
            studentTypeClassification: ser.stuTypeText!,
            competencyExtraction: ser.compExtrText!,
            preprocessedAcademicData: texts.preprocessedAcademicDataText,
            attendanceSummary: texts.attendanceSummaryText,
            studentProfile: texts.studentProfileText,
            majorEvaluationContext: texts.majorEvaluationContextText,
            gradingSystem: state.preprocessedData!.gradingSystem,
            isMedical,
          },
          plan
        )
      );
      break;

    case "academicAnalysis": {
      const preData = state.preprocessedData!;
      section = await callGemini<ReportSection>(
        buildAcademicAnalysisPrompt(
          {
            quantitativeAnalysis: ser.acadAnalText!,
            preprocessedAcademicData: texts.preprocessedAcademicDataText,
            studentProfile: texts.studentProfileText,
            gradingSystem: preData.gradingSystem,
          },
          plan
        )
      );
      // 후속 태스크에서 사용할 직렬화 텍스트 저장
      updatedSer = {
        ...updatedSer,
        acadSectionText: JSON.stringify(section),
      };
      break;
    }

    case "attendanceAnalysis":
      section = await callGemini<ReportSection>(
        buildAttendanceAnalysisPrompt(
          {
            attendanceSummary: texts.attendanceSummaryText,
            studentProfile: texts.studentProfileText,
          },
          plan
        )
      );
      updatedSer = {
        ...updatedSer,
        attendSectionText: JSON.stringify(section),
      };
      break;

    case "activityAnalysis":
      section = await callGemini<ReportSection>(
        buildActivityAnalysisPrompt(
          {
            creativeActivities: texts.creativeActivitiesText,
            competencyExtraction: ser.compExtrText!,
            studentProfile: texts.studentProfileText,
            curriculumVersion: texts.curriculumVersion,
            majorEvaluationContext: texts.majorEvaluationContextText,
            isMedical,
          },
          plan
        )
      );
      break;

    case "courseAlignment":
      section = await callGemini<ReportSection>(
        buildCourseAlignmentPrompt(
          {
            recommendedCourseMatch: texts.recommendedCourseMatchText,
            competencyExtraction: ser.compExtrText!,
            studentProfile: texts.studentProfileText,
            studentGrade: studentInfo.grade,
            gradingSystem: state.preprocessedData!.gradingSystem,
            isMedical,
          },
          plan
        )
      );
      break;

    case "subjectAnalysis":
      section = await callGemini<ReportSection>(
        buildSubjectAnalysisPrompt(
          {
            subjectData: texts.subjectDataText,
            studentProfile: texts.studentProfileText,
            isMedical,
          },
          plan
        )
      );
      updatedSer = {
        ...updatedSer,
        subjAnalysisText: JSON.stringify(section),
      };
      break;

    case "behaviorAnalysis":
      section = await callGemini<ReportSection>(
        buildBehaviorAnalysisPrompt(
          {
            behavioralAssessment: texts.behavioralAssessmentText,
            competencyExtraction: ser.compExtrText!,
            studentProfile: texts.studentProfileText,
          },
          plan
        )
      );
      break;

    case "weaknessAnalysis":
      section = await callGemini<ReportSection>(
        buildWeaknessAnalysisPrompt(
          {
            competencyExtraction: ser.compExtrText!,
            academicAnalysis: ser.acadAnalText!,
            studentProfile: texts.studentProfileText,
            isMedical,
          },
          plan
        )
      );
      updatedSer = {
        ...updatedSer,
        weaknessText: JSON.stringify(section),
      };
      break;

    case "topicRecommendation":
      section = await callGemini<ReportSection>(
        buildTopicRecommendationPrompt(
          {
            subjectAnalysisResult: ser.subjAnalysisText!,
            weaknessAnalysisResult: ser.weaknessText ?? "[]",
            studentProfile: texts.studentProfileText,
          },
          plan
        )
      );
      break;

    case "interviewPrep":
      section = await callGemini<ReportSection>(
        buildInterviewPrepPrompt(
          {
            subjectAnalysisResult: ser.subjAnalysisText!,
            studentProfile: texts.studentProfileText,
            academicData: texts.rawAcademicDataText,
            isMedical,
          },
          plan
        )
      );
      break;

    case "admissionPrediction":
      section = await callGemini<ReportSection>(
        buildAdmissionPredictionPrompt(
          {
            competencyExtraction: ser.compExtrText!,
            academicAnalysis: ser.acadAnalText!,
            studentTypeClassification: ser.stuTypeText!,
            universityCandidates: texts.universityCandidatesText,
            studentProfile: texts.studentProfileText,
            subjectAnalysisResult: ser.subjAnalysisText!,
            academicAnalysisResult: ser.acadSectionText!,
            attendanceAnalysisResult: ser.attendSectionText!,
            majorEvaluationContext: texts.majorEvaluationContextText,
            targetUniversities: texts.targetUniversitiesText,
            gradingSystem: state.preprocessedData!.gradingSystem,
            isMedical,
          },
          plan
        )
      );
      updatedSer = {
        ...updatedSer,
        admPredText: JSON.stringify(section),
      };
      break;

    case "admissionStrategy":
      section = await callGemini<ReportSection>(
        buildAdmissionStrategyPrompt(
          {
            academicAnalysis: ser.acadSectionText!,
            admissionPredictionResult: ser.admPredText ?? "null",
            universityCandidates: texts.universityCandidatesText,
            recommendedCourseMatch: texts.recommendedCourseMatchText,
            studentProfile: texts.studentProfileText,
            majorEvaluationContext: texts.majorEvaluationContextText,
            gradingSystem: state.preprocessedData!.gradingSystem,
            studentGrade: studentInfo.grade,
            currentDate: new Date().toISOString().slice(0, 10),
            isMedical,
          },
          plan
        )
      );
      break;

    case "directionGuide":
      section = await callGemini<ReportSection>(
        buildDirectionGuidePrompt({
          competencyExtraction: ser.compExtrText!,
          academicAnalysis: ser.acadAnalText!,
          recommendedCourseMatch: texts.recommendedCourseMatchText,
          studentProfile: texts.studentProfileText,
          studentGrade: studentInfo.grade,
          currentDate: new Date().toISOString().slice(0, 10),
        })
      );
      break;

    case "storyAnalysis":
      section = await callGemini<ReportSection>(
        buildStoryAnalysisPrompt(
          {
            allSubjectData: texts.subjectDataText,
            creativeActivities: texts.creativeActivitiesText,
            behavioralAssessment: texts.behavioralAssessmentText,
            studentProfile: texts.studentProfileText,
          },
          plan
        )
      );
      break;

    case "actionRoadmap": {
      const existingStrategy = sections.find(
        (s) =>
          s.sectionId === "admissionStrategy" ||
          s.sectionId === "directionGuide"
      );
      section = await callGemini<ReportSection>(
        buildActionRoadmapPrompt(
          {
            weaknessAnalysisResult: ser.weaknessText!,
            admissionStrategyResult: JSON.stringify(existingStrategy),
            studentProfile: texts.studentProfileText,
            currentDate: new Date().toISOString().slice(0, 10),
            studentGrade: studentInfo.grade,
            isMedical,
          },
          plan
        )
      );
      break;
    }

    case "majorExploration":
      section = await callGemini<ReportSection>(
        buildMajorExplorationPrompt(
          {
            competencyExtraction: ser.compExtrText!,
            academicAnalysis: ser.acadAnalText!,
            studentProfile: texts.studentProfileText,
          },
          plan
        )
      );
      break;

    case "consultantReview":
      section = await callGemini<ReportSection>(
        buildConsultantReviewPrompt(
          {
            competencyExtraction: ser.compExtrText!,
            academicAnalysis: ser.acadAnalText!,
            studentProfile: texts.studentProfileText,
            subjectAnalysisResult: ser.subjAnalysisText!,
            admissionPredictionResult: ser.admPredText,
            weaknessAnalysisResult: ser.weaknessText,
            gradingSystem: state.preprocessedData?.gradingSystem,
            studentGrade: studentInfo.grade,
            currentDate: new Date().toISOString().slice(0, 10),
            isMedical,
          },
          plan
        )
      );
      break;

    default:
      throw new Error(`알 수 없는 태스크: ${taskId}`);
  }

  if (section) {
    sections.push(section);
  }

  const nextState: WaveState = {
    ...state,
    completedSections: sections,
    serializedTexts: updatedSer,
    currentTaskIndex: taskIndex,
    lastCompletedWave: state.lastCompletedWave + 1,
  };

  if (!options?.skipSave) {
    const progress = computeProgress(taskIndex, state.totalTasks);
    await saveWaveState(supabase, reportId, nextState, progress, taskId);
  }

  return nextState;
};
