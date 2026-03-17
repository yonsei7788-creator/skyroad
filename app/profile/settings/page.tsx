import { redirect } from "next/navigation";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";
import { createClient } from "@/libs/supabase/server";

import { ProfileSettingsForm } from "./_components/ProfileSettingsForm";

export const metadata = {
  title: "내 정보 수정 | SKYROAD",
};

const ProfileSettingsPage = async () => {
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
      "name, phone, high_school_name, high_school_type, high_school_region, admission_year, grade"
    )
    .eq("id", user.id)
    .single();

  return (
    <>
      <Header />
      <main>
        <ProfileSettingsForm
          email={user.email ?? ""}
          initialProfile={{
            name: profile?.name ?? "",
            phone: profile?.phone ?? "",
            highSchoolName: profile?.high_school_name ?? "",
            highSchoolType: profile?.high_school_type ?? "",
            highSchoolRegion: profile?.high_school_region ?? "",
            admissionYear: profile?.admission_year ?? null,
            grade: profile?.grade ?? "",
          }}
        />
      </main>
      <Footer />
    </>
  );
};

export default ProfileSettingsPage;
