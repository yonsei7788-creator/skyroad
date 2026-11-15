import { redirect } from "next/navigation";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";
import { createClient } from "@/libs/supabase/server";

import { RecordDashboard } from "./_components/RecordDashboard";

export const metadata = {
  title: "생활기록부 분석 | SKYROAD",
};

const RecordPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, high_school_name, high_school_type, admission_year, grade")
    .eq("id", user.id)
    .single();

  const { data: record } = await supabase
    .from("records")
    .select("id, submission_type, text_verified, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: generalSubjects } = record
    ? await supabase
        .from("record_general_subjects")
        .select(
          "id, year, semester, category, subject, credits, raw_score, average, standard_deviation, achievement, student_count, grade_rank"
        )
        .eq("record_id", record.id)
        .order("year")
        .order("semester")
    : { data: null };

  const hasPaidOrder = record
    ? await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("record_id", record.id)
        .neq("status", "pending_payment")
        .limit(1)
        .then(({ data }) => (data?.length ?? 0) > 0)
    : false;

  return (
    <>
      <Header />
      <main>
        <RecordDashboard
          profile={{
            name: profile?.name ?? "",
            highSchoolName: profile?.high_school_name ?? "",
            highSchoolType: profile?.high_school_type ?? "",
            admissionYear: profile?.admission_year ?? null,
            grade: profile?.grade ?? "",
          }}
          record={
            record
              ? {
                  id: record.id,
                  submissionType: record.submission_type,
                  textVerified: record.text_verified,
                  createdAt: record.created_at,
                  updatedAt: record.updated_at,
                }
              : null
          }
          generalSubjects={
            generalSubjects?.map((g) => ({
              id: g.id,
              year: g.year,
              semester: g.semester,
              category: g.category,
              subject: g.subject,
              credits: g.credits,
              rawScore: g.raw_score,
              average: g.average,
              standardDeviation: g.standard_deviation,
              achievement: g.achievement,
              studentCount: g.student_count,
              gradeRank: g.grade_rank,
            })) ?? []
          }
          hasPaidOrder={hasPaidOrder}
        />
      </main>
      <Footer />
    </>
  );
};

export default RecordPage;
