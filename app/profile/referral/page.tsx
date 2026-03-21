import { redirect } from "next/navigation";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

import { ReferralCodeForm } from "./_components/ReferralCodeForm";

export const metadata = {
  title: "추천인 코드 | SKYROAD",
};

const ProfileReferralPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // 기존 사용 내역 확인
  const adminClient = createAdminClient();
  let existingCoupon: {
    discountAmount: number;
    isUsed: boolean;
    expiresAt: string;
  } | null = null;

  if (adminClient) {
    const { data: usage } = await adminClient
      .from("referral_usages")
      .select("coupon_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (usage?.coupon_id) {
      const { data: coupon } = await adminClient
        .from("user_coupons")
        .select("discount_amount, is_used, expires_at")
        .eq("id", usage.coupon_id)
        .single();

      if (coupon) {
        existingCoupon = {
          discountAmount: coupon.discount_amount,
          isUsed: coupon.is_used,
          expiresAt: coupon.expires_at,
        };
      }
    }
  }

  return (
    <>
      <Header />
      <main>
        <ReferralCodeForm existingCoupon={existingCoupon} />
      </main>
      <Footer />
    </>
  );
};

export default ProfileReferralPage;
