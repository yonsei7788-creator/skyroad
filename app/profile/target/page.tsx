import { redirect } from "next/navigation";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";
import { createClient } from "@/libs/supabase/server";

import { TargetUniversityForm } from "./_components/TargetUniversityForm";

export const metadata = {
  title: "목표 대학 수정 | SKYROAD",
};

const TargetUniversityPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: targets } = await supabase
    .from("target_universities")
    .select(
      "id, university_name, admission_type, department, sub_field, priority"
    )
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  const initialTargets = (targets ?? []).map((t) => ({
    id: t.id,
    priority: t.priority as 1 | 2 | 3,
    universityName: t.university_name ?? "",
    admissionType: t.admission_type ?? "",
    department: t.department ?? "",
    subField: t.sub_field ?? "",
  }));

  return (
    <>
      <Header />
      <main>
        <TargetUniversityForm initialTargets={initialTargets} />
      </main>
      <Footer />
    </>
  );
};

export default TargetUniversityPage;
