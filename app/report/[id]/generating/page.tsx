"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import styles from "./page.module.css";

const MAX_RETRY = 3;

interface GenerateResponse {
  reportId: string;
  orderId: string;
  plan: string;
  studentInfo: Record<string, unknown>;
  taskQueue: string[];
  status: string;
  error?: string;
}

interface RunTaskResponse {
  taskId: string;
  progress: number;
  completed: boolean;
  error?: string;
}

const TASK_LABELS: Record<string, string> = {
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
  admissionPrediction: "합격 예측",
  admissionStrategy: "입시 전략",
  directionGuide: "방향 가이드",
  storyAnalysis: "스토리 분석",
  actionRoadmap: "실행 로드맵",
  majorExploration: "학과 탐색",
};

const GeneratingContent = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [phase, setPhase] = useState<
    "idle" | "initializing" | "running" | "completed" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  // 마운트 시 + 재시도 시 파이프라인 실행
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      if (!orderId) {
        setPhase("error");
        setError("주문 정보가 없습니다. 결제 내역에서 다시 시도해 주세요.");
        return;
      }

      setPhase("initializing");
      setError(null);
      setProgress(0);

      try {
        // 1. 전처리 + 태스크 큐 받기
        const initRes = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
          signal: controller.signal,
        });

        const initBody: GenerateResponse = (await initRes.json().catch(() => ({
          error: "서버 오류가 발생했습니다.",
        }))) as GenerateResponse;

        if (!initRes.ok) {
          if (initRes.status === 409) {
            if (initBody.error?.includes("완료")) {
              router.replace(`/report/${id}`);
              return;
            }
            if (initBody.error?.includes("생성 중")) {
              setPhase("error");
              setError(
                "이미 다른 곳에서 리포트가 생성 중입니다. 잠시 후 다시 시도해 주세요."
              );
              return;
            }
          }
          setPhase("error");
          setError(initBody.error ?? "알 수 없는 오류가 발생했습니다.");
          return;
        }

        const { taskQueue, plan, studentInfo } = initBody;

        // 2. 태스크를 순차 실행
        setPhase("running");

        for (const taskId of taskQueue) {
          if (controller.signal.aborted) return;

          setCurrentSection(TASK_LABELS[taskId] ?? taskId);

          const taskRes = await fetch(`/api/reports/${id}/run-task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId,
              plan,
              studentInfo,
              orderId,
            }),
            signal: controller.signal,
          });

          const taskBody: RunTaskResponse = (await taskRes.json().catch(() => ({
            error: "서버 오류가 발생했습니다.",
          }))) as RunTaskResponse;

          if (!taskRes.ok) {
            setPhase("error");
            setError(
              taskBody.error ?? `태스크 ${taskId} 실행 중 오류가 발생했습니다.`
            );
            return;
          }

          setProgress(taskBody.progress);

          if (taskBody.completed) {
            setPhase("completed");
            setProgress(100);
            setCurrentSection(null);
            return;
          }
        }

        // 모든 태스크 완료
        setPhase("completed");
        setProgress(100);
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
  }, [retryTrigger]);

  // beforeunload 이탈 방지
  useEffect(() => {
    if (phase !== "initializing" && phase !== "running") return;

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
    setRetryTrigger((t) => t + 1);
  };

  const isWorking = phase === "initializing" || phase === "running";

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {phase === "completed" ? (
          <>
            <div className={styles.checkIcon} aria-hidden="true">
              &#10003;
            </div>
            <h1 className={styles.title}>AI 분석이 완료되었습니다</h1>
            <p className={styles.description}>
              리포트 검수 후 <strong>48시간 내에 이메일로 발송</strong>해
              드립니다.
            </p>
            <p className={styles.warning}>
              발송 완료 시 가입하신 이메일로 안내 드리겠습니다.
            </p>
            <button
              type="button"
              className={styles.retryButton}
              style={{ marginTop: 24 }}
              onClick={() => router.push("/profile/consulting")}
            >
              컨설팅 내역으로 이동
            </button>
          </>
        ) : isWorking ? (
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
              잠시만 기다려 주세요. 분석에 5~10분 정도 소요됩니다.
            </p>
            <div className={styles.noticeBox}>
              <p className={styles.noticeText}>
                <strong>이 페이지를 닫지 마세요.</strong>
                <br />
                분석이 중단될 수 있습니다.
              </p>
            </div>
            <p className={styles.warning}>
              분석 완료 후 리포트는 검수를 거쳐 48시간 내에 이메일로 발송됩니다.
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
