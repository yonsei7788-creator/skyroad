import { redirect } from "next/navigation";

import { createClient } from "@/libs/supabase/server";

import { OnboardingWizard } from "./_components/OnboardingWizard";
import type { OnboardingStep, UniversityPriority } from "./_components/types";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "name, phone, high_school_name, high_school_type, high_school_region, admission_year, grade, onboarding_step, onboarding_completed"
    )
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/");
  }

  const { data: targets } = await supabase
    .from("target_universities")
    .select("priority, university_name, admission_type, department, sub_field")
    .eq("user_id", user.id)
    .order("priority");

  const rawStep = profile?.onboarding_step ?? 1;
  const initialStep = (rawStep > 2 ? 2 : rawStep || 1) as OnboardingStep;

  return (
    <OnboardingWizard
      initialStep={initialStep}
      initialProfile={{
        name: profile?.name ?? "",
        phone: profile?.phone ?? "",
        highSchoolName: profile?.high_school_name ?? "",
        highSchoolType: profile?.high_school_type ?? "",
        highSchoolRegion: profile?.high_school_region ?? "",
        grade: profile?.grade ?? "",
        admissionYear: profile?.admission_year ?? null,
      }}
      initialUniversities={
        targets?.map((t) => ({
          priority: t.priority as UniversityPriority,
          universityName: t.university_name,
          admissionType: t.admission_type,
          department: t.department,
          subField: t.sub_field ?? "",
        })) ?? []
      }
    />
  );
}
