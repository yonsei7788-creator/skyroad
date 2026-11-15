"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Search,
  Check,
  User,
  Phone,
  School,
  CalendarDays,
  GraduationCap,
  MapPin,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { SCHOOL_TYPES, REGION_OPTIONS, GENDER_OPTIONS } from "./types";
import type { ProfileStepData } from "./types";

import styles from "../page.module.css";

interface ProfileStepProps {
  initialData: ProfileStepData;
  onComplete: (data: ProfileStepData) => void;
}

interface SchoolResult {
  name: string;
  type: string;
  address: string;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  gender?: string;
  highSchoolName?: string;
  highSchoolType?: string;
  grade?: string;
  admissionYear?: string;
}

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

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

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

export const ProfileStep = ({ initialData, onComplete }: ProfileStepProps) => {
  const [profile, setProfile] = useState<ProfileStepData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleCloseSchoolModal = () => {
    setIsSchoolModalOpen(false);
    setSchoolQuery("");
    setSchoolResults([]);
  };

  const handleSelectSchool = (school: SchoolResult) => {
    const validType = SCHOOL_TYPES.includes(
      school.type as (typeof SCHOOL_TYPES)[number]
    )
      ? school.type
      : "";
    // 주소 첫 단어에서 시/도 추출 (예: "서울특별시 강남구..." → "서울특별시")
    const region = school.address?.split(" ")[0] ?? "";
    setProfile((prev) => ({
      ...prev,
      highSchoolName: school.name,
      highSchoolType: validType,
      highSchoolRegion: region,
    }));
    setErrors((prev) => ({
      ...prev,
      highSchoolName: undefined,
      highSchoolType: undefined,
    }));
    handleCloseSchoolModal();
  };

  const handleManualSelect = () => {
    setProfile((prev) => ({
      ...prev,
      highSchoolName: schoolQuery,
      highSchoolType: "",
      highSchoolRegion: "",
    }));
    setErrors((prev) => ({ ...prev, highSchoolName: undefined }));
    handleCloseSchoolModal();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseSchoolModal();
    }
  };

  const handleChange = (
    field: keyof ProfileStepData,
    value: string | number | null
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleChange("phone", formatted);
  };

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!profile.name.trim()) {
      newErrors.name = "이름을 입력해주세요.";
    } else if (profile.name.trim().length > 20) {
      newErrors.name = "이름은 20자 이내로 입력해주세요.";
    }

    if (!profile.phone) {
      newErrors.phone = "전화번호를 입력해주세요.";
    } else if (!/^010-\d{4}-\d{4}$/.test(profile.phone)) {
      newErrors.phone = "010-XXXX-XXXX 형식으로 입력해주세요.";
    }

    if (!profile.gender) {
      newErrors.gender = "성별을 선택해주세요.";
    }

    if (!profile.highSchoolName.trim()) {
      newErrors.highSchoolName = "고등학교를 선택해주세요.";
    }

    if (!profile.grade) {
      newErrors.grade = "학년을 선택해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const data = await res.json();
        const message =
          data.error?.message || data.error || "저장에 실패했습니다.";
        setErrors({ name: message });
        return;
      }

      onComplete(profile);
    } catch {
      setErrors({ name: "네트워크 오류가 발생했습니다. 다시 시도해주세요." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>입시 정보를 입력해주세요</h2>
          <p className={styles.stepDesc}>
            정확한 분석을 위해 기본 정보가 필요합니다
          </p>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="ob-name" className={styles.label}>
                <User size={14} className={styles.labelIcon} />
                이름 <span className={styles.required}>*</span>
              </label>
              <input
                id="ob-name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                placeholder="이름을 입력해주세요"
                value={profile.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
              {errors.name && (
                <span className={styles.fieldError}>{errors.name}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="ob-phone" className={styles.label}>
                <Phone size={14} className={styles.labelIcon} />
                전화번호 <span className={styles.required}>*</span>
              </label>
              <input
                id="ob-phone"
                type="tel"
                className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                placeholder="010-0000-0000"
                value={profile.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
              {errors.phone && (
                <span className={styles.fieldError}>{errors.phone}</span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <User size={14} className={styles.labelIcon} />
              성별 <span className={styles.required}>*</span>
            </label>
            <div className={styles.fieldRow}>
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.selectButton} ${profile.gender === opt.value ? styles.selectButtonActive : ""}`}
                  onClick={() => handleChange("gender", opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.gender && (
              <span className={styles.fieldError}>{errors.gender}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="ob-school" className={styles.label}>
              <School size={14} className={styles.labelIcon} />
              고등학교 <span className={styles.required}>*</span>
            </label>
            <div className={styles.schoolInputRow}>
              <input
                id="ob-school"
                type="text"
                className={`${styles.inputDisabled} ${errors.highSchoolName ? styles.inputError : ""}`}
                value={profile.highSchoolName || ""}
                placeholder="학교를 검색해주세요"
                disabled
              />
              <button
                type="button"
                className={styles.schoolSearchButton}
                onClick={() => {
                  setSchoolQuery("");
                  setSchoolResults([]);
                  setIsSchoolModalOpen(true);
                }}
              >
                <Search size={16} />
                검색
              </button>
            </div>
            {errors.highSchoolName && (
              <span className={styles.fieldError}>{errors.highSchoolName}</span>
            )}
            {profile.highSchoolName && !errors.highSchoolName && (
              <span className={styles.fieldSuccess}>
                <Check size={12} />
                {profile.highSchoolName} 선택됨
              </span>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="ob-schoolType" className={styles.label}>
                <School size={14} className={styles.labelIcon} />
                학교 유형
              </label>
              <select
                id="ob-schoolType"
                className={styles.select}
                value={profile.highSchoolType}
                onChange={(e) => handleChange("highSchoolType", e.target.value)}
              >
                <option value="">선택해주세요</option>
                {SCHOOL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="ob-schoolRegion" className={styles.label}>
                <MapPin size={14} className={styles.labelIcon} />
                고교 소재지
              </label>
              <select
                id="ob-schoolRegion"
                className={styles.select}
                value={profile.highSchoolRegion}
                onChange={(e) =>
                  handleChange("highSchoolRegion", e.target.value)
                }
              >
                <option value="">선택해주세요</option>
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="ob-admissionYear" className={styles.label}>
                <CalendarDays size={14} className={styles.labelIcon} />
                입학년도
              </label>
              <select
                id="ob-admissionYear"
                className={styles.select}
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
            </div>

            <div className={styles.field}>
              <label htmlFor="ob-grade" className={styles.label}>
                <GraduationCap size={14} className={styles.labelIcon} />
                학년 <span className={styles.required}>*</span>
              </label>
              <select
                id="ob-grade"
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
                <span className={styles.fieldError}>{errors.grade}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.wizardNav}>
          <div />
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
                다음
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {isSchoolModalOpen && (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ob-school-modal-title"
          >
            <div className={styles.modalHeader}>
              <h2 id="ob-school-modal-title" className={styles.modalTitle}>
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
    </>
  );
};
