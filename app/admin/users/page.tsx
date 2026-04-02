"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Trash2, X, Shield, ShieldOff } from "lucide-react";

import { Badge } from "@/app/admin/_components/Badge";
import { DataTable } from "@/app/admin/_components/DataTable";
import { EmptyState } from "@/app/admin/_components/EmptyState";
import { Pagination } from "@/app/admin/_components/Pagination";

import styles from "./users.module.css";

/* ============================================
   Types
   ============================================ */

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "user" | "admin";
  highSchoolName: string | null;
  grade: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  recordCount: number;
  orderCount: number;
}

interface PaginatedResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TargetUniversity {
  id: string;
  universityName: string;
  department: string;
  admissionType: string;
}

interface RecordSummary {
  id: string;
  submissionType: string;
  gradeLevel: string | null;
  createdAt: string;
}

interface OrderSummary {
  id: string;
  planId: string | null;
  planName: string | null;
  status: string;
  amount: number;
  createdAt: string;
  reportDeliveredAt: string | null;
  paymentMethod: string | null;
  paymentAmount: number | null;
  paymentStatus: string | null;
  approvedAt: string | null;
}

interface UserDetail extends AdminUser {
  phone: string | null;
  highSchoolType: string | null;
  admissionYear: number | null;
  targetUniversities: TargetUniversity[];
  records: RecordSummary[];
  orders: OrderSummary[];
}

/* ============================================
   Constants
   ============================================ */

const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const GRADE_DISPLAY: Record<string, string> = {
  high1: "1학년",
  high2: "2학년",
  high3: "3학년",
  graduate: "졸업",
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

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

const formatCurrency = (amount: number): string => {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
};

/* ============================================
   Component
   ============================================ */

const AdminUsersPage = () => {
  // List state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  // Detail modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Role change
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<"user" | "admin" | null>(null);
  const [isRoleChanging, setIsRoleChanging] = useState(false);

  // Delete
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(ITEMS_PER_PAGE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (roleFilter) params.set("role", roleFilter);
    if (gradeFilter) params.set("grade", gradeFilter);

    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ?? "사용자 목록을 불러오는데 실패했습니다."
        );
      }
      const result: PaginatedResponse = await response.json();
      setUsers(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "사용자 목록을 불러오는데 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, gradeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch user detail
  const fetchUserDetail = useCallback(async (userId: string) => {
    setIsDetailLoading(true);
    setUserDetail(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (!response.ok) {
        throw new Error("사용자 정보를 불러오는데 실패했습니다.");
      }
      const detail: UserDetail = await response.json();
      setUserDetail(detail);
    } catch {
      setUserDetail(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  // Open detail
  const handleRowClick = useCallback(
    (user: AdminUser) => {
      setSelectedUserId(user.id);
      fetchUserDetail(user.id);
    },
    [fetchUserDetail]
  );

  // Close detail
  const handleCloseDetail = useCallback(() => {
    setSelectedUserId(null);
    setUserDetail(null);
  }, []);

  // Role change
  const handleRoleChangeClick = useCallback((newRole: "user" | "admin") => {
    setPendingRole(newRole);
    setIsConfirmOpen(true);
  }, []);

  const handleConfirmRoleChange = useCallback(async () => {
    if (!selectedUserId || !pendingRole) return;

    setIsRoleChanging(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUserId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error ?? "역할 변경에 실패했습니다.");
        return;
      }

      // Refresh detail and list
      await fetchUserDetail(selectedUserId);
      await fetchUsers();
    } catch {
      alert("역할 변경에 실패했습니다.");
    } finally {
      setIsRoleChanging(false);
      setIsConfirmOpen(false);
      setPendingRole(null);
    }
  }, [selectedUserId, pendingRole, fetchUserDetail, fetchUsers]);

  const handleCancelRoleChange = useCallback(() => {
    setIsConfirmOpen(false);
    setPendingRole(null);
  }, []);

  // Delete user
  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedUserId) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error ?? "계정 삭제에 실패했습니다.");
        return;
      }

      setIsDeleteConfirmOpen(false);
      handleCloseDetail();
      await fetchUsers();
    } catch {
      alert("계정 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedUserId, handleCloseDetail, fetchUsers]);

  // Filter handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleRoleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRoleFilter(e.target.value);
      setPage(1);
    },
    []
  );

  const handleGradeFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setGradeFilter(e.target.value);
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
      key: "name",
      header: "이름",
      render: (user: AdminUser) => (
        <div className={styles.userCell}>
          <span className={styles.userName}>{user.name ?? "미입력"}</span>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "역할",
      width: "80px",
      render: (user: AdminUser) => (
        <Badge variant={user.role === "admin" ? "info" : "neutral"}>
          {user.role === "admin" ? "관리자" : "사용자"}
        </Badge>
      ),
    },
    {
      key: "school",
      header: "학교",
      render: (user: AdminUser) => <span>{user.highSchoolName ?? "-"}</span>,
    },
    {
      key: "grade",
      header: "학년",
      width: "80px",
      render: (user: AdminUser) => (
        <span>
          {user.grade ? (GRADE_DISPLAY[user.grade] ?? user.grade) : "-"}
        </span>
      ),
    },
    {
      key: "onboarding",
      header: "온보딩",
      width: "70px",
      render: (user: AdminUser) =>
        user.onboardingCompleted ? (
          <span className={styles.onboardingYes}>&#10003;</span>
        ) : (
          <span className={styles.onboardingNo}>&#10007;</span>
        ),
    },
    {
      key: "createdAt",
      header: "가입일",
      width: "100px",
      render: (user: AdminUser) => <span>{formatDate(user.createdAt)}</span>,
    },
    {
      key: "records",
      header: "생기부",
      width: "70px",
      render: (user: AdminUser) => (
        <span className={styles.numberCell}>{user.recordCount}</span>
      ),
    },
    {
      key: "orders",
      header: "주문",
      width: "70px",
      render: (user: AdminUser) => (
        <span className={styles.numberCell}>{user.orderCount}</span>
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
        <h1 className={styles.title}>사용자 관리</h1>
        <p className={styles.subtitle}>
          등록된 사용자를 조회하고 역할을 관리합니다.
        </p>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="이름 또는 이메일 검색..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className={styles.filterRow}>
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={handleRoleFilterChange}
          >
            <option value="">전체 역할</option>
            <option value="admin">관리자</option>
            <option value="user">사용자</option>
          </select>

          <select
            className={styles.filterSelect}
            value={gradeFilter}
            onChange={handleGradeFilterChange}
          >
            <option value="">전체 학년</option>
            <option value="high1">1학년</option>
            <option value="high2">2학년</option>
            <option value="high3">3학년</option>
            <option value="graduate">졸업</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {errorMessage && !isLoading && (
        <div className={styles.errorWrapper}>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} onClick={fetchUsers}>
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
              data={users}
              keyExtractor={(user) => user.id}
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
                  title="사용자가 없습니다"
                  description={
                    debouncedSearch || roleFilter || gradeFilter
                      ? "검색 조건에 맞는 사용자가 없습니다."
                      : "아직 등록된 사용자가 없습니다."
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
            ) : users.length === 0 ? (
              <EmptyState
                title="사용자가 없습니다"
                description={
                  debouncedSearch || roleFilter || gradeFilter
                    ? "검색 조건에 맞는 사용자가 없습니다."
                    : "아직 등록된 사용자가 없습니다."
                }
              />
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className={styles.card}
                  onClick={() => handleRowClick(user)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardName}>
                      {user.name ?? "미입력"}
                    </span>
                    <Badge variant={user.role === "admin" ? "info" : "neutral"}>
                      {user.role === "admin" ? "관리자" : "사용자"}
                    </Badge>
                  </div>
                  <div className={styles.cardEmail}>{user.email}</div>
                  <div className={styles.cardDivider} />
                  <div className={styles.cardMeta}>
                    <span>{user.highSchoolName ?? "-"}</span>
                    <span className={styles.cardMetaDot} />
                    <span>
                      {user.grade
                        ? (GRADE_DISPLAY[user.grade] ?? user.grade)
                        : "-"}
                    </span>
                    <span className={styles.cardMetaDot} />
                    <span>
                      {user.onboardingCompleted ? (
                        <span className={styles.onboardingYes}>
                          온보딩 완료
                        </span>
                      ) : (
                        <span className={styles.onboardingNo}>미완료</span>
                      )}
                    </span>
                  </div>
                  <div className={styles.cardBottom}>
                    <div className={styles.cardStats}>
                      <span className={styles.cardStatItem}>
                        <span className={styles.cardStatLabel}>생기부</span>
                        <span className={styles.cardStatValue}>
                          {user.recordCount}
                        </span>
                      </span>
                      <span className={styles.cardStatItem}>
                        <span className={styles.cardStatLabel}>주문</span>
                        <span className={styles.cardStatValue}>
                          {user.orderCount}
                        </span>
                      </span>
                    </div>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!isLoading && users.length > 0 && (
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
        {selectedUserId && (
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
                <h2 className={styles.modalTitle}>사용자 상세</h2>
                <button
                  className={styles.modalCloseButton}
                  onClick={handleCloseDetail}
                  aria-label="닫기"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {isDetailLoading ? (
                  <div className={styles.modalLoading}>
                    <Loader2 size={24} className={styles.spinner} />
                  </div>
                ) : userDetail ? (
                  <>
                    {/* Profile section */}
                    <div className={styles.detailSection}>
                      <h3 className={styles.detailSectionTitle}>프로필 정보</h3>
                      <div className={styles.detailGrid}>
                        <span className={styles.detailLabel}>이름</span>
                        <span className={styles.detailValue}>
                          {userDetail.name ?? "미입력"}
                        </span>

                        <span className={styles.detailLabel}>이메일</span>
                        <span className={styles.detailValue}>
                          {userDetail.email}
                        </span>

                        <span className={styles.detailLabel}>전화번호</span>
                        <span className={styles.detailValue}>
                          {userDetail.phone ?? "-"}
                        </span>

                        <span className={styles.detailLabel}>역할</span>
                        <span className={styles.detailValue}>
                          <Badge
                            variant={
                              userDetail.role === "admin" ? "info" : "neutral"
                            }
                          >
                            {userDetail.role === "admin" ? "관리자" : "사용자"}
                          </Badge>
                        </span>

                        <span className={styles.detailLabel}>학교</span>
                        <span className={styles.detailValue}>
                          {userDetail.highSchoolName ?? "-"}
                          {userDetail.highSchoolType
                            ? ` (${userDetail.highSchoolType})`
                            : ""}
                        </span>

                        <span className={styles.detailLabel}>학년</span>
                        <span className={styles.detailValue}>
                          {userDetail.grade
                            ? (GRADE_DISPLAY[userDetail.grade] ??
                              userDetail.grade)
                            : "-"}
                        </span>

                        <span className={styles.detailLabel}>입학년도</span>
                        <span className={styles.detailValue}>
                          {userDetail.admissionYear ?? "-"}
                        </span>

                        <span className={styles.detailLabel}>온보딩</span>
                        <span className={styles.detailValue}>
                          {userDetail.onboardingCompleted ? (
                            <span className={styles.onboardingYes}>완료</span>
                          ) : (
                            <span className={styles.onboardingNo}>미완료</span>
                          )}
                        </span>

                        <span className={styles.detailLabel}>가입일</span>
                        <span className={styles.detailValue}>
                          {formatDate(userDetail.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Target universities */}
                    <div className={styles.detailSection}>
                      <h3 className={styles.detailSectionTitle}>
                        목표 대학 ({userDetail.targetUniversities.length})
                      </h3>
                      {userDetail.targetUniversities.length > 0 ? (
                        <div className={styles.universityList}>
                          {userDetail.targetUniversities.map((u) => (
                            <div key={u.id} className={styles.universityItem}>
                              <span className={styles.universityName}>
                                {u.universityName}
                              </span>
                              <span className={styles.universityDept}>
                                {u.department}
                                {u.admissionType ? ` / ${u.admissionType}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.noData}>
                          등록된 목표 대학이 없습니다.
                        </p>
                      )}
                    </div>

                    {/* Records */}
                    <div className={styles.detailSection}>
                      <h3 className={styles.detailSectionTitle}>
                        생기부 ({userDetail.records.length})
                      </h3>
                      {userDetail.records.length > 0 ? (
                        <div className={styles.summaryList}>
                          {userDetail.records.map((r) => (
                            <div key={r.id} className={styles.summaryItem}>
                              <span className={styles.summaryItemLabel}>
                                {r.submissionType}
                                {r.gradeLevel ? ` (${r.gradeLevel})` : ""}
                              </span>
                              <span className={styles.summaryItemValue}>
                                {formatDate(r.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.noData}>
                          등록된 생기부가 없습니다.
                        </p>
                      )}
                    </div>

                    {/* Orders & Payments */}
                    <div className={styles.detailSection}>
                      <h3 className={styles.detailSectionTitle}>
                        주문 / 결제 ({userDetail.orders.length})
                      </h3>
                      {userDetail.orders.length > 0 ? (
                        <div className={styles.summaryList}>
                          {userDetail.orders.map((o) => {
                            const statusVariant =
                              o.status === "delivered" ||
                              o.status === "review_complete"
                                ? "success"
                                : o.status === "pending_payment"
                                  ? "warning"
                                  : o.status === "cancelled" ||
                                      o.status === "refunded"
                                    ? "error"
                                    : "info";

                            return (
                              <div key={o.id} className={styles.orderItem}>
                                <div className={styles.orderItemHeader}>
                                  <span className={styles.orderItemPlan}>
                                    {o.planName ?? "플랜 없음"}
                                  </span>
                                  <Badge variant={statusVariant}>
                                    {ORDER_STATUS_DISPLAY[o.status] ?? o.status}
                                  </Badge>
                                </div>
                                <div className={styles.orderItemDetails}>
                                  <span>
                                    {o.paymentAmount != null
                                      ? formatCurrency(o.paymentAmount)
                                      : formatCurrency(o.amount)}
                                  </span>
                                  {o.paymentMethod && (
                                    <span className={styles.orderItemSep}>
                                      · {o.paymentMethod}
                                    </span>
                                  )}
                                  <span className={styles.orderItemSep}>
                                    ·{" "}
                                    {o.approvedAt
                                      ? formatDate(o.approvedAt)
                                      : formatDate(o.createdAt)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={styles.noData}>주문 내역이 없습니다.</p>
                      )}
                    </div>

                    {/* Role change */}
                    <div className={styles.roleChangeSection}>
                      <h3 className={styles.detailSectionTitle}>역할 변경</h3>
                      {userDetail.role === "user" ? (
                        <button
                          className={`${styles.roleChangeButton} ${styles.promoteButton}`}
                          onClick={() => handleRoleChangeClick("admin")}
                          disabled={isRoleChanging}
                        >
                          <Shield size={16} />
                          관리자로 승격
                        </button>
                      ) : (
                        <button
                          className={`${styles.roleChangeButton} ${styles.demoteButton}`}
                          onClick={() => handleRoleChangeClick("user")}
                          disabled={isRoleChanging}
                        >
                          <ShieldOff size={16} />
                          사용자로 강등
                        </button>
                      )}
                    </div>

                    {/* Delete account */}
                    <div className={styles.roleChangeSection}>
                      <h3 className={styles.detailSectionTitle}>계정 삭제</h3>
                      <p className={styles.deleteWarning}>
                        계정을 삭제하면 생기부, 주문, 리포트 등 모든 데이터가
                        영구적으로 삭제됩니다.
                      </p>
                      <button
                        className={`${styles.roleChangeButton} ${styles.deleteButton}`}
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                      >
                        <Trash2 size={16} />
                        계정 삭제
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.modalLoading}>
                    <p className={styles.noData}>
                      사용자 정보를 불러올 수 없습니다.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleCancelDelete}
          >
            <motion.div
              className={styles.confirmDialog}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.confirmTitle}>계정 삭제 확인</h3>
              <p className={styles.confirmMessage}>
                {userDetail?.name ?? "이 사용자"}의 계정을 삭제하시겠습니까?
                생기부, 주문, 리포트 등 모든 데이터가 영구적으로 삭제되며 복구할
                수 없습니다.
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancel}
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  className={`${styles.confirmSubmit} ${styles.confirmSubmitDanger}`}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    "삭제"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {isConfirmOpen && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleCancelRoleChange}
          >
            <motion.div
              className={styles.confirmDialog}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.confirmTitle}>역할 변경 확인</h3>
              <p className={styles.confirmMessage}>
                {pendingRole === "admin"
                  ? `${userDetail?.name ?? "이 사용자"}를 관리자로 승격하시겠습니까? 관리자는 모든 사용자 데이터에 접근할 수 있습니다.`
                  : `${userDetail?.name ?? "이 사용자"}를 사용자로 강등하시겠습니까? 관리자 권한이 제거됩니다.`}
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancel}
                  onClick={handleCancelRoleChange}
                  disabled={isRoleChanging}
                >
                  취소
                </button>
                <button
                  className={`${styles.confirmSubmit} ${
                    pendingRole === "user" ? styles.confirmSubmitDanger : ""
                  }`}
                  onClick={handleConfirmRoleChange}
                  disabled={isRoleChanging}
                >
                  {isRoleChanging ? (
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
    </motion.div>
  );
};

export default AdminUsersPage;
