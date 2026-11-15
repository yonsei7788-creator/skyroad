/**
 * 단일 학생의 학과 추천 (majorExploration) 결과만 빠르게 검증하는 스크립트.
 * - executePreprocess + phase2Extract + majorExploration 만 실행 (2 LLM 호출).
 * - 전체 17섹션 파이프라인 대신 학과 추천 결과만 확인.
 *
 * 실행: npx tsx scripts/test-major-recommendation.ts <email>
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReportPlan, StudentInfo } from "../libs/report/types.ts";
import { createGeminiClient } from "../libs/report/pipeline/gemini-client.ts";
import {
  executePreprocess,
  executeTask,
} from "../libs/report/pipeline/wave-executor.ts";
import { COMMON_SYSTEM_PROMPT } from "../libs/report/prompts/system.ts";

const GRADE_MAP: Record<string, number> = {
  high1: 1,
  high2: 2,
  high3: 3,
  graduate: 3,
};

const buildStudentInfo = async (
  dbClient: SupabaseClient,
  userId: string,
  recordId: string
): Promise<StudentInfo> => {
  const { data: userProfile } = await dbClient
    .from("profiles")
    .select("name, grade, gender, high_school_type, high_school_region")
    .eq("id", userId)
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
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  const targetUni = targetUnis?.[0];

  const { data: mockExamsCheck } = await dbClient
    .from("record_mock_exams")
    .select("id")
    .eq("record_id", recordId)
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

const main = async () => {
  const [, , email] = process.argv;
  if (!email) {
    console.error(
      "Usage: npx tsx scripts/test-major-recommendation.ts <email>"
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!url || !key || !geminiKey) {
    console.error(
      "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY"
    );
    process.exit(1);
  }

  const dbClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 이메일 → user (페이지네이션으로 전체 검색)
  let user: { id: string; email?: string } | undefined;
  for (let page = 1; page <= 50; page++) {
    const { data: usersResult, error: userErr } =
      await dbClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (userErr) {
      console.error("auth.users 조회 실패:", userErr.message);
      process.exit(1);
    }
    user = usersResult.users.find((u) => u.email === email);
    if (user) break;
    if (usersResult.users.length < 1000) break;
  }
  if (!user) {
    console.error(`이메일 ${email} 유저 없음`);
    process.exit(1);
  }

  // 가장 최근 order + record
  const { data: latestOrder } = await dbClient
    .from("orders")
    .select("id, record_id, plan_id, plans!inner(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latestOrder?.record_id) {
    console.error("주문/레코드 없음");
    process.exit(1);
  }

  const recordId = latestOrder.record_id as string;
  const planName = (latestOrder.plans as unknown as { name: ReportPlan }).name;

  console.log(`\n=== 학생: ${email} ===`);
  console.log(`  user_id: ${user.id}`);
  console.log(`  record_id: ${recordId}`);
  console.log(`  plan: ${planName}\n`);

  const studentInfo = await buildStudentInfo(dbClient, user.id, recordId);
  console.log(`StudentInfo:`, {
    name: studentInfo.name,
    grade: studentInfo.grade,
    targetDepartment: studentInfo.targetDepartment,
    targetUniversities: studentInfo.targetUniversities?.length ?? 0,
  });

  // planned_subjects
  const { data: recordRow } = await dbClient
    .from("records")
    .select("planned_subjects")
    .eq("id", recordId)
    .single();
  const plannedSubjects =
    (recordRow?.planned_subjects as string | null) ?? undefined;

  // Gemini client (캐시 없이 단순 호출)
  const geminiClient = createGeminiClient({
    apiKeys: [geminiKey],
    commonSystemPrompt: COMMON_SYSTEM_PROMPT,
  });

  const fakeReportId = `test-major-${Date.now()}`;

  // 전처리 (skipSave: DB에 쓰지 않음)
  console.log(`\n[1/3] 전처리 실행...`);
  let state = await executePreprocess(
    planName,
    studentInfo,
    fakeReportId,
    dbClient,
    recordId,
    undefined,
    undefined,
    { skipSave: true, plannedSubjects }
  );

  console.log(
    `  전처리 완료: avg=${state.preprocessedData?.overallAverage}, ${state.preprocessedData?.gradingSystem}`
  );

  // phase2Extract: competencyExtraction + academicAnalysis
  console.log(`\n[2/3] phase2Extract 실행 (competencyExtraction)...`);
  state = await executeTask(
    "phase2Extract",
    geminiClient,
    planName,
    studentInfo,
    state,
    fakeReportId,
    dbClient,
    { skipSave: true }
  );

  const compExtr = state.serializedTexts?.compExtrText
    ? JSON.parse(state.serializedTexts.compExtrText)
    : null;

  console.log(`\n=== competencyExtraction 결과 ===`);
  console.log(`  detectedMajorGroup: ${compExtr?.detectedMajorGroup}`);
  console.log(
    `  detectedMajorGroups: ${JSON.stringify(compExtr?.detectedMajorGroups)}`
  );
  console.log(
    `  detectedDepartments: ${JSON.stringify(compExtr?.detectedDepartments)}`
  );
  console.log(`  toolGroupsUsed: ${JSON.stringify(compExtr?.toolGroupsUsed)}`);
  console.log(`  detectedMajorReason: ${compExtr?.detectedMajorReason}`);

  // majorExploration
  console.log(`\n[3/3] majorExploration 실행 (보정 코드 포함)...`);
  state = await executeTask(
    "majorExploration",
    geminiClient,
    planName,
    studentInfo,
    state,
    fakeReportId,
    dbClient,
    { skipSave: true }
  );

  const majorSection = state.completedSections?.find(
    (s) => s.sectionId === "majorExploration"
  ) as Record<string, unknown> | undefined;

  console.log(`\n=== majorExploration 최종 결과 (보정 후) ===`);
  console.log(
    `  currentTargetAssessment: ${majorSection?.currentTargetAssessment}`
  );
  console.log(`  suggestions:`);
  const suggestions = majorSection?.suggestions as
    | { major: string; fitScore: number; rationale?: string }[]
    | undefined;
  if (suggestions) {
    for (const [i, s] of suggestions.entries()) {
      console.log(`    ${i + 1}. ${s.major} (fitScore=${s.fitScore})`);
      console.log(`       └ ${s.rationale?.substring(0, 100) ?? ""}...`);
    }
  }

  console.log(`\n총 추천 수: ${suggestions?.length ?? 0}개`);
};

main().catch((err) => {
  console.error("오류:", err);
  process.exit(1);
});
