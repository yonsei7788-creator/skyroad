/**
 * 서버사이드 PDF 생성 클라이언트 헬퍼.
 *
 * 서버 Puppeteer를 호출하여 데스크톱과 동일한 PDF를 빠르게 생성합니다.
 */

interface ServerPdfOptions {
  reportId: string;
  /** "download": PDF blob 직접 반환, "upload": Storage 경로 반환 */
  mode?: "download" | "upload";
  onProgress?: (status: string) => void;
}

interface UploadResult {
  pdfStoragePath: string;
}

/**
 * 서버에서 PDF를 생성합니다.
 *
 * @returns mode="download" → Blob, mode="upload" → storage 경로 문자열
 */
export const generatePdfServerSide = async ({
  reportId,
  mode = "download",
  onProgress,
}: ServerPdfOptions): Promise<Blob | string | null> => {
  onProgress?.("PDF 생성 중...");

  const res = await fetch(`/api/admin/reports/${reportId}/pdf?mode=${mode}`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "PDF 생성에 실패했습니다."
    );
  }

  if (mode === "upload") {
    const data = (await res.json()) as UploadResult;
    return data.pdfStoragePath;
  }

  return res.blob();
};
