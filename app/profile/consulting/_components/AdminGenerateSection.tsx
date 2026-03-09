"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import styles from "../page.module.css";

interface AdminGenerateSectionProps {
  userId: string;
}

const PLANS = [
  { value: "lite", label: "라이트" },
  { value: "standard", label: "스탠다드" },
  { value: "premium", label: "프리미엄" },
] as const;

export const AdminGenerateSection = ({ userId }: AdminGenerateSectionProps) => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<
    "lite" | "standard" | "premium"
  >("standard");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: selectedPlan }),
      });
      if (!res.ok) {
        let message = "리포트 생성에 실패했습니다.";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          // non-JSON response
        }
        throw new Error(message);
      }
      const data = await res.json();
      router.push(`/report/generating?orderId=${data.orderId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.adminGenerateSection}>
      <div className={styles.adminGenerateHeader}>
        <Plus size={16} />
        <span>리포트 생성 (어드민)</span>
      </div>
      <div className={styles.adminGeneratePlans}>
        {PLANS.map((plan) => (
          <button
            key={plan.value}
            className={`${styles.adminPlanButton} ${
              selectedPlan === plan.value ? styles.adminPlanButtonActive : ""
            }`}
            onClick={() => setSelectedPlan(plan.value)}
            disabled={generating}
          >
            {plan.label}
          </button>
        ))}
      </div>
      <button
        className={styles.generateButton}
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <>
            <Loader2 size={14} className={styles.spinner} />
            생성 중...
          </>
        ) : (
          `${PLANS.find((p) => p.value === selectedPlan)?.label} 리포트 생성`
        )}
      </button>
      {error && <p className={styles.generateError}>{error}</p>}
    </div>
  );
};
