import crypto from "crypto";

import { redirect } from "next/navigation";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";
import { createClient } from "@/libs/supabase/server";

import { RecordSubmitWizard } from "./_components/RecordSubmitWizard";
import type { SchoolRecord } from "./_components/types";

export const metadata = {
  title: "생기부 등록 | SKYROAD",
};

// snake_case DB → camelCase client 역매핑
const SECTION_CONFIGS: {
  key: keyof SchoolRecord;
  table: string;
  fields: Record<string, string>; // snake_case → camelCase
}[] = [
  {
    key: "attendance",
    table: "record_attendance",
    fields: {
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
  },
  {
    key: "awards",
    table: "record_awards",
    fields: {
      year: "year",
      name: "name",
      rank: "rank",
      date: "date",
      organization: "organization",
      participants: "participants",
    },
  },
  {
    key: "certifications",
    table: "record_certifications",
    fields: {
      category: "category",
      name: "name",
      details: "details",
      date: "date",
      issuer: "issuer",
    },
  },
  {
    key: "creativeActivities",
    table: "record_creative_activities",
    fields: {
      year: "year",
      area: "area",
      hours: "hours",
      note: "note",
    },
  },
  {
    key: "volunteerActivities",
    table: "record_volunteer_activities",
    fields: {
      year: "year",
      date_range: "dateRange",
      place: "place",
      content: "content",
      hours: "hours",
    },
  },
  {
    key: "generalSubjects",
    table: "record_general_subjects",
    fields: {
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
      note: "note",
    },
  },
  {
    key: "careerSubjects",
    table: "record_career_subjects",
    fields: {
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
      note: "note",
    },
  },
  {
    key: "artsPhysicalSubjects",
    table: "record_arts_physical_subjects",
    fields: {
      year: "year",
      semester: "semester",
      category: "category",
      subject: "subject",
      credits: "credits",
      achievement: "achievement",
    },
  },
  {
    key: "subjectEvaluations",
    table: "record_subject_evaluations",
    fields: {
      year: "year",
      subject: "subject",
      evaluation: "evaluation",
    },
  },
  {
    key: "readingActivities",
    table: "record_reading_activities",
    fields: {
      year: "year",
      subject_or_area: "subjectOrArea",
      content: "content",
    },
  },
  {
    key: "behavioralAssessments",
    table: "record_behavioral_assessments",
    fields: {
      year: "year",
      assessment: "assessment",
    },
  },
  {
    key: "mockExams",
    table: "record_mock_exams",
    fields: {
      year: "year",
      month: "month",
      subject: "subject",
      score: "score",
      grade_rank: "gradeRank",
      percentile: "percentile",
      standard_score: "standardScore",
    },
  },
];

// snake_case DB row → camelCase client row (+ client-side id)
const toCamel = (
  row: Record<string, unknown>,
  fieldMap: Record<string, string>
): Record<string, unknown> => {
  const out: Record<string, unknown> = { id: crypto.randomUUID() };
  for (const [snake, camel] of Object.entries(fieldMap)) {
    if (snake in row) {
      out[camel] = row[snake];
    }
  }
  return out;
};

interface PageProps {
  searchParams: Promise<{ mode?: string }>;
}

const RecordSubmitPage = async ({ searchParams }: PageProps) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const params = await searchParams;
  const isEditMode = params.mode === "edit";

  if (isEditMode) {
    // 최신 레코드 조회
    const { data: recordRow } = await supabase
      .from("records")
      .select("id, planned_subjects")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recordRow) {
      const recordId = recordRow.id as string;
      const record: Record<string, unknown[]> = {};

      for (const config of SECTION_CONFIGS) {
        const { data: rows } = await supabase
          .from(config.table)
          .select("*")
          .eq("record_id", recordId);

        record[config.key] = (rows ?? []).map((row) =>
          toCamel(row as Record<string, unknown>, config.fields)
        );
      }

      return (
        <>
          <Header />
          <main>
            <RecordSubmitWizard
              mode="edit"
              initialRecord={record as unknown as SchoolRecord}
              initialPlannedSubjects={
                (recordRow.planned_subjects as string) ?? ""
              }
              recordId={recordId}
            />
          </main>
          <Footer />
        </>
      );
    }
  }

  return (
    <>
      <Header />
      <main>
        <RecordSubmitWizard />
      </main>
      <Footer />
    </>
  );
};

export default RecordSubmitPage;
