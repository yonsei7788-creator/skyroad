import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/libs/supabase/admin";
import { createClient } from "@/libs/supabase/server";
import { verifyAdmin } from "@/app/api/admin/reports/helpers";

/**
 * 어드민이 특정 유저에게 추천인 코드 쿠폰을 지급한다.
 * 기존 apply_referral_code RPC를 그대로 활용.
 */
export const POST = async (request: NextRequest) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "서버 설정 오류입니다." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { userId, referralCode } = body as {
    userId?: string;
    referralCode?: string;
  };

  if (!userId || !referralCode) {
    return NextResponse.json(
      { error: "유저와 추천인 코드를 선택해주세요." },
      { status: 400 }
    );
  }

  // RPC로 원자적 처리
  const { data, error } = await adminClient.rpc("apply_referral_code", {
    p_user_id: userId,
    p_code: referralCode.trim().toUpperCase(),
  });

  if (error) {
    return NextResponse.json(
      { error: "쿠폰 지급에 실패했습니다." },
      { status: 500 }
    );
  }

  const result = data as {
    success: boolean;
    message?: string;
    coupon?: { id: string; discountAmount: number; expiresAt: string };
  };

  if (!result.success) {
    return NextResponse.json(
      { error: result.message ?? "쿠폰 지급에 실패했습니다." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { data: result.coupon, message: "쿠폰이 성공적으로 지급되었습니다." },
    { status: 201 }
  );
};

/**
 * 추천인 코드 미사용 유저 목록을 반환한다.
 */
export const GET = async () => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "서버 설정 오류입니다." },
      { status: 500 }
    );
  }

  // referral_usages에 있는 user_id 목록
  const { data: usages } = await adminClient
    .from("referral_usages")
    .select("user_id");

  const usedUserIds = new Set((usages ?? []).map((u) => u.user_id));

  // 전체 유저 조회
  const { data: userData, error: userError } =
    await adminClient.auth.admin.listUsers({ perPage: 1000 });

  if (userError) {
    return NextResponse.json(
      { error: "유저 목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const eligibleUserIds = userData.users
    .filter((u) => u.email && !usedUserIds.has(u.id))
    .map((u) => ({ id: u.id, email: u.email! }));

  // profiles에서 이름 조회
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, name")
    .in(
      "id",
      eligibleUserIds.map((u) => u.id)
    );

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.name as string | null])
  );

  const eligibleUsers = eligibleUserIds.map((u) => ({
    id: u.id,
    email: u.email,
    name: profileMap.get(u.id) ?? null,
  }));

  return NextResponse.json({ data: eligibleUsers });
};
