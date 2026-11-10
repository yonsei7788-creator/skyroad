import { NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

interface JeongsiStatusRow {
  id: string;
  ai_status: string;
  ai_progress: number | null;
  ai_error: string | null;
}

/* ============================================
   GET /api/jeongsi/[id]/status
   생성 진행 상태 폴링. SSE 가 terminal 이벤트 없이 끊겼을 때
   /jeongsi/generating 이 최종 상태를 확정하는 데 쓴다.
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
    .select("id, ai_status, ai_progress, ai_error")
    .eq("id", id)
    .maybeSingle<JeongsiStatusRow>();

  if (error) {
    console.error(`[jeongsi:${id}] 상태 조회 실패:`, error.message);
    return NextResponse.json(
      { error: "상태를 확인하지 못했습니다." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "리포트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: data.ai_status,
    progress: data.ai_progress ?? 0,
    error: data.ai_error,
  });
};
