-- 성별 컬럼 추가 (여대 필터링용)
ALTER TABLE public.profiles
  ADD COLUMN gender text CHECK (gender IN ('male', 'female'));
