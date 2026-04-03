import { useState } from "react";
import { FileText, Info } from "lucide-react";

import { DropZone } from "./DropZone";

import styles from "../page.module.css";

interface PdfUploadStepProps {
  pdfFile: File | null;
  pdfFileName: string;
  onPdfChange: (file: File | null, fileName: string) => void;
}

export const PdfUploadStep = ({
  pdfFile,
  pdfFileName,
  onPdfChange,
}: PdfUploadStepProps) => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    const [file] = files;
    if (!file || file.type !== "application/pdf") return;

    if (file.size > MAX_FILE_SIZE) {
      setSizeError("파일 크기는 5MB를 초과할 수 없습니다.");
      return;
    }

    setSizeError(null);
    onPdfChange(file, file.name);
  };

  return (
    <div className={styles.pdfUploadStep}>
      <div className={styles.textInputHeader}>
        <h3 className={styles.stepSectionTitle}>PDF 업로드</h3>
        <p className={styles.stepSectionDesc}>
          생활기록부 PDF 파일을 업로드해주세요
        </p>
      </div>

      <div className={styles.pdfGuideCard} role="note">
        <Info size={16} className={styles.pdfGuideCardIcon} aria-hidden />
        <div className={styles.pdfGuideCardBody}>
          <p className={styles.pdfGuideCardText}>
            <strong>정부24 앱·카카오톡·네이버</strong>에서 발급한 정식
            생활기록부 PDF만 등록 가능합니다.
            <br />
            개인정보 보호를 위해 캡처 또는 인쇄 방식으로 생성된 파일은 접수되지
            않습니다.
          </p>
        </div>
      </div>

      {!pdfFile && (
        <>
          <DropZone
            accept=".pdf,application/pdf"
            label="PDF 파일을 드래그하거나 클릭하여 업로드"
            hint="PDF 파일만 지원됩니다 (최대 5MB)"
            onFiles={handleFiles}
          />
          {sizeError && <p className={styles.pdfSizeError}>{sizeError}</p>}
        </>
      )}

      {pdfFile && (
        <div className={styles.pdfResult}>
          <div className={styles.pdfFileInfo}>
            <FileText size={18} />
            <span className={styles.pdfFileName}>{pdfFileName}</span>
            <button
              type="button"
              className={styles.pdfReupload}
              onClick={() => onPdfChange(null, "")}
            >
              다시 업로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
