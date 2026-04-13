import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { correctSubjectName } from "@/libs/report/constants/subject-name-corrections";
import { withRetry } from "@/libs/report/pipeline/retry";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ── 학년/학기 판단 공통 규칙 (양쪽 프롬프트에서 공유) ──
const YEAR_SEMESTER_RULES = `
## 학년(year)과 학기(semester) 판단법 — 가장 중요한 규칙

생기부 교과학습발달상황 테이블은 두 가지 형태가 있습니다. **먼저 테이블 구조를 파악한 뒤** 해당하는 케이스의 규칙을 따르세요.

### Case 1: 테이블에 "학년" 컬럼과 "학기" 컬럼이 모두 있는 경우

테이블 예시:
| 학년 | 학기 | 교과 | 과목 | 단위수 | ... | 석차등급 |
|  1   |  1   | 국어 | 국어 |   3   | ... |    3    |
|      |      | 수학 | 수학 |   3   | ... |    2    |
|      |  2   | 국어 | 문학 |   3   | ... |    2    |
|  2   |  1   | ...  |      |       |     |         |

- **학년과 학기를 테이블 컬럼에서 직접 읽으세요.**
- **병합 셀 규칙**: 학년 또는 학기 칸이 비어있으면(병합 셀) **바로 위 행의 값을 이어받으세요.**
  - 위 예시에서 2행(수학)은 학년=빈칸, 학기=빈칸 → 위 행의 학년=1, 학기=1을 이어받음
  - 3행(문학)은 학년=빈칸, 학기=2 → 학년은 위에서 이어받아 1, 학기=2
- 학년 컬럼의 값이 바뀌면(1→2) 새로운 학년이 시작된 것입니다.

### Case 2: 테이블에 "학기" 컬럼만 있고 "학년" 컬럼이 없는 경우

- **학기**: 테이블의 학기 컬럼에서 직접 읽으세요. 병합 셀이면 위 행 값을 이어받으세요.
- **학년**: 테이블 바깥의 섹션 헤더에서 판단하세요.
  - "[1학년]", "[2학년]", "1학년 교과학습발달상황" 같은 헤더를 찾으세요.
  - 각 과목이 어느 학년 헤더 ~ 다음 학년 헤더 사이에 있는지 확인하세요.
  - **⚠️ 페이지가 넘어간다고 학년이 바뀌지 않습니다.** 반드시 학년 헤더를 기준으로 판단하세요.

### 공통 주의사항

- **⚠️ "학기"와 "학년"을 혼동하지 마세요.**
  - "1학년 2학기" → year=1, semester=2
  - "2학기"를 보고 year=2로 넣으면 **오류**입니다.
- **⚠️ 검증**: 각 학년에는 1학기와 2학기 과목이 모두 있어야 합니다. 1학년에 1학기만 있고 2학기가 없다면 학기를 학년으로 잘못 분류한 것입니다 (3학년 재학생만 예외).
- 공통과목(통합사회, 통합과학, 한국사 등)은 1학년에만 편성됩니다.
- year: 1학년=1, 2학년=2, 3학년=3 (숫자만)
- semester: 1학기=1, 2학기=2 (숫자만)
`;

// ── Pass 1: 구조화 데이터 (성적·출결·수상·창체 등) ──
const PARSE_PROMPT_STRUCTURED = `당신은 한국 고등학교 생활기록부(학생부) 전문 파서입니다.
첨부된 파일은 생활기록부입니다. 이 문서에서 **성적, 출결, 수상, 자격증, 창의적 체험활동, 봉사활동, 체육·음악·미술 교과** 데이터만 추출하여 아래 JSON 스키마에 맞게 구조화해주세요.

⚠️ subjectEvaluations, readingActivities, behavioralAssessments는 이 호출에서 **추출하지 마세요**. 빈 배열로 반환하세요.

## 출결상황 테이블 파싱 규칙

생기부 출결 테이블은 2행 병합 헤더 구조입니다. 데이터 행에서 학년·수업일수를 제외한 12개 숫자 셀을 왼쪽→오른쪽 순서대로 읽으세요:

| 인덱스 | 0~2: 결석일수      | 3~5: 지각          | 6~8: 조퇴          | 9~11: 결과         |
|--------|-------------------|-------------------|-------------------|-------------------|
| 하위   | 질병,미인정,기타    | 질병,미인정,기타    | 질병,미인정,기타    | 질병,미인정,기타    |

- "." 또는 빈 칸 → 0
- 숫자 → 해당 숫자(number)
- note(특기사항): 출결 테이블의 특기사항 컬럼 값을 그대로 옮기세요 (예: "원격수업일수 0일"). 없으면 빈 문자열 ""

## JSON 스키마

{
  "attendance": [
    {
      "year": number,
      "totalDays": number|null,
      "absenceIllness": number, "absenceUnauthorized": number, "absenceOther": number,
      "latenessIllness": number, "latenessUnauthorized": number, "latenessOther": number,
      "earlyLeaveIllness": number, "earlyLeaveUnauthorized": number, "earlyLeaveOther": number,
      "classMissedIllness": number, "classMissedUnauthorized": number, "classMissedOther": number,
      "note": string
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
  "subjectEvaluations": [],
  "readingActivities": [],
  "behavioralAssessments": []
}

## 분류 규칙

1. **교과 구분**:
   - 석차등급(gradeRank)이 있는 과목 → generalSubjects
   - 성취도별 분포비율(achievementDistribution)이 있는 과목 → careerSubjects
   - 체육·음악·미술 교과 → artsPhysicalSubjects

2. **창의적 체험활동**:
   - area는 반드시 "자율활동", "동아리활동", "진로활동" 중 하나

${YEAR_SEMESTER_RULES}

3. **null 규칙**:
   - 숫자 필드에 해당 데이터가 없거나 "." 이면 null
   - **단, year, semester는 필수 숫자 필드입니다. 절대 null이 될 수 없습니다.** 생기부 원문에서 반드시 추출하세요.
   - 문자열 필드에 해당 데이터가 없으면 빈 문자열 ""

4. **id 필드는 포함하지 마세요** (서버에서 자동 생성)

5. 해당 섹션의 데이터가 없으면 빈 배열 []로 반환

6. **achievementDistribution**: 생기부 원문 그대로 옮기세요

7. **note(비고)**: generalSubjects와 careerSubjects의 성적표에 "비고" 컬럼이 있으면 그 값을 note 필드에 옮기세요. 예: "공동", "공동, 타기관" 등. 비고 컬럼이 없거나 빈 칸이면 빈 문자열 ""로 반환`;

// ── Pass 2: 서술형 데이터 (세특·독서·행특) ──
const PARSE_PROMPT_TEXT = `당신은 한국 고등학교 생활기록부(학생부) 전문 파서입니다.
첨부된 파일은 생활기록부입니다. 이 문서에서 **세부능력 및 특기사항(교과별 세특), 독서활동, 행동특성 및 종합의견**만 추출하여 아래 JSON 스키마에 맞게 구조화해주세요.

⚠️ 성적, 출결, 수상 등 다른 섹션은 추출하지 마세요.
⚠️ evaluation/assessment 텍스트는 생기부 원문을 **한 글자도 빠짐없이 그대로** 옮기세요. 요약하거나 줄이지 마세요.

## JSON 스키마

{
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

${YEAR_SEMESTER_RULES}

## 규칙

1. **subjectEvaluations (세부능력 및 특기사항)**:
   - 교과별로 작성된 서술형 평가입니다.
   - year는 해당 과목이 속한 학년입니다. 학년 헤더를 기준으로 판단하세요.
   - subject는 과목명 (예: "국어", "수학Ⅰ", "영어")
   - evaluation은 원문 전체를 그대로 옮기세요.

2. **readingActivities (독서활동)**:
   - year는 학년, subjectOrArea는 교과/영역명, content는 독서 내용

3. **behavioralAssessments (행동특성 및 종합의견)**:
   - year는 학년, assessment는 원문 전체를 그대로 옮기세요.

4. **null 규칙**:
   - year는 필수 숫자 필드입니다. 절대 null이 될 수 없습니다.
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

const MAX_OUTPUT_TOKENS = 32768;

/** 스키마에서 문자열이어야 하는 필드 목록 (AI가 null을 반환하는 경우 "" 보정) */
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
};

/**
 * 섹션별 필수 숫자 필드와 기본값.
 * DB에서 NOT NULL이고 default가 없는 숫자 필드만 포함.
 */
const REQUIRED_NUMBER_FIELDS: Record<string, Record<string, number>> = {
  generalSubjects: { year: 1, semester: 1 },
  careerSubjects: { year: 1, semester: 1 },
  artsPhysicalSubjects: { year: 1, semester: 1 },
  attendance: {
    year: 1,
    absenceIllness: 0,
    absenceUnauthorized: 0,
    absenceOther: 0,
    latenessIllness: 0,
    latenessUnauthorized: 0,
    latenessOther: 0,
    earlyLeaveIllness: 0,
    earlyLeaveUnauthorized: 0,
    earlyLeaveOther: 0,
    classMissedIllness: 0,
    classMissedUnauthorized: 0,
    classMissedOther: 0,
  },
  awards: { year: 1, semester: 1 },
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

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Download files from Supabase Storage → base64 변환
    const downloadPromises = storagePaths.map(async ({ path, mimeType }) => {
      const { data: fileData, error: dlError } = await admin.storage
        .from("record-uploads")
        .download(path);

      if (dlError || !fileData) {
        throw new Error(`파일 다운로드 실패: ${dlError?.message ?? "unknown"}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const base64 = buffer.toString("base64");
      return { mimeType, base64 };
    });

    const files = await Promise.all(downloadPromises);

    console.info(`[parse] Files prepared: ${files.length}`);

    // Gemini inline file parts
    const fileParts = files.map((f) => ({
      inlineData: { mimeType: f.mimeType, data: f.base64 },
    }));

    const callGemini = async (prompt: string): Promise<string> => {
      return withRetry(async () => {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0,
          },
        });
        const result = await model.generateContent([
          ...fileParts,
          { text: prompt },
        ]);
        return result.response.text();
      });
    };

    const parseResponse = (label: string, text: string): unknown => {
      const trimmed = text.trim();
      if (!trimmed) throw new Error(`${label}: 빈 응답`);
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) && parsed.length === 1
          ? parsed[0]
          : parsed;
      } catch {
        console.warn(`${label}: JSON parse failed, attempting repair…`);
        const repaired = JSON.parse(repairTruncatedJson(trimmed));
        return Array.isArray(repaired) && repaired.length === 1
          ? repaired[0]
          : repaired;
      }
    };

    // 병렬 호출 (Pass 1: 구조화, Pass 2: 서술형)
    const [structuredText, textText] = await Promise.all([
      callGemini(PARSE_PROMPT_STRUCTURED),
      callGemini(PARSE_PROMPT_TEXT),
    ]);

    console.info(
      `[parse] Pass 1 (structured): length=${structuredText.length}`
    );
    console.info(`[parse] Pass 2 (text): length=${textText.length}`);

    let structuredJson: RawRecord;
    let textJson: RawRecord;
    try {
      structuredJson = parseResponse("Pass 1", structuredText) as RawRecord;
    } catch (e) {
      console.error("Pass 1 parse failed:", e);
      return NextResponse.json(
        { error: "AI 응답을 파싱할 수 없습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }
    try {
      textJson = parseResponse("Pass 2", textText) as RawRecord;
    } catch (e) {
      console.error("Pass 2 parse failed:", e);
      // 세특 파싱 실패해도 구조화 데이터는 살린다
      textJson = {
        subjectEvaluations: [],
        readingActivities: [],
        behavioralAssessments: [],
      };
    }

    // 두 결과 병합
    const rawJson: RawRecord = {
      ...structuredJson,
      subjectEvaluations: textJson.subjectEvaluations ?? [],
      readingActivities: textJson.readingActivities ?? [],
      behavioralAssessments: textJson.behavioralAssessments ?? [],
    };

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
        `(responseLength=${structuredText.length}+${textText.length})`
      );
      return NextResponse.json(
        {
          error:
            "생기부 데이터를 추출하지 못했습니다. 파일이 정상적인 생기부 PDF인지 확인 후 다시 시도해주세요.",
        },
        { status: 422 }
      );
    }

    // ── 학년/학기 검증 + 교정 ──
    // 학년/학기 이상 징후 감지 (로그만, 교정은 하지 않음 — AI 프롬프트에서 처리)
    {
      const sections = [
        "generalSubjects",
        "careerSubjects",
        "artsPhysicalSubjects",
      ] as const;
      for (const section of sections) {
        const rows = enriched[section];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const byYear = new Map<number, RawRow[]>();
        for (const row of rows) {
          const y = (row.year as number) ?? 1;
          const arr = byYear.get(y) ?? [];
          arr.push(row);
          byYear.set(y, arr);
        }
        for (const [year, yearRows] of byYear) {
          if (year < 1) continue;
          const sem1 = yearRows.filter((r) => r.semester === 1);
          const sem2 = yearRows.filter((r) => r.semester === 2);
          if (sem1.length > 0 && sem2.length === 0 && year < 3) {
            console.warn(
              `[parse] ⚠️ ${section} ${year}학년에 1학기만 있고 2학기 없음 (${sem1.length}과목) — 학기 오분류 가능성`
            );
          }
        }
      }
    }

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("AI parse error:", err);
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

    if (
      message.includes("503") ||
      message.includes("UNAVAILABLE") ||
      message.includes("overloaded")
    ) {
      return NextResponse.json(
        {
          error:
            "현재 AI 사용량이 급증하여 일시적으로 처리할 수 없습니다. 몇 분 뒤에 다시 시도해주세요.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "AI 파싱에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  } finally {
    if (admin && storagePaths.length > 0) {
      await admin.storage
        .from("record-uploads")
        .remove(storagePaths.map((sp) => sp.path))
        .catch(() => {});
    }
  }
}
