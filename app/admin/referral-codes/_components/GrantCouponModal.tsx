"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  AlertCircle,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";

import styles from "./grant-coupon-modal.module.css";

/* ============================================
   Types
   ============================================ */

interface GrantCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface EligibleUser {
  id: string;
  email: string;
  name: string | null;
}

interface FormErrors {
  user?: string;
  referralCode?: string;
}

/* ============================================
   Component
   ============================================ */

export const GrantCouponModal = ({
  isOpen,
  onClose,
  onSuccess,
}: GrantCouponModalProps) => {
  // Users
  const [users, setUsers] = useState<EligibleUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Form
  const [selectedUser, setSelectedUser] = useState<EligibleUser | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User select dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch eligible users
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await fetch("/api/admin/referral-codes/grant-coupon");
        if (res.ok) {
          const { data } = await res.json();
          setUsers(data);
        }
      } catch {
        /* ignore */
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setSelectedUser(null);
      setReferralCode("");
      setErrors({});
      setServerError("");
      setUserSearch("");
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isDropdownOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isDropdownOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, isDropdownOpen, onClose]);

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  const handleSelectUser = useCallback((user: EligibleUser) => {
    setSelectedUser(user);
    setIsDropdownOpen(false);
    setUserSearch("");
    setErrors((prev) => ({ ...prev, user: undefined }));
  }, []);

  // Validate
  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!selectedUser) {
      errs.user = "유저를 선택해주세요.";
    }
    if (!referralCode.trim()) {
      errs.referralCode = "추천인 코드를 입력해주세요.";
    }
    return errs;
  }, [selectedUser, referralCode]);

  // Submit
  const handleSubmit = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setServerError("");

    try {
      const res = await fetch("/api/admin/referral-codes/grant-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser!.id,
          referralCode: referralCode.trim().toUpperCase(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setServerError(data.error ?? "요청에 실패했습니다.");
        return;
      }

      onSuccess();
    } catch {
      setServerError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, selectedUser, referralCode, onSuccess]);

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
            aria-label="쿠폰 지급"
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>쿠폰 지급</h2>
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

              {/* 유저 선택 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  유저 선택<span className={styles.fieldRequired}>*</span>
                </label>
                <div className={styles.selectWrapper} ref={dropdownRef}>
                  <button
                    type="button"
                    className={`${styles.selectTrigger} ${errors.user ? styles.inputError : ""}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isLoadingUsers}
                  >
                    <span
                      className={
                        selectedUser
                          ? styles.selectValue
                          : styles.selectPlaceholder
                      }
                    >
                      {isLoadingUsers
                        ? "유저 목록 불러오는 중..."
                        : selectedUser
                          ? `${selectedUser.name ?? "이름 없음"} | ${selectedUser.email}`
                          : "유저를 선택하세요"}
                    </span>
                    {isLoadingUsers ? (
                      <Loader2 size={14} className={styles.spinner} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>

                  {isDropdownOpen && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownSearch}>
                        <Search size={14} />
                        <input
                          ref={searchInputRef}
                          type="text"
                          className={styles.dropdownSearchInput}
                          placeholder="이름 또는 이메일 검색..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                      </div>
                      <div className={styles.dropdownList}>
                        {filteredUsers.length === 0 ? (
                          <div className={styles.dropdownEmpty}>
                            {userSearch
                              ? "검색 결과가 없습니다."
                              : "지급 가능한 유저가 없습니다."}
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className={`${styles.dropdownItem} ${
                                selectedUser?.id === user.id
                                  ? styles.dropdownItemSelected
                                  : ""
                              }`}
                              onClick={() => handleSelectUser(user)}
                            >
                              <span>
                                {user.name ?? "이름 없음"}{" "}
                                <span className={styles.dropdownItemEmail}>
                                  | {user.email}
                                </span>
                              </span>
                              {selectedUser?.id === user.id && (
                                <Check size={14} />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.user && (
                  <p className={styles.fieldError}>{errors.user}</p>
                )}
                <p className={styles.fieldHint}>
                  추천인 코드를 사용하지 않은 유저만 표시됩니다.
                </p>
              </div>

              {/* 추천인 코드 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  추천인 코드<span className={styles.fieldRequired}>*</span>
                </label>
                <input
                  type="text"
                  className={`${styles.input} ${errors.referralCode ? styles.inputError : ""}`}
                  placeholder="SKYROAD00"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value.toUpperCase());
                    if (errors.referralCode)
                      setErrors((prev) => ({
                        ...prev,
                        referralCode: undefined,
                      }));
                  }}
                  maxLength={20}
                />
                {errors.referralCode && (
                  <p className={styles.fieldError}>{errors.referralCode}</p>
                )}
                <p className={styles.fieldHint}>
                  해당 코드의 할인금액으로 쿠폰이 지급됩니다.
                </p>
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
                    지급 중...
                  </>
                ) : (
                  "지급"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
