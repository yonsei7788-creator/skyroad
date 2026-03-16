"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
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
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { ADMISSION_TYPES } from "./types";
import type { TargetUniversity, UniversityPriority } from "./types";

import styles from "../page.module.css";

interface UniversityStepProps {
  initialData: TargetUniversity[];
  onComplete: (data: TargetUniversity[]) => void | Promise<void>;
  onBack: () => void;
}

interface UniversityResult {
  name: string;
  type: string;
  address: string;
  region: string;
}

const createEmptyTarget = (priority: UniversityPriority): TargetUniversity => ({
  priority,
  universityName: "",
  admissionType: "",
  department: "",
  subField: "",
});

const isTargetFilled = (t: TargetUniversity): boolean =>
  !!(t.universityName.trim() && t.admissionType && t.department.trim());

const PRIORITY_LABELS = ["1지망", "2지망", "3지망", "4지망", "5지망", "6지망"];

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

export const UniversityStep = ({
  initialData,
  onComplete,
  onBack,
}: UniversityStepProps) => {
  const [targets, setTargets] = useState<TargetUniversity[]>(() => {
    if (initialData.length > 0) return initialData;
    return [createEmptyTarget(1)];
  });
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // University search modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UniversityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchingPriority, setSearchingPriority] =
    useState<UniversityPriority>(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Department options per university
  const [departmentMap, setDepartmentMap] = useState<Record<string, string[]>>(
    {}
  );

  const fetchDepartments = useCallback(
    async (universityName: string) => {
      if (!universityName || departmentMap[universityName]) return;
      try {
        const res = await fetch(
          `/api/universities/departments?university=${encodeURIComponent(universityName)}`
        );
        const data: string[] = await res.json();
        setDepartmentMap((prev) => ({ ...prev, [universityName]: data }));
      } catch {
        setDepartmentMap((prev) => ({ ...prev, [universityName]: [] }));
      }
    },
    [departmentMap]
  );

  useEffect(() => {
    initialData.forEach((t) => {
      if (t.universityName) fetchDepartments(t.universityName);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced university search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

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
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Modal open/close effects
  useEffect(() => {
    if (!isModalOpen) return;

    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
      }
    };
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "";
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
    const prev = getTarget(searchingPriority);
    if (prev.universityName !== university.name) {
      handleFieldChange(searchingPriority, "department", "");
    }
    handleFieldChange(searchingPriority, "universityName", university.name);
    const errorKey = `${searchingPriority}-universityName`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
    fetchDepartments(university.name);
    handleCloseModal();
  };

  const handleManualSelect = () => {
    const prev = getTarget(searchingPriority);
    if (prev.universityName !== searchQuery) {
      handleFieldChange(searchingPriority, "department", "");
    }
    handleFieldChange(searchingPriority, "universityName", searchQuery);
    fetchDepartments(searchQuery);
    handleCloseModal();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
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

    const errorKey = `${priority}-${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const getTarget = (priority: UniversityPriority): TargetUniversity =>
    targets.find((t) => t.priority === priority) ?? createEmptyTarget(priority);

  const handleAddSlot = () => {
    const nextPriority = (targets.length + 1) as UniversityPriority;
    if (nextPriority > 6) return;
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
    const labels = ["1지망", "2지망", "3지망", "4지망", "5지망", "6지망"];

    for (const target of targets) {
      const p = target.priority;
      const label = labels[p - 1];

      if (!target.universityName.trim()) {
        newErrors[`${p}-universityName`] = `${label} 대학명을 입력해주세요.`;
      }
      if (!target.admissionType) {
        newErrors[`${p}-admissionType`] = `${label} 전형을 선택해주세요.`;
      }
      if (!target.department.trim()) {
        newErrors[`${p}-department`] = `${label} 모집단위를 입력해주세요.`;
      }
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
        setErrors({ general: data.error || "저장에 실패했습니다." });
        return;
      }

      await onComplete(filledTargets);
    } catch {
      setErrors({ general: "네트워크 오류가 발생했습니다." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>목표 대학을 설정해주세요</h2>
          <p className={styles.stepDesc}>
            1지망은 필수이며, 2~6지망은 선택입니다
          </p>
        </div>

        {errors.general && (
          <div className={styles.generalError}>{errors.general}</div>
        )}

        <div className={styles.targetList}>
          {targets.map((_, idx) => {
            const priority = (idx + 1) as UniversityPriority;
            const target = getTarget(priority);
            const isRequired = priority === 1;
            const isCollapsed = collapsed[priority] && isTargetFilled(target);

            return (
              <div key={priority} className={styles.targetCard}>
                <button
                  type="button"
                  className={styles.targetCardHeader}
                  onClick={() => toggleCollapse(priority)}
                >
                  <div className={styles.targetBadge}>
                    <GraduationCap size={14} />
                    {PRIORITY_LABELS[priority - 1]}
                    <span className={styles.requiredBadge}>
                      {isRequired ? "필수" : "선택"}
                    </span>
                  </div>
                  <div className={styles.targetHeaderActions}>
                    {isCollapsed && (
                      <span className={styles.targetSummary}>
                        {target.universityName} - {target.department}
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
                        aria-label={`${PRIORITY_LABELS[priority - 1]} 삭제`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isTargetFilled(target) &&
                      (isCollapsed ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronUp size={16} />
                      ))}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className={styles.targetFields}>
                    <div className={styles.field}>
                      <label className={styles.label}>
                        대학명
                        <span className={styles.required}>*</span>
                      </label>
                      <div className={styles.schoolInputRow}>
                        <input
                          type="text"
                          className={`${styles.inputDisabled} ${errors[`${priority}-universityName`] ? styles.inputError : ""}`}
                          value={target.universityName || ""}
                          placeholder="대학교를 검색해주세요"
                          disabled
                        />
                        <button
                          type="button"
                          className={styles.schoolSearchButton}
                          onClick={() => handleOpenModal(priority)}
                          aria-label="대학교 검색"
                        >
                          <Search size={16} />
                          검색
                        </button>
                      </div>
                      {errors[`${priority}-universityName`] && (
                        <span className={styles.fieldError}>
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

                    <div className={styles.field}>
                      <label className={styles.label}>
                        전형
                        <span className={styles.required}>*</span>
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
                          {errors[`${priority}-admissionType`]}
                        </span>
                      )}
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>
                          모집단위
                          <span className={styles.required}>*</span>
                        </label>
                        {(() => {
                          const depts = departmentMap[target.universityName];
                          const hasDepts = depts && depts.length > 0;
                          const noUniv = !target.universityName;

                          return hasDepts ? (
                            <select
                              className={`${styles.select} ${errors[`${priority}-department`] ? styles.inputError : ""}`}
                              value={target.department}
                              onChange={(e) =>
                                handleFieldChange(
                                  priority,
                                  "department",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">모집단위를 선택해주세요</option>
                              {depts.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className={`${styles.input} ${errors[`${priority}-department`] ? styles.inputError : ""}`}
                              placeholder={
                                noUniv
                                  ? "대학교를 먼저 선택해주세요"
                                  : "예: 컴퓨터공학과"
                              }
                              value={target.department}
                              disabled={noUniv}
                              onChange={(e) =>
                                handleFieldChange(
                                  priority,
                                  "department",
                                  e.target.value
                                )
                              }
                            />
                          );
                        })()}
                        {errors[`${priority}-department`] && (
                          <span className={styles.fieldError}>
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

          {targets.length < 6 && (
            <button
              type="button"
              className={styles.addTargetBtn}
              onClick={handleAddSlot}
            >
              <Plus size={16} />
              {PRIORITY_LABELS[targets.length]} 추가
            </button>
          )}
        </div>

        <div className={styles.stepActions}>
          <button
            type="button"
            className={styles.wizardBackBtn}
            onClick={onBack}
            disabled={isSaving}
          >
            <ArrowLeft size={16} />
            이전
          </button>
          <button
            type="button"
            className={styles.wizardNextBtn}
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                저장 중...
              </>
            ) : (
              <>
                완료
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

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
                <ul className={styles.schoolList}>
                  {searchResults.map((uni, idx) => (
                    <li key={`${uni.name}-${idx}`}>
                      <button
                        type="button"
                        className={styles.schoolListItem}
                        onClick={() => handleSelectUniversity(uni)}
                      >
                        <div className={styles.schoolListInfo}>
                          <span className={styles.schoolListName}>
                            {highlightMatch(uni.name, searchQuery)}
                          </span>
                          <span className={styles.schoolListAddress}>
                            {uni.address}
                          </span>
                        </div>
                        <span className={styles.schoolListType}>
                          {uni.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
