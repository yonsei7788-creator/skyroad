import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const SCALE = 2;

/** 메인 스레드 양보 — UI 버벅임 방지 */
const yieldToMain = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * 화면 밖에 고정 A4 너비 컨테이너를 생성하고, 원본 DOM을 복제하여 렌더링합니다.
 * 미리보기 패널의 viewport 크기와 무관하게 항상 일관된 PDF를 생성합니다.
 *
 * ⚠️ 핵심: 컨테이너 너비를 px이 아닌 210mm(CSS 단위)로 설정하여
 * .page { width: 210mm } 와 정확히 일치시킵니다.
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

  // 원본 DOM 복제 (스타일 포함)
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

  // 복제된 [data-page] 요소들에 A4 사이즈 고정
  const pages = offscreen.querySelectorAll<HTMLElement>("[data-page]");
  for (const page of pages) {
    page.style.width = "210mm";
    page.style.minHeight = "297mm";
    page.style.height = "297mm";
    // ⚠️ maxHeight, overflow: hidden 제거 → 콘텐츠 잘림 방지
    // AutoPaginatedSection의 slice overflow:hidden이 콘텐츠 경계를 처리하고,
    // 페이지 레벨에서는 잘리지 않도록 함. 만약 슬라이스가 약간 초과해도
    // html2canvas가 전체를 캡처한 뒤 A4에 맞춰 배치하므로 안전.
    page.style.maxHeight = "none";
    page.style.overflow = "visible";
    page.style.boxShadow = "none";
    page.style.margin = "0";
    page.style.borderRadius = "0";
  }

  return offscreen;
};

/**
 * 리포트 컨테이너 내의 [data-page] 요소들을 각각 캡처하여
 * 페이지별로 A4 PDF를 생성합니다.
 *
 * 원본 DOM을 화면 밖 고정 A4 너비(210mm) 컨테이너에 복제하여 캡처하므로
 * 미리보기 패널의 viewport 크기와 무관하게 일관된 PDF가 생성됩니다.
 *
 * 클라이언트 전용 — 브라우저에서 호출해야 합니다.
 */
export const generatePdfFromElement = async (
  container: HTMLElement
): Promise<Blob> => {
  // 1. 화면 밖 고정 A4 컨테이너에 DOM 복제
  const offscreen = createOffscreenContainer(container);

  try {
    // 레이아웃 재계산을 위해 한 프레임 대기
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    await yieldToMain();

    const pages = offscreen.querySelectorAll<HTMLElement>("[data-page]");

    if (pages.length === 0) {
      throw new Error("PDF로 변환할 페이지를 찾을 수 없습니다.");
    }

    const pdf = new jsPDF("p", "mm", "a4");
    let isFirstPage = true;

    for (let i = 0; i < pages.length; i++) {
      await yieldToMain();

      // offsetWidth/offsetHeight = 실제 렌더링 크기 (border-box)
      // scrollHeight를 사용하면 overflow된 콘텐츠까지 포함되어
      // 이미지가 A4보다 커질 수 있으므로 offset 기반 사용
      const pageWidth = pages[i].offsetWidth;
      const pageHeight = Math.max(pages[i].offsetHeight, pages[i].scrollHeight);

      const canvas = await html2canvas(pages[i], {
        scale: SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: pageWidth,
        height: pageHeight,
      });

      // JPEG로 변환하여 Base64 크기 대폭 축소 (Invalid string length 방지)
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      if (!isFirstPage) {
        pdf.addPage();
      }

      // A4 전체에 맞춰 이미지 배치 (여백 없이)
      // 만약 콘텐츠가 297mm를 약간 초과해도 A4에 맞춰지므로 안전
      pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      isFirstPage = false;
    }

    return pdf.output("blob");
  } finally {
    // 항상 정리: 화면 밖 컨테이너 제거
    document.body.removeChild(offscreen);
  }
};
