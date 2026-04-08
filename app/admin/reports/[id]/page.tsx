"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/app/admin/_components";
import { ReportRenderer } from "@/app/report/_templates";
import { SingleSectionEditor } from "../_components/ReportContentEditor";
import { SectionNav } from "../_components/SectionNav";
import { MobileSectionSelect } from "../_components/MobileSectionSelect";
import { downloadPdfBlob } from "@/libs/pdf/generate";
import type { PdfProgress } from "@/libs/pdf/generate";
import { generatePdfServerSide } from "@/libs/pdf/server";
import { createClient as createSupabaseClient } from "@/libs/supabase/client";
import type { ReportDetail, ReportStatus } from "@/app/admin/types";
import type { ReportContent, ReportPlan } from "@/libs/report/types";

import styles from "../reports.module.css";

const STATUS_BADGE_MAP: Record<
  ReportStatus,
  { label: string; variant: "success" | "warning" | "info" | "neutral" }
> = {
  ai_pending: { label: "AI 생성 대기", variant: "neutral" },
  review_pending: { label: "검수 대기", variant: "warning" },
  review_complete: { label: "검수 완료", variant: "info" },
  delivered: { label: "발송 완료", variant: "success" },
};

const TOAST_DURATION = 3000;

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const ReportDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfProgress | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "deliver" | "resend" | "delete" | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Editable content state
  const [editableContent, setEditableContent] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [originalContent, setOriginalContent] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 3-panel review state
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [checkedSections, setCheckedSections] = useState<Set<string>>(
    new Set()
  );
  const [showPreview, setShowPreview] = useState(true);

  const toastCounter = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const fetchUrl = reportId.startsWith("mock-")
        ? `/api/admin/reports/mock/${reportId.replace("mock-", "")}`
        : `/api/admin/reports/${reportId}`;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error("Failed to fetch report");
      }
      const data: ReportDetail = await res.json();
      setReport(data);
      if (data.content) {
        const contentClone = structuredClone(
          data.content as Record<string, unknown>
        );
        setEditableContent(contentClone);
        setOriginalContent(
          structuredClone(data.content as Record<string, unknown>)
        );
        setHasChanges(false);
      }
    } catch (err) {
      console.error("Fetch report error:", err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleReview = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "검수 처리에 실패했습니다.");
      }

      addToast("검수가 완료되었습니다.", "success");
      await fetchReport();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "검수 처리에 실패했습니다.";
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const saveContentIfNeeded = async (): Promise<boolean> => {
    if (!hasChanges || !editableContent) return true;
    if (reportId.startsWith("mock-")) return true;

    try {
      const res = await fetch(`/api/admin/reports/${reportId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editableContent }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      setOriginalContent(structuredClone(editableContent));
      setHasChanges(false);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "저장에 실패했습니다.";
      addToast(message, "error");
      return false;
    }
  };

  /** 서버사이드 PDF 생성 */
  const generatePdf = async (
    mode: "download" | "upload" = "download"
  ): Promise<Blob | string | null> => {
    setPdfProgress(null);
    try {
      const result = await generatePdfServerSide({
        reportId,
        mode,
        onProgress: (status) =>
          setPdfProgress({ current: 0, total: 0, status }),
      });
      return result;
    } catch (err) {
      console.error("Server PDF generation error:", err);
      const message =
        err instanceof Error ? err.message : "PDF 생성에 실패했습니다.";
      addToast(message, "error");
      return null;
    } finally {
      setPdfProgress(null);
    }
  };

  const buildDeliverFormData = async (): Promise<FormData | null> => {
    // 발송 전 자동 저장
    const saved = await saveContentIfNeeded();
    if (!saved) return null;

    const formData = new FormData();

    // 서버에서 PDF 생성 + Storage 업로드를 한번에
    const storagePath = await generatePdf("upload");
    if (typeof storagePath === "string") {
      formData.append("pdfStoragePath", storagePath);
    } else {
      addToast("PDF 생성에 실패하여 PDF 없이 발송합니다.", "error");
    }

    return formData;
  };

  const safeParseJson = async (
    res: Response
  ): Promise<Record<string, unknown>> => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        res.status === 413
          ? "요청 크기가 너무 큽니다. PDF 없이 다시 시도해주세요."
          : `서버 오류가 발생했습니다. (${res.status})`
      );
    }
  };

  const handleDeliver = async () => {
    if (!report) return;
    setShowConfirmModal(false);
    setConfirmAction(null);
    setSubmitting(true);
    try {
      const formData = await buildDeliverFormData();
      if (!formData) {
        setSubmitting(false);
        return;
      }
      const res = await fetch(`/api/admin/reports/${reportId}/deliver`, {
        method: "POST",
        body: formData,
      });

      const data = await safeParseJson(res);

      if (!res.ok && !data.success) {
        throw new Error(
          (data.error as string) ||
            "이메일 발송에 실패했습니다. 다시 시도해주세요."
        );
      }

      if (data.warning) {
        addToast(data.warning as string, "error");
      } else {
        const pdfNote = data.pdfAttached ? " (PDF 첨부)" : "";
        addToast(`이메일이 발송되었습니다.${pdfNote}`, "success");
      }

      await fetchReport();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "이메일 발송에 실패했습니다. 다시 시도해주세요.";
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!report) return;
    setShowConfirmModal(false);
    setConfirmAction(null);
    setSubmitting(true);
    try {
      const formData = await buildDeliverFormData();
      if (!formData) {
        setSubmitting(false);
        return;
      }
      const res = await fetch(`/api/admin/reports/${reportId}/deliver`, {
        method: "POST",
        body: formData,
      });

      const data = await safeParseJson(res);

      if (res.status === 409) {
        addToast("이미 발송된 리포트입니다. 관리자에게 문의하세요.", "error");
      } else if (!res.ok && !data.success) {
        throw new Error((data.error as string) || "재발송에 실패했습니다.");
      } else {
        const pdfNote = data.pdfAttached ? " (PDF 첨부)" : "";
        addToast(`이메일이 재발송되었습니다.${pdfNote}`, "success");
        await fetchReport();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "재발송에 실패했습니다.";
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmModal = (action: "deliver" | "resend" | "delete") => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!report) return;
    setShowConfirmModal(false);
    setConfirmAction(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data.error as string) || "리포트 삭제에 실패했습니다."
        );
      }
      addToast("리포트가 삭제되었습니다.", "success");
      router.push("/admin/reports");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "리포트 삭제에 실패했습니다.";
      addToast(message, "error");
      setDeleting(false);
    }
  };

  const handleConfirm = () => {
    if (confirmAction === "deliver") {
      handleDeliver();
    } else if (confirmAction === "resend") {
      handleResend();
    } else if (confirmAction === "delete") {
      handleDelete();
    }
  };

  const handleContentChange = useCallback(
    (updated: Record<string, unknown>) => {
      setEditableContent(updated);
      setHasChanges(true);
    },
    []
  );

  const handleSaveContent = async () => {
    if (!editableContent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editableContent }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      setOriginalContent(structuredClone(editableContent));
      setHasChanges(false);
      addToast("리포트 내용이 저장되었습니다.", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "저장에 실패했습니다.";
      addToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetContent = () => {
    if (originalContent) {
      setEditableContent(structuredClone(originalContent));
      setHasChanges(false);
    }
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await generatePdf("download");
      if (result instanceof Blob) {
        const planMap: Record<string, string> = {
          lite: "라이트",
          standard: "스탠다드",
          premium: "프리미엄",
        };
        const planLabel =
          planMap[report?.planName?.toLowerCase() ?? ""] ??
          report?.planName ??
          "리포트";
        const fileName = report?.userName
          ? `${report.userName}_리포트(${planLabel}).pdf`
          : `report-${reportId.slice(0, 8)}.pdf`;
        const ok = downloadPdfBlob(result, fileName);
        if (ok) {
          addToast("PDF가 다운로드되었습니다.", "success");
        } else {
          addToast(
            "PDF 생성은 완료되었으나 다운로드에 실패했습니다. 브라우저 설정을 확인해주세요.",
            "error"
          );
        }
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSectionSelect = useCallback(
    (index: number) => {
      setActiveSectionIndex(index);

      // Auto-check: mark current section as visited
      if (editableContent) {
        const sections = editableContent.sections as
          | { sectionId: string }[]
          | undefined;
        const section = sections?.[index];
        if (section?.sectionId) {
          setCheckedSections((prev) => {
            const next = new Set(prev);
            next.add(section.sectionId);
            return next;
          });
        }
      }
    },
    [editableContent]
  );

  // Derived values (computed before early returns)
  const sections = Array.isArray(editableContent?.sections)
    ? (editableContent.sections as { sectionId: string; title: string }[])
    : [];
  const totalSections = sections.length;
  const activeSection = sections[activeSectionIndex];
  const checkedCount = checkedSections.size;
  const progressPercent =
    totalSections > 0 ? (checkedCount / totalSections) * 100 : 0;

  // PDF 진행률 텍스트
  const pdfProgressText = pdfProgress
    ? (pdfProgress.status ??
      `PDF 생성 중... (${pdfProgress.current}/${pdfProgress.total})`)
    : null;

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className={styles.loading}>
        <p>리포트를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const STUCK_THRESHOLD_MS = 30 * 60 * 1000;
  const isStuckGenerating =
    (report.aiStatus === "pending" || report.aiStatus === "processing") &&
    Date.now() - new Date(report.createdAt).getTime() > STUCK_THRESHOLD_MS;
  const canRegenerate = report.aiStatus === "failed" || isStuckGenerating;

  const shortId = report.id.slice(0, 8);
  const { label: statusLabel, variant: statusVariant } =
    STATUS_BADGE_MAP[report.status];
  const isDelivered = report.status === "delivered";
  const isReviewed = report.status === "review_complete" || isDelivered;

  return (
    <div
      className={`${styles.reviewLayout} ${!showPreview ? styles.previewHidden : ""}`}
    >
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className={styles.toastContainer}>
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`${styles.toast} ${
                t.type === "success" ? styles.toastSuccess : styles.toastError
              }`}
            >
              {t.type === "success" ? <CheckCircle size={16} /> : null}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* PDF Progress Overlay */}
      {pdfProgressText && (
        <div className={styles.toastContainer}>
          <div className={`${styles.toast} ${styles.toastSuccess}`}>
            <Loader2 size={16} className={styles.spinner} />
            {pdfProgressText}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowConfirmModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {confirmAction === "resend"
                ? "리포트 재발송"
                : confirmAction === "delete"
                  ? "리포트 삭제"
                  : "이메일 발송 확인"}
            </h3>
            <p className={styles.modalDescription}>
              {confirmAction === "resend"
                ? "리포트를 다시 발송하시겠습니까? 사용자에게 이메일이 다시 전송됩니다."
                : confirmAction === "delete"
                  ? "이 리포트를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                  : "검수를 완료하고 사용자에게 이메일을 발송하시겠습니까?"}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowConfirmModal(false)}
              >
                취소
              </button>
              <button className={styles.modalConfirm} onClick={handleConfirm}>
                {confirmAction === "resend"
                  ? "재발송"
                  : confirmAction === "delete"
                    ? "삭제"
                    : "발송하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className={styles.topBar}>
        <button
          className={styles.topBarBack}
          onClick={() => router.push("/admin/reports")}
        >
          <ArrowLeft size={14} /> 목록
        </button>
        <h1 className={styles.topBarTitle}>검수 #{shortId}</h1>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        <div className={styles.topBarProgress}>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {checkedCount}/{totalSections}
          </span>
        </div>
        <div className={styles.topBarActions}>
          {hasChanges && (
            <button className={styles.resetButton} onClick={handleResetContent}>
              <RotateCcw size={14} /> 초기화
            </button>
          )}
          <button
            className={styles.deleteButton}
            onClick={() => openConfirmModal("delete")}
            disabled={deleting || submitting || exporting}
          >
            {deleting ? (
              <Loader2 size={14} className={styles.spinner} />
            ) : (
              <Trash2 size={14} />
            )}
            삭제
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSaveContent}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <Loader2 size={14} className={styles.spinner} />
            ) : (
              <Save size={14} />
            )}
            저장
          </button>
          <button
            className={styles.saveButton}
            onClick={handleExportPdf}
            disabled={exporting || submitting}
          >
            {exporting ? (
              <Loader2 size={14} className={styles.spinner} />
            ) : (
              <Download size={14} />
            )}
            PDF 추출
          </button>
          {isDelivered ? (
            <button
              className={styles.resendButton}
              onClick={() => openConfirmModal("resend")}
              disabled={submitting || exporting}
            >
              {submitting ? (
                <Loader2 size={14} className={styles.spinner} />
              ) : (
                <RefreshCw size={14} />
              )}
              재발송
            </button>
          ) : (
            <>
              {!isReviewed && (
                <button
                  className={styles.reviewButton}
                  onClick={handleReview}
                  disabled={submitting || exporting}
                >
                  {submitting ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  검수 완료
                </button>
              )}
              <button
                className={styles.sendEmailButton}
                onClick={() => openConfirmModal("deliver")}
                disabled={submitting || exporting}
              >
                {submitting ? (
                  <Loader2 size={14} className={styles.spinner} />
                ) : (
                  <Mail size={14} />
                )}
                {isReviewed ? "이메일 발송" : "검수 완료 + 이메일 발송"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Left Nav (desktop) */}
      <div className={styles.leftNav}>
        <SectionNav
          sections={sections}
          activeSectionIndex={activeSectionIndex}
          onSectionSelect={handleSectionSelect}
          checkedSections={checkedSections}
          hasUnsavedChanges={hasChanges}
          userName={report.userName}
          userEmail={report.userEmail}
          planName={report.planName}
        />
      </div>

      {/* Mobile Section Selector */}
      {sections.length > 0 && (
        <div className={styles.mobileSectionSelector}>
          <MobileSectionSelect
            sections={sections}
            activeIndex={activeSectionIndex}
            onSelect={handleSectionSelect}
            checkedSections={checkedSections}
          />
        </div>
      )}

      {/* Center Editor */}
      <div className={styles.centerEditor}>
        {activeSection && editableContent ? (
          <>
            <div className={styles.sectionEditorHeader}>
              <span className={styles.sectionEditorNumber}>
                {activeSectionIndex + 1}
              </span>
              <h2 className={styles.sectionEditorTitle}>
                {activeSection.title || activeSection.sectionId}
              </h2>
            </div>
            <div className={styles.sectionEditorContent}>
              <SingleSectionEditor
                content={editableContent}
                sectionIndex={activeSectionIndex}
                plan={(report.planName?.toLowerCase() as ReportPlan) ?? "lite"}
                onChange={handleContentChange}
              />
            </div>
            <div className={styles.sectionPagination}>
              <button
                className={styles.paginationButton}
                disabled={activeSectionIndex === 0}
                onClick={() => handleSectionSelect(activeSectionIndex - 1)}
              >
                ← 이전
              </button>
              <span className={styles.paginationInfo}>
                {activeSectionIndex + 1} / {totalSections}
              </span>
              <button
                className={styles.paginationButton}
                disabled={activeSectionIndex === totalSections - 1}
                onClick={() => handleSectionSelect(activeSectionIndex + 1)}
              >
                다음 →
              </button>
            </div>
          </>
        ) : canRegenerate ? (
          <div className={styles.aiFailedPanel}>
            <div className={styles.aiFailedIcon}>
              <AlertTriangle size={28} />
            </div>
            <h3 className={styles.aiFailedTitle}>
              {report.aiStatus === "failed"
                ? "AI 생성이 중단되었습니다"
                : "AI 생성이 30분 이상 지연되고 있습니다"}
            </h3>
            {report.aiError && (
              <p className={styles.aiFailedError}>{report.aiError}</p>
            )}
            <dl className={styles.aiFailedMeta}>
              {report.aiCurrentSection && (
                <>
                  <dt>중단 섹션</dt>
                  <dd>{report.aiCurrentSection}</dd>
                </>
              )}
              <dt>진행률</dt>
              <dd>{report.aiProgress}%</dd>
              {report.aiRetryCount > 0 && (
                <>
                  <dt>재시도 횟수</dt>
                  <dd>{report.aiRetryCount}회</dd>
                </>
              )}
            </dl>
            <button
              type="button"
              className={styles.aiRegenerateButton}
              onClick={() =>
                router.push(
                  `/report/generating?orderId=${report.orderId}&from=admin`
                )
              }
            >
              <RefreshCw size={16} /> 리포트 재생성
            </button>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            AI가 아직 리포트를 생성하지 않았습니다.
          </div>
        )}
      </div>

      {/* Right Preview */}
      {showPreview && (
        <div className={styles.rightPreview}>
          <button
            className={styles.previewToggle}
            onClick={() => setShowPreview(false)}
          >
            미리보기 접기 ✕
          </button>
          <div ref={previewRef}>
            {editableContent && (
              <ReportRenderer
                data={editableContent as unknown as ReportContent}
              />
            )}
          </div>
        </div>
      )}

      {/* Expand button when preview is hidden */}
      {!showPreview && (
        <button
          className={styles.expandPreviewButton}
          onClick={() => setShowPreview(true)}
        >
          미리보기 열기 →
        </button>
      )}

      {/* Mobile Bottom Action Bar */}
      <div className={styles.mobileActionBar}>
        {hasChanges && (
          <button className={styles.resetButton} onClick={handleResetContent}>
            <RotateCcw size={14} />
          </button>
        )}
        <button
          className={styles.saveButton}
          onClick={handleSaveContent}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <Loader2 size={14} className={styles.spinner} />
          ) : (
            <Save size={14} />
          )}
          저장
        </button>
        <button
          className={styles.saveButton}
          onClick={handleExportPdf}
          disabled={exporting || submitting}
        >
          {exporting ? (
            <Loader2 size={14} className={styles.spinner} />
          ) : (
            <Download size={14} />
          )}
          PDF
        </button>
        {isDelivered ? (
          <button
            className={styles.resendButton}
            onClick={() => openConfirmModal("resend")}
            disabled={submitting || exporting}
          >
            {submitting ? (
              <Loader2 size={14} className={styles.spinner} />
            ) : (
              <RefreshCw size={14} />
            )}
            재발송
          </button>
        ) : (
          <>
            {!isReviewed && (
              <button
                className={styles.reviewButton}
                onClick={handleReview}
                disabled={submitting || exporting}
              >
                {submitting ? (
                  <Loader2 size={14} className={styles.spinner} />
                ) : (
                  <CheckCircle size={14} />
                )}
                검수
              </button>
            )}
            <button
              className={styles.sendEmailButton}
              onClick={() => openConfirmModal("deliver")}
              disabled={submitting || exporting}
            >
              {submitting ? (
                <Loader2 size={14} className={styles.spinner} />
              ) : (
                <Mail size={14} />
              )}
              {isReviewed ? "발송" : "검수+발송"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportDetailPage;
