import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const POST = async (request: NextRequest) => {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const code = (body.code ?? "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json(
      { success: false, message: "코드를 입력해주세요." },
      { status: 400 }
    );
  }

  // RPC로 원자적 처리 (트랜잭션)
  const { data, error } = await adminClient.rpc("apply_referral_code", {
    p_user_id: user.id,
    p_code: code,
  });

  if (error) {
    return NextResponse.json(
      { success: false, message: "코드 적용에 실패했습니다." },
      { status: 500 }
    );
  }

  const result = data as {
    success: boolean;
    message?: string;
    code?: string;
    coupon?: { id: string; discountAmount: number; expiresAt: string };
  };

  if (!result.success) {
    return NextResponse.json({
      success: false,
      message: result.message,
      code: result.code,
    });
  }

  return NextResponse.json({
    success: true,
    coupon: result.coupon,
  });
};
