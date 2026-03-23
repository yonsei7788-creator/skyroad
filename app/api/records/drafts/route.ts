import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

interface DraftBody {
  method: "pdf" | "image" | "text";
  record: Record<string, unknown>;
  isReviewed?: boolean;
}

export async function GET() {
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

  const { data, error } = await supabase
    .from("record_drafts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("draft fetch error:", error);
    return NextResponse.json(
      { error: "임시 데이터 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(null);
  }

  return NextResponse.json(data);
}

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

  let body: DraftBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { method, record, isReviewed } = body;
  if (!method || !record) {
    return NextResponse.json(
      { error: "method와 record가 필요합니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("record_drafts")
    .upsert(
      {
        user_id: user.id,
        submission_type: method,
        record_data: record,
        is_reviewed: isReviewed ?? false,
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("draft upsert error:", error);
    return NextResponse.json(
      { error: "임시 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}

export async function DELETE() {
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

  const { error } = await supabase
    .from("record_drafts")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("draft delete error:", error);
    return NextResponse.json(
      { error: "임시 데이터 삭제에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
