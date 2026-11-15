import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { sendReportEmail } from "@/libs/email/send-report";

import { verifyAdmin } from "../../helpers";

const MOCK_DELIVER_EMAIL = "ujh9208@gmail.com";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = await createClient();

  const { userId, error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  // FormData에서 PDF Storage 경로 또는 직접 파일 수신
  const formData = await request.formData();
  const pdfStoragePath = formData.get("pdfStoragePath") as string | null;
  const pdfFile = formData.get("pdf") as File | null;
  const reviewNotes = (formData.get("reviewNotes") as string) || null;

  let pdfBuffer: Buffer | undefined;
  if (pdfStoragePath) {
    // Storage에서 PDF 다운로드
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("report-pdfs")
      .download(pdfStoragePath);
    if (!downloadError && fileData) {
      pdfBuffer = Buffer.from(await fileData.arrayBuffer());
    } else {
      console.error("PDF download from storage error:", downloadError);
    }
    // 발송 후 Storage 정리 (fire-and-forget)
    supabase.storage
      .from("report-pdfs")
      .remove([pdfStoragePath])
      .catch(() => {});
  } else if (pdfFile) {
    // 레거시 호환: 직접 파일 전송
    const arrayBuffer = await pdfFile.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuffer);
  }

  // Mock 리포트 발송 처리
  if (id.startsWith("mock-")) {
    const planName = id.replace("mock-", "");
    try {
      await sendReportEmail({
        to: MOCK_DELIVER_EMAIL,
        userName: "테스트 유저",
        planName,
        pdfBuffer,
      });
    } catch (emailError) {
      console.error("Mock email send error:", emailError);
      return NextResponse.json(
        { error: "이메일 발송에 실패했습니다." },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      mock: true,
      pdfAttached: !!pdfBuffer,
    });
  }

  // Fetch report with order info (no profiles join — FK doesn't exist)
  const { data: report, error: fetchError } = await supabase
    .from("reports")
    .select(
      `
      id,
      content,
      order_id,
      reviewed_at,
      delivered_at,
      orders!inner (
        id,
        user_id,
        plans!inner (
          name,
          display_name
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json(
      { error: "리포트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (report.content === null) {
    return NextResponse.json(
      { error: "AI가 아직 리포트를 생성하지 않았습니다." },
      { status: 400 }
    );
  }

  if (report.delivered_at) {
    return NextResponse.json(
      { error: "이미 발송된 리포트입니다." },
      { status: 409 }
    );
  }

  // If not already reviewed, do review first
  if (!report.reviewed_at) {
    const { error: reviewError } = await supabase
      .from("reports")
      .update({
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
      })
      .eq("id", id);

    if (reviewError) {
      console.error("Review update error:", reviewError);
      return NextResponse.json(
        { error: "검수 처리에 실패했습니다." },
        { status: 500 }
      );
    }
  }

  // Get user profile + email in parallel (separate queries — no FK)
  const orders = report.orders as unknown as Record<string, unknown>;
  const plan = orders.plans as unknown as Record<string, unknown>;
  const targetUserId = orders.user_id as string;

  const adminClient = createAdminClient();

  const [profileRes, emailRes] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", targetUserId).single(),
    adminClient
      ? adminClient.auth.admin
          .getUserById(targetUserId)
          .catch(() => ({ data: { user: null } }))
      : Promise.resolve({ data: { user: null } }),
  ]);

  const userName = (profileRes.data?.name as string) || "고객";
  const userEmail =
    (emailRes.data as { user: { email?: string } | null })?.user?.email || "";

  if (!userEmail) {
    return NextResponse.json(
      { error: "사용자 이메일을 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  // Send email (with PDF if available)
  const planName = (plan.display_name as string) || (plan.name as string) || "";
  let emailSent = true;
  try {
    await sendReportEmail({
      to: userEmail,
      userName,
      planName,
      pdfBuffer,
    });
  } catch (emailError) {
    console.error("Email send error:", emailError);
    emailSent = false;
  }

  // Update delivered_at
  const { error: deliverError } = await supabase
    .from("reports")
    .update({
      delivered_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (deliverError) {
    console.error("Deliver update error:", deliverError);
    return NextResponse.json(
      { error: "발송 상태 업데이트에 실패했습니다." },
      { status: 500 }
    );
  }

  // Update order status
  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", report.order_id);

  if (orderError) {
    console.error("Order status update error:", orderError);
  }

  if (!emailSent) {
    return NextResponse.json(
      {
        success: true,
        warning: "이메일 발송에 실패했습니다. 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    pdfAttached: !!pdfBuffer,
  });
};
