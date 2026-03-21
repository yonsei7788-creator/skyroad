import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/libs/supabase/server";
import { isArtSportDepartment } from "@/libs/report/pipeline/preprocessor";

import { CheckoutClient } from "./_components/CheckoutClient";

export const metadata: Metadata = {
  title: "결제 - SKYROAD",
  description: "생기부 AI 리포트 결제",
};

const VALID_PLANS = ["lite", "standard", "premium"];

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

const CheckoutPage = async ({ searchParams }: CheckoutPageProps) => {
  const params = await searchParams;
  const planName = params.plan;

  if (!planName || !VALID_PLANS.includes(planName)) {
    redirect("/pricing");
  }

  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", user.id)
    .single();

  // 생기부 레코드 확인
  const { data: record } = await supabase
    .from("records")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!record) {
    redirect("/record");
  }

  // 플랜 정보 조회
  const { data: plan } = await supabase
    .from("plans")
    .select("id, name, display_name, price")
    .eq("name", planName)
    .eq("is_active", true)
    .single();

  if (!plan) {
    redirect("/pricing");
  }

  // 예체능 실기 학과 여부 확인
  const { data: targetUnis } = await supabase
    .from("target_universities")
    .select("department")
    .eq("user_id", user.id);

  const hasArtSportPractical =
    targetUnis?.some((t) => isArtSportDepartment(t.department)) ?? false;

  return (
    <CheckoutClient
      plan={{
        name: plan.name,
        displayName: plan.display_name,
        price: plan.price,
      }}
      userEmail={profile?.email ?? user.email ?? ""}
      userName={profile?.name ?? ""}
      userId={user.id}
      hasArtSportPractical={hasArtSportPractical}
    />
  );
};

export default CheckoutPage;
