import type { ReportPlan, ReportSection } from "../types.ts";
import { SECTION_ORDER } from "../types.ts";
import type { PreprocessedTexts, PreprocessedData } from "./preprocessor.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// Phase 2 결과 타입들
import type { CompetencyExtractionOutput } from "../prompts/phase2/competency-extraction.ts";
import type { AcademicContextAnalysisOutput } from "../prompts/phase2/academic-analysis.ts";
import type { StudentTypeClassificationOutput } from "../prompts/phase2/student-type-classification.ts";

export interface Phase2Results {
  competencyExtraction: CompetencyExtractionOutput;
  academicAnalysis: AcademicContextAnalysisOutput;
  studentTypeClassification: StudentTypeClassificationOutput;
}

export interface SerializedTexts {
  compExtrText?: string;
  acadAnalText?: string;
  stuTypeText?: string;
  acadSectionText?: string;
  attendSectionText?: string;
  subjAnalysisText?: string;
  weaknessText?: string;
  admPredText?: string;
}

export interface WaveState {
  preprocessedTexts?: PreprocessedTexts;
  preprocessedData?: PreprocessedData;
  phase2Results?: Phase2Results;
  completedSections?: ReportSection[];
  serializedTexts?: SerializedTexts;

  // Task queue: 남은 작업 목록
  taskQueue: string[];
  currentTaskIndex: number;
  totalTasks: number;

  lastCompletedWave: number;

  // 동시 실행 방지용 run ID
  runId?: string;
}

// ─── 플랜별 태스크 목록 생성 ───

export const buildTaskQueue = (
  plan: ReportPlan,
  isGrade1Only: boolean
): string[] => {
  const tasks: string[] = ["phase2"];
  const secs = SECTION_ORDER[plan];
  const has = (id: string) => secs.includes(id);

  // Group 1
  tasks.push("studentProfile", "competencyScore");

  // Group 2
  tasks.push("academicAnalysis", "activityAnalysis");
  if (has("attendanceAnalysis")) tasks.push("attendanceAnalysis");
  if (has("courseAlignment")) tasks.push("courseAlignment");

  // Group 3
  tasks.push("subjectAnalysis");
  if (has("behaviorAnalysis")) tasks.push("behaviorAnalysis");

  // Group 4
  if (has("weaknessAnalysis")) tasks.push("weaknessAnalysis");
  if (has("topicRecommendation")) tasks.push("topicRecommendation");
  tasks.push("interviewPrep");
  if (has("admissionPrediction")) tasks.push("admissionPrediction");

  // Group 5
  if (has("admissionStrategy") || isGrade1Only) {
    tasks.push(isGrade1Only ? "directionGuide" : "admissionStrategy");
  }
  // storyAnalysis 제외 (피드백 반영: 모든 항목에서 스토리 분석 제외)
  if (has("actionRoadmap")) tasks.push("actionRoadmap");

  // Group 6
  tasks.push("majorExploration");

  // Group 7: 전임 컨설턴트 총평 (모든 분석 결과 종합)
  tasks.push("consultantReview");

  return tasks;
};

// ─── 진행률 계산 ───

export const computeProgress = (
  taskIndex: number,
  totalTasks: number
): number => {
  // 0~98 범위 (100은 완료 시)
  return Math.min(98, Math.round(((taskIndex + 1) / totalTasks) * 98));
};

// ─── 다음 Wave 계산 ───

export const computeNextWave = (state: WaveState): number | null => {
  // wave 0 = preprocess, wave 1 = task[0], wave 2 = task[1], ...
  // currentTaskIndex는 방금 완료한 task의 인덱스
  const nextTaskIndex = state.currentTaskIndex + 1;
  if (nextTaskIndex >= state.totalTasks) return null;
  // 다음 wave = nextTaskIndex + 1 (wave 0이 preprocess이므로 +1)
  return state.lastCompletedWave + 1;
};

// ─── Wave State DB 로드 ───

export const loadWaveState = async (
  supabase: SupabaseClient,
  reportId: string
): Promise<WaveState | null> => {
  const { data, error } = await supabase
    .from("reports")
    .select("ai_wave_state")
    .eq("id", reportId)
    .single();

  if (error || !data?.ai_wave_state) return null;
  return data.ai_wave_state as WaveState;
};

// ─── Wave State DB 저장 ───

export const saveWaveState = async (
  supabase: SupabaseClient,
  reportId: string,
  state: WaveState,
  progress: number,
  currentSection: string
): Promise<void> => {
  // Stale write 방지: DB의 currentTaskIndex가 이미 더 높으면 저장 스킵
  const { data: current } = await supabase
    .from("reports")
    .select("ai_wave_state")
    .eq("id", reportId)
    .single();

  const currentIndex =
    (current?.ai_wave_state as WaveState | null)?.currentTaskIndex ?? -2;
  if (currentIndex >= state.currentTaskIndex) {
    console.log(
      `[report:${reportId}] Stale write 스킵 (DB: ${currentIndex}, 저장 시도: ${state.currentTaskIndex})`
    );
    return;
  }

  const { error } = await supabase
    .from("reports")
    .update({
      ai_wave_state: state as unknown as Record<string, unknown>,
      ai_current_wave: state.lastCompletedWave,
      ai_progress: Math.min(99, progress),
      ai_current_section: currentSection,
    })
    .eq("id", reportId);

  if (error) {
    console.error(`[report:${reportId}] Wave state 저장 실패:`, error.message);
    throw new Error(`Wave state 저장 실패: ${error.message}`);
  }
};

// ─── Run ID 검증 (동시 실행 방지) ───

export const verifyRunId = async (
  supabase: SupabaseClient,
  reportId: string,
  runId: string
): Promise<boolean> => {
  const { data } = await supabase
    .from("reports")
    .select("ai_wave_state")
    .eq("id", reportId)
    .single();

  if (!data?.ai_wave_state) return true;
  const state = data.ai_wave_state as WaveState;
  // 둘 다 runId가 있을 때만 매칭 검증
  if (state.runId && runId && state.runId !== runId) return false;
  return true;
};

// ─── Wave State 정리 (리포트 완성 후) ───

export const clearWaveState = async (
  supabase: SupabaseClient,
  reportId: string
): Promise<void> => {
  await supabase
    .from("reports")
    .update({
      ai_wave_state: null,
      ai_current_wave: null,
    })
    .eq("id", reportId);
};
