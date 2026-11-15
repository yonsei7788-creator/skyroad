import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  JeongsiEditError,
  mergeEditableFields,
} from "@/libs/jeongsi/admin-edit";
import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";
import { createClient } from "@/libs/supabase/server";

import { verifyAdmin } from "../../../reports/helpers";

/**
 * 정시 리포트 문장 수정 저장 (어드민).
 *
 * PATCH /api/admin/jeongsi/:id/content  body: { content }
 *
 * 받은 content 를 그대로 덮어쓰지 않는다. DB 의 content 를 기준으로
 * 수정 가능한 문장 필드만 옮겨 담아 저장한다 (libs/jeongsi/admin-edit.ts).
 * 숫자는 요청에 바뀌어 와도 저장되지 않는다.
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = await createClient();

  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  let body: { content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("jeongsi_reports")
    .select("content, ai_status")
    .eq("id", id)
    .maybeSingle<{ content: JeongsiReportContent | null; ai_status: string }>();

  if (fetchError) {
    console.error(`[admin:jeongsi:${id}] 조회 실패:`, fetchError.message);
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
      { error: "생성이 끝난 리포트만 수정할 수 있습니다." },
      { status: 409 }
    );
  }

  let merged: JeongsiReportContent;
  try {
    merged = mergeEditableFields(row.content, body.content);
  } catch (err) {
    if (err instanceof JeongsiEditError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const { error: updateError } = await supabase
    .from("jeongsi_reports")
    .update({ content: merged })
    .eq("id", id);

  if (updateError) {
    console.error(`[admin:jeongsi:${id}] 저장 실패:`, updateError.message);
    return NextResponse.json(
      { error: "정시 리포트 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ content: merged });
};
