"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Check,
  User,
  GraduationCap,
  Mail,
  Phone,
  School,
  CalendarDays,
  X,
  AlertCircle,
} from "lucide-react";

import { createClient } from "@/libs/supabase/client";

import styles from "../page.module.css";

interface ProfileData {
  name: string;
  phone: string;
  highSchoolName: string;
  highSchoolType: string;
  admissionYear: number | null;
  grade: string;
}

interface ProfileSettingsFormProps {
  email: string;
  initialProfile: ProfileData;
}

interface SchoolResult {
  name: string;
  type: string;
  address: string;
}

interface ToastData {
  message: string;
  type: "success" | "error";
}

type TabType = "personal" | "academic";

const SCHOOL_TYPES = [
  "일반고",
  "특목고",
  "자율고",
  "특성화고",
  "영재학교",
  "과학고",
  "외국어고",
  "국제고",
  "예술고",
  "체육고",
  "마이스터고",
] as const;

const GRADE_OPTIONS = [
  { value: "high1", label: "1학년" },
  { value: "high2", label: "2학년" },
  { value: "high3", label: "3학년" },
  { value: "graduate", label: "졸업생" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2015 + 1 },
  (_, i) => 2015 + i
).reverse();

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

export const ProfileSettingsForm = ({
  email,
  initialProfile,
}: ProfileSettingsFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const initialTab: TabType = tabParam === "academic" ? "academic" : "personal";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastData | null>(null);

  // School search modal
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/profile/settings?tab=${tab}`, { scroll: false });
  };

  // School search with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (schoolQuery.length < 2) {
      setSchoolResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/schools?q=${encodeURIComponent(schoolQuery)}`
        );
        const data: SchoolResult[] = await res.json();
        setSchoolResults(data);
      } catch {
        setSchoolResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [schoolQuery]);

  // Modal open: focus input, lock body scroll
  useEffect(() => {
    if (!isSchoolModalOpen) return;

    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseSchoolModal();
      }
    };
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEsc);
      clearTimeout(timer);
    };
  }, [isSchoolModalOpen]);

  const handleOpenSchoolModal = () => {
    setSchoolQuery("");
    setSchoolResults([]);
    setIsSchoolModalOpen(true);
  };

  const handleCloseSchoolModal = () => {
    setIsSchoolModalOpen(false);
    setSchoolQuery("");
    setSchoolResults([]);
  };

  const handleSelectSchool = (school: SchoolResult) => {
    setProfile((prev) => ({
      ...prev,
      highSchoolName: school.name,
      highSchoolType: school.type,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.highSchoolName;
      delete next.highSchoolType;
      return next;
    });
    handleCloseSchoolModal();
  };

  const handleManualSelect = () => {
    setProfile((prev) => ({
      ...prev,
      highSchoolName: schoolQuery,
      highSchoolType: "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.highSchoolName;
      return next;
    });
    handleCloseSchoolModal();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseSchoolModal();
    }
  };

  const handleChange = (
    field: keyof ProfileData,
    value: string | number | null
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateAcademic = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile.highSchoolName?.trim()) {
      newErrors.highSchoolName = "고등학교를 선택해주세요.";
    }
    if (!profile.highSchoolType) {
      newErrors.highSchoolType = "학교 유형을 선택해주세요.";
    }
    if (!profile.admissionYear) {
      newErrors.admissionYear = "입학년도를 선택해주세요.";
    }
    if (!profile.grade) {
      newErrors.grade = "학년을 선택해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "academic" && !validateAcademic()) {
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast("로그인이 필요합니다.", "error");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name || null,
        phone: profile.phone || null,
        high_school_name: profile.highSchoolName || null,
        high_school_type: profile.highSchoolType || null,
        admission_year: profile.admissionYear,
        grade: profile.grade || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setIsLoading(false);

    if (error) {
      showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
      return;
    }

    showToast("저장되었습니다.");
    router.refresh();
  };

  return (
    <section className={styles.section}>
      {/* Hero Area */}
      <div className={styles.heroArea}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <span className={styles.sectionLabel}>MY PAGE</span>
          <h1 className={styles.pageTitle}>내 정보 수정</h1>
          <p className={styles.pageSubtitle}>
            정확한 분석을 위해 프로필을 최신 상태로 유지해주세요
          </p>
        </div>
      </div>

      <div className={styles.container}>
        {/* Tabs */}
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            id="tab-personal"
            aria-selected={activeTab === "personal"}
            aria-controls="panel-personal"
            className={`${styles.tab} ${activeTab === "personal" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("personal")}
          >
            <User size={16} />
            개인정보
          </button>
          <button
            type="button"
            role="tab"
            id="tab-academic"
            aria-selected={activeTab === "academic"}
            aria-controls="panel-academic"
            className={`${styles.tab} ${activeTab === "academic" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("academic")}
          >
            <GraduationCap size={16} />
            입시 정보
          </button>
        </div>

        {/* Form */}
        <form className={styles.card} onSubmit={handleSubmit}>
          {/* 개인정보 탭 */}
          {activeTab === "personal" && (
            <div
              className={styles.tabPanel}
              role="tabpanel"
              id="panel-personal"
              aria-labelledby="tab-personal"
            >
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>
                    <Mail size={14} className={styles.labelIcon} />
                    이메일
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={styles.inputReadonly}
                    value={email}
                    readOnly
                  />
                  <span className={styles.fieldHint}>
                    이메일은 변경할 수 없습니다
                  </span>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="name" className={styles.label}>
                      <User size={14} className={styles.labelIcon} />
                      이름
                    </label>
                    <input
                      id="name"
                      type="text"
                      className={styles.input}
                      placeholder="이름을 입력해주세요"
                      value={profile.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="phone" className={styles.label}>
                      <Phone size={14} className={styles.labelIcon} />
                      전화번호
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className={styles.input}
                      placeholder="010-0000-0000"
                      value={profile.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 입시 정보 탭 */}
          {activeTab === "academic" && (
            <div
              className={styles.tabPanel}
              role="tabpanel"
              id="panel-academic"
              aria-labelledby="tab-academic"
            >
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="school" className={styles.label}>
                    <School size={14} className={styles.labelIcon} />
                    고등학교
                    <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.schoolInputRow}>
                    <input
                      id="school"
                      type="text"
                      className={`${styles.inputDisabled} ${errors.highSchoolName ? styles.inputError : ""}`}
                      value={profile.highSchoolName || ""}
                      placeholder="학교를 검색해주세요"
                      disabled
                    />
                    <button
                      type="button"
                      className={styles.schoolSearchButton}
                      onClick={handleOpenSchoolModal}
                    >
                      <Search size={16} />
                      검색
                    </button>
                  </div>
                  {errors.highSchoolName ? (
                    <span className={styles.fieldError}>
                      <AlertCircle size={12} />
                      {errors.highSchoolName}
                    </span>
                  ) : (
                    profile.highSchoolName && (
                      <span className={styles.fieldSuccess}>
                        <Check size={12} />
                        {profile.highSchoolName} 선택됨
                      </span>
                    )
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="schoolType" className={styles.label}>
                    <School size={14} className={styles.labelIcon} />
                    학교 유형
                    <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="schoolType"
                    className={`${styles.select} ${errors.highSchoolType ? styles.inputError : ""}`}
                    value={profile.highSchoolType}
                    onChange={(e) =>
                      handleChange("highSchoolType", e.target.value)
                    }
                  >
                    <option value="">선택해주세요</option>
                    {SCHOOL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.highSchoolType && (
                    <span className={styles.fieldError}>
                      <AlertCircle size={12} />
                      {errors.highSchoolType}
                    </span>
                  )}
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="admissionYear" className={styles.label}>
                      <CalendarDays size={14} className={styles.labelIcon} />
                      입학년도
                      <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="admissionYear"
                      className={`${styles.select} ${errors.admissionYear ? styles.inputError : ""}`}
                      value={profile.admissionYear ?? ""}
                      onChange={(e) =>
                        handleChange(
                          "admissionYear",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <option value="">선택해주세요</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}년
                        </option>
                      ))}
                    </select>
                    {errors.admissionYear && (
                      <span className={styles.fieldError}>
                        <AlertCircle size={12} />
                        {errors.admissionYear}
                      </span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="grade" className={styles.label}>
                      <GraduationCap size={14} className={styles.labelIcon} />
                      학년
                      <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="grade"
                      className={`${styles.select} ${errors.grade ? styles.inputError : ""}`}
                      value={profile.grade}
                      onChange={(e) => handleChange("grade", e.target.value)}
                    >
                      <option value="">선택해주세요</option>
                      {GRADE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.grade && (
                      <span className={styles.fieldError}>
                        <AlertCircle size={12} />
                        {errors.grade}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.submitArea}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </form>
      </div>

      {/* School Search Modal */}
      {isSchoolModalOpen && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div
            className={styles.modal}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-modal-title"
          >
            <div className={styles.modalHeader}>
              <h2 id="school-modal-title" className={styles.modalTitle}>
                고등학교 검색
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={handleCloseSchoolModal}
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
                placeholder="학교명을 입력해주세요 (2자 이상)"
                value={schoolQuery}
                onChange={(e) => setSchoolQuery(e.target.value)}
                autoComplete="off"
              />
              {isSearching && <div className={styles.searchSpinner} />}
            </div>

            <div className={styles.modalBody}>
              {schoolQuery.length < 2 && (
                <div className={styles.modalEmpty}>
                  <School
                    size={40}
                    className={styles.modalEmptyIcon}
                    strokeWidth={1.5}
                  />
                  <p>학교명을 2자 이상 입력해주세요</p>
                </div>
              )}

              {schoolQuery.length >= 2 &&
                !isSearching &&
                schoolResults.length === 0 && (
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
                        {schoolQuery}
                      </span>
                      을(를) 직접 입력하시겠습니까?
                    </button>
                  </div>
                )}

              {schoolResults.length > 0 && (
                <ul className={styles.schoolList}>
                  {schoolResults.map((school, idx) => (
                    <li key={`${school.name}-${idx}`}>
                      <button
                        type="button"
                        className={styles.schoolListItem}
                        onClick={() => handleSelectSchool(school)}
                      >
                        <div className={styles.schoolListInfo}>
                          <span className={styles.schoolListName}>
                            {highlightMatch(school.name, schoolQuery)}
                          </span>
                          <span className={styles.schoolListAddress}>
                            {school.address}
                          </span>
                        </div>
                        <span className={styles.schoolListType}>
                          {school.type}
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
    </section>
  );
};
