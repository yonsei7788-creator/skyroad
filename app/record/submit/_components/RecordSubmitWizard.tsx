"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";

import { createClient } from "@/libs/supabase/client";

import { StepIndicator } from "./StepIndicator";
import { MethodSelectStep } from "./MethodSelectStep";
import { PdfUploadStep } from "./PdfUploadStep";
import { ImageUploadStep } from "./ImageUploadStep";
import { TextInputStep } from "./TextInputStep";
import { ReviewStep } from "./ReviewStep";
import { ParsingOverlay } from "./ParsingOverlay";
import { INITIAL_WIZARD_STATE, validateRequiredFields } from "./types";
import type {
  InputMethod,
  WizardState,
  WizardStep,
  SchoolRecord,
  ImageFile,
} from "./types";

import styles from "../page.module.css";

interface ToastData {
  message: string;
  type: "success" | "error";
}

type DraftSaveStatus = "idle" | "saving" | "saved" | "error";

const saveDraft = async (
  method: InputMethod,
  record: SchoolRecord,
  isReviewed?: boolean
): Promise<string | null> => {
  try {
    const response = await fetch("/api/records/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, record, isReviewed }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.id as string;
  } catch {
    return null;
  }
};

const deleteDraft = async (): Promise<void> => {
  try {
    await fetch("/api/records/drafts", { method: "DELETE" });
  } catch {
    // 삭제 실패는 무시
  }
};

interface RecordSubmitWizardProps {
  mode?: "create" | "edit";
  initialRecord?: SchoolRecord;
  recordId?: string;
  onSubmitSuccess?: () => void;
}

export const RecordSubmitWizard = ({
  mode = "create",
  initialRecord,
  recordId,
  onSubmitSuccess,
}: RecordSubmitWizardProps) => {
  const router = useRouter();
  const isEditMode = mode === "edit";

  const [state, setState] = useState<WizardState>(() =>
    isEditMode && initialRecord
      ? {
          ...INITIAL_WIZARD_STATE,
          step: 2 as WizardStep,
          method: "text" as InputMethod,
          record: initialRecord,
          draftLoading: false,
        }
      : { ...INITIAL_WIZARD_STATE }
  );
  const [toast, setToast] = useState<ToastData | null>(null);
  const [pendingDraft, setPendingDraft] = useState<{
    method: InputMethod;
    record: SchoolRecord;
    draftId: string;
  } | null>(null);

  const [draftSaveStatus, setDraftSaveStatus] =
    useState<DraftSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  // 마운트 시 draft 확인
  useEffect(() => {
    if (isEditMode) {
      setState((prev) => ({ ...prev, draftLoading: false }));
      return;
    }

    const checkDraft = async () => {
      try {
        const response = await fetch("/api/records/drafts");
        if (response.ok) {
          const draft = await response.json();
          if (draft) {
            setPendingDraft({
              method: draft.submission_type as InputMethod,
              record: draft.record_data as SchoolRecord,
              draftId: draft.id as string,
            });
          }
        }
      } catch {
        // draft 없음 또는 에러 → 무시
      } finally {
        setState((prev) => ({ ...prev, draftLoading: false }));
      }
    };
    checkDraft();
  }, [isEditMode]);

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    const isAiMode =
      pendingDraft.method === "pdf" || pendingDraft.method === "image";
    setState((prev) => ({
      ...prev,
      method: pendingDraft.method,
      record: pendingDraft.record,
      draftId: pendingDraft.draftId,
      step: isAiMode ? 3 : 2,
    }));
    setPendingDraft(null);
  };

  const handleDiscardDraft = async () => {
    setPendingDraft(null);
    await deleteDraft();
  };

  const handleMethodSelect = (method: InputMethod) => {
    setState((prev) => ({ ...prev, method, step: 2 }));
  };

  const handlePdfChange = (file: File | null, fileName: string) => {
    setState((prev) => ({
      ...prev,
      pdfFile: file,
      pdfFileName: fileName,
    }));
  };

  const handleImagesChange = (images: ImageFile[]) => {
    setState((prev) => ({ ...prev, images }));
  };

  const handleRecordChange = (record: SchoolRecord) => {
    setState((prev) => ({ ...prev, record }));
    setDraftSaveStatus("idle");

    if (state.method && !isEditMode) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const { method } = state;
      debounceRef.current = setTimeout(async () => {
        setDraftSaveStatus("saving");
        const draftId = await saveDraft(method, record);
        if (draftId) {
          setState((prev) => ({ ...prev, draftId }));
          setDraftSaveStatus("saved");
          setLastSavedAt(new Date());
        } else {
          setDraftSaveStatus("error");
        }
      }, 2000);
    }
  };

  const handleManualSave = async () => {
    if (!state.method || isEditMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraftSaveStatus("saving");
    const draftId = await saveDraft(state.method, state.record);
    if (draftId) {
      setState((prev) => ({ ...prev, draftId }));
      setDraftSaveStatus("saved");
      setLastSavedAt(new Date());
    } else {
      setDraftSaveStatus("error");
    }
  };

  const isAiParseMode = state.method === "pdf" || state.method === "image";
  const totalSteps = isAiParseMode ? 4 : 3;
  const reviewStep = totalSteps;

  const requiredFieldErrors = validateRequiredFields(state.record);
  const isRequiredFieldsMet = requiredFieldErrors.length === 0;

  const canProceedFromStep2 = (): boolean => {
    if (!state.method) return false;

    switch (state.method) {
      case "pdf":
        return state.pdfFile !== null;
      case "image":
        return state.images.length > 0;
      case "text":
        return isRequiredFieldsMet;
    }
  };

  const canProceedFromStep3 = (): boolean => {
    if (!isAiParseMode) return false;
    return isRequiredFieldsMet;
  };

  const handleParseAndAdvance = async () => {
    setState((prev) => ({ ...prev, isParsing: true, parseError: null }));

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      // 파일을 Supabase Storage에 업로드
      const filesToUpload: File[] =
        state.method === "pdf" && state.pdfFile
          ? [state.pdfFile]
          : state.images.map((img) => img.file);

      const uploadedPaths: { path: string; mimeType: string }[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const ext = file.name.split(".").pop() || "pdf";
        const storagePath = `${user.id}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("record-uploads")
          .upload(storagePath, file);

        if (uploadError)
          throw new Error(`파일 업로드 실패: ${uploadError.message}`);
        uploadedPaths.push({ path: storagePath, mimeType: file.type });
      }

      const response = await fetch("/api/records/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePaths: uploadedPaths }),
      });

      if (!response.ok) {
        let message = "파싱에 실패했습니다.";
        try {
          const data = await response.json();
          message = data.error || message;
        } catch {
          // Vercel/Next.js 게이트웨이 에러 등 non-JSON 응답
          if (response.status === 504 || response.status === 502) {
            message =
              "AI 분석 시간이 초과되었습니다. 파일 크기를 줄이거나 다시 시도해주세요.";
          }
        }
        throw new Error(message);
      }

      const parsed = await response.json();
      const warning = parsed._warning as string | undefined;
      delete parsed._warning;

      // AI 파싱 완료 후 draft 자동 저장
      const draftId = await saveDraft(state.method!, parsed as SchoolRecord);

      setState((prev) => ({
        ...prev,
        record: parsed as SchoolRecord,
        isParsing: false,
        step: 3,
        draftId: draftId ?? prev.draftId,
      }));

      if (warning) {
        showToast(warning, "error");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "AI 파싱에 실패했습니다. 다시 시도해주세요.";
      setState((prev) => ({
        ...prev,
        isParsing: false,
        parseError: message,
      }));
    }
  };

  const handleNext = () => {
    if (state.step === 2) {
      if (!canProceedFromStep2()) return;

      if (isAiParseMode) {
        handleParseAndAdvance();
        return;
      }

      setState((prev) => ({ ...prev, step: 3 }));
      return;
    }

    if (state.step === 3 && isAiParseMode && canProceedFromStep3()) {
      setState((prev) => ({ ...prev, step: 4 }));
    }
  };

  const handleBack = () => {
    if (state.step === 2) {
      if (isEditMode) {
        router.push("/record");
        return;
      }
      setState((prev) => ({ ...prev, step: 1 }));
    } else if (state.step === 3) {
      setState((prev) => ({ ...prev, step: 2, parseError: null }));
    } else if (state.step === 4) {
      setState((prev) => ({ ...prev, step: 3 }));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!state.method) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/records/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: state.method,
          record: state.record,
          ...(isEditMode && recordId ? { recordId } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      // 최종 제출 성공 → draft 삭제
      if (!isEditMode) {
        await deleteDraft();
      }

      showToast(
        isEditMode
          ? "생활기록부가 수정되었습니다."
          : "생활기록부가 등록되었습니다. 분석을 시작합니다."
      );

      if (onSubmitSuccess) {
        setTimeout(() => onSubmitSuccess(), 1000);
      } else {
        setTimeout(() => {
          router.push("/record");
        }, 1500);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "저장에 실패했습니다. 다시 시도해주세요.";
      showToast(message, "error");
      setIsSubmitting(false);
    }
  };

  const isWideStep =
    (state.step === 2 && state.method === "text") ||
    (state.step === 3 && isAiParseMode);

  // draft 로딩 중
  if (state.draftLoading) {
    return (
      <div className={styles.wizardSection}>
        <div className={styles.wizardHeader}>
          <h1 className={styles.wizardTitle}>
            {isEditMode ? "생활기록부 수정" : "생활기록부 등록"}
          </h1>
          <p className={styles.wizardSubtitle}>
            {isEditMode
              ? "생기부 데이터를 수정하고 다시 분석하세요"
              : "생기부를 등록하고 AI 분석을 시작하세요"}
          </p>
        </div>
        <div className={styles.wizardContainer}>
          <div className={styles.draftLoadingState}>
            <Loader2 size={24} className={styles.spinner} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wizardSection}>
      {/* Parsing overlay — covers entire section below header */}
      {state.isParsing && <ParsingOverlay />}

      <div className={styles.wizardHeader}>
        <h1 className={styles.wizardTitle}>
          {isEditMode ? "생활기록부 수정" : "생활기록부 등록"}
        </h1>
        <p className={styles.wizardSubtitle}>
          {isEditMode
            ? "생기부 데이터를 수정하고 다시 분석하세요"
            : "생기부를 등록하고 AI 분석을 시작하세요"}
        </p>
      </div>

      <div
        className={`${styles.wizardContainer} ${isWideStep ? styles.wizardContainerWide : ""}`}
      >
        <StepIndicator
          currentStep={state.step}
          method={state.method}
          mode={mode}
        />

        <div
          className={`${styles.wizardCard} ${isWideStep ? styles.wizardCardFlat : ""}`}
        >
          {state.step === 1 && (
            <>
              {pendingDraft && (
                <div className={styles.draftRestoreCard}>
                  <div className={styles.draftRestoreCardIcon}>
                    <AlertCircle size={18} />
                  </div>
                  <div className={styles.draftRestoreCardBody}>
                    <p className={styles.draftRestoreCardText}>
                      이전에 작성하던 데이터가 있습니다. 이어서
                      편집하시겠습니까?
                    </p>
                    <div className={styles.draftRestoreCardActions}>
                      <button
                        type="button"
                        className={styles.draftRestoreBtn}
                        onClick={handleRestoreDraft}
                      >
                        이어서 작성하기
                      </button>
                      <button
                        type="button"
                        className={styles.draftDiscardBtn}
                        onClick={handleDiscardDraft}
                      >
                        새로 시작하기
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <MethodSelectStep onSelect={handleMethodSelect} />
            </>
          )}

          {state.step === 2 && state.method === "pdf" && (
            <PdfUploadStep
              pdfFile={state.pdfFile}
              pdfFileName={state.pdfFileName}
              onPdfChange={handlePdfChange}
            />
          )}

          {state.step === 2 && state.method === "image" && (
            <ImageUploadStep
              images={state.images}
              onImagesChange={handleImagesChange}
            />
          )}

          {state.step === 2 && state.method === "text" && (
            <TextInputStep
              record={state.record}
              onRecordChange={handleRecordChange}
              requiredFieldErrors={requiredFieldErrors}
            />
          )}

          {state.step === 3 && isAiParseMode && (
            <TextInputStep
              record={state.record}
              onRecordChange={handleRecordChange}
              requiredFieldErrors={requiredFieldErrors}
            />
          )}

          {state.step === reviewStep && state.method && (
            <ReviewStep
              method={state.method}
              record={state.record}
              validationErrors={requiredFieldErrors}
            />
          )}

          {/* Parse error (shown on step 2 for pdf/image) */}
          {state.step === 2 && isAiParseMode && state.parseError && (
            <div className={styles.parseErrorBox}>
              <AlertCircle size={16} />
              <span>{state.parseError}</span>
              <button
                type="button"
                className={styles.parseRetryBtn}
                onClick={handleParseAndAdvance}
              >
                <RefreshCw size={14} />
                다시 시도
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {state.step > 1 && (
          <div className={styles.wizardNav}>
            <button
              type="button"
              className={styles.wizardBackBtn}
              onClick={handleBack}
              disabled={state.isParsing || isSubmitting}
            >
              <ArrowLeft size={16} />
              이전
            </button>

            {!isEditMode && state.step >= 2 && state.method && (
              <div className={styles.draftSaveGroup}>
                <button
                  type="button"
                  className={styles.draftSaveBtn}
                  onClick={handleManualSave}
                  disabled={draftSaveStatus === "saving"}
                >
                  {draftSaveStatus === "saving" ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    <Save size={14} />
                  )}
                  임시저장
                </button>
                {draftSaveStatus === "saved" && lastSavedAt && (
                  <span className={styles.draftSaveStatus}>
                    자동 저장됨{" "}
                    {lastSavedAt.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                )}
                {draftSaveStatus === "error" && (
                  <span
                    className={`${styles.draftSaveStatus} ${styles.draftSaveStatusError}`}
                  >
                    저장 실패
                  </span>
                )}
              </div>
            )}

            {state.step === 2 && (
              <button
                type="button"
                className={styles.wizardNextBtn}
                onClick={handleNext}
                disabled={!canProceedFromStep2() || state.isParsing}
              >
                다음
                <ArrowRight size={16} />
              </button>
            )}

            {state.step === 3 && isAiParseMode && (
              <button
                type="button"
                className={styles.wizardNextBtn}
                onClick={handleNext}
                disabled={!canProceedFromStep3()}
              >
                다음
                <ArrowRight size={16} />
              </button>
            )}

            {state.step === reviewStep && (
              <button
                type="button"
                className={styles.wizardSubmitBtn}
                onClick={handleSubmit}
                disabled={isSubmitting || !isRequiredFieldsMet}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    {isEditMode ? "수정 중..." : "등록 중..."}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {isEditMode ? "수정하기" : "등록하기"}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`${styles.toast} ${toast.type === "error" ? styles.toastError : ""}`}
        >
          {toast.type === "success" ? (
            <Check size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};
