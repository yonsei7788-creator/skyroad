import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import crypto from "crypto";

import { createClient } from "@/libs/supabase/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const PARSE_PROMPT = `당신은 한국 고등학교 생활기록부(학생부) 전문 파서입니다.
첨부된 파일은 생활기록부입니다. 이 문서를 분석하여 아래 JSON 스키마에 맞게 구조화해주세요.

## JSON 스키마

{
  "attendance": [
    { "year": number, "totalDays": number|null, "absenceIllness": number|null, "absenceUnauthorized": number|null, "absenceOther": number|null, "latenessIllness": number|null, "latenessUnauthorized": number|null, "latenessOther": number|null, "earlyLeaveIllness": number|null, "earlyLeaveUnauthorized": number|null, "earlyLeaveOther": number|null, "classMissedIllness": number|null, "classMissedUnauthorized": number|null, "classMissedOther": number|null, "note": string }
  ],
  "awards": [
    { "year": number, "name": string, "rank": string, "date": string, "organization": string, "participants": string }
  ],
  "certifications": [
    { "category": string, "name": string, "details": string, "date": string, "issuer": string }
  ],
  "creativeActivities": [
    { "year": number, "area": "자율활동"|"동아리활동"|"진로활동", "hours": number|null, "note": string }
  ],
  "volunteerActivities": [
    { "year": number, "dateRange": string, "place": string, "content": string, "hours": number|null }
  ],
  "generalSubjects": [
    { "year": number, "semester": number, "category": string, "subject": string, "credits": number|null, "rawScore": number|null, "average": number|null, "standardDeviation": number|null, "achievement": string, "studentCount": number|null, "gradeRank": number|null }
  ],
  "careerSubjects": [
    { "year": number, "semester": number, "category": string, "subject": string, "credits": number|null, "rawScore": number|null, "average": number|null, "achievement": string, "studentCount": number|null, "achievementDistribution": string }
  ],
  "artsPhysicalSubjects": [
    { "year": number, "semester": number, "category": string, "subject": string, "credits": number|null, "achievement": string }
  ],
  "subjectEvaluations": [
    { "year": number, "subject": string, "evaluation": string }
  ],
  "readingActivities": [
    { "year": number, "subjectOrArea": string, "content": string }
  ],
  "behavioralAssessments": [
    { "year": number, "assessment": string }
  ]
}

## 분류 규칙

1. **교과 구분**:
   - 석차등급(gradeRank)이 있는 과목 → generalSubjects
   - 성취도별 분포비율(achievementDistribution)이 있는 과목 → careerSubjects
   - 체육·음악·미술 교과 → artsPhysicalSubjects

2. **창의적 체험활동**:
   - area는 반드시 "자율활동", "동아리활동", "진로활동" 중 하나

3. **학년(year)**:
   - 1학년=1, 2학년=2, 3학년=3 (숫자만)

4. **null 규칙**:
   - 숫자 필드에 해당 데이터가 없으면 null
   - **단, year, semester, month는 필수 숫자 필드입니다. 절대 null이 될 수 없습니다.** 생기부 원문에서 반드시 추출하세요.
   - 문자열 필드에 해당 데이터가 없으면 빈 문자열 ""

5. **id 필드는 포함하지 마세요** (서버에서 자동 생성)

6. 해당 섹션의 데이터가 없으면 빈 배열 []로 반환`;

interface RawRecord {
  [key: string]: RawRow[] | undefined;
}

interface RawRow {
  id?: string;
  [key: string]: unknown;
}

/**
 * LLM 출력이 토큰 한도로 잘렸을 때 JSON 복구를 시도한다.
 * 전략: 끝에서부터 마지막으로 완전하게 닫힌 배열 요소(}나 ])까지 잘라낸 뒤
 * 열린 괄호/중괄호를 닫는다. 단순 bracket-closing보다 훨씬 안정적.
 */
const repairTruncatedJson = (text: string): string => {
  let json = text.trim();

  // 마크다운 코드 펜스 제거
  json = json.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");

  // 1차 시도: 그냥 파싱
  try {
    JSON.parse(json);
    return json;
  } catch {
    // 복구 진행
  }

  // 끝에서부터 마지막 완전한 값 경계까지 잘라낸다.
  // 완전한 값: }, ], "...", number, true, false, null로 끝나는 지점
  // 그 뒤에 오는 불완전한 데이터를 제거한다.
  let cutPoint = json.length;

  // 마지막으로 유효하게 닫힌 } 또는 ] 위치를 찾는다 (문자열 내부 제외)
  let inString = false;
  let escaped = false;
  let lastValidClose = -1;
  const stack: string[] = [];

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      const top = stack[stack.length - 1];
      if (ch === top) {
        stack.pop();
        lastValidClose = i;
      }
    }
  }

  if (lastValidClose > 0 && stack.length > 0) {
    // 마지막으로 완전히 닫힌 위치 이후를 잘라낸다
    cutPoint = lastValidClose + 1;
    json = json.slice(0, cutPoint);

    // 후행 콤마 제거
    json = json.replace(/,\s*$/, "");

    // 남은 열린 괄호 닫기 — 재스캔
    const remainStack: string[] = [];
    let rs = false;
    let re = false;
    for (let i = 0; i < json.length; i++) {
      const ch = json[i];
      if (re) {
        re = false;
        continue;
      }
      if (ch === "\\" && rs) {
        re = true;
        continue;
      }
      if (ch === '"') {
        rs = !rs;
        continue;
      }
      if (rs) continue;
      if (ch === "{") remainStack.push("}");
      else if (ch === "[") remainStack.push("]");
      else if (
        (ch === "}" || ch === "]") &&
        remainStack[remainStack.length - 1] === ch
      ) {
        remainStack.pop();
      }
    }
    while (remainStack.length > 0) json += remainStack.pop();
  }

  return json;
};

const MAX_OUTPUT_TOKENS = 65536;

/** 스키마에서 문자열이어야 하는 필드 목록 (Gemini가 null을 반환하는 경우 "" 보정) */
const STRING_FIELDS: Record<string, string[]> = {
  attendance: ["note"],
  awards: ["name", "rank", "date", "organization", "participants"],
  certifications: ["category", "name", "details", "date", "issuer"],
  creativeActivities: ["area", "note"],
  volunteerActivities: ["dateRange", "place", "content"],
  generalSubjects: ["category", "subject", "achievement"],
  careerSubjects: [
    "category",
    "subject",
    "achievement",
    "achievementDistribution",
  ],
  artsPhysicalSubjects: ["category", "subject", "achievement"],
  subjectEvaluations: ["subject", "evaluation"],
  readingActivities: ["subjectOrArea", "content"],
  behavioralAssessments: ["assessment"],
  mockExams: ["subject"],
};

/**
 * 섹션별 필수 숫자 필드와 기본값.
 * DB에서 NOT NULL이고 default가 없는 숫자 필드만 포함.
 */
const REQUIRED_NUMBER_FIELDS: Record<string, Record<string, number>> = {
  generalSubjects: { year: 1, semester: 1 },
  careerSubjects: { year: 1, semester: 1 },
  artsPhysicalSubjects: { year: 1, semester: 1 },
  mockExams: { year: 1, month: 6 },
  attendance: { year: 1 },
  awards: { year: 1 },
  creativeActivities: { year: 1 },
  volunteerActivities: { year: 1 },
  subjectEvaluations: { year: 1 },
  readingActivities: { year: 1 },
  behavioralAssessments: { year: 1 },
};

const enrichWithIds = (raw: RawRecord): RawRecord => {
  const sections = Object.keys(STRING_FIELDS) as (keyof typeof STRING_FIELDS)[];

  const result: RawRecord = {};
  for (const key of sections) {
    const rows = raw[key];
    const strFields = STRING_FIELDS[key];
    const reqNumFields = REQUIRED_NUMBER_FIELDS[key] ?? {};
    result[key] = Array.isArray(rows)
      ? rows.map((row) => {
          const fixed: RawRow = { ...row, id: crypto.randomUUID() };
          for (const f of strFields) {
            if (fixed[f] === null || fixed[f] === undefined) {
              fixed[f] = "";
            }
          }
          for (const [f, defaultVal] of Object.entries(reqNumFields)) {
            if (fixed[f] === null || fixed[f] === undefined) {
              fixed[f] = defaultVal;
            }
          }
          return fixed;
        })
      : [];
  }
  return result;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI 파싱 기능을 사용할 수 없습니다. API 키가 설정되지 않았습니다.",
      },
      { status: 503 }
    );
  }

  // Parse request body: { files: [{ data, mimeType }] }
  interface FilePayload {
    data: string;
    mimeType: string;
  }
  let files: FilePayload[];
  try {
    const body = await request.json();
    ({ files } = body);
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "파일 데이터가 필요합니다." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const tempPaths: string[] = [];

  try {
    // Upload files via File API in parallel
    const fileManager = new GoogleAIFileManager(apiKey);

    const uploadPromises = files.map(async ({ data, mimeType }, i) => {
      const ext = mimeType.includes("pdf") ? "pdf" : "img";
      const tempPath = join(tmpdir(), `parse-${crypto.randomUUID()}.${ext}`);
      tempPaths.push(tempPath);

      await writeFile(tempPath, Buffer.from(data, "base64"));

      const uploadResult = await fileManager.uploadFile(tempPath, {
        mimeType,
        displayName: `school-record-${i}`,
      });

      return {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri,
        },
      };
    });

    const fileParts = await Promise.all(uploadPromises);

    console.info(
      `[parse] Files uploaded: ${fileParts.length}, URIs: ${fileParts.map((p) => p.fileData.fileUri).join(", ")}`
    );

    // Generate content — thinking OFF for faster structured extraction
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // @ts-expect-error -- thinkingConfig is supported by Gemini 2.5 but not yet in SDK types
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const result = await model.generateContent([
      ...fileParts,
      { text: PARSE_PROMPT },
    ]);

    const finishReason =
      result.response.candidates?.[0]?.finishReason ?? "UNKNOWN";
    const responseText = result.response.text();

    console.info(
      `[parse] Gemini response: finishReason=${finishReason}, length=${responseText.length}, preview=${responseText.slice(0, 200)}`
    );

    if (!responseText || responseText.trim().length === 0) {
      console.error("Gemini returned empty response");
      return NextResponse.json(
        { error: "AI가 빈 응답을 반환했습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    if (finishReason === "MAX_TOKENS") {
      console.warn(
        `Response truncated (finishReason=MAX_TOKENS, length=${responseText.length})`
      );
    }

    let rawJson: unknown;
    try {
      const parsed = JSON.parse(responseText.trim());
      // Gemini가 [{...}] 배열로 감싸서 반환하는 경우 언래핑
      rawJson =
        Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
    } catch {
      // JSON이 잘린 경우 복구 시도
      console.warn(
        "JSON parse failed, attempting repair…",
        `(length=${responseText.length})`
      );
      try {
        const repaired = JSON.parse(repairTruncatedJson(responseText));
        rawJson =
          Array.isArray(repaired) && repaired.length === 1
            ? repaired[0]
            : repaired;
        console.info("JSON repair succeeded (some sections may be partial)");
      } catch (repairErr) {
        console.error("JSON repair also failed:", repairErr);
        return NextResponse.json(
          { error: "AI 응답을 파싱할 수 없습니다. 다시 시도해주세요." },
          { status: 502 }
        );
      }
    }

    const enriched = enrichWithIds(rawJson as RawRecord);

    // 핵심 섹션에 데이터가 하나도 없으면 파싱 실패로 처리
    const coreKeys = [
      "generalSubjects",
      "subjectEvaluations",
      "creativeActivities",
    ] as const;
    const hasAnyData = coreKeys.some(
      (k) => Array.isArray(enriched[k]) && enriched[k]!.length > 0
    );

    if (!hasAnyData) {
      console.error(
        "Parsed result has no data in core sections",
        `(finishReason=${finishReason}, responseLength=${responseText.length})`
      );
      return NextResponse.json(
        {
          error:
            finishReason === "MAX_TOKENS"
              ? "생기부 파일이 너무 커서 분석이 중단되었습니다. 페이지 수를 줄여서 다시 시도해주세요."
              : "생기부 데이터를 추출하지 못했습니다. 파일이 정상적인 생기부 PDF인지 확인 후 다시 시도해주세요.",
        },
        { status: 422 }
      );
    }

    if (finishReason === "MAX_TOKENS") {
      return NextResponse.json(
        {
          ...enriched,
          _warning:
            "토큰 한도 초과로 일부 데이터가 누락되었을 수 있습니다. 데이터를 확인해주세요.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("Gemini parse error:", err);
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("403") || message.includes("suspended")) {
      return NextResponse.json(
        { error: "AI API 키가 유효하지 않습니다. 관리자에게 문의하세요." },
        { status: 403 }
      );
    }

    if (message.includes("429") || message.includes("quota")) {
      return NextResponse.json(
        { error: "AI API 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "AI 파싱에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  } finally {
    await Promise.all(tempPaths.map((p) => unlink(p).catch(() => {})));
  }
}
