import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import crypto from "crypto";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { correctSubjectName } from "@/libs/report/constants/subject-name-corrections";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PARSE_PROMPT = `당신은 한국 고등학교 생활기록부(학생부) 전문 파서입니다.
첨부된 파일은 생활기록부입니다. 이 문서를 분석하여 아래 JSON 스키마에 맞게 구조화해주세요.

## 출결상황 테이블 — 위치 기반 배열로 출력 (필드명 매핑 금지)

생기부 출결 테이블의 컬럼 순서 (학년·수업일수 제외, 왼쪽→오른쪽):
[0]결석-질병 [1]결석-미인정 [2]결석-기타 [3]지각-질병 [4]지각-미인정 [5]지각-기타 [6]조퇴-질병 [7]조퇴-미인정 [8]조퇴-기타 [9]결과-질병 [10]결과-미인정 [11]결과-기타

**반드시 values 배열에 12개 원소를 왼쪽 컬럼부터 순서대로 넣으세요.**
- "." 또는 빈 칸 → null
- 숫자 → 해당 숫자(number)
- values 배열은 정확히 12개여야 합니다.

예시: 학년=2, 수업일수=191, 결석(질병=2 미인정=. 기타=.), 지각(. . .), 조퇴(질병=2 미인정=. 기타=.), 결과(. . .), 특기사항="원격수업일수 0일"
→ { "year": 2, "totalDays": 191, "values": [2, null, null, null, null, null, 2, null, null, null, null, null], "note": "원격수업일수 0일" }

## JSON 스키마

{
  "attendance": [
    {
      "year": number,                        // 학년
      "totalDays": number|null,              // 수업일수
      "values": [number|null, number|null, number|null, number|null, number|null, number|null, number|null, number|null, number|null, number|null, number|null, number|null],  // 12개: 결석(질병,미인정,기타) 지각(질병,미인정,기타) 조퇴(질병,미인정,기타) 결과(질병,미인정,기타)
      "note": string                         // 특기사항
    }
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
    { "year": number, "semester": number, "category": string, "subject": string, "credits": number|null, "rawScore": number|null, "average": number|null, "standardDeviation": number|null, "achievement": string, "studentCount": number|null, "gradeRank": number|null, "note": string }
  ],
  "careerSubjects": [
    { "year": number, "semester": number, "category": string, "subject": string, "credits": number|null, "rawScore": number|null, "average": number|null, "achievement": string, "studentCount": number|null, "achievementDistribution": string, "note": string }
  ],
  "artsPhysicalSubjects": [
    { "year": number, "semester": number, "category": string, "subject": string, "credits": number|null, "achievement": "A"|"B"|"C"|"P" }
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
   - 숫자 필드에 해당 데이터가 없거나 "." 이면 null
   - **단, year, semester, month는 필수 숫자 필드입니다. 절대 null이 될 수 없습니다.** 생기부 원문에서 반드시 추출하세요.
   - 문자열 필드에 해당 데이터가 없으면 빈 문자열 ""

5. **id 필드는 포함하지 마세요** (서버에서 자동 생성)

6. 해당 섹션의 데이터가 없으면 빈 배열 []로 반환

7. **achievementDistribution**: 생기부 원문 그대로 옮기세요

8. **note(비고)**: generalSubjects와 careerSubjects의 성적표에 "비고" 컬럼이 있으면 그 값을 note 필드에 옮기세요. 예: "공동", "공동, 타기관" 등. 비고 컬럼이 없거나 빈 칸이면 빈 문자열 ""로 반환`;

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

/** subject 필드가 있는 섹션들 — 과목명 오타 보정 대상 */
const SUBJECT_FIELD_SECTIONS = new Set([
  "generalSubjects",
  "careerSubjects",
  "artsPhysicalSubjects",
  "subjectEvaluations",
]);

/** 출결 12개 컬럼 → 필드명 매핑 (왼→오 고정 순서) */
const ATTENDANCE_VALUE_KEYS = [
  "absenceIllness",
  "absenceUnauthorized",
  "absenceOther",
  "latenessIllness",
  "latenessUnauthorized",
  "latenessOther",
  "earlyLeaveIllness",
  "earlyLeaveUnauthorized",
  "earlyLeaveOther",
  "classMissedIllness",
  "classMissedUnauthorized",
  "classMissedOther",
] as const;

const ATTENDANCE_EXTRACT_PROMPT = `이 생활기록부에서 "출결상황" 테이블을 읽어주세요.

## 테이블 구조

출결상황 테이블의 헤더는 2행으로 되어 있습니다:
- 1행: 학년 | 수업일수 | 결석일수(병합) | 지각(병합) | 조퇴(병합) | 결과(병합) | 특기사항
- 2행:                 | 질병|미인정|기타 | 질병|미인정|기타 | 질병|미인정|기타 | 질병|미인정|기타 |

각 카테고리(결석일수, 지각, 조퇴, 결과) 아래에는 반드시 질병, 미인정, 기타 3개의 하위 컬럼이 있습니다.

## 출력 형식

각 학년마다 아래 형식으로 정확히 출력하세요. "." 또는 빈 칸은 0으로 적으세요.
카테고리별로 한 줄씩, 해당 카테고리의 병합 헤더 아래 3개 셀만 읽으세요.

=== 학년 [번호] ===
수업일수: [숫자]
결석일수: 질병=[숫자] 미인정=[숫자] 기타=[숫자]
지각: 질병=[숫자] 미인정=[숫자] 기타=[숫자]
조퇴: 질병=[숫자] 미인정=[숫자] 기타=[숫자]
결과: 질병=[숫자] 미인정=[숫자] 기타=[숫자]
특기사항: [텍스트 또는 없음]

## 예시

=== 학년 1 ===
수업일수: 195
결석일수: 질병=0 미인정=0 기타=0
지각: 질병=3 미인정=1 기타=0
조퇴: 질병=0 미인정=0 기타=0
결과: 질병=2 미인정=0 기타=0
특기사항: 없음

=== 학년 2 ===
수업일수: 190
결석일수: 질병=0 미인정=0 기타=0
지각: 질병=0 미인정=0 기타=0
조퇴: 질병=0 미인정=0 기타=0
결과: 질병=0 미인정=0 기타=0
특기사항: 개근, 원격수업일수 50일

모든 학년을 빠짐없이 출력하세요.`;

/**
 * "질병=[숫자] 미인정=[숫자] 기타=[숫자]" 형식의 문자열에서 3개 값 추출.
 */
const parseTriple = (line: string): [number, number, number] => {
  const illness = line.match(/질병\s*=\s*(\d+)/)?.[1];
  const unauth = line.match(/미인정\s*=\s*(\d+)/)?.[1];
  const other = line.match(/기타\s*=\s*(\d+)/)?.[1];
  return [
    illness ? parseInt(illness, 10) : 0,
    unauth ? parseInt(unauth, 10) : 0,
    other ? parseInt(other, 10) : 0,
  ];
};

/**
 * Gemini 2차 호출로 출결 테이블을 카테고리별 구조화 텍스트로 추출.
 * 카테고리(결석일수/지각/조퇴/결과)를 별도 줄로 분리하여
 * Gemini가 그룹 간 셀 위치를 혼동하는 것을 방지한다.
 */
const extractAttendanceWithGemini = async (
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  fileParts: { fileData: { mimeType: string; fileUri: string } }[]
): Promise<RawRow[] | null> => {
  try {
    const result = await model.generateContent([
      ...fileParts,
      { text: ATTENDANCE_EXTRACT_PROMPT },
    ]);
    const rawText = result.response.text().trim();
    console.info(`[parse] Attendance 2nd pass raw:\n${rawText}`);

    // "=== 학년 N ===" 블록 단위로 분리
    const blocks = rawText.split(/===\s*학년\s*(\d+)\s*===/).slice(1);
    // blocks = [yearStr, content, yearStr, content, ...]

    const rows: RawRow[] = [];
    const seenYears = new Set<number>();

    for (let i = 0; i < blocks.length - 1; i += 2) {
      const year = parseInt(blocks[i].trim(), 10);
      const content = blocks[i + 1];

      if (!year || year < 1 || year > 4) continue;
      if (seenYears.has(year)) {
        console.warn(`[parse] Attendance: duplicate year=${year}, skipping`);
        continue;
      }
      seenYears.add(year);

      // 수업일수 추출
      const totalDaysMatch = content.match(/수업일수\s*[:：]\s*(\d+)/);
      const totalDays = totalDaysMatch ? parseInt(totalDaysMatch[1], 10) : 0;

      // 카테고리별 3개 값 추출 (각 줄에서 질병/미인정/기타)
      const absenceLine = content.match(/결석일수\s*[:：]\s*(.*)/)?.[1] ?? "";
      const latenessLine = content.match(/지각\s*[:：]\s*(.*)/)?.[1] ?? "";
      const earlyLeaveLine = content.match(/조퇴\s*[:：]\s*(.*)/)?.[1] ?? "";
      const classMissedLine = content.match(/결과\s*[:：]\s*(.*)/)?.[1] ?? "";

      const [aI, aU, aO] = parseTriple(absenceLine);
      const [lI, lU, lO] = parseTriple(latenessLine);
      const [eI, eU, eO] = parseTriple(earlyLeaveLine);
      const [cI, cU, cO] = parseTriple(classMissedLine);

      // 특기사항 추출
      const noteMatch = content.match(/특기사항\s*[:：]\s*(.*)/);
      let note = noteMatch ? noteMatch[1].trim() : "";
      if (note === "없음" || note === "없음.") note = "";

      const row: RawRow = {
        id: crypto.randomUUID(),
        year,
        totalDays,
        absenceIllness: aI || null,
        absenceUnauthorized: aU || null,
        absenceOther: aO || null,
        latenessIllness: lI || null,
        latenessUnauthorized: lU || null,
        latenessOther: lO || null,
        earlyLeaveIllness: eI || null,
        earlyLeaveUnauthorized: eU || null,
        earlyLeaveOther: eO || null,
        classMissedIllness: cI || null,
        classMissedUnauthorized: cU || null,
        classMissedOther: cO || null,
        note,
      };

      console.info(
        `[parse] Attendance row: year=${year}, totalDays=${totalDays}, ` +
          `결석=[${aI},${aU},${aO}], 지각=[${lI},${lU},${lO}], ` +
          `조퇴=[${eI},${eU},${eO}], 결과=[${cI},${cU},${cO}], ` +
          `note="${note}"`
      );

      rows.push(row);
    }

    // 학년 순서 정렬
    rows.sort((a, b) => (a.year as number) - (b.year as number));

    return rows.length > 0 ? rows : null;
  } catch (e) {
    console.warn("[parse] Attendance 2nd pass failed:", e);
    return null;
  }
};

const enrichWithIds = (raw: RawRecord): RawRecord => {
  const sections = Object.keys(STRING_FIELDS) as (keyof typeof STRING_FIELDS)[];

  const result: RawRecord = {};
  for (const key of sections) {
    const rows = raw[key];

    // 출결은 별도 처리 — deterministic parser 결과가 있으면 그것을 사용
    if (key === "attendance") {
      continue;
    }

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
          // 과목명 오타 보정 (PDF OCR 오류 대응)
          if (
            SUBJECT_FIELD_SECTIONS.has(key) &&
            typeof fixed.subject === "string"
          ) {
            fixed.subject = correctSubjectName(fixed.subject);
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

  // Parse request body: { storagePaths: [{ path, mimeType }] }
  interface StorageFileRef {
    path: string;
    mimeType: string;
  }
  let storagePaths: StorageFileRef[];
  try {
    const body = await request.json();
    ({ storagePaths } = body);
    if (!Array.isArray(storagePaths) || storagePaths.length === 0) {
      return NextResponse.json(
        { error: "파일 데이터가 필요합니다." },
        { status: 400 }
      );
    }
    // 보안: 본인 폴더의 파일만 접근 가능
    for (const sp of storagePaths) {
      if (!sp.path.startsWith(`${user.id}/`)) {
        return NextResponse.json(
          { error: "잘못된 파일 경로입니다." },
          { status: 403 }
        );
      }
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버 설정 오류입니다." },
      { status: 500 }
    );
  }

  const tempPaths: string[] = [];

  try {
    // Download files from Supabase Storage → write to temp → upload to Google File API
    const fileManager = new GoogleAIFileManager(apiKey);

    const uploadPromises = storagePaths.map(async ({ path, mimeType }, i) => {
      const { data: fileData, error: dlError } = await admin.storage
        .from("record-uploads")
        .download(path);

      if (dlError || !fileData) {
        throw new Error(`파일 다운로드 실패: ${dlError?.message ?? "unknown"}`);
      }

      const ext = mimeType.includes("pdf") ? "pdf" : "img";
      const tempPath = join(tmpdir(), `parse-${crypto.randomUUID()}.${ext}`);
      tempPaths.push(tempPath);

      const buffer = Buffer.from(await fileData.arrayBuffer());
      await writeFile(tempPath, buffer);

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

    // Generate content — thinking 비활성화: 구조화 추출이므로 추론 불필요, 속도 우선
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

    // 출결: Gemini 2차 호출로 JSON 추출 — 필드명 기반 매핑으로 컬럼/행 밀림 방지
    // thinking budget 8192: 병합 헤더가 있는 복잡한 테이블 구조를 정확히 파악하기 위해 충분한 추론 시간 부여
    // responseMimeType 미설정: structured output 제약 없이 자유롭게 추론 후 JSON 출력
    const attendanceModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 2048,
        // @ts-expect-error -- thinkingConfig is supported by Gemini 2.5 but not yet in SDK types
        thinkingConfig: { thinkingBudget: 8192 },
      },
    });
    const attendanceResult = await extractAttendanceWithGemini(
      attendanceModel,
      fileParts
    );
    if (attendanceResult) {
      enriched.attendance = attendanceResult;
    } else {
      // fallback: 1차 호출의 attendance 사용
      const llmAttendance = (rawJson as RawRecord).attendance;
      enriched.attendance = Array.isArray(llmAttendance)
        ? llmAttendance.map((row) => {
            const { values, ...rest } = row;
            const mapped: RawRow = { ...rest, id: crypto.randomUUID() };
            if (Array.isArray(values)) {
              for (let i = 0; i < ATTENDANCE_VALUE_KEYS.length; i++) {
                mapped[ATTENDANCE_VALUE_KEYS[i]] =
                  typeof values[i] === "number" ? values[i] : null;
              }
            } else {
              for (const key of ATTENDANCE_VALUE_KEYS) {
                if (!(key in mapped)) mapped[key] = null;
              }
            }
            if (mapped.note === null || mapped.note === undefined)
              mapped.note = "";
            if (mapped.year === null || mapped.year === undefined)
              mapped.year = 1;
            return mapped;
          })
        : [];
      console.warn("[parse] Using LLM attendance fallback (2nd pass failed)");
    }

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
    // 임시 파일 정리
    await Promise.all(tempPaths.map((p) => unlink(p).catch(() => {})));
    // Storage 파일 정리
    if (admin && storagePaths.length > 0) {
      await admin.storage
        .from("record-uploads")
        .remove(storagePaths.map((sp) => sp.path))
        .catch(() => {});
    }
  }
}
