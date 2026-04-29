/**
 * Wave Executor — Task-based
 *
 * 각 태스크는 1개의 Gemini API 호출(또는 Phase 2의 경우 3개)을 실행한다.
 * run-pipeline API Route에서 의존성 기반 병렬 웨이브로 실행된다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReportPlan, ReportSection, StudentInfo } from "../types.ts";
import { buildSystemPromptPrefix } from "../prompts/system.ts";
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

import type { GeminiClient, GeminiModelName } from "./gemini-client.ts";
import {
  preprocess,
  buildUniversityCandidatesText,
  buildHopeUniversityRecommendations,
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

  const systemPrefix = buildSystemPromptPrefix(plan, { isGyogwaOnly });
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

  const callGemini = async <T>(
    prompt: string,
    opts?: {
      maxOutputTokens?: number;
      model?: GeminiModelName;
      /** true이면 flash-lite/2.0-flash 폴백 금지 (품질 민감 섹션용) */
      strictModel?: boolean;
    }
  ): Promise<T> => {
    const result = await client.call<T>({
      systemPrefix,
      prompt,
      responseSchema: EMPTY_SCHEMA,
      thinkingBudget: THINKING_BUDGET,
      ...(opts?.maxOutputTokens && {
        maxOutputTokens: opts.maxOutputTokens,
      }),
      ...(opts?.model && { model: opts.model }),
      ...(opts?.strictModel && { strictModel: true }),
    });
    return result.data;
  };

  // Phase 2(사실적 데이터 추출)는 플랜과 무관하게 동일한 결과를 내야 함
  // → 플랜별 "분석 깊이" 지시가 포함되지 않도록 premium 시스템 prefix 고정
  const phase2SystemPrefix = buildSystemPromptPrefix("premium", {
    isGyogwaOnly,
  });
  const callGeminiPhase2 = async <T>(prompt: string): Promise<T> => {
    const result = await client.call<T>({
      systemPrefix: phase2SystemPrefix,
      prompt,
      responseSchema: EMPTY_SCHEMA,
      thinkingBudget: THINKING_BUDGET,
    });
    return result.data;
  };

  let updatedSer = { ...ser };
  const taskIndex = state.currentTaskIndex + 1;

  // ─── Phase 2 Extract: competencyExtraction + academicAnalysis 병렬 ───
  // studentTypeClassification은 phase2Classify 태스크로 분리되어
  // 후속 섹션 웨이브와 병렬로 실행됨.
  if (taskId === "phase2Extract") {
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
    // 한쪽 실패 시 나머지가 미처리 rejection이 되지 않도록 방어
    compExtrPromise.catch(() => {});
    acadAnalPromise.catch(() => {});

    const [competencyExtraction, academicAnalysis] = await Promise.all([
      compExtrPromise,
      acadAnalPromise,
    ]);

    updatedSer = {
      ...updatedSer,
      compExtrText: JSON.stringify({
        ...competencyExtraction,
        // 하위 태스크가 리포트 텍스트에 사용할 정식 계열 명칭
        ...(competencyExtraction.detectedMajorGroup
          ? {
              detectedMajorGroupLabel: getMajorGroupLabel(
                competencyExtraction.detectedMajorGroup
              ),
            }
          : {}),
      }),
      acadAnalText: JSON.stringify(academicAnalysis),
    };

    // 생기부 기반 계열로 평가 기준 + 대학 후보군 항상 재생성
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
      competencyExtraction.detectedMajorGroup = detected;
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
        // studentTypeClassification은 phase2Classify 태스크에서 채움
        studentTypeClassification:
          state.phase2Results?.studentTypeClassification ??
          (undefined as unknown as StudentTypeClassificationOutput),
      },
      serializedTexts: updatedSer,
      completedSections: sections,
      currentTaskIndex: taskIndex,
      lastCompletedWave: state.lastCompletedWave + 1,
    };

    if (!options?.skipSave) {
      const progress = computeProgress(taskIndex, state.totalTasks);
      await saveWaveState(
        supabase,
        reportId,
        nextState,
        progress,
        "phase2Extract"
      );
    }
    return nextState;
  }

  // ─── Phase 2 Classify: studentTypeClassification (phase2Extract 결과 필요) ───
  // 이 태스크는 다른 Wave 2 섹션 태스크들과 병렬로 실행됨.
  if (taskId === "phase2Classify") {
    const studentTypeClassification =
      await callGeminiPhase2<StudentTypeClassificationOutput>(
        buildStudentTypeClassificationPrompt({
          competencyExtraction: ser.compExtrText!,
          preprocessedAcademicData: texts.preprocessedAcademicDataText,
          studentProfile: texts.studentProfileText,
          gradingSystem: state.preprocessedData?.gradingSystem,
        })
      );

    updatedSer = {
      ...updatedSer,
      stuTypeText: JSON.stringify(studentTypeClassification),
    };

    const nextState: WaveState = {
      ...state,
      phase2Results: {
        ...(state.phase2Results ?? {
          competencyExtraction:
            undefined as unknown as CompetencyExtractionOutput,
          academicAnalysis:
            undefined as unknown as AcademicContextAnalysisOutput,
          studentTypeClassification,
        }),
        studentTypeClassification,
      },
      serializedTexts: updatedSer,
      completedSections: sections,
      currentTaskIndex: taskIndex,
      lastCompletedWave: state.lastCompletedWave + 1,
    };

    if (!options?.skipSave) {
      const progress = computeProgress(taskIndex, state.totalTasks);
      await saveWaveState(
        supabase,
        reportId,
        nextState,
        progress,
        "phase2Classify"
      );
    }
    return nextState;
  }

  // ─── Section generation: 각각 1개 Gemini 호출 ───

  let section: ReportSection | null = null;

  switch (taskId) {
    case "studentProfile": {
      // Premium 전용: admissionStrategy 결과를 입력으로 받아 strategy bullet 생성에 활용.
      // 다른 플랜은 명시적으로 undefined 전달 (프롬프트에서 해당 입력 블록 자체가 비활성화됨).
      let admissionStrategyResult: string | undefined;
      if (plan === "premium") {
        const existingAdmStrategy = sections.find(
          (s) => s.sectionId === "admissionStrategy"
        );
        if (existingAdmStrategy) {
          admissionStrategyResult = JSON.stringify(existingAdmStrategy);
        }
      }
      section = await callGemini<ReportSection>(
        buildStudentProfilePrompt(
          {
            studentTypeClassification: ser.stuTypeText!,
            studentProfile: texts.studentProfileText,
            admissionStrategyResult,
          },
          plan
        )
      );
      break;
    }

    case "competencyScore": {
      // 전공 관련 과목 평균 vs 전체 평균 비교 — 코드에서 결정적 판정.
      // academicAnalysis가 같은 데이터로 동일 판정을 사용하므로 두 섹션의
      // 결론이 학생/학부모에게 일관되게 보이게 한다.
      const compMajorRelevanceFact = (() => {
        const m = state.preprocessedData?.majorRelated;
        if (
          !m ||
          typeof m.relatedAverage !== "number" ||
          typeof m.overallAverage !== "number" ||
          typeof m.diff !== "number"
        ) {
          return undefined;
        }
        const { relatedAverage, overallAverage, diff } = m;
        const absDiff = Math.abs(diff).toFixed(2);
        if (diff > 0.1) {
          return `전공 관련 과목 평균 ${relatedAverage}등급 vs 전체 평균 ${overallAverage}등급 → 전공 관련 과목 평균이 전체 평균보다 ${absDiff}등급 낮은 성취도 (등급 숫자가 클수록 성취도 낮음). 진로역량 교과성취도에서 "전체 평균 대비 전공 관련 과목 성취도 낮음" 또는 "보완 필요"로 서술.`;
        }
        if (diff < -0.1) {
          return `전공 관련 과목 평균 ${relatedAverage}등급 vs 전체 평균 ${overallAverage}등급 → 전공 관련 과목 평균이 전체 평균보다 ${absDiff}등급 높은 성취도 (등급 숫자가 작을수록 성취도 높음). 진로역량 교과성취도에서 "전체 평균 대비 전공 관련 과목 성취도 우수"로 서술.`;
        }
        return `전공 관련 과목 평균 ${relatedAverage}등급 vs 전체 평균 ${overallAverage}등급 → 두 평균이 ${absDiff}등급 이내로 유사. 진로역량 교과성취도에서 "전체 평균과 유사한 수준"으로 서술.`;
      })();

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
        dataYearsPresent: state.preprocessedData!.dataYearsPresent,
        majorRelevanceFact: compMajorRelevanceFact,
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
      // 추가 과목 이수가 사실상 불가능한 시점 판정.
      // - 졸업생: 항상 잠금
      // - 3학년 + 2학기 후반(9월 이후): 학기 진행 중이라 새 진로선택과목 이수 어려움
      //   (한국 고교 학사: 1학기 3~7월, 2학기 9~12월. 8월 방학·수강신청 직전까지는 가능)
      // - 그 외(1·2학년, 3학년 1학기, 8월 이전): 잔여 학기에 이수 가능
      const currentMonth = new Date().getMonth() + 1; // 1~12
      const enrollmentLocked =
        studentInfo.isGraduate === true ||
        (studentInfo.grade === 3 && currentMonth >= 9);

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
            isGraduate: studentInfo.isGraduate,
            enrollmentLocked,
            plannedSubjects: texts.plannedSubjectsText,
          },
          plan
        )
      );
      break;
    }

    case "subjectAnalysis": {
      // 학년별 분할 호출 — 한 호출에 모든 학년을 넣으면 출력이 MAX_TOKENS에 걸려
      // JSON이 잘리고 파이프라인이 실패. 학년별로 분할하면 각 호출 출력이
      // 1/3 이하로 보장되어 결정적으로 잘리지 않음.
      const subjectDataAll = texts.subjectDataText;

      // "[N학년 과목명]\n내용\n\n..." 형식을 학년별로 분리
      const blocks = subjectDataAll
        .split(/\n\n(?=\[\d학년)/)
        .filter((b) => b.trim().length > 0);
      const blocksByYear = new Map<number, string[]>();
      for (const block of blocks) {
        const match = block.match(/^\[(\d)학년/);
        if (!match) continue;
        const year = parseInt(match[1], 10);
        const existing = blocksByYear.get(year) ?? [];
        existing.push(block);
        blocksByYear.set(year, existing);
      }

      const yearsToCall = [1, 2, 3].filter((y) => blocksByYear.has(y));

      // 학년별 데이터가 전혀 없는 경우 — 기존처럼 전체 한 번 호출 (분할 의미 없음)
      if (yearsToCall.length === 0) {
        section = await callGemini<ReportSection>(
          buildSubjectAnalysisPrompt(
            {
              subjectData: subjectDataAll,
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
          ),
          { maxOutputTokens: 16384 }
        );
      } else {
        // 학년별 병렬 호출
        const yearResults = await Promise.all(
          yearsToCall.map((year) =>
            callGemini<ReportSection>(
              buildSubjectAnalysisPrompt(
                {
                  subjectData: blocksByYear.get(year)!.join("\n\n"),
                  studentProfile: texts.studentProfileText,
                  studentGrade: studentInfo.grade,
                  isGraduate: studentInfo.isGraduate,
                  isMedical,
                  gradingSystem: state.preprocessedData!.gradingSystem,
                  isGyogwaOnly,
                  detectedMajorGroupLabel: detectedMajorForFlags
                    ? getMajorGroupLabel(detectedMajorForFlags)
                    : undefined,
                  targetYear: year,
                },
                plan
              ),
              { maxOutputTokens: 16384 }
            )
          )
        );

        // 결과 합치기 — 같은 subjectName은 가장 최근 학년만 유지
        const merged = new Map<string, Record<string, unknown>>();
        for (const yr of yearResults) {
          const subjects = (yr as unknown as Record<string, unknown>)
            .subjects as Record<string, unknown>[] | undefined;
          if (!Array.isArray(subjects)) continue;
          for (const subj of subjects) {
            const name = subj.subjectName as string | undefined;
            if (!name) continue;
            const existing = merged.get(name);
            const subjYear = (subj.year as number | undefined) ?? 0;
            const existingYear = (existing?.year as number | undefined) ?? -1;
            if (!existing || subjYear > existingYear) {
              merged.set(name, subj);
            }
          }
        }
        const mergedSubjects = Array.from(merged.values()).sort((a, b) => {
          const ay = (a.year as number | undefined) ?? 0;
          const by = (b.year as number | undefined) ?? 0;
          if (ay !== by) return ay - by;
          return ((a.subjectName as string) ?? "").localeCompare(
            (b.subjectName as string) ?? ""
          );
        });

        section = {
          sectionId: "subjectAnalysis",
          title: "과목별 분석",
          subjects: mergedSubjects,
        } as unknown as ReportSection;

        console.log(
          `[report:${reportId}] subjectAnalysis 학년별 분할 호출 ${yearsToCall.length}회 완료, 합쳐진 과목 ${mergedSubjects.length}개`
        );
      }

      updatedSer = {
        ...updatedSer,
        subjAnalysisText: JSON.stringify(section),
      };
      break;
    }

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
            // subjectAnalysis AI 결과 대신 raw subjectData 사용 → subjectAnalysis 의존성 제거
            subjectData: texts.subjectDataText,
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
            // subjectAnalysis AI 결과 대신 raw subjectData 사용 → subjectAnalysis 의존성 제거
            subjectData: texts.subjectDataText,
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

      // 희망대학이 없어도 코드 산정 후보군 + 생기부 기반으로 일반 판단을 수행한다.
      // (사용자에게 "희망대학이 없어 분석을 못 했다"고 표시하는 fallback은 사용하지 않음)
      const gyogwaInput = {
        academicAnalysis: predGyogwaAcadText,
        studentProfile: texts.studentProfileText,
        academicAnalysisResult: predGyogwaAcadSectionText,
        targetUniversities: gyogwaTargetText,
        gradingSystem: state.preprocessedData!.gradingSystem,
        isMedical,
        isArtSportPractical,
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
                hopeDepartment: predHopeDept,
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

        // recommendedType 결정: AI(학종 프롬프트)가 활동/세특 종합 분석한 결과를 신뢰.
        // 학종은 본질적으로 단일 합격률로 측정 불가하므로 passRateRange가 [0,0]으로 고정됨.
        // → 단순 합격률 비교로 교과를 강제하면 항상 교과 승 → 학종 강점 학생도 잘못된 추천을 받음.
        // 따라서 다음 두 케이스에만 교과로 override:
        //   (a) AI가 recommendedType을 결정하지 못한 경우(빈 값/undefined)
        //   (b) 모든 학종 universityPredictions의 chance가 "very_low" + 교과 합격률이 압도적으로 높음(60%+)
        const gyogwaMax = (gyogwaResult as any).passRateRange?.[1] ?? 0;
        const collectChances = (preds: any[]): string[] => {
          const chances: string[] = [];
          for (const p of preds) {
            if (Array.isArray(p?.universityPredictions)) {
              for (const up of p.universityPredictions) {
                if (typeof up?.chance === "string") chances.push(up.chance);
              }
            }
          }
          return chances;
        };
        const hakjongChances = collectChances(hakjongPredictions);
        const allHakjongVeryLow =
          hakjongChances.length > 0 &&
          hakjongChances.every((c) => c === "very_low");
        const aiRecType = (merged as any).recommendedType;
        if (!aiRecType || aiRecType === "") {
          // (a) AI가 결정 못함 → 교과로 fallback
          (merged as any).recommendedType = "교과";
          (merged as any).recommendedTypeReason =
            (gyogwaResult as any).analysis ??
            "교과전형의 합격 가능성이 가장 높습니다.";
        } else if (allHakjongVeryLow && gyogwaMax >= 60) {
          // (b) 학종 모두 매우 낮음 + 교과 압도적 → 교과로 override
          (merged as any).recommendedType = "교과";
          (merged as any).recommendedTypeReason =
            (gyogwaResult as any).analysis ??
            "학종은 합격 가능성이 매우 낮고 교과전형의 합격 가능성이 압도적으로 높습니다.";
        }
        // 그 외에는 AI가 결정한 학종/고른기회 추천 그대로 유지

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
        // admissionPrediction 결과 — recommendedPath의 추천 전형이 admissionPrediction과
        // 일치해야 학생/학부모에게 일관된 정보가 전달됨
        admissionPredictionResult: ser.admPredText,
        // 학종 분석용 생기부 데이터 — 교과전형 전용일 때는 전달하지 않음
        ...(!isGyogwaOnly && {
          competencyExtraction: ser.compExtrText,
          subjectAnalysisResult: ser.subjAnalysisText,
        }),
      };
      // flash 전면 503 — 품질 민감 섹션도 flash-lite 사용 (DEFAULT_MODEL)
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

        // 희망대학 중 majorExploration 추천 학과와 매칭되는 곳을 1~2개 머지.
        // 학생이 이미 의지 있는 곳을 추천대학에서 누락시키지 않기 위함.
        let hopeRecommended: ReturnType<
          typeof buildHopeUniversityRecommendations
        > = [];
        if (majorExplSection) {
          const suggestions = (
            majorExplSection as unknown as Record<string, unknown>
          ).suggestions as { major: string }[] | undefined;
          if (suggestions && suggestions.length > 0) {
            hopeRecommended = buildHopeUniversityRecommendations(
              studentInfo.targetUniversities,
              suggestions.map((s) => s.major),
              state.preprocessedData?.overallAverage,
              state.preprocessedData?.gradingSystem,
              studentInfo.schoolType,
              isGyogwaOnly
            );
          }
        }

        // 중복 제거하면서 머지 — codeRecommended에 이미 있는 (대학,학과)는 유지
        const mergedCards: {
          university: string;
          department: string;
          tier?: string;
          recommendedAdmissionType: "학종" | "교과";
        }[] = codeRecommended.map((c) => ({
          university: c.university,
          department: c.department,
          tier: c.tier,
          recommendedAdmissionType: c.recommendedAdmissionType!,
        }));
        for (const hope of hopeRecommended) {
          const dupKey = `${hope.university}|${hope.department}`;
          const exists = mergedCards.some(
            (m) => `${m.university}|${m.department}` === dupKey
          );
          if (!exists) mergedCards.push(hope);
        }

        if (mergedCards.length > 0) {
          const strat = section as unknown as Record<string, unknown>;
          strat.simulations = [
            {
              description: "AI 추천 전공 기반 대학 추천",
              cards: mergedCards.map((c) => ({
                university: c.university,
                department: c.department,
                recommendedAdmissionType: c.recommendedAdmissionType,
                tier: c.tier,
              })),
            },
          ];
          if (hopeRecommended.length > 0) {
            console.log(
              `[report:${reportId}] admissionStrategy 희망대학 ${hopeRecommended.length}개 머지: ${hopeRecommended.map((h) => `${h.university} ${h.department}`).join(", ")}`
            );
          }
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
      // 학과 추천은 단수 detectedMajorGroup 하나만 신뢰 (다른 모든 섹션과 동일).
      // 융합형 분기·detectedMajorGroups(복수)·toolGroupsUsed 등 별도 트랙은 제거.
      let detectedMajorForExploration =
        state.phase2Results?.competencyExtraction?.detectedMajorGroup;
      let detectedDepartmentsForExploration: string[] | undefined =
        state.phase2Results?.competencyExtraction?.detectedDepartments ??
        state.phase2Results?.competencyExtraction?.detectedDepartmentKeywords;
      if (!detectedMajorForExploration && ser.compExtrText) {
        try {
          const parsed = JSON.parse(ser.compExtrText);
          detectedMajorForExploration = parsed.detectedMajorGroup;
          detectedDepartmentsForExploration =
            parsed.detectedDepartments ??
            parsed.detectedDepartmentKeywords ??
            detectedDepartmentsForExploration;
        } catch {
          // 파싱 실패 시 무시
        }
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
        detectedDepartments: detectedDepartmentsForExploration,
      });
      // 플랜 간 추천 전공 일관성을 위해 시스템 prefix도 플랜 무관하게 고정
      // (systemPrefix는 플랜별 "분석 깊이" 지시를 포함하므로, 여기서는 premium 기준 사용)
      const majorSystemPrefix = buildSystemPromptPrefix("premium", {
        isGyogwaOnly,
      });
      const majorResult = await client.call<ReportSection>({
        systemPrefix: majorSystemPrefix,
        prompt: majorPrompt,
        responseSchema: EMPTY_SCHEMA,
        thinkingBudget: THINKING_BUDGET,
        seed: Math.abs(majorSeed),
      });
      section = majorResult.data;

      // ── 학과 추천 보정 ──
      // 다른 모든 섹션과 동일하게 단수 detectedMajorGroup 하나에만 정렬한다.
      // AI가 도구·인접 분야(데이터사이언스/AI/통계 등)를 다양성 명목으로 끼워넣는
      // 사례가 만성적이라, 학과명을 GROUP_KEYWORDS로 역분류해서 strength 계열 1개에
      // 매칭되는 학과만 통과시킨다. 모자라면 같은 그룹 → 인접 그룹 default로 보충.
      const explorationSection = section as unknown as Record<string, unknown>;
      const explorationSuggestions = explorationSection?.suggestions as
        | {
            major?: string;
            university?: string;
            fitScore?: number;
            rationale?: string;
            strengthMatch?: string[];
            gapAnalysis?: string;
            [k: string]: unknown;
          }[]
        | undefined;
      if (Array.isArray(explorationSuggestions)) {
        const detectedDepts = (detectedDepartmentsForExploration ?? []).filter(
          (d): d is string => typeof d === "string" && d.length > 0
        );
        const primaryGroup = detectedMajorForExploration;

        // majorGroup → 학과명 키워드 매핑 (학과 분류용)
        const GROUP_KEYWORDS: Record<string, string[]> = {
          의생명: ["의생명", "의예", "치의", "한의", "수의", "의학", "임상"],
          약학: ["약학", "제약"],
          생명과학: ["생명과학", "생물", "분자생물", "생화학", "생리학"],
          바이오: ["바이오", "유전공학", "생명공학"],
          간호보건: ["간호", "보건", "물리치료", "작업치료", "방사선"],
          컴퓨터AI: [
            "컴퓨터",
            "소프트웨어",
            "정보통신",
            "정보보안",
            "사이버",
            "인공지능",
            "AI",
            "데이터사이언스",
            "빅데이터",
          ],
          공학: [
            "기계",
            "전기",
            "전자",
            "재료",
            "신소재",
            "건축",
            "토목",
            "산업공학",
            "조선",
            "항공",
            "환경공학",
            "원자력",
          ],
          자연과학: ["수학과", "물리", "화학과", "통계", "지구과학", "천문"],
          화학재료: ["화학공학", "재료", "신소재", "응용화학"],
          사회과학: [
            "사회학",
            "정치",
            "외교",
            "행정",
            "법학",
            "심리",
            "지리",
            "사회복지",
          ],
          경영경제: ["경영", "경제", "회계", "금융", "통상", "무역"],
          인문: ["국어국문", "영어영문", "철학", "사학", "역사", "어문"],
          교육: ["교육학"],
          예체능교육: ["체육교육", "음악교육", "미술교육"],
          예체능: [
            "연극",
            "영화",
            "영상",
            "회화",
            "조소",
            "디자인",
            "음악",
            "미술",
            "체육",
            "무용",
            "공예",
            "사진",
            "공연",
          ],
          미디어: ["미디어", "방송", "언론", "광고", "홍보", "콘텐츠", "신문"],
        };

        // 학과명 → 어느 계열(들)에 속하는지 역분류
        const classifyDeptToGroups = (dept: string): string[] => {
          const groups: string[] = [];
          for (const [g, kws] of Object.entries(GROUP_KEYWORDS)) {
            if (kws.some((kw) => dept.includes(kw))) groups.push(g);
          }
          return groups;
        };

        // primaryGroup에 속하는 학과만 통과. 다른 그룹은 모두 차단.
        // (학생의 detectedMajorGroup이 "약학"이면 약학 키워드 매칭 학과만 통과)
        const matchesPrimaryGroup = (m: string | undefined): boolean => {
          if (!m) return false;
          const deptGroups = classifyDeptToGroups(m);
          if (deptGroups.length > 0) {
            return primaryGroup ? deptGroups.includes(primaryGroup) : false;
          }
          // 어느 GROUP_KEYWORDS와도 매칭 안 되는 니치 학과는 detectedDepts에 있을 때만 허용
          return detectedDepts.some((d) => m.includes(d) || d.includes(m));
        };

        // 그룹별 기본 추천 학과 (폴백 보충용)
        const GROUP_DEFAULT_DEPARTMENTS: Record<string, string[]> = {
          의생명: ["의생명과학과", "의예과", "의학과"],
          약학: ["약학과", "제약학과", "제약공학과", "바이오제약학과"],
          생명과학: [
            "생명과학과",
            "생물학과",
            "분자생물학과",
            "생화학과",
            "유전공학과",
          ],
          바이오: ["생명공학과", "바이오공학과", "유전공학과", "생물공학과"],
          간호보건: ["간호학과", "보건학과", "임상병리학과"],
          컴퓨터AI: [
            "컴퓨터공학과",
            "소프트웨어학과",
            "인공지능학과",
            "데이터사이언스학과",
          ],
          공학: ["기계공학과", "전기공학과", "전자공학과", "재료공학과"],
          자연과학: ["수학과", "물리학과", "화학과", "통계학과"],
          화학재료: ["화학공학과", "재료공학과", "응용화학과"],
          사회과학: ["사회학과", "심리학과", "정치외교학과", "행정학과"],
          경영경제: ["경영학과", "경제학과", "회계학과"],
          인문: ["국어국문학과", "영어영문학과", "철학과", "사학과"],
          교육: ["교육학과"],
          예체능교육: ["체육교육과", "음악교육과", "미술교육과"],
          예체능: ["연극영화학과", "디자인학과", "체육학과", "음악학과"],
          미디어: ["미디어커뮤니케이션학과", "신문방송학과", "광고홍보학과"],
        };

        // 인접 그룹 (1순위 그룹의 default가 부족할 때만 보충용으로 사용)
        // primaryGroup이 의생명인 학생이 medical 차단 시 의생명과학과 1개만 남는 케이스에
        // 같은 의약생명 클러스터의 인접 그룹 default(제약학과 등)로 3개 보장.
        const ADJACENT_GROUPS: Record<string, string[]> = {
          의생명: ["생명과학", "약학", "바이오", "간호보건"],
          약학: ["의생명", "생명과학", "바이오", "화학재료"],
          생명과학: ["바이오", "의생명", "약학"],
          바이오: ["생명과학", "의생명", "약학", "화학재료"],
          간호보건: ["의생명", "생명과학"],
          컴퓨터AI: ["자연과학", "공학"],
          공학: ["컴퓨터AI", "자연과학", "화학재료"],
          자연과학: ["공학", "컴퓨터AI", "화학재료"],
          화학재료: ["공학", "자연과학", "바이오"],
          사회과학: ["경영경제", "인문", "미디어"],
          경영경제: ["사회과학"],
          인문: ["사회과학", "미디어", "교육"],
          교육: ["인문", "사회과학"],
          예체능교육: ["예체능", "교육"],
          예체능: ["예체능교육", "미디어"],
          미디어: ["사회과학", "인문", "예체능"],
        };

        const TARGET_COUNT = 3;

        // ── 의·치·한·약·수 학과 차단 (성적 미달 시) ──
        // 9등급제 2.0 / 5등급제 1.3 초과면 합격 불가능. 보정 단계에서 미리 제외해야
        // 같은 계열의 비제한 학과(제약학과 등)로 폴백 보충 가능.
        const overallAvg = state.preprocessedData?.overallAverage;
        const gradingSys = state.preprocessedData?.gradingSystem;
        const medicalThreshold = gradingSys === "5등급제" ? 1.3 : 2.0;
        const medicalRestricted =
          overallAvg != null && overallAvg > medicalThreshold;
        const MEDICAL_DEPT_PATTERN =
          /의예과|치의예과|한의예과|약학과|수의예과|의학과|치의학과|한의학과|수의학과/;
        const isMedicalBlocked = (dept: string | undefined): boolean =>
          medicalRestricted && !!dept && MEDICAL_DEPT_PATTERN.test(dept);

        if (primaryGroup) {
          // 1단계: AI suggestions 필터링 — primaryGroup 매칭 + medical 차단 통과만
          const kept = explorationSuggestions.filter(
            (s) => matchesPrimaryGroup(s.major) && !isMedicalBlocked(s.major)
          );
          const removed = explorationSuggestions.length - kept.length;

          const keptNames = new Set(
            kept.map((s) => s.major).filter((m): m is string => !!m)
          );

          const addDepartment = (dept: string) => {
            if (kept.length >= TARGET_COUNT) return;
            if (!dept || keptNames.has(dept)) return;
            if (isMedicalBlocked(dept)) return;
            kept.push({
              major: dept,
              university: kept[0]?.university ?? "",
              fitScore: kept.length === 0 ? 78 : 72 - kept.length * 3,
              rationale: `생기부 분석 결과 ${getMajorGroupLabel(primaryGroup)} 분야 탐구가 강하게 드러나, 해당 분야 핵심 학과로 적합합니다.`,
              strengthMatch: ["생기부 강점 계열 부합"],
              gapAnalysis: "구체 보완 활동은 약점 분석/실행 로드맵 섹션 참고",
            });
            keptNames.add(dept);
          };

          // 2단계: detectedDepts에서 보충 — primaryGroup에 속하는 것만
          for (const dept of detectedDepts) {
            if (kept.length >= TARGET_COUNT) break;
            if (!matchesPrimaryGroup(dept)) continue;
            addDepartment(dept);
          }

          // 3단계: primaryGroup의 GROUP_DEFAULT_DEPARTMENTS로 보충
          for (const dept of GROUP_DEFAULT_DEPARTMENTS[primaryGroup] ?? []) {
            if (kept.length >= TARGET_COUNT) break;
            addDepartment(dept);
          }

          // 4단계: 그래도 부족하면 인접 그룹의 default로 보충
          if (kept.length < TARGET_COUNT) {
            for (const adj of ADJACENT_GROUPS[primaryGroup] ?? []) {
              if (kept.length >= TARGET_COUNT) break;
              for (const dept of GROUP_DEFAULT_DEPARTMENTS[adj] ?? []) {
                if (kept.length >= TARGET_COUNT) break;
                addDepartment(dept);
              }
            }
          }

          // suggestions 전체 교체
          explorationSuggestions.length = 0;
          for (const s of kept.slice(0, TARGET_COUNT)) {
            explorationSuggestions.push(s);
          }

          if (removed > 0) {
            console.log(
              `[report:${reportId}] majorExploration 강점 계열 불일치/의약학 차단 ${removed}개 항목 제거 → 보충 후 ${explorationSuggestions.length}개 (primary=${primaryGroup}, medicalRestricted=${medicalRestricted})`
            );
          }
          if (explorationSuggestions.length < TARGET_COUNT) {
            console.log(
              `[report:${reportId}] majorExploration 보충 후에도 ${explorationSuggestions.length}/${TARGET_COUNT}개 — primaryGroup 및 인접 그룹 default 부족`
            );
          }
        }
      }
      break;
    }

    case "consultantReview": {
      // majorExploration AI 추천 1순위 학과 추출 (보조 컨텍스트용)
      const consultMajorExpl = sections.find(
        (s) => s.sectionId === "majorExploration"
      ) as Record<string, unknown> | undefined;
      const consultAiMajor = (
        consultMajorExpl?.suggestions as { major: string }[] | undefined
      )?.[0]?.major;

      // 학생 1지망 학과 — 분석 프레임의 중심
      const consultStudentFirstChoiceMajor =
        studentInfo.targetDepartment ??
        studentInfo.targetUniversities?.[0]?.department ??
        undefined;

      // 과목별 평균 등급 → 강점/보통/약점 3티어 분류.
      // academicAbility 단락이 실제 등급과 어긋난 인상 평가를 만들지 않도록
      // 코드에서 결정한 분류를 프롬프트에 직접 주입한다.
      const consultSubjectGradeFacts = (() => {
        try {
          const acad = JSON.parse(ser.acadSectionText!);
          const grades = acad.subjectGrades as
            | Array<{ subject: string; grade: number }>
            | undefined;
          if (!Array.isArray(grades) || grades.length === 0) return undefined;
          const bySubject = new Map<string, number[]>();
          for (const g of grades) {
            if (typeof g.grade !== "number" || !g.subject) continue;
            const list = bySubject.get(g.subject) ?? [];
            list.push(g.grade);
            bySubject.set(g.subject, list);
          }
          const strength: string[] = [];
          const middle: string[] = [];
          const weakness: string[] = [];
          for (const [subject, list] of [...bySubject.entries()].sort()) {
            const m = list.reduce((s, v) => s + v, 0) / list.length;
            const label =
              list.length > 1
                ? `${subject} (평균 ${m.toFixed(2)}등급)`
                : `${subject} (${m}등급)`;
            if (m <= 2.0) strength.push(label);
            else if (m < 3.0) middle.push(label);
            else weakness.push(label);
          }
          const lines: string[] = [];
          if (strength.length)
            lines.push(`- 강점 티어 (평균 1~2등급): ${strength.join(", ")}`);
          if (middle.length)
            lines.push(`- 보통 티어 (평균 2~3등급): ${middle.join(", ")}`);
          if (weakness.length)
            lines.push(`- 약점 티어 (평균 3등급 이상): ${weakness.join(", ")}`);
          return lines.length > 0 ? lines.join("\n") : undefined;
        } catch {
          return undefined;
        }
      })();

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
        studentFirstChoiceMajor: consultStudentFirstChoiceMajor,
        dataYearsPresent: state.preprocessedData?.dataYearsPresent,
        subjectGradeFacts: consultSubjectGradeFacts,
        // preprocessedAcademicData 제거: 등급 원본이 있으면 AI가 재나열함
        // 생성된 academicAnalysis 섹션에 이미 정확한 등급 정보가 포함됨
      };
      // flash 전면 503 — 품질 민감 섹션도 flash-lite 사용 (DEFAULT_MODEL)
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
  } else {
    // 섹션 생성 태스크인데 결과가 없으면 조용히 넘어가지 않고 명시적으로 실패 처리.
    // (이전 구현은 section=null이어도 통과시켜, 누락된 섹션이 있어도 "성공"으로 취급됨)
    throw new Error(
      `섹션 생성 결과가 없습니다 (taskId=${taskId}) — AI 응답 누락 또는 처리 경로 오류`
    );
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
