import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { env } from "@/env";
import type {
  ReportPlan,
  ReportSection,
  StudentInfo,
} from "@/libs/report/types";
import type { GeminiClient } from "@/libs/report/pipeline/gemini-client";
import { createGeminiClient } from "@/libs/report/pipeline/gemini-client";
import {
  executePreprocess,
  executeTask,
} from "@/libs/report/pipeline/wave-executor";
import { postprocess } from "@/libs/report/pipeline/postprocessor";
import {
  createPipelineCache,
  deletePipelineCache,
} from "@/libs/report/pipeline/cache-manager";
import { COMMON_SYSTEM_PROMPT } from "@/libs/report/prompts/system";
import type {
  WaveState,
  SerializedTexts,
} from "@/libs/report/pipeline/wave-state";
import { saveWaveState } from "@/libs/report/pipeline/wave-state";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RunPipelineBody {
  orderId: string;
  force?: boolean;
}

const GRADE_MAP: Record<string, number> = {
  high1: 1,
  high2: 2,
  high3: 3,
  graduate: 3,
};

const sendEvent = (
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: Record<string, unknown>
) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
};

// ─── 태스크 의존성 그래프 ───
// phase2Extract는 항상 첫 번째 웨이브 (모든 태스크가 암묵적으로 의존)
// phase2Classify는 섹션 웨이브와 병렬 실행 (studentProfile/competencyScore만 명시적 의존)
const TASK_DEPS: Record<string, string[]> = {
  phase2Classify: [],
  // studentProfile은 추천 전형(recommendedAdmissionType)을 admissionPrediction에서 주입받고,
  // Premium은 strategy bullet을 admissionStrategy 결과 기반으로 생성하므로 둘 다 의존.
  // Lite/Standard 큐에는 admissionStrategy가 없고 Lite 큐에는 admissionPrediction도 없어 buildWaves에서 자동 무시됨.
  studentProfile: [
    "phase2Classify",
    "admissionPrediction",
    "admissionStrategy",
  ],
  competencyScore: ["phase2Classify"],
  academicAnalysis: [],
  attendanceAnalysis: [],
  activityAnalysis: [],
  courseAlignment: [],
  subjectAnalysis: [],
  behaviorAnalysis: [],
  weaknessAnalysis: [],
  majorExploration: [],
  directionGuide: [],
  // topicRecommendation/interviewPrep은 subjectAnalysis 의존을 제거하여 Wave 2로 이동.
  // topicRecommendation은 majorExploration 결과를 aiRecommendedMajors로 참조하므로 의존 유지.
  topicRecommendation: ["majorExploration"],
  interviewPrep: [],
  admissionPrediction: [
    "subjectAnalysis",
    "academicAnalysis",
    "attendanceAnalysis",
    "phase2Classify",
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

// 태스크 큐를 의존성 기반 병렬 웨이브로 분할
// phase2Extract는 항상 Wave 0으로 고정 (모든 태스크가 암묵적으로 의존)
const buildWaves = (taskQueue: string[]): string[][] => {
  const remaining = taskQueue.filter((t) => t !== "phase2Extract");
  const hasPhase2Extract = taskQueue.includes("phase2Extract");
  const waves: string[][] = hasPhase2Extract ? [["phase2Extract"]] : [];

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

// 단일 태스크 실행 (실패 시 에러 반환)
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

// 하나의 웨이브 내 태스크들을 병렬 실행 (동시성 제한 + 실패 재시도)
const executeWaveParallel = async (
  wave: string[],
  geminiClient: GeminiClient,
  plan: ReportPlan,
  studentInfo: StudentInfo,
  state: WaveState,
  reportId: string,
  dbClient: SupabaseClient
): Promise<WaveState> => {
  // 재시도는 Gemini 클라이언트의 withRetry(3회)만 사용한다.
  // 이전 구현은 wave-executor 레벨에서 한 번 더 재시도를 붙여(단일 3→6, 다중 3→6)
  // withRetry가 이미 실패한 뒤에도 파이프라인이 계속 진행되는 느낌을 줬음.
  // → withRetry가 소진되면 즉시 파이프라인 실패.

  // 단일 태스크 웨이브
  if (wave.length === 1) {
    try {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[report:${reportId}] 단일 태스크 ${wave[0]} 실패 (withRetry 소진): ${msg}`
      );
      throw new Error(
        `AI 서버가 일시적으로 불안정하여 리포트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요. (${wave[0]} 섹션 생성 실패)`
      );
    }
  }

  // 다중 태스크 웨이브 — 병렬 실행, 하나라도 실패하면 즉시 throw
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

    // 배치에 하나라도 실패가 있으면 즉시 중단
    const failed = results.find((r) => r.error);
    if (failed) {
      console.error(
        `[report:${reportId}] 태스크 ${failed.taskId} 실패 (withRetry 소진): ${failed.error?.message}`
      );
      throw new Error(
        `AI 서버가 일시적으로 불안정하여 리포트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요. (${failed.taskId} 섹션 생성 실패)`
      );
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

export const POST = async (request: NextRequest) => {
  const supabase = await createClient();

  // 1. 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  // 2. 요청 바디
  let body: RunPipelineBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { orderId, force } = body;
  if (!orderId) {
    return NextResponse.json(
      { error: "orderId가 필요합니다." },
      { status: 400 }
    );
  }

  // 3. 주문 정보 조회
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      user_id,
      record_id,
      status,
      plans!inner (
        name
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  let isAdmin = false;
  if (order.user_id !== user.id || force) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";

    if (order.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  }

  // force 옵션은 관리자만 사용 가능
  const forceRegenerate = Boolean(force) && isAdmin;

  if (order.status === "pending_payment") {
    return NextResponse.json(
      { error: "결제가 완료되지 않았습니다." },
      { status: 400 }
    );
  }

  // 4. 리포트 조회 또는 생성
  const { data: existingReport } = await supabase
    .from("reports")
    .select("id, ai_status, content")
    .eq("order_id", orderId)
    .single();

  if (existingReport?.ai_status === "processing" && !forceRegenerate) {
    return NextResponse.json({ error: "이미 생성 중입니다." }, { status: 409 });
  }

  const isRetry =
    existingReport?.ai_status === "failed" ||
    existingReport?.ai_status === "deferred" ||
    forceRegenerate;

  if (
    !isRetry &&
    existingReport?.content !== null &&
    existingReport?.content !== undefined
  ) {
    return NextResponse.json(
      { error: "이미 생성 완료된 리포트입니다." },
      { status: 409 }
    );
  }

  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  let reportId: string;
  if (existingReport) {
    reportId = existingReport.id;
  } else {
    const { data: targetUni } = await dbClient
      .from("target_universities")
      .select("id")
      .eq("user_id", order.user_id)
      .order("priority", { ascending: true })
      .limit(1)
      .single();

    const { data: newReport, error: insertError } = await dbClient
      .from("reports")
      .insert({
        order_id: orderId,
        target_university_id: targetUni?.id ?? null,
        ai_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !newReport) {
      return NextResponse.json(
        { error: "리포트 레코드 생성에 실패했습니다." },
        { status: 500 }
      );
    }
    reportId = newReport.id;
  }

  // 5. 상태를 processing으로
  await dbClient
    .from("reports")
    .update({
      ai_status: "processing",
      ai_progress: 0,
      ai_current_section: null,
      ai_error: null,
    })
    .eq("id", reportId);

  await dbClient
    .from("orders")
    .update({ status: "analyzing" })
    .eq("id", orderId);

  // 6. 파이프라인 데이터 준비
  const plans = order.plans as unknown as { name: string };
  const plan = plans.name as ReportPlan;
  const recordId = order.record_id as string;

  // 수강 예정 과목 (학생 직접 입력)
  const { data: recordRow } = await dbClient
    .from("records")
    .select("planned_subjects")
    .eq("id", recordId)
    .single();
  const plannedSubjects =
    (recordRow?.planned_subjects as string | null) ?? undefined;

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

  const { data: mockExamsPipeline } = await dbClient
    .from("record_mock_exams")
    .select("id")
    .eq("record_id", recordId)
    .limit(1);

  const studentInfo: StudentInfo = {
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
    hasMockExamData: (mockExamsPipeline?.length ?? 0) > 0,
  };

  const geminiApiKey = env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    await markFailed(dbClient, reportId, orderId, "GEMINI_API_KEY 미설정");
    return NextResponse.json(
      { error: "AI 서비스 설정이 올바르지 않습니다." },
      { status: 500 }
    );
  }

  // 컨텍스트 캐시 생성 (실패 시 캐시 없이 진행)
  const primaryCacheHandle = await createPipelineCache(
    geminiApiKey,
    COMMON_SYSTEM_PROMPT,
    reportId
  );

  const geminiClient = createGeminiClient({
    apiKeys: [geminiApiKey],
    cacheHandles: [primaryCacheHandle],
    commonSystemPrompt: COMMON_SYSTEM_PROMPT,
  });

  // 7. SSE 스트리밍 — 전체 파이프라인을 하나의 스트림에서 실행
  const encoder = new TextEncoder();

  // Vercel maxDuration=300s. 250s를 상한으로 두고 웨이브 진입 전 초과 시 실패 처리.
  // (Vercel이 함수를 강제 종료하기 전에 DB를 failed로 업데이트할 시간 확보)
  const PIPELINE_TIME_BUDGET_MS = 280_000;
  const pipelineStartMs = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let state: WaveState | null = null;
      let completedCount = 0;

      try {
        // 클라이언트가 reportId를 알도록 init 이벤트 전송
        // (스트림 비정상 종료 시 DB 상태 확인용)
        sendEvent(controller, encoder, {
          type: "init",
          reportId,
        });

        // 전처리
        sendEvent(controller, encoder, {
          type: "progress",
          section: "preprocess",
          progress: 2,
        });

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

        const { taskQueue } = state;
        const waves = buildWaves(taskQueue);

        console.log(
          `[report:${reportId}] 병렬 웨이브 구성: ${waves.length}개 웨이브, 총 ${taskQueue.length}개 태스크`
        );
        for (let wi = 0; wi < waves.length; wi++) {
          console.log(
            `[report:${reportId}] 웨이브 ${wi}: [${waves[wi].join(", ")}]`
          );
        }

        for (let wi = 0; wi < waves.length; wi++) {
          const wave = waves[wi];

          // 시간 예산 확인 — Vercel 타임아웃 전에 명시적으로 실패 처리
          const elapsedMs = Date.now() - pipelineStartMs;
          if (elapsedMs > PIPELINE_TIME_BUDGET_MS) {
            throw new Error(
              `리포트 생성 시간 초과 (${Math.round(elapsedMs / 1000)}s). AI 응답 지연으로 중단되었습니다. 잠시 후 다시 시도해 주세요.`
            );
          }

          // 웨이브 시작 시 첫 번째 태스크 이름으로 진행률 보고
          const progress = Math.min(
            98,
            Math.round(((completedCount + 1) / taskQueue.length) * 98)
          );
          sendEvent(controller, encoder, {
            type: "progress",
            section: wave[0],
            progress,
          });

          console.log(
            `[report:${reportId}] 웨이브 ${wi + 1}/${waves.length}: [${wave.join(", ")}] (sections: ${state.completedSections?.length ?? 0})`
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

          completedCount += wave.length;

          // 웨이브 완료 후 상태 저장 (Vercel 강제 종료 시에도 진행분 보존)
          const waveEndProgress = Math.min(
            98,
            Math.round((completedCount / taskQueue.length) * 98)
          );
          await saveWaveState(
            dbClient,
            reportId,
            state,
            waveEndProgress,
            wave[wave.length - 1]
          );

          sendEvent(controller, encoder, {
            type: "progress",
            section: wave[wave.length - 1],
            progress: waveEndProgress,
          });

          console.log(
            `[report:${reportId}] 웨이브 ${wi + 1} 완료 (sections: ${state.completedSections?.length ?? 0})`
          );
        }

        // 후처리
        const sections = state.completedSections ?? [];
        console.log(
          `[report:${reportId}] 후처리 시작: ${sections.length}개 섹션`
        );

        // Phase 2에서 감지된 강점 계열을 postprocessor에 전달
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

        console.log(
          `[report:${reportId}] 후처리 완료: content sections=${result.content.sections.length}`
        );

        // DB 저장
        const { error: saveError } = await dbClient
          .from("reports")
          .update({
            content: result.content as unknown as Record<string, unknown>,
            ai_status: "completed",
            ai_progress: 100,
            ai_current_section: null,
            ai_wave_state: null,
            ai_current_wave: null,
            ai_generated_at: new Date().toISOString(),
            ai_model_version: "gemini-2.5-flash-lite",
          })
          .eq("id", reportId);

        if (saveError) {
          throw new Error(`리포트 저장 실패: ${saveError.message}`);
        }

        await dbClient
          .from("orders")
          .update({ status: "under_review" })
          .eq("id", orderId);

        sendEvent(controller, encoder, {
          type: "completed",
          progress: 100,
          sectionCount: result.content.sections.length,
        });

        console.log(`[report:${reportId}] 생성 완료!`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "파이프라인 오류";
        console.error(`[report:${reportId}] 파이프라인 오류:`, message);

        // 모든 실패 → deferred (자동 재시도 대상)
        try {
          // 중단 지점의 wave state 저장 (재개용)
          if (state) {
            const progress = Math.min(
              98,
              Math.round(((completedCount + 1) / (state.totalTasks || 1)) * 98)
            );
            await saveWaveState(
              dbClient,
              reportId,
              state,
              progress,
              "deferred"
            );
          }

          await dbClient
            .from("reports")
            .update({
              ai_status: "deferred",
              ai_deferred_at: new Date().toISOString(),
              ai_error: message,
            })
            .eq("id", reportId);
          // order는 analyzing 유지 — 사용자에게 "전문가 검토중"으로 보임
        } catch (dbErr) {
          console.error(
            `[report:${reportId}] deferred 상태 DB 업데이트 실패:`,
            dbErr
          );
        }

        try {
          sendEvent(controller, encoder, {
            type: "deferred",
          });
        } catch {
          // 스트림이 이미 닫혔을 수 있음
        }
      } finally {
        // 컨텍스트 캐시 정리 (실패해도 TTL로 자동 만료됨)
        await deletePipelineCache(primaryCacheHandle, reportId);
        try {
          controller.close();
        } catch {
          // 이미 닫힘
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

// ─── 유틸 ───

const markFailed = async (
  supabase: SupabaseClient,
  reportId: string,
  orderId: string,
  errorMessage: string
): Promise<void> => {
  await supabase
    .from("reports")
    .update({ ai_status: "failed", ai_error: errorMessage })
    .eq("id", reportId);

  await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
};
