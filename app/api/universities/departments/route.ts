import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { MAJOR_INFO_DATA } from "@/libs/report/constants/major-info-data";

/**
 * GET /api/universities/departments?university=고려대학교
 *
 * 해당 대학교가 개설한 학과(전공) 목록을 반환합니다.
 * 데이터 소스: 커리어넷 MAJOR_VIEW API (표준 전공 분류 기준)
 */
export const GET = (request: NextRequest) => {
  const university = request.nextUrl.searchParams.get("university")?.trim();

  if (!university) {
    return NextResponse.json(
      { error: "university 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const departments = MAJOR_INFO_DATA.filter((m) =>
    m.universities.includes(university)
  )
    .map((m) => m.majorName)
    .sort((a, b) => a.localeCompare(b, "ko"));

  return NextResponse.json(departments);
};
