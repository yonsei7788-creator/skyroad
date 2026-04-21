-- 리포트 AI 상태에 'deferred' 추가 (Gemini 과부하 시 지연 재생성)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_ai_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_ai_status_check
  CHECK (ai_status IN ('pending', 'processing', 'completed', 'failed', 'deferred'));

-- 최초 지연 시점 기록
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_deferred_at timestamptz;
