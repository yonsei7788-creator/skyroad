"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, CheckCircle2, ArrowRight } from "lucide-react";

import { useAuthStore } from "@/libs/store/auth-provider";

import { StepIndicator } from "./OnboardingStepIndicator";
import { ProfileStep } from "./ProfileStep";
import { UniversityStep } from "./UniversityStep";
import type { OnboardingStep, TargetUniversity } from "./types";

import styles from "../page.module.css";

interface ToastData {
  message: string;
  type: "success" | "error";
}

interface OnboardingWizardProps {
  initialStep: OnboardingStep;
  initialProfile: {
    name: string;
    phone: string;
    gender: "" | "male" | "female";
    highSchoolName: string;
    highSchoolType: string;
    highSchoolRegion: string;
    grade: string;
    admissionYear: number | null;
  };
  initialUniversities: TargetUniversity[];
}

export const OnboardingWizard = ({
  initialStep,
  initialProfile,
  initialUniversities,
}: OnboardingWizardProps) => {
  const router = useRouter();
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);

  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [isCompleted, setIsCompleted] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const updateStep = async (nextStep: OnboardingStep) => {
    try {
      await fetch("/api/onboarding/step", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: nextStep }),
      });
    } catch {
      showToast("단계 저장에 실패했습니다.", "error");
    }
  };

  const handleProfileComplete = async () => {
    const nextStep = 2 as OnboardingStep;
    await updateStep(nextStep);
    setStep(nextStep);
  };

  const completeOnboarding = async () => {
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
    });

    if (!res.ok) {
      showToast("온보딩 완료 처리에 실패했습니다.", "error");
      return;
    }

    setOnboardingCompleted(true);
    setIsCompleted(true);
  };

  const handleUniversityBack = () => {
    setStep(1 as OnboardingStep);
  };

  if (isCompleted) {
    return (
      <div className={styles.wizardSection}>
        <div className={styles.wizardContainer}>
          <div className={styles.wizardCard}>
            <div
              className={styles.completionSection}
              role="status"
              aria-live="polite"
            >
              <div className={styles.completionIconWrapper}>
                <CheckCircle2
                  size={44}
                  className={styles.completionIcon}
                  aria-hidden="true"
                />
              </div>
              <h2 className={styles.completionTitle}>
                입시 정보와 목표 대학이 설정되었습니다!
              </h2>
              <p className={styles.completionDesc}>
                생기부를 등록하면 AI 분석 리포트를 받을 수 있습니다
              </p>
              <div className={styles.completionActions}>
                <button
                  type="button"
                  className={styles.completionPrimaryBtn}
                  onClick={() => router.push("/record/submit")}
                  aria-label="생기부 등록 페이지로 이동"
                >
                  생기부 등록하러 가기
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className={styles.completionSecondaryLink}
                  onClick={() => router.push("/")}
                >
                  나중에 하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wizardSection}>
      <div className={styles.wizardHeader}>
        <h1 className={styles.wizardTitle}>시작하기</h1>
        <p className={styles.wizardSubtitle}>
          분석에 필요한 정보를 단계별로 입력해주세요
        </p>
      </div>

      <div className={styles.wizardContainer}>
        <StepIndicator currentStep={step} />

        <div className={styles.wizardCard}>
          {step === 1 && (
            <ProfileStep
              initialData={initialProfile}
              onComplete={handleProfileComplete}
            />
          )}

          {step === 2 && (
            <UniversityStep
              initialData={initialUniversities}
              onComplete={completeOnboarding}
              onBack={handleUniversityBack}
            />
          )}
        </div>
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
