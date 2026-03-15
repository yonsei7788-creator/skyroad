-- 희망대학 6지망까지 확장 (기존 3지망 → 6지망)
ALTER TABLE public.target_universities
  DROP CONSTRAINT target_universities_priority_check;

ALTER TABLE public.target_universities
  ADD CONSTRAINT target_universities_priority_check CHECK (priority >= 1 AND priority <= 6);
