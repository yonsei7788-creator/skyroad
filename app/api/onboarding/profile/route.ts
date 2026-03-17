import { NextRequest, NextResponse } from "next/server";

import { SCHOOL_TYPES } from "@/app/onboarding/_components/types";
import { createClient } from "@/libs/supabase/server";

interface ProfileBody {
  name: string;
  phone: string;
  highSchoolName: string;
  highSchoolType: string;
  highSchoolRegion?: string;
  grade: string;
  admissionYear: number | null;
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

  let body: ProfileBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const {
    name,
    phone,
    highSchoolName,
    highSchoolType,
    highSchoolRegion,
    grade,
    admissionYear,
  } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "이름은 필수 입력 항목입니다.",
        },
      },
      { status: 400 }
    );
  }

  if (!phone || !/^010-\d{4}-\d{4}$/.test(phone)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "전화번호는 010-XXXX-XXXX 형식으로 입력해주세요.",
        },
      },
      { status: 400 }
    );
  }

  if (!highSchoolName || !highSchoolName.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "고등학교를 선택해주세요.",
        },
      },
      { status: 400 }
    );
  }

  if (!grade) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "학년을 선택해주세요.",
        },
      },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name: name.trim(),
      phone,
      high_school_name: highSchoolName.trim(),
      high_school_type:
        highSchoolType &&
        SCHOOL_TYPES.includes(highSchoolType as (typeof SCHOOL_TYPES)[number])
          ? highSchoolType
          : null,
      high_school_region: highSchoolRegion?.trim() || null,
      grade,
      admission_year: admissionYear,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "프로필 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
};
