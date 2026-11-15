import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";

import { createClient } from "@/libs/supabase/server";
import { verifyAdmin } from "../../helpers";

export const maxDuration = 300;

/**
 * 서버사이드 PDF 생성.
 *
 * Puppeteer로 /report/[id] 를 1200px 데스크톱 viewport에서 렌더링 후
 * 네이티브 브라우저 PDF 출력. 모바일/PC 완전 동일한 결과.
 *
 * 응답: PDF Buffer (application/pdf) 또는 Supabase Storage 경로 (JSON)
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: reportId } = await params;
  const supabase = await createClient();

  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  // 리포트 + 주문/플랜/유저 정보 조회
  const { data: report, error: fetchError } = await supabase
    .from("reports")
    .select(
      `
      id,
      content,
      orders!inner (
        user_id,
        plans!inner (
          name,
          display_name
        )
      )
    `
    )
    .eq("id", reportId)
    .single();

  if (fetchError || !report) {
    return NextResponse.json(
      { error: "리포트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (!report.content) {
    return NextResponse.json(
      { error: "리포트 콘텐츠가 없습니다." },
      { status: 400 }
    );
  }

  // 유저명, 플랜명 조회
  const orders = report.orders as unknown as Record<string, unknown>;
  const plan = orders.plans as unknown as Record<string, unknown>;
  const targetUserId = orders.user_id as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", targetUserId)
    .single();

  const userName = (profile?.name as string) || "고객";
  const planName =
    (plan.display_name as string) || (plan.name as string) || "리포트";

  // 앱의 base URL 결정
  const { origin } = request.nextUrl;
  const pdfToken = process.env.PDF_SECRET_TOKEN ?? "";
  const reportUrl = `${origin}/report/${reportId}?_token=${encodeURIComponent(pdfToken)}`;

  let browser;
  try {
    const isProduction = process.env.NODE_ENV === "production";

    const localChromePath =
      process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome";

    browser = await puppeteerCore.launch({
      args: isProduction
        ? chromium.args
        : ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: isProduction
        ? await chromium.executablePath()
        : localChromePath,
      headless: isProduction ? "shell" : true,
    });

    const page = await browser.newPage();

    // 데스크톱 viewport (PDF 기준)
    await page.setViewport({ width: 1200, height: 900 });

    await page.goto(reportUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // [data-page] 요소가 렌더링될 때까지 대기
    await page.waitForSelector("[data-page]", { timeout: 15000 });

    // 폰트 로드 완료 대기
    await page.evaluate(() => document.fonts.ready);

    // 추가 렌더링 안정화 대기
    await page.evaluate(() => new Promise<void>((r) => setTimeout(r, 500)));

    // [data-page] 요소 수 확인
    const pageCount = await page.evaluate(
      () => document.querySelectorAll("[data-page]").length
    );

    if (pageCount === 0) {
      return NextResponse.json(
        { error: "렌더링된 페이지를 찾을 수 없습니다." },
        { status: 500 }
      );
    }

    // 리포트 CSS의 @media print가 height:auto, padding:0으로 리셋하여
    // 커버 페이지 등의 고정 레이아웃이 깨짐.
    // → screen 스타일의 페이지 크기/패딩을 print에서도 유지하도록 보정.
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = `
        @page { size: A4 portrait; margin: 0; }
        @media print {
          [data-page] {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-width: none !important;
            padding: 20mm 18mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          [data-page][data-cover] {
            padding: 48mm 36mm 36mm !important;
          }
          [data-page]:last-child {
            page-break-after: auto !important;
          }
        }
      `;
      document.head.appendChild(style);
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    // 응답 모드 결정: upload (Storage에 저장 후 경로 반환) 또는 download (직접 반환)
    const { searchParams } = request.nextUrl;
    const mode = searchParams.get("mode") ?? "download";

    if (mode === "upload") {
      const storagePath = `reports/${reportId}/${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("report-pdfs")
        .upload(storagePath, Buffer.from(pdfBuffer), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("PDF upload error:", uploadError);
        return NextResponse.json(
          { error: "PDF 업로드에 실패했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json({ pdfStoragePath: storagePath });
    }

    // download 모드: PDF 직접 반환
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${userName}_리포트(${planName}).pdf`)}`,
      },
    });
  } catch (err) {
    console.error("Server PDF generation error:", err);
    const message =
      err instanceof Error ? err.message : "PDF 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
