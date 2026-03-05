import { NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { data: report, error } = await supabase
    .from("reports")
    .select(
      "id, ai_status, ai_progress, ai_current_section, ai_error, order_id"
    )
    .eq("id", id)
    .single();

  if (error || !report) {
    return NextResponse.json(
      { error: "리포트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: report.ai_status,
    progress: report.ai_progress ?? 0,
    currentSection: report.ai_current_section,
    error: report.ai_error,
  });
};
