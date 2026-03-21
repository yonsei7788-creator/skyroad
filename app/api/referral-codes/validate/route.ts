import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const POST = async (request: NextRequest) => {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      { valid: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json();
  const code = (body.code ?? "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({
      valid: false,
      message: "코드를 입력해주세요.",
    });
  }

  // 1인 1회 체크 (로그인 상태일 때만)
  if (user) {
    const { data: existing } = await adminClient
      .from("referral_usages")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        valid: false,
        message: "이미 추천인 코드를 사용하셨습니다.",
        code: "ALREADY_USED",
      });
    }
  }

  // 코드 조회 (admin client — RLS 우회)
  const { data: referral } = await adminClient
    .from("referral_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!referral) {
    return NextResponse.json({
      valid: false,
      message: "유효하지 않은 추천인 코드입니다.",
      code: "INVALID_CODE",
    });
  }

  if (!referral.is_active) {
    return NextResponse.json({
      valid: false,
      message: "유효하지 않은 추천인 코드입니다.",
      code: "CODE_INACTIVE",
    });
  }

  if (new Date(referral.valid_from) > new Date()) {
    return NextResponse.json({
      valid: false,
      message: "아직 사용할 수 없는 코드입니다.",
      code: "CODE_NOT_YET_ACTIVE",
    });
  }

  if (referral.valid_until && new Date(referral.valid_until) < new Date()) {
    return NextResponse.json({
      valid: false,
      message: "유효기간이 만료된 코드입니다.",
      code: "CODE_EXPIRED",
    });
  }

  if (
    referral.max_usages > 0 &&
    referral.current_usages >= referral.max_usages
  ) {
    return NextResponse.json({
      valid: false,
      message: "사용 가능 횟수가 초과된 코드입니다.",
      code: "CODE_EXHAUSTED",
    });
  }

  return NextResponse.json({
    valid: true,
    discountAmount: referral.discount_amount,
  });
};
