import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * 기기별 캡처 해상도.
 * 모바일/저사양은 scale 1로 메모리 절약.
 */
const getScale = (): number => {
  if (typeof window === "undefined") return 2;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const lowMemory =
    "deviceMemory" in navigator &&
    (navigator as unknown as { deviceMemory: number }).deviceMemory < 4;
  return isMobile || lowMemory ? 1 : 2;
};

/** 캔버스 크기가 브라우저 제한을 초과하는지 확인 (대부분 ~16384px) */
const MAX_CANVAS_DIMENSION = 16384;

/** 빈 data URL 검증 (최소 JPEG 헤더 길이) */
const MIN_VALID_DATA_URL_LENGTH = 100;

/**
 * AutoPaginatedSection의 슬라이스에서 보이지 않는 DOM 노드를 물리적으로 제거.
 *
 * 구조: <div overflow:hidden height:Hpx>
 *         <div position:absolute top:-Ypx>
 *           <child1/> <child2/> ... ← 전체 콘텐츠
 *         </div>
 *       </div>
 *
 * visible 범위: offsetY ~ offsetY + viewportH (px)
 * 이 범위 밖에 있는 최상위 자식 블록을 제거하면
 * html2canvas의 DOM 파싱 노드 수가 대폭 감소한다.
 */
const trimOverflowNodes = (container: HTMLElement): void => {
  // overflow:hidden인 슬라이스 래퍼 찾기
  const sliceWrappers = container.querySelectorAll<HTMLElement>(
    "[data-page] div[style*='overflow']"
  );

  for (const wrapper of sliceWrappers) {
    if (!wrapper.style.overflow?.includes("hidden")) continue;

    const viewportH = wrapper.offsetHeight;
    if (viewportH === 0) continue;

    // 내부 absolute 컨테이너
    const inner = wrapper.firstElementChild as HTMLElement | null;
    if (!inner || inner.style.position !== "absolute") continue;

    const offsetY = Math.abs(parseFloat(inner.style.top) || 0);
    const visibleTop = offsetY;
    const visibleBottom = offsetY + viewportH;

    // getBoundingClientRect 기준으로 inner 컨테이너의 top 좌표 확보
    const innerRect = inner.getBoundingClientRect();
    const innerTop = innerRect.top;

    // 직접 자식 블록들을 순회하며 보이지 않는 노드 제거
    const children = Array.from(inner.children) as HTMLElement[];

    for (const child of children) {
      const childRect = child.getBoundingClientRect();
      // inner 컨테이너 기준 상대 좌표
      const childTop = childRect.top - innerTop;
      const childBottom = childTop + childRect.height;

      // 완전히 visible 범위 밖에 있는 블록만 제거 (100px 여유)
      if (childBottom < visibleTop - 100 || childTop > visibleBottom + 100) {
        // 제거 대신 빈 placeholder로 교체 (레이아웃 유지)
        const placeholder = document.createElement("div");
        placeholder.style.height = `${childRect.height}px`;
        placeholder.style.visibility = "hidden";
        child.replaceWith(placeholder);
      }
    }
  }
};

/**
 * 화면 밖 고정 A4 너비 컨테이너를 생성하고, 원본 DOM을 복제합니다.
 *
 * ⚠️ 성능 핵심:
 * html2canvas의 width/height 옵션이 캔버스 크기를 결정하며,
 * 캔버스 범위 밖 요소는 렌더링을 스킵합니다.
 * → 페이지 높이를 297mm로 고정하고, offsetHeight를 html2canvas에 전달하면
 *   AutoPaginatedSection의 absolute 오버플로(수천 px)는 캔버스 밖이므로
 *   렌더링되지 않아 페이지당 ~0.5-1초로 단축됩니다.
 *
 * ⚠️ overflow는 건드리지 않음:
 * CSS 스펙상 overflow-x: visible + overflow-y: hidden은 불가능
 * (한쪽이 hidden이면 다른 쪽은 auto로 강제 변환).
 * overflow: hidden을 설정하면 가로 콘텐츠도 잘리므로 설정하지 않습니다.
 */
/**
 * 오프스크린 클론에서 모바일 반응형 CSS 영향을 제거.
 *
 * CSS media query는 viewport 기준이므로, 모바일에서 클론해도
 * 내부 grid/flex 요소에 모바일 스타일이 적용됨.
 * → computed style을 검사하여 모바일 패턴을 PC 기본값으로 강제 복원.
 */
const forceDesktopStyles = (container: HTMLElement): void => {
  // 1) grid-template-columns: 1fr → 모바일에서 단일 컬럼으로 변경된 그리드 복원
  const allElements = container.querySelectorAll<HTMLElement>("*");
  for (const el of allElements) {
    const computed = getComputedStyle(el);

    // 그리드 단일 컬럼 → 2컬럼 복원 (리포트의 카드 그리드 등)
    if (computed.display === "grid") {
      const cols = computed.gridTemplateColumns;
      // "1fr" 단일 컬럼 = 모바일 반응형 결과
      // 원본 PC는 보통 "1fr 1fr" 또는 "repeat(2, 1fr)" 이상
      if (cols && !cols.includes(" ")) {
        // 단일 값 = 1컬럼 → 2컬럼으로 복원
        el.style.gridTemplateColumns = "repeat(2, 1fr)";
      }
    }

    // flex-direction: column → row 복원 (프로필 identity 카드)
    // 모바일 반응형에서 column으로 바뀐 identity 카드만 row로 복원.
    // profileTypeInfo 등 내부 요소는 column이 의도된 레이아웃이므로 제외.
    if (
      computed.display === "flex" &&
      computed.flexDirection === "column" &&
      el.children.length >= 2
    ) {
      const parent = el.parentElement;
      if (parent && !parent.hasAttribute("data-page")) {
        const cls = el.className.toLowerCase();
        // identity 카드만 대상 (profileTypeInfo 등 하위 요소 제외)
        if (cls.includes("identity")) {
          el.style.flexDirection = "row";
          el.style.alignItems = "center";
        }
      }
    }

    // border-radius: 0, box-shadow: none → 페이지 카드 스타일 복원
    // (이미 [data-page]에서 처리하므로 여기선 스킵)

    // width: 100% → 페이지 내부 요소는 100%가 맞으므로 건드리지 않음
  }

  // 2) 4컬럼 스탯 그리드 복원 (profileStatsGrid: 2→4열)
  // CSS module 해시 class를 모르므로, 구조로 판단:
  // grid + 4개 자식 + 현재 2컬럼 = statsGrid
  for (const el of allElements) {
    const computed = getComputedStyle(el);
    if (computed.display !== "grid") continue;
    const childCount = el.children.length;
    const cols = computed.gridTemplateColumns.split(" ").length;
    if (childCount === 4 && cols === 2) {
      el.style.gridTemplateColumns = "repeat(4, 1fr)";
    }
  }
};

/** Pretendard 폰트 스택 — PDF 내 모든 텍스트에 동일 적용 */
const PDF_FONT_FAMILY =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Noto Sans KR", sans-serif';

const createOffscreenContainer = (source: HTMLElement): HTMLElement => {
  const offscreen = document.createElement("div");
  offscreen.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: 210mm;
    z-index: -9999;
    background: #ffffff;
    overflow: visible;
    font-family: ${PDF_FONT_FAMILY};
  `;
  document.body.appendChild(offscreen);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = "100%";
  clone.style.maxWidth = "none";
  clone.style.overflow = "visible";
  offscreen.appendChild(clone);

  // AutoPaginatedSection의 hidden 측정 컨테이너 제거 (aria-hidden)
  // 복제 시 측정용 div가 남아있으면 레이아웃이 깨짐
  const hiddenMeasureDivs =
    offscreen.querySelectorAll<HTMLElement>("[aria-hidden]");
  for (const div of hiddenMeasureDivs) {
    div.remove();
  }

  // [data-page]의 모든 조상 요소의 너비 제약 제거
  // (.reportWrapper의 max-width/padding 등이 페이지 너비를 줄이는 것 방지)
  const firstPage = offscreen.querySelector<HTMLElement>("[data-page]");
  if (firstPage) {
    let ancestor = firstPage.parentElement;
    while (ancestor && ancestor !== offscreen) {
      ancestor.style.maxWidth = "none";
      ancestor.style.padding = "0";
      ancestor.style.margin = "0";
      ancestor.style.width = "100%";
      ancestor = ancestor.parentElement;
    }
  }

  // [data-page] 요소를 A4 크기로 고정 (overflow는 건드리지 않음)
  const pages = offscreen.querySelectorAll<HTMLElement>("[data-page]");
  for (const page of pages) {
    page.style.width = "210mm";
    page.style.maxWidth = "none";
    page.style.height = "297mm";
    page.style.minHeight = "297mm";
    page.style.boxShadow = "none";
    page.style.margin = "0";
    page.style.borderRadius = "0";

    // 커버 페이지는 고유 padding 유지, 일반 페이지만 표준 padding 적용
    if (page.hasAttribute("data-cover")) {
      page.style.padding = "48mm 36mm 36mm";
    } else {
      page.style.padding = "20mm 18mm";
    }
  }

  // 모바일 반응형 CSS 영향 제거: 원본(source)의 PC 스타일을 읽어서 클론에 적용
  // (오프스크린 클론은 모바일 viewport에서 media query가 적용된 상태이므로
  //  원본 소스의 computed style도 모바일임 — 대신 기본값으로 강제 리셋)
  forceDesktopStyles(offscreen);

  // PDF용: ::after pseudo element를 실제 textContent로 대체
  // (html2canvas에서 ::after의 baseline이 텍스트와 불일치하는 문제 해결)
  const pageNumberEls =
    offscreen.querySelectorAll<HTMLElement>("[data-page-number]");
  for (let i = 0; i < pageNumberEls.length; i++) {
    const el = pageNumberEls[i];
    el.textContent = String(i + 1);
    // ::after를 무효화 (content: none)
    el.style.setProperty("--pdf-mode", "1");
  }
  // ::after 비활성화를 위한 인라인 스타일 시트 주입
  const pdfStyle = document.createElement("style");
  pdfStyle.textContent =
    "[data-page-number] { counter-increment: none; } [data-page-number]::after { content: none !important; }";
  offscreen.prepend(pdfStyle);

  return offscreen;
};

export interface PdfProgress {
  current: number;
  total: number;
  /** 서버사이드 생성 시 상태 텍스트 */
  status?: string;
}

/**
 * 리포트 컨테이너 내의 [data-page] 요소들을 캡처하여 A4 PDF를 생성합니다.
 *
 * @param container 리포트 DOM 컨테이너 (previewRef.current)
 * @param onProgress 페이지별 진행률 콜백
 * @returns PDF Blob
 */
export const generatePdfFromElement = async (
  container: HTMLElement,
  onProgress?: (progress: PdfProgress) => void
): Promise<Blob> => {
  const offscreen = createOffscreenContainer(container);

  try {
    // 오프스크린 컨테이너의 실제 텍스트로 dynamic-subset 폰트를 명시적으로 로드
    const textContent = offscreen.textContent ?? "";
    if (textContent) {
      await document.fonts.load(
        `16px ${PDF_FONT_FAMILY.split(",")[0]}`,
        textContent
      );
    }
    await document.fonts.ready;

    // 레이아웃 재계산을 위해 두 프레임 대기 (폰트 로드 후 reflow 필요)
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    // 폰트 로드 최종 확인
    await document.fonts.ready;

    const pages = offscreen.querySelectorAll<HTMLElement>("[data-page]");

    if (pages.length === 0) {
      throw new Error("PDF로 변환할 페이지를 찾을 수 없습니다.");
    }

    const scale = getScale();
    const total = pages.length;
    const pdf = new jsPDF("p", "mm", "a4");

    for (let i = 0; i < total; i++) {
      // 메인 스레드 양보 — UI 업데이트(진행률 표시) 허용
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const pageWidth = pages[i].offsetWidth;
      const pageHeight = pages[i].offsetHeight;

      // 방어: 페이지 크기가 0이면 스킵 (offscreen 렌더링 실패)
      if (pageWidth === 0 || pageHeight === 0) {
        console.warn(
          `[PDF] Page ${i + 1} has zero dimensions (${pageWidth}x${pageHeight}), skipping`
        );
        onProgress?.({ current: i + 1, total });
        continue;
      }

      // 방어: 캔버스 크기 제한 초과 시 scale 자동 축소
      let pageScale = scale;
      const scaledWidth = pageWidth * pageScale;
      const scaledHeight = pageHeight * pageScale;
      if (
        scaledWidth > MAX_CANVAS_DIMENSION ||
        scaledHeight > MAX_CANVAS_DIMENSION
      ) {
        pageScale = Math.floor(
          Math.min(
            MAX_CANVAS_DIMENSION / pageWidth,
            MAX_CANVAS_DIMENSION / pageHeight
          )
        );
        pageScale = Math.max(pageScale, 1);
        console.warn(
          `[PDF] Page ${i + 1} canvas exceeds limit, reducing scale to ${pageScale}`
        );
      }

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(pages[i], {
          scale: pageScale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: pageWidth,
          height: pageHeight,
        });
      } catch (canvasErr) {
        console.error(`[PDF] html2canvas failed on page ${i + 1}:`, canvasErr);
        throw new Error(
          `페이지 ${i + 1} 캡처에 실패했습니다. 브라우저를 새로고침 후 다시 시도해주세요.`
        );
      }

      // 방어: 캔버스가 빈 이미지인지 확인
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn(`[PDF] Page ${i + 1} produced empty canvas, skipping`);
        onProgress?.({ current: i + 1, total });
        continue;
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      // 방어: toDataURL이 빈 데이터 반환 시 (tainted canvas 등)
      if (imgData.length < MIN_VALID_DATA_URL_LENGTH) {
        console.error(
          `[PDF] Page ${i + 1} toDataURL returned invalid data (length: ${imgData.length})`
        );
        throw new Error(
          `페이지 ${i + 1}의 이미지 변환에 실패했습니다. 외부 이미지 로딩 문제일 수 있습니다.`
        );
      }

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      onProgress?.({ current: i + 1, total });
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(offscreen);
  }
};

/**
 * PDF Blob을 다운로드합니다.
 * iOS Safari에서 blob: URL + <a download> 조합이 동작하지 않으므로
 * FileReader → data URL → window.open 방식을 fallback으로 사용합니다.
 */
/**
 * PDF Blob을 다운로드합니다.
 * iOS Safari에서 blob: URL + <a download> 조합이 동작하지 않으므로
 * FileReader → data URL → window.open 방식을 fallback으로 사용합니다.
 *
 * @returns 다운로드 시도 성공 여부 (blob 유효성 기준)
 */
export const downloadPdfBlob = (blob: Blob, filename: string): boolean => {
  // Blob 유효성 검증
  if (!blob || blob.size === 0) {
    console.error("[PDF] downloadPdfBlob: blob is empty", {
      size: blob?.size,
      type: blob?.type,
    });
    return false;
  }

  console.info("[PDF] downloadPdfBlob: starting", {
    size: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
    type: blob.type,
    filename,
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // 앵커를 즉시 제거하지 않고 잠시 유지 (일부 브라우저 호환)
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);

  // 다운로드 재시도 배너 표시 (20초)
  showDownloadBanner(url, filename);

  return true;
};

const showDownloadBanner = (url: string, filename: string): void => {
  const existing = document.getElementById("pdf-download-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "pdf-download-banner";
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e1e2e;
    color: #ffffff;
    padding: 14px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.textContent = "PDF 다운로드";
  link.style.cssText = `
    color: #818cf8;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: #888;
    font-size: 16px;
    cursor: pointer;
    padding: 0 0 0 8px;
  `;

  const cleanup = () => {
    banner.remove();
    URL.revokeObjectURL(url);
  };

  closeBtn.onclick = cleanup;

  banner.appendChild(
    document.createTextNode("다운로드가 시작되지 않았나요? → ")
  );
  banner.appendChild(link);
  banner.appendChild(closeBtn);
  document.body.appendChild(banner);

  setTimeout(cleanup, 20000);
};
