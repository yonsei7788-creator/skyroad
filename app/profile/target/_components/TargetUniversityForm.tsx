"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
  Check,
  AlertCircle,
  Target,
  Sparkles,
} from "lucide-react";

import styles from "../page.module.css";

// ─── Types ───

type UniversityPriority = 1 | 2 | 3;

interface TargetUniversity {
  id?: string;
  priority: UniversityPriority;
  universityName: string;
  admissionType: string;
  department: string;
  subField: string;
}

interface UniversityResult {
  name: string;
  type: string;
  address: string;
  region: string;
}

interface ToastData {
  message: string;
  type: "success" | "error";
}

const ADMISSION_TYPES = [
  "학생부종합",
  "학생부교과",
  "논술",
  "실기/실적",
  "기타",
] as const;

const PRIORITY_META: {
  label: string;
  sublabel: string;
  color: string;
}[] = [
  { label: "1지망", sublabel: "최우선 목표", color: "primary" },
  { label: "2지망", sublabel: "차선 목표", color: "secondary" },
  { label: "3지망", sublabel: "안전 목표", color: "tertiary" },
];

// ─── Helpers ───

const createEmptyTarget = (priority: UniversityPriority): TargetUniversity => ({
  priority,
  universityName: "",
  admissionType: "",
  department: "",
  subField: "",
});

const isTargetFilled = (t: TargetUniversity): boolean =>
  !!(t.universityName.trim() && t.admissionType && t.department.trim());

const highlightMatch = (text: string, query: string): ReactNode => {
  if (!query) return text;
  const idx = text.indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.highlight}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

// ─── Component ───

interface TargetUniversityFormProps {
  initialTargets: TargetUniversity[];
}

export const TargetUniversityForm = ({
  initialTargets,
}: TargetUniversityFormProps) => {
  const router = useRouter();
  const [targets, setTargets] = useState<TargetUniversity[]>(() =>
    initialTargets.length > 0 ? initialTargets : [createEmptyTarget(1)]
  );
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    initialTargets.forEach((t) => {
      if (isTargetFilled(t)) initial[t.priority] = true;
    });
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // University search modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UniversityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchingPriority, setSearchingPriority] =
    useState<UniversityPriority>(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  // Debounced university search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/universities?q=${encodeURIComponent(searchQuery)}`
        );
        const data: UniversityResult[] = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Modal open/close — prevent background scroll (incl. iOS Safari)
  useEffect(() => {
    if (!isModalOpen) return;

    const { scrollY } = window;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => searchInputRef.current?.focus(), 100);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseModal();
    };
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleEsc);
      clearTimeout(timer);
    };
  }, [isModalOpen]);

  const handleOpenModal = (priority: UniversityPriority) => {
    setSearchingPriority(priority);
    setSearchQuery("");
    setSearchResults([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSelectUniversity = (university: UniversityResult) => {
    handleFieldChange(searchingPriority, "universityName", university.name);
    clearError(`${searchingPriority}-universityName`);
    handleCloseModal();
  };

  const handleManualSelect = () => {
    handleFieldChange(searchingPriority, "universityName", searchQuery);
    handleCloseModal();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCloseModal();
  };

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleFieldChange = (
    priority: UniversityPriority,
    field: keyof TargetUniversity,
    value: string
  ) => {
    setTargets((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((t) => t.priority === priority);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], [field]: value };
      } else {
        updated.push({ ...createEmptyTarget(priority), [field]: value });
      }
      return updated;
    });
    clearError(`${priority}-${field}`);
  };

  const getTarget = (priority: UniversityPriority): TargetUniversity =>
    targets.find((t) => t.priority === priority) ?? createEmptyTarget(priority);

  const handleAddSlot = () => {
    const nextPriority = (targets.length + 1) as UniversityPriority;
    if (nextPriority > 3) return;
    setTargets((prev) => [...prev, createEmptyTarget(nextPriority)]);
  };

  const handleRemoveSlot = (priority: UniversityPriority) => {
    setTargets((prev) => {
      const filtered = prev.filter((t) => t.priority !== priority);
      return filtered.map((t, idx) => ({
        ...t,
        priority: (idx + 1) as UniversityPriority,
      }));
    });
    setCollapsed((prev) => {
      const next = { ...prev };
      delete next[priority];
      return next;
    });
  };

  const toggleCollapse = (priority: number) => {
    setCollapsed((prev) => ({ ...prev, [priority]: !prev[priority] }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const primary = getTarget(1);

    if (!primary.universityName.trim()) {
      newErrors["1-universityName"] = "1지망 대학명을 입력해주세요.";
    }
    if (!primary.admissionType) {
      newErrors["1-admissionType"] = "1지망 전형을 선택해주세요.";
    }
    if (!primary.department.trim()) {
      newErrors["1-department"] = "1지망 모집단위를 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const filledTargets = targets.filter(
        (t) => t.universityName.trim() || t.department.trim()
      );

      const res = await fetch("/api/onboarding/universities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universities: filledTargets }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "저장에 실패했습니다.", "error");
        return;
      }

      showToast("목표 대학이 저장되었습니다.");
      setTimeout(() => router.push("/profile/settings"), 1200);
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filledCount = targets.filter(isTargetFilled).length;

  return (
    <>
      <section className={styles.section}>
        {/* Hero */}
        <div className={styles.heroArea}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <span className={styles.sectionLabel}>Target University</span>
            <h1 className={styles.pageTitle}>목표 대학 설정</h1>
            <p className={styles.pageSubtitle}>
              AI 리포트의 합격 예측 및 입시 전략에 활용됩니다
            </p>
          </div>
        </div>

        <div className={styles.container}>
          {/* Status */}
          <div className={styles.statusBar}>
            <div className={styles.statusItem}>
              <Target size={15} />
              <span>{filledCount}개 대학 설정됨</span>
            </div>
            <div className={styles.statusDivider} />
            <div className={styles.statusItem}>
              <Sparkles size={15} />
              <span>
                1지망 {isTargetFilled(getTarget(1)) ? "설정 완료" : "미설정"}
              </span>
            </div>
          </div>

          {/* Target Cards */}
          <div className={styles.targetList}>
            {targets.map((_, idx) => {
              const priority = (idx + 1) as UniversityPriority;
              const target = getTarget(priority);
              const meta = PRIORITY_META[priority - 1];
              const isRequired = priority === 1;
              const isCollapsed = collapsed[priority] && isTargetFilled(target);
              const filled = isTargetFilled(target);

              return (
                <div
                  key={priority}
                  className={`${styles.targetCard} ${filled ? styles.targetCardFilled : ""}`}
                >
                  <button
                    type="button"
                    className={styles.targetCardHeader}
                    onClick={() => toggleCollapse(priority)}
                  >
                    <div className={styles.targetHeaderLeft}>
                      <span
                        className={`${styles.priorityBadge} ${styles[`priority${meta.color}`]}`}
                      >
                        {meta.label}
                      </span>
                      {isRequired && (
                        <span className={styles.requiredTag}>필수</span>
                      )}
                      {isCollapsed && (
                        <span className={styles.targetSummary}>
                          {target.universityName} · {target.department}
                        </span>
                      )}
                    </div>
                    <div className={styles.targetHeaderRight}>
                      {filled && (
                        <span className={styles.filledBadge}>
                          <Check size={12} />
                        </span>
                      )}
                      {!isRequired && (
                        <button
                          type="button"
                          className={styles.targetRemoveBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSlot(priority);
                          }}
                          aria-label={`${meta.label} 삭제`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {isCollapsed ? (
                        <ChevronDown size={16} className={styles.chevron} />
                      ) : (
                        <ChevronUp size={16} className={styles.chevron} />
                      )}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className={styles.targetFields}>
                      {/* University Name */}
                      <div className={styles.field}>
                        <label className={styles.label}>
                          <GraduationCap
                            size={15}
                            className={styles.labelIcon}
                          />
                          대학명
                          {isRequired && (
                            <span className={styles.required}>*</span>
                          )}
                        </label>
                        <div className={styles.searchInputRow}>
                          <input
                            type="text"
                            className={`${styles.inputDisabled} ${errors[`${priority}-universityName`] ? styles.inputError : ""}`}
                            value={target.universityName || ""}
                            placeholder="대학교를 검색해주세요"
                            disabled
                          />
                          <button
                            type="button"
                            className={styles.searchButton}
                            onClick={() => handleOpenModal(priority)}
                            aria-label="대학교 검색"
                          >
                            <Search size={15} />
                            검색
                          </button>
                        </div>
                        {errors[`${priority}-universityName`] && (
                          <span className={styles.fieldError}>
                            <AlertCircle size={12} />
                            {errors[`${priority}-universityName`]}
                          </span>
                        )}
                        {target.universityName &&
                          !errors[`${priority}-universityName`] && (
                            <span className={styles.fieldSuccess}>
                              <Check size={12} />
                              {target.universityName} 선택됨
                            </span>
                          )}
                      </div>

                      {/* Admission Type */}
                      <div className={styles.field}>
                        <label className={styles.label}>
                          전형
                          {isRequired && (
                            <span className={styles.required}>*</span>
                          )}
                        </label>
                        <select
                          className={`${styles.select} ${errors[`${priority}-admissionType`] ? styles.inputError : ""}`}
                          value={target.admissionType}
                          onChange={(e) =>
                            handleFieldChange(
                              priority,
                              "admissionType",
                              e.target.value
                            )
                          }
                        >
                          <option value="">전형을 선택해주세요</option>
                          {ADMISSION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        {errors[`${priority}-admissionType`] && (
                          <span className={styles.fieldError}>
                            <AlertCircle size={12} />
                            {errors[`${priority}-admissionType`]}
                          </span>
                        )}
                      </div>

                      {/* Department + Sub-field */}
                      <div className={styles.fieldRow}>
                        <div className={styles.field}>
                          <label className={styles.label}>
                            모집단위
                            {isRequired && (
                              <span className={styles.required}>*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            className={`${styles.input} ${errors[`${priority}-department`] ? styles.inputError : ""}`}
                            placeholder="예: 컴퓨터공학과"
                            value={target.department}
                            onChange={(e) =>
                              handleFieldChange(
                                priority,
                                "department",
                                e.target.value
                              )
                            }
                          />
                          {errors[`${priority}-department`] && (
                            <span className={styles.fieldError}>
                              <AlertCircle size={12} />
                              {errors[`${priority}-department`]}
                            </span>
                          )}
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label}>소계열</label>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="예: 공학"
                            value={target.subField}
                            onChange={(e) =>
                              handleFieldChange(
                                priority,
                                "subField",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {targets.length < 3 && (
              <button
                type="button"
                className={styles.addTargetBtn}
                onClick={handleAddSlot}
              >
                <Plus size={16} />
                {PRIORITY_META[targets.length].label} 추가
              </button>
            )}
          </div>

          {/* Submit */}
          <div className={styles.submitArea}>
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className={styles.spinner} />
                  저장 중...
                </>
              ) : (
                <>
                  <Check size={18} />
                  저장하기
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* University Search Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="uni-modal-title"
          >
            <div className={styles.modalHeader}>
              <h2 id="uni-modal-title" className={styles.modalTitle}>
                대학교 검색
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={handleCloseModal}
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalSearchBar}>
              <Search size={18} className={styles.modalSearchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.modalSearchInput}
                placeholder="대학교명을 입력해주세요 (2자 이상)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {isSearching && <div className={styles.searchSpinner} />}
            </div>

            <div className={styles.modalBody}>
              {searchQuery.length < 2 && (
                <div className={styles.modalEmpty}>
                  <GraduationCap
                    size={40}
                    className={styles.modalEmptyIcon}
                    strokeWidth={1.5}
                  />
                  <p>대학교명을 2자 이상 입력해주세요</p>
                </div>
              )}

              {searchQuery.length >= 2 &&
                !isSearching &&
                searchResults.length === 0 && (
                  <div className={styles.modalNoResult}>
                    <Search
                      size={40}
                      className={styles.modalEmptyIcon}
                      strokeWidth={1.5}
                    />
                    <p className={styles.modalNoResultText}>
                      검색 결과가 없습니다
                    </p>
                    <button
                      type="button"
                      className={styles.manualSelectButton}
                      onClick={handleManualSelect}
                    >
                      <span className={styles.manualSelectName}>
                        {searchQuery}
                      </span>
                      을(를) 직접 입력하시겠습니까?
                    </button>
                  </div>
                )}

              {searchResults.length > 0 && (
                <ul className={styles.uniList}>
                  {searchResults.map((uni, idx) => (
                    <li key={`${uni.name}-${idx}`}>
                      <button
                        type="button"
                        className={styles.uniListItem}
                        onClick={() => handleSelectUniversity(uni)}
                      >
                        <div className={styles.uniListInfo}>
                          <span className={styles.uniListName}>
                            {highlightMatch(uni.name, searchQuery)}
                          </span>
                          <span className={styles.uniListAddress}>
                            {uni.address}
                          </span>
                        </div>
                        <span className={styles.uniListType}>{uni.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === "error" ? styles.toastError : ""}`}
        >
          {toast.type === "success" ? (
            <Check size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.message}
        </div>
      )}
    </>
  );
};
