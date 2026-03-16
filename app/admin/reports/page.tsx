"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";

import {
  DataTable,
  Badge,
  Pagination,
  EmptyState,
} from "@/app/admin/_components";
import type { Column } from "@/app/admin/_components";
import type {
  AdminReport,
  PaginatedResponse,
  ReportStatus,
} from "@/app/admin/types";

import styles from "./reports.module.css";

const STATUS_TABS: { label: string; value: ReportStatus | "" }[] = [
  { label: "전체", value: "" },
  { label: "AI 생성 대기", value: "ai_pending" },
  { label: "검수 대기", value: "review_pending" },
  { label: "검수 완료", value: "review_complete" },
  { label: "발송 완료", value: "delivered" },
];

const STATUS_BADGE_MAP: Record<
  ReportStatus,
  { label: string; variant: "success" | "warning" | "info" | "neutral" }
> = {
  ai_pending: { label: "AI 생성 대기", variant: "neutral" },
  review_pending: { label: "검수 대기", variant: "warning" },
  review_complete: { label: "검수 완료", variant: "info" },
  delivered: { label: "발송 완료", variant: "success" },
};

const DEBOUNCE_DELAY = 300;
const ITEMS_PER_PAGE = 20;

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

const ReportsPage = () => {
  const router = useRouter();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (planFilter) params.set("plan", planFilter);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data: PaginatedResponse<AdminReport> = await res.json();
      setReports(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Fetch reports error:", err);
      setReports([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, planFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_DELAY);
  };

  const handleStatusChange = (status: ReportStatus | "") => {
    setStatusFilter(status);
    setPage(1);
  };

  const handlePlanChange = (plan: string) => {
    setPlanFilter(plan);
    setPage(1);
  };

  const handleRowClick = (report: AdminReport) => {
    router.push(`/admin/reports/${report.id}`);
  };

  const columns: Column<AdminReport>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        width: "80px",
        render: (row: AdminReport) => (
          <span className={styles.cellMuted}>{row.id.slice(0, 8)}</span>
        ),
      },
      {
        key: "userName",
        header: "유저",
        render: (row) => (
          <span className={styles.cellText}>{row.userName || "-"}</span>
        ),
      },
      {
        key: "planName",
        header: "플랜",
        width: "100px",
        render: (row) => (
          <span className={styles.cellText}>{row.planName}</span>
        ),
      },
      {
        key: "targetUniversity",
        header: "목표 대학",
        width: "150px",
        render: (row) => (
          <span className={styles.cellText}>{row.targetUniversity || "-"}</span>
        ),
      },
      {
        key: "status",
        header: "상태",
        width: "120px",
        align: "center",
        render: (row) => {
          const { label, variant } = STATUS_BADGE_MAP[row.status];
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        key: "aiGeneratedAt",
        header: "AI 생성일",
        width: "120px",
        render: (row) => (
          <span className={styles.cellText}>
            {formatDate(row.aiGeneratedAt)}
          </span>
        ),
      },
      {
        key: "reviewedBy",
        header: "검수자",
        width: "100px",
        render: (row) => (
          <span className={styles.cellText}>{row.reviewedBy || "-"}</span>
        ),
      },
      {
        key: "deliveredAt",
        header: "발송일",
        width: "120px",
        render: (row) => (
          <span className={styles.cellText}>{formatDate(row.deliveredAt)}</span>
        ),
      },
      {
        key: "action",
        header: "액션",
        width: "120px",
        align: "center",
        render: (row) => {
          const isReviewable =
            row.status === "review_pending" || row.status === "ai_pending";
          return (
            <button
              className={`${styles.actionButton} ${
                !isReviewable ? styles.actionButtonSecondary : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/reports/${row.id}`);
              }}
            >
              {isReviewable ? "검수하기" : "상세보기"}
            </button>
          );
        },
      },
    ],
    [router]
  );

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>리포트 관리</h1>
        <p className={styles.subtitle}>
          생기부 분석 리포트를 검수하고 발송할 수 있습니다.
        </p>
      </div>

      {/* Mock Test */}
      <div className={styles.mockTestSection}>
        <p className={styles.mockTestLabel}>목데이터 검수 테스트</p>
        <div className={styles.mockTestButtons}>
          {(["lite", "standard", "premium"] as const).map((plan) => (
            <button
              key={plan}
              className={styles.mockTestButton}
              onClick={() => router.push(`/admin/reports/mock-${plan}`)}
            >
              {plan === "lite"
                ? "라이트"
                : plan === "standard"
                  ? "스탠다드"
                  : "프리미엄"}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.statusTabs}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`${styles.statusTab} ${
                statusFilter === tab.value ? styles.statusTabActive : ""
              }`}
              onClick={() => handleStatusChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="유저 이름으로 검색..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          className={styles.planSelect}
          value={planFilter}
          onChange={(e) => handlePlanChange(e.target.value)}
        >
          <option value="">전체 플랜</option>
          <option value="basic">베이직</option>
          <option value="standard">스탠다드</option>
          <option value="premium">프리미엄</option>
        </select>
      </div>

      {/* Table (desktop) */}
      {!loading && reports.length === 0 ? (
        <EmptyState
          title="리포트가 없습니다"
          description="조건에 맞는 리포트가 없습니다. 필터를 변경해 보세요."
        />
      ) : (
        <>
          <div className={styles.tableHide}>
            <DataTable
              columns={columns}
              data={reports}
              isLoading={loading}
              onRowClick={handleRowClick}
            />
          </div>

          {/* Mobile card list */}
          <div className={styles.cardList}>
            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "32px",
                }}
              >
                <Loader2 size={20} className={styles.spinner} />
              </div>
            ) : (
              reports.map((report) => {
                const { label, variant } = STATUS_BADGE_MAP[report.status];
                const isReviewable =
                  report.status === "review_pending" ||
                  report.status === "ai_pending";
                return (
                  <div
                    key={report.id}
                    className={styles.card}
                    onClick={() => handleRowClick(report)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardUserName}>
                        {report.userName || "-"}
                      </span>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <div className={styles.cardSub}>
                      {report.id.slice(0, 8)} · {report.planName}
                    </div>
                    <div className={styles.cardDivider} />
                    {report.targetUniversity && (
                      <div className={styles.cardTarget}>
                        {report.targetUniversity}
                      </div>
                    )}
                    <div className={styles.cardMeta}>
                      <span>AI: {formatDate(report.aiGeneratedAt)}</span>
                      <span className={styles.cardMetaDot} />
                      <span>검수: {report.reviewedBy || "-"}</span>
                    </div>
                    <div className={styles.cardBottom}>
                      <span className={styles.cardDate}>
                        발송: {formatDate(report.deliveredAt)}
                      </span>
                      <button
                        className={`${styles.cardActionBtn} ${
                          !isReviewable ? styles.cardActionBtnSecondary : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/reports/${report.id}`);
                        }}
                      >
                        {isReviewable ? "검수하기" : "상세보기"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {loading && (
            <div
              className={styles.tableHide}
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "12px",
              }}
            >
              <Loader2 size={20} className={styles.spinner} />
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={total}
            limit={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        </>
      )}
    </motion.div>
  );
};

export default ReportsPage;
