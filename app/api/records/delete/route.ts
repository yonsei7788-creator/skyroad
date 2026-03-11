import { NextResponse } from "next/server";

import { createClient } from "@/libs/supabase/server";

export const DELETE = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // records 테이블에서 해당 유저의 레코드 조회
  const { data: record, error: fetchError } = await supabase
    .from("records")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: "생기부 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  if (!record) {
    return NextResponse.json(
      { error: "삭제할 생기부가 없습니다." },
      { status: 404 }
    );
  }

  // orders 테이블의 record_id FK 참조 해제 (NO ACTION이라 먼저 null 처리 필요)
  const { error: unlinkError } = await supabase
    .from("orders")
    .update({ record_id: null })
    .eq("record_id", record.id);

  if (unlinkError) {
    return NextResponse.json(
      { error: "주문 연결 해제에 실패했습니다." },
      { status: 500 }
    );
  }

  // records 삭제 (하위 11개 테이블은 CASCADE로 함께 삭제)
  const { error: deleteError } = await supabase
    .from("records")
    .delete()
    .eq("id", record.id);

  if (deleteError) {
    return NextResponse.json(
      { error: "생기부 삭제에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
};
