import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

import { verifyAdmin } from "../../helpers";

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = await createClient();

  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  // Mock ID bypass — no DB write needed
  if (id.startsWith("mock-")) {
    return NextResponse.json({ success: true, mock: true });
  }

  // Parse body
  let body: { content: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.content || typeof body.content !== "object") {
    return NextResponse.json(
      { error: "content 필드가 필요합니다." },
      { status: 400 }
    );
  }

  // Use admin client for RLS bypass
  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  // Update report content
  const { error: updateError } = await dbClient
    .from("reports")
    .update({ content: body.content })
    .eq("id", id);

  if (updateError) {
    console.error("Report content update error:", updateError);
    return NextResponse.json(
      { error: "리포트 내용 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
};
