import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { verifyAdmin } from "@/app/api/admin/reports/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/* ============================================
   GET  /api/admin/referral-codes/[id]
   ============================================ */
export const GET = async (_request: NextRequest, { params }: RouteParams) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;

  const { data, error } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "코드를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
};

/* ============================================
   PATCH  /api/admin/referral-codes/[id]
   ============================================ */
export const PATCH = async (request: NextRequest, { params }: RouteParams) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (body.partnerName !== undefined)
    updates.partner_name = body.partnerName.trim();
  if (body.partnerType !== undefined) updates.partner_type = body.partnerType;
  if (body.maxUsages !== undefined) updates.max_usages = body.maxUsages;
  if (body.discountAmount !== undefined)
    updates.discount_amount = body.discountAmount;
  if (body.validFrom !== undefined) updates.valid_from = body.validFrom;
  if (body.validUntil !== undefined)
    updates.valid_until = body.validUntil || null;
  if (body.memo !== undefined) updates.memo = body.memo?.trim() || null;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "수정할 항목이 없습니다." },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("referral_codes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "코드 수정에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
};

/* ============================================
   DELETE  /api/admin/referral-codes/[id]
   ============================================ */
export const DELETE = async (
  _request: NextRequest,
  { params }: RouteParams
) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabase.from("referral_codes").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "코드 삭제에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
};
