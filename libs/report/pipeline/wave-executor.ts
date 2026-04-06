/**
 * Wave Executor — Task-based
 *
 * 각 태스크는 1개의 Gemini API 호출(또는 Phase 2의 경우 3개)을 실행한다.
 * run-pipeline API Route에서 의존성 기반 병렬 웨이브로 실행된다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReportPlan, ReportSection, StudentInfo } from "../types.ts";
import { buildSystemPrompt } from "../prompts/system.ts";
import { getMajorGroupLabel } from "../constants/major-evaluation-criteria.ts";

// Phase 2 prompts
import { buildCompetencyExtractionPrompt } from "../prompts/phase2/competency-extraction.ts";
import type { CompetencyExtractionOutput } from "../prompts/phase2/competency-extraction.ts";
import { buildAcademicContextAnalysisPrompt } from "../prompts/phase2/academic-analysis.ts";
import type { AcademicContextAnalysisOutput } from "../prompts/phase2/academic-analysis.ts";
import { buildStudentTypeClassificationPrompt } from "../prompts/phase2/student-type-classification.ts";
import type { StudentTypeClassificationOutput } from "../prompts/phase2/student-type-classification.ts";

// Section prompts
import { buildStudentProfilePrompt } from "../prompts/sections/student-profile.ts";
import {
  buildCompetencyScorePrompt,
  buildGyogwaCompetencyScorePrompt,
} from "../prompts/sections/competency-score.ts";
import {
  buildAdmissionPredictionPrompt,
  buildGyogwaPredictionPrompt,
  buildHakjongPredictionPrompt,
} from "../prompts/sections/admission-prediction.ts";
import {
  buildAcademicAnalysisPrompt,
  buildGyogwaAcademicAnalysisPrompt,
} from "../prompts/sections/academic-analysis.ts";
import { buildCourseAlignmentPrompt } from "../prompts/sections/course-alignment.ts";
import { buildAttendanceAnalysisPrompt } from "../prompts/sections/attendance-analysis.ts";
import { buildActivityAnalysisPrompt } from "../prompts/sections/activity-analysis.ts";
import { buildSubjectAnalysisPrompt } from "../prompts/sections/subject-analysis.ts";
import { buildBehaviorAnalysisPrompt } from "../prompts/sections/behavior-analysis.ts";
import {
  buildWeaknessAnalysisPrompt,
  buildGyogwaWeaknessAnalysisPrompt,
} from "../prompts/sections/weakness-analysis.ts";
import { buildTopicRecommendationPrompt } from "../prompts/sections/topic-recommendation.ts";
import { buildInterviewPrepPrompt } from "../prompts/sections/interview-prep.ts";
import {
  buildAdmissionStrategyPrompt,
  buildGyogwaAdmissionStrategyPrompt,
  buildDirectionGuidePrompt,
} from "../prompts/sections/admission-strategy.ts";
import { buildStoryAnalysisPrompt } from "../prompts/sections/story-analysis.ts";
import { buildActionRoadmapPrompt } from "../prompts/sections/action-roadmap.ts";
import { buildMajorExplorationPrompt } from "../prompts/sections/major-exploration.ts";
import {
  buildConsultantReviewPrompt,
  buildGyogwaConsultantReviewPrompt,
} from "../prompts/sections/consultant-review.ts";

import type { GeminiClient } from "./gemini-client.ts";
import {
  preprocess,
  buildUniversityCandidatesText,
  rebuildRecommendedCourseMatchText,
  isArtSportPractical as isArtSportPracticalFn,
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
  options?: { skipSave?: boolean; plannedSubjects?: string }
): Promise<WaveState> => {
  const recordData = await loadRecordData(supabase, recordId);
  const { data, texts } = preprocess(
    recordData,
    studentInfo,
    plan,
    options?.plannedSubjects
  );

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

  // 모든 희망대학이 학생부교과전형인지 판별 (시스템 프롬프트에서 사용)
  const isGyogwaOnly =
    (studentInfo.targetUniversities?.length ?? 0) > 0 &&
    studentInfo.targetUniversities!.every(
      (t) => t.admissionType === "학생부교과"
    );

  // 학생이 선택한 전형 목록 (중복 제거)
  const selectedAdmissionTypes = studentInfo.targetUniversities?.length
    ? [...new Set(studentInfo.targetUniversities.map((t) => t.admissionType))]
    : undefined;

  const systemPrompt = buildSystemPrompt(plan, { isGyogwaOnly });
  const sections = [...(state.completedSections ?? [])];
  // 생기부 기반 메디컬 판별 (Phase 2 결과 기반, 희망학과 아님)
  let detectedMajorForFlags =
    state.phase2Results?.competencyExtraction?.detectedMajorGroup;
  if (!detectedMajorForFlags && ser.compExtrText) {
    try {
      detectedMajorForFlags = JSON.parse(ser.compExtrText).detectedMajorGroup;
    } catch {
      // 파싱 실패 시 무시
    }
  }
  // 의·치·한·약·수 판정: 생기부 계열 감지 + 성적 기준
  // 9등급제 2.0 이상(또는 5등급제 1.3 이상)이면 의·치·한·약·수 합격 가능성이 사실상 없으므로
  // isMedical을 비활성화하여 비현실적인 의·치·한·약·수 가이드가 적용되지 않도록 함
  const detectedAsMedical = detectedMajorForFlags === "의생명";
  const avg = state.preprocessedData?.overallAverage;
  const gs = state.preprocessedData?.gradingSystem;
  const medicalGradeThreshold = gs === "5등급제" ? 1.3 : 2.0;
  const isMedical =
    detectedAsMedical && avg != null && avg <= medicalGradeThreshold;

  /** consultantReview 전달용: JSON 내 "university" 필드를 제거하여 대학명 노출 방지 */
  const stripUniversityNames = (jsonText: string): string => {
    try {
      const parsed = JSON.parse(jsonText);
      const walk = (obj: unknown): void => {
        if (Array.isArray(obj)) {
          obj.forEach(walk);
        } else if (obj && typeof obj === "object") {
          const rec = obj as Record<string, unknown>;
          delete rec.university;
          Object.values(rec).forEach(walk);
        }
      };
      walk(parsed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonText;
    }
  };

  /** 교과전형 전용: 정량분석 결과(acadAnalText)에서 학기별/과목별 데이터 제거
   *  교과전형은 최종 평균 등급으로만 판단하므로, 학기별 추세와 개별 과목 데이터를 제거 */
  const stripSemesterData = (jsonText: string): string => {
    try {
      const parsed = JSON.parse(jsonText);
      delete parsed.gradesByYear;
      delete parsed.averageByGrade;
      delete parsed.gradeTrend;
      // 개별 과목 데이터 제거 (교과전형은 최종 평균만 사용)
      delete parsed.allSubjectGrades;
      delete parsed.smallClassSubjects;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonText;
    }
  };

  /** 교과전형 전용: 섹션 결과(acadSectionText)에서 추세/과목별 데이터 제거
   *  교과전형은 최종 평균 등급으로만 판단하므로, 개별 과목 분석과 추세 데이터를 제거하여
   *  AI가 특정 과목이나 성적 변동을 교과전형 맥락에서 언급하는 것을 방지 */
  const stripSectionTrendData = (jsonText: string): string => {
    try {
      const parsed = JSON.parse(jsonText);
      // 추세 데이터 제거
      delete parsed.gradeChangeAnalysis;
      delete parsed.gradesByYear;
      delete parsed.gradeTrend;
      // 개별 과목 데이터 제거 (교과전형은 최종 평균만 사용)
      delete parsed.subjectGrades;
      delete parsed.subjectStatAnalyses;
      delete parsed.fiveGradeSimulation;
      delete parsed.majorRelevanceAnalysis;
      // AI 생성 텍스트에 포함된 과목별 언급도 제거
      // (interpretation, gradeDeviationAnalysis 등에 "물리학Ⅰ 5등급" 같은 문구가 남아
      //  교과전형 프롬프트에서 개별 과목 기반 판단을 유발)
      delete parsed.interpretation;
      delete parsed.gradeDeviationAnalysis;
      delete parsed.careerSubjectAnalyses;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonText;
    }
  };

  const callGemini = async <T>(prompt: string): Promise<T> => {
    const result = await client.call<T>({
      systemInstruction: systemPrompt,
      prompt,
      responseSchema: EMPTY_SCHEMA,
      thinkingBudget: THINKING_BUDGET,
    });
    return result.data;
  };

  // Phase 2(사실적 데이터 추출)는 플랜과 무관하게 동일한 결과를 내야 함
  // → 플랜별 "분석 깊이" 지시가 포함되지 않도록 premium 시스템 프롬프트 고정
  const phase2SystemPrompt = buildSystemPrompt("premium", { isGyogwaOnly });
  const callGeminiPhase2 = async <T>(prompt: string): Promise<T> => {
    const result = await client.call<T>({
      systemInstruction: phase2SystemPrompt,
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
    // 1) competencyExtraction + academicAnalysis 병렬 시작
    //    Phase 2는 사실적 추출이므로 callGeminiPhase2 사용 (플랜 무관 고정 프롬프트)
    const compExtrPromise = callGeminiPhase2<CompetencyExtractionOutput>(
      buildCompetencyExtractionPrompt({
        studentProfile: texts.studentProfileText,
        recordData: texts.recordDataText,
      })
    );
    const acadAnalPromise = callGeminiPhase2<AcademicContextAnalysisOutput>(
      buildAcademicContextAnalysisPrompt({
        preprocessedAcademicData: texts.preprocessedAcademicDataText,
        rawAcademicData: texts.rawAcademicDataText,
        studentProfile: texts.studentProfileText,
        gradingSystem: state.preprocessedData?.gradingSystem,
      })
    );
    // compExtrPromise 실패 시 acadAnalPromise가 미처리 rejection이 되지 않도록 방어
    acadAnalPromise.catch(() => {});

    // 2) competencyExtraction 완료 즉시 studentTypeClassification 시작
    //    (academicAnalysis 완료를 기다리지 않음)
    const competencyExtraction = await compExtrPromise;
    const stuTypePromise = callGeminiPhase2<StudentTypeClassificationOutput>(
      buildStudentTypeClassificationPrompt({
        competencyExtraction: JSON.stringify(competencyExtraction),
        preprocessedAcademicData: texts.preprocessedAcademicDataText,
        studentProfile: texts.studentProfileText,
        gradingSystem: state.preprocessedData?.gradingSystem,
      })
    );

    // 3) academicAnalysis + studentTypeClassification 동시 대기
    const [academicAnalysis, studentTypeClassification] = await Promise.all([
      acadAnalPromise,
      stuTypePromise,
    ]);

    updatedSer = {
      ...updatedSer,
      compExtrText: JSON.stringify({
        ...competencyExtraction,
        // 하위 태스크가 리포트 텍스트에 사용할 정식 계열 명칭
        // (예: "의생명" → "의학 계열", "약학" → "약학 계열")
        // detectedMajorGroup 원본 코드는 로직용으로 유지
        ...(competencyExtraction.detectedMajorGroup
          ? {
              detectedMajorGroupLabel: getMajorGroupLabel(
                competencyExtraction.detectedMajorGroup
              ),
            }
          : {}),
      }),
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
      // 단수 폴백 시 detectedMajorGroups도 동기화
      competencyExtraction.detectedMajorGroup = detected;
      if (
        !competencyExtraction.detectedMajorGroups ||
        competencyExtraction.detectedMajorGroups.length === 0
      ) {
        competencyExtraction.detectedMajorGroups = [detected];
      }
    }
    // detectedMajorGroups가 비어 있고 detectedMajorGroup만 있으면 단수→복수 동기화
    if (
      detected &&
      (!competencyExtraction.detectedMajorGroups ||
        competencyExtraction.detectedMajorGroups.length === 0)
    ) {
      competencyExtraction.detectedMajorGroups = [detected];
    }
    if (detected) {
      const detectedCriteria = findCriteriaByMajorGroup(detected);
      const correctedContext = formatMajorEvaluationContext(
        detectedCriteria,
        `${detected} (생기부 분석 기반)`,
        state.preprocessedData?.gradingSystem
      );
      // Phase 2에서 감지된 추천 학과명으로 커트라인 직접 검색
      const detectedDepts =
        competencyExtraction.detectedDepartments ??
        competencyExtraction.detectedDepartmentKeywords ??
        [];
      const correctedCandidates = buildUniversityCandidatesText(
        detected,
        state.preprocessedData?.gradingSystem,
        state.preprocessedData?.overallAverage,
        undefined,
        studentInfo.targetUniversities?.some(
          (t) => t.admissionType === "고른기회"
        ) ?? false,
        detectedDepts.length > 0 ? detectedDepts : undefined,
        studentInfo.schoolType,
        isGyogwaOnly,
        studentInfo.gender
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
        // 생기부 기반 예체능 실기 판별 (희망학과가 아닌 detected 기준)
        isArtSportPractical: detected === "예체능",
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

    case "competencyScore": {
      const compScoreInput = {
        studentTypeClassification: ser.stuTypeText!,
        competencyExtraction: ser.compExtrText!,
        preprocessedAcademicData: texts.preprocessedAcademicDataText,
        attendanceSummary: texts.attendanceSummaryText,
        studentProfile: texts.studentProfileText,
        studentGrade: studentInfo.grade,
        gradingSystem: state.preprocessedData!.gradingSystem,
        isMedical,
        isGyogwaOnly,
      };
      section = await callGemini<ReportSection>(
        isGyogwaOnly
          ? buildGyogwaCompetencyScorePrompt(compScoreInput, plan)
          : buildCompetencyScorePrompt(compScoreInput, plan)
      );
      break;
    }

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
      // isGyogwaOnly → 학기별 데이터 제거 (AI가 추세를 추론하지 못하게)
      let acadPreprocessedText = texts.preprocessedAcademicDataText;
      if (isGyogwaOnly) {
        try {
          const parsed = JSON.parse(acadPreprocessedText);
          delete parsed.subjectCombinations;
          delete parsed.averageByGrade;
          delete parsed.gradeTrend;
          acadPreprocessedText = JSON.stringify(parsed, null, 2);
        } catch {
          // 파싱 실패 시 원본 유지
        }
      }

      const acadInput = {
        quantitativeAnalysis: ser.acadAnalText!,
        preprocessedAcademicData: acadPreprocessedText,
        studentProfile: texts.studentProfileText,
        gradingSystem: preData.gradingSystem,
        studentGrade: studentInfo.grade,
        isGraduate: studentInfo.isGraduate,
        detectedMajorGroup: detectedMajorForAcad,
        completedSubjectsByYear: texts.completedSubjectsByYearText,
        plannedSubjects: texts.plannedSubjectsText,
        isGyogwaOnly,
      };
      section = await callGemini<ReportSection>(
        isGyogwaOnly
          ? buildGyogwaAcademicAnalysisPrompt(acadInput, plan)
          : buildAcademicAnalysisPrompt(acadInput, plan)
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
            studentGrade: studentInfo.grade,
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
            studentGrade: studentInfo.grade,
            isGraduate: studentInfo.isGraduate,
            isMedical,
            isGyogwaOnly,
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
            isGyogwaOnly,
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
            studentGrade: studentInfo.grade,
            isGraduate: studentInfo.isGraduate,
            isMedical,
            gradingSystem: state.preprocessedData!.gradingSystem,
            isGyogwaOnly,
            detectedMajorGroupLabel: detectedMajorForFlags
              ? getMajorGroupLabel(detectedMajorForFlags)
              : undefined,
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

    case "weaknessAnalysis": {
      // isGyogwaOnly → acadAnalText에서 학기별 데이터 제거 (추세 추론 방지)
      const weaknessAcadText = isGyogwaOnly
        ? stripSemesterData(ser.acadAnalText!)
        : ser.acadAnalText!;
      // 학과별 평가 기준 전달 (전공적합성 오판 방지)
      let weaknessMajorGroup = detectedMajorForFlags;
      if (!weaknessMajorGroup && ser.compExtrText) {
        try {
          weaknessMajorGroup = JSON.parse(ser.compExtrText).detectedMajorGroup;
        } catch {
          // 파싱 실패 시 무시
        }
      }
      const weaknessInput = {
        competencyExtraction: ser.compExtrText!,
        academicAnalysis: weaknessAcadText,
        studentProfile: texts.studentProfileText,
        isMedical,
        gradingSystem: state.preprocessedData!.gradingSystem,
        isGyogwaOnly,
        detectedMajorGroup: weaknessMajorGroup,
        majorEvaluationContext: texts.majorEvaluationContextText,
        plannedSubjects: texts.plannedSubjectsText,
        studentGrade: studentInfo.grade,
        isGraduate: studentInfo.isGraduate,
      };
      section = await callGemini<ReportSection>(
        isGyogwaOnly
          ? buildGyogwaWeaknessAnalysisPrompt(weaknessInput, plan)
          : buildWeaknessAnalysisPrompt(weaknessInput, plan)
      );
      updatedSer = {
        ...updatedSer,
        weaknessText: JSON.stringify(section),
      };
      break;
    }

    case "topicRecommendation": {
      // majorExploration에서 AI가 판단한 추천 학과 추출
      const topicMajorExpl = sections.find(
        (s) => s.sectionId === "majorExploration"
      ) as Record<string, unknown> | undefined;
      const topicAiMajors = (
        topicMajorExpl?.suggestions as { major: string }[] | undefined
      )
        ?.map((s) => s.major)
        ?.slice(0, 2);

      section = await callGemini<ReportSection>(
        buildTopicRecommendationPrompt(
          {
            subjectAnalysisResult: ser.subjAnalysisText!,
            weaknessAnalysisResult: ser.weaknessText ?? "[]",
            studentProfile: texts.studentProfileText,
            isGyogwaOnly,
            aiRecommendedMajors: topicAiMajors,
            plannedSubjects: texts.plannedSubjectsText,
            studentGrade: studentInfo.grade,
            isGraduate: studentInfo.isGraduate,
          },
          plan
        )
      );
      break;
    }

    case "interviewPrep":
      section = await callGemini<ReportSection>(
        buildInterviewPrepPrompt(
          {
            subjectAnalysisResult: ser.subjAnalysisText!,
            studentProfile: texts.studentProfileText,
            academicData: texts.rawAcademicDataText,
            studentGrade: studentInfo.grade,
            isMedical,
          },
          plan
        )
      );
      break;

    case "admissionPrediction": {
      // 교과 / 학종 분리 호출 — 교과 프롬프트에는 추세/발전가능성 개념 없음
      const isArtSportPractical = isArtSportPracticalFn(
        studentInfo.targetDepartment ?? ""
      );

      // 교과전형 프롬프트에는 항상 과목별/추세 데이터 제거
      // (교과전형은 최종 평균 등급으로만 판단하므로 개별 과목 정보 불필요)
      const predGyogwaAcadText = stripSemesterData(ser.acadAnalText!);
      const predGyogwaAcadSectionText = stripSectionTrendData(
        ser.acadSectionText!
      );

      // 전형별 필터링된 희망대학만 각 프롬프트에 전달
      const gyogwaTargetText = texts.targetUniversitiesByType.gyogwa;
      const hakjongTargetText = texts.targetUniversitiesByType.hakjong;

      // AI 감지 강점 계열/추천 학과명은 합격 예측 입력에서 모두 제외.
      // 학생 희망 학과와 섞이면 AI가 추천을 학생 희망으로 오인하여
      // "학생이 [감지된 계열]을 지향한다"는 잘못된 서술을 생성함.
      let predCompExtrText = ser.compExtrText!;
      try {
        const parsed = JSON.parse(predCompExtrText);
        delete parsed.detectedDepartments;
        delete parsed.detectedDepartmentKeywords;
        delete parsed.detectedMajorGroup;
        delete parsed.detectedMajorGroupLabel;
        delete parsed.detectedMajorReason;
        predCompExtrText = JSON.stringify(parsed);
      } catch {
        // 파싱 실패 시 원본 사용
      }

      // 합격 예측용 평가 기준은 학생 희망 학과 기준으로 재생성.
      // (texts.majorEvaluationContextText는 AI 감지 계열 기반이므로 부적합)
      const predHopeDept =
        studentInfo.targetDepartment ??
        studentInfo.targetUniversities?.[0]?.department ??
        "";
      let predMajorEvalContext = texts.majorEvaluationContextText;
      if (predHopeDept) {
        const hopeCriteria = matchMajorEvaluationCriteria(predHopeDept);
        predMajorEvalContext = formatMajorEvaluationContext(
          hopeCriteria,
          predHopeDept,
          state.preprocessedData?.gradingSystem,
          "hope"
        );
      }

      // 교과전형 희망대학 0건 여부 — 후보군 텍스트 환각 차단을 위한 분기
      const noGyogwaTargets =
        !gyogwaTargetText || gyogwaTargetText.trim().length === 0;

      const gyogwaInput = {
        academicAnalysis: predGyogwaAcadText,
        // 교과 희망대학이 0건이면 후보군 텍스트도 비움 (임의 대학명/학과 환각 차단)
        universityCandidates: noGyogwaTargets
          ? ""
          : texts.universityCandidatesText,
        studentProfile: texts.studentProfileText,
        academicAnalysisResult: predGyogwaAcadSectionText,
        targetUniversities: gyogwaTargetText,
        gradingSystem: state.preprocessedData!.gradingSystem,
        isMedical,
        isArtSportPractical,
        noGyogwaTargets,
        hopeDepartment: predHopeDept,
      };

      if (isGyogwaOnly) {
        // 모든 희망대학이 학생부교과 → 교과 전용 호출만 실행
        const gyogwaResult = await callGemini<Record<string, unknown>>(
          buildGyogwaPredictionPrompt(gyogwaInput, plan)
        );

        section = {
          sectionId: "admissionPrediction",
          title: "희망 학교·학과 판단",
          recommendedType: "교과",
          recommendedTypeReason:
            (gyogwaResult as any).analysis ??
            "모든 희망대학이 학생부교과전형으로, 교과전형을 추천합니다.",
          predictions: [gyogwaResult],
          overallComment:
            (gyogwaResult as any).overallComment ??
            "모든 희망대학이 학생부교과전형입니다. 최종 등급과 합격선을 기준으로 지원 전략을 수립하세요.",
        } as unknown as ReportSection;
      } else {
        // 혼합 — 교과 / 학종 병렬 호출
        const [gyogwaResult, hakjongResult] = await Promise.all([
          callGemini<Record<string, unknown>>(
            buildGyogwaPredictionPrompt(gyogwaInput, plan)
          ),
          callGemini<Record<string, unknown>>(
            buildHakjongPredictionPrompt(
              {
                competencyExtraction: predCompExtrText,
                academicAnalysis: ser.acadAnalText!,
                studentTypeClassification: ser.stuTypeText!,
                universityCandidates: texts.universityCandidatesText,
                studentProfile: texts.studentProfileText,
                subjectAnalysisResult: ser.subjAnalysisText!,
                academicAnalysisResult: ser.acadSectionText!,
                attendanceAnalysisResult: ser.attendSectionText!,
                majorEvaluationContext: predMajorEvalContext,
                targetUniversities: hakjongTargetText,
                gradingSystem: state.preprocessedData!.gradingSystem,
                isMedical,
                isArtSportPractical,
                includeNonsul: selectedAdmissionTypes?.includes("논술"),
              },
              plan
            )
          ),
        ]);

        // 병합: 학종을 base로, 교과 prediction 삽입
        const hakjongPredictions = Array.isArray(
          (hakjongResult as any).predictions
        )
          ? (hakjongResult as any).predictions
          : [];
        const merged = {
          ...hakjongResult,
          predictions: [...hakjongPredictions, gyogwaResult],
        };

        // recommendedType override: 교과가 가장 유리하면 교과로 변경
        const gyogwaMax = (gyogwaResult as any).passRateRange?.[1] ?? 0;
        const hakjongMax = hakjongPredictions.reduce(
          (max: number, p: any) => Math.max(max, p.passRateRange?.[1] ?? 0),
          0
        );
        if (gyogwaMax > hakjongMax && gyogwaMax > 0) {
          (merged as any).recommendedType = "교과";
          (merged as any).recommendedTypeReason =
            (gyogwaResult as any).analysis ??
            "교과전형의 합격 가능성이 가장 높습니다.";
        }

        section = merged as ReportSection;
      }

      updatedSer = {
        ...updatedSer,
        admPredText: JSON.stringify(section),
      };
      break;
    }

    case "admissionStrategy": {
      // majorExploration 추천 학과로 후보군을 재생성하여 일관성 구조적 보장
      // → admissionStrategy는 majorExploration이 추천한 학과의 대학만 볼 수 있음
      let stratCandidatesText = texts.universityCandidatesText;
      let majorExplDepts: string | undefined;
      const majorExplSection = sections.find(
        (s) => s.sectionId === "majorExploration"
      );
      if (majorExplSection) {
        try {
          const suggestions = (
            majorExplSection as unknown as Record<string, unknown>
          ).suggestions as { major: string }[] | undefined;
          if (suggestions && suggestions.length > 0) {
            const majorNames = suggestions.map((s) => s.major);
            majorExplDepts = majorNames.join(", ");
            // majorExploration 추천 학과를 우선순위 순으로 시도
            // 1순위만으로 상향2+적정2+안정2(6개) 구성 가능하면 나머지 제외
            const includeGorunGihoe =
              studentInfo.targetUniversities?.some(
                (t) => t.admissionType === "고른기회"
              ) ?? false;
            // 등급 -0.1 보정 (상향 대학 포함을 위해)
            const adjustedAvg = state.preprocessedData?.overallAverage
              ? state.preprocessedData.overallAverage - 0.1
              : state.preprocessedData?.overallAverage;

            // 상향/적정/안정 밸런스 체크 함수
            // cutoffData에서 교과 50%cut 추출 → adjustedAvg 기준 분류
            const checkBalance = (
              candidateJson: string
            ): {
              total: number;
              reach: number;
              fit: number;
              safety: number;
            } => {
              try {
                const parsed = JSON.parse(candidateJson) as {
                  cutoffData?: string;
                }[];
                let reach = 0;
                let fit = 0;
                let safety = 0;
                for (const c of parsed) {
                  if (!c.cutoffData) continue;
                  // 교과 합격선 값 추출 (첫 번째 교과 항목)
                  const cutMatch = c.cutoffData.match(
                    /교과\([^)]*\):\s*합격선=([\d.]+)/
                  );
                  if (!cutMatch) continue;
                  const cut = parseFloat(cutMatch[1]);
                  if (!adjustedAvg) continue;
                  const diff = adjustedAvg - cut;
                  if (diff >= 0.3) reach++;
                  else if (diff > 0.1)
                    reach++; // 소신 → reach 그룹
                  else if (diff >= -0.1) fit++;
                  else safety++;
                }
                return { total: parsed.length, reach, fit, safety };
              } catch {
                return { total: 0, reach: 0, fit: 0, safety: 0 };
              }
            };

            let rebuilt = "[]";
            let usedMajors: string[] = [];
            for (let i = 1; i <= majorNames.length; i++) {
              const tryMajors = majorNames.slice(0, i);
              const candidate = buildUniversityCandidatesText(
                tryMajors[0],
                state.preprocessedData?.gradingSystem,
                adjustedAvg,
                undefined,
                includeGorunGihoe,
                tryMajors,
                studentInfo.schoolType,
                isGyogwaOnly,
                studentInfo.gender,
                plan
              );
              if (candidate === "[]") continue;
              rebuilt = candidate;
              usedMajors = tryMajors;
              // 상향2+적정2+안정2 목표, 부족한 티어는 적정으로 대체 가능
              // 총 6개 이상 + 적정이 부족분을 채울 수 있으면 확정
              const bal = checkBalance(candidate);
              const reachShort = Math.max(0, 2 - bal.reach);
              const safetyShort = Math.max(0, 2 - bal.safety);
              const fitNeeded = 2 + reachShort + safetyShort;
              if (bal.total >= 6 && bal.fit >= fitNeeded) {
                break;
              }
            }

            if (rebuilt !== "[]") {
              stratCandidatesText = rebuilt;
              majorExplDepts = usedMajors.join(", ");
              texts.strategyUniversityCandidatesText = rebuilt;
              console.log(
                `[report:${reportId}] admissionStrategy 후보군을 majorExploration 결과로 재생성: [${usedMajors.join(", ")}] (${usedMajors.length}/${majorNames.length} 키워드 사용)`
              );
            }
          }
        } catch {
          // 파싱 실패 시 기존 후보군 유지
        }
      }

      // 교과 type 분석용: 과목별 데이터 strip된 성적 분석
      const stratGyogwaAcadText = stripSectionTrendData(ser.acadSectionText!);
      const stratInput = {
        // 교과전형 전용이면 strip된 데이터만, 혼합이면 원본 (학종에서 필요)
        academicAnalysis: isGyogwaOnly
          ? stratGyogwaAcadText
          : ser.acadSectionText!,
        // 혼합 모드에서 교과 type이 참조할 strip된 성적 (과목별 데이터 제거)
        gyogwaAcademicAnalysis: isGyogwaOnly ? undefined : stratGyogwaAcadText,
        universityCandidates: stratCandidatesText,
        recommendedCourseMatch: texts.recommendedCourseMatchText,
        studentProfile: texts.studentProfileText,
        gradingSystem: state.preprocessedData!.gradingSystem,
        studentGrade: studentInfo.grade,
        isGraduate: studentInfo.isGraduate,
        currentDate: new Date().toISOString().slice(0, 10),
        isMedical,
        completedSubjectsByYear: texts.completedSubjectsByYearText,
        plannedSubjects: texts.plannedSubjectsText,
        isArtSportPractical: texts.isArtSportPractical,
        selectedAdmissionTypes,
        majorExplorationDepartments: majorExplDepts,
        // 학종 분석용 생기부 데이터 — 교과전형 전용일 때는 전달하지 않음
        ...(!isGyogwaOnly && {
          competencyExtraction: ser.compExtrText,
          subjectAnalysisResult: ser.subjAnalysisText,
        }),
      };
      section = await callGemini<ReportSection>(
        isGyogwaOnly
          ? buildGyogwaAdmissionStrategyPrompt(stratInput, plan)
          : buildAdmissionStrategyPrompt(stratInput, plan)
      );

      // 코드 확정 추천대학을 simulations.cards에 삽입
      // AI가 생성한 cards를 코드에서 확정된 추천대학으로 대체
      try {
        const candidates = JSON.parse(stratCandidatesText) as {
          university: string;
          department: string;
          tier?: string;
          recommendedAdmissionType?: "학종" | "교과";
        }[];
        const codeRecommended = candidates.filter(
          (c) => c.recommendedAdmissionType
        );
        if (codeRecommended.length > 0) {
          const strat = section as unknown as Record<string, unknown>;
          // simulations.cards를 코드 확정 추천대학으로 대체
          strat.simulations = [
            {
              description: "AI 추천 전공 기반 대학 추천",
              cards: codeRecommended.map((c) => ({
                university: c.university,
                department: c.department,
                recommendedAdmissionType: c.recommendedAdmissionType,
                tier: c.tier,
              })),
            },
          ];
        }
      } catch {
        // 후보군 파싱 실패 시 AI 생성 결과 유지
      }

      updatedSer = {
        ...updatedSer,
        admStratText: JSON.stringify(section),
      };
      break;
    }

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
            isGraduate: studentInfo.isGraduate,
            isMedical,
            completedSubjectsByYear: texts.completedSubjectsByYearText,
            plannedSubjects: texts.plannedSubjectsText,
          },
          plan
        )
      );
      break;
    }

    case "majorExploration": {
      let detectedMajorForExploration =
        state.phase2Results?.competencyExtraction?.detectedMajorGroup;
      let detectedMajorGroupsForExploration: string[] | undefined =
        state.phase2Results?.competencyExtraction?.detectedMajorGroups;
      let detectedDepartmentsForExploration: string[] | undefined =
        state.phase2Results?.competencyExtraction?.detectedDepartments ??
        state.phase2Results?.competencyExtraction?.detectedDepartmentKeywords;
      if (!detectedMajorForExploration && ser.compExtrText) {
        try {
          const parsed = JSON.parse(ser.compExtrText);
          detectedMajorForExploration = parsed.detectedMajorGroup;
          detectedMajorGroupsForExploration =
            parsed.detectedMajorGroups ?? detectedMajorGroupsForExploration;
          detectedDepartmentsForExploration =
            parsed.detectedDepartments ??
            parsed.detectedDepartmentKeywords ??
            detectedDepartmentsForExploration;
        } catch {
          // 파싱 실패 시 무시
        }
      }
      // detectedMajorGroups가 비어 있으면 단수 detectedMajorGroup으로 폴백
      if (
        (!detectedMajorGroupsForExploration ||
          detectedMajorGroupsForExploration.length === 0) &&
        detectedMajorForExploration
      ) {
        detectedMajorGroupsForExploration = [detectedMajorForExploration];
      }
      // 플랜이 달라도 동일 학생이면 같은 추천 전공이 나오도록 seed 고정
      // 핵심 입력(competencyExtraction + studentProfile)의 해시를 seed로 사용
      const seedInput = `${ser.compExtrText}|${texts.studentProfileText}`;
      let majorSeed = 0;
      for (let i = 0; i < seedInput.length; i++) {
        majorSeed =
          ((majorSeed << 5) - majorSeed + seedInput.charCodeAt(i)) | 0;
      }
      const majorPrompt = buildMajorExplorationPrompt({
        competencyExtraction: ser.compExtrText!,
        academicAnalysis: ser.acadAnalText!,
        studentProfile: texts.studentProfileText,
        studentGrade: studentInfo.grade,
        targetDepartment: studentInfo.targetDepartment,
        detectedMajorGroup: detectedMajorForExploration,
        detectedMajorGroups: detectedMajorGroupsForExploration,
        detectedDepartments: detectedDepartmentsForExploration,
      });
      // 플랜 간 추천 전공 일관성을 위해 systemInstruction도 플랜 무관하게 고정
      // (systemPrompt는 플랜별 "분석 깊이" 지시를 포함하므로, 여기서는 premium 기준 사용)
      const majorSystemPrompt = buildSystemPrompt("premium", { isGyogwaOnly });
      const majorResult = await client.call<ReportSection>({
        systemInstruction: majorSystemPrompt,
        prompt: majorPrompt,
        responseSchema: EMPTY_SCHEMA,
        thinkingBudget: THINKING_BUDGET,
        seed: Math.abs(majorSeed),
      });
      section = majorResult.data;
      break;
    }

    case "consultantReview": {
      // majorExploration AI 추천 1순위 학과 추출
      const consultMajorExpl = sections.find(
        (s) => s.sectionId === "majorExploration"
      ) as Record<string, unknown> | undefined;
      const consultAiMajor = (
        consultMajorExpl?.suggestions as { major: string }[] | undefined
      )?.[0]?.major;

      // ── 중복 방지: academicAnalysis의 수치 데이터 + 판단 키워드만 전달 ──
      // 해석 문장을 그대로 전달하면 AI가 복붙하므로,
      // 구조화된 데이터는 유지하고 해석 텍스트는 키워드로 축약
      const consultAcadText = (() => {
        try {
          const acad = JSON.parse(ser.acadSectionText!);
          // 해석 텍스트 → 판단 키워드로 축약
          const summary: Record<string, unknown> = {
            overallAverageGrade: acad.overallAverageGrade,
            gradeTrend: acad.gradeTrend,
            gradesByYear: acad.gradesByYear,
            subjectGrades: acad.subjectGrades,
            subjectCombinations: acad.subjectCombinations,
            gradeDeviationAnalysis: acad.gradeDeviationAnalysis
              ? {
                  highestSubject: acad.gradeDeviationAnalysis.highestSubject,
                  lowestSubject: acad.gradeDeviationAnalysis.lowestSubject,
                  deviationRange: acad.gradeDeviationAnalysis.deviationRange,
                }
              : undefined,
            majorRelevanceAnalysis: acad.majorRelevanceAnalysis
              ? {
                  averageGrade: acad.majorRelevanceAnalysis.averageGrade,
                  relatedSubjects: acad.majorRelevanceAnalysis.relatedSubjects,
                }
              : undefined,
            // 해석 텍스트 → 판단 키워드만 축약
            _judgments: {
              overall: `평균 ${acad.overallAverageGrade}등급 → ${acad.gradeTrend === "상승" ? "상승세" : acad.gradeTrend === "하락" ? "하락세" : "유지"}`,
              competitiveness:
                (acad.overallAverageGrade ?? 5) <= 2
                  ? "상위권"
                  : (acad.overallAverageGrade ?? 5) <= 3
                    ? "중위권"
                    : "중하위권",
              actionItems: (acad.gradeChangeAnalysis?.actionItems ?? []).map(
                (item: string) =>
                  item.length > 30 ? `${item.substring(0, 30)}...` : item
              ),
            },
          };
          return JSON.stringify(summary);
        } catch {
          return ser.acadSectionText!;
        }
      })();

      const consultInput = {
        competencyExtraction: ser.compExtrText!,
        academicAnalysis: consultAcadText,
        studentProfile: texts.studentProfileText,
        subjectAnalysisResult: ser.subjAnalysisText!,
        weaknessAnalysisResult: ser.weaknessText,
        gradingSystem: state.preprocessedData?.gradingSystem,
        studentGrade: studentInfo.grade,
        isGraduate: studentInfo.isGraduate,
        currentDate: new Date().toISOString().slice(0, 10),
        isMedical,
        completedSubjectsByYear: texts.completedSubjectsByYearText,
        plannedSubjects: texts.plannedSubjectsText,
        isGyogwaOnly,
        selectedAdmissionTypes,
        detectedMajorGroup: detectedMajorForFlags,
        aiRecommendedMajor: consultAiMajor,
        // preprocessedAcademicData 제거: 등급 원본이 있으면 AI가 재나열함
        // 생성된 academicAnalysis 섹션에 이미 정확한 등급 정보가 포함됨
      };
      section = await callGemini<ReportSection>(
        isGyogwaOnly
          ? buildGyogwaConsultantReviewPrompt(consultInput, plan)
          : buildConsultantReviewPrompt(consultInput, plan)
      );
      break;
    }

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
