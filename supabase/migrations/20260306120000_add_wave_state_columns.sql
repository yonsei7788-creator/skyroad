ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS ai_wave_state jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_current_wave smallint DEFAULT 0;
