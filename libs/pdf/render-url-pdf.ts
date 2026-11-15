import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

/**
 * 서버에서 리포트 페이지 URL 을 A4 PDF 로 렌더링한다 (Puppeteer).
 *
 * 리포트 화면의 [data-page] 요소 하나가 PDF 한 장이 된다.
 * 본문 페이지는 폰트 로드 후 브라우저에서 측정해 나뉘므로(AutoPaginatedSection),
 * [data-page] 개수가 한동안 변하지 않을 때까지 기다린 뒤 출력한다.
 */

const VIEWPORT = { width: 1200, height: 900 };
const NAVIGATION_TIMEOUT_MS = 30_000;
const FIRST_PAGE_TIMEOUT_MS = 15_000;

/** 페이지 수가 이 시간 동안 그대로면 분할이 끝난 것으로 본다 */
const STABLE_WINDOW_MS = 1_200;
const STABLE_POLL_MS = 200;
const STABLE_TIMEOUT_MS = 20_000;

const LOCAL_CHROME_PATH: Record<string, string> = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};

/**
 * 리포트 CSS 의 @media print 가 height:auto, padding:0 으로 리셋해
 * 고정 레이아웃이 깨지므로, 화면용 페이지 크기·여백을 인쇄에서도 유지한다.
 */
const PRINT_CSS = `
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
    [data-page]:last-child {
      page-break-after: auto !important;
    }
  }
`;

export class PdfRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfRenderError";
  }
}

export const renderUrlToPdf = async (url: string): Promise<Uint8Array> => {
  const isProduction = process.env.NODE_ENV === "production";

  const browser = await puppeteerCore.launch({
    args: isProduction
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: isProduction
      ? await chromium.executablePath()
      : (LOCAL_CHROME_PATH[process.platform] ?? "/usr/bin/google-chrome"),
    headless: isProduction ? "shell" : true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    await page.waitForSelector("[data-page]", {
      timeout: FIRST_PAGE_TIMEOUT_MS,
    });
    await page.evaluate(() => document.fonts.ready);

    const pageCount = await page.evaluate(
      async (windowMs: number, pollMs: number, timeoutMs: number) => {
        const count = () => document.querySelectorAll("[data-page]").length;
        const sleep = (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms));

        const startedAt = Date.now();
        let last = count();
        let stableSince = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
          await sleep(pollMs);
          const current = count();
          if (current !== last) {
            last = current;
            stableSince = Date.now();
          } else if (Date.now() - stableSince >= windowMs) {
            break;
          }
        }
        return last;
      },
      STABLE_WINDOW_MS,
      STABLE_POLL_MS,
      STABLE_TIMEOUT_MS
    );

    if (pageCount === 0) {
      throw new PdfRenderError("렌더링된 페이지를 찾을 수 없습니다.");
    }

    await page.addStyleTag({ content: PRINT_CSS });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
};
