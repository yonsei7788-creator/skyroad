"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  ExternalLink,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";

import { Badge } from "@/app/admin/_components";
import type {
  AdminJeongsiReportDetail,
  JeongsiReportStatus,
} from "@/app/admin/types";
import { JeongsiReport } from "@/app/jeongsi/_report";
import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";
import { downloadPdfBlob } from "@/libs/pdf/generate";

import { MobileSectionSelect } from "../../reports/_components/MobileSectionSelect";
import styles from "../../reports/reports.module.css";
import { JeongsiSectionEditor } from "../_components/JeongsiSectionEditor";
import { JeongsiSectionNav } from "../_components/JeongsiSectionNav";
import ownStyles from "../jeongsi-admin.module.css";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const TOAST_DURATION_MS = 3000;
const LIST_PATH = "/admin/jeongsi";
const FALLBACK_PDF_NAME = "정시리포트.pdf";
const WIDE_SCREEN_PX = 1400;

const STATUS_BADGE_MAP: Record<
  JeongsiReportStatus,
  { label: string; variant: "success" | "warning" | "error" | "neutral" }
> = {
  pending: { label: "대기", variant: "neutral" },
  processing: { label: "생성 중", variant: "warning" },
  completed: { label: "생성 완료", variant: "success" },
  failed: { label: "생성 실패", variant: "error" },
};

const readError = async (res: Response, fallback: string): Promise<string> => {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
};

/** 응답 헤더의 파일명. 없으면 기본 이름 */
const fileNameOf = (res: Response): string => {
  const encoded = res.headers.get("X-File-Name");
  return encoded ? decodeURIComponent(encoded) : FALLBACK_PDF_NAME;
};

const JeongsiReportAdminPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reportId = params.id;

  const [report, setReport] = useState<AdminJeongsiReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editableContent, setEditableContent] =
    useState<JeongsiReportContent | null>(null);
  const [originalContent, setOriginalContent] =
    useState<JeongsiReportContent | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [checkedSections, setCheckedSections] = useState<Set<string>>(
    new Set()
  );
  // 화면이 좁으면 A4 미리보기가 편집 칸을 밀어내므로 접은 채로 시작한다
  const [showPreview, setShowPreview] = useState(
    () => typeof window === "undefined" || window.innerWidth >= WIDE_SCREEN_PX
  );
  /** 초기화 때 편집기 입력칸의 로컬 상태를 버리기 위한 키 */
  const [editorVersion, setEditorVersion] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/jeongsi/${reportId}`);
      if (!res.ok) {
        throw new Error(
          await readError(res, "정시 리포트를 불러오는데 실패했습니다.")
        );
      }
      const data: AdminJeongsiReportDetail = await res.json();
      const content = data.content as JeongsiReportContent | null;
      setReport(data);
      setEditableContent(content ? structuredClone(content) : null);
      setOriginalContent(content ? structuredClone(content) : null);
      setHasChanges(false);
      const firstSectionId = content?.sections[0]?.sectionId;
      setCheckedSections(new Set(firstSectionId ? [firstSectionId] : []));
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "정시 리포트를 불러오는데 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // 저장하지 않은 수정이 있으면 페이지를 떠나기 전에 확인한다
  useEffect(() => {
    if (!hasChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleContentChange = (content: JeongsiReportContent) => {
    setEditableContent(content);
    setHasChanges(true);
  };

  const handleSectionSelect = (index: number) => {
    setActiveSectionIndex(index);
    const sectionId = editableContent?.sections[index]?.sectionId;
    if (!sectionId) return;
    setCheckedSections((prev) => new Set(prev).add(sectionId));
  };

  const handleResetContent = () => {
    if (!originalContent) return;
    setEditableContent(structuredClone(originalContent));
    setHasChanges(false);
    setEditorVersion((version) => version + 1);
  };

  /** 저장 성공 여부를 돌려준다. PDF 추출 전 자동 저장에도 쓴다 */
  const saveContent = async (): Promise<boolean> => {
    if (!editableContent) return false;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/jeongsi/${reportId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editableContent }),
      });
      if (!res.ok) {
        throw new Error(await readError(res, "저장에 실패했습니다."));
      }
      const { content } = (await res.json()) as {
        content: JeongsiReportContent;
      };
      setOriginalContent(structuredClone(content));
      setEditableContent(structuredClone(content));
      setHasChanges(false);
      setEditorVersion((version) => version + 1);
      return true;
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "저장에 실패했습니다.",
        "error"
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async () => {
    if (await saveContent()) {
      addToast("저장했습니다.", "success");
    }
  };

  // PDF 는 DB 에 저장된 내용으로 만들어지므로, 수정 중이면 먼저 저장한다
  const handleExportPdf = async () => {
    if (hasChanges && !(await saveContent())) return;

    setExporting(true);
    try {
      const res = await fetch(`/api/admin/jeongsi/${reportId}/pdf`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await readError(res, "PDF 생성에 실패했습니다."));
      }
      const blob = await res.blob();
      if (!downloadPdfBlob(blob, fileNameOf(res))) {
        throw new Error("PDF 파일이 비어 있습니다.");
      }
      addToast("PDF를 내려받았습니다.", "success");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "PDF 생성에 실패했습니다.",
        "error"
      );
    } finally {
      setExporting(false);
    }
  };

  const handleBack = () => {
    if (
      hasChanges &&
      !window.confirm("저장하지 않은 수정이 있습니다. 나갈까요?")
    ) {
      return;
    }
    router.push(LIST_PATH);
  };

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
        <p>{loadError ?? "정시 리포트를 찾을 수 없습니다."}</p>
      </div>
    );
  }

  const sections = (editableContent?.sections ?? []).map(
    ({ sectionId, title }) => ({ sectionId, title })
  );
  const totalSections = sections.length;
  const activeSection = sections[activeSectionIndex];
  const checkedCount = sections.filter((section) =>
    checkedSections.has(section.sectionId)
  ).length;
  const progressPercent =
    totalSections > 0 ? (checkedCount / totalSections) * 100 : 0;
  const { label: statusLabel, variant: statusVariant } =
    STATUS_BADGE_MAP[report.status];
  const isEditable = report.status === "completed" && editableContent !== null;
  const busy = saving || exporting;

  return (
    <div
      className={`${styles.reviewLayout} ${ownStyles.reviewLayout} ${
        !showPreview ? styles.previewHidden : ""
      }`}
    >
      {(toasts.length > 0 || exporting) && (
        <div className={styles.toastContainer}>
          {exporting && (
            <div className={`${styles.toast} ${styles.toastSuccess}`}>
              <Loader2 size={16} className={styles.spinner} />
              PDF 생성 중... (최대 1분 정도 걸립니다)
            </div>
          )}
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.toast} ${
                toast.type === "success"
                  ? styles.toastSuccess
                  : styles.toastError
              }`}
            >
              {toast.type === "success" ? <CheckCircle size={16} /> : null}
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Top Bar */}
      <div className={styles.topBar}>
        <button className={styles.topBarBack} onClick={handleBack}>
          <ArrowLeft size={14} /> 목록
        </button>
        <h1 className={styles.topBarTitle}>정시 리포트 · {report.target}</h1>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        {isEditable && (
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
        )}
        <div className={styles.topBarActions}>
          {hasChanges && (
            <button className={styles.resetButton} onClick={handleResetContent}>
              <RotateCcw size={14} /> 초기화
            </button>
          )}
          <a
            className={ownStyles.viewLink}
            href={`/jeongsi/${report.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} /> 리포트 보기
          </a>
          {isEditable && (
            <>
              <button
                className={styles.saveButton}
                onClick={handleSaveContent}
                disabled={busy || !hasChanges}
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
                disabled={busy}
              >
                {exporting ? (
                  <Loader2 size={14} className={styles.spinner} />
                ) : (
                  <Download size={14} />
                )}
                PDF 추출
              </button>
            </>
          )}
        </div>
      </div>

      {/* Left Nav (desktop) */}
      <div className={styles.leftNav}>
        <JeongsiSectionNav
          sections={sections}
          activeSectionIndex={activeSectionIndex}
          onSectionSelect={handleSectionSelect}
          checkedSections={checkedSections}
          title={`${report.target} · ${report.region} · ${report.risk}`}
          subtitle={`생성 ${report.createdBy ?? "-"} · 평균 백분위 ${
            report.averagePercentile?.toFixed(1) ?? "-"
          }`}
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
        {isEditable && activeSection && editableContent ? (
          <>
            <div className={styles.sectionEditorHeader}>
              <span className={styles.sectionEditorNumber}>
                {activeSectionIndex + 1}
              </span>
              <h2 className={styles.sectionEditorTitle}>
                {activeSection.title}
              </h2>
            </div>
            <div className={styles.sectionEditorContent}>
              <JeongsiSectionEditor
                key={`${activeSectionIndex}-${editorVersion}`}
                content={editableContent}
                sectionIndex={activeSectionIndex}
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
        ) : (
          <div className={ownStyles.statusPanel}>
            {report.status === "failed"
              ? `리포트 생성에 실패했습니다.${report.error ? ` (${report.error})` : ""}`
              : "리포트 생성이 끝나면 여기서 문장을 수정하고 PDF로 추출할 수 있습니다."}
          </div>
        )}
      </div>

      {/* Right Preview — 저장 전 수정 내용이 바로 반영된다 */}
      {showPreview && (
        <div className={`${styles.rightPreview} ${ownStyles.previewPane}`}>
          <button
            className={styles.previewToggle}
            onClick={() => setShowPreview(false)}
          >
            미리보기 접기 ✕
          </button>
          {editableContent && <JeongsiReport data={editableContent} />}
        </div>
      )}

      {!showPreview && (
        <button
          className={styles.expandPreviewButton}
          onClick={() => setShowPreview(true)}
        >
          미리보기 열기 →
        </button>
      )}
    </div>
  );
};

export default JeongsiReportAdminPage;
