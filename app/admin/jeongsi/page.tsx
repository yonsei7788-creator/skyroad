"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Plus, Search } from "lucide-react";

import {
  Badge,
  DataTable,
  EmptyState,
  Pagination,
} from "@/app/admin/_components";
import type { Column } from "@/app/admin/_components";
import type {
  AdminJeongsiReport,
  JeongsiReportStatus,
  PaginatedResponse,
} from "@/app/admin/types";

import listStyles from "../reports/reports.module.css";
import styles from "./jeongsi-admin.module.css";

const STATUS_TABS: { label: string; value: JeongsiReportStatus | "" }[] = [
  { label: "전체", value: "" },
  { label: "생성 중", value: "processing" },
  { label: "생성 완료", value: "completed" },
  { label: "생성 실패", value: "failed" },
];

const STATUS_BADGE_MAP: Record<
  JeongsiReportStatus,
  { label: string; variant: "success" | "warning" | "error" | "neutral" }
> = {
  pending: { label: "대기", variant: "neutral" },
  processing: { label: "생성 중", variant: "warning" },
  completed: { label: "생성 완료", variant: "success" },
  failed: { label: "생성 실패", variant: "error" },
};

const DEBOUNCE_DELAY = 300;
const ITEMS_PER_PAGE = 20;
const NEW_REPORT_PATH = "/admin/jeongsi/new";

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatPercentile = (value: number | null): string =>
  value === null ? "-" : value.toFixed(1);

/** 리포트 화면. 생성 중·실패면 그 화면이 상태를 안내한다 */
const reportPath = (report: AdminJeongsiReport): string =>
  `/jeongsi/${report.id}`;

const JeongsiReportsPage = () => {
  const router = useRouter();
  const [reports, setReports] = useState<AdminJeongsiReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JeongsiReportStatus | "">(
    ""
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/jeongsi?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? "정시 리포트 목록을 불러오는데 실패했습니다."
        );
      }

      const data: PaginatedResponse<AdminJeongsiReport> = await res.json();
      setReports(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setReports([]);
      setTotal(0);
      setTotalPages(0);
      setLoadError(
        err instanceof Error
          ? err.message
          : "정시 리포트 목록을 불러오는데 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

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

  const handleStatusChange = (status: JeongsiReportStatus | "") => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleRowClick = (report: AdminJeongsiReport) => {
    router.push(reportPath(report));
  };

  const columns: Column<AdminJeongsiReport>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: "생성일",
        width: "140px",
        render: (row) => (
          <span className={listStyles.cellText}>
            {formatDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        key: "target",
        header: "희망 학과·계열",
        render: (row) => (
          <span className={listStyles.cellText}>{row.target}</span>
        ),
      },
      {
        key: "averagePercentile",
        header: "평균 백분위",
        width: "100px",
        align: "center",
        render: (row) => (
          <span className={listStyles.cellText}>
            {formatPercentile(row.averagePercentile)}
          </span>
        ),
      },
      {
        key: "region",
        header: "지역 · 성향",
        width: "110px",
        render: (row) => (
          <span className={listStyles.cellText}>
            {row.region} · {row.risk}
          </span>
        ),
      },
      {
        key: "status",
        header: "상태",
        width: "120px",
        align: "center",
        render: (row) => {
          const { label, variant } = STATUS_BADGE_MAP[row.status];
          return (
            <>
              <Badge variant={variant}>{label}</Badge>
              {row.status === "processing" && (
                <div className={styles.progressText}>{row.progress}%</div>
              )}
            </>
          );
        },
      },
      {
        key: "createdBy",
        header: "생성자",
        width: "90px",
        render: (row) => (
          <span className={listStyles.cellText}>{row.createdBy || "-"}</span>
        ),
      },
      {
        key: "action",
        header: "액션",
        width: "100px",
        align: "center",
        render: (row) => (
          <button
            className={`${listStyles.actionButton} ${
              row.status === "completed" ? "" : listStyles.actionButtonSecondary
            }`}
            onClick={(e) => {
              e.stopPropagation();
              router.push(reportPath(row));
            }}
          >
            {row.status === "completed" ? "리포트 보기" : "상태 보기"}
          </button>
        ),
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
        <div>
          <h1 className={styles.title}>정시 분석</h1>
          <p className={styles.subtitle}>
            수능 성적 기반 정시 지원 분석 리포트를 생성하고 확인할 수 있습니다.
          </p>
        </div>
        <Link href={NEW_REPORT_PATH} className={styles.createButton}>
          <Plus size={16} />
          생성하기
        </Link>
      </div>

      <div className={listStyles.filters}>
        <div className={listStyles.statusTabs}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`${listStyles.statusTab} ${
                statusFilter === tab.value ? listStyles.statusTabActive : ""
              }`}
              onClick={() => handleStatusChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={listStyles.searchWrapper}>
          <Search size={16} className={listStyles.searchIcon} />
          <input
            type="text"
            className={listStyles.searchInput}
            placeholder="희망 학과·계열로 검색..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {loadError && <div className={styles.errorBox}>{loadError}</div>}

      {!loading && reports.length === 0 ? (
        !loadError && (
          <EmptyState
            title="정시 분석 리포트가 없습니다"
            description="「생성하기」로 첫 정시 분석 리포트를 만들어 보세요."
          />
        )
      ) : (
        <>
          <div className={listStyles.tableHide}>
            <DataTable
              columns={columns}
              data={reports}
              keyExtractor={(row) => row.id}
              isLoading={loading}
              onRowClick={handleRowClick}
            />
          </div>

          {/* Mobile card list */}
          <div className={listStyles.cardList}>
            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "32px",
                }}
              >
                <Loader2 size={20} className={listStyles.spinner} />
              </div>
            ) : (
              reports.map((report) => {
                const { label, variant } = STATUS_BADGE_MAP[report.status];
                return (
                  <div
                    key={report.id}
                    className={listStyles.card}
                    onClick={() => handleRowClick(report)}
                  >
                    <div className={listStyles.cardTop}>
                      <span className={listStyles.cardUserName}>
                        {report.target}
                      </span>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <div className={listStyles.cardSub}>
                      평균 백분위 {formatPercentile(report.averagePercentile)} ·{" "}
                      {report.region} · {report.risk}
                    </div>
                    <div className={listStyles.cardDivider} />
                    <div className={listStyles.cardBottom}>
                      <span className={listStyles.cardDate}>
                        {formatDateTime(report.createdAt)} ·{" "}
                        {report.createdBy || "-"}
                      </span>
                      <button
                        className={`${listStyles.cardActionBtn} ${
                          report.status === "completed"
                            ? ""
                            : listStyles.cardActionBtnSecondary
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(reportPath(report));
                        }}
                      >
                        {report.status === "completed"
                          ? "리포트 보기"
                          : "상태 보기"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

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

export default JeongsiReportsPage;
