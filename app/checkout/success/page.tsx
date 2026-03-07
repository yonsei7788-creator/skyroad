"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

import styles from "../page.module.css";

const CheckoutSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"confirming" | "confirmed" | "error">(
    "confirming"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setError("결제 정보가 올바르지 않습니다.");
      return;
    }

    const confirmPayment = async () => {
      try {
        const confirmRes = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        if (!confirmRes.ok) {
          const confirmErr = await confirmRes.json();
          throw new Error(confirmErr.error ?? "결제 확인에 실패했습니다.");
        }

        const { orderId: confirmedOrderId } = await confirmRes.json();

        setStatus("confirmed");

        router.replace(`/report/generating?orderId=${confirmedOrderId}`);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "결제 처리 중 오류가 발생했습니다."
        );
      }
    };

    confirmPayment();
  }, [searchParams, router]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        {status === "error" ? (
          <>
            <AlertTriangle
              size={48}
              style={{ color: "var(--color-error-600)", margin: "0 auto" }}
            />
            <h1 className={styles.title} style={{ marginTop: 16 }}>
              결제 처리 중 문제가 발생했습니다
            </h1>
          </>
        ) : (
          <>
            {status === "confirming" ? (
              <Loader2
                size={48}
                style={{ color: "var(--color-primary-600)", margin: "0 auto" }}
                className="animate-spin"
              />
            ) : (
              <CheckCircle
                size={48}
                style={{
                  color: "var(--color-success-600)",
                  margin: "0 auto",
                }}
              />
            )}
            <h1 className={styles.title} style={{ marginTop: 16 }}>
              {status === "confirming"
                ? "결제를 확인하고 있습니다..."
                : "결제가 완료되었습니다!"}
            </h1>
            <p className={styles.subtitle}>
              {status === "confirming"
                ? "잠시만 기다려주세요."
                : "AI 분석 페이지로 이동합니다. 페이지를 닫지 마세요."}
            </p>
          </>
        )}
      </div>

      {status === "error" && (
        <div className={styles.container}>
          <div className={styles.errorBox}>{error}</div>
          <div className={styles.infoBox}>
            <AlertTriangle size={16} />
            <span>
              결제가 완료되었으나 확인 과정에서 오류가 발생했을 수 있습니다.
              문제가 지속되면 고객센터로 문의해주세요.
            </span>
          </div>
          <Link href="/profile/consulting" className={styles.backLink}>
            컨설팅 내역에서 확인하기
          </Link>
        </div>
      )}
    </section>
  );
};

const CheckoutSuccessPage = () => {
  return (
    <Suspense
      fallback={
        <section className={styles.section}>
          <div className={styles.header}>
            <Loader2
              size={48}
              style={{ color: "var(--color-primary-600)", margin: "0 auto" }}
              className="animate-spin"
            />
            <h1 className={styles.title} style={{ marginTop: 16 }}>
              결제를 확인하고 있습니다...
            </h1>
            <p className={styles.subtitle}>잠시만 기다려주세요.</p>
          </div>
        </section>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
};

export default CheckoutSuccessPage;
