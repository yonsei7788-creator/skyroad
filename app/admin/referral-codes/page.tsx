"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  Plus,
  Ticket,
  CheckCircle,
  Users,
  Banknote,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  X,
  Pencil,
  Gift,
} from "lucide-react";

import {
  Badge,
  DataTable,
  EmptyState,
  Pagination,
  StatCard,
} from "@/app/admin/_components";
import type { Column } from "@/app/admin/_components";

import { CreateCodeModal } from "./_components/CreateCodeModal";
import { GrantCouponModal } from "./_components/GrantCouponModal";
import styles from "./referral-codes.module.css";

/* ============================================
   Types
   ============================================ */

interface ReferralCode {
  id: string;
  code: string;
  partner_name: string;
  partner_type: string;
  max_usages: number;
  current_usages: number;
  commission_per_use: number;
  discount_amount: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  memo: string | null;
  created_at: string;
  total_paid_amount: number;
}

interface ReferralUsage {
  id: string;
  userEmail: string;
  couponUsed: boolean;
  planName: string | null;
  paidAmount: number;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  totalUsages: number;
  totalPaidAmount: number;
}

/* ============================================
   Constants & Helpers
   ============================================ */

const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const PARTNER_TYPE_BADGE: Record<
  string,
  { variant: "info" | "warning" | "neutral"; label: string }
> = {
  influencer: { variant: "info", label: "인플루언서" },
  affiliate: { variant: "warning", label: "제휴사" },
  internal: { variant: "neutral", label: "내부" },
  other: { variant: "neutral", label: "기타" },
};

type CodeStatus = "active" | "expired" | "inactive";

const STATUS_BADGE: Record<
  CodeStatus,
  { variant: "success" | "error" | "neutral"; label: string }
> = {
  active: { variant: "success", label: "활성" },
  expired: { variant: "error", label: "만료" },
  inactive: { variant: "neutral", label: "비활성" },
};

const getCodeStatus = (code: ReferralCode): CodeStatus => {
  if (!code.is_active) return "inactive";
  if (code.valid_until && new Date(code.valid_until) < new Date())
    return "expired";
  return "active";
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${formatDate(dateStr)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("ko-KR").format(amount);

/* ============================================
   Component
   ============================================ */

const ReferralCodesPage = () => {
  // Data
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    totalUsages: 0,
    totalPaidAmount: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [partnerTypeFilter, setPartnerTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create/Edit modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReferralCode | null>(null);

  // Grant coupon modal
  const [isGrantOpen, setIsGrantOpen] = useState(false);

  // Detail drawer
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  const [usages, setUsages] = useState<ReferralUsage[]>([]);
  const [usagesTotal, setUsagesTotal] = useState(0);
  const [isUsageLoading, setIsUsageLoading] = useState(false);

  // Toggle confirm
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<ReferralCode | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Copy & Toast
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, DEBOUNCE_DELAY);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search]);

  // Fetch codes
  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(ITEMS_PER_PAGE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (partnerTypeFilter) params.set("partnerType", partnerTypeFilter);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const response = await fetch(
        `/api/admin/referral-codes?${params.toString()}`
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "코드 목록을 불러오는데 실패했습니다.");
      }
      const result = await response.json();
      setCodes(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setStats(result.stats);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "코드 목록을 불러오는데 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, partnerTypeFilter, statusFilter]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Fetch usages for drawer
  const fetchUsages = useCallback(async (codeId: string) => {
    setIsUsageLoading(true);
    try {
      const response = await fetch(
        `/api/admin/referral-codes/${codeId}/usages?limit=50`
      );
      if (!response.ok) throw new Error();
      const result = await response.json();
      setUsages(result.data);
      setUsagesTotal(result.total ?? result.data.length);
    } catch {
      setUsages([]);
      setUsagesTotal(0);
    } finally {
      setIsUsageLoading(false);
    }
  }, []);

  // Copy code
  const handleCopy = useCallback(async (code: string, id?: string) => {
    await navigator.clipboard.writeText(code);
    if (id) setCopiedId(id);
    setToastMessage(`${code} 복사 완료`);
    setTimeout(() => {
      if (id) setCopiedId(null);
      setToastMessage(null);
    }, 2000);
  }, []);

  // Toggle
  const handleToggleClick = useCallback(
    (e: React.MouseEvent, code: ReferralCode) => {
      e.stopPropagation();
      setPendingToggle(code);
      setIsConfirmOpen(true);
    },
    []
  );

  const handleConfirmToggle = useCallback(async () => {
    if (!pendingToggle) return;
    setIsToggling(true);
    try {
      const response = await fetch(
        `/api/admin/referral-codes/${pendingToggle.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !pendingToggle.is_active }),
        }
      );
      if (!response.ok) throw new Error();
      await fetchCodes();
      // 드로어가 열려있으면 갱신
      if (selectedCode?.id === pendingToggle.id) {
        setSelectedCode((prev) =>
          prev ? { ...prev, is_active: !prev.is_active } : null
        );
      }
    } catch {
      alert("상태 변경에 실패했습니다.");
    } finally {
      setIsToggling(false);
      setIsConfirmOpen(false);
      setPendingToggle(null);
    }
  }, [pendingToggle, fetchCodes, selectedCode]);

  // Row click → open drawer
  const handleRowClick = useCallback(
    (code: ReferralCode) => {
      setSelectedCode(code);
      fetchUsages(code.id);
    },
    [fetchUsages]
  );

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setSelectedCode(null);
    setUsages([]);
    setUsagesTotal(0);
  }, []);

  // Open edit from drawer
  const handleOpenEdit = useCallback(() => {
    if (selectedCode) setEditTarget(selectedCode);
  }, [selectedCode]);

  // Toggle from drawer
  const handleDrawerToggle = useCallback(() => {
    if (selectedCode) {
      setPendingToggle(selectedCode);
      setIsConfirmOpen(true);
    }
  }, [selectedCode]);

  // Table columns
  const columns: Column<ReferralCode>[] = [
    {
      key: "code",
      header: "코드",
      width: "140px",
      render: (item) => (
        <div className={styles.codeCell}>
          <span className={styles.codeText}>{item.code}</span>
          <button
            className={`${styles.copyButton} ${copiedId === item.id ? styles.copyButtonVisible : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(item.code, item.id);
            }}
            aria-label="코드 복사"
          >
            {copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      ),
    },
    {
      key: "partner",
      header: "파트너",
      render: (item) => (
        <span className={styles.partnerName}>{item.partner_name}</span>
      ),
    },
    {
      key: "partnerType",
      header: "유형",
      width: "100px",
      render: (item) => {
        const badge =
          PARTNER_TYPE_BADGE[item.partner_type] ?? PARTNER_TYPE_BADGE.other;
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: "usages",
      header: "사용",
      width: "90px",
      align: "center",
      render: (item) => (
        <span className={styles.usageText}>
          {item.current_usages}
          <span className={styles.usageSep}>/</span>
          {item.max_usages === 0 ? "∞" : item.max_usages}
        </span>
      ),
    },
    {
      key: "validPeriod",
      header: "유효기간",
      width: "180px",
      render: (item) => (
        <span className={styles.periodText}>
          {formatDate(item.valid_from)} ~{" "}
          {item.valid_until ? formatDate(item.valid_until) : "무기한"}
        </span>
      ),
    },
    {
      key: "paidAmount",
      header: "결제액 / RS쉐어",
      width: "160px",
      align: "right",
      render: (item) => {
        const paid = Number(item.total_paid_amount) || 0;
        const commission = Math.round(paid * 0.2);
        return (
          <span className={styles.commissionText}>
            {formatCurrency(paid)}원
            <span className={styles.commissionSub}>
              / {formatCurrency(commission)}원
            </span>
          </span>
        );
      },
    },
    {
      key: "status",
      header: "상태",
      width: "80px",
      align: "center",
      render: (item) => {
        const status = getCodeStatus(item);
        return (
          <Badge variant={STATUS_BADGE[status].variant}>
            {STATUS_BADGE[status].label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "56px",
      align: "center",
      render: (item) => (
        <button
          className={styles.toggleButton}
          onClick={(e) => handleToggleClick(e, item)}
          title={item.is_active ? "비활성화" : "활성화"}
        >
          {item.is_active ? (
            <ToggleRight size={20} className={styles.toggleOn} />
          ) : (
            <ToggleLeft size={20} className={styles.toggleOff} />
          )}
        </button>
      ),
    },
  ];

  // Drawer detail content
  const drawerCode = selectedCode;
  const drawerStatus = drawerCode ? getCodeStatus(drawerCode) : null;
  const drawerTotalPaid = Number(drawerCode?.total_paid_amount) || 0;
  const drawerCommission = Math.round(drawerTotalPaid * 0.2);

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>추천인 코드 관리</h1>
        <p className={styles.subtitle}>
          파트너별 코드를 생성하고 사용 현황을 관리합니다.
        </p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard
          label="총 코드"
          value={stats.total}
          suffix="건"
          icon={<Ticket size={20} />}
        />
        <StatCard
          label="활성 코드"
          value={stats.active}
          suffix="건"
          icon={<CheckCircle size={20} />}
        />
        <StatCard
          label="누적 사용"
          value={stats.totalUsages}
          suffix="건"
          icon={<Users size={20} />}
        />
        <StatCard
          label="총 결제액"
          value={`${formatCurrency(stats.totalPaidAmount)}원`}
          icon={<Banknote size={20} />}
        />
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="코드 또는 파트너명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterRow}>
          <select
            className={styles.filterSelect}
            value={partnerTypeFilter}
            onChange={(e) => {
              setPartnerTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">전체 유형</option>
            <option value="influencer">인플루언서</option>
            <option value="affiliate">제휴사</option>
            <option value="internal">내부</option>
            <option value="other">기타</option>
          </select>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">전체 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.grantButton}
            onClick={() => setIsGrantOpen(true)}
          >
            <Gift size={16} />
            쿠폰 지급
          </button>
          <button
            className={styles.createButton}
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            코드 생성
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMessage && !isLoading && (
        <div className={styles.errorWrapper}>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} onClick={fetchCodes}>
            다시 시도
          </button>
        </div>
      )}

      {/* Table + Cards */}
      {!errorMessage && (
        <>
          <div className={styles.tableHide}>
            <DataTable
              columns={columns}
              data={codes}
              keyExtractor={(c) => c.id}
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
                  icon={<Ticket size={40} />}
                  title="추천인 코드가 없습니다"
                  description={
                    debouncedSearch || partnerTypeFilter || statusFilter
                      ? "검색 조건에 맞는 코드가 없습니다."
                      : "코드 생성 버튼으로 첫 코드를 만들어보세요."
                  }
                />
              }
            />
          </div>

          {/* Mobile cards */}
          <div className={styles.cardList}>
            {isLoading ? (
              <div className={styles.loadingWrapper}>
                <Loader2 size={20} className={styles.spinner} />
                <span>불러오는 중...</span>
              </div>
            ) : codes.length === 0 ? (
              <EmptyState
                icon={<Ticket size={40} />}
                title="추천인 코드가 없습니다"
                description="코드 생성 버튼으로 첫 코드를 만들어보세요."
              />
            ) : (
              codes.map((code) => {
                const status = getCodeStatus(code);
                return (
                  <div
                    key={code.id}
                    className={styles.card}
                    onClick={() => handleRowClick(code)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardCode}>{code.code}</span>
                      <Badge variant={STATUS_BADGE[status].variant}>
                        {STATUS_BADGE[status].label}
                      </Badge>
                    </div>
                    <div className={styles.cardPartner}>
                      {code.partner_name} &middot;{" "}
                      {PARTNER_TYPE_BADGE[code.partner_type]?.label ?? "기타"}
                    </div>
                    <div className={styles.cardDivider} />
                    <div className={styles.cardMeta}>
                      <div className={styles.cardMetaItem}>
                        <span className={styles.cardMetaLabel}>사용</span>
                        <span className={styles.cardMetaValue}>
                          {code.current_usages}/
                          {code.max_usages === 0 ? "∞" : code.max_usages}
                        </span>
                      </div>
                      <div className={styles.cardMetaItem}>
                        <span className={styles.cardMetaLabel}>유효기간</span>
                        <span className={styles.cardMetaValue}>
                          ~
                          {code.valid_until
                            ? formatDate(code.valid_until)
                            : "무기한"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!isLoading && codes.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={total}
              limit={ITEMS_PER_PAGE}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Create Modal */}
      <CreateCodeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          fetchCodes();
        }}
      />

      {/* Grant Coupon Modal */}
      <GrantCouponModal
        isOpen={isGrantOpen}
        onClose={() => setIsGrantOpen(false)}
        onSuccess={() => {
          setIsGrantOpen(false);
          setToastMessage("쿠폰이 성공적으로 지급되었습니다.");
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* Edit Modal */}
      {editTarget && (
        <CreateCodeModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            fetchCodes();
            // 드로어 갱신
            if (selectedCode?.id === editTarget.id) {
              const refreshed = async () => {
                const res = await fetch(
                  `/api/admin/referral-codes/${editTarget.id}`
                );
                if (res.ok) {
                  const { data } = await res.json();
                  setSelectedCode(data);
                }
              };
              refreshed();
            }
          }}
          initialValues={{
            id: editTarget.id,
            code: editTarget.code,
            partnerName: editTarget.partner_name,
            partnerType: editTarget.partner_type,
            maxUsages: editTarget.max_usages,
            discountAmount: editTarget.discount_amount,
            validFrom: editTarget.valid_from,
            validUntil: editTarget.valid_until ?? "",
            memo: editTarget.memo ?? "",
          }}
        />
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {drawerCode && (
          <motion.div
            className={styles.drawerOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleCloseDrawer}
          >
            <motion.div
              className={styles.drawerPanel}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer header */}
              <div className={styles.drawerHeader}>
                <div>
                  <div className={styles.drawerTitleRow}>
                    <h2 className={styles.drawerTitle}>{drawerCode.code}</h2>
                    <button
                      className={styles.drawerCopyButton}
                      onClick={() => handleCopy(drawerCode.code, drawerCode.id)}
                      aria-label="코드 복사"
                    >
                      {copiedId === drawerCode.id ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    {drawerStatus && (
                      <Badge variant={STATUS_BADGE[drawerStatus].variant}>
                        {STATUS_BADGE[drawerStatus].label}
                      </Badge>
                    )}
                  </div>
                  <p className={styles.drawerSubtitle}>
                    {drawerCode.partner_name} &middot;{" "}
                    {PARTNER_TYPE_BADGE[drawerCode.partner_type]?.label ??
                      "기타"}
                  </p>
                </div>
                <button
                  className={styles.drawerClose}
                  onClick={handleCloseDrawer}
                  aria-label="닫기"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer body */}
              <div className={styles.drawerBody}>
                {/* Actions */}
                <div className={styles.drawerActions}>
                  <button
                    className={styles.drawerActionButton}
                    onClick={handleOpenEdit}
                  >
                    <Pencil size={14} />
                    수정
                  </button>
                  <button
                    className={`${styles.drawerActionButton} ${
                      drawerCode.is_active
                        ? styles.drawerActionDanger
                        : styles.drawerActionSuccess
                    }`}
                    onClick={handleDrawerToggle}
                  >
                    {drawerCode.is_active ? (
                      <ToggleLeft size={14} />
                    ) : (
                      <ToggleRight size={14} />
                    )}
                    {drawerCode.is_active ? "비활성화" : "활성화"}
                  </button>
                </div>

                {/* Info */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.drawerSectionTitle}>코드 정보</h3>
                  <div className={styles.drawerGrid}>
                    <span className={styles.drawerLabel}>사용</span>
                    <span className={styles.drawerValue}>
                      {drawerCode.current_usages}/
                      {drawerCode.max_usages === 0
                        ? "무제한"
                        : drawerCode.max_usages}
                    </span>

                    <span className={styles.drawerLabel}>유효기간</span>
                    <span className={styles.drawerValue}>
                      {formatDate(drawerCode.valid_from)} ~{" "}
                      {drawerCode.valid_until
                        ? formatDate(drawerCode.valid_until)
                        : "무기한"}
                    </span>

                    <span className={styles.drawerLabel}>할인 금액</span>
                    <span className={styles.drawerValue}>
                      {formatCurrency(drawerCode.discount_amount)}원
                    </span>

                    <span className={styles.drawerLabel}>총 결제액</span>
                    <span className={styles.drawerValue}>
                      {formatCurrency(drawerTotalPaid)}원
                    </span>

                    <span className={styles.drawerLabel}>RS쉐어 (20%)</span>
                    <span className={styles.drawerValue}>
                      {formatCurrency(drawerCommission)}원
                    </span>

                    <span className={styles.drawerLabel}>생성일</span>
                    <span className={styles.drawerValue}>
                      {formatDate(drawerCode.created_at)}
                    </span>

                    {drawerCode.memo && (
                      <>
                        <span className={styles.drawerLabel}>메모</span>
                        <span className={styles.drawerValue}>
                          {drawerCode.memo}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Usages */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.drawerSectionTitle}>
                    사용 내역 ({usagesTotal})
                  </h3>
                  {isUsageLoading ? (
                    <div className={styles.loadingWrapper}>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>불러오는 중...</span>
                    </div>
                  ) : usages.length === 0 ? (
                    <p className={styles.drawerNoData}>
                      아직 사용 내역이 없습니다.
                    </p>
                  ) : (
                    <div className={styles.usageList}>
                      {usages.map((u) => (
                        <div key={u.id} className={styles.usageItem}>
                          <div className={styles.usageTop}>
                            <span className={styles.usageEmail}>
                              {u.userEmail}
                            </span>
                            <Badge
                              variant={u.couponUsed ? "success" : "neutral"}
                            >
                              {u.couponUsed ? "쿠폰 사용" : "미사용"}
                            </Badge>
                          </div>
                          <div className={styles.usageBottom}>
                            <span>{formatDateTime(u.createdAt)}</span>
                            {u.planName && (
                              <span>
                                {u.planName}
                                {u.paidAmount > 0 &&
                                  ` · ${formatCurrency(u.paidAmount)}원`}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Confirm Dialog */}
      <AnimatePresence>
        {isConfirmOpen && pendingToggle && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              setIsConfirmOpen(false);
              setPendingToggle(null);
            }}
          >
            <motion.div
              className={styles.confirmDialog}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.confirmTitle}>
                코드 {pendingToggle.is_active ? "비활성화" : "활성화"}
              </h3>
              <p className={styles.confirmMessage}>
                {pendingToggle.code} 코드를{" "}
                {pendingToggle.is_active
                  ? "비활성화하시겠습니까? 더 이상 사용할 수 없게 됩니다."
                  : "활성화하시겠습니까? 다시 사용 가능해집니다."}
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancel}
                  onClick={() => {
                    setIsConfirmOpen(false);
                    setPendingToggle(null);
                  }}
                  disabled={isToggling}
                >
                  취소
                </button>
                <button
                  className={styles.confirmSubmit}
                  onClick={handleConfirmToggle}
                  disabled={isToggling}
                >
                  {isToggling ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    "확인"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Check size={14} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReferralCodesPage;
