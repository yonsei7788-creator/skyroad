/**
 * Gemini 503 부하 진단 스크립트
 *
 * 실제 파이프라인의 Wave 2 burst 패턴을 재현:
 *   - 10개 동시 호출
 *   - 각 호출: 큰 system instruction (~12k tokens) + 큰 user prompt + maxOutputTokens=65536
 *
 * 목적: 우리 파이프라인이 Gemini 측 503을 유발하는 burst pattern인지 판별.
 *
 * 실행:
 *   GEMINI_API_KEY=... npx tsx scripts/load-test-gemini.ts
 *   GEMINI_API_KEY=... npx tsx scripts/load-test-gemini.ts --keys 3   (키 3개 로테이션)
 */

import { COMMON_SYSTEM_PROMPT } from "../libs/report/prompts/system.ts";

interface TestCall {
  id: number;
  model: string;
  keyIndex: number;
}

interface TestResult {
  id: number;
  model: string;
  keyIndex: number;
  status: number;
  elapsedMs: number;
  error?: string;
}

const LONG_USER_PROMPT = `
다음은 가상의 학생 생기부 분석 프롬프트입니다. 실제 파이프라인과 유사한 크기의 입력을 시뮬레이션합니다.

## 학생 정보
이름: 테스트학생, 학년: 2, 학교: 일반고

## 과목별 세특 요약
국어: 문학 작품에 대한 비판적 해석과 토론 활동에서 적극적으로 참여함. 특히 현대문학에서 작가의 의도 분석이 돋보임.
수학: 미적분학 심화 탐구에서 실생활 문제 해결 능력을 보여줌. 함수의 그래프 변환과 관련된 프로젝트 수행.
영어: 독해력과 어휘력이 우수하며, 영어 에세이 작성에서 논리적 구성이 뛰어남.
물리학1: 역학 단원에서 실험 설계 능력과 결과 분석 능력을 보여줌. 특히 운동량 보존 법칙 탐구가 인상적.
화학1: 산화-환원 반응을 주제로 한 프로젝트에서 창의적 접근을 보여줌. 실험 데이터 해석 능력 우수.

## 작업
위 학생의 세특을 분석하여 다음 JSON 형식으로 결과를 출력하세요:
{
  "studentProfile": {
    "name": "string",
    "grade": number,
    "strengths": ["string"],
    "weaknesses": ["string"]
  },
  "academicAnalysis": {
    "overallComment": "string (200자)",
    "subjectHighlights": ["string"]
  },
  "interpretation": "string (최소 500자, 입학사정관 관점에서 상세 분석)"
}

## 출력 규칙
- 반드시 JSON만 출력
- 한국어로 작성
- 입학사정관 관점의 평가어 사용 ("~로 볼 겁니다", "~가능성이 높습니다")
`.trim();

const callGemini = async (
  apiKey: string,
  model: string,
  id: number,
  keyIndex: number
): Promise<TestResult> => {
  const startMs = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COMMON_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: LONG_USER_PROMPT }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: parseInt(process.env.LT_MAX_OUTPUT ?? "16384"),
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    const elapsedMs = Date.now() - startMs;
    const { status } = response;

    if (!response.ok) {
      const body = await response.text();
      return {
        id,
        model,
        keyIndex,
        status,
        elapsedMs,
        error: body.slice(0, 200),
      };
    }

    return { id, model, keyIndex, status, elapsedMs };
  } catch (err) {
    return {
      id,
      model,
      keyIndex,
      status: 0,
      elapsedMs: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const keyCountArg = args.find((a) => a.startsWith("--keys"));
  const keyCount = keyCountArg ? parseInt(keyCountArg.split("=")[1] ?? "1") : 1;
  const modelArg = args.find((a) => a.startsWith("--model"));
  const model = modelArg
    ? (modelArg.split("=")[1] ?? "gemini-2.5-flash")
    : "gemini-2.5-flash";
  const parallelArg = args.find((a) => a.startsWith("--parallel"));
  const parallelCount = parallelArg
    ? parseInt(parallelArg.split("=")[1] ?? "10")
    : 10;

  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY3,
  ]
    .filter((k): k is string => !!k)
    .slice(0, keyCount);

  if (keys.length === 0) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }

  console.log(
    `\n🧪 Gemini 부하 테스트 — model=${model}, keys=${keys.length}, parallel=${parallelCount}\n`
  );
  console.log(`system prompt: ${COMMON_SYSTEM_PROMPT.length} chars`);
  console.log(`user prompt: ${LONG_USER_PROMPT.length} chars\n`);

  // Burst 패턴: 10개 동시 발사
  const calls: TestCall[] = Array.from({ length: parallelCount }, (_, i) => ({
    id: i,
    model,
    keyIndex: i % keys.length,
  }));

  const startMs = Date.now();
  const results = await Promise.all(
    calls.map((c) => callGemini(keys[c.keyIndex], c.model, c.id, c.keyIndex))
  );
  const totalElapsed = Date.now() - startMs;

  console.log("═══ 결과 ═══");
  for (const r of results) {
    const mark = r.status === 200 ? "✅" : r.status === 503 ? "🔥" : "❌";
    console.log(
      `${mark} [#${r.id.toString().padStart(2, "0")}] k${r.keyIndex} status=${r.status} elapsed=${r.elapsedMs}ms${r.error ? ` err=${r.error.slice(0, 80)}` : ""}`
    );
  }

  const ok = results.filter((r) => r.status === 200).length;
  const e503 = results.filter((r) => r.status === 503).length;
  const other = results.length - ok - e503;
  const avgMs = Math.round(
    results.reduce((s, r) => s + r.elapsedMs, 0) / results.length
  );

  console.log(`\n═══ 요약 ═══`);
  console.log(`전체: ${results.length}개, 총 소요: ${totalElapsed}ms`);
  console.log(
    `✅ 200 OK: ${ok}개 (${((ok / results.length) * 100).toFixed(0)}%)`
  );
  console.log(
    `🔥 503:    ${e503}개 (${((e503 / results.length) * 100).toFixed(0)}%)`
  );
  console.log(`❌ 기타:   ${other}개`);
  console.log(`평균 응답: ${avgMs}ms`);
};

main();
