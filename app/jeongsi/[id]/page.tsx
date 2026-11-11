import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";
import { createAdminClient } from "@/libs/supabase/admin";
import { createClient } from "@/libs/supabase/server";

import { JeongsiReport } from "../_report";

import styles from "./page.module.css";

interface JeongsiReportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface JeongsiReportRow {
  id: string;
  content: JeongsiReportContent | null;
  ai_status: string;
  ai_error: string | null;
}

interface StatusScreenProps {
  title: string;
  description: string;
  errorMessage?: string | null;
}

const StatusScreen = ({
  title,
  description,
  errorMessage,
}: StatusScreenProps) => (
  <div className={styles.statusWrapper}>
    <div className={styles.statusCard}>
      <h1 className={styles.statusTitle}>{title}</h1>
      <p className={styles.statusDesc}>{description}</p>
      {errorMessage && <p className={styles.statusError}>{errorMessage}</p>}
      <Link href="/admin/jeongsi" className={styles.statusAction}>
        정시 분석 목록으로
      </Link>
    </div>
  </div>
);

/**
 * 서버사이드 PDF 생성(Puppeteer)이 로그인 세션 없이 여는 요청.
 * _token 이 PDF_SECRET_TOKEN 과 같을 때만 service role 로 조회해 렌더링한다.
 */
const renderForInternalPdf = async (id: string) => {
  const adminClient = createAdminClient();
  if (!adminClient) {
    notFound();
  }

  const { data: report, error } = await adminClient
    .from("jeongsi_reports")
    .select("content, ai_status")
    .eq("id", id)
    .maybeSingle<{ content: JeongsiReportContent | null; ai_status: string }>();

  if (error || !report?.content || report.ai_status !== "completed") {
    notFound();
  }

  return <JeongsiReport data={report.content} />;
};

const JeongsiReportPage = async ({
  params,
  searchParams,
}: JeongsiReportPageProps) => {
  const { id } = await params;
  const { _token } = await searchParams;

  const pdfSecret = process.env.PDF_SECRET_TOKEN;
  if (typeof _token === "string" && !!pdfSecret && _token === pdfSecret) {
    return renderForInternalPdf(id);
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 소유권·어드민 판정은 jeongsi_reports 의 RLS 정책이 담당한다.
  // 권한이 없으면 행 자체가 보이지 않아 null 로 떨어진다.
  const { data: report, error: queryError } = await supabase
    .from("jeongsi_reports")
    .select("id, content, ai_status, ai_error")
    .eq("id", id)
    .maybeSingle<JeongsiReportRow>();

  if (queryError) {
    console.error(`[jeongsi:${id}] 리포트 조회 실패:`, queryError.message);
    notFound();
  }

  if (!report) {
    notFound();
  }

  if (report.ai_status === "failed") {
    return (
      <StatusScreen
        title="리포트 생성에 실패했습니다"
        description="성적을 다시 입력해 분석을 시도해 주세요."
        errorMessage={report.ai_error}
      />
    );
  }

  if (report.ai_status !== "completed" || !report.content) {
    return (
      <StatusScreen
        title="리포트를 생성하고 있습니다"
        description="분석이 끝나면 이 페이지에서 결과를 볼 수 있습니다. 잠시 후 새로고침해 주세요."
      />
    );
  }

  const { content } = report;

  return <JeongsiReport data={content} />;
};

export default JeongsiReportPage;
