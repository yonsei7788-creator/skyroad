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
  }

  return offscreen;
};

export interface PdfProgress {
  current: number;
  total: number;
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
    // 레이아웃 재계산을 위해 한 프레임 대기
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );

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

      const canvas = await html2canvas(pages[i], {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: pages[i].offsetWidth,
        height: pages[i].offsetHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);

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
export const downloadPdfBlob = (blob: Blob, filename: string): void => {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSafari =
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|CriOS|FxiOS/i.test(navigator.userAgent);

  if (isIOS || isSafari) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const newTab = window.open();
      if (newTab) {
        newTab.document.title = filename;
        newTab.location.href = dataUrl;
      } else {
        window.location.href = dataUrl;
      }
    };
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
