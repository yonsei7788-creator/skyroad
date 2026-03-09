"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Plus, Search } from "lucide-react";

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

  // 리포트 생성 모달
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateUserId, setGenerateUserId] = useState("");
  const [generatePlan, setGeneratePlan] = useState<
    "lite" | "standard" | "premium"
  >("standard");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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

  const handleGenerate = async () => {
    if (!generateUserId.trim()) {
      setGenerateError("유저 ID를 입력해주세요.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: generateUserId.trim(),
          plan: generatePlan,
        }),
      });
      if (!res.ok) {
        let message = "리포트 생성에 실패했습니다.";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          // non-JSON response
        }
        throw new Error(message);
      }
      const data = await res.json();
      setGenerateModalOpen(false);
      setGenerateUserId("");
      router.push(`/report/generating?orderId=${data.orderId}`);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setGenerating(false);
    }
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1 className={styles.title}>리포트 관리</h1>
            <p className={styles.subtitle}>
              생기부 분석 리포트를 검수하고 발송할 수 있습니다.
            </p>
          </div>
          <button
            className={styles.saveButton}
            onClick={() => {
              setGenerateError(null);
              setGenerateModalOpen(true);
            }}
          >
            <Plus size={16} />
            리포트 생성
          </button>
        </div>
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

      {/* Table */}
      {!loading && reports.length === 0 ? (
        <EmptyState
          title="리포트가 없습니다"
          description="조건에 맞는 리포트가 없습니다. 필터를 변경해 보세요."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={reports}
            isLoading={loading}
            onRowClick={handleRowClick}
          />

          {loading && (
            <div
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
      {/* 리포트 생성 모달 */}
      {generateModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !generating && setGenerateModalOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>리포트 생성 (어드민)</h2>
            <p className={styles.modalDescription}>
              결제 없이 리포트를 생성합니다. 유저 ID와 플랜을 선택해주세요.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--color-neutral-700)",
                }}
              >
                유저 ID (UUID)
              </label>
              <input
                type="text"
                className={styles.searchInput}
                style={{ width: "100%", maxWidth: "none", paddingLeft: 12 }}
                placeholder="유저 UUID 입력"
                value={generateUserId}
                onChange={(e) => setGenerateUserId(e.target.value)}
                disabled={generating}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--color-neutral-700)",
                }}
              >
                플랜
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["lite", "standard", "premium"] as const).map((p) => (
                  <button
                    key={p}
                    className={styles.mockTestButton}
                    style={{
                      flex: 1,
                      background:
                        generatePlan === p
                          ? "var(--color-primary-600)"
                          : undefined,
                      color: generatePlan === p ? "#ffffff" : undefined,
                      borderColor:
                        generatePlan === p
                          ? "var(--color-primary-600)"
                          : undefined,
                    }}
                    onClick={() => setGeneratePlan(p)}
                    disabled={generating}
                  >
                    {p === "lite"
                      ? "라이트"
                      : p === "standard"
                        ? "스탠다드"
                        : "프리미엄"}
                  </button>
                ))}
              </div>
            </div>

            {generateError && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--color-error-600)",
                  marginBottom: 16,
                }}
              >
                {generateError}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setGenerateModalOpen(false)}
                disabled={generating}
              >
                취소
              </button>
              <button
                className={styles.modalConfirm}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className={styles.spinner} />
                    생성 중...
                  </>
                ) : (
                  "생성하기"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReportsPage;
