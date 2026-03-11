import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const SCALE = 1.5;

/** 메인 스레드 양보 — UI 버벅임 방지 */
const yieldToMain = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * 리포트 컨테이너 내의 [data-page] 요소들을 각각 캡처하여
 * 페이지별로 A4 PDF를 생성합니다.
 * 캡처된 이미지가 A4보다 높을 경우 여러 PDF 페이지로 분할합니다.
 * 클라이언트 전용 — 브라우저에서 호출해야 합니다.
 */
export const generatePdfFromElement = async (
  container: HTMLElement
): Promise<Blob> => {
  const pages = container.querySelectorAll<HTMLElement>("[data-page]");

  if (pages.length === 0) {
    throw new Error("PDF로 변환할 페이지를 찾을 수 없습니다.");
  }

  const pdf = new jsPDF("p", "mm", "a4");
  let isFirstPage = true;

  for (let i = 0; i < pages.length; i++) {
    // 매 페이지마다 메인 스레드에 제어를 넘겨 UI 프리징 방지
    await yieldToMain();

    const canvas = await html2canvas(pages[i], {
      scale: SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const imgWidth = A4_WIDTH_MM;
    const imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width;

    if (imgHeight <= A4_HEIGHT_MM) {
      // 이미지가 A4 한 페이지에 맞음
      if (!isFirstPage) {
        pdf.addPage();
      }
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      isFirstPage = false;
    } else {
      // 이미지가 A4보다 높음 — 여러 페이지로 분할
      let remainingHeight = imgHeight;
      let yOffset = 0;

      while (remainingHeight > 0) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        // 이미지를 yOffset만큼 위로 이동시켜 현재 페이지 영역만 보이게 함
        pdf.addImage(imgData, "JPEG", 0, -yOffset, imgWidth, imgHeight);
        isFirstPage = false;
        yOffset += A4_HEIGHT_MM;
        remainingHeight -= A4_HEIGHT_MM;
      }
    }
  }

  return pdf.output("blob");
};
