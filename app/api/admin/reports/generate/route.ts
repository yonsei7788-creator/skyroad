import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { verifyAdmin } from "../helpers";
import type { ReportPlan } from "@/libs/report/types";

export const dynamic = "force-dynamic";

interface GenerateBody {
  userId?: string;
  recordId?: string;
  plan: ReportPlan;
  adminOnly?: boolean;
}

const VALID_PLANS: ReportPlan[] = ["lite", "standard", "premium"];

/**
 * 어드민 전용 리포트 생성 — 결제 없이 주문+리포트 레코드를 생성한다.
 * 실제 파이프라인 실행은 generating 페이지가 /api/reports/run-pipeline을 호출하여 수행.
 *
 * 요청 방식:
 * 1. { userId, plan } — 유저의 최신 생기부 기반 (기존 방식)
 * 2. { recordId, plan, adminOnly? } — 특정 생기부 기반 (어드민 생기부 관리에서 호출)
 */
export const POST = async (request: NextRequest) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  let body: GenerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { plan, adminOnly = false } = body;
  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "유효한 plan이 필요합니다." },
      { status: 400 }
    );
  }

  if (!body.userId && !body.recordId) {
    return NextResponse.json(
      { error: "userId 또는 recordId가 필요합니다." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const dbClient = adminClient ?? supabase;

  // 1. 생기부 레코드 + 유저 확인
  let recordId: string;
  let userId: string;

  if (body.recordId) {
    // recordId 기반: 레코드에서 user_id를 조회
    const { data: record, error: recordError } = await dbClient
      .from("records")
      .select("id, user_id")
      .eq("id", body.recordId)
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "해당 생기부를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    recordId = record.id;
    userId = record.user_id;
  } else {
    // userId 기반: 최신 레코드 조회 (기존 방식)
    userId = body.userId!;
    const { data: record, error: recordError } = await dbClient
      .from("records")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recordError || !record) {
      return NextResponse.json(
        { error: "해당 유저의 생기부가 등록되지 않았습니다." },
        { status: 404 }
      );
    }
    recordId = record.id;
  }

  // 2. 플랜 조회
  const { data: planRow, error: planError } = await dbClient
    .from("plans")
    .select("id, name, price")
    .eq("name", plan)
    .eq("is_active", true)
    .single();

  if (planError || !planRow) {
    return NextResponse.json(
      { error: "플랜 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 3. 주문 생성 (결제 없이 바로 paid 상태)
  const { data: order, error: orderError } = await dbClient
    .from("orders")
    .insert({
      user_id: userId,
      record_id: recordId,
      plan_id: planRow.id,
      status: "paid",
      amount: 0,
      is_admin_only: adminOnly,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("어드민 주문 생성 오류:", orderError);
    return NextResponse.json(
      { error: "주문 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  // 4. 리포트 레코드 생성 (pending 상태 — run-pipeline이 processing으로 전환)
  const { data: targetUni } = await dbClient
    .from("target_universities")
    .select("id")
    .eq("user_id", userId)
    .order("priority", { ascending: true })
    .limit(1)
    .single();

  const { data: report, error: reportError } = await dbClient
    .from("reports")
    .insert({
      order_id: order.id,
      target_university_id: targetUni?.id ?? null,
      ai_status: "pending",
    })
    .select("id")
    .single();

  if (reportError || !report) {
    console.error("리포트 생성 오류:", reportError);
    await dbClient.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "리포트 레코드 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    reportId: report.id,
    orderId: order.id,
    plan,
    adminOnly,
    status: "ready",
  });
};
