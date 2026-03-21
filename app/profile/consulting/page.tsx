import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowRight,
  ClipboardList,
  CreditCard,
  GraduationCap,
} from "lucide-react";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";
import { createClient } from "@/libs/supabase/server";
import { GenerateReportButton } from "./_components/GenerateReportButton";
import { AdminGenerateSection } from "./_components/AdminGenerateSection";

import styles from "./page.module.css";

export const metadata = {
  title: "컨설팅 내역 | SKYROAD",
};

interface OrderRow {
  id: string;
  status: string;
  amount: number;
  created_at: string;
  plans: {
    name: string;
    display_name: string;
  };
  reports: {
    id: string;
    ai_status: string;
    ai_progress: number;
    delivered_at: string | null;
    target_universities: {
      university_name: string;
      department: string;
    } | null;
  }[];
}

const STATUS_STEPS = [
  { key: "pending_payment", label: "결제 대기" },
  { key: "paid", label: "결제 완료" },
  { key: "analyzing", label: "AI 분석중" },
  { key: "analysis_complete", label: "분석 완료" },
  { key: "under_review", label: "전문가 검토" },
  { key: "review_complete", label: "검토 완료" },
  { key: "delivered", label: "전달 완료" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "결제 대기",
  paid: "결제 완료",
  analyzing: "AI 분석중",
  analysis_complete: "분석 완료",
  under_review: "전문가 검토중",
  review_complete: "검토 완료",
  delivered: "전달 완료",
};

const STATUS_CLASS: Record<string, string> = {
  pending_payment: styles.statusPending,
  paid: styles.statusPaid,
  analyzing: styles.statusAnalyzing,
  analysis_complete: styles.statusComplete,
  under_review: styles.statusReview,
  review_complete: styles.statusComplete,
  delivered: styles.statusDelivered,
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatAmount = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const getStepIndex = (status: string) =>
  STATUS_STEPS.findIndex((s) => s.key === status);

const getCardAccentClass = (status: string) => {
  if (status === "delivered") return styles.orderCardDelivered;
  if (status === "pending_payment") return styles.orderCardPending;
  return "";
};

const getReportIconClass = (aiStatus: string) => {
  if (aiStatus === "completed") return styles.reportIconComplete;
  if (aiStatus === "processing") return styles.reportIconProcessing;
  if (aiStatus === "failed") return styles.reportIconFailed;
  return "";
};

const OrderCard = ({ order }: { order: OrderRow }) => {
  const currentStepIdx = getStepIndex(order.status);
  const isDelivered = order.status === "delivered";
  const isAnalyzing = order.status === "analyzing" || order.status === "paid";
  const progressPercent = ((currentStepIdx + 1) / STATUS_STEPS.length) * 100;

  return (
    <div className={`${styles.orderCard} ${getCardAccentClass(order.status)}`}>
      {/* Header: Plan + Badge / Date + Amount */}
      <div className={styles.orderCardHeader}>
        <div className={styles.orderCardTop}>
          <div className={styles.planName}>
            {order.plans.display_name} 리포트
          </div>
          <span
            className={`${styles.statusBadge} ${STATUS_CLASS[order.status] ?? styles.statusPending}`}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <div className={styles.orderCardBottom}>
          <div className={styles.orderDate}>{formatDate(order.created_at)}</div>
          <span className={styles.orderAmount}>
            {formatAmount(order.amount)}
          </span>
        </div>
      </div>

      {/* Desktop: Progress steps */}
      <div className={styles.steps}>
        {STATUS_STEPS.map((step, idx) => {
          const isComplete = idx < currentStepIdx;
          const isActive = idx === currentStepIdx;

          return (
            <div key={step.key} style={{ display: "contents" }}>
              {idx > 0 && (
                <div
                  className={`${styles.stepLine} ${isComplete ? styles.stepLineComplete : ""}`}
                />
              )}
              <div className={styles.step}>
                <div
                  className={`${styles.stepDot} ${
                    isComplete
                      ? styles.stepDotComplete
                      : isActive
                        ? styles.stepDotActive
                        : ""
                  }`}
                />
                <span
                  className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ""}`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Simplified progress bar */}
      <div className={styles.mobileProgress}>
        <span className={styles.mobileProgressLabel}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
        <div className={styles.mobileProgressBar}>
          <div
            className={`${styles.mobileProgressFill} ${isDelivered ? styles.mobileProgressFillComplete : ""}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className={styles.mobileProgressCount}>
          {currentStepIdx + 1}/{STATUS_STEPS.length}
        </span>
      </div>

      {/* AI Progress bar (during analysis) */}
      {isAnalyzing &&
        order.reports.length > 0 &&
        order.reports[0].ai_status === "processing" && (
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>AI 분석 진행률</span>
              <span className={styles.progressValue}>
                {order.reports[0].ai_progress}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${order.reports[0].ai_progress}%` }}
              />
            </div>
          </div>
        )}

      {/* Action area */}
      {order.status === "pending_payment" && (
        <div className={styles.actionArea}>
          <Link
            href={`/checkout?plan=${order.plans.name}`}
            className={styles.actionButton}
          >
            <CreditCard size={16} />
            결제하기
          </Link>
        </div>
      )}

      {order.status === "paid" &&
        (order.reports.length === 0 ||
          order.reports[0].ai_status === "pending" ||
          order.reports[0].ai_status === "failed") && (
          <div className={styles.actionArea}>
            <GenerateReportButton
              orderId={order.id}
              reportId={order.reports[0]?.id}
              label={
                order.reports[0]?.ai_status === "failed"
                  ? "다시 시도"
                  : "리포트 생성"
              }
            />
          </div>
        )}

      {/* Report rows */}
      {order.reports.length > 0 && (
        <>
          <div className={styles.reportSectionLabel}>리포트</div>
          {order.reports.map((report) => (
            <div key={report.id} className={styles.reportRow}>
              <div
                className={`${styles.reportIcon} ${getReportIconClass(report.ai_status)}`}
              >
                <GraduationCap size={18} />
              </div>
              <div className={styles.reportInfo}>
                <div className={styles.reportUni}>
                  {report.target_universities
                    ? `${report.target_universities.university_name} ${report.target_universities.department}`
                    : "리포트"}
                </div>
                <div className={styles.reportMeta}>
                  {report.ai_status === "completed" && report.delivered_at
                    ? `전달 완료 · ${formatDate(report.delivered_at)}`
                    : report.ai_status === "completed"
                      ? "분석 완료"
                      : report.ai_status === "processing"
                        ? `분석중 · ${report.ai_progress}%`
                        : report.ai_status === "failed"
                          ? "분석 실패"
                          : "대기중"}
                </div>
              </div>
              {report.ai_status === "completed" ? (
                <Link
                  href={`/report/${report.id}`}
                  className={styles.reportAction}
                >
                  리포트 보기
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <span className={styles.reportActionDisabled}>
                  {report.ai_status === "processing" ? "분석중..." : "준비중"}
                </span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

const ConsultingHistoryPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      amount,
      created_at,
      plans (
        name,
        display_name
      ),
      reports (
        id,
        ai_status,
        ai_progress,
        delivered_at,
        target_universities (
          university_name,
          department
        )
      )
    `
    )
    .eq("user_id", user.id)
    .or("is_admin_only.is.null,is_admin_only.eq.false")
    .order("created_at", { ascending: false });

  const orderList = (orders ?? []) as unknown as OrderRow[];

  return (
    <>
      <Header />
      <div className={styles.section}>
        <div className={styles.header}>
          <h1 className={styles.title}>컨설팅 내역</h1>
          <p className={styles.subtitle}>리포트 진행 상황을 확인하세요</p>
        </div>

        <div className={styles.container}>
          {isAdmin && <AdminGenerateSection userId={user.id} />}
          {orderList.length > 0 ? (
            orderList.map((order) => <OrderCard key={order.id} order={order} />)
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <ClipboardList size={28} />
              </div>
              <p className={styles.emptyText}>아직 컨설팅 내역이 없습니다</p>
              <p className={styles.emptySubtext}>
                리포트를 구매하면 이곳에서 진행 상황과
                <br />
                결과를 확인할 수 있습니다.
              </p>
              <Link href="/pricing" className={styles.emptyCta}>
                <FileText size={16} />
                리포트 구매하기
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ConsultingHistoryPage;
