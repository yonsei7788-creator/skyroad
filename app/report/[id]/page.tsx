import { notFound, redirect } from "next/navigation";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import type { ReportContent } from "@/libs/report/types";

import { ReportRenderer } from "../_templates";

interface ReportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const ReportPage = async ({ params, searchParams }: ReportPageProps) => {
  const { id } = await params;
  const { _token } = await searchParams;

  // PDF 내부 토큰 인증: 서버사이드 PDF 생성 시 사용
  const pdfSecret = process.env.PDF_SECRET_TOKEN;
  const isInternalPdf =
    typeof _token === "string" && !!pdfSecret && _token === pdfSecret;

  let content: ReportContent;

  if (isInternalPdf) {
    // 토큰 인증 — service role로 직접 조회 (쿠키 불필요)
    const adminClient = createAdminClient();
    if (!adminClient) {
      notFound();
    }

    const { data: report, error } = await adminClient
      .from("reports")
      .select("id, content")
      .eq("id", id)
      .single();

    if (error || !report?.content) {
      notFound();
    }

    content = report.content as unknown as ReportContent;
  } else {
    // 일반 사용자 인증
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/login");
    }

    const { data: report, error: queryError } = await supabase
      .from("reports")
      .select(
        `
        id,
        content,
        ai_status,
        delivered_at,
        orders!inner (
          user_id
        )
      `
      )
      .eq("id", id)
      .single();

    if (queryError || !report) {
      notFound();
    }

    // 소유자 또는 관리자만 열람 가능
    const orders = report.orders as unknown as { user_id: string };
    if (orders.user_id !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        notFound();
      }
    }

    if (!report.content) {
      redirect(`/report/${id}/generating`);
    }

    content = report.content as unknown as ReportContent;
  }

  return <ReportRenderer data={content} />;
};

export default ReportPage;
