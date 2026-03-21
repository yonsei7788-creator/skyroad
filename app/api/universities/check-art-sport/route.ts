import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isArtSportDepartment,
  isArtSportPractical,
} from "@/libs/report/pipeline/preprocessor";

/**
 * GET /api/universities/check-art-sport?department=체육학과
 *
 * 해당 모집단위의 예체능 여부 및 실기 전형 여부를 판별합니다.
 */
export const GET = (request: NextRequest) => {
  const department = request.nextUrl.searchParams.get("department")?.trim();

  if (!department) {
    return NextResponse.json(
      { error: "department 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    isArtSport: isArtSportDepartment(department),
    isArtSportPractical: isArtSportPractical(department),
  });
};
