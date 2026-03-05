/**
 * 생기부 레코드 데이터 로더
 *
 * Supabase의 11개 서브 테이블에서 record_id 기반으로
 * 데이터를 병렬 조회하여 RecordData 형태로 반환한다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RecordData } from "./preprocessor.ts";

const SUB_TABLES = [
  { name: "record_attendance", key: "attendance" },
  { name: "record_awards", key: "awards" },
  { name: "record_certifications", key: "certifications" },
  { name: "record_creative_activities", key: "creativeActivities" },
  { name: "record_volunteer_activities", key: "volunteerActivities" },
  { name: "record_general_subjects", key: "generalSubjects" },
  { name: "record_career_subjects", key: "careerSubjects" },
  { name: "record_arts_physical_subjects", key: "artsPhysicalSubjects" },
  { name: "record_subject_evaluations", key: "subjectEvaluations" },
  { name: "record_reading_activities", key: "readingActivities" },
  { name: "record_behavioral_assessments", key: "behavioralAssessments" },
] as const;

// snake_case DB → camelCase RecordData 매핑
const FIELD_MAPS: Record<string, Record<string, string>> = {
  attendance: {
    year: "year",
    total_days: "totalDays",
    absence_illness: "absenceIllness",
    absence_unauthorized: "absenceUnauthorized",
    absence_other: "absenceOther",
    lateness_illness: "latenessIllness",
    lateness_unauthorized: "latenessUnauthorized",
    lateness_other: "latenessOther",
    early_leave_illness: "earlyLeaveIllness",
    early_leave_unauthorized: "earlyLeaveUnauthorized",
    early_leave_other: "earlyLeaveOther",
    class_missed_illness: "classMissedIllness",
    class_missed_unauthorized: "classMissedUnauthorized",
    class_missed_other: "classMissedOther",
    note: "note",
  },
  generalSubjects: {
    year: "year",
    semester: "semester",
    category: "category",
    subject: "subject",
    credits: "credits",
    raw_score: "rawScore",
    average: "average",
    standard_deviation: "standardDeviation",
    achievement: "achievement",
    student_count: "studentCount",
    grade_rank: "gradeRank",
  },
  careerSubjects: {
    year: "year",
    semester: "semester",
    category: "category",
    subject: "subject",
    credits: "credits",
    raw_score: "rawScore",
    average: "average",
    achievement: "achievement",
    student_count: "studentCount",
    achievement_distribution: "achievementDistribution",
  },
  subjectEvaluations: {
    year: "year",
    subject: "subject",
    evaluation: "evaluation",
  },
  creativeActivities: {
    year: "year",
    area: "area",
    hours: "hours",
    note: "note",
  },
  behavioralAssessments: {
    year: "year",
    assessment: "assessment",
  },
  readingActivities: {
    year: "year",
    subject_or_area: "subjectOrArea",
    content: "content",
  },
  volunteerActivities: {
    year: "year",
    date_range: "dateRange",
    place: "place",
    content: "content",
    hours: "hours",
  },
  awards: {
    year: "year",
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
  artsPhysicalSubjects: {
    year: "year",
    semester: "semester",
    category: "category",
    subject: "subject",
    credits: "credits",
    achievement: "achievement",
  },
};

const toCamel = (
  row: Record<string, unknown>,
  fieldMap: Record<string, string>
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [snake, camel] of Object.entries(fieldMap)) {
    if (snake in row) {
      out[camel] = row[snake];
    }
  }
  return out;
};

export const loadRecordData = async (
  supabase: SupabaseClient,
  recordId: string
): Promise<RecordData> => {
  const results = await Promise.all(
    SUB_TABLES.map(({ name }) =>
      supabase.from(name).select("*").eq("record_id", recordId)
    )
  );

  const data: Record<string, unknown[]> = {};

  SUB_TABLES.forEach(({ key }, index) => {
    const result = results[index];
    if (result.error) {
      console.error(`레코드 서브 테이블 조회 오류 [${key}]:`, result.error);
      data[key] = [];
      return;
    }

    const fieldMap = FIELD_MAPS[key];
    if (fieldMap) {
      data[key] = (result.data ?? []).map((row) =>
        toCamel(row as Record<string, unknown>, fieldMap)
      );
    } else {
      data[key] = result.data ?? [];
    }
  });

  return data as unknown as RecordData;
};
