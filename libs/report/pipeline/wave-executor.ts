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
import {
  preprocess,
  buildUniversityCandidatesText,
  rebuildRecommendedCourseMatchText,
} from "./preprocessor.ts";
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
          gradingSystem: state.preprocessedData?.gradingSystem,
        })
      );

    updatedSer = {
      ...updatedSer,
      compExtrText: JSON.stringify(competencyExtraction),
      acadAnalText: JSON.stringify(academicAnalysis),
      stuTypeText: JSON.stringify(studentTypeClassification),
    };

    // 3) 생기부 기반 계열로 평가 기준 + 대학 후보군 항상 재생성
    //    희망학과가 아닌, Phase 2에서 감지한 실제 강점 계열을 기준으로 함
    let correctedTexts = texts;
    // detectedMajorGroup이 null이면 생기부 성적 데이터 기반 폴백 (희망학과 사용 금지)
    let detected = competencyExtraction.detectedMajorGroup;
    if (!detected && state.preprocessedData?.subjectCombinations) {
      const combos = state.preprocessedData.subjectCombinations;
      const sciAvg = combos.find((c) => c.name === "국수영과")?.average;
      const socAvg = combos.find((c) => c.name === "국수영사")?.average;
      // 등급 평균이 낮을수록 우수 → 과학 평균이 사회보다 낮으면 이과 성향
      if (sciAvg != null && socAvg != null) {
        detected = sciAvg <= socAvg ? "자연과학" : "인문";
      } else {
        detected = "자연과학"; // 데이터 부족 시 기본값
      }
      console.log(
        `[report:${reportId}] ⚠️ detectedMajorGroup null — 생기부 성적 기반 폴백: ${detected} (국수영과=${sciAvg}, 국수영사=${socAvg})`
      );
    }
    if (detected) {
      const detectedCriteria = findCriteriaByMajorGroup(detected);
      const correctedContext = formatMajorEvaluationContext(
        detectedCriteria,
        `${detected} (생기부 분석 기반)`,
        state.preprocessedData?.gradingSystem
      );
      const correctedCandidates = buildUniversityCandidatesText(
        detected,
        state.preprocessedData?.gradingSystem,
        state.preprocessedData?.overallAverage,
        studentInfo.targetDepartment
      );
      const correctedCourseMatch = rebuildRecommendedCourseMatchText(
        detected,
        state.preprocessedData!,
        studentInfo.grade
      );
      correctedTexts = {
        ...texts,
        majorEvaluationContextText: correctedContext,
        universityCandidatesText: correctedCandidates,
        recommendedCourseMatchText: correctedCourseMatch,
      };
      // preprocessedData.recommendedCourseMatch 객체도 동기화
      // (postprocessor가 이 객체로 courses를 강제 덮어쓰므로 반드시 업데이트)
      state.preprocessedData!.recommendedCourseMatch =
        JSON.parse(correctedCourseMatch);

      const targetDept = studentInfo.targetDepartment ?? "";
      const targetCriteria = matchMajorEvaluationCriteria(targetDept);
      const isAIDetected = !!competencyExtraction.detectedMajorGroup;
      if (!isAIDetected) {
        // 로그는 위 폴백 블록에서 이미 출력됨
      } else if (targetCriteria.majorGroup !== detectedCriteria.majorGroup) {
        console.log(
          `[report:${reportId}] 계열 보정: ${targetCriteria.majorGroup}(희망) → ${detectedCriteria.majorGroup}(생기부 실제). 근거: ${competencyExtraction.detectedMajorReason ?? ""}`
        );
      } else {
        console.log(
          `[report:${reportId}] 생기부 기반 계열 적용: ${detectedCriteria.majorGroup}. 근거: ${competencyExtraction.detectedMajorReason ?? ""}`
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
            gradingSystem: state.preprocessedData!.gradingSystem,
            isMedical,
          },
          plan
        )
      );
      break;

    case "academicAnalysis": {
      const preData = state.preprocessedData!;
      // Phase 2에서 감지된 강점 계열을 academicAnalysis에 전달
      let detectedMajorForAcad =
        state.phase2Results?.competencyExtraction?.detectedMajorGroup;
      if (!detectedMajorForAcad && ser.compExtrText) {
        try {
          const parsed = JSON.parse(ser.compExtrText);
          detectedMajorForAcad = parsed.detectedMajorGroup;
        } catch {
          // 파싱 실패 시 무시
        }
      }
      section = await callGemini<ReportSection>(
        buildAcademicAnalysisPrompt(
          {
            quantitativeAnalysis: ser.acadAnalText!,
            preprocessedAcademicData: texts.preprocessedAcademicDataText,
            studentProfile: texts.studentProfileText,
            gradingSystem: preData.gradingSystem,
            detectedMajorGroup: detectedMajorForAcad,
            completedSubjectsByYear: texts.completedSubjectsByYearText,
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
            isMedical,
          },
          plan
        )
      );
      break;

    case "courseAlignment": {
      // Phase 2에서 감지한 계열 기반으로 권장과목 즉시 재생성 (state 전달 문제 방지)
      let courseMatchText = texts.recommendedCourseMatchText;
      let detectedGroup =
        state.phase2Results?.competencyExtraction?.detectedMajorGroup;
      // phase2Results가 없으면 serializedTexts에서 파싱
      if (!detectedGroup && ser.compExtrText) {
        try {
          const parsed = JSON.parse(ser.compExtrText);
          detectedGroup = parsed.detectedMajorGroup;
        } catch {
          // 파싱 실패 시 무시
        }
      }
      // 그래도 없으면 생기부 성적 기반 폴백
      if (!detectedGroup && state.preprocessedData?.subjectCombinations) {
        const combos = state.preprocessedData.subjectCombinations;
        const sciAvg = combos.find((c) => c.name === "국수영과")?.average;
        const socAvg = combos.find((c) => c.name === "국수영사")?.average;
        detectedGroup =
          sciAvg != null && socAvg != null && sciAvg <= socAvg
            ? "자연과학"
            : "인문";
      }
      if (detectedGroup) {
        courseMatchText = rebuildRecommendedCourseMatchText(
          detectedGroup,
          state.preprocessedData!,
          studentInfo.grade
        );
      }
      section = await callGemini<ReportSection>(
        buildCourseAlignmentPrompt(
          {
            recommendedCourseMatch: courseMatchText,
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
    }

    case "subjectAnalysis":
      section = await callGemini<ReportSection>(
        buildSubjectAnalysisPrompt(
          {
            subjectData: texts.subjectDataText,
            studentProfile: texts.studentProfileText,
            isMedical,
            gradingSystem: state.preprocessedData!.gradingSystem,
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
            studentGrade: studentInfo.grade,
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
            gradingSystem: state.preprocessedData!.gradingSystem,
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
            isArtSportPractical: texts.isArtSportPractical,
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
            universityCandidates: texts.universityCandidatesText,
            recommendedCourseMatch: texts.recommendedCourseMatchText,
            studentProfile: texts.studentProfileText,
            gradingSystem: state.preprocessedData!.gradingSystem,
            studentGrade: studentInfo.grade,
            currentDate: new Date().toISOString().slice(0, 10),
            isMedical,
            completedSubjectsByYear: texts.completedSubjectsByYearText,
            isArtSportPractical: texts.isArtSportPractical,
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
          completedSubjectsByYear: texts.completedSubjectsByYearText,
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
            completedSubjectsByYear: texts.completedSubjectsByYearText,
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
            targetDepartment: studentInfo.targetDepartment,
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
            completedSubjectsByYear: texts.completedSubjectsByYearText,
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
