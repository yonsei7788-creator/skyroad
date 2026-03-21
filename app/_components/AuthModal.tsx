"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";

import { createClient } from "@/libs/supabase/client";
import { useAuthStore } from "@/libs/store/auth-provider";

import styles from "./AuthModal.module.css";

type TabType = "login" | "signup";

interface ConsentState {
  termsOfService: boolean;
  privacyPolicy: boolean;
  ageVerification: boolean;
  marketingConsent: boolean;
}

const INITIAL_CONSENT: ConsentState = {
  termsOfService: false,
  privacyPolicy: false,
  ageVerification: false,
  marketingConsent: false,
};

const PASSWORD_REGEX =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,15}$/;

const validatePassword = (pw: string): string | null => {
  if (!PASSWORD_REGEX.test(pw)) {
    return "영문, 숫자, 특수문자 조합 8~15자여야 합니다.";
  }
  return null;
};

const translateError = (message: string): string => {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("User already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  if (message.includes("Password should be at least")) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }
  return message;
};

export const AuthModal = () => {
  const router = useRouter();
  const isOpen = useAuthStore((s) => s.isAuthModalOpen);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);

  const [activeTab, setActiveTab] = useState<TabType>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [consent, setConsent] = useState<ConsentState>(INITIAL_CONSENT);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    passwordConfirm: false,
  });

  // Referral code
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [referralMessage, setReferralMessage] = useState("");
  const [referralDiscount, setReferralDiscount] = useState(0);
  const referralTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAuthModal();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const [first] = focusable;
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [closeAuthModal]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      modalRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    }, 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      clearTimeout(timer);
    };
  }, [isOpen, handleKeyDown]);

  const requiredConsentsChecked =
    consent.termsOfService && consent.privacyPolicy && consent.ageVerification;
  const requiredSignInField = !!email && !!password;

  const allConsentsChecked =
    requiredConsentsChecked && consent.marketingConsent;

  const isPasswordValid = PASSWORD_REGEX.test(password);

  const handleToggleAll = () => {
    const nextValue = !allConsentsChecked;
    setConsent({
      termsOfService: nextValue,
      privacyPolicy: nextValue,
      ageVerification: nextValue,
      marketingConsent: nextValue,
    });
  };

  const handleConsentChange = (key: keyof ConsentState) => {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const emailError =
    touched.email && email.length === 0
      ? "이메일을 입력해주세요."
      : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "올바른 이메일 형식을 입력해주세요."
        : null;

  const passwordError =
    touched.password && password.length === 0
      ? "비밀번호를 입력해주세요."
      : touched.password
        ? validatePassword(password)
        : null;

  const passwordConfirmError =
    touched.passwordConfirm && passwordConfirm.length === 0
      ? "비밀번호 확인을 입력해주세요."
      : touched.passwordConfirm && password !== passwordConfirm
        ? "비밀번호가 일치하지 않습니다."
        : null;

  // Referral code validation (debounced)
  const validateReferralCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setReferralStatus("idle");
      setReferralMessage("");
      return;
    }

    setReferralStatus("checking");
    try {
      const response = await fetch("/api/referral-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await response.json();
      if (data.valid) {
        setReferralStatus("valid");
        setReferralMessage(
          `${data.discountAmount.toLocaleString("ko-KR")}원 할인 쿠폰이 발급됩니다.`
        );
        setReferralDiscount(data.discountAmount);
      } else {
        setReferralStatus("invalid");
        setReferralMessage(data.message ?? "유효하지 않은 코드입니다.");
        setReferralDiscount(0);
      }
    } catch {
      setReferralStatus("invalid");
      setReferralMessage("코드 확인에 실패했습니다.");
      setReferralDiscount(0);
    }
  }, []);

  const handleReferralChange = useCallback(
    (value: string) => {
      const upper = value.toUpperCase();
      setReferralCode(upper);
      setReferralStatus("idle");
      setReferralMessage("");

      if (referralTimerRef.current) clearTimeout(referralTimerRef.current);
      if (upper.trim().length >= 4) {
        referralTimerRef.current = setTimeout(() => {
          validateReferralCode(upper);
        }, 500);
      }
    },
    [validateReferralCode]
  );

  const handleTabSwitch = (tab: TabType) => {
    setActiveTab(tab);
    setErrorMessage("");
    setPassword("");
    setPasswordConfirm("");
    setConsent(INITIAL_CONSENT);
    setTouched({ email: false, password: false, passwordConfirm: false });
    setReferralCode("");
    setReferralStatus("idle");
    setReferralMessage("");
    setReferralDiscount(0);
  };

  const handleSignIn = async () => {
    setErrorMessage("");
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(translateError(error.message));
      return;
    }

    closeAuthModal();
    router.refresh();
  };

  const handleSignUp = async () => {
    setErrorMessage("");

    const pwError = validatePassword(password);
    if (pwError) {
      setErrorMessage(pwError);
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!requiredConsentsChecked) {
      setErrorMessage("필수 동의 항목을 모두 체크해주세요.");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      setErrorMessage(translateError(error.message));
      return;
    }

    if (data.user) {
      await supabase.from("consent_records").insert({
        user_id: data.user.id,
        terms_of_service: true,
        privacy_policy: true,
        age_verification: true,
        marketing_consent: consent.marketingConsent,
      });
    }

    await supabase.auth.signInWithPassword({ email, password });

    // 추천인 코드 적용 (유효한 경우에만)
    if (referralCode.trim() && referralStatus === "valid") {
      try {
        await fetch("/api/referral-codes/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: referralCode.trim() }),
        });
      } catch {
        // 코드 적용 실패해도 회원가입은 정상 진행
      }
    }

    setIsLoading(false);
    closeAuthModal();
    router.push("/profile/settings");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      email: true,
      password: true,
      passwordConfirm: true,
    });
    if (activeTab === "login") {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeAuthModal();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            ref={modalRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={activeTab === "login" ? "로그인" : "회원가입"}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeAuthModal}
              aria-label="닫기"
            >
              <X size={20} />
            </button>

            <div className={styles.logoWrap}>
              <Image
                src="/images/skyroad-logo.png"
                alt="SKYROAD"
                width={200}
                height={86}
              />
            </div>

            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "login"}
                className={`${styles.tab} ${
                  activeTab === "login" ? styles.tabActive : ""
                }`}
                onClick={() => handleTabSwitch("login")}
              >
                로그인
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "signup"}
                className={`${styles.tab} ${
                  activeTab === "signup" ? styles.tabActive : ""
                }`}
                onClick={() => handleTabSwitch("signup")}
              >
                회원가입
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="auth-email" className={styles.label}>
                  이메일
                </label>
                <input
                  id="auth-email"
                  type="email"
                  className={`${styles.input} ${emailError ? styles.inputError : ""}`}
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  required
                  autoComplete="email"
                />
                {emailError && (
                  <p className={styles.fieldError}>{emailError}</p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="auth-password" className={styles.label}>
                  비밀번호
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className={`${styles.input} ${passwordError ? styles.inputError : ""}`}
                  placeholder="영문, 숫자, 특수문자 포함 8~15자"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  required
                  minLength={8}
                  maxLength={15}
                  autoComplete={
                    activeTab === "login" ? "current-password" : "new-password"
                  }
                />
                {passwordError && (
                  <p className={styles.fieldError}>{passwordError}</p>
                )}
                {activeTab === "signup" && password.length > 0 && (
                  <p
                    className={
                      isPasswordValid
                        ? styles.passwordHintValid
                        : styles.passwordHint
                    }
                  >
                    {isPasswordValid
                      ? "사용 가능한 비밀번호입니다."
                      : "영문, 숫자, 특수문자를 포함한 8~15자"}
                  </p>
                )}
              </div>

              {activeTab === "signup" && (
                <>
                  <div className={styles.field}>
                    <label
                      htmlFor="auth-password-confirm"
                      className={styles.label}
                    >
                      비밀번호 확인
                    </label>
                    <input
                      id="auth-password-confirm"
                      type="password"
                      className={`${styles.input} ${passwordConfirmError ? styles.inputError : ""}`}
                      placeholder="비밀번호를 다시 입력"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      onBlur={() => handleBlur("passwordConfirm")}
                      required
                      autoComplete="new-password"
                    />
                    {passwordConfirmError && (
                      <p className={styles.fieldError}>
                        {passwordConfirmError}
                      </p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="auth-referral" className={styles.label}>
                      추천인 코드
                      <span className={styles.labelOptional}>(선택)</span>
                    </label>
                    <div className={styles.referralInputRow}>
                      <input
                        id="auth-referral"
                        type="text"
                        className={`${styles.input} ${styles.referralInput} ${
                          referralStatus === "invalid"
                            ? styles.inputError
                            : referralStatus === "valid"
                              ? styles.inputSuccess
                              : ""
                        }`}
                        placeholder="추천인 코드 입력"
                        value={referralCode}
                        onChange={(e) => handleReferralChange(e.target.value)}
                        maxLength={20}
                        autoComplete="off"
                      />
                      {referralStatus === "checking" && (
                        <Loader2 size={16} className={styles.referralSpinner} />
                      )}
                      {referralStatus === "valid" && (
                        <Check size={16} className={styles.referralCheck} />
                      )}
                    </div>
                    {referralMessage && (
                      <p
                        className={
                          referralStatus === "valid"
                            ? styles.referralValid
                            : styles.referralInvalid
                        }
                      >
                        {referralMessage}
                      </p>
                    )}
                  </div>

                  <div className={styles.consentSection}>
                    <label className={styles.consentAll}>
                      <input
                        type="checkbox"
                        checked={allConsentsChecked}
                        onChange={handleToggleAll}
                      />
                      전체 동의
                    </label>
                    <div className={styles.consentDivider} />
                    <label className={styles.consentItem}>
                      <input
                        type="checkbox"
                        checked={consent.termsOfService}
                        onChange={() => handleConsentChange("termsOfService")}
                      />
                      <span
                        className={`${styles.consentBadge} ${styles.consentRequired}`}
                      >
                        [필수]
                      </span>
                      이용약관 동의
                    </label>
                    <label className={styles.consentItem}>
                      <input
                        type="checkbox"
                        checked={consent.privacyPolicy}
                        onChange={() => handleConsentChange("privacyPolicy")}
                      />
                      <span
                        className={`${styles.consentBadge} ${styles.consentRequired}`}
                      >
                        [필수]
                      </span>
                      개인정보 수집·이용 동의
                    </label>
                    <label className={styles.consentItem}>
                      <input
                        type="checkbox"
                        checked={consent.ageVerification}
                        onChange={() => handleConsentChange("ageVerification")}
                      />
                      <span
                        className={`${styles.consentBadge} ${styles.consentRequired}`}
                      >
                        [필수]
                      </span>
                      만 14세 이상 확인
                    </label>
                    <label className={styles.consentItem}>
                      <input
                        type="checkbox"
                        checked={consent.marketingConsent}
                        onChange={() => handleConsentChange("marketingConsent")}
                      />
                      <span
                        className={`${styles.consentBadge} ${styles.consentOptional}`}
                      >
                        [선택]
                      </span>
                      마케팅 수신 동의
                    </label>
                  </div>
                </>
              )}

              {errorMessage && (
                <p className={styles.error} role="alert">
                  {errorMessage}
                </p>
              )}

              <div className={styles.submitArea}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={
                    isLoading ||
                    (activeTab === "signup" && !requiredConsentsChecked) ||
                    (activeTab === "login" && !requiredSignInField)
                  }
                >
                  {isLoading
                    ? "처리 중..."
                    : activeTab === "login"
                      ? "로그인"
                      : "회원가입"}
                </button>

                <p className={styles.switchText}>
                  {activeTab === "login"
                    ? "계정이 없으신가요?"
                    : "이미 계정이 있으신가요?"}
                  <button
                    type="button"
                    className={styles.switchButton}
                    onClick={() =>
                      handleTabSwitch(
                        activeTab === "login" ? "signup" : "login"
                      )
                    }
                  >
                    {activeTab === "login" ? "회원가입" : "로그인"}
                  </button>
                </p>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
