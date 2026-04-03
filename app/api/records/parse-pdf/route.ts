import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { correctSubjectName } from "@/libs/report/constants/subject-name-corrections";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

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

    const uploadedPath = storagePaths[0].path;

    const { data: fileData, error: dlError } = await admin.storage
      .from("record-uploads")
      .download(uploadedPath);

    if (dlError || !fileData) {
      await admin.storage.from("record-uploads").remove([uploadedPath]);
      return NextResponse.json(
        { error: `파일 다운로드 실패: ${dlError?.message ?? "unknown"}` },
        { status: 500 }
      );
    }
    pdfBuffer = await fileData.arrayBuffer();

    // 다운로드 완료 후 즉시 스토리지에서 삭제
    await admin.storage.from("record-uploads").remove([uploadedPath]);
  }

  try {
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

    const parsed = (await workerRes.json()) as Record<string, unknown[]>;

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
    const raw = err instanceof Error ? err.message : String(err);

    // Python ValueError 메시지 추출 (사용자 친화적 메시지)
    const valueErrorMatch = raw.match(/ValueError:\s*(.+?)$/m);
    const message = valueErrorMatch
      ? valueErrorMatch[1].trim()
      : raw || "생기부 PDF 파싱에 실패했습니다. 다시 시도해주세요.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
