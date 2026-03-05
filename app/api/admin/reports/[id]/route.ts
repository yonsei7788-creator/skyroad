import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import type { ReportDetail } from "@/app/admin/types";

import { verifyAdmin, deriveReportStatus } from "../helpers";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const supabase = await createClient();

  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { data: row, error: queryError } = await supabase
    .from("reports")
    .select(
      `
      id,
      content,
      ai_generated_at,
      reviewed_at,
      delivered_at,
      review_notes,
      reviewed_by,
      target_university_id,
      orders!inner (
        id,
        user_id,
        plans!inner (
          id,
          name,
          display_name
        )
      ),
      target_universities (
        university_name,
        department,
        admission_type
      ),
      reviewer:profiles!reports_reviewed_by_fkey (
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (queryError || !row) {
    return NextResponse.json(
      { error: "리포트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const orders = row.orders as unknown as Record<string, unknown>;
  const plans = orders?.plans as unknown as Record<string, unknown>;
  const targetUni = row.target_universities as unknown as Record<
    string,
    unknown
  > | null;
  const reviewer = row.reviewer as unknown as Record<string, unknown> | null;
  const userId = orders?.user_id as string;

  // Parallel: profile name + email
  const adminClient = createAdminClient();
  const [profileRes, emailRes] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", userId).single(),
    adminClient
      ? adminClient.auth.admin.getUserById(userId).catch(() => ({
          data: { user: null },
        }))
      : Promise.resolve({ data: { user: null } }),
  ]);

  const userName = (profileRes.data?.name as string) || null;
  const userEmail =
    (emailRes.data as { user: { email?: string } | null })?.user?.email || "";

  const universityParts = [
    targetUni?.university_name,
    targetUni?.department,
    targetUni?.admission_type ? `(${targetUni.admission_type})` : null,
  ].filter(Boolean);
  const targetUniversity =
    universityParts.length > 0 ? universityParts.join(" ") : null;

  const detail: ReportDetail = {
    id: row.id,
    orderId: orders?.id as string,
    userName,
    userEmail,
    planName: (plans?.display_name as string) || (plans?.name as string) || "",
    targetUniversity,
    status: deriveReportStatus({
      content: row.content,
      ai_generated_at: row.ai_generated_at,
      reviewed_at: row.reviewed_at,
      delivered_at: row.delivered_at,
    }),
    content: row.content,
    reviewNotes: row.review_notes,
    aiGeneratedAt: row.ai_generated_at,
    reviewedBy: (reviewer?.name as string) || null,
    reviewedAt: row.reviewed_at,
    deliveredAt: row.delivered_at,
  };

  return NextResponse.json(detail);
};
