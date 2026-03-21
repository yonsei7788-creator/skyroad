"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shuffle, Loader2, AlertCircle } from "lucide-react";

import styles from "./create-code-modal.module.css";

/* ============================================
   Types
   ============================================ */

interface CreateCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** 수정 모드에서 사용 */
  initialValues?: InitialValues;
}

interface InitialValues {
  id: string;
  code: string;
  partnerName: string;
  partnerType: string;
  maxUsages: number;
  validFrom: string;
  validUntil: string;
  memo: string;
}

interface FormErrors {
  code?: string;
  partnerName?: string;
  maxUsages?: string;
  validFrom?: string;
  validUntil?: string;
}

/* ============================================
   Helpers
   ============================================ */

const SAFE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const generateRandomCode = (): string =>
  Array.from(
    { length: 8 },
    () => SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  ).join("");

const toDateInput = (dateStr: string): string => {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
};

const todayStr = (): string => new Date().toISOString().slice(0, 10);

/* ============================================
   Component
   ============================================ */

export const CreateCodeModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialValues,
}: CreateCodeModalProps) => {
  const isEdit = !!initialValues;
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [code, setCode] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerType, setPartnerType] = useState("influencer");
  const [maxUsages, setMaxUsages] = useState("0");
  const [validFrom, setValidFrom] = useState(todayStr());
  const [validUntil, setValidUntil] = useState("");
  const [memo, setMemo] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form on open/close
  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setCode(initialValues.code);
        setPartnerName(initialValues.partnerName);
        setPartnerType(initialValues.partnerType);
        setMaxUsages(String(initialValues.maxUsages));
        setValidFrom(toDateInput(initialValues.validFrom));
        setValidUntil(toDateInput(initialValues.validUntil));
        setMemo(initialValues.memo);
      } else {
        setCode("");
        setPartnerName("");
        setPartnerType("influencer");
        setMaxUsages("0");
        setValidFrom(todayStr());
        setValidUntil("");
        setMemo("");
      }
      setErrors({});
      setServerError("");
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen, initialValues]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Validate
  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    const trimCode = code.trim().toUpperCase();

    if (!trimCode) {
      errs.code = "코드를 입력해주세요.";
    } else if (!/^[A-Z0-9]{4,20}$/.test(trimCode)) {
      errs.code = "영문 대문자와 숫자 4~20자리만 가능합니다.";
    }

    if (!partnerName.trim()) {
      errs.partnerName = "파트너명을 입력해주세요.";
    }

    const parsedMax = Number(maxUsages);
    if (isNaN(parsedMax) || parsedMax < 0 || !Number.isInteger(parsedMax)) {
      errs.maxUsages = "0 이상의 정수를 입력해주세요.";
    }

    if (!validFrom) {
      errs.validFrom = "시작일을 선택해주세요.";
    }

    if (validUntil && validFrom && validUntil < validFrom) {
      errs.validUntil = "종료일은 시작일 이후여야 합니다.";
    }

    return errs;
  }, [code, partnerName, maxUsages, validFrom, validUntil]);

  // Submit
  const handleSubmit = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setServerError("");

    const body = {
      code: code.trim().toUpperCase(),
      partnerName: partnerName.trim(),
      partnerType,
      maxUsages: Number(maxUsages),
      validFrom: new Date(validFrom).toISOString(),
      validUntil: validUntil
        ? new Date(`${validUntil}T23:59:59`).toISOString()
        : undefined,
      memo: memo.trim() || undefined,
    };

    try {
      const url = isEdit
        ? `/api/admin/referral-codes/${initialValues!.id}`
        : "/api/admin/referral-codes";

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        setServerError(data.error ?? "요청에 실패했습니다.");
        return;
      }

      onSuccess();
    } catch {
      setServerError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validate,
    code,
    partnerName,
    partnerType,
    maxUsages,
    validFrom,
    validUntil,
    memo,
    isEdit,
    initialValues,
    onSuccess,
  ]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? "추천인 코드 수정" : "추천인 코드 생성"}
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                추천인 코드 {isEdit ? "수정" : "생성"}
              </h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              {serverError && (
                <div className={styles.errorBanner}>
                  <AlertCircle size={16} />
                  {serverError}
                </div>
              )}

              {/* 코드 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  코드<span className={styles.fieldRequired}>*</span>
                </label>
                <div className={styles.codeInputRow}>
                  <input
                    ref={firstInputRef}
                    type="text"
                    className={`${styles.input} ${styles.codeInput} ${errors.code ? styles.inputError : ""}`}
                    placeholder="JAKE2026"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (errors.code)
                        setErrors((prev) => ({ ...prev, code: undefined }));
                    }}
                    disabled={isEdit}
                    maxLength={20}
                  />
                  {!isEdit && (
                    <button
                      type="button"
                      className={styles.randomButton}
                      onClick={() => {
                        setCode(generateRandomCode());
                        setErrors((prev) => ({ ...prev, code: undefined }));
                      }}
                    >
                      <Shuffle size={14} />
                      랜덤
                    </button>
                  )}
                </div>
                {errors.code && (
                  <p className={styles.fieldError}>{errors.code}</p>
                )}
                {!isEdit && (
                  <p className={styles.fieldHint}>
                    영문 대문자 + 숫자, 4~20자리
                  </p>
                )}
              </div>

              {/* 파트너명 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  파트너명<span className={styles.fieldRequired}>*</span>
                </label>
                <input
                  type="text"
                  className={`${styles.input} ${errors.partnerName ? styles.inputError : ""}`}
                  placeholder="파트너 이름"
                  value={partnerName}
                  onChange={(e) => {
                    setPartnerName(e.target.value);
                    if (errors.partnerName)
                      setErrors((prev) => ({
                        ...prev,
                        partnerName: undefined,
                      }));
                  }}
                  maxLength={50}
                />
                {errors.partnerName && (
                  <p className={styles.fieldError}>{errors.partnerName}</p>
                )}
              </div>

              {/* 파트너 유형 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  파트너 유형<span className={styles.fieldRequired}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={partnerType}
                  onChange={(e) => setPartnerType(e.target.value)}
                >
                  <option value="influencer">인플루언서</option>
                  <option value="affiliate">제휴사</option>
                  <option value="internal">내부</option>
                  <option value="other">기타</option>
                </select>
              </div>

              {/* 사용 횟수 + 유효기간 */}
              <div className={styles.formRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>사용 횟수 제한</label>
                  <input
                    type="number"
                    className={`${styles.input} ${errors.maxUsages ? styles.inputError : ""}`}
                    value={maxUsages}
                    onChange={(e) => {
                      setMaxUsages(e.target.value);
                      if (errors.maxUsages)
                        setErrors((prev) => ({
                          ...prev,
                          maxUsages: undefined,
                        }));
                    }}
                    min={0}
                  />
                  {errors.maxUsages ? (
                    <p className={styles.fieldError}>{errors.maxUsages}</p>
                  ) : (
                    <p className={styles.fieldHint}>0 = 무제한</p>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    유효기간<span className={styles.fieldRequired}>*</span>
                  </label>
                  <div className={styles.dateRange}>
                    <input
                      type="date"
                      className={`${styles.input} ${errors.validFrom ? styles.inputError : ""}`}
                      value={validFrom}
                      onChange={(e) => {
                        setValidFrom(e.target.value);
                        if (errors.validFrom)
                          setErrors((prev) => ({
                            ...prev,
                            validFrom: undefined,
                          }));
                      }}
                    />
                    <span className={styles.dateSep}>~</span>
                    <input
                      type="date"
                      className={`${styles.input} ${errors.validUntil ? styles.inputError : ""}`}
                      value={validUntil}
                      onChange={(e) => {
                        setValidUntil(e.target.value);
                        if (errors.validUntil)
                          setErrors((prev) => ({
                            ...prev,
                            validUntil: undefined,
                          }));
                      }}
                      placeholder="무기한"
                    />
                  </div>
                  {errors.validFrom && (
                    <p className={styles.fieldError}>{errors.validFrom}</p>
                  )}
                  {errors.validUntil && (
                    <p className={styles.fieldError}>{errors.validUntil}</p>
                  )}
                  <p className={styles.fieldHint}>종료일 미지정 시 무기한</p>
                </div>
              </div>

              {/* 메모 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>메모 (선택)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="캠페인 이름 등 자유 기입"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={onClose}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className={styles.spinner} />
                    {isEdit ? "수정 중..." : "생성 중..."}
                  </>
                ) : isEdit ? (
                  "수정"
                ) : (
                  "생성"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
