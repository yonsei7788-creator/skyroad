"use client";

import { useState } from "react";
import { Check, Loader2, Play } from "lucide-react";

import styles from "../page.module.css";

interface GenerateReportButtonProps {
  orderId: string;
  reportId?: string;
  label?: string;
}

export const GenerateReportButton = ({
  orderId,
  reportId,
  label = "리포트 생성",
}: GenerateReportButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok || res.status === 409) {
        setIsSubmitted(true);
        return;
      }

      const body = await res
        .json()
        .catch(() => ({ error: "서버 오류가 발생했습니다." }));

      setError(body.error ?? "리포트 생성에 실패했습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles.submittedBox}>
        <Check size={16} />
        <span>
          리포트 생성이 요청되었습니다. 완료 시 이메일로 안내드리겠습니다. (최대
          48시간 소요)
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={styles.generateButton}
        onClick={handleGenerate}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            요청중...
          </>
        ) : (
          <>
            <Play size={14} />
            {label}
          </>
        )}
      </button>
      {error && <p className={styles.generateError}>{error}</p>}
    </div>
  );
};
