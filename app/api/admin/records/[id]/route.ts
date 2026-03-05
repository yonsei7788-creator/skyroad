import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

interface RecordDetail {
  id: string;
  userName: string | null;
  userId: string;
  submissionType: "pdf" | "image" | "text";
  gradeLevel: string;
  textVerified: boolean;
  orderStatus: string | null;
  createdAt: string;
  finalText: string | null;
  attendance: Record<string, unknown>[];
  awards: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  creativeActivities: Record<string, unknown>[];
  volunteerActivities: Record<string, unknown>[];
  generalSubjects: Record<string, unknown>[];
  careerSubjects: Record<string, unknown>[];
  artsPhysicalSubjects: Record<string, unknown>[];
  subjectEvaluations: Record<string, unknown>[];
  readingActivities: Record<string, unknown>[];
  behavioralAssessments: Record<string, unknown>[];
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<RecordDetail | { error: string }>> {
  const { id } = await params;
  const supabase = await createClient();

  // 1. 인증 확인
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

  // 2. 관리자 권한 확인
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  // 3. 메인 레코드 조회
  const { data: record, error: recordError } = await supabase
    .from("records")
    .select(
      `
      id,
      user_id,
      submission_type,
      grade_level,
      text_verified,
      final_text,
      created_at
    `
    )
    .eq("id", id)
    .single();

  if (recordError || !record) {
    return NextResponse.json(
      { error: "레코드를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 4. 프로필 + 주문 + 서브 테이블 병렬 조회
  const [profileRes, orderRes, ...subTableResults] = await Promise.all([
    supabase
      .from("profiles")
      .select("name")
      .eq("id", record.user_id as string)
      .single(),
    supabase.from("orders").select("status").eq("record_id", id).limit(1),
    ...SUB_TABLES.map(({ name }) =>
      supabase.from(name).select("*").eq("record_id", id)
    ),
  ]);

  const subData: Record<string, Record<string, unknown>[]> = {};
  SUB_TABLES.forEach(({ name, key }, index) => {
    const result = subTableResults[index];
    if (result.error) {
      console.error(`서브 테이블 조회 오류 [${name}]:`, result.error);
    }
    subData[key] = (result.data as Record<string, unknown>[]) ?? [];
  });

  // 5. 응답 구성
  const detail: RecordDetail = {
    id: record.id as string,
    userName: (profileRes.data?.name as string) ?? null,
    userId: record.user_id as string,
    submissionType: record.submission_type as "pdf" | "image" | "text",
    gradeLevel: record.grade_level as string,
    textVerified: record.text_verified as boolean,
    orderStatus:
      (orderRes.data as { status: string }[] | null)?.[0]?.status ?? null,
    createdAt: record.created_at as string,
    finalText: record.final_text as string | null,
    attendance: subData.attendance,
    awards: subData.awards,
    certifications: subData.certifications,
    creativeActivities: subData.creativeActivities,
    volunteerActivities: subData.volunteerActivities,
    generalSubjects: subData.generalSubjects,
    careerSubjects: subData.careerSubjects,
    artsPhysicalSubjects: subData.artsPhysicalSubjects,
    subjectEvaluations: subData.subjectEvaluations,
    readingActivities: subData.readingActivities,
    behavioralAssessments: subData.behavioralAssessments,
  };

  return NextResponse.json(detail);
}
