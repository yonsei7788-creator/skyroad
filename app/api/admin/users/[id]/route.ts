import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/libs/supabase/admin";
import { createClient } from "@/libs/supabase/server";

interface TargetUniversity {
  id: string;
  universityName: string;
  department: string;
  admissionType: string;
}

interface RecordSummary {
  id: string;
  submissionType: string;
  gradeLevel: string | null;
  createdAt: string;
}

interface OrderSummary {
  id: string;
  planId: string | null;
  planName: string | null;
  status: string;
  amount: number;
  createdAt: string;
  reportDeliveredAt: string | null;
  paymentMethod: string | null;
  paymentAmount: number | null;
  paymentStatus: string | null;
  approvedAt: string | null;
}

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  role: "user" | "admin";
  phone: string | null;
  highSchoolName: string | null;
  highSchoolType: string | null;
  grade: string | null;
  admissionYear: number | null;
  onboardingCompleted: boolean;
  createdAt: string;
  recordCount: number;
  orderCount: number;
  targetUniversities: TargetUniversity[];
  records: RecordSummary[];
  orders: OrderSummary[];
}

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UserDetail | { error: string }>> => {
  const { id } = await params;

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

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  // Get profile using regular client (admin RLS)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Get email from auth (requires admin client)
  let email = "";
  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(id);
    email = authUser?.user?.email ?? "";
  }

  // Get target universities using regular client (admin RLS)
  const { data: universities } = await supabase
    .from("target_universities")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  // Get records using regular client (admin RLS)
  const { data: records } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  // Get orders with reports using regular client (admin RLS)
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "*, reports(delivered_at), payments(method, amount, status, approved_at), plans(display_name)"
    )
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const targetUniversities: TargetUniversity[] = (universities ?? []).map(
    (u) => ({
      id: u.id,
      universityName: u.university_name,
      department: u.department,
      admissionType: u.admission_type,
    })
  );

  const recordList: RecordSummary[] = (records ?? []).map((r) => ({
    id: r.id,
    submissionType: r.submission_type,
    gradeLevel: r.grade_level,
    createdAt: r.created_at,
  }));

  const orderList: OrderSummary[] = (orders ?? []).map((o) => {
    const reportArr = Array.isArray(o.reports) ? o.reports : [];
    const reportDeliveredAt =
      reportArr.length > 0 ? reportArr[0].delivered_at : null;

    const paymentArr = Array.isArray(o.payments) ? o.payments : [];
    const donePayment = paymentArr.find(
      (p: { status: string }) => p.status === "done"
    );

    const planObj = o.plans as { display_name: string } | null;

    return {
      id: o.id,
      planId: o.plan_id,
      planName: planObj?.display_name ?? null,
      status: o.status,
      amount: o.amount,
      createdAt: o.created_at,
      reportDeliveredAt,
      paymentMethod: donePayment?.method ?? null,
      paymentAmount: donePayment?.amount ?? null,
      paymentStatus: donePayment?.status ?? null,
      approvedAt: donePayment?.approved_at ?? null,
    };
  });

  const detail: UserDetail = {
    id: profile.id,
    name: profile.name,
    email,
    role: profile.role ?? "user",
    phone: profile.phone,
    highSchoolName: profile.high_school_name,
    highSchoolType: profile.high_school_type,
    grade: profile.grade,
    admissionYear: profile.admission_year,
    onboardingCompleted: profile.onboarding_completed ?? false,
    createdAt: profile.created_at,
    recordCount: recordList.length,
    orderCount: orderList.length,
    targetUniversities,
    records: recordList,
    orders: orderList,
  };

  return NextResponse.json(detail);
};
