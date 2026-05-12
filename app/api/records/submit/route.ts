import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

interface SchoolRecord {
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

interface SubmitBody {
  method: "pdf" | "image" | "text";
  record: SchoolRecord;
  recordId?: string;
  plannedSubjects?: string;
}

const parseIntSafe = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const parseNumberSafe = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// PDF 파서가 year에 캘린더 연도(2025 등)를 넣는 경우 학년(1-3)으로 매핑.
// admission_year가 있으면 정확히 환산하고, 없으면 정렬 순서로 추정.
const buildCalendarYearMap = (
  record: SchoolRecord,
  admissionYear: number | null
): Map<number, number> => {
  const map = new Map<number, number>();
  const calendarYears = new Set<number>();
  for (const rows of Object.values(record)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows as Array<Record<string, unknown>>) {
      const n = parseIntSafe(row.year);
      if (n !== null && n >= 1000) calendarYears.add(n);
    }
  }
  if (calendarYears.size === 0) return map;

  if (admissionYear !== null) {
    for (const cy of calendarYears) {
      const grade = cy - admissionYear + 1;
      map.set(cy, Math.max(1, Math.min(3, grade)));
    }
    return map;
  }

  // fallback: 캘린더 연도가 여러 개면 정렬 후 최신 → 3학년에 가깝게
  const sorted = [...calendarYears].sort((a, b) => a - b);
  const lastIdx = sorted.length - 1;
  sorted.forEach((cy, i) => {
    const grade = sorted.length === 1 ? 1 : Math.max(1, 3 - (lastIdx - i));
    map.set(cy, grade);
  });
  return map;
};

const clampGradeYear = (v: unknown, yearMap: Map<number, number>): number => {
  const n = parseIntSafe(v);
  if (n === null) return 1;
  if (n >= 1 && n <= 3) return n;
  if (n >= 1000) {
    const mapped = yearMap.get(n);
    if (mapped !== undefined) return mapped;
  }
  return 1;
};

const clampSemester = (v: unknown): number => {
  const n = parseIntSafe(v);
  if (n === null) return 1;
  return n >= 1 && n <= 2 ? n : 1;
};

const deriveGradeLevel = (
  record: SchoolRecord,
  yearMap: Map<number, number>
): "high1" | "high2" | "high3" => {
  let maxYear = 1;
  for (const rows of Object.values(record)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows as Array<Record<string, unknown>>) {
      const n = parseIntSafe(row.year);
      if (n === null) continue;
      const grade = n >= 1000 ? (yearMap.get(n) ?? 1) : n;
      if (grade > maxYear && grade <= 3) {
        maxYear = grade;
      }
    }
  }
  if (maxYear >= 3) return "high3";
  if (maxYear === 2) return "high2";
  return "high1";
};

// camelCase row → snake_case keys for RPC JSONB parameter
const toSnake = (
  row: Record<string, unknown>,
  fieldMap: Record<string, string>
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in row) {
      out[snake] = row[camel];
    }
  }
  return out;
};

const FIELD_MAPS: Record<keyof SchoolRecord, Record<string, string>> = {
  attendance: {
    year: "year",
    totalDays: "total_days",
    absenceIllness: "absence_illness",
    absenceUnauthorized: "absence_unauthorized",
    absenceOther: "absence_other",
    latenessIllness: "lateness_illness",
    latenessUnauthorized: "lateness_unauthorized",
    latenessOther: "lateness_other",
    earlyLeaveIllness: "early_leave_illness",
    earlyLeaveUnauthorized: "early_leave_unauthorized",
    earlyLeaveOther: "early_leave_other",
    classMissedIllness: "class_missed_illness",
    classMissedUnauthorized: "class_missed_unauthorized",
    classMissedOther: "class_missed_other",
    note: "note",
  },
  awards: {
    year: "year",
    semester: "semester",
    name: "name",
    rank: "rank",
    date: "date",
    organization: "organization",
    participants: "participants",
  },
  certifications: {
    category: "category",
    name: "name",
    details: "details",
    date: "date",
    issuer: "issuer",
  },
  creativeActivities: {
    year: "year",
    area: "area",
    hours: "hours",
    note: "note",
  },
  volunteerActivities: {
    year: "year",
    dateRange: "date_range",
    place: "place",
    content: "content",
    hours: "hours",
  },
  generalSubjects: {
    year: "year",
    semester: "semester",
    category: "category",
    subject: "subject",
    credits: "credits",
    rawScore: "raw_score",
    average: "average",
    standardDeviation: "standard_deviation",
    achievement: "achievement",
    studentCount: "student_count",
    gradeRank: "grade_rank",
    note: "note",
  },
  careerSubjects: {
    year: "year",
    semester: "semester",
    category: "category",
    subject: "subject",
    credits: "credits",
    rawScore: "raw_score",
    average: "average",
    achievement: "achievement",
    studentCount: "student_count",
    achievementDistribution: "achievement_distribution",
    note: "note",
  },
  artsPhysicalSubjects: {
    year: "year",
    semester: "semester",
    category: "category",
    subject: "subject",
    credits: "credits",
    achievement: "achievement",
  },
  subjectEvaluations: {
    year: "year",
    subject: "subject",
    evaluation: "evaluation",
  },
  readingActivities: {
    year: "year",
    subjectOrArea: "subject_or_area",
    content: "content",
  },
  behavioralAssessments: {
    year: "year",
    assessment: "assessment",
  },
};

// RPC에서 ::INT 캐스팅되는 snake_case 필드 (year/semester는 별도 처리)
const INT_FIELDS_BY_SECTION: Partial<Record<keyof SchoolRecord, string[]>> = {
  attendance: [
    "total_days",
    "absence_illness",
    "absence_unauthorized",
    "absence_other",
    "lateness_illness",
    "lateness_unauthorized",
    "lateness_other",
    "early_leave_illness",
    "early_leave_unauthorized",
    "early_leave_other",
    "class_missed_illness",
    "class_missed_unauthorized",
    "class_missed_other",
  ],
  creativeActivities: ["hours"],
  volunteerActivities: ["hours"],
  generalSubjects: ["credits", "student_count", "grade_rank"],
  careerSubjects: ["credits", "student_count"],
  artsPhysicalSubjects: ["credits"],
};

// RPC에서 ::NUMERIC 캐스팅되는 snake_case 필드
const NUMERIC_FIELDS_BY_SECTION: Partial<Record<keyof SchoolRecord, string[]>> =
  {
    generalSubjects: ["raw_score", "average", "standard_deviation"],
    careerSubjects: ["raw_score", "average"],
  };

const mapSection = (
  rows: Record<string, unknown>[],
  sectionKey: keyof SchoolRecord,
  yearMap: Map<number, number>
): Record<string, unknown>[] => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const fieldMap = FIELD_MAPS[sectionKey];
  const intFields = INT_FIELDS_BY_SECTION[sectionKey] ?? [];
  const numericFields = NUMERIC_FIELDS_BY_SECTION[sectionKey] ?? [];
  return rows.map((row) => {
    const out = toSnake(row as Record<string, unknown>, fieldMap);
    if ("year" in out) {
      out.year = clampGradeYear(out.year, yearMap);
    }
    if ("semester" in out) {
      out.semester = clampSemester(out.semester);
    }
    for (const f of intFields) {
      if (f in out) out[f] = parseIntSafe(out[f]);
    }
    for (const f of numericFields) {
      if (f in out) out[f] = parseNumberSafe(out[f]);
    }
    // grade_rank는 DB 제약상 1-9 외에는 null
    if (sectionKey === "generalSubjects" && "grade_rank" in out) {
      const gr = out.grade_rank;
      if (typeof gr === "number" && (gr < 1 || gr > 9)) {
        out.grade_rank = null;
      }
    }
    return out;
  });
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { method, record, recordId: existingRecordId, plannedSubjects } = body;
  if (!method || !record) {
    return NextResponse.json(
      { error: "method와 record가 필요합니다." },
      { status: 400 }
    );
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("admission_year")
    .eq("id", user.id)
    .maybeSingle();
  const admissionYear =
    typeof profileRow?.admission_year === "number"
      ? profileRow.admission_year
      : null;

  const yearMap = buildCalendarYearMap(record, admissionYear);
  const gradeLevel = deriveGradeLevel(record, yearMap);

  // RPC로 원자적 트랜잭션 실행
  const { data, error } = await supabase.rpc("upsert_record", {
    p_user_id: user.id,
    p_submission_type: method,
    p_grade_level: gradeLevel,
    p_existing_record_id: existingRecordId ?? null,
    p_attendance: mapSection(record.attendance, "attendance", yearMap),
    p_awards: mapSection(record.awards, "awards", yearMap),
    p_certifications: mapSection(
      record.certifications,
      "certifications",
      yearMap
    ),
    p_creative_activities: mapSection(
      record.creativeActivities,
      "creativeActivities",
      yearMap
    ),
    p_volunteer_activities: mapSection(
      record.volunteerActivities,
      "volunteerActivities",
      yearMap
    ),
    p_general_subjects: mapSection(
      record.generalSubjects,
      "generalSubjects",
      yearMap
    ),
    p_career_subjects: mapSection(
      record.careerSubjects,
      "careerSubjects",
      yearMap
    ),
    p_arts_physical_subjects: mapSection(
      record.artsPhysicalSubjects,
      "artsPhysicalSubjects",
      yearMap
    ),
    p_subject_evaluations: mapSection(
      record.subjectEvaluations,
      "subjectEvaluations",
      yearMap
    ),
    p_reading_activities: mapSection(
      record.readingActivities,
      "readingActivities",
      yearMap
    ),
    p_behavioral_assessments: mapSection(
      record.behavioralAssessments,
      "behavioralAssessments",
      yearMap
    ),
    p_mock_exams: [],
    p_planned_subjects: plannedSubjects ?? null,
  });

  if (error) {
    console.error("upsert_record RPC error:", error);
    const message =
      error.message === "Record not found or unauthorized"
        ? "기존 레코드를 찾을 수 없거나 수정 권한이 없습니다."
        : "생기부 저장에 실패했습니다. 다시 시도해주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ id: data });
}
