import { NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";
import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";
import type { JeongsiInput } from "@/libs/jeongsi/types";

export const dynamic = "force-dynamic";

interface JeongsiReportRow {
  id: string;
  user_id: string;
  input: JeongsiInput;
  content: JeongsiReportContent | null;
  ai_status: string;
  ai_progress: number | null;
  ai_error: string | null;
  ai_model_version: string | null;
  created_at: string;
  updated_at: string;
}

/* ============================================
   GET /api/jeongsi/[id]
   정시 리포트 단건 조회. 접근 제어는 RLS(본인 또는 어드민)가 담당한다.
   ============================================ */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("jeongsi_reports")
    .select(
      "id, user_id, input, content, ai_status, ai_progress, ai_error, ai_model_version, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle<JeongsiReportRow>();

  if (error) {
    console.error(`[jeongsi:${id}] 조회 실패:`, error.message);
    return NextResponse.json(
      { error: "리포트를 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  // RLS 로 걸러진 경우도 여기로 떨어진다 — 존재 여부를 노출하지 않는다
  if (!data) {
    return NextResponse.json(
      { error: "리포트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: data.id,
    input: data.input,
    content: data.content,
    status: data.ai_status,
    progress: data.ai_progress ?? 0,
    error: data.ai_error,
    modelVersion: data.ai_model_version,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
};
