"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Gift, ArrowRight } from "lucide-react";

import styles from "../page.module.css";

/* ============================================
   Types
   ============================================ */

interface ReferralCodeFormProps {
  existingCoupon: {
    discountAmount: number;
    isUsed: boolean;
    expiresAt: string;
  } | null;
}

type ValidateStatus = "idle" | "checking" | "valid" | "invalid";

/* ============================================
   Helpers
   ============================================ */

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("ko-KR").format(amount);

/* ============================================
   Component
   ============================================ */

export const ReferralCodeForm = ({ existingCoupon }: ReferralCodeFormProps) => {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<ValidateStatus>("idle");
  const [message, setMessage] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCoupon, setSuccessCoupon] = useState<{
    discountAmount: number;
    expiresAt: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate
  const validate = useCallback(async (value: string) => {
    if (value.trim().length < 4) {
      setStatus("idle");
      setMessage("");
      return;
    }

    setStatus("checking");
    try {
      const res = await fetch("/api/referral-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setStatus("valid");
        setMessage(
          `${formatCurrency(data.discountAmount)}원 할인 쿠폰이 발급됩니다.`
        );
        setDiscountAmount(data.discountAmount);
      } else {
        setStatus("invalid");
        setMessage(data.message ?? "유효하지 않은 코드입니다.");
        setDiscountAmount(0);
      }
    } catch {
      setStatus("invalid");
      setMessage("코드 확인에 실패했습니다.");
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const upper = e.target.value.toUpperCase();
      setCode(upper);
      setStatus("idle");
      setMessage("");

      if (timerRef.current) clearTimeout(timerRef.current);
      if (upper.trim().length >= 4) {
        timerRef.current = setTimeout(() => validate(upper), 500);
      }
    },
    [validate]
  );

  // Apply
  const handleSubmit = useCallback(async () => {
    if (status !== "valid" || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/referral-codes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setSuccessCoupon({
          discountAmount: data.coupon.discountAmount,
          expiresAt: data.coupon.expiresAt,
        });
      } else {
        setStatus("invalid");
        setMessage(data.message ?? "코드 적용에 실패했습니다.");
      }
    } catch {
      setStatus("invalid");
      setMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [status, code]);

  // Already used
  if (existingCoupon) {
    const isExpired = new Date(existingCoupon.expiresAt) < new Date();

    return (
      <section className={styles.section}>
        <div className={styles.heroArea}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <p className={styles.sectionLabel}>Referral Code</p>
            <h1 className={styles.heroTitle}>추천인 코드</h1>
          </div>
        </div>
        <div className={styles.cardArea}>
          <div className={`${styles.card} ${styles.usedCard}`}>
            <div className={styles.usedIcon}>
              <Check size={24} />
            </div>
            <h2 className={styles.usedTitle}>
              이미 추천인 코드를 사용했습니다
            </h2>
            <div className={styles.usedInfo}>
              <div className={styles.usedRow}>
                <span className={styles.usedLabel}>할인 쿠폰</span>
                <span className={styles.usedValue}>
                  {formatCurrency(existingCoupon.discountAmount)}원
                </span>
              </div>
              <div className={styles.usedRow}>
                <span className={styles.usedLabel}>상태</span>
                <span className={styles.usedValue}>
                  {existingCoupon.isUsed
                    ? "사용 완료"
                    : isExpired
                      ? "만료됨"
                      : "사용 가능"}
                </span>
              </div>
              <div className={styles.usedRow}>
                <span className={styles.usedLabel}>만료일</span>
                <span
                  className={`${styles.usedValue} ${isExpired ? styles.usedExpired : ""}`}
                >
                  {formatDate(existingCoupon.expiresAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Success
  if (isSuccess && successCoupon) {
    return (
      <section className={styles.section}>
        <div className={styles.heroArea}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <p className={styles.sectionLabel}>Referral Code</p>
            <h1 className={styles.heroTitle}>추천인 코드</h1>
          </div>
        </div>
        <div className={styles.cardArea}>
          <div className={`${styles.card} ${styles.successCard}`}>
            <div className={styles.successIcon}>
              <Gift size={28} />
            </div>
            <h2 className={styles.successTitle}>쿠폰이 발급되었습니다!</h2>
            <p className={styles.successDesc}>
              {formatCurrency(successCoupon.discountAmount)}원 할인 쿠폰이
              발급되었습니다.
              <br />
              만료일: {formatDate(successCoupon.expiresAt)}
            </p>
            <Link href="/pricing" className={styles.successLink}>
              리포트 구매하기
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Input form
  return (
    <section className={styles.section}>
      <div className={styles.heroArea}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <p className={styles.sectionLabel}>Referral Code</p>
          <h1 className={styles.heroTitle}>추천인 코드 입력</h1>
          <p className={styles.heroDesc}>
            추천인 코드가 있다면 입력하고
            <br />
            할인 쿠폰을 받으세요!
          </p>
        </div>
      </div>

      <div className={styles.cardArea}>
        <div className={styles.card}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>추천인 코드</label>
            <div className={styles.inputRow}>
              <input
                type="text"
                className={`${styles.input} ${
                  status === "valid"
                    ? styles.inputValid
                    : status === "invalid"
                      ? styles.inputError
                      : ""
                }`}
                placeholder="코드를 입력하세요"
                value={code}
                onChange={handleChange}
                maxLength={20}
                autoComplete="off"
              />
            </div>
          </div>

          <div className={styles.statusRow}>
            {status === "checking" && (
              <span className={styles.statusChecking}>
                <Loader2 size={14} className={styles.spinner} /> 확인 중...
              </span>
            )}
            {status === "valid" && (
              <span className={styles.statusValid}>
                <Check size={14} /> {message}
              </span>
            )}
            {status === "invalid" && (
              <span className={styles.statusInvalid}>{message}</span>
            )}
          </div>

          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={status !== "valid" || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className={styles.spinner} /> 적용 중...
              </>
            ) : (
              `쿠폰 받기${discountAmount ? ` (${formatCurrency(discountAmount)}원)` : ""}`
            )}
          </button>

          <p className={styles.footnote}>
            추천인 코드는 1인 1회만 사용 가능합니다.
          </p>
        </div>
      </div>
    </section>
  );
};
