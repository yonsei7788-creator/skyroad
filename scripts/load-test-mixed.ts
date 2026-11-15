/**
 * Wave 2 혼합 부하 시뮬레이션:
 *   - 7개 flash-lite (default 섹션들)
 *   - 3개 flash (품질 민감 섹션들)
 *   모두 동시 발사. 실제 파이프라인에 가장 근접.
 */
import { COMMON_SYSTEM_PROMPT } from "../libs/report/prompts/system.ts";

const KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter((k): k is string => !!k);

const USER_PROMPT = `학생의 세특을 분석해 JSON으로 간단히 요약하세요.
{"summary":"string(100자)","rating":"good|average|weak"}`;

const call = async (
  model: string,
  keyIdx: number,
  id: string,
  maxOut: number
) => {
  const start = Date.now();
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEYS[keyIdx]}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COMMON_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: USER_PROMPT }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: maxOut,
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );
  return {
    id,
    model,
    keyIdx,
    status: r.status,
    ms: Date.now() - start,
  };
};

const main = async () => {
  // Wave 2 혼합: 7 lite + 3 flash. 10 동시 발사.
  const plan = [
    { id: "acadAnalysis", model: "gemini-2.5-flash-lite", max: 16384 },
    { id: "activityAnalysis", model: "gemini-2.5-flash-lite", max: 16384 },
    { id: "attendanceAnalysis", model: "gemini-2.5-flash-lite", max: 16384 },
    { id: "courseAlignment", model: "gemini-2.5-flash-lite", max: 16384 },
    { id: "behaviorAnalysis", model: "gemini-2.5-flash-lite", max: 16384 },
    { id: "weaknessAnalysis", model: "gemini-2.5-flash-lite", max: 16384 },
    { id: "majorExploration", model: "gemini-2.5-flash-lite", max: 16384 },
    { id: "subjectAnalysis", model: "gemini-2.5-flash", max: 20480 },
    { id: "consultantReview", model: "gemini-2.5-flash", max: 16384 },
    { id: "admissionStrategy", model: "gemini-2.5-flash", max: 16384 },
  ];

  console.log(
    `\n🧪 Wave 2 혼합 부하 — 10개 동시, 키 ${KEYS.length}개 로테이션\n`
  );
  const start = Date.now();
  const results = await Promise.all(
    plan.map((p, i) => call(p.model, i % KEYS.length, p.id, p.max))
  );
  const total = Date.now() - start;

  for (const r of results) {
    const mark = r.status === 200 ? "✅" : "🔥";
    console.log(
      `${mark} ${r.id.padEnd(18)} ${r.model.padEnd(24)} k${r.keyIdx} status=${r.status} ${r.ms}ms`
    );
  }

  const ok = results.filter((r) => r.status === 200).length;
  const fail = results.length - ok;
  console.log(`\n총 소요: ${total}ms`);
  console.log(
    `성공: ${ok}/${results.length} (${((ok / results.length) * 100).toFixed(0)}%)`
  );
  console.log(`실패: ${fail}`);

  // flash / flash-lite 분리 집계
  const flashOk = results.filter(
    (r) => r.model === "gemini-2.5-flash" && r.status === 200
  ).length;
  const flashTotal = results.filter(
    (r) => r.model === "gemini-2.5-flash"
  ).length;
  const liteOk = results.filter(
    (r) => r.model === "gemini-2.5-flash-lite" && r.status === 200
  ).length;
  const liteTotal = results.filter(
    (r) => r.model === "gemini-2.5-flash-lite"
  ).length;
  console.log(`  flash:      ${flashOk}/${flashTotal}`);
  console.log(`  flash-lite: ${liteOk}/${liteTotal}`);
};

main();
