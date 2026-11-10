"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Compass,
  FlaskConical,
  GraduationCap,
  Languages,
  LineChart,
  Loader2,
  MapPin,
  Sigma,
  Target,
} from "lucide-react";

import { SearchableSelect } from "@/app/_components/SearchableSelect";
import type {
  ExamYear,
  InquirySubject,
  JeongsiInput,
  KoreanElective,
  MathElective,
  PreferredRegion,
  RiskAppetite,
  SuneungGrade,
} from "@/libs/jeongsi/types";

import {
  DEFAULT_EXAM_YEAR,
  EXAM_YEAR_OPTIONS,
  INQUIRY_SUBJECT_OPTIONS,
  KOREAN_ELECTIVE_OPTIONS,
  MATH_ELECTIVE_OPTIONS,
  MAX_GRADE,
  MAX_INQUIRY_STANDARD_SCORE,
  MAX_MAIN_STANDARD_SCORE,
  MAX_PERCENTILE,
  MIN_GRADE,
  PREFERRED_REGION_OPTIONS,
  RISK_APPETITE_DESCRIPTION,
  RISK_APPETITE_OPTIONS,
  SUNEUNG_GRADE_OPTIONS,
} from "../_lib/options";
import { checkScoreConsistency } from "../_lib/score-consistency";
import { savePendingInput } from "../_lib/pending-input";

import styles from "../page.module.css";

interface JeongsiFormProps {
  /** 2027 시행계획에 실제로 있는 표준 계열 목록 */
  categoryOptions: string[];
}

interface FormState {
  examYear: string;
  koreanElective: string;
  koreanStandardScore: string;
  koreanPercentile: string;
  mathElective: string;
  mathStandardScore: string;
  mathPercentile: string;
  englishGrade: string;
  inquiry1Subject: string;
  inquiry1StandardScore: string;
  inquiry1Percentile: string;
  inquiry2Subject: string;
  inquiry2StandardScore: string;
  inquiry2Percentile: string;
  historyGrade: string;
  target: string;
  region: string;
  risk: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

/** 표준점수 ↔ 백분위 정합성을 점검하는 네 영역 */
type ScoreAreaKey = "korean" | "math" | "inquiry1" | "inquiry2";

interface ScoreAreaConfig {
  key: ScoreAreaKey;
  label: string;
  standardScoreField: keyof FormState;
  percentileField: keyof FormState;
  maxStandardScore: number;
  kind: "main" | "inquiry";
}

const SCORE_AREAS: ScoreAreaConfig[] = [
  {
    key: "korean",
    label: "국어",
    standardScoreField: "koreanStandardScore",
    percentileField: "koreanPercentile",
    maxStandardScore: MAX_MAIN_STANDARD_SCORE,
    kind: "main",
  },
  {
    key: "math",
    label: "수학",
    standardScoreField: "mathStandardScore",
    percentileField: "mathPercentile",
    maxStandardScore: MAX_MAIN_STANDARD_SCORE,
    kind: "main",
  },
  {
    key: "inquiry1",
    label: "탐구1",
    standardScoreField: "inquiry1StandardScore",
    percentileField: "inquiry1Percentile",
    maxStandardScore: MAX_INQUIRY_STANDARD_SCORE,
    kind: "inquiry",
  },
  {
    key: "inquiry2",
    label: "탐구2",
    standardScoreField: "inquiry2StandardScore",
    percentileField: "inquiry2Percentile",
    maxStandardScore: MAX_INQUIRY_STANDARD_SCORE,
    kind: "inquiry",
  },
];

const INITIAL_STATE: FormState = {
  examYear: String(DEFAULT_EXAM_YEAR),
  koreanElective: "",
  koreanStandardScore: "",
  koreanPercentile: "",
  mathElective: "",
  mathStandardScore: "",
  mathPercentile: "",
  englishGrade: "",
  inquiry1Subject: "",
  inquiry1StandardScore: "",
  inquiry1Percentile: "",
  inquiry2Subject: "",
  inquiry2StandardScore: "",
  inquiry2Percentile: "",
  historyGrade: "",
  target: "",
  region: "",
  risk: "",
};

/** 숫자 입력칸에서 숫자 이외의 문자를 제거한다 */
const sanitizeNumeric = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 3);

/** 빈 문자열/비숫자를 null 로 바꾼다 */
const parseNumber = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * 한 영역의 표준점수 ↔ 백분위 경고 문구를 계산한다.
 * 두 칸이 모두 유효한 범위로 채워졌을 때만 점검한다.
 */
const resolveAreaWarning = (
  form: FormState,
  area: ScoreAreaConfig
): string | null => {
  const standardScore = parseNumber(form[area.standardScoreField]);
  const percentile = parseNumber(form[area.percentileField]);

  if (standardScore === null || percentile === null) {
    return null;
  }
  if (standardScore < 0 || standardScore > area.maxStandardScore) {
    return null;
  }
  if (percentile < 0 || percentile > MAX_PERCENTILE) {
    return null;
  }

  return checkScoreConsistency(
    area.label,
    standardScore,
    percentile,
    area.kind
  );
};

export const JeongsiForm = ({ categoryOptions }: JeongsiFormProps) => {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [warnings, setWarnings] = useState<
    Partial<Record<ScoreAreaKey, string>>
  >({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNumericChange = (field: keyof FormState, value: string) => {
    handleChange(field, sanitizeNumeric(value));
  };

  /** 점수 칸에서 포커스가 빠질 때 해당 영역의 경고만 갱신한다 */
  const handleScoreBlur = (key: ScoreAreaKey) => {
    const area = SCORE_AREAS.find((a) => a.key === key);
    if (!area) {
      return;
    }
    setWarnings((prev) => ({
      ...prev,
      [key]: resolveAreaWarning(form, area) ?? undefined,
    }));
  };

  /** 표준점수 한 칸 검증 */
  const validateStandardScore = (
    next: FieldErrors,
    field: keyof FormState,
    value: string,
    max: number,
    label: string
  ): number | null => {
    const parsed = parseNumber(value);
    if (parsed === null) {
      next[field] = `${label} 표준점수를 입력해주세요.`;
      return null;
    }
    if (parsed < 0 || parsed > max) {
      next[field] = `${label} 표준점수는 0~${max}점 사이로 입력해주세요.`;
      return null;
    }
    return parsed;
  };

  /** 백분위 한 칸 검증 */
  const validatePercentile = (
    next: FieldErrors,
    field: keyof FormState,
    value: string,
    label: string
  ): number | null => {
    const parsed = parseNumber(value);
    if (parsed === null) {
      next[field] = `${label} 백분위를 입력해주세요.`;
      return null;
    }
    if (parsed < 0 || parsed > MAX_PERCENTILE) {
      next[field] =
        `${label} 백분위는 0~${MAX_PERCENTILE} 사이로 입력해주세요.`;
      return null;
    }
    return parsed;
  };

  /**
   * 폼 전체를 검증한다.
   * 통과하면 JeongsiInput 을, 실패하면 null 을 반환하고 errors 를 채운다.
   * 경고(표준점수-백분위 불일치)는 제출을 막지 않는다.
   */
  const validate = (): JeongsiInput | null => {
    const next: FieldErrors = {};

    const examYear = parseNumber(form.examYear);
    const isSupportedYear = EXAM_YEAR_OPTIONS.some((y) => y === examYear);
    if (!isSupportedYear) {
      next.examYear = "수능 응시연도를 선택해주세요.";
    }

    if (!form.koreanElective) {
      next.koreanElective = "국어 선택과목을 선택해주세요.";
    }
    const koreanStandardScore = validateStandardScore(
      next,
      "koreanStandardScore",
      form.koreanStandardScore,
      MAX_MAIN_STANDARD_SCORE,
      "국어"
    );
    const koreanPercentile = validatePercentile(
      next,
      "koreanPercentile",
      form.koreanPercentile,
      "국어"
    );

    if (!form.mathElective) {
      next.mathElective = "수학 선택과목을 선택해주세요.";
    }
    const mathStandardScore = validateStandardScore(
      next,
      "mathStandardScore",
      form.mathStandardScore,
      MAX_MAIN_STANDARD_SCORE,
      "수학"
    );
    const mathPercentile = validatePercentile(
      next,
      "mathPercentile",
      form.mathPercentile,
      "수학"
    );

    const englishGrade = parseNumber(form.englishGrade);
    if (
      englishGrade === null ||
      englishGrade < MIN_GRADE ||
      englishGrade > MAX_GRADE
    ) {
      next.englishGrade = `영어 등급을 ${MIN_GRADE}~${MAX_GRADE} 사이로 선택해주세요.`;
    }

    if (!form.inquiry1Subject) {
      next.inquiry1Subject = "탐구1 과목을 선택해주세요.";
    }
    const inquiry1StandardScore = validateStandardScore(
      next,
      "inquiry1StandardScore",
      form.inquiry1StandardScore,
      MAX_INQUIRY_STANDARD_SCORE,
      "탐구1"
    );
    const inquiry1Percentile = validatePercentile(
      next,
      "inquiry1Percentile",
      form.inquiry1Percentile,
      "탐구1"
    );

    if (!form.inquiry2Subject) {
      next.inquiry2Subject = "탐구2 과목을 선택해주세요.";
    } else if (form.inquiry2Subject === form.inquiry1Subject) {
      next.inquiry2Subject = "탐구1과 다른 과목을 선택해주세요.";
    }
    const inquiry2StandardScore = validateStandardScore(
      next,
      "inquiry2StandardScore",
      form.inquiry2StandardScore,
      MAX_INQUIRY_STANDARD_SCORE,
      "탐구2"
    );
    const inquiry2Percentile = validatePercentile(
      next,
      "inquiry2Percentile",
      form.inquiry2Percentile,
      "탐구2"
    );

    const historyGrade = parseNumber(form.historyGrade);
    if (
      historyGrade === null ||
      historyGrade < MIN_GRADE ||
      historyGrade > MAX_GRADE
    ) {
      next.historyGrade = `한국사 등급을 ${MIN_GRADE}~${MAX_GRADE} 사이로 선택해주세요.`;
    }

    const target = form.target.trim();
    if (!target) {
      next.target = "희망 학과 또는 계열을 선택해주세요.";
    } else if (target.length > 50) {
      next.target = "희망 학과·계열은 50자 이내로 입력해주세요.";
    }

    if (!form.region) {
      next.region = "희망 지역을 선택해주세요.";
    }

    if (!form.risk) {
      next.risk = "지원 성향을 선택해주세요.";
    }

    // 표준점수 ↔ 백분위 정합성은 경고만 남기고 제출을 막지 않는다
    const nextWarnings: Partial<Record<ScoreAreaKey, string>> = {};
    for (const area of SCORE_AREAS) {
      const warning = resolveAreaWarning(form, area);
      if (warning) {
        nextWarnings[area.key] = warning;
      }
    }

    setErrors(next);
    setWarnings(nextWarnings);

    if (Object.keys(next).length > 0) {
      return null;
    }

    return {
      score: {
        examYear: examYear as ExamYear,
        korean: {
          elective: form.koreanElective as KoreanElective,
          standardScore: koreanStandardScore as number,
          percentile: koreanPercentile as number,
        },
        math: {
          elective: form.mathElective as MathElective,
          standardScore: mathStandardScore as number,
          percentile: mathPercentile as number,
        },
        english: { grade: englishGrade as SuneungGrade },
        inquiry1: {
          subject: form.inquiry1Subject as InquirySubject,
          standardScore: inquiry1StandardScore as number,
          percentile: inquiry1Percentile as number,
        },
        inquiry2: {
          subject: form.inquiry2Subject as InquirySubject,
          standardScore: inquiry2StandardScore as number,
          percentile: inquiry2Percentile as number,
        },
        history: { grade: historyGrade as SuneungGrade },
      },
      preference: {
        target,
        // 표준 계열 목록에 있으면 계열 단위, 직접 입력이면 개별 학과로 본다
        targetKind: categoryOptions.includes(target) ? "field" : "department",
        region: form.region as PreferredRegion,
        risk: form.risk as RiskAppetite,
      },
    };
  };

  /**
   * 직접 입력한 학과가 2027 정시 모집단위와 하나도 매칭되지 않는지.
   * 확인 요청 자체가 실패하면 제출을 막지 않는다(분석 단계에서 다시 판단).
   */
  const isUnmatchedTarget = async (target: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/jeongsi/target-check?target=${encodeURIComponent(target)}`
      );
      if (!res.ok) {
        return false;
      }
      const body = (await res.json()) as { matched?: boolean };
      return body.matched === false;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const input = validate();
    if (!input) {
      setGeneralError("입력값을 확인해주세요.");
      return;
    }

    setIsSubmitting(true);

    const { target, targetKind } = input.preference;
    if (targetKind === "department" && (await isUnmatchedTarget(target))) {
      setErrors((prev) => ({
        ...prev,
        target: `"${target}"에 해당하는 2027 정시 모집단위를 찾지 못했습니다. 정식 학과명(예: 컴퓨터공학과)으로 입력하거나 목록에서 계열을 선택해주세요.`,
      }));
      setGeneralError("희망 학과·계열을 확인해주세요.");
      setIsSubmitting(false);
      return;
    }

    savePendingInput(input);
    router.push("/jeongsi/generating");
  };

  const renderFieldError = (field: keyof FormState) =>
    errors[field] ? (
      <span className={styles.fieldError}>{errors[field]}</span>
    ) : null;

  const warningMessages = SCORE_AREAS.map((area) => warnings[area.key]).filter(
    (message): message is string => !!message
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* ─── 수능 응시연도 ─── */}
      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <span className={styles.blockTitle}>
            <CalendarDays size={18} className={styles.blockTitleIcon} />
            수능 응시연도
          </span>
          <span className={styles.blockDesc}>
            2026년 응시 수능은 2027학년도 정시에 반영됩니다.
          </span>
        </div>

        <div className={styles.field}>
          <label htmlFor="js-examYear" className={styles.label}>
            응시연도 <span className={styles.required}>*</span>
          </label>
          <select
            id="js-examYear"
            className={`${styles.select} ${errors.examYear ? styles.inputError : ""}`}
            value={form.examYear}
            onChange={(e) => handleChange("examYear", e.target.value)}
          >
            {EXAM_YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}년 수능 ({year + 1}학년도 정시)
              </option>
            ))}
          </select>
          {renderFieldError("examYear")}
        </div>
      </div>

      {/* ─── 국어 ─── */}
      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <span className={styles.blockTitle}>
            <BookOpen size={18} className={styles.blockTitleIcon} />
            국어
          </span>
        </div>

        <div className={styles.scoreRow}>
          <div className={styles.field}>
            <label className={styles.label}>
              선택과목 <span className={styles.required}>*</span>
            </label>
            <SearchableSelect
              options={[...KOREAN_ELECTIVE_OPTIONS]}
              value={form.koreanElective}
              onChange={(val) => handleChange("koreanElective", val)}
              placeholder="선택과목을 선택해주세요"
              hasError={!!errors.koreanElective}
            />
            {renderFieldError("koreanElective")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-koreanStd" className={styles.label}>
              표준점수 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-koreanStd"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.koreanStandardScore ? styles.inputError : ""}`}
              placeholder={`0~${MAX_MAIN_STANDARD_SCORE}`}
              value={form.koreanStandardScore}
              onChange={(e) =>
                handleNumericChange("koreanStandardScore", e.target.value)
              }
              onBlur={() => handleScoreBlur("korean")}
            />
            {renderFieldError("koreanStandardScore")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-koreanPct" className={styles.label}>
              백분위 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-koreanPct"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.koreanPercentile ? styles.inputError : ""}`}
              placeholder={`0~${MAX_PERCENTILE}`}
              value={form.koreanPercentile}
              onChange={(e) =>
                handleNumericChange("koreanPercentile", e.target.value)
              }
              onBlur={() => handleScoreBlur("korean")}
            />
            {renderFieldError("koreanPercentile")}
          </div>
        </div>
      </div>

      {/* ─── 수학 ─── */}
      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <span className={styles.blockTitle}>
            <Sigma size={18} className={styles.blockTitleIcon} />
            수학
          </span>
        </div>

        <div className={styles.scoreRow}>
          <div className={styles.field}>
            <label className={styles.label}>
              선택과목 <span className={styles.required}>*</span>
            </label>
            <SearchableSelect
              options={[...MATH_ELECTIVE_OPTIONS]}
              value={form.mathElective}
              onChange={(val) => handleChange("mathElective", val)}
              placeholder="선택과목을 선택해주세요"
              hasError={!!errors.mathElective}
            />
            {renderFieldError("mathElective")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-mathStd" className={styles.label}>
              표준점수 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-mathStd"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.mathStandardScore ? styles.inputError : ""}`}
              placeholder={`0~${MAX_MAIN_STANDARD_SCORE}`}
              value={form.mathStandardScore}
              onChange={(e) =>
                handleNumericChange("mathStandardScore", e.target.value)
              }
              onBlur={() => handleScoreBlur("math")}
            />
            {renderFieldError("mathStandardScore")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-mathPct" className={styles.label}>
              백분위 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-mathPct"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.mathPercentile ? styles.inputError : ""}`}
              placeholder={`0~${MAX_PERCENTILE}`}
              value={form.mathPercentile}
              onChange={(e) =>
                handleNumericChange("mathPercentile", e.target.value)
              }
              onBlur={() => handleScoreBlur("math")}
            />
            {renderFieldError("mathPercentile")}
          </div>
        </div>
      </div>

      {/* ─── 탐구 ─── */}
      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <span className={styles.blockTitle}>
            <FlaskConical size={18} className={styles.blockTitleIcon} />
            탐구
          </span>
          <span className={styles.blockDesc}>
            사회탐구·과학탐구 중 응시한 두 과목을 입력해주세요.
          </span>
        </div>

        <div className={styles.scoreRow}>
          <div className={styles.field}>
            <label className={styles.label}>
              탐구1 과목 <span className={styles.required}>*</span>
            </label>
            <SearchableSelect
              options={[...INQUIRY_SUBJECT_OPTIONS]}
              value={form.inquiry1Subject}
              onChange={(val) => handleChange("inquiry1Subject", val)}
              placeholder="과목을 선택해주세요"
              hasError={!!errors.inquiry1Subject}
            />
            {renderFieldError("inquiry1Subject")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-inq1Std" className={styles.label}>
              표준점수 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-inq1Std"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.inquiry1StandardScore ? styles.inputError : ""}`}
              placeholder={`0~${MAX_INQUIRY_STANDARD_SCORE}`}
              value={form.inquiry1StandardScore}
              onChange={(e) =>
                handleNumericChange("inquiry1StandardScore", e.target.value)
              }
              onBlur={() => handleScoreBlur("inquiry1")}
            />
            {renderFieldError("inquiry1StandardScore")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-inq1Pct" className={styles.label}>
              백분위 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-inq1Pct"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.inquiry1Percentile ? styles.inputError : ""}`}
              placeholder={`0~${MAX_PERCENTILE}`}
              value={form.inquiry1Percentile}
              onChange={(e) =>
                handleNumericChange("inquiry1Percentile", e.target.value)
              }
              onBlur={() => handleScoreBlur("inquiry1")}
            />
            {renderFieldError("inquiry1Percentile")}
          </div>
        </div>

        <div className={styles.scoreRow}>
          <div className={styles.field}>
            <label className={styles.label}>
              탐구2 과목 <span className={styles.required}>*</span>
            </label>
            <SearchableSelect
              options={[...INQUIRY_SUBJECT_OPTIONS]}
              value={form.inquiry2Subject}
              onChange={(val) => handleChange("inquiry2Subject", val)}
              placeholder="과목을 선택해주세요"
              hasError={!!errors.inquiry2Subject}
            />
            {renderFieldError("inquiry2Subject")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-inq2Std" className={styles.label}>
              표준점수 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-inq2Std"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.inquiry2StandardScore ? styles.inputError : ""}`}
              placeholder={`0~${MAX_INQUIRY_STANDARD_SCORE}`}
              value={form.inquiry2StandardScore}
              onChange={(e) =>
                handleNumericChange("inquiry2StandardScore", e.target.value)
              }
              onBlur={() => handleScoreBlur("inquiry2")}
            />
            {renderFieldError("inquiry2StandardScore")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-inq2Pct" className={styles.label}>
              백분위 <span className={styles.required}>*</span>
            </label>
            <input
              id="js-inq2Pct"
              type="text"
              inputMode="numeric"
              className={`${styles.input} ${errors.inquiry2Percentile ? styles.inputError : ""}`}
              placeholder={`0~${MAX_PERCENTILE}`}
              value={form.inquiry2Percentile}
              onChange={(e) =>
                handleNumericChange("inquiry2Percentile", e.target.value)
              }
              onBlur={() => handleScoreBlur("inquiry2")}
            />
            {renderFieldError("inquiry2Percentile")}
          </div>
        </div>
      </div>

      {/* ─── 영어 · 한국사 ─── */}
      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <span className={styles.blockTitle}>
            <Languages size={18} className={styles.blockTitleIcon} />
            영어 · 한국사
          </span>
          <span className={styles.blockDesc}>
            절대평가 영역이라 등급만 입력합니다.
          </span>
        </div>

        <div className={styles.gradeRow}>
          <div className={styles.field}>
            <label htmlFor="js-englishGrade" className={styles.label}>
              영어 등급 <span className={styles.required}>*</span>
            </label>
            <select
              id="js-englishGrade"
              className={`${styles.select} ${errors.englishGrade ? styles.inputError : ""}`}
              value={form.englishGrade}
              onChange={(e) => handleChange("englishGrade", e.target.value)}
            >
              <option value="">선택해주세요</option>
              {SUNEUNG_GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}등급
                </option>
              ))}
            </select>
            {renderFieldError("englishGrade")}
          </div>

          <div className={styles.field}>
            <label htmlFor="js-historyGrade" className={styles.label}>
              한국사 등급 <span className={styles.required}>*</span>
            </label>
            <select
              id="js-historyGrade"
              className={`${styles.select} ${errors.historyGrade ? styles.inputError : ""}`}
              value={form.historyGrade}
              onChange={(e) => handleChange("historyGrade", e.target.value)}
            >
              <option value="">선택해주세요</option>
              {SUNEUNG_GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}등급
                </option>
              ))}
            </select>
            {renderFieldError("historyGrade")}
          </div>
        </div>
      </div>

      {/* ─── 희망 조건 ─── */}
      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <span className={styles.blockTitle}>
            <Target size={18} className={styles.blockTitleIcon} />
            희망 조건
          </span>
          <span className={styles.blockDesc}>
            추천 대학과 지원 조합을 고르는 기준이 됩니다.
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <GraduationCap size={14} className={styles.labelIcon} />
            희망 학과 또는 계열 <span className={styles.required}>*</span>
          </label>
          <SearchableSelect
            options={categoryOptions}
            value={form.target}
            onChange={(val) => handleChange("target", val)}
            placeholder="계열을 선택하거나 학과명을 직접 입력해주세요"
            hasError={!!errors.target}
            allowCustom
          />
          <span className={styles.fieldHint}>
            목록은 2027 정시 모집 계열입니다. 학과명을 직접 입력할 수도 있고,
            매칭되는 모집단위가 없으면 제출 전에 알려드립니다.
          </span>
          {renderFieldError("target")}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <MapPin size={14} className={styles.labelIcon} />
            희망 지역 <span className={styles.required}>*</span>
          </label>
          <div className={styles.selectButtonRow}>
            {PREFERRED_REGION_OPTIONS.map((region) => (
              <button
                key={region}
                type="button"
                className={`${styles.selectButton} ${form.region === region ? styles.selectButtonActive : ""}`}
                onClick={() => handleChange("region", region)}
              >
                {region}
              </button>
            ))}
          </div>
          {renderFieldError("region")}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <Compass size={14} className={styles.labelIcon} />
            지원 성향 <span className={styles.required}>*</span>
          </label>
          <div className={styles.selectButtonRow}>
            {RISK_APPETITE_OPTIONS.map((risk) => (
              <button
                key={risk}
                type="button"
                className={`${styles.selectButton} ${form.risk === risk ? styles.selectButtonActive : ""}`}
                onClick={() => handleChange("risk", risk)}
              >
                {risk}
              </button>
            ))}
          </div>
          <span className={styles.fieldHint}>
            {form.risk
              ? RISK_APPETITE_DESCRIPTION[form.risk as RiskAppetite]
              : "안정·균형·공격 중 하나를 선택해주세요."}
          </span>
          {renderFieldError("risk")}
        </div>
      </div>

      {/* ─── 제출 ─── */}
      <div className={styles.actions}>
        {warningMessages.length > 0 && (
          <div className={styles.warningBox}>
            <AlertTriangle size={16} />
            <div>
              <strong>성적 입력을 확인해주세요</strong>
              <ul className={styles.warningList}>
                {warningMessages.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              그대로 분석해도 되지만, 결과가 실제와 달라질 수 있습니다.
            </div>
          </div>
        )}

        {generalError && (
          <div className={styles.generalError}>{generalError}</div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className={styles.spinner} />
              분석 준비 중...
            </>
          ) : (
            <>
              <LineChart size={18} />
              정시 분석하기
            </>
          )}
        </button>
      </div>
    </form>
  );
};
