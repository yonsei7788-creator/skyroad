import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

interface TargetUniversityBody {
  priority: number;
  universityName: string;
  admissionType: string;
  department: string;
  subField: string;
}

interface RequestBody {
  universities: TargetUniversityBody[];
}

export const PUT = async (request: NextRequest) => {
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

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { universities } = body;

  if (!Array.isArray(universities) || universities.length === 0) {
    return NextResponse.json(
      { error: "최소 1개의 목표 대학을 입력해주세요." },
      { status: 400 }
    );
  }

  const primary = universities.find((u) => u.priority === 1);
  if (!primary || !primary.universityName?.trim()) {
    return NextResponse.json(
      { error: "1지망 대학명은 필수입니다." },
      { status: 400 }
    );
  }

  const rows = universities.map((u) => ({
    user_id: user.id,
    priority: u.priority,
    university_name: u.universityName.trim(),
    admission_type: u.admissionType,
    department: u.department.trim(),
    sub_field: u.subField?.trim() || null,
  }));

  const submittedPriorities = rows.map((r) => r.priority);

  // Upsert submitted priorities
  const { error: upsertError } = await supabase
    .from("target_universities")
    .upsert(rows, { onConflict: "user_id,priority" });

  if (upsertError) {
    return NextResponse.json(
      { error: "목표 대학 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  // Remove priorities no longer in the submission
  const { error: cleanupError } = await supabase
    .from("target_universities")
    .delete()
    .eq("user_id", user.id)
    .not("priority", "in", `(${submittedPriorities.join(",")})`);

  if (cleanupError) {
    console.error("cleanup error (non-critical):", cleanupError);
  }

  return NextResponse.json({ success: true });
};
