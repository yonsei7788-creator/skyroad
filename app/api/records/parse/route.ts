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

생기부 출결 테이블은 2행 병합 헤더 구조입니다. 데이터 행에서 학년·수업일수를 제외한 12개 숫자 셀을 왼쪽→오른쪽 순서대로 읽으세요:

| 인덱스 | 0~2: 결석일수      | 3~5: 지각          | 6~8: 조퇴          | 9~11: 결과         |
|--------|-------------------|-------------------|-------------------|-------------------|
| 하위   | 질병,미인정,기타    | 질병,미인정,기타    | 질병,미인정,기타    | 질병,미인정,기타    |

**반드시 values 배열에 12개 원소를 왼쪽 컬럼부터 순서대로 넣으세요.**
- "." 또는 빈 칸 → null
- 숫자 → 해당 숫자(number)
- values 배열은 정확히 12개여야 합니다.

읽기 방법: 학년·수업일수 뒤의 12개 셀을 순서대로 3개씩 끊어서 결석→지각→조퇴→결과에 매핑하세요.

예시: 테이블 행 "2 | 191 | 2 | . | . | . | . | . | 2 | . | . | . | . | . | 원격수업일수 0일"
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

/**
 * 이미지 PDF용 출결 전용 프롬프트.
 *
 * 핵심 전략: "행 전체를 읽어라" 대신 "숫자가 있는 셀만 위치와 함께 보고해라".
 * 대부분 셀이 "."이므로, 비-null 값 몇 개에만 집중하게 하면:
 * 1. 출력량이 줄어 오류 확률 감소
 * 2. 각 값에 대해 행/열 위치를 명시적으로 확인하므로 밀림 방지
 * 3. 빈 행은 "없음"으로 간단히 처리 → 없는 값을 만들어낼 여지 제거
 */
const ATTENDANCE_OCR_PROMPT = `이 문서에서 "출결상황" 테이블을 찾아서 마크다운 테이블로 변환하세요.

아래 헤더를 정확히 사용하세요. 병합 헤더를 풀어서 14개 컬럼 + 특기사항으로 만드세요.
"." 또는 빈 셀은 그대로 . 으로 적으세요.

| 학년 | 수업일수 | 결석-질병 | 결석-미인정 | 결석-기타 | 지각-질병 | 지각-미인정 | 지각-기타 | 조퇴-질병 | 조퇴-미인정 | 조퇴-기타 | 결과-질병 | 결과-미인정 | 결과-기타 | 특기사항 |
|------|---------|----------|-----------|----------|----------|-----------|----------|----------|-----------|----------|----------|-----------|----------|---------|
| 1 | 190 | 11 | . | . | 1 | . | . | 1 | . | . | . | . | . | 원격수업일수 0일 |

위 예시처럼 모든 학년의 데이터 행을 출력하세요. 마크다운 테이블만 출력하고 다른 설명은 하지 마세요.`;

/**
 * Gemini 마크다운 테이블 출력을 파싱.
 * 헤더 행에서 컬럼 순서를 읽고, 데이터 행의 값을 위치 기반으로 매핑.
 * Gemini가 헤더를 약간 다르게 쓸 수 있으므로 fuzzy 매칭 사용.
 */
const parseAttendanceOcrOutput = (ocrText: string): RawRow[] | null => {
  const toNullable = (v: number): number | null => (v === 0 ? null : v);

  const lines = ocrText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  if (lines.length < 3) return null; // 헤더 + 구분선 + 최소 1행

  // 헤더 행에서 컬럼 이름 추출
  const headerCells = lines[0]
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  // 컬럼 이름 → ATTENDANCE_VALUE_KEYS 인덱스 매핑
  const FIELD_PATTERNS: [RegExp, string][] = [
    [/결석.*질병/, "absenceIllness"],
    [/결석.*미인정/, "absenceUnauthorized"],
    [/결석.*기타/, "absenceOther"],
    [/지각.*질병/, "latenessIllness"],
    [/지각.*미인정/, "latenessUnauthorized"],
    [/지각.*기타/, "latenessOther"],
    [/조퇴.*질병/, "earlyLeaveIllness"],
    [/조퇴.*미인정/, "earlyLeaveUnauthorized"],
    [/조퇴.*기타/, "earlyLeaveOther"],
    [/결과.*질병/, "classMissedIllness"],
    [/결과.*미인정/, "classMissedUnauthorized"],
    [/결과.*기타/, "classMissedOther"],
  ];

  // 각 컬럼 인덱스에 대해 필드명 매핑
  const colFieldMap = new Map<number, string>();
  let yearColIdx = -1;
  let totalDaysColIdx = -1;
  let noteColIdx = -1;

  for (let ci = 0; ci < headerCells.length; ci++) {
    const h = headerCells[ci];
    if (/학년/.test(h)) {
      yearColIdx = ci;
    } else if (/수업일수/.test(h)) {
      totalDaysColIdx = ci;
    } else if (/특기/.test(h)) {
      noteColIdx = ci;
    } else {
      for (const [pattern, fieldName] of FIELD_PATTERNS) {
        if (pattern.test(h)) {
          colFieldMap.set(ci, fieldName);
          break;
        }
      }
    }
  }

  console.info(
    `[parse] Attendance markdown: ${headerCells.length} cols, ` +
      `year=${yearColIdx}, totalDays=${totalDaysColIdx}, note=${noteColIdx}, ` +
      `fields=${colFieldMap.size}`
  );

  // 데이터 행 파싱 (구분선 "---" 건너뛰기)
  const rows: RawRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (/^[|\s-]+$/.test(line)) continue; // 구분선

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const yearStr = yearColIdx >= 0 ? cells[yearColIdx] : "";
    const year = parseInt(yearStr, 10);
    if (!year || year < 1 || year > 4) continue;

    const totalDaysStr = totalDaysColIdx >= 0 ? cells[totalDaysColIdx] : "0";
    const totalDays = parseInt(totalDaysStr, 10) || 0;

    const row: RawRow = {
      id: crypto.randomUUID(),
      year,
      totalDays,
      absenceIllness: null,
      absenceUnauthorized: null,
      absenceOther: null,
      latenessIllness: null,
      latenessUnauthorized: null,
      latenessOther: null,
      earlyLeaveIllness: null,
      earlyLeaveUnauthorized: null,
      earlyLeaveOther: null,
      classMissedIllness: null,
      classMissedUnauthorized: null,
      classMissedOther: null,
      note: "",
    };

    // 매핑된 컬럼에서 값 추출
    for (const [ci, fieldName] of colFieldMap) {
      if (ci < cells.length) {
        const cellVal = cells[ci];
        if (cellVal !== "." && cellVal !== "") {
          const num = parseInt(cellVal, 10);
          if (!isNaN(num)) {
            row[fieldName] = toNullable(num);
          }
        }
      }
    }

    // 특기사항
    if (noteColIdx >= 0 && noteColIdx < cells.length) {
      let note = cells[noteColIdx].trim();
      if (note === "." || note === "없음" || note === "없음.") note = "";
      row.note = note;
    }

    console.info(
      `[parse] Attendance OCR parsed: year=${year}, totalDays=${totalDays}, ` +
        `결석=[${row.absenceIllness},${row.absenceUnauthorized},${row.absenceOther}], ` +
        `지각=[${row.latenessIllness},${row.latenessUnauthorized},${row.latenessOther}], ` +
        `조퇴=[${row.earlyLeaveIllness},${row.earlyLeaveUnauthorized},${row.earlyLeaveOther}], ` +
        `결과=[${row.classMissedIllness},${row.classMissedUnauthorized},${row.classMissedOther}], ` +
        `note="${row.note}"`
    );

    rows.push(row);
  }

  rows.sort((a, b) => (a.year as number) - (b.year as number));
  return rows.length > 0 ? rows : null;
};

/**
 * 출결 데이터를 Gemini OCR로 추출한다.
 * 전략: 비-null 셀만 위치와 함께 보고하게 하여 셀 밀림 방지.
 * thinkingBudget 충분히 부여하여 격자선 기반 셀 위치 파악.
 */
const extractAttendanceFromImage = async (
  genAI: GoogleGenerativeAI,
  fileParts: { fileData: { mimeType: string; fileUri: string } }[]
): Promise<RawRow[] | null> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0,
      // @ts-expect-error -- thinkingConfig is supported by Gemini 2.5 but not yet in SDK types
      thinkingConfig: { thinkingBudget: 8192 },
    },
  });

  try {
    const result = await model.generateContent([
      ...fileParts,
      { text: ATTENDANCE_OCR_PROMPT },
    ]);
    const text = result.response.text().trim();
    console.info(`[parse] Attendance OCR raw:\n${text}`);
    return parseAttendanceOcrOutput(text);
  } catch (e) {
    console.warn("[parse] Attendance OCR call failed:", e);
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
        temperature: 0,
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

    // 출결: 전용 OCR 프롬프트 + 5회 병렬 호출 + 비-null 신뢰 합의
    // Gemini에게 단순 OCR(셀 읽기)만 시키고, 구조 매핑은 코드에서 처리
    const attendanceResult = await extractAttendanceFromImage(genAI, fileParts);

    // Gemini 1차 결과에서 특기사항(note) 보완용
    const llmAttendance = (rawJson as RawRecord).attendance;
    const llmNoteByYear = new Map<number, string>();
    if (Array.isArray(llmAttendance)) {
      for (const row of llmAttendance) {
        const y = typeof row.year === "number" ? row.year : 0;
        const n = typeof row.note === "string" ? row.note : "";
        if (y > 0) llmNoteByYear.set(y, n);
      }
    }

    if (attendanceResult && attendanceResult.length > 0) {
      // OCR 합의 성공: 특기사항은 1차 결과에서 보완
      for (const row of attendanceResult) {
        const year = row.year as number;
        if (!row.note && llmNoteByYear.has(year)) {
          row.note = llmNoteByYear.get(year)!;
        }
      }
      enriched.attendance = attendanceResult;
      console.info(
        `[parse] Attendance: OCR consensus succeeded (${attendanceResult.length} rows)`
      );
    } else {
      // fallback: 1차 Gemini 호출의 attendance 사용
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
      console.warn(
        "[parse] Attendance: OCR consensus failed, using raw LLM fallback"
      );
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
