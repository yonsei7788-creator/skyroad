import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import crypto from "crypto";
import { promisify } from "util";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { correctSubjectName } from "@/libs/report/constants/subject-name-corrections";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const IS_VERCEL = !!process.env.VERCEL;
const PDF_PARSER_URL =
  process.env.PDF_PARSER_URL || "https://pdf-parser-alpha.vercel.app/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawRow {
  id?: string;
  [key: string]: unknown;
}

// ─── Post-processing ───────────────────────────────────────────────────────

const SUBJECT_FIELD_SECTIONS = new Set([
  "generalSubjects",
  "careerSubjects",
  "artsPhysicalSubjects",
  "subjectEvaluations",
]);

const ALL_SECTIONS = [
  "attendance",
  "awards",
  "certifications",
  "creativeActivities",
  "volunteerActivities",
  "generalSubjects",
  "careerSubjects",
  "artsPhysicalSubjects",
  "subjectEvaluations",
  "readingActivities",
  "behavioralAssessments",
  "mockExams",
];

const enrichResult = (
  raw: Record<string, unknown[]>
): Record<string, RawRow[]> => {
  const result: Record<string, RawRow[]> = {};

  for (const [key, rows] of Object.entries(raw)) {
    if (!Array.isArray(rows)) continue;

    result[key] = rows.map((row) => {
      const enriched: RawRow = {
        ...(row as Record<string, unknown>),
      };

      if (!enriched.id) {
        enriched.id = crypto.randomUUID();
      }

      // 과목명 오타 보정
      if (
        SUBJECT_FIELD_SECTIONS.has(key) &&
        typeof enriched.subject === "string"
      ) {
        enriched.subject = correctSubjectName(enriched.subject);
      }

      return enriched;
    });
  }

  for (const section of ALL_SECTIONS) {
    if (!result[section]) result[section] = [];
  }

  return result;
};

// ─── API Route Handler ──────────────────────────────────────────────────────

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

  let pdfBuffer: ArrayBuffer;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }
    pdfBuffer = await file.arrayBuffer();
  } else {
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
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "서버 설정 오류입니다." },
        { status: 500 }
      );
    }

    const { data: fileData, error: dlError } = await admin.storage
      .from("record-uploads")
      .download(storagePaths[0].path);

    if (dlError || !fileData) {
      return NextResponse.json(
        { error: `파일 다운로드 실패: ${dlError?.message ?? "unknown"}` },
        { status: 500 }
      );
    }
    pdfBuffer = await fileData.arrayBuffer();
  }

  try {
    let parsed: Record<string, unknown[]>;

    if (IS_VERCEL) {
      // Vercel: 외부 Python API에 PDF 전송
      const workerRes = await fetch(PDF_PARSER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: Buffer.from(pdfBuffer),
      });

      if (!workerRes.ok) {
        const errorData = await workerRes.json().catch(() => null);
        const errorMsg =
          (errorData as { error?: string } | null)?.error ??
          "PDF 파싱에 실패했습니다.";
        throw new Error(errorMsg);
      }

      parsed = (await workerRes.json()) as Record<string, unknown[]>;
    } else {
      // 로컬: python3 직접 실행
      const tmpPath = join(tmpdir(), `parse-${crypto.randomUUID()}.pdf`);
      try {
        await writeFile(tmpPath, Buffer.from(pdfBuffer));

        const scriptPath = join(process.cwd(), "scripts", "parse-pdf.py");
        const { stdout, stderr } = await execFileAsync(
          "python3",
          [scriptPath, tmpPath],
          { maxBuffer: 50 * 1024 * 1024 }
        );

        if (stderr) {
          console.warn("[parse-pdf] Python stderr:", stderr);
        }

        if (!stdout.trim()) {
          throw new Error("Python 파서가 빈 결과를 반환했습니다.");
        }

        parsed = JSON.parse(stdout);
      } finally {
        await unlink(tmpPath).catch(() => {});
      }
    }

    const result = enrichResult(parsed);

    console.info(
      `[parse-pdf] Results: attendance=${result.attendance?.length ?? 0}, ` +
        `awards=${result.awards?.length ?? 0}, ` +
        `general=${result.generalSubjects?.length ?? 0}, ` +
        `career=${result.careerSubjects?.length ?? 0}, ` +
        `artsPhys=${result.artsPhysicalSubjects?.length ?? 0}, ` +
        `evaluations=${result.subjectEvaluations?.length ?? 0}, ` +
        `reading=${result.readingActivities?.length ?? 0}, ` +
        `behavioral=${result.behavioralAssessments?.length ?? 0}`
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[parse-pdf] Error:", err);
    const message =
      err instanceof Error
        ? err.message
        : "생기부 PDF 파싱에 실패했습니다. 다시 시도해주세요.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
