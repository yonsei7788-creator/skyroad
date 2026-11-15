"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { JeongsiInput } from "@/libs/jeongsi/types";

import { takePendingInput } from "../_lib/pending-input";

import styles from "./page.module.css";

const MAX_RETRY = 3;

type Phase = "idle" | "running" | "completed" | "error";

/**
 * 라우트가 직접 보내는 stage 값 → 화면 문구.
 * PART 1~5 해설 단계는 build.ts 가 한국어 제목(title)을 그대로 보내므로
 * 여기에 없고, 아래 매핑에서 걸리지 않으면 받은 문자열을 그대로 쓴다.
 */
const STAGE_LABELS: Record<string, string> = {
  validate: "성적 확인",
  analyze: "대학별 환산점수 계산",
  build: "리포트 작성",
};

interface SseEvent {
  type?: string;
  reportId?: string;
  progress?: number;
  stage?: string;
  error?: string;
}

const GeneratingContent = () => {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  /** 재시도에 쓸 입력이 남아 있는지. 렌더에서 ref 를 읽지 않기 위한 미러 */
  const [hasInput, setHasInput] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const reportIdRef = useRef<string | null>(null);
  const terminalReceivedRef = useRef(false);
  /** sessionStorage 는 한 번만 비우고, 재시도는 이 값을 재사용한다 */
  const inputRef = useRef<JeongsiInput | null>(null);

  /**
   * SSE 가 completed/error 이벤트 없이 끊긴 경우,
   * DB 의 실제 ai_status 를 확인해 성공/실패를 확정한다.
   * (Vercel 타임아웃, Gemini 503, 네트워크 끊김 방어)
   */
  const verifyFinalStatus = useCallback(async (): Promise<void> => {
    const reportId = reportIdRef.current;
    if (!reportId) {
      setPhase("error");
      setError("서버 응답이 중단되었습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    try {
      const res = await fetch(`/api/jeongsi/${reportId}/status`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setPhase("error");
        setError("상태 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const body = (await res.json()) as {
        status: string;
        error?: string | null;
      };

      if (body.status === "completed") {
        setPhase("completed");
        setProgress(100);
        setCurrentStage(null);
        router.replace(`/jeongsi/${reportId}`);
        return;
      }

      setPhase("error");
      setError(
        body.error ?? "분석이 중단되었습니다. 잠시 후 다시 시도해 주세요."
      );
    } catch {
      setPhase("error");
      setError("상태 확인 중 오류가 발생했습니다.");
    }
  }, [router]);

  /**
   * 입력을 확보하고 analyze 엔드포인트의 SSE 스트림을 끝까지 소비한다.
   * 입력 조회까지 여기서 하는 이유는, 이펙트 본문에서 setState 를
   * 동기 호출하지 않기 위해서다.
   */
  const runGeneration = useCallback(
    async (controller: AbortController) => {
      // takePendingInput 은 꺼내면서 sessionStorage 를 비우므로,
      // 이미 꺼내 둔 값이 있으면 그걸 쓴다. (Strict Mode 이중 실행 대응)
      const input = inputRef.current ?? takePendingInput();
      if (!input) {
        setPhase("error");
        setError("입력 정보가 없습니다. 성적을 다시 입력해 주세요.");
        return;
      }

      inputRef.current = input;
      setHasInput(true);

      setPhase("running");
      setError(null);
      setProgress(0);
      setCurrentStage(null);
      terminalReceivedRef.current = false;
      reportIdRef.current = null;

      try {
        const res = await fetch("/api/jeongsi/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setPhase("error");
          setError(body.error ?? "알 수 없는 오류가 발생했습니다.");
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setPhase("error");
          setError("스트림을 읽을 수 없습니다.");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE 이벤트 파싱 (data: {...}\n\n)
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const dataLine = chunk.trim();
            if (!dataLine.startsWith("data: ")) continue;

            let data: SseEvent;
            try {
              data = JSON.parse(dataLine.slice(6)) as SseEvent;
            } catch {
              continue;
            }

            if (data.type === "init") {
              reportIdRef.current = data.reportId ?? null;
            } else if (data.type === "progress") {
              setProgress(data.progress ?? 0);
              setCurrentStage(
                data.stage ? (STAGE_LABELS[data.stage] ?? data.stage) : null
              );
            } else if (data.type === "completed") {
              terminalReceivedRef.current = true;
              setPhase("completed");
              setProgress(100);
              setCurrentStage(null);
              const reportId = data.reportId ?? reportIdRef.current;
              if (reportId) {
                router.replace(`/jeongsi/${reportId}`);
              }
            } else if (data.type === "error") {
              terminalReceivedRef.current = true;
              setPhase("error");
              setError(data.error ?? "분석에 실패했습니다.");
            }
          }
        }

        // 스트림이 terminal 이벤트 없이 끝났으면 DB 상태로 확정
        if (!terminalReceivedRef.current) {
          await verifyFinalStatus();
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setPhase("error");
        setError(
          err instanceof Error
            ? err.message
            : "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요."
        );
      }
    },
    [router, verifyFinalStatus]
  );

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      await runGeneration(controller);
    };
    run();

    return () => {
      controller.abort();
    };
  }, [runGeneration]);

  // 생성 중 이탈 방지
  useEffect(() => {
    if (phase !== "running") return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const handleRetry = () => {
    if (!inputRef.current) {
      router.push("/admin/jeongsi/new");
      return;
    }

    const nextRetry = retryCount + 1;
    if (nextRetry >= MAX_RETRY) {
      setExhausted(true);
      return;
    }
    setRetryCount(nextRetry);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    runGeneration(controller);
  };

  if (phase === "completed") {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.checkIcon} aria-hidden="true">
            &#10003;
          </div>
          <h1 className={styles.title}>정시 분석이 완료되었습니다</h1>
          <p className={styles.description}>
            리포트 화면으로 이동하고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <h1 className={styles.title}>정시 분석 중 문제가 발생했습니다</h1>
          <div className={styles.errorBox}>
            <p className={styles.errorMessage}>{error}</p>
            {exhausted ? (
              <p className={styles.contactMessage}>
                여러 번 시도했지만 문제가 해결되지 않았습니다.
                <br />
                잠시 후 성적 입력부터 다시 진행해 주세요.
              </p>
            ) : (
              <button
                type="button"
                className={styles.retryButton}
                onClick={handleRetry}
              >
                {hasInput ? "다시 시도" : "성적 다시 입력하기"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "running") {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div
            className={styles.spinner}
            role="status"
            aria-label="정시 분석 중"
          />
          <h1 className={styles.title}>수능 성적을 분석하고 있습니다</h1>
          {progress > 0 && (
            <div className={styles.progressArea}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={styles.progressText}>
                {progress}%{currentStage ? ` · ${currentStage}` : ""}
              </p>
            </div>
          )}
          <p className={styles.description}>
            전국 대학의 환산식을 적용하고 지원 조합을 구성하는 중입니다. 1~2분
            정도 걸립니다.
          </p>
          <div className={styles.noticeBox}>
            <p className={styles.noticeText}>
              <strong>이 페이지를 닫지 마세요.</strong>
              <br />
              분석이 중단될 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.spinner} role="status" aria-label="준비 중" />
        <h1 className={styles.title}>준비 중입니다</h1>
      </div>
    </div>
  );
};

const JeongsiGeneratingPage = () => {
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

export default JeongsiGeneratingPage;
