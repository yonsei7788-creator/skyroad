import { NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const GET = async () => {
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

  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  const { data: coupons } = await dbClient
    .from("user_coupons")
    .select("id, discount_amount, expires_at, source, is_used")
    .eq("user_id", user.id)
    .eq("is_used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return NextResponse.json({
    coupons: (coupons ?? []).map((c) => ({
      id: c.id,
      discountAmount: c.discount_amount,
      expiresAt: c.expires_at,
      source: c.source,
    })),
  });
};
