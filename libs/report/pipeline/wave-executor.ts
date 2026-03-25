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
import {
  buildCompetencyScorePrompt,
  buildGyogwaCompetencyScorePrompt,
} from "../prompts/sections/competency-score.ts";
import {
  buildAdmissionPredictionPrompt,
  buildGyogwaPredictionPrompt,
  buildHakjongJeongsiPredictionPrompt,
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
  const isMedical = detectedMajorForFlags === "의생명";

  /** 교과전형 전용: 정량분석 결과(acadAnalText)에서 학기별 데이터 제거 */
  const stripSemesterData = (jsonText: string): string => {
    try {
      const parsed = JSON.parse(jsonText);
      delete parsed.gradesByYear;
      delete parsed.averageByGrade;
      delete parsed.gradeTrend;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonText;
    }
  };

  /** 교과전형 전용: 섹션 결과(acadSectionText)에서 추세 분석 제거 */
  const stripSectionTrendData = (jsonText: string): string => {
    try {
      const parsed = JSON.parse(jsonText);
      delete parsed.gradeChangeAnalysis;
      delete parsed.gradesByYear;
      delete parsed.gradeTrend;
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

  let updatedSer = { ...ser };
  const taskIndex = state.currentTaskIndex + 1;

  // ─── Phase 2: competencyExtraction + academicAnalysis 병렬 → studentTypeClassification ───
  if (taskId === "phase2") {
    // 1) competencyExtraction + academicAnalysis 병렬 시작
    const compExtrPromise = callGemini<CompetencyExtractionOutput>(
      buildCompetencyExtractionPrompt({
        studentProfile: texts.studentProfileText,
        recordData: texts.recordDataText,
      })
    );
    const acadAnalPromise = callGemini<AcademicContextAnalysisOutput>(
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
    const stuTypePromise = callGemini<StudentTypeClassificationOutput>(
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
      // Phase 2에서 감지된 학과 키워드로 커트라인 직접 검색
      const deptKeywords =
        competencyExtraction.detectedDepartmentKeywords ?? [];
      const correctedCandidates = buildUniversityCandidatesText(
        detected,
        state.preprocessedData?.gradingSystem,
        state.preprocessedData?.overallAverage,
        undefined,
        studentInfo.targetUniversities?.some(
          (t) => t.admissionType === "고른기회"
        ) ?? false,
        deptKeywords.length > 0 ? deptKeywords : undefined,
        studentInfo.schoolType,
        isGyogwaOnly
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
        detectedMajorGroup: detectedMajorForAcad,
        completedSubjectsByYear: texts.completedSubjectsByYearText,
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
            isMedical,
            gradingSystem: state.preprocessedData!.gradingSystem,
            isGyogwaOnly,
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
      const weaknessInput = {
        competencyExtraction: ser.compExtrText!,
        academicAnalysis: weaknessAcadText,
        studentProfile: texts.studentProfileText,
        isMedical,
        gradingSystem: state.preprocessedData!.gradingSystem,
        isGyogwaOnly,
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

    case "topicRecommendation":
      section = await callGemini<ReportSection>(
        buildTopicRecommendationPrompt(
          {
            subjectAnalysisResult: ser.subjAnalysisText!,
            weaknessAnalysisResult: ser.weaknessText ?? "[]",
            studentProfile: texts.studentProfileText,
            isGyogwaOnly,
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

    case "admissionPrediction": {
      // 교과 / 학종+정시 분리 호출 — 교과 프롬프트에는 추세/발전가능성 개념 없음
      const isArtSportPractical = isArtSportPracticalFn(
        studentInfo.targetDepartment ?? ""
      );

      // isGyogwaOnly → 학기별 데이터 제거 (추세 추론 방지)
      const predAcadText = isGyogwaOnly
        ? stripSemesterData(ser.acadAnalText!)
        : ser.acadAnalText!;
      const predAcadSectionText = isGyogwaOnly
        ? stripSectionTrendData(ser.acadSectionText!)
        : ser.acadSectionText!;

      const gyogwaInput = {
        academicAnalysis: predAcadText,
        universityCandidates: texts.universityCandidatesText,
        studentProfile: texts.studentProfileText,
        academicAnalysisResult: predAcadSectionText,
        targetUniversities: texts.targetUniversitiesText,
        gradingSystem: state.preprocessedData!.gradingSystem,
        isMedical,
        isArtSportPractical,
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
        // 혼합 — 교과 / 학종+정시 병렬 호출
        const [gyogwaResult, hakjongResult] = await Promise.all([
          callGemini<Record<string, unknown>>(
            buildGyogwaPredictionPrompt(gyogwaInput, plan)
          ),
          callGemini<Record<string, unknown>>(
            buildHakjongJeongsiPredictionPrompt(
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
                isArtSportPractical,
              },
              plan
            )
          ),
        ]);

        // 병합: 학종+정시를 base로, 교과 prediction 삽입
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
      const stratInput = {
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
        selectedAdmissionTypes,
      };
      section = await callGemini<ReportSection>(
        buildAdmissionStrategyPrompt(stratInput, plan)
      );
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
            isMedical,
            completedSubjectsByYear: texts.completedSubjectsByYearText,
          },
          plan
        )
      );
      break;
    }

    case "majorExploration": {
      let detectedMajorForExploration =
        state.phase2Results?.competencyExtraction?.detectedMajorGroup;
      if (!detectedMajorForExploration && ser.compExtrText) {
        try {
          detectedMajorForExploration = JSON.parse(
            ser.compExtrText
          ).detectedMajorGroup;
        } catch {
          // 파싱 실패 시 무시
        }
      }
      section = await callGemini<ReportSection>(
        buildMajorExplorationPrompt(
          {
            competencyExtraction: ser.compExtrText!,
            academicAnalysis: ser.acadAnalText!,
            studentProfile: texts.studentProfileText,
            targetDepartment: studentInfo.targetDepartment,
            detectedMajorGroup: detectedMajorForExploration,
          },
          plan
        )
      );
      break;
    }

    case "consultantReview": {
      // isGyogwaOnly → acadAnalText에서 학기별 데이터 제거 (추세 추론 방지)
      const consultAcadText = isGyogwaOnly
        ? stripSemesterData(ser.acadAnalText!)
        : ser.acadAnalText!;

      const consultInput = {
        competencyExtraction: ser.compExtrText!,
        academicAnalysis: consultAcadText,
        studentProfile: texts.studentProfileText,
        subjectAnalysisResult: ser.subjAnalysisText!,
        admissionPredictionResult: ser.admPredText,
        weaknessAnalysisResult: ser.weaknessText,
        gradingSystem: state.preprocessedData?.gradingSystem,
        studentGrade: studentInfo.grade,
        currentDate: new Date().toISOString().slice(0, 10),
        isMedical,
        completedSubjectsByYear: texts.completedSubjectsByYearText,
        isGyogwaOnly,
        selectedAdmissionTypes,
        detectedMajorGroup: detectedMajorForFlags,
        targetDepartment: studentInfo.targetDepartment,
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
