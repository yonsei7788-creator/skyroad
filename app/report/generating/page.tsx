"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./page.module.css";

const MAX_RETRY = 3;

type Phase = "idle" | "running" | "completed" | "error";

const TASK_LABELS: Record<string, string> = {
  preprocess: "데이터 준비",
  phase2: "기초 분석",
  studentProfile: "학생 프로필",
  competencyScore: "역량 점수",
  academicAnalysis: "학업 분석",
  attendanceAnalysis: "출결 분석",
  activityAnalysis: "활동 분석",
  courseAlignment: "과목 적합도",
  subjectAnalysis: "과목별 분석",
  behaviorAnalysis: "행동특성 분석",
  weaknessAnalysis: "약점 분석",
  topicRecommendation: "주제 추천",
  interviewPrep: "면접 준비",
  admissionPrediction: "희망 학교·학과 판단",
  admissionStrategy: "입시 전략",
  directionGuide: "방향 가이드",
  storyAnalysis: "스토리 분석",
  actionRoadmap: "실행 로드맵",
  majorExploration: "학과 탐색",
};

const GeneratingContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isAdmin = searchParams.get("from") === "admin";

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!orderId) {
      setPhase("error");
      setError("주문 정보가 없습니다. 결제 내역에서 다시 시도해 주세요.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      setPhase("running");
      setError(null);
      setProgress(0);

      try {
        const res = await fetch("/api/reports/run-pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 409 && body.error?.includes("완료")) {
            router.replace(isAdmin ? "/admin/reports" : "/profile/consulting");
            return;
          }
          setPhase("error");
          setError(body.error ?? "알 수 없는 오류가 발생했습니다.");
          return;
        }

        // SSE 스트림 읽기
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
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const dataLine = line.trim();
            if (!dataLine.startsWith("data: ")) continue;

            try {
              const data = JSON.parse(dataLine.slice(6));

              if (data.type === "progress") {
                setProgress(data.progress);
                const label = TASK_LABELS[data.section] ?? data.section;
                setCurrentSection(label);
              } else if (data.type === "completed") {
                setPhase("completed");
                setProgress(100);
                setCurrentSection(null);
              } else if (data.type === "error") {
                setPhase("error");
                setError(data.error);
              }
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }

        // 스트림 종료 후 phase가 아직 running이면 완료 처리
        setPhase((prev) => (prev === "running" ? "completed" : prev));
      } catch (err) {
        if (controller.signal.aborted) return;
        setPhase("error");
        setError(
          err instanceof Error
            ? err.message
            : "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요."
        );
      }
    };

    run();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // beforeunload 이탈 방지
  useEffect(() => {
    if (phase !== "running") return;

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

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("running");
    setError(null);
    setProgress(0);

    const run = async () => {
      try {
        const res = await fetch("/api/reports/run-pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
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
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const dataLine = line.trim();
            if (!dataLine.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(dataLine.slice(6));
              if (data.type === "progress") {
                setProgress(data.progress);
                setCurrentSection(TASK_LABELS[data.section] ?? data.section);
              } else if (data.type === "completed") {
                setPhase("completed");
                setProgress(100);
                setCurrentSection(null);
              } else if (data.type === "error") {
                setPhase("error");
                setError(data.error);
              }
            } catch {
              // ignore
            }
          }
        }

        setPhase((prev) => (prev === "running" ? "completed" : prev));
      } catch (err) {
        if (controller.signal.aborted) return;
        setPhase("error");
        setError(
          err instanceof Error ? err.message : "네트워크 오류가 발생했습니다."
        );
      }
    };

    run();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {phase === "completed" ? (
          <>
            <div className={styles.checkIcon} aria-hidden="true">
              &#10003;
            </div>
            <h1 className={styles.title}>컨설턴트에게 자료가 전송되었습니다</h1>
            <p className={styles.description}>
              전문 컨설턴트의 검수를 거쳐{" "}
              <strong>72시간 이내에 이메일로 결과물이 발송</strong>됩니다.
            </p>
            <p className={styles.warning}>
              발송 완료 시 가입하신 이메일로 안내 드리겠습니다.
            </p>
            <button
              type="button"
              className={styles.retryButton}
              style={{ marginTop: 24 }}
              onClick={() =>
                router.push(isAdmin ? "/admin/reports" : "/profile/consulting")
              }
            >
              {isAdmin ? "리포트 관리로 이동" : "컨설팅 내역으로 이동"}
            </button>
          </>
        ) : phase === "running" ? (
          <>
            <div
              className={styles.spinner}
              role="status"
              aria-label="리포트 생성 중"
            />
            <h1 className={styles.title}>
              생기부 데이터를 추출하는 중입니다.{" "}
            </h1>
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
              잠시만 기다려 주세요. 생기부 추출에 2~3분 정도 소요됩니다.
            </p>
            <div className={styles.noticeBox}>
              <p className={styles.noticeText}>
                <strong>이 페이지를 닫지 마세요.</strong>
                <br />
                분석이 중단될 수 있습니다.
              </p>
            </div>
            <p className={styles.warning}>
              분석 완료 후 리포트는 검수를 거쳐 72시간 내에 이메일로 발송됩니다.
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
