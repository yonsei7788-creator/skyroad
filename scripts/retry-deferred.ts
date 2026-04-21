/**
 * Deferred Report Retry Script
 *
 * GitHub Actions cron(매 정시)에서 실행되어, Gemini 과부하로 실패한(deferred)
 * 리포트를 재생성한다.
 *
 * - 기존 wave_state가 있으면 중단 지점부터 재개
 * - 없으면 처음부터 전체 파이프라인 실행
 * - 한 번에 1건씩 처리 (다음 정시에 나머지)
 *
 * 실행: npx tsx scripts/retry-deferred.ts
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ReportPlan,
  ReportSection,
  StudentInfo,
} from "../libs/report/types.ts";
import type { GeminiClient } from "../libs/report/pipeline/gemini-client.ts";
import { createGeminiClient } from "../libs/report/pipeline/gemini-client.ts";
import {
  executePreprocess,
  executeTask,
} from "../libs/report/pipeline/wave-executor.ts";
import { postprocess } from "../libs/report/pipeline/postprocessor.ts";
import type {
  WaveState,
  SerializedTexts,
} from "../libs/report/pipeline/wave-state.ts";
import { saveWaveState } from "../libs/report/pipeline/wave-state.ts";

// ─── 태스크 의존성 그래프 (run-pipeline/route.ts와 동일) ───

const TASK_DEPS: Record<string, string[]> = {
  studentProfile: [],
  competencyScore: [],
  academicAnalysis: [],
  attendanceAnalysis: [],
  activityAnalysis: [],
  courseAlignment: [],
  subjectAnalysis: [],
  behaviorAnalysis: [],
  weaknessAnalysis: [],
  majorExploration: [],
  directionGuide: [],
  topicRecommendation: ["subjectAnalysis"],
  interviewPrep: ["subjectAnalysis"],
  admissionPrediction: [
    "subjectAnalysis",
    "academicAnalysis",
    "attendanceAnalysis",
  ],
  admissionStrategy: [
    "academicAnalysis",
    "majorExploration",
    "admissionPrediction",
  ],
  actionRoadmap: ["weaknessAnalysis", "admissionStrategy", "directionGuide"],
  consultantReview: [
    "competencyScore",
    "academicAnalysis",
    "subjectAnalysis",
    "admissionPrediction",
    "admissionStrategy",
  ],
};

const PARALLEL_CONCURRENCY = 6;
const BATCH_DELAY_MS = 100;

const GRADE_MAP: Record<string, number> = {
  high1: 1,
  high2: 2,
  high3: 3,
  graduate: 3,
};

// ─── 웨이브 빌드 ───

const buildWaves = (taskQueue: string[]): string[][] => {
  const remaining = taskQueue.filter((t) => t !== "phase2");
  const hasPhase2 = taskQueue.includes("phase2");
  const waves: string[][] = hasPhase2 ? [["phase2"]] : [];

  const completed = new Set<string>();

  while (remaining.length > 0) {
    const wave: string[] = [];
    for (const taskId of remaining) {
      const deps = TASK_DEPS[taskId] ?? [];
      const allDepsReady = deps.every(
        (dep) => completed.has(dep) || !remaining.includes(dep)
      );
      if (allDepsReady) {
        wave.push(taskId);
      }
    }
    if (wave.length === 0) break;

    waves.push(wave);
    for (const t of wave) {
      completed.add(t);
      remaining.splice(remaining.indexOf(t), 1);
    }
  }

  return waves;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── 단일 태스크 실행 (안전 래퍼) ───

interface TaskResult {
  taskId: string;
  state: WaveState | null;
  error: Error | null;
}

const runTaskSafe = async (
  taskId: string,
  geminiClient: GeminiClient,
  plan: ReportPlan,
  studentInfo: StudentInfo,
  state: WaveState,
  reportId: string,
  dbClient: SupabaseClient
): Promise<TaskResult> => {
  try {
    const result = await executeTask(
      taskId,
      geminiClient,
      plan,
      studentInfo,
      state,
      reportId,
      dbClient,
      { skipSave: true }
    );
    return { taskId, state: result, error: null };
  } catch (err) {
    return {
      taskId,
      state: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
};

// ─── 웨이브 병렬 실행 ───

const executeWaveParallel = async (
  wave: string[],
  geminiClient: GeminiClient,
  plan: ReportPlan,
  studentInfo: StudentInfo,
  state: WaveState,
  reportId: string,
  dbClient: SupabaseClient
): Promise<WaveState> => {
  if (wave.length === 1) {
    return await executeTask(
      wave[0],
      geminiClient,
      plan,
      studentInfo,
      state,
      reportId,
      dbClient,
      { skipSave: true }
    );
  }

  const newSections: ReportSection[] = [];
  let mergedSer: SerializedTexts = { ...state.serializedTexts! };

  for (let i = 0; i < wave.length; i += PARALLEL_CONCURRENCY) {
    if (i > 0) await sleep(BATCH_DELAY_MS);

    const batch = wave.slice(i, i + PARALLEL_CONCURRENCY);
    const results = await Promise.all(
      batch.map((taskId) =>
        runTaskSafe(
          taskId,
          geminiClient,
          plan,
          studentInfo,
          state,
          reportId,
          dbClient
        )
      )
    );

    const failed = results.find((r) => r.error);
    if (failed) {
      throw failed.error!;
    }

    for (const result of results) {
      const addedSections = (result.state!.completedSections ?? []).filter(
        (s) =>
          !state.completedSections?.some(
            (existing) => existing.sectionId === s.sectionId
          ) &&
          !newSections.some((existing) => existing.sectionId === s.sectionId)
      );
      newSections.push(...addedSections);
      mergedSer = { ...mergedSer, ...result.state!.serializedTexts };
    }
  }

  return {
    ...state,
    completedSections: [...(state.completedSections ?? []), ...newSections],
    serializedTexts: mergedSer,
    currentTaskIndex: state.currentTaskIndex + wave.length,
    lastCompletedWave: state.lastCompletedWave + wave.length,
  };
};

// ─── studentInfo 조립 ───

const buildStudentInfo = async (
  dbClient: SupabaseClient,
  order: { user_id: string; record_id: string }
): Promise<StudentInfo> => {
  const { data: userProfile } = await dbClient
    .from("profiles")
    .select("name, grade, gender, high_school_type, high_school_region")
    .eq("id", order.user_id)
    .single();

  const profiles = userProfile ?? {
    name: "학생",
    grade: "high2",
    high_school_type: "일반고",
    gender: null,
    high_school_region: null,
  };

  const { data: targetUnis } = await dbClient
    .from("target_universities")
    .select("university_name, admission_type, department, sub_field, priority")
    .eq("user_id", order.user_id)
    .order("priority", { ascending: true });

  const targetUni = targetUnis?.[0];

  const { data: mockExamsCheck } = await dbClient
    .from("record_mock_exams")
    .select("id")
    .eq("record_id", order.record_id)
    .limit(1);

  return {
    name: profiles.name ?? "학생",
    grade: GRADE_MAP[profiles.grade] ?? 2,
    isGraduate: profiles.grade === "graduate",
    track: "통합",
    schoolType:
      (profiles.high_school_type as StudentInfo["schoolType"]) ?? "일반고",
    targetUniversity: targetUni?.university_name,
    targetDepartment: targetUni?.department,
    gender: (profiles.gender as "male" | "female" | null) ?? null,
    highSchoolRegion: profiles.high_school_region ?? undefined,
    targetUniversities:
      targetUnis && targetUnis.length > 0
        ? targetUnis.map((u) => ({
            priority: u.priority,
            universityName: u.university_name,
            admissionType: u.admission_type ?? "학종",
            department: u.department,
          }))
        : undefined,
    hasMockExamData: (mockExamsCheck?.length ?? 0) > 0,
  };
};

// ─── 완료된 태스크 ID 추출 ───

const getCompletedTaskIds = (state: WaveState): Set<string> => {
  const ids = new Set<string>();
  if (state.phase2Results) ids.add("phase2");
  for (const section of state.completedSections ?? []) {
    ids.add(section.sectionId);
  }
  return ids;
};

// ─── 단일 리포트 재시도 ───

interface DeferredReport {
  id: string;
  order_id: string;
  ai_wave_state: unknown;
  ai_retry_count: number | null;
  orders: {
    id: string;
    user_id: string;
    record_id: string;
    plans: { name: string };
  };
}

const retryOneReport = async (
  report: DeferredReport,
  dbClient: ReturnType<typeof createClient>,
  geminiClient: GeminiClient
): Promise<boolean> => {
  const reportId = report.id;
  const order = report.orders;
  const orderId = order.id;
  const plan = order.plans.name as ReportPlan;
  const recordId = order.record_id;

  console.log(
    `[retry:${reportId}] 재시도 시작 (retry_count: ${report.ai_retry_count ?? 0})`
  );

  // processing으로 변경 (동시 실행 방지)
  await dbClient
    .from("reports")
    .update({
      ai_status: "processing",
      ai_progress: 0,
      ai_error: null,
      ai_retry_count: (report.ai_retry_count ?? 0) + 1,
    })
    .eq("id", reportId);

  try {
    const studentInfo = await buildStudentInfo(dbClient, {
      user_id: order.user_id,
      record_id: recordId,
    });

    // 수강 예정 과목
    const { data: recordRow } = await dbClient
      .from("records")
      .select("planned_subjects")
      .eq("id", recordId)
      .single();
    const plannedSubjects =
      (recordRow?.planned_subjects as string | null) ?? undefined;

    // wave_state 존재 여부로 재개/처음부터 결정
    const savedState = report.ai_wave_state as WaveState | null;

    let state: WaveState;

    if (savedState && savedState.preprocessedData) {
      state = savedState;
      console.log(
        `[retry:${reportId}] 중단 지점에서 재개 (completedSections: ${state.completedSections?.length ?? 0}/${state.totalTasks})`
      );
    } else {
      console.log(`[retry:${reportId}] 처음부터 시작 (전처리)`);
      state = await executePreprocess(
        plan,
        studentInfo,
        reportId,
        dbClient,
        recordId,
        undefined,
        undefined,
        { skipSave: true, plannedSubjects }
      );
    }

    // 완료된 태스크 제외하고 남은 태스크로 웨이브 재구성
    const completedIds = getCompletedTaskIds(state);
    const remainingQueue = state.taskQueue.filter((t) => !completedIds.has(t));

    if (remainingQueue.length === 0) {
      console.log(`[retry:${reportId}] 모든 태스크 완료, 후처리 실행`);
    } else {
      const waves = buildWaves(remainingQueue);
      console.log(
        `[retry:${reportId}] 남은 웨이브: ${waves.length}개, 태스크: ${remainingQueue.length}개`
      );

      for (let wi = 0; wi < waves.length; wi++) {
        const wave = waves[wi];

        console.log(
          `[retry:${reportId}] 웨이브 ${wi + 1}/${waves.length}: [${wave.join(", ")}]`
        );

        state = await executeWaveParallel(
          wave,
          geminiClient,
          plan,
          studentInfo,
          state,
          reportId,
          dbClient
        );

        // 웨이브 완료 후 상태 저장 (실패 시 다음 재시도를 위해)
        const progress = Math.min(
          98,
          Math.round(
            ((state.completedSections?.length ?? 0) / state.totalTasks) * 98
          )
        );
        await saveWaveState(
          dbClient,
          reportId,
          state,
          progress,
          wave[wave.length - 1]
        );

        console.log(
          `[retry:${reportId}] 웨이브 ${wi + 1} 완료 (sections: ${state.completedSections?.length ?? 0})`
        );
      }
    }

    // 후처리
    const sections = state.completedSections ?? [];
    console.log(`[retry:${reportId}] 후처리 시작: ${sections.length}개 섹션`);

    const detectedMajor =
      state.phase2Results?.competencyExtraction?.detectedMajorGroup;

    const result = postprocess(
      sections,
      state.preprocessedData!,
      studentInfo,
      plan,
      reportId,
      state.preprocessedTexts?.universityCandidatesText,
      detectedMajor,
      state.preprocessedTexts?.strategyUniversityCandidatesText
    );

    // DB 저장 — completed
    await dbClient
      .from("reports")
      .update({
        content: result.content as unknown as Record<string, unknown>,
        ai_status: "completed",
        ai_progress: 100,
        ai_current_section: null,
        ai_wave_state: null,
        ai_current_wave: null,
        ai_generated_at: new Date().toISOString(),
        ai_model_version: "gemini-2.5-flash",
      })
      .eq("id", reportId);

    await dbClient
      .from("orders")
      .update({ status: "under_review" })
      .eq("id", orderId);

    console.log(`[retry:${reportId}] 재생성 완료!`);
    return true;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "재시도 파이프라인 오류";
    console.error(`[retry:${reportId}] 재시도 실패:`, message);

    // 다시 deferred로 복귀 (다음 cron에서 재시도)
    await dbClient
      .from("reports")
      .update({
        ai_status: "deferred",
        ai_error: message,
      })
      .eq("id", reportId);

    return false;
  }
};

// ─── 메인 ───

const main = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
    console.error(
      "필수 환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY"
    );
    process.exit(1);
  }

  const dbClient = createClient(supabaseUrl, supabaseKey);
  const geminiClient = createGeminiClient(geminiApiKey);

  // 전체 deferred 리포트 조회 (오래된 순)
  const { data: reports, error: fetchError } = await dbClient
    .from("reports")
    .select(
      `
      id,
      order_id,
      ai_wave_state,
      ai_retry_count,
      orders!inner (
        id,
        user_id,
        record_id,
        plans!inner ( name )
      )
    `
    )
    .eq("ai_status", "deferred")
    .order("ai_deferred_at", { ascending: true });

  if (fetchError || !reports || reports.length === 0) {
    console.log("deferred 리포트 없음. 종료.");
    return;
  }

  console.log(`deferred 리포트 ${reports.length}건 발견. 순차 처리 시작.`);

  let success = 0;
  let failed = 0;

  for (const report of reports) {
    const ok = await retryOneReport(
      report as unknown as DeferredReport,
      dbClient,
      geminiClient
    );
    if (ok) success++;
    else failed++;
  }

  console.log(
    `처리 완료: 성공 ${success}건, 실패 ${failed}건 (총 ${reports.length}건)`
  );

  if (failed > 0) {
    process.exit(1);
  }
};

main();
