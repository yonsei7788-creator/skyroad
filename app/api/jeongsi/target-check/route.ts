import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyAdmin } from "@/app/api/admin/reports/helpers";
import { loadAdmissionPlans } from "@/libs/jeongsi/data";
import { countTargetCandidates } from "@/libs/jeongsi/engine/analyze";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

/** 희망 학과·계열 입력 최대 길이 (input-schema 와 같은 값) */
const MAX_TARGET_LENGTH = 50;

/**
 * 직접 입력한 희망 학과가 2027 정시 모집단위와 매칭되는지 확인한다.
 *
 * GET /api/jeongsi/target-check?target=컴공
 * → { matched: false, candidateCount: 0 }
 *
 * 폼이 제출 전에 호출해, 분석해도 추천이 통째로 빌 입력을 미리 안내한다.
 */
export const GET = async (request: NextRequest) => {
  const supabase = await createClient();
  const { error: authError } = await verifyAdmin(supabase);
  if (authError) return authError;

  const target = request.nextUrl.searchParams.get("target")?.trim() ?? "";
  if (!target || target.length > MAX_TARGET_LENGTH) {
    return NextResponse.json(
      { error: "희망 학과를 1~50자로 입력해주세요." },
      { status: 400 }
    );
  }

  const plans = await loadAdmissionPlans();
  const candidateCount = countTargetCandidates(plans, {
    target,
    targetKind: "department",
  });

  return NextResponse.json({ matched: candidateCount > 0, candidateCount });
};
