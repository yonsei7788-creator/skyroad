-- ============================================
-- 정시 분석 리포트 (jeongsi_reports)
--
-- 생기부 리포트(reports)와 완전히 분리된 독립 상품.
-- 결제/주문(orders) 연결 없이 수능 성적을 입력하면 바로 생성된다.
-- 기존 테이블(orders, plans, reports)은 일절 건드리지 않는다.
--
--   input   : libs/jeongsi/types.ts 의 JeongsiInput
--   content : libs/jeongsi/report-types.ts 의 JeongsiReportContent
-- ============================================

CREATE TABLE IF NOT EXISTS public.jeongsi_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  input jsonb NOT NULL,
  content jsonb,
  ai_status text NOT NULL DEFAULT 'pending'::text,
  ai_progress smallint NOT NULL DEFAULT 0,
  ai_error text,
  ai_model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jeongsi_reports_pkey PRIMARY KEY (id),
  CONSTRAINT jeongsi_reports_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT jeongsi_reports_ai_status_check
    CHECK (ai_status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT jeongsi_reports_ai_progress_check
    CHECK (ai_progress >= 0 AND ai_progress <= 100)
);

-- 목록 조회(본인 리포트 최신순 / 어드민 전체 최신순)
CREATE INDEX IF NOT EXISTS jeongsi_reports_user_id_created_at_idx
  ON public.jeongsi_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS jeongsi_reports_created_at_idx
  ON public.jeongsi_reports (created_at DESC);


-- ========================
-- updated_at 자동 갱신 (기존 public.handle_updated_at() 재사용)
-- ========================

DROP TRIGGER IF EXISTS set_updated_at ON public.jeongsi_reports;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.jeongsi_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ========================
-- Row Level Security
-- 읽기/쓰기 모두 본인 또는 어드민(public.is_admin())
-- ========================

ALTER TABLE public.jeongsi_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jeongsi_reports_select_own ON public.jeongsi_reports;
CREATE POLICY jeongsi_reports_select_own ON public.jeongsi_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS jeongsi_reports_insert_own ON public.jeongsi_reports;
CREATE POLICY jeongsi_reports_insert_own ON public.jeongsi_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS jeongsi_reports_update_own ON public.jeongsi_reports;
CREATE POLICY jeongsi_reports_update_own ON public.jeongsi_reports
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS jeongsi_reports_delete_own ON public.jeongsi_reports;
CREATE POLICY jeongsi_reports_delete_own ON public.jeongsi_reports
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
