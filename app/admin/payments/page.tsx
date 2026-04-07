"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  X,
  CreditCard,
  DollarSign,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { Badge } from "@/app/admin/_components/Badge";
import { DataTable } from "@/app/admin/_components/DataTable";
import { EmptyState } from "@/app/admin/_components/EmptyState";
import { Pagination } from "@/app/admin/_components/Pagination";
import { StatCard } from "@/app/admin/_components/StatCard";

import styles from "./payments.module.css";

/* ============================================
   Types
   ============================================ */

interface AdminPayment {
  id: string;
  orderId: string;
  userName: string | null;
  userEmail: string;
  userId: string;
  planName: string | null;
  planDisplayName: string | null;
  orderStatus: string;
  orderAmount: number;
  discountAmount: number;
  paymentKey: string | null;
  tossOrderId: string | null;
  method: string | null;
  paymentStatus: string;
  paymentAmount: number;
  approvedAt: string | null;
  createdAt: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalCount: number;
  todayRevenue: number;
  todayCount: number;
  canceledCount: number;
}

interface PaginatedResponse {
  data: AdminPayment[];
  stats: PaymentStats;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ============================================
   Constants
   ============================================ */

const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const PAYMENT_STATUS_DISPLAY: Record<string, string> = {
  done: "결제 완료",
  canceled: "취소",
  ready: "대기",
};

const ORDER_STATUS_DISPLAY: Record<string, string> = {
  pending_payment: "결제 대기",
  paid: "결제 완료",
  analyzing: "분석 중",
  analysis_complete: "분석 완료",
  under_review: "검토 중",
  review_complete: "검토 완료",
  delivered: "전달 완료",
  cancelled: "취소",
  refunded: "환불",
};

/* ============================================
   Helpers
   ============================================ */

// SSR 서버는 UTC라 getFullYear/getHours 같은 로컬 메서드는 UTC로 찍힌다.
// Asia/Seoul 을 명시해서 서버·클라이언트 모두 KST로 포맷하도록 강제한다.
const KST_DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const KST_DATETIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const formatDate = (dateStr: string): string => {
  const parts = KST_DATE_FORMATTER.formatToParts(new Date(dateStr));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
};

const formatDateTime = (dateStr: string): string => {
  const parts = KST_DATETIME_FORMATTER.formatToParts(new Date(dateStr));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
};

const formatCurrency = (amount: number): string => {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
};

const getPaymentStatusVariant = (
  status: string
): "success" | "error" | "warning" | "neutral" => {
  if (status === "done") return "success";
  if (status === "canceled") return "error";
  if (status === "ready") return "warning";
  return "neutral";
};

const getOrderStatusVariant = (
  status: string
): "success" | "error" | "warning" | "info" | "neutral" => {
  if (status === "delivered" || status === "review_complete") return "success";
  if (status === "pending_payment") return "warning";
  if (status === "cancelled" || status === "refunded") return "error";
  return "info";
};

/* ============================================
   Component
   ============================================ */

const AdminPaymentsPage = () => {
  // List state
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  // Detail
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(
    null
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(ITEMS_PER_PAGE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    if (methodFilter) params.set("method", methodFilter);

    try {
      const response = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ?? "결제 목록을 불러오는데 실패했습니다."
        );
      }
      const result: PaginatedResponse = await response.json();
      setPayments(result.data);
      setStats(result.stats);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "결제 목록을 불러오는데 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Handlers
  const handleRowClick = useCallback((payment: AdminPayment) => {
    setSelectedPayment(payment);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPayment(null);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleStatusFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value);
      setPage(1);
    },
    []
  );

  const handleMethodFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setMethodFilter(e.target.value);
      setPage(1);
    },
    []
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Table columns
  const columns = [
    {
      key: "user",
      header: "결제자",
      render: (p: AdminPayment) => (
        <div className={styles.userCell}>
          <span className={styles.userName}>{p.userName ?? "미입력"}</span>
          <span className={styles.userEmail}>{p.userEmail}</span>
        </div>
      ),
    },
    {
      key: "plan",
      header: "플랜",
      width: "100px",
      render: (p: AdminPayment) => <span>{p.planDisplayName ?? "-"}</span>,
    },
    {
      key: "amount",
      header: "결제금액",
      width: "120px",
      render: (p: AdminPayment) => (
        <div className={styles.amountCell}>
          <span className={styles.amount}>
            {formatCurrency(p.paymentAmount)}
          </span>
          {p.discountAmount > 0 && (
            <span className={styles.originalAmount}>
              {formatCurrency(p.orderAmount + p.discountAmount)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "method",
      header: "결제수단",
      width: "90px",
      render: (p: AdminPayment) => <span>{p.method ?? "-"}</span>,
    },
    {
      key: "paymentStatus",
      header: "결제상태",
      width: "90px",
      render: (p: AdminPayment) => (
        <Badge variant={getPaymentStatusVariant(p.paymentStatus)}>
          {PAYMENT_STATUS_DISPLAY[p.paymentStatus] ?? p.paymentStatus}
        </Badge>
      ),
    },
    {
      key: "orderStatus",
      header: "주문상태",
      width: "90px",
      render: (p: AdminPayment) => (
        <Badge variant={getOrderStatusVariant(p.orderStatus)}>
          {ORDER_STATUS_DISPLAY[p.orderStatus] ?? p.orderStatus}
        </Badge>
      ),
    },
    {
      key: "approvedAt",
      header: "결제일시",
      width: "130px",
      render: (p: AdminPayment) => (
        <span>
          {p.approvedAt
            ? formatDateTime(p.approvedAt)
            : formatDate(p.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>결제 관리</h1>
        <p className={styles.subtitle}>
          결제 내역을 조회하고 매출을 확인합니다.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <StatCard
            label="총 매출"
            value={formatCurrency(stats.totalRevenue)}
            icon={<DollarSign size={20} />}
          />
          <StatCard
            label="총 결제 건수"
            value={stats.totalCount}
            icon={<CreditCard size={20} />}
            suffix="건"
          />
          <StatCard
            label="오늘 매출"
            value={formatCurrency(stats.todayRevenue)}
            icon={<TrendingUp size={20} />}
            suffix={`${stats.todayCount}건`}
          />
          <StatCard
            label="취소 건수"
            value={stats.canceledCount}
            icon={<XCircle size={20} />}
            suffix="건"
          />
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="이름, 이메일 또는 주문번호 검색..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.filterRow}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">전체 상태</option>
            <option value="done">결제 완료</option>
            <option value="canceled">취소</option>
          </select>

          <select
            className={styles.filterSelect}
            value={methodFilter}
            onChange={handleMethodFilterChange}
          >
            <option value="">전체 결제수단</option>
            <option value="카드">카드</option>
            <option value="계좌이체">계좌이체</option>
            <option value="가상계좌">가상계좌</option>
            <option value="간편결제">간편결제</option>
            <option value="휴대폰">휴대폰</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {errorMessage && !isLoading && (
        <div className={styles.errorWrapper}>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} onClick={fetchPayments}>
            다시 시도
          </button>
        </div>
      )}

      {/* Data Table (desktop) + Card List (mobile) */}
      {!errorMessage && (
        <>
          <div className={styles.tableHide}>
            <DataTable
              columns={columns}
              data={payments}
              keyExtractor={(p) => p.id}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              loadingContent={
                <div className={styles.loadingWrapper}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>불러오는 중...</span>
                </div>
              }
              emptyContent={
                <EmptyState
                  title="결제 내역이 없습니다"
                  description={
                    debouncedSearch || statusFilter || methodFilter
                      ? "검색 조건에 맞는 결제 내역이 없습니다."
                      : "아직 결제 내역이 없습니다."
                  }
                />
              }
            />
          </div>

          {/* Mobile card list */}
          <div className={styles.cardList}>
            {isLoading ? (
              <div className={styles.loadingWrapper}>
                <Loader2 size={20} className={styles.spinner} />
                <span>불러오는 중...</span>
              </div>
            ) : payments.length === 0 ? (
              <EmptyState
                title="결제 내역이 없습니다"
                description={
                  debouncedSearch || statusFilter || methodFilter
                    ? "검색 조건에 맞는 결제 내역이 없습니다."
                    : "아직 결제 내역이 없습니다."
                }
              />
            ) : (
              payments.map((p) => (
                <div
                  key={p.id}
                  className={styles.card}
                  onClick={() => handleRowClick(p)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardName}>
                      {p.userName ?? "미입력"}
                    </span>
                    <Badge variant={getPaymentStatusVariant(p.paymentStatus)}>
                      {PAYMENT_STATUS_DISPLAY[p.paymentStatus] ??
                        p.paymentStatus}
                    </Badge>
                  </div>
                  <div className={styles.cardEmail}>{p.userEmail}</div>
                  <div className={styles.cardDivider} />
                  <div className={styles.cardMeta}>
                    <span>{p.planDisplayName ?? "-"}</span>
                    <span className={styles.cardMetaDot} />
                    <span>{p.method ?? "-"}</span>
                    <span className={styles.cardMetaDot} />
                    <Badge variant={getOrderStatusVariant(p.orderStatus)}>
                      {ORDER_STATUS_DISPLAY[p.orderStatus] ?? p.orderStatus}
                    </Badge>
                  </div>
                  <div className={styles.cardBottom}>
                    <span className={styles.cardAmount}>
                      {formatCurrency(p.paymentAmount)}
                    </span>
                    <span>
                      {p.approvedAt
                        ? formatDateTime(p.approvedAt)
                        : formatDate(p.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!isLoading && payments.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={total}
              limit={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {/* Detail Side Panel */}
      <AnimatePresence>
        {selectedPayment && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleCloseDetail}
          >
            <motion.div
              className={styles.modalPanel}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>결제 상세</h2>
                <button
                  className={styles.modalCloseButton}
                  onClick={handleCloseDetail}
                  aria-label="닫기"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* User info */}
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>결제자 정보</h3>
                  <div className={styles.detailGrid}>
                    <span className={styles.detailLabel}>이름</span>
                    <span className={styles.detailValue}>
                      {selectedPayment.userName ?? "미입력"}
                    </span>

                    <span className={styles.detailLabel}>이메일</span>
                    <span className={styles.detailValue}>
                      {selectedPayment.userEmail}
                    </span>
                  </div>
                </div>

                {/* Payment info */}
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>결제 정보</h3>
                  <div className={styles.detailGrid}>
                    <span className={styles.detailLabel}>결제상태</span>
                    <span className={styles.detailValue}>
                      <Badge
                        variant={getPaymentStatusVariant(
                          selectedPayment.paymentStatus
                        )}
                      >
                        {PAYMENT_STATUS_DISPLAY[
                          selectedPayment.paymentStatus
                        ] ?? selectedPayment.paymentStatus}
                      </Badge>
                    </span>

                    <span className={styles.detailLabel}>결제금액</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(selectedPayment.paymentAmount)}
                    </span>

                    {selectedPayment.discountAmount > 0 && (
                      <>
                        <span className={styles.detailLabel}>정가</span>
                        <span className={styles.detailValue}>
                          {formatCurrency(
                            selectedPayment.orderAmount +
                              selectedPayment.discountAmount
                          )}
                        </span>

                        <span className={styles.detailLabel}>할인금액</span>
                        <span className={styles.detailValue}>
                          -{formatCurrency(selectedPayment.discountAmount)}
                        </span>
                      </>
                    )}

                    <span className={styles.detailLabel}>결제수단</span>
                    <span className={styles.detailValue}>
                      {selectedPayment.method ?? "-"}
                    </span>

                    <span className={styles.detailLabel}>결제일시</span>
                    <span className={styles.detailValue}>
                      {selectedPayment.approvedAt
                        ? formatDateTime(selectedPayment.approvedAt)
                        : "-"}
                    </span>
                  </div>
                </div>

                {/* Order info */}
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>주문 정보</h3>
                  <div className={styles.detailGrid}>
                    <span className={styles.detailLabel}>플랜</span>
                    <span className={styles.detailValue}>
                      {selectedPayment.planDisplayName ?? "-"}
                    </span>

                    <span className={styles.detailLabel}>주문상태</span>
                    <span className={styles.detailValue}>
                      <Badge
                        variant={getOrderStatusVariant(
                          selectedPayment.orderStatus
                        )}
                      >
                        {ORDER_STATUS_DISPLAY[selectedPayment.orderStatus] ??
                          selectedPayment.orderStatus}
                      </Badge>
                    </span>
                  </div>
                </div>

                {/* Reference info */}
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>참조 정보</h3>
                  <div className={styles.detailGrid}>
                    <span className={styles.detailLabel}>주문번호</span>
                    <span className={styles.detailValueMono}>
                      {selectedPayment.tossOrderId ?? "-"}
                    </span>

                    <span className={styles.detailLabel}>결제키</span>
                    <span className={styles.detailValueMono}>
                      {selectedPayment.paymentKey ?? "-"}
                    </span>

                    <span className={styles.detailLabel}>주문 ID</span>
                    <span className={styles.detailValueMono}>
                      {selectedPayment.orderId}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminPaymentsPage;
