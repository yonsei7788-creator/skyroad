import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type {
  AdminJeongsiReportDetail,
  JeongsiReportStatus,
} from "@/app/admin/types";
import { createClient } from "@/libs/supabase/server";

import { verifyAdmin } from "../../reports/helpers";
import { summarizeInput } from "../helpers";

interface JeongsiReportDetailRow {
  id: string;
  user_id: string;
  input: unknown;
  content: unknown;
  ai_status: JeongsiReportStatus;
  ai_progress: number;
  ai_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 정시 리포트 상세 (어드민 수정 화면).
 *
 * GET /api/admin/jeongsi/:id
 */
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = await createClient();

  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { data: row, error } = await supabase
    .from("jeongsi_reports")
    .select(
      "id, user_id, input, content, ai_status, ai_progress, ai_error, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle<JeongsiReportDetailRow>();

  if (error) {
    console.error(`[admin:jeongsi:${id}] 상세 조회 실패:`, error.message);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", row.user_id)
    .maybeSingle<{ name: string | null }>();

  const detail: AdminJeongsiReportDetail = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: profile?.name ?? null,
    ...summarizeInput(row.input),
    status: row.ai_status,
    progress: row.ai_progress,
    error: row.ai_error,
    content: row.content,
  };

  return NextResponse.json(detail);
};
