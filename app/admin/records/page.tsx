"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, X, ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/app/admin/_components/Badge";
import { DataTable } from "@/app/admin/_components/DataTable";
import { EmptyState } from "@/app/admin/_components/EmptyState";
import { Pagination } from "@/app/admin/_components/Pagination";
import type { Column } from "@/app/admin/_components/DataTable";

import styles from "./records.module.css";

/* ============================================
   Types
   ============================================ */
interface AdminRecord {
  id: string;
  userName: string | null;
  userId: string;
  submissionType: "pdf" | "image" | "text";
  gradeLevel: string;
  textVerified: boolean;
  orderStatus: string | null;
  createdAt: string;
}

interface RecordDetail extends AdminRecord {
  finalText: string | null;
  attendance: Record<string, unknown>[];
  awards: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  creativeActivities: Record<string, unknown>[];
  volunteerActivities: Record<string, unknown>[];
  generalSubjects: Record<string, unknown>[];
  careerSubjects: Record<string, unknown>[];
  artsPhysicalSubjects: Record<string, unknown>[];
  subjectEvaluations: Record<string, unknown>[];
  readingActivities: Record<string, unknown>[];
  behavioralAssessments: Record<string, unknown>[];
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/* ============================================
   Constants
   ============================================ */
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const GRADE_LABEL_MAP: Record<string, string> = {
  high1: "1학년",
  high2: "2학년",
  high3: "3학년",
  repeat: "재수",
};

const SUBMISSION_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  image: "Image",
  text: "Text",
};

type OrderStatusKey =
  | "paid"
  | "analyzing"
  | "analysis_complete"
  | "under_review"
  | "review_complete"
  | "delivered"
  | "pending_payment";

const ORDER_STATUS_BADGE_MAP: Record<
  OrderStatusKey,
  { variant: "info" | "warning" | "success" | "neutral"; label: string }
> = {
  paid: { variant: "info", label: "결제완료" },
  analyzing: { variant: "info", label: "분석중" },
  analysis_complete: { variant: "warning", label: "분석완료" },
  under_review: { variant: "warning", label: "검토중" },
  review_complete: { variant: "success", label: "검토완료" },
  delivered: { variant: "success", label: "전달완료" },
  pending_payment: { variant: "neutral", label: "결제대기" },
};

const DETAIL_TABS = [
  { key: "info", label: "기본 정보" },
  { key: "attendance", label: "출결" },
  { key: "awards", label: "수상" },
  { key: "certifications", label: "자격증" },
  { key: "creative", label: "창의적 체험활동" },
  { key: "volunteer", label: "봉사활동" },
  { key: "general", label: "일반교과" },
  { key: "career", label: "전문교과" },
  { key: "artsPhysical", label: "체육/예술" },
  { key: "evaluations", label: "세부능력특기사항" },
  { key: "reading", label: "독서활동" },
  { key: "behavioral", label: "행동특성" },
] as const;

type TabKey = (typeof DETAIL_TABS)[number]["key"];

/* ============================================
   Helper Functions
   ============================================ */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

const truncateId = (id: string): string => id.slice(0, 8);

const getVal = (obj: Record<string, unknown>, key: string): string => {
  const value = obj[key];
  if (value === null || value === undefined) return "-";
  return String(value);
};

/* ============================================
   Detail Tab Content Components
   ============================================ */
const InfoTab = ({ detail }: { detail: RecordDetail }) => (
  <div className={styles.infoGrid}>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>레코드 ID</span>
      <span className={styles.infoValue}>{detail.id}</span>
    </div>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>유저</span>
      <span className={styles.infoValue}>{detail.userName ?? "-"}</span>
    </div>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>유저 ID</span>
      <span className={styles.infoValue}>{detail.userId}</span>
    </div>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>제출 방식</span>
      <span className={styles.infoValue}>
        {SUBMISSION_TYPE_LABEL[detail.submissionType] ?? detail.submissionType}
      </span>
    </div>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>학년</span>
      <span className={styles.infoValue}>
        {GRADE_LABEL_MAP[detail.gradeLevel] ?? detail.gradeLevel}
      </span>
    </div>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>텍스트 검증</span>
      <span className={styles.infoValue}>
        {detail.textVerified ? "검증됨" : "미검증"}
      </span>
    </div>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>주문 상태</span>
      <span className={styles.infoValue}>
        {detail.orderStatus
          ? (ORDER_STATUS_BADGE_MAP[detail.orderStatus as OrderStatusKey]
              ?.label ?? detail.orderStatus)
          : "주문 없음"}
      </span>
    </div>
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>제출일</span>
      <span className={styles.infoValue}>{formatDate(detail.createdAt)}</span>
    </div>
  </div>
);

const AttendanceTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>학년</th>
            <th>수업일수</th>
            <th>결석(질병)</th>
            <th>결석(미인정)</th>
            <th>결석(기타)</th>
            <th>지각(질병)</th>
            <th>지각(미인정)</th>
            <th>지각(기타)</th>
            <th>조퇴(질병)</th>
            <th>조퇴(미인정)</th>
            <th>조퇴(기타)</th>
            <th>결과(질병)</th>
            <th>결과(미인정)</th>
            <th>결과(기타)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "year")}</td>
              <td>{getVal(row, "total_days")}</td>
              <td>{getVal(row, "absence_illness")}</td>
              <td>{getVal(row, "absence_unauthorized")}</td>
              <td>{getVal(row, "absence_other")}</td>
              <td>{getVal(row, "lateness_illness")}</td>
              <td>{getVal(row, "lateness_unauthorized")}</td>
              <td>{getVal(row, "lateness_other")}</td>
              <td>{getVal(row, "early_leave_illness")}</td>
              <td>{getVal(row, "early_leave_unauthorized")}</td>
              <td>{getVal(row, "early_leave_other")}</td>
              <td>{getVal(row, "class_missed_illness")}</td>
              <td>{getVal(row, "class_missed_unauthorized")}</td>
              <td>{getVal(row, "class_missed_other")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AwardsTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>학년</th>
            <th>수상명</th>
            <th>등급</th>
            <th>수상일</th>
            <th>수여기관</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "year")}</td>
              <td>{getVal(row, "name")}</td>
              <td>{getVal(row, "rank")}</td>
              <td>{getVal(row, "date")}</td>
              <td>{getVal(row, "organization")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CertificationsTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>구분</th>
            <th>자격증명</th>
            <th>상세</th>
            <th>취득일</th>
            <th>발급기관</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "category")}</td>
              <td>{getVal(row, "name")}</td>
              <td>{getVal(row, "details")}</td>
              <td>{getVal(row, "date")}</td>
              <td>{getVal(row, "issuer")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CreativeActivitiesTab = ({
  data,
}: {
  data: Record<string, unknown>[];
}) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  // Group by area
  const grouped: Record<string, Record<string, unknown>[]> = {};
  data.forEach((row) => {
    const area = String(row.area ?? "기타");
    if (!grouped[area]) {
      grouped[area] = [];
    }
    grouped[area].push(row);
  });

  return (
    <div>
      {Object.entries(grouped).map(([area, rows]) => (
        <div key={area} className={styles.areaGroup}>
          <div className={styles.areaLabel}>{area}</div>
          <table className={styles.subTable}>
            <thead>
              <tr>
                <th>학년</th>
                <th>시간</th>
                <th>특기사항</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{getVal(row, "year")}</td>
                  <td>{getVal(row, "hours")}</td>
                  <td>{getVal(row, "note")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

const VolunteerTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>학년</th>
            <th>기간</th>
            <th>장소</th>
            <th>내용</th>
            <th>시간</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "year")}</td>
              <td>{getVal(row, "date_range")}</td>
              <td>{getVal(row, "place")}</td>
              <td>{getVal(row, "content")}</td>
              <td>{getVal(row, "hours")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const GeneralSubjectsTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>학년</th>
            <th>학기</th>
            <th>교과</th>
            <th>과목</th>
            <th>단위</th>
            <th>원점수</th>
            <th>평균</th>
            <th>표준편차</th>
            <th>성취도</th>
            <th>수강자수</th>
            <th>등급</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "year")}</td>
              <td>{getVal(row, "semester")}</td>
              <td>{getVal(row, "category")}</td>
              <td>{getVal(row, "subject")}</td>
              <td>{getVal(row, "credits")}</td>
              <td>{getVal(row, "raw_score")}</td>
              <td>{getVal(row, "average")}</td>
              <td>{getVal(row, "standard_deviation")}</td>
              <td>{getVal(row, "achievement")}</td>
              <td>{getVal(row, "student_count")}</td>
              <td>{getVal(row, "grade_rank")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CareerSubjectsTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>학년</th>
            <th>학기</th>
            <th>교과</th>
            <th>과목</th>
            <th>단위</th>
            <th>원점수</th>
            <th>평균</th>
            <th>성취도</th>
            <th>수강자수</th>
            <th>성취도 분포</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "year")}</td>
              <td>{getVal(row, "semester")}</td>
              <td>{getVal(row, "category")}</td>
              <td>{getVal(row, "subject")}</td>
              <td>{getVal(row, "credits")}</td>
              <td>{getVal(row, "raw_score")}</td>
              <td>{getVal(row, "average")}</td>
              <td>{getVal(row, "achievement")}</td>
              <td>{getVal(row, "student_count")}</td>
              <td>{getVal(row, "achievement_distribution")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ArtsPhysicalTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>학년</th>
            <th>학기</th>
            <th>교과</th>
            <th>과목</th>
            <th>단위</th>
            <th>성취도</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "year")}</td>
              <td>{getVal(row, "semester")}</td>
              <td>{getVal(row, "category")}</td>
              <td>{getVal(row, "subject")}</td>
              <td>{getVal(row, "credits")}</td>
              <td>{getVal(row, "achievement")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EvaluationsTab = ({ data }: { data: Record<string, unknown>[] }) => {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    new Set()
  );

  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  const handleToggle = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div>
      {data.map((row, i) => (
        <div key={i} className={styles.evaluationCard}>
          <button
            className={styles.evaluationHeader}
            onClick={() => handleToggle(i)}
          >
            <span className={styles.evaluationSubject}>
              {getVal(row, "subject")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className={styles.evaluationYear}>
                {getVal(row, "year")}학년
              </span>
              {expandedIndices.has(i) ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </span>
          </button>
          {expandedIndices.has(i) && (
            <div className={styles.evaluationBody}>
              {getVal(row, "evaluation")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ReadingTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>학년</th>
            <th>교과/영역</th>
            <th>내용</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{getVal(row, "year")}</td>
              <td>{getVal(row, "subject_or_area")}</td>
              <td>{getVal(row, "content")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const BehavioralTab = ({ data }: { data: Record<string, unknown>[] }) => {
  if (data.length === 0) {
    return <div className={styles.emptySection}>데이터 없음</div>;
  }

  return (
    <div>
      {data.map((row, i) => (
        <div key={i} className={styles.yearGroup}>
          <div className={styles.yearLabel}>{getVal(row, "year")}학년</div>
          <div className={styles.assessmentText}>
            {getVal(row, "assessment")}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================================
   Detail Modal Component
   ============================================ */
const RecordDetailModal = ({
  recordId,
  onClose,
}: {
  recordId: string;
  onClose: () => void;
}) => {
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("info");

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/records/${recordId}`);
        if (!response.ok) {
          const body = await response.json();
          throw new Error(
            body.error ?? "레코드 상세 정보를 불러오는데 실패했습니다."
          );
        }
        const data: RecordDetail = await response.json();
        setDetail(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [recordId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const renderTabContent = () => {
    if (!detail) return null;

    switch (activeTab) {
      case "info":
        return <InfoTab detail={detail} />;
      case "attendance":
        return <AttendanceTab data={detail.attendance} />;
      case "awards":
        return <AwardsTab data={detail.awards} />;
      case "certifications":
        return <CertificationsTab data={detail.certifications} />;
      case "creative":
        return <CreativeActivitiesTab data={detail.creativeActivities} />;
      case "volunteer":
        return <VolunteerTab data={detail.volunteerActivities} />;
      case "general":
        return <GeneralSubjectsTab data={detail.generalSubjects} />;
      case "career":
        return <CareerSubjectsTab data={detail.careerSubjects} />;
      case "artsPhysical":
        return <ArtsPhysicalTab data={detail.artsPhysicalSubjects} />;
      case "evaluations":
        return <EvaluationsTab data={detail.subjectEvaluations} />;
      case "reading":
        return <ReadingTab data={detail.readingActivities} />;
      case "behavioral":
        return <BehavioralTab data={detail.behavioralAssessments} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            레코드 상세 - {truncateId(recordId)}
          </h2>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className={styles.loader}>
            <Loader2 size={32} className={styles.spinner} />
          </div>
        ) : error ? (
          <div className={styles.tabContent}>
            <EmptyState title="오류 발생" description={error} />
          </div>
        ) : (
          <>
            <div className={styles.tabs}>
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`${styles.tab} ${
                    activeTab === tab.key ? styles.tabActive : ""
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className={styles.modalBody}>
              <div className={styles.tabContent}>{renderTabContent()}</div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

/* ============================================
   Main Records Page
   ============================================ */
const RecordsPage = () => {
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalCount: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSearchRef = useRef("");

  const fetchRecords = useCallback(
    async (
      page: number,
      search: string,
      type: string,
      grade: string,
      verified: string
    ) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ITEMS_PER_PAGE),
        });

        if (search) params.set("search", search);
        if (type) params.set("type", type);
        if (grade) params.set("grade", grade);
        if (verified) params.set("verified", verified);

        const response = await fetch(`/api/admin/records?${params.toString()}`);
        if (!response.ok) {
          throw new Error("레코드 목록을 불러오는데 실패했습니다.");
        }

        const body = await response.json();
        setRecords(body.data);
        setPagination(body.pagination);
      } catch (err) {
        console.error("Failed to fetch records:", err);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial fetch and refetch on filter changes (always reset to page 1)
  useEffect(() => {
    fetchRecords(
      1,
      currentSearchRef.current,
      typeFilter,
      gradeFilter,
      verifiedFilter
    );
  }, [fetchRecords, typeFilter, gradeFilter, verifiedFilter]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      currentSearchRef.current = value;
      fetchRecords(1, value, typeFilter, gradeFilter, verifiedFilter);
    }, DEBOUNCE_DELAY);
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    fetchRecords(
      page,
      currentSearchRef.current,
      typeFilter,
      gradeFilter,
      verifiedFilter
    );
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleGradeChange = (value: string) => {
    setGradeFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleVerifiedChange = (checked: boolean) => {
    const value = checked ? "true" : "";
    setVerifiedFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDetailOpen = (recordId: string) => {
    setSelectedRecordId(recordId);
  };

  const handleDetailClose = useCallback(() => {
    setSelectedRecordId(null);
  }, []);

  /* ============================================
     Table Columns
     ============================================ */
  const columns: Column<AdminRecord>[] = [
    {
      key: "id",
      header: "ID",
      width: "80px",
      align: "left",
      render: (item) => (
        <span className={styles.idCell}>{truncateId(item.id)}</span>
      ),
    },
    {
      key: "userName",
      header: "유저",
      align: "left",
      render: (item) => (
        <span className={styles.userLink}>{item.userName ?? "-"}</span>
      ),
    },
    {
      key: "submissionType",
      header: "제출 방식",
      width: "100px",
      align: "center",
      render: (item) => (
        <Badge variant={item.submissionType === "text" ? "neutral" : "info"}>
          {SUBMISSION_TYPE_LABEL[item.submissionType] ?? item.submissionType}
        </Badge>
      ),
    },
    {
      key: "gradeLevel",
      header: "학년",
      width: "80px",
      align: "center",
      render: (item) => GRADE_LABEL_MAP[item.gradeLevel] ?? item.gradeLevel,
    },
    {
      key: "textVerified",
      header: "검증",
      width: "80px",
      align: "center",
      render: (item) => (
        <span
          className={`${styles.verifiedIcon} ${
            item.textVerified ? styles.verifiedTrue : styles.verifiedFalse
          }`}
        >
          {item.textVerified ? "\u2713" : "\u2717"}
        </span>
      ),
    },
    {
      key: "orderStatus",
      header: "주문 상태",
      width: "120px",
      align: "center",
      render: (item) => {
        if (!item.orderStatus) {
          return (
            <span style={{ color: "var(--color-fg-tertiary)", fontSize: 13 }}>
              -
            </span>
          );
        }
        const mapping =
          ORDER_STATUS_BADGE_MAP[item.orderStatus as OrderStatusKey];
        return (
          <Badge variant={mapping?.variant ?? "neutral"}>
            {mapping?.label ?? item.orderStatus}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "제출일",
      width: "120px",
      align: "left",
      render: (item) => (
        <span className={styles.dateCell}>{formatDate(item.createdAt)}</span>
      ),
    },
    {
      key: "action",
      header: "액션",
      width: "80px",
      align: "center",
      render: (item) => (
        <button
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation();
            handleDetailOpen(item.id);
          }}
        >
          상세보기
        </button>
      ),
    },
  ];

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.header}>
        <h1 className={styles.title}>생기부 관리</h1>
        <p className={styles.subtitle}>
          제출된 생활기록부 데이터를 조회하고 관리합니다.
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="유저 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className={styles.filterRow}>
          <select
            className={styles.selectFilter}
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="">전체 제출 방식</option>
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="text">Text</option>
          </select>

          <select
            className={styles.selectFilter}
            value={gradeFilter}
            onChange={(e) => handleGradeChange(e.target.value)}
          >
            <option value="">전체 학년</option>
            <option value="high1">1학년</option>
            <option value="high2">2학년</option>
            <option value="high3">3학년</option>
            <option value="repeat">재수</option>
          </select>
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={verifiedFilter === "true"}
            onChange={(e) => handleVerifiedChange(e.target.checked)}
          />
          검증완료만
        </label>
      </div>

      {/* Table (desktop) */}
      <div className={`${styles.tableCard} ${styles.tableHide}`}>
        {!isLoading && records.length === 0 ? (
          <EmptyState
            title="레코드가 없습니다"
            description="조건에 맞는 생기부 레코드가 없습니다. 필터를 조정해 보세요."
          />
        ) : (
          <DataTable columns={columns} data={records} isLoading={isLoading} />
        )}
      </div>

      {/* Card List (mobile) */}
      <div className={styles.cardList}>
        {isLoading ? (
          <div className={styles.loader}>
            <Loader2 size={20} className={styles.spinner} />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title="레코드가 없습니다"
            description="조건에 맞는 생기부 레코드가 없습니다. 필터를 조정해 보세요."
          />
        ) : (
          records.map((record) => {
            const orderMapping = record.orderStatus
              ? ORDER_STATUS_BADGE_MAP[record.orderStatus as OrderStatusKey]
              : null;
            return (
              <div
                key={record.id}
                className={styles.card}
                onClick={() => handleDetailOpen(record.id)}
              >
                <div className={styles.cardTop}>
                  <span className={styles.cardUserName}>
                    {record.userName ?? "-"}
                  </span>
                  <Badge
                    variant={
                      record.submissionType === "text" ? "neutral" : "info"
                    }
                  >
                    {SUBMISSION_TYPE_LABEL[record.submissionType] ??
                      record.submissionType}
                  </Badge>
                </div>
                <div className={styles.cardId}>{truncateId(record.id)}</div>
                <div className={styles.cardDivider} />
                <div className={styles.cardMeta}>
                  <span>
                    {GRADE_LABEL_MAP[record.gradeLevel] ?? record.gradeLevel}
                  </span>
                  <span className={styles.cardMetaDot} />
                  <span
                    className={
                      record.textVerified
                        ? styles.verifiedTrue
                        : styles.verifiedFalse
                    }
                  >
                    {record.textVerified ? "\u2713 검증" : "\u2717 미검증"}
                  </span>
                  {orderMapping && (
                    <>
                      <span className={styles.cardMetaDot} />
                      <Badge variant={orderMapping.variant}>
                        {orderMapping.label}
                      </Badge>
                    </>
                  )}
                </div>
                <div className={styles.cardBottom}>
                  <span className={styles.cardDate}>
                    {formatDate(record.createdAt)}
                  </span>
                  <button
                    className={styles.cardAction}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDetailOpen(record.id);
                    }}
                  >
                    상세보기
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          onPageChange={handlePageChange}
        />
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRecordId && (
          <RecordDetailModal
            recordId={selectedRecordId}
            onClose={handleDetailClose}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RecordsPage;
