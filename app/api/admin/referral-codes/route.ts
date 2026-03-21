import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { verifyAdmin } from "@/app/api/admin/reports/helpers";

/* ============================================
   GET  /api/admin/referral-codes
   ============================================ */
export const GET = async (request: NextRequest) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? 20))
  );
  const search = searchParams.get("search")?.trim() ?? "";
  const partnerType = searchParams.get("partnerType") ?? "";
  const status = searchParams.get("status") ?? "";

  let query = supabase.from("referral_codes").select("*", { count: "exact" });

  if (search) {
    // PostgREST 필터 인젝션 및 LIKE 와일드카드 이스케이프
    const sanitized = search
      .replace(/[\\%_]/g, (c) => `\\${c}`)
      .replace(/[.,()]/g, "");
    query = query.or(
      `code.ilike.%${sanitized}%,partner_name.ilike.%${sanitized}%`
    );
  }

  if (partnerType) {
    query = query.eq("partner_type", partnerType);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  query = query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "코드 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }

  // 통계
  const { data: statsData } = await supabase
    .from("referral_codes")
    .select("is_active, current_usages");

  const { data: usageStats } = await supabase
    .from("referral_usages")
    .select("paid_amount");

  const stats = {
    total: statsData?.length ?? 0,
    active: statsData?.filter((c) => c.is_active).length ?? 0,
    totalUsages:
      statsData?.reduce((s, c) => s + (c.current_usages ?? 0), 0) ?? 0,
    totalPaidAmount:
      usageStats?.reduce((s, u) => s + (u.paid_amount ?? 0), 0) ?? 0,
  };

  // 코드별 총 결제액 집계
  const codeIds = (data ?? []).map((c) => c.id);
  const codeUsageMap: Record<string, number> = {};

  if (codeIds.length > 0) {
    const { data: codeUsages } = await supabase
      .from("referral_usages")
      .select("referral_code_id, paid_amount")
      .in("referral_code_id", codeIds);

    if (codeUsages) {
      for (const u of codeUsages) {
        codeUsageMap[u.referral_code_id] =
          (codeUsageMap[u.referral_code_id] ?? 0) + (u.paid_amount ?? 0);
      }
    }
  }

  const enrichedData = (data ?? []).map((c) => ({
    ...c,
    total_paid_amount: codeUsageMap[c.id] ?? 0,
  }));

  const total = count ?? 0;

  return NextResponse.json({
    data: enrichedData,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats,
  });
};

/* ============================================
   POST  /api/admin/referral-codes
   ============================================ */
export const POST = async (request: NextRequest) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const {
    code,
    partnerName,
    partnerType = "influencer",
    maxUsages = 0,
    discountAmount = 5000,
    validFrom,
    validUntil,
    memo,
  } = body;

  if (!code || !partnerName || !validFrom) {
    return NextResponse.json(
      { error: "필수 항목을 입력해주세요." },
      { status: 400 }
    );
  }

  const upperCode = code.toUpperCase().trim();

  if (!/^[A-Z0-9]{4,20}$/.test(upperCode)) {
    return NextResponse.json(
      { error: "코드는 영문 대문자와 숫자 4~20자리만 가능합니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("referral_codes")
    .insert({
      code: upperCode,
      partner_name: partnerName.trim(),
      partner_type: partnerType,
      max_usages: maxUsages,
      discount_amount: discountAmount,
      valid_from: validFrom,
      valid_until: validUntil || null,
      memo: memo?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 존재하는 코드입니다.", code: "DUPLICATE_CODE" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "코드 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
};
