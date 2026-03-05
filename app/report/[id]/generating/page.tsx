"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import styles from "./page.module.css";

const POLL_INTERVAL = 3000;
const MAX_RETRY = 3;

const GeneratingContent = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [phase, setPhase] = useState<
    "idle" | "dispatching" | "polling" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  const calledRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 진행률 폴링
  const startPolling = useCallback(() => {
    if (pollRef.current) return;

    setPhase("polling");

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/reports/${id}/status`);
        if (!res.ok) return;

        const data = await res.json();

        setProgress(data.progress ?? 0);
        setCurrentSection(data.currentSection ?? null);

        if (data.status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          router.replace(`/report/${id}`);
        } else if (data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setPhase("error");
          setError(data.error ?? "리포트 생성에 실패했습니다.");
        }
      } catch {
        // 네트워크 오류는 무시하고 다음 폴링에서 재시도
      }
    }, POLL_INTERVAL);
  }, [id, router]);

  // 리포트 생성 요청 + 폴링 시작
  const generateReport = useCallback(async () => {
    if (!orderId) {
      setPhase("error");
      setError("주문 정보가 없습니다. 결제 내역에서 다시 시도해 주세요.");
      return;
    }

    setPhase("dispatching");
    setError(null);
    setProgress(0);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const body = await res
        .json()
        .catch(() => ({ error: "서버 오류가 발생했습니다." }));

      if (res.ok) {
        // API가 즉시 응답 — Edge Function이 백그라운드 실행 중
        startPolling();
        return;
      }

      if (res.status === 409) {
        if (body.error?.includes("완료")) {
          router.replace(`/report/${id}`);
          return;
        }
        if (body.error?.includes("생성 중")) {
          // 이미 처리 중 → 폴링 시작
          startPolling();
          return;
        }
      }

      setPhase("error");
      setError(body.error ?? "알 수 없는 오류가 발생했습니다.");
    } catch {
      setPhase("error");
      setError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.");
    }
  }, [orderId, id, router, startPolling]);

  // 마운트 시 자동 호출
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 초기 마운트 시 1회 호출
    generateReport();
  }, [generateReport]);

  // 클린업
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // beforeunload 이탈 방지
  useEffect(() => {
    if (phase !== "dispatching" && phase !== "polling") return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const handleRetry = () => {
    const nextRetry = retryCount + 1;
    if (nextRetry >= MAX_RETRY) {
      setExhausted(true);
      return;
    }
    setRetryCount(nextRetry);
    calledRef.current = false;
    generateReport();
  };

  const isWorking = phase === "dispatching" || phase === "polling";

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {isWorking ? (
          <>
            <div
              className={styles.spinner}
              role="status"
              aria-label="리포트 생성 중"
            />
            <h1 className={styles.title}>AI가 생기부를 분석하고 있습니다</h1>
            {progress > 0 && (
              <div className={styles.progressArea}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={styles.progressText}>
                  {progress}%{currentSection ? ` · ${currentSection}` : ""}
                </p>
              </div>
            )}
            <p className={styles.description}>
              잠시만 기다려 주세요. 분석에 3~5분 정도 소요됩니다.
            </p>
            <p className={styles.warning}>
              페이지를 닫아도 분석은 계속 진행됩니다.
            </p>
          </>
        ) : phase === "error" ? (
          <>
            <h1 className={styles.title}>리포트 생성 중 문제가 발생했습니다</h1>
            <div className={styles.errorBox}>
              <p className={styles.errorMessage}>{error}</p>
              {exhausted ? (
                <p className={styles.contactMessage}>
                  여러 번 시도했지만 문제가 해결되지 않았습니다.
                  <br />
                  고객센터에 문의해 주세요.
                </p>
              ) : (
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={handleRetry}
                >
                  다시 시도
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div
              className={styles.spinner}
              role="status"
              aria-label="준비 중"
            />
            <h1 className={styles.title}>준비 중입니다</h1>
          </>
        )}
      </div>
    </div>
  );
};

const GeneratingPage = () => {
  return (
    <Suspense
      fallback={
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <div
              className={styles.spinner}
              role="status"
              aria-label="로딩 중"
            />
            <h1 className={styles.title}>준비 중입니다</h1>
          </div>
        </div>
      }
    >
      <GeneratingContent />
    </Suspense>
  );
};

export default GeneratingPage;
