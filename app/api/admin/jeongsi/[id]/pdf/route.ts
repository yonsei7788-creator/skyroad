import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { renderUrlToPdf } from "@/libs/pdf/render-url-pdf";
import { createClient } from "@/libs/supabase/server";

import { verifyAdmin } from "../../../reports/helpers";
import { summarizeInput } from "../../helpers";

export const maxDuration = 300;

const FILE_NAME_UNSAFE = /[\\/:*?"<>|]/g;

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
};

/**
 * 정시 리포트 PDF 추출 (어드민).
 *
 * POST /api/admin/jeongsi/:id/pdf → application/pdf
 *
 * Puppeteer 가 /jeongsi/:id?_token=… 를 열어 DB 에 저장된 내용으로
 * 렌더링한다. 저장하지 않은 수정 내용은 PDF 에 들어가지 않는다.
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = await createClient();

  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const pdfToken = process.env.PDF_SECRET_TOKEN;
  if (!pdfToken) {
    return NextResponse.json(
      { error: "PDF 생성 설정(PDF_SECRET_TOKEN)이 없습니다." },
      { status: 500 }
    );
  }

  const { data: row, error } = await supabase
    .from("jeongsi_reports")
    .select("input, content, ai_status, created_at")
    .eq("id", id)
    .maybeSingle<{
      input: unknown;
      content: unknown;
      ai_status: string;
      created_at: string;
    }>();

  if (error) {
    console.error(`[admin:jeongsi:${id}] PDF 조회 실패:`, error.message);
    return NextResponse.json(
      { error: "정시 리포트를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: "정시 리포트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (row.ai_status !== "completed" || !row.content) {
    return NextResponse.json(
      { error: "생성이 끝난 리포트만 PDF로 추출할 수 있습니다." },
      { status: 409 }
    );
  }

  const reportUrl = `${request.nextUrl.origin}/jeongsi/${id}?_token=${encodeURIComponent(pdfToken)}`;

  try {
    const pdf = await renderUrlToPdf(reportUrl);
    const { target } = summarizeInput(row.input);
    const fileName =
      `정시리포트_${target}_${formatDate(row.created_at)}.pdf`.replace(
        FILE_NAME_UNSAFE,
        "_"
      );

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "X-File-Name": encodeURIComponent(fileName),
      },
    });
  } catch (err) {
    console.error(`[admin:jeongsi:${id}] PDF 생성 실패:`, err);
    const message =
      err instanceof Error ? err.message : "PDF 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
