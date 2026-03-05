import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * 리포트 컨테이너 내의 [data-page] 요소들을 각각 캡처하여
 * 페이지별로 A4 PDF를 생성합니다.
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

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgWidth = A4_WIDTH_MM;
    const imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width;

    if (i > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
  }

  return pdf.output("blob");
};
