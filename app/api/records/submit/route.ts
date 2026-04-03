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

const deriveGradeLevel = (
  record: SchoolRecord
): "high1" | "high2" | "high3" => {
  let maxYear = 1;
  for (const rows of Object.values(record)) {
    for (const row of rows) {
      const { year } = row;
      if (typeof year === "number" && year > maxYear) {
        maxYear = year;
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

const mapSection = (
  rows: Record<string, unknown>[],
  fieldMap: Record<string, string>
): Record<string, unknown>[] => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((row) => toSnake(row as Record<string, unknown>, fieldMap));
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

  const gradeLevel = deriveGradeLevel(record);

  // RPC로 원자적 트랜잭션 실행
  const { data, error } = await supabase.rpc("upsert_record", {
    p_user_id: user.id,
    p_submission_type: method,
    p_grade_level: gradeLevel,
    p_existing_record_id: existingRecordId ?? null,
    p_attendance: mapSection(record.attendance, FIELD_MAPS.attendance),
    p_awards: mapSection(record.awards, FIELD_MAPS.awards),
    p_certifications: mapSection(
      record.certifications,
      FIELD_MAPS.certifications
    ),
    p_creative_activities: mapSection(
      record.creativeActivities,
      FIELD_MAPS.creativeActivities
    ),
    p_volunteer_activities: mapSection(
      record.volunteerActivities,
      FIELD_MAPS.volunteerActivities
    ),
    p_general_subjects: mapSection(
      record.generalSubjects,
      FIELD_MAPS.generalSubjects
    ),
    p_career_subjects: mapSection(
      record.careerSubjects,
      FIELD_MAPS.careerSubjects
    ),
    p_arts_physical_subjects: mapSection(
      record.artsPhysicalSubjects,
      FIELD_MAPS.artsPhysicalSubjects
    ),
    p_subject_evaluations: mapSection(
      record.subjectEvaluations,
      FIELD_MAPS.subjectEvaluations
    ),
    p_reading_activities: mapSection(
      record.readingActivities,
      FIELD_MAPS.readingActivities
    ),
    p_behavioral_assessments: mapSection(
      record.behavioralAssessments,
      FIELD_MAPS.behavioralAssessments
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
