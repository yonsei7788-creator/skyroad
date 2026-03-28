-- ============================================================
-- Skyload (SKYROAD) - Seed Data
-- ============================================================

-- 요금제 (Plans)
INSERT INTO public.plans (name, display_name, description, price, is_active)
VALUES
  ('lite', '라이트', '기본 AI 분석 리포트', 49000, true),
  ('standard', '스탠다드', '심화 AI 분석 리포트 + 전문가 검토', 79000, true),
  ('premium', '프리미엄', '최고급 AI 분석 + 1:1 전문가 컨설팅', 149000, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;
