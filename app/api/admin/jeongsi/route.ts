import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type {
  AdminJeongsiReport,
  JeongsiReportStatus,
  PaginatedResponse,
} from "@/app/admin/types";
import { createClient } from "@/libs/supabase/server";

import { verifyAdmin } from "../reports/helpers";
import {
  JEONGSI_STATUSES,
  UNDEFINED_TABLE_CODE,
  summarizeInput,
} from "./helpers";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface JeongsiReportRow {
  id: string;
  user_id: string;
  input: unknown;
  ai_status: JeongsiReportStatus;
  ai_progress: number;
  ai_error: string | null;
  created_at: string;
}

const emptyPage = (
  page: number,
  limit: number
): PaginatedResponse<AdminJeongsiReport> => ({
  data: [],
  total: 0,
  page,
  limit,
  totalPages: 0,
});

/**
 * 정시 분석 리포트 목록 (어드민).
 *
 * GET /api/admin/jeongsi?page=1&limit=20&status=completed&search=경영
 * - status: pending | processing | completed | failed
 * - search: 희망 학과·계열 부분 일치
 */
export const GET = async (request: NextRequest) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || `${DEFAULT_PAGE}`, 10) || DEFAULT_PAGE
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      parseInt(searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10) ||
        DEFAULT_LIMIT
    )
  );
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  let query = supabase
    .from("jeongsi_reports")
    .select(
      "id, user_id, input, ai_status, ai_progress, ai_error, created_at",
      {
        count: "exact",
      }
    )
    .order("created_at", { ascending: false });

  if (JEONGSI_STATUSES.includes(status as JeongsiReportStatus)) {
    query = query.eq("ai_status", status);
  }
  if (search) {
    query = query.ilike("input->preference->>target", `%${search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    if (error.code === UNDEFINED_TABLE_CODE) {
      return NextResponse.json(
        {
          error:
            "정시 리포트 테이블(jeongsi_reports)이 아직 없습니다. 마이그레이션을 먼저 적용해주세요.",
          code: "TABLE_MISSING",
        },
        { status: 503 }
      );
    }
    console.error("[admin:jeongsi] 목록 조회 실패:", error.message);
    return NextResponse.json(
      { error: "정시 리포트 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as JeongsiReportRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ...emptyPage(page, limit), total: count ?? 0 });
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds);
  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.name as string])
  );

  const total = count ?? 0;
  const response: PaginatedResponse<AdminJeongsiReport> = {
    data: rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      createdBy: nameById.get(row.user_id) ?? null,
      ...summarizeInput(row.input),
      status: row.ai_status,
      progress: row.ai_progress,
      error: row.ai_error,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  return NextResponse.json(response);
};
