"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  ArrowRight,
  Info,
  TrendingUp,
  TrendingDown,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import styles from "../page.module.css";

// ============================================
// Types
// ============================================

interface ProfileData {
  name: string;
  highSchoolName: string;
  highSchoolType: string;
  admissionYear: number | null;
  grade: string;
}

interface RecordData {
  id: string;
  submissionType: string;
  textVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GeneralSubjectData {
  id: string;
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  rawScore: number | null;
  average: number | null;
  standardDeviation: number | null;
  achievement: string;
  studentCount: number | null;
  gradeRank: number | null;
}

interface RecordDashboardProps {
  profile: ProfileData;
  record: RecordData | null;
  generalSubjects: GeneralSubjectData[];
}

// ============================================
// Constants
// ============================================

const GRADE_LABELS: Record<string, string> = {
  high1: "1학년",
  high2: "2학년",
  high3: "3학년",
  graduate: "졸업생",
};

type CategoryKey =
  | "all"
  | "korEngMathSocSci"
  | "korEngMathSoc"
  | "korEngMathSci";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  all: "전교과",
  korEngMathSocSci: "국영수사과",
  korEngMathSoc: "국영수사",
  korEngMathSci: "국영수과",
};

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  all: "#3730A3",
  korEngMathSocSci: "#4F46E5",
  korEngMathSoc: "#818CF8",
  korEngMathSci: "#C7D2FE",
};

const SUBJECT_AREA_MAP: Record<string, string> = {
  국어: "국어",
  수학: "수학",
  영어: "영어",
  "사회(역사/도덕포함)": "사회",
  한국사: "사회",
  과학: "과학",
};

const BAR_COLORS = ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE"];

const WAFFLE_COLORS: Record<number, string> = {
  1: "#1E40AF", // 진한 파랑
  2: "#2563EB", // 파랑
  3: "#3B82F6", // 밝은 파랑
  4: "#6366F1", // 인디고
  5: "#F59E0B", // 주황 (중간 경계)
  6: "#F97316", // 진한 주황
  7: "#EF4444", // 빨강
  8: "#DC2626", // 진한 빨강
  9: "#991B1B", // 매우 진한 빨강
};

// ============================================
// Helpers
// ============================================

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};

const getGradeColor = (grade: number): string => {
  if (grade <= 2) return "#1E40AF";
  if (grade <= 3) return "#3B82F6";
  if (grade <= 4) return "#6366F1";
  if (grade <= 5) return "#F59E0B";
  if (grade <= 6) return "#F97316";
  return "#EF4444";
};

const getGradeBg = (grade: number): string => {
  if (grade <= 2) return "#DBEAFE";
  if (grade <= 4) return "#E0E7FF";
  if (grade <= 5) return "#FEF3C7";
  if (grade <= 6) return "#FFEDD5";
  return "#FEE2E2";
};

const matchesCategory = (category: string, key: CategoryKey): boolean => {
  if (key === "all") return true;
  const area = SUBJECT_AREA_MAP[category];
  if (!area) return false;
  switch (key) {
    case "korEngMathSocSci":
      return ["국어", "영어", "수학", "사회", "과학"].includes(area);
    case "korEngMathSoc":
      return ["국어", "영어", "수학", "사회"].includes(area);
    case "korEngMathSci":
      return ["국어", "영어", "수학", "과학"].includes(area);
    default:
      return false;
  }
};

const computeWeightedAverage = (
  subjects: GeneralSubjectData[],
  categoryKey: CategoryKey
): number | null => {
  const filtered = subjects.filter(
    (s) =>
      s.gradeRank !== null &&
      s.credits !== null &&
      matchesCategory(s.category, categoryKey)
  );
  if (filtered.length === 0) return null;
  let totalCredits = 0;
  let weightedSum = 0;
  for (const s of filtered) {
    const credits = s.credits ?? 0;
    totalCredits += credits;
    weightedSum += (s.gradeRank ?? 0) * credits;
  }
  if (totalCredits === 0) return null;
  return weightedSum / totalCredits;
};

const computeSemesterAverages = (
  subjects: GeneralSubjectData[],
  categoryKey: CategoryKey
): { key: string; label: string; value: number }[] => {
  const semesterMap = new Map<string, GeneralSubjectData[]>();
  for (const s of subjects) {
    if (s.gradeRank === null || s.credits === null) continue;
    if (!matchesCategory(s.category, categoryKey)) continue;
    const key = `${s.year}-${s.semester}`;
    if (!semesterMap.has(key)) semesterMap.set(key, []);
    semesterMap.get(key)!.push(s);
  }
  return Array.from(semesterMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      let totalCredits = 0;
      let weightedSum = 0;
      for (const s of items) {
        const credits = s.credits ?? 0;
        totalCredits += credits;
        weightedSum += (s.gradeRank ?? 0) * credits;
      }
      const avg = totalCredits > 0 ? weightedSum / totalCredits : 0;
      const [year, semester] = key.split("-");
      return {
        key,
        label: `${year}-${semester}`,
        value: Number(avg.toFixed(2)),
      };
    });
};

const computeSubjectAreaAverages = (
  subjects: GeneralSubjectData[]
): { area: string; grade: number }[] => {
  const areaMap = new Map<
    string,
    { totalCredits: number; weightedSum: number }
  >();
  for (const s of subjects) {
    if (s.gradeRank === null || s.credits === null) continue;
    const area = SUBJECT_AREA_MAP[s.category];
    if (!area) continue;
    if (!areaMap.has(area))
      areaMap.set(area, { totalCredits: 0, weightedSum: 0 });
    const entry = areaMap.get(area)!;
    entry.totalCredits += s.credits ?? 0;
    entry.weightedSum += (s.gradeRank ?? 0) * (s.credits ?? 0);
  }
  const order = ["국어", "영어", "수학", "사회", "과학"];
  return order
    .filter((area) => areaMap.has(area))
    .map((area) => {
      const { totalCredits, weightedSum } = areaMap.get(area)!;
      return {
        area,
        grade: Number((weightedSum / totalCredits).toFixed(2)),
      };
    });
};

const computeScoreVsAverage = (
  subjects: GeneralSubjectData[]
): { subject: string; diff: number }[] => {
  const areaOrder = ["국어", "영어", "수학", "사회", "과학"];
  const areaMap = new Map<
    string,
    { totalScore: number; totalAvg: number; count: number }
  >();
  for (const s of subjects) {
    if (s.rawScore === null || s.average === null) continue;
    const area = SUBJECT_AREA_MAP[s.category];
    if (!area) continue;
    if (!areaMap.has(area))
      areaMap.set(area, { totalScore: 0, totalAvg: 0, count: 0 });
    const entry = areaMap.get(area)!;
    entry.totalScore += s.rawScore;
    entry.totalAvg += s.average;
    entry.count += 1;
  }
  return areaOrder
    .filter((area) => areaMap.has(area))
    .map((area) => {
      const { totalScore, totalAvg, count } = areaMap.get(area)!;
      return {
        subject: area,
        diff: Number(((totalScore - totalAvg) / count).toFixed(1)),
      };
    });
};

const computeGradeDistribution = (
  subjects: GeneralSubjectData[]
): { grade: number; count: number; label: string }[] => {
  const counts = new Map<number, number>();
  for (const s of subjects) {
    if (s.gradeRank === null) continue;
    counts.set(s.gradeRank, (counts.get(s.gradeRank) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([grade, count]) => ({ grade, count, label: `${grade}등급` }));
};

interface SemesterGroup {
  key: string;
  label: string;
  subjects: GeneralSubjectData[];
}

const groupBySemester = (subjects: GeneralSubjectData[]): SemesterGroup[] => {
  const map = new Map<string, GeneralSubjectData[]>();
  for (const s of subjects) {
    const key = `${s.year}-${s.semester}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const [year, semester] = key.split("-");
      return {
        key,
        label: `${year}년 ${semester}학기`,
        subjects: items,
      };
    });
};

// ============================================
// Dummy data
// ============================================

const DUMMY_CATEGORY_GRADES: Record<CategoryKey, number> = {
  all: 2.4,
  korEngMathSocSci: 2.1,
  korEngMathSoc: 2.3,
  korEngMathSci: 2.0,
};

const DUMMY_BAR_DATA = [
  { area: "국어", grade: 3.0 },
  { area: "영어", grade: 2.5 },
  { area: "수학", grade: 2.0 },
  { area: "사회", grade: 3.5 },
  { area: "과학", grade: 2.8 },
];

const DUMMY_TREND = [
  {
    label: "1-1",
    all: 3.2,
    korEngMathSocSci: 2.8,
    korEngMathSoc: 3.0,
    korEngMathSci: 2.9,
  },
  {
    label: "1-2",
    all: 2.8,
    korEngMathSocSci: 2.5,
    korEngMathSoc: 2.7,
    korEngMathSci: 2.6,
  },
  {
    label: "2-1",
    all: 2.5,
    korEngMathSocSci: 2.2,
    korEngMathSoc: 2.4,
    korEngMathSci: 2.3,
  },
  {
    label: "2-2",
    all: 2.1,
    korEngMathSocSci: 1.9,
    korEngMathSoc: 2.1,
    korEngMathSci: 2.0,
  },
];

// ============================================
// Main Component
// ============================================

export const RecordDashboard = ({
  profile,
  record,
  generalSubjects,
}: RecordDashboardProps) => {
  const router = useRouter();
  const isRegistered = !!record;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!record) return;
    if (
      !window.confirm(
        "생기부를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/records/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [record, router]);

  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    new Set(["all", "korEngMathSocSci"])
  );
  const [activeSemesterIdx, setActiveSemesterIdx] = useState(0);

  const toggleCategory = (key: CategoryKey) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // ---- Computed Data ----

  const categoryGrades = useMemo(() => {
    if (!isRegistered) return DUMMY_CATEGORY_GRADES;
    return {
      all: computeWeightedAverage(generalSubjects, "all"),
      korEngMathSocSci: computeWeightedAverage(
        generalSubjects,
        "korEngMathSocSci"
      ),
      korEngMathSoc: computeWeightedAverage(generalSubjects, "korEngMathSoc"),
      korEngMathSci: computeWeightedAverage(generalSubjects, "korEngMathSci"),
    } as Record<CategoryKey, number | null>;
  }, [isRegistered, generalSubjects]);

  const barData = useMemo(() => {
    if (!isRegistered) return DUMMY_BAR_DATA;
    return computeSubjectAreaAverages(generalSubjects);
  }, [isRegistered, generalSubjects]);

  const trendData = useMemo(() => {
    if (!isRegistered) return DUMMY_TREND;
    const allSemesters = computeSemesterAverages(generalSubjects, "all");
    const korEngMathSocSciSemesters = computeSemesterAverages(
      generalSubjects,
      "korEngMathSocSci"
    );
    const korEngMathSocSemesters = computeSemesterAverages(
      generalSubjects,
      "korEngMathSoc"
    );
    const korEngMathSciSemesters = computeSemesterAverages(
      generalSubjects,
      "korEngMathSci"
    );
    const semesterKeys = [...new Set(allSemesters.map((s) => s.key))].sort();
    return semesterKeys.map((key) => ({
      label: allSemesters.find((s) => s.key === key)?.label ?? key,
      all: allSemesters.find((s) => s.key === key)?.value ?? null,
      korEngMathSocSci:
        korEngMathSocSciSemesters.find((s) => s.key === key)?.value ?? null,
      korEngMathSoc:
        korEngMathSocSemesters.find((s) => s.key === key)?.value ?? null,
      korEngMathSci:
        korEngMathSciSemesters.find((s) => s.key === key)?.value ?? null,
    }));
  }, [isRegistered, generalSubjects]);

  const scoreVsAvgData = useMemo(() => {
    if (!isRegistered) return [];
    return computeScoreVsAverage(generalSubjects);
  }, [isRegistered, generalSubjects]);

  const gradeDistribution = useMemo(() => {
    if (!isRegistered) return [];
    return computeGradeDistribution(generalSubjects);
  }, [isRegistered, generalSubjects]);

  const semesterGroups = useMemo(() => {
    if (!isRegistered) return [];
    return groupBySemester(generalSubjects);
  }, [isRegistered, generalSubjects]);

  const headlineGrade = categoryGrades.korEngMathSocSci;
  const headlineRounded = headlineGrade
    ? Math.min(Math.round(headlineGrade), 9)
    : null;
  // Semester change insight
  const semesterAvgsForInsight = useMemo(
    () => computeSemesterAverages(generalSubjects, "korEngMathSocSci"),
    [generalSubjects]
  );
  const semesterChange = useMemo(() => {
    if (semesterAvgsForInsight.length < 2) return null;
    const last =
      semesterAvgsForInsight[semesterAvgsForInsight.length - 1].value;
    const prev =
      semesterAvgsForInsight[semesterAvgsForInsight.length - 2].value;
    return Number((prev - last).toFixed(2));
  }, [semesterAvgsForInsight]);

  // Gauge data for PieChart arc
  const gaugePercent = headlineGrade ? ((9 - headlineGrade) / 8) * 100 : 0;

  // Context bar text
  const admissionText = profile.admissionYear
    ? `${profile.admissionYear}년 입학`
    : null;
  const gradeText = profile.grade
    ? (GRADE_LABELS[profile.grade] ?? profile.grade)
    : null;
  const detailParts = [profile.highSchoolType, admissionText, gradeText].filter(
    Boolean
  );

  // Active semester for subject analysis
  const activeSemester = semesterGroups[activeSemesterIdx] ?? null;

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>생활기록부 분석</h1>
        <p className={styles.pageSubtitle}>
          생기부를 등록하고 내 성적 데이터를 확인하세요
        </p>
      </div>

      <div className={styles.container}>
        {/* Context Bar */}
        <div className={styles.contextBar}>
          <div className={styles.contextBarLeft}>
            <Image
              src="/images/reocrd/highschool.png"
              alt=""
              width={60}
              height={60}
              className={styles.contextBarIcon}
            />
            {profile.highSchoolName ? (
              <div className={styles.contextBarInfo}>
                <span className={styles.contextBarSchool}>
                  {profile.highSchoolName}
                </span>
                {detailParts.length > 0 && (
                  <span className={styles.contextBarDetail}>
                    {detailParts.join(" · ")}
                  </span>
                )}
              </div>
            ) : (
              <Link
                href="/profile/settings?tab=academic"
                className={styles.contextBarDetail}
                style={{ textDecoration: "underline" }}
              >
                입시 정보가 등록되지 않았습니다
              </Link>
            )}
          </div>
          <div className={styles.contextBarRight}>
            {isRegistered ? (
              <>
                <span className={styles.contextBarDate}>
                  {formatDate(record.updatedAt)} 수정
                </span>
                <Link
                  href="/profile/settings?tab=academic"
                  className={styles.contextBarLink}
                >
                  <Pencil size={12} />
                  수정
                </Link>
              </>
            ) : (
              <Link href="/record/submit" className={styles.contextBarRegister}>
                생기부 등록하기
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Registration Status */}
        <div className={styles.registrationCard}>
          <div className={styles.registrationIcon}>
            {isRegistered ? (
              <Image
                src="/images/reocrd/uploaded-record.png"
                alt="생기부 등록 완료"
                width={60}
                height={60}
              />
            ) : (
              <Image
                src="/images/reocrd/not-upload-record.png"
                alt="생기부 미등록"
                width={60}
                height={60}
              />
            )}
          </div>
          <div className={styles.registrationContent}>
            <div className={styles.registrationTitle}>
              {isRegistered
                ? "생기부가 등록되어 있습니다"
                : "생기부가 아직 등록되지 않았어요"}
            </div>
            <div className={styles.registrationDesc}>
              {isRegistered
                ? `${formatDate(record.updatedAt)} 수정됨`
                : "생기부를 등록하면 성적 분석 데이터를 확인할 수 있습니다"}
            </div>
          </div>
          {isRegistered ? (
            <div className={styles.registrationActions}>
              <Link href="/record/submit?mode=edit" className={styles.editBtn}>
                <Pencil size={14} />
                수정
              </Link>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={styles.deleteBtn}
              >
                <Trash2 size={14} />
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          ) : (
            <Link href="/record/submit" className={styles.registerBtn}>
              등록하기
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* Info Note */}
        <div className={styles.infoNote}>
          <Info size={14} />
          <span>사회 교과 석차등급에는 한국사 과목이 포함됩니다.</span>
        </div>

        {/* Top Row: 성적 + 교과별 내신 성적 */}
        <div className={styles.dashboardGrid}>
          {/* 성적 카드 (Left) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>성적</h2>
            </div>
            <div
              className={styles.cardBody}
              {...(!isRegistered ? { inert: true } : {})}
            >
              <div className={styles.heroGaugePanel}>
                <span className={styles.gaugeLabel}>국영수사과</span>
                <div className={styles.gaugeChart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: gaugePercent },
                          { value: 100 - gaugePercent },
                        ]}
                        startAngle={225}
                        endAngle={-45}
                        innerRadius="70%"
                        outerRadius="100%"
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={isRegistered}
                      >
                        <Cell
                          fill={
                            headlineRounded
                              ? getGradeColor(headlineRounded)
                              : "var(--color-neutral-300)"
                          }
                        />
                        <Cell fill="var(--color-neutral-100)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <span
                  className={styles.gaugeValue}
                  style={{
                    color: headlineRounded
                      ? getGradeColor(headlineRounded)
                      : undefined,
                  }}
                >
                  {headlineGrade !== null
                    ? Number(headlineGrade).toFixed(2)
                    : "-"}
                </span>
                <span className={styles.gaugeUnit}>등급</span>
                {isRegistered &&
                  semesterChange !== null &&
                  semesterChange !== 0 && (
                    <span
                      className={
                        semesterChange > 0
                          ? styles.changeBadgeUp
                          : styles.changeBadgeDown
                      }
                    >
                      {semesterChange > 0 ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      {Math.abs(semesterChange).toFixed(2)} 등급{" "}
                      {semesterChange > 0 ? "향상" : "변동"}
                    </span>
                  )}
              </div>

              <div className={styles.gradeDivider} />

              <div className={styles.categoryList}>
                {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => (
                  <div key={key} className={styles.categoryRow}>
                    <span className={styles.categoryRowLabel}>
                      {CATEGORY_LABELS[key]}
                    </span>
                    <span className={styles.categoryRowValue}>
                      {categoryGrades[key] !== null
                        ? `${Number(categoryGrades[key]).toFixed(2)}등급`
                        : "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {!isRegistered && <DemoOverlay />}
          </div>

          {/* 교과별 내신 성적 (Right) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>교과별 내신 성적</h2>
            </div>
            <div
              className={styles.cardBody}
              {...(!isRegistered ? { inert: true } : {})}
            >
              <div className={styles.barChartArea}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData.map((d) => ({
                      ...d,
                      plotGrade: 10 - d.grade,
                    }))}
                    margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="area"
                      tick={{ fontSize: 13 }}
                      stroke="var(--color-fg-tertiary)"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 9]}
                      ticks={[1, 3, 5, 7, 9]}
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-fg-tertiary)"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${10 - v}등급`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        fontSize: 14,
                      }}
                      formatter={(value) => [
                        `${(10 - Number(value)).toFixed(2)}등급`,
                        "평균 등급",
                      ]}
                    />
                    <Bar
                      dataKey="plotGrade"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    >
                      {barData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={BAR_COLORS[i % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {!isRegistered && <DemoOverlay />}
          </div>
        </div>

        {/* Grade Timeline */}
        <div className={styles.trendSection}>
          <div className={styles.trendHeader}>
            <h2 className={styles.trendTitle}>성적 흐름</h2>
            <div className={styles.pillGroup}>
              {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={activeCategories.has(key)}
                  className={`${styles.pill}${activeCategories.has(key) ? ` ${styles.pillActive}` : ""}`}
                  onClick={() => toggleCategory(key)}
                >
                  {CATEGORY_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.trendBody}>
            <div className={styles.trendChartArea}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 8, right: 16, bottom: 0, left: -10 }}
                >
                  <defs>
                    {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(
                      (key) => (
                        <linearGradient
                          key={key}
                          id={`grad-${key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={CATEGORY_COLORS[key]}
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor={CATEGORY_COLORS[key]}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      )
                    )}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 13 }}
                    stroke="var(--color-fg-tertiary)"
                  />
                  <YAxis
                    domain={[1, 9]}
                    reversed
                    tick={{ fontSize: 12 }}
                    stroke="var(--color-fg-tertiary)"
                    tickFormatter={(v: number) => `${v}등급`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      fontSize: 14,
                      boxShadow: "var(--shadow-md)",
                    }}
                    formatter={(value, name) => {
                      const label =
                        CATEGORY_LABELS[name as CategoryKey] ?? String(name);
                      return [`${Number(value).toFixed(2)}등급`, label];
                    }}
                  />
                  {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(
                    (key) =>
                      activeCategories.has(key) && (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={CATEGORY_COLORS[key]}
                          strokeWidth={2}
                          fill={`url(#grad-${key})`}
                          dot={{
                            fill: CATEGORY_COLORS[key],
                            r: 4,
                            strokeWidth: 0,
                          }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      )
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {!isRegistered && <DemoOverlay />}
        </div>

        {/* Analysis Grid: Score vs Avg + Waffle */}
        {isRegistered && scoreVsAvgData.length > 0 && (
          <div className={styles.analysisGrid}>
            {/* Score vs Average */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>원점수 vs 평균</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.scoreVsAvgChart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scoreVsAvgData}
                      layout="vertical"
                      margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        stroke="var(--color-fg-tertiary)"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="subject"
                        tick={{ fontSize: 13 }}
                        stroke="var(--color-fg-tertiary)"
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--color-border)",
                          fontSize: 14,
                        }}
                        formatter={(value) => [
                          `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(1)}점`,
                          "평균 대비",
                        ]}
                      />
                      <Bar dataKey="diff" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {scoreVsAvgData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={
                              d.diff >= 0
                                ? "var(--color-primary-600)"
                                : "var(--color-neutral-400)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Waffle Grid */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>등급 분포</h2>
              </div>
              <div className={styles.cardBody}>
                <WaffleChart distribution={gradeDistribution} />
              </div>
            </div>
          </div>
        )}

        {/* Subject Analysis (replaces raw transcript) */}
        {isRegistered && semesterGroups.length > 0 && (
          <div className={styles.analysisSection}>
            <div className={styles.semesterTabs}>
              {semesterGroups.map((g, idx) => (
                <button
                  key={g.key}
                  type="button"
                  className={`${styles.semesterTab}${idx === activeSemesterIdx ? ` ${styles.semesterTabActive}` : ""}`}
                  onClick={() => setActiveSemesterIdx(idx)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {activeSemester && (
              <>
                <div className={styles.subjectListHeader}>
                  <span>과목</span>
                  <span>등급</span>
                  <span>원점수 위치</span>
                  <span>평균 대비</span>
                  <span className={styles.subjectAchievement}>성취도</span>
                </div>
                <div className={styles.subjectList}>
                  {activeSemester.subjects.map((s) => {
                    const diff =
                      s.rawScore !== null && s.average !== null
                        ? Number((s.rawScore - s.average).toFixed(1))
                        : null;
                    const scorePct = s.rawScore !== null ? s.rawScore : 0;
                    const avgPct = s.average !== null ? s.average : 0;
                    const gradeRounded = s.gradeRank
                      ? Math.min(s.gradeRank, 9)
                      : 5;
                    return (
                      <div key={s.id} className={styles.subjectRow}>
                        <span className={styles.subjectName}>{s.subject}</span>
                        <span
                          className={styles.subjectGradeBadge}
                          style={{
                            background: getGradeBg(gradeRounded),
                            color: getGradeColor(gradeRounded),
                          }}
                        >
                          {s.gradeRank ?? "-"}
                        </span>
                        <div className={styles.subjectScoreBar}>
                          <div
                            className={styles.subjectScoreFill}
                            style={{
                              width: `${scorePct}%`,
                              background: getGradeColor(gradeRounded),
                            }}
                          />
                          {s.average !== null && (
                            <div
                              className={styles.subjectScoreMarker}
                              style={{ left: `${avgPct}%` }}
                              title={`평균: ${s.average}`}
                            />
                          )}
                          {s.rawScore !== null && (
                            <span className={styles.subjectScoreLabel}>
                              {s.rawScore}점
                            </span>
                          )}
                        </div>
                        {diff !== null ? (
                          <span
                            className={
                              diff > 0
                                ? styles.subjectDiffPositive
                                : diff < 0
                                  ? styles.subjectDiffNegative
                                  : styles.subjectDiffNeutral
                            }
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}점
                          </span>
                        ) : (
                          <span className={styles.subjectDiffNeutral}>-</span>
                        )}
                        <span className={styles.subjectAchievement}>
                          {s.achievement || "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <SubjectAnalysisSummary subjects={activeSemester.subjects} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Sub-components
// ============================================

const DemoOverlay = () => (
  <div className={styles.demoOverlay}>
    <span className={styles.demoBadge}>샘플 데이터</span>
    <span className={styles.demoText}>
      내 생기부를 등록하면 나만의 분석을 받을 수 있어요
    </span>
    <Link href="/record/submit" className={styles.demoButton}>
      30초 만에 내 성적 확인하기
      <ArrowRight size={14} />
    </Link>
  </div>
);

const WaffleChart = ({
  distribution,
}: {
  distribution: { grade: number; count: number; label: string }[];
}) => {
  const cells: number[] = [];
  for (const d of distribution) {
    for (let i = 0; i < d.count; i++) {
      cells.push(d.grade);
    }
  }
  const totalCount = cells.length;

  return (
    <div className={styles.waffleContainer}>
      <div className={styles.waffleGrid}>
        {cells.map((grade, i) => (
          <div
            key={i}
            className={styles.waffleCell}
            style={{ background: WAFFLE_COLORS[grade] ?? "#94A3B8" }}
            title={`${grade}등급`}
          />
        ))}
      </div>
      <div className={styles.waffleLegend}>
        {distribution.map((d) => (
          <div key={d.grade} className={styles.waffleLegendItem}>
            <span
              className={styles.waffleLegendDot}
              style={{
                background: WAFFLE_COLORS[d.grade] ?? "#94A3B8",
              }}
            />
            <span className={styles.waffleLegendLabel}>{d.label}</span>
            <span className={styles.waffleLegendCount}>{d.count}과목</span>
          </div>
        ))}
        <div className={styles.waffleLegendItem}>
          <span className={styles.waffleLegendCount}>총 {totalCount}과목</span>
        </div>
      </div>
    </div>
  );
};

const SubjectAnalysisSummary = ({
  subjects,
}: {
  subjects: GeneralSubjectData[];
}) => {
  const aboveAvg = subjects.filter(
    (s) => s.rawScore !== null && s.average !== null && s.rawScore > s.average
  ).length;
  const belowAvg = subjects.filter(
    (s) => s.rawScore !== null && s.average !== null && s.rawScore < s.average
  ).length;

  return (
    <div className={styles.analysisSummary}>
      <span>
        평균 이상{" "}
        <span className={styles.analysisSummaryHighlight}>{aboveAvg}과목</span>
      </span>
      <span>
        평균 이하{" "}
        <span className={styles.analysisSummaryHighlight}>{belowAvg}과목</span>
      </span>
      <span>
        총{" "}
        <span className={styles.analysisSummaryHighlight}>
          {subjects.length}과목
        </span>{" "}
        수강
      </span>
    </div>
  );
};
