import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, ArrowRight } from "lucide-react";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";
import { createClient } from "@/libs/supabase/server";

import styles from "./page.module.css";

export const metadata = {
  title: "결제내역 | SKYROAD",
};

interface PaymentRow {
  status: string;
  discount_amount: number;
  amount: number;
  plans: {
    display_name: string;
  };
  payments: {
    toss_order_id: string;
    amount: number;
    method: string | null;
    status: string;
    approved_at: string | null;
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "결제 대기",
  paid: "결제 완료",
  analyzing: "분석 중",
  analysis_complete: "분석 완료",
  under_review: "검토 중",
  review_complete: "검토 완료",
  delivered: "전달 완료",
};

const STATUS_BADGE: Record<string, string> = {
  pending_payment: styles.badgeGray,
  paid: styles.badgeBlue,
  analyzing: styles.badgeYellow,
  analysis_complete: styles.badgeGreen,
  under_review: styles.badgeYellow,
  review_complete: styles.badgeGreen,
  delivered: styles.badgeGreen,
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
};

const formatAmount = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const PaymentCard = ({
  order,
  payment,
}: {
  order: PaymentRow;
  payment: PaymentRow["payments"][number];
}) => {
  const isCanceled = payment.status === "canceled";
  const hasDiscount = order.discount_amount > 0;

  const badgeLabel = isCanceled
    ? "결제 취소"
    : (STATUS_LABEL[order.status] ?? order.status);
  const badgeClass = isCanceled
    ? styles.badgeRed
    : (STATUS_BADGE[order.status] ?? styles.badgeGray);

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.planName}>
          {order.plans.display_name} 리포트
        </span>
        <span className={`${styles.badge} ${badgeClass}`}>{badgeLabel}</span>
      </div>

      <div className={styles.cardMiddle}>
        <div className={styles.amountArea}>
          <span className={styles.amount}>{formatAmount(payment.amount)}</span>
          {hasDiscount && (
            <span className={styles.originalAmount}>
              {formatAmount(order.amount + order.discount_amount)}
            </span>
          )}
        </div>
        {payment.method && (
          <span className={styles.method}>{payment.method}</span>
        )}
      </div>

      <div className={styles.cardBottom}>
        <span className={styles.date}>
          {payment.approved_at ? formatDateTime(payment.approved_at) : "-"}
        </span>
        <span className={styles.orderId}>{payment.toss_order_id}</span>
      </div>
    </div>
  );
};

const PaymentHistoryPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      status,
      discount_amount,
      amount,
      plans!inner (
        display_name
      ),
      payments!inner (
        toss_order_id,
        amount,
        method,
        status,
        approved_at
      )
    `
    )
    .eq("user_id", user.id)
    .in("payments.status", ["done", "canceled"])
    .order("created_at", { ascending: false });

  const orderList = (orders ?? []) as unknown as PaymentRow[];

  // Flatten: one card per payment, sorted by approved_at desc
  const paymentList = orderList
    .flatMap((order) => order.payments.map((p) => ({ order, payment: p })))
    .sort((a, b) => {
      const dateA = a.payment.approved_at ?? "";
      const dateB = b.payment.approved_at ?? "";
      return dateB.localeCompare(dateA);
    });

  return (
    <>
      <Header />
      <main className={styles.section}>
        <div className={styles.heroArea}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <h1 className={styles.pageTitle}>결제내역</h1>
            <p className={styles.pageSubtitle}>
              결제 및 환불 내역을 확인하세요
            </p>
          </div>
        </div>

        <div className={styles.container}>
          {paymentList.length > 0 ? (
            paymentList.map(({ order, payment }) => (
              <PaymentCard
                key={payment.toss_order_id}
                order={order}
                payment={payment}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <CreditCard size={28} />
              </div>
              <p className={styles.emptyText}>아직 결제 내역이 없어요.</p>
              <p className={styles.emptySubtext}>
                리포트를 구매하면 이곳에서 결제 내역을
                <br />
                확인할 수 있습니다.
              </p>
              <Link href="/pricing" className={styles.emptyCta}>
                리포트 구매하기
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PaymentHistoryPage;
