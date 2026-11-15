-- ============================================================
-- Skyload (SKYROAD) - Supabase Initial Setup Migration
-- Exported: 2026-03-04
-- ============================================================

-- ========================
-- 1. Extensions
-- ========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- ========================
-- 2. Helper Functions
-- ========================

-- 관리자 확인 함수
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$function$;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- record_drafts updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.handle_record_drafts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 신규 유저 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$function$;

-- 생기부 데이터 Upsert (트랜잭션 단위)
CREATE OR REPLACE FUNCTION public.upsert_record(
  p_user_id uuid,
  p_submission_type text,
  p_grade_level text,
  p_existing_record_id uuid DEFAULT NULL::uuid,
  p_attendance jsonb DEFAULT '[]'::jsonb,
  p_awards jsonb DEFAULT '[]'::jsonb,
  p_certifications jsonb DEFAULT '[]'::jsonb,
  p_creative_activities jsonb DEFAULT '[]'::jsonb,
  p_volunteer_activities jsonb DEFAULT '[]'::jsonb,
  p_general_subjects jsonb DEFAULT '[]'::jsonb,
  p_career_subjects jsonb DEFAULT '[]'::jsonb,
  p_arts_physical_subjects jsonb DEFAULT '[]'::jsonb,
  p_subject_evaluations jsonb DEFAULT '[]'::jsonb,
  p_reading_activities jsonb DEFAULT '[]'::jsonb,
  p_behavioral_assessments jsonb DEFAULT '[]'::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_record_id UUID;
  v_row JSONB;
BEGIN
  -- 수정 모드: 기존 레코드 삭제 (CASCADE로 하위 데이터 함께 삭제)
  IF p_existing_record_id IS NOT NULL THEN
    DELETE FROM records
    WHERE id = p_existing_record_id AND user_id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Record not found or unauthorized';
    END IF;
  END IF;

  -- 부모 레코드 삽입
  INSERT INTO records (user_id, submission_type, grade_level)
  VALUES (p_user_id, p_submission_type, p_grade_level)
  RETURNING id INTO v_record_id;

  -- 출결
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_attendance)
  LOOP
    INSERT INTO record_attendance (record_id, year, total_days, absence_illness, absence_unauthorized, absence_other, lateness_illness, lateness_unauthorized, lateness_other, early_leave_illness, early_leave_unauthorized, early_leave_other, class_missed_illness, class_missed_unauthorized, class_missed_other, note)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'total_days')::INT, (v_row->>'absence_illness')::INT, (v_row->>'absence_unauthorized')::INT, (v_row->>'absence_other')::INT, (v_row->>'lateness_illness')::INT, (v_row->>'lateness_unauthorized')::INT, (v_row->>'lateness_other')::INT, (v_row->>'early_leave_illness')::INT, (v_row->>'early_leave_unauthorized')::INT, (v_row->>'early_leave_other')::INT, (v_row->>'class_missed_illness')::INT, (v_row->>'class_missed_unauthorized')::INT, (v_row->>'class_missed_other')::INT, v_row->>'note');
  END LOOP;

  -- 수상
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_awards)
  LOOP
    INSERT INTO record_awards (record_id, year, name, rank, date, organization, participants)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'name', v_row->>'rank', v_row->>'date', v_row->>'organization', v_row->>'participants');
  END LOOP;

  -- 자격증
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_certifications)
  LOOP
    INSERT INTO record_certifications (record_id, category, name, details, date, issuer)
    VALUES (v_record_id, v_row->>'category', v_row->>'name', v_row->>'details', v_row->>'date', v_row->>'issuer');
  END LOOP;

  -- 창체
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_creative_activities)
  LOOP
    INSERT INTO record_creative_activities (record_id, year, area, hours, note)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'area', (v_row->>'hours')::INT, v_row->>'note');
  END LOOP;

  -- 봉사
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_volunteer_activities)
  LOOP
    INSERT INTO record_volunteer_activities (record_id, year, date_range, place, content, hours)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'date_range', v_row->>'place', v_row->>'content', (v_row->>'hours')::INT);
  END LOOP;

  -- 일반교과
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_general_subjects)
  LOOP
    INSERT INTO record_general_subjects (record_id, year, semester, category, subject, credits, raw_score, average, standard_deviation, achievement, student_count, grade_rank)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'semester')::INT, v_row->>'category', v_row->>'subject', (v_row->>'credits')::INT, (v_row->>'raw_score')::NUMERIC, (v_row->>'average')::NUMERIC, (v_row->>'standard_deviation')::NUMERIC, v_row->>'achievement', (v_row->>'student_count')::INT, (v_row->>'grade_rank')::INT);
  END LOOP;

  -- 전문교과
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_career_subjects)
  LOOP
    INSERT INTO record_career_subjects (record_id, year, semester, category, subject, credits, raw_score, average, achievement, student_count, achievement_distribution)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'semester')::INT, v_row->>'category', v_row->>'subject', (v_row->>'credits')::INT, (v_row->>'raw_score')::NUMERIC, (v_row->>'average')::NUMERIC, v_row->>'achievement', (v_row->>'student_count')::INT, v_row->>'achievement_distribution');
  END LOOP;

  -- 체육예술
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_arts_physical_subjects)
  LOOP
    INSERT INTO record_arts_physical_subjects (record_id, year, semester, category, subject, credits, achievement)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'semester')::INT, v_row->>'category', v_row->>'subject', (v_row->>'credits')::INT, v_row->>'achievement');
  END LOOP;

  -- 세특
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_subject_evaluations)
  LOOP
    INSERT INTO record_subject_evaluations (record_id, year, subject, evaluation)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'subject', v_row->>'evaluation');
  END LOOP;

  -- 독서
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_reading_activities)
  LOOP
    INSERT INTO record_reading_activities (record_id, year, subject_or_area, content)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'subject_or_area', v_row->>'content');
  END LOOP;

  -- 행동특성
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_behavioral_assessments)
  LOOP
    INSERT INTO record_behavioral_assessments (record_id, year, assessment)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'assessment');
  END LOOP;

  -- draft 삭제
  DELETE FROM record_drafts WHERE user_id = p_user_id;

  RETURN v_record_id;
END;
$function$;


-- ========================
-- 3. Tables
-- ========================

-- 프로필
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text,
  phone text,
  high_school_name text,
  high_school_type text,
  admission_year integer,
  grade text,
  onboarding_step integer DEFAULT 1,
  onboarding_completed boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['user'::text, 'admin'::text])),
  CONSTRAINT profiles_grade_check CHECK (grade IS NULL OR grade = ANY (ARRAY['high1'::text, 'high2'::text, 'high3'::text, 'graduate'::text])),
  CONSTRAINT profiles_high_school_type_check CHECK (high_school_type IS NULL OR high_school_type = ANY (ARRAY['일반고'::text, '특목고'::text, '자율고'::text, '특성화고'::text, '영재학교'::text, '과학고'::text, '외국어고'::text, '국제고'::text, '예술고'::text, '체육고'::text, '마이스터고'::text])),
  CONSTRAINT profiles_admission_year_check CHECK (admission_year IS NULL OR (admission_year >= 2015 AND admission_year <= 2030))
);

-- 동의 기록
CREATE TABLE public.consent_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terms_of_service boolean NOT NULL DEFAULT false,
  privacy_policy boolean NOT NULL DEFAULT false,
  age_verification boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  consented_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_records_pkey PRIMARY KEY (id),
  CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- 목표 대학
CREATE TABLE public.target_universities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  university_name text NOT NULL,
  admission_type text NOT NULL,
  department text NOT NULL,
  sub_field text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  priority integer NOT NULL DEFAULT 1,
  CONSTRAINT target_universities_pkey PRIMARY KEY (id),
  CONSTRAINT target_universities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT target_universities_priority_check CHECK (priority >= 1 AND priority <= 3)
);

-- 요금제
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  description text,
  price integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_name_key UNIQUE (name),
  CONSTRAINT plans_name_check CHECK (name = ANY (ARRAY['lite'::text, 'standard'::text, 'premium'::text]))
);

-- 생기부 데이터 (부모)
CREATE TABLE public.records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_type text NOT NULL,
  grade_level text NOT NULL,
  original_file_url text,
  extracted_text text,
  submitted_text text,
  final_text text,
  text_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT records_pkey PRIMARY KEY (id),
  CONSTRAINT records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT records_submission_type_check CHECK (submission_type = ANY (ARRAY['pdf'::text, 'image'::text, 'text'::text])),
  CONSTRAINT records_grade_level_check CHECK (grade_level = ANY (ARRAY['high1'::text, 'high2'::text, 'high3'::text, 'repeat'::text]))
);

-- 생기부 임시저장
CREATE TABLE public.record_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_type text NOT NULL,
  record_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_drafts_pkey PRIMARY KEY (id),
  CONSTRAINT record_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT record_drafts_submission_type_check CHECK (submission_type = ANY (ARRAY['pdf'::text, 'image'::text, 'text'::text]))
);

-- 출결
CREATE TABLE public.record_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  total_days integer,
  note text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  absence_illness integer,
  absence_unauthorized integer,
  absence_other integer,
  lateness_illness integer,
  lateness_unauthorized integer,
  lateness_other integer,
  early_leave_illness integer,
  early_leave_unauthorized integer,
  early_leave_other integer,
  class_missed_illness integer,
  class_missed_unauthorized integer,
  class_missed_other integer,
  CONSTRAINT record_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT record_attendance_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_attendance_year_check CHECK (year >= 1 AND year <= 3)
);

-- 수상
CREATE TABLE public.record_awards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  rank text NOT NULL DEFAULT ''::text,
  date text NOT NULL DEFAULT ''::text,
  organization text NOT NULL DEFAULT ''::text,
  participants text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_awards_pkey PRIMARY KEY (id),
  CONSTRAINT record_awards_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_awards_year_check CHECK (year >= 1 AND year <= 3)
);

-- 자격증
CREATE TABLE public.record_certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  category text NOT NULL DEFAULT ''::text,
  name text NOT NULL DEFAULT ''::text,
  details text NOT NULL DEFAULT ''::text,
  date text NOT NULL DEFAULT ''::text,
  issuer text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT record_certifications_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE
);

-- 창의적 체험활동
CREATE TABLE public.record_creative_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  area text NOT NULL,
  hours integer,
  note text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_creative_activities_pkey PRIMARY KEY (id),
  CONSTRAINT record_creative_activities_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_creative_activities_year_check CHECK (year >= 1 AND year <= 3),
  CONSTRAINT record_creative_activities_area_check CHECK (area = ANY (ARRAY['자율활동'::text, '동아리활동'::text, '진로활동'::text]))
);

-- 봉사활동
CREATE TABLE public.record_volunteer_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  date_range text NOT NULL DEFAULT ''::text,
  place text NOT NULL DEFAULT ''::text,
  content text NOT NULL DEFAULT ''::text,
  hours integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_volunteer_activities_pkey PRIMARY KEY (id),
  CONSTRAINT record_volunteer_activities_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_volunteer_activities_year_check CHECK (year >= 1 AND year <= 3)
);

-- 일반교과 성적
CREATE TABLE public.record_general_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  semester integer NOT NULL,
  category text NOT NULL DEFAULT ''::text,
  subject text NOT NULL DEFAULT ''::text,
  credits integer,
  raw_score numeric,
  average numeric,
  standard_deviation numeric,
  achievement text NOT NULL DEFAULT ''::text,
  student_count integer,
  grade_rank integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_general_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT record_general_subjects_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_general_subjects_year_check CHECK (year >= 1 AND year <= 3),
  CONSTRAINT record_general_subjects_semester_check CHECK (semester >= 1 AND semester <= 2),
  CONSTRAINT record_general_subjects_grade_rank_check CHECK (grade_rank IS NULL OR (grade_rank >= 1 AND grade_rank <= 9))
);

-- 전문교과 성적
CREATE TABLE public.record_career_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  semester integer NOT NULL,
  category text NOT NULL DEFAULT ''::text,
  subject text NOT NULL DEFAULT ''::text,
  credits integer,
  raw_score numeric,
  average numeric,
  achievement text NOT NULL DEFAULT ''::text,
  student_count integer,
  achievement_distribution text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_career_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT record_career_subjects_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_career_subjects_year_check CHECK (year >= 1 AND year <= 3),
  CONSTRAINT record_career_subjects_semester_check CHECK (semester >= 1 AND semester <= 2)
);

-- 체육/예술 교과
CREATE TABLE public.record_arts_physical_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  semester integer NOT NULL,
  category text NOT NULL DEFAULT ''::text,
  subject text NOT NULL DEFAULT ''::text,
  credits integer,
  achievement text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_arts_physical_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT record_arts_physical_subjects_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_arts_physical_subjects_year_check CHECK (year >= 1 AND year <= 3),
  CONSTRAINT record_arts_physical_subjects_semester_check CHECK (semester >= 1 AND semester <= 2)
);

-- 세특 (교과학습발달상황 특기사항)
CREATE TABLE public.record_subject_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  subject text NOT NULL DEFAULT ''::text,
  evaluation text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_subject_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT record_subject_evaluations_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_subject_evaluations_year_check CHECK (year >= 1 AND year <= 3)
);

-- 독서활동
CREATE TABLE public.record_reading_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  subject_or_area text NOT NULL DEFAULT ''::text,
  content text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_reading_activities_pkey PRIMARY KEY (id),
  CONSTRAINT record_reading_activities_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_reading_activities_year_check CHECK (year >= 1 AND year <= 3)
);

-- 행동특성 및 종합의견
CREATE TABLE public.record_behavioral_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  year integer NOT NULL,
  assessment text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_behavioral_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT record_behavioral_assessments_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id) ON DELETE CASCADE,
  CONSTRAINT record_behavioral_assessments_year_check CHECK (year >= 1 AND year <= 3)
);

-- 주문
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  record_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment'::text,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT orders_record_id_fkey FOREIGN KEY (record_id) REFERENCES records (id),
  CONSTRAINT orders_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans (id),
  CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'analyzing'::text, 'analysis_complete'::text, 'under_review'::text, 'review_complete'::text, 'delivered'::text]))
);

-- 결제
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  payment_key text,
  toss_order_id text NOT NULL,
  method text,
  status text NOT NULL DEFAULT 'ready'::text,
  amount integer NOT NULL,
  approved_at timestamptz,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT payments_toss_order_id_key UNIQUE (toss_order_id),
  CONSTRAINT payments_status_check CHECK (status = ANY (ARRAY['ready'::text, 'done'::text, 'canceled'::text]))
);

-- 리포트
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  content jsonb,
  ai_generated_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  target_university_id uuid,
  ai_status text NOT NULL DEFAULT 'pending'::text,
  ai_progress smallint NOT NULL DEFAULT 0,
  ai_current_section text,
  ai_error text,
  ai_retry_count smallint NOT NULL DEFAULT 0,
  ai_model_version text,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users (id),
  CONSTRAINT reports_target_university_id_fkey FOREIGN KEY (target_university_id) REFERENCES target_universities (id),
  CONSTRAINT reports_ai_status_check CHECK (ai_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  CONSTRAINT reports_ai_progress_check CHECK (ai_progress >= 0 AND ai_progress <= 100)
);


-- ========================
-- 4. Triggers
-- ========================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.target_universities
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.records
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_record_drafts_updated BEFORE UPDATE ON public.record_drafts
  FOR EACH ROW EXECUTE FUNCTION handle_record_drafts_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- auth.users INSERT 시 프로필 자동 생성
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ========================
-- 5. Row Level Security (RLS)
-- ========================

-- 모든 테이블 RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_creative_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_volunteer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_general_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_career_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_arts_physical_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_subject_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_reading_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_behavioral_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_profiles ON public.profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY admin_update_profiles ON public.profiles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ---- consent_records ----
CREATE POLICY consent_select_own ON public.consent_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY consent_insert_own ON public.consent_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY consent_update_own ON public.consent_records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---- target_universities ----
CREATE POLICY target_universities_select_own ON public.target_universities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY target_universities_insert_own ON public.target_universities FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY target_universities_update_own ON public.target_universities FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY target_universities_delete_own ON public.target_universities FOR DELETE USING (user_id = auth.uid());
CREATE POLICY target_universities_select_admin ON public.target_universities FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_target_universities ON public.target_universities FOR SELECT TO authenticated USING (is_admin());

-- ---- plans ----
CREATE POLICY plans_select_authenticated ON public.plans FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY plans_insert_admin ON public.plans FOR INSERT WITH CHECK (is_admin());
CREATE POLICY plans_update_admin ON public.plans FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY plans_delete_admin ON public.plans FOR DELETE USING (is_admin());
CREATE POLICY admin_select_all_plans ON public.plans FOR SELECT TO authenticated USING (is_admin());

-- ---- records ----
CREATE POLICY records_select_own ON public.records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY records_insert_own ON public.records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY records_update_own ON public.records FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY records_select_admin ON public.records FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_records ON public.records FOR SELECT TO authenticated USING (is_admin());

-- ---- record_drafts ----
CREATE POLICY record_drafts_select_own ON public.record_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY record_drafts_insert_own ON public.record_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY record_drafts_update_own ON public.record_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY record_drafts_delete_own ON public.record_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---- record_attendance ----
CREATE POLICY record_attendance_select_own ON public.record_attendance FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_attendance.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_attendance_insert_own ON public.record_attendance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_attendance.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_attendance_update_own ON public.record_attendance FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_attendance.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_attendance.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_attendance_delete_own ON public.record_attendance FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_attendance.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_attendance_select_admin ON public.record_attendance FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_attendance ON public.record_attendance FOR SELECT TO authenticated USING (is_admin());

-- ---- record_awards ----
CREATE POLICY record_awards_select_own ON public.record_awards FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_awards.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_awards_insert_own ON public.record_awards FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_awards.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_awards_update_own ON public.record_awards FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_awards.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_awards.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_awards_delete_own ON public.record_awards FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_awards.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_awards_select_admin ON public.record_awards FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_awards ON public.record_awards FOR SELECT TO authenticated USING (is_admin());

-- ---- record_certifications ----
CREATE POLICY record_certifications_select_own ON public.record_certifications FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_certifications.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_certifications_insert_own ON public.record_certifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_certifications.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_certifications_update_own ON public.record_certifications FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_certifications.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_certifications.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_certifications_delete_own ON public.record_certifications FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_certifications.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_certifications_select_admin ON public.record_certifications FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_certifications ON public.record_certifications FOR SELECT TO authenticated USING (is_admin());

-- ---- record_creative_activities ----
CREATE POLICY record_creative_activities_select_own ON public.record_creative_activities FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_creative_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_creative_activities_insert_own ON public.record_creative_activities FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_creative_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_creative_activities_update_own ON public.record_creative_activities FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_creative_activities.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_creative_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_creative_activities_delete_own ON public.record_creative_activities FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_creative_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_creative_activities_select_admin ON public.record_creative_activities FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_creative_activities ON public.record_creative_activities FOR SELECT TO authenticated USING (is_admin());

-- ---- record_volunteer_activities ----
CREATE POLICY record_volunteer_activities_select_own ON public.record_volunteer_activities FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_volunteer_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_volunteer_activities_insert_own ON public.record_volunteer_activities FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_volunteer_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_volunteer_activities_update_own ON public.record_volunteer_activities FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_volunteer_activities.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_volunteer_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_volunteer_activities_delete_own ON public.record_volunteer_activities FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_volunteer_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_volunteer_activities_select_admin ON public.record_volunteer_activities FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_volunteer_activities ON public.record_volunteer_activities FOR SELECT TO authenticated USING (is_admin());

-- ---- record_general_subjects ----
CREATE POLICY record_general_subjects_select_own ON public.record_general_subjects FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_general_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_general_subjects_insert_own ON public.record_general_subjects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_general_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_general_subjects_update_own ON public.record_general_subjects FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_general_subjects.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_general_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_general_subjects_delete_own ON public.record_general_subjects FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_general_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_general_subjects_select_admin ON public.record_general_subjects FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_general_subjects ON public.record_general_subjects FOR SELECT TO authenticated USING (is_admin());

-- ---- record_career_subjects ----
CREATE POLICY record_career_subjects_select_own ON public.record_career_subjects FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_career_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_career_subjects_insert_own ON public.record_career_subjects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_career_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_career_subjects_update_own ON public.record_career_subjects FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_career_subjects.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_career_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_career_subjects_delete_own ON public.record_career_subjects FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_career_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_career_subjects_select_admin ON public.record_career_subjects FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_career_subjects ON public.record_career_subjects FOR SELECT TO authenticated USING (is_admin());

-- ---- record_arts_physical_subjects ----
CREATE POLICY record_arts_physical_subjects_select_own ON public.record_arts_physical_subjects FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_arts_physical_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_arts_physical_subjects_insert_own ON public.record_arts_physical_subjects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_arts_physical_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_arts_physical_subjects_update_own ON public.record_arts_physical_subjects FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_arts_physical_subjects.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_arts_physical_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_arts_physical_subjects_delete_own ON public.record_arts_physical_subjects FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_arts_physical_subjects.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_arts_physical_subjects_select_admin ON public.record_arts_physical_subjects FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_arts_physical_subjects ON public.record_arts_physical_subjects FOR SELECT TO authenticated USING (is_admin());

-- ---- record_subject_evaluations ----
CREATE POLICY record_subject_evaluations_select_own ON public.record_subject_evaluations FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_subject_evaluations.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_subject_evaluations_insert_own ON public.record_subject_evaluations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_subject_evaluations.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_subject_evaluations_update_own ON public.record_subject_evaluations FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_subject_evaluations.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_subject_evaluations.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_subject_evaluations_delete_own ON public.record_subject_evaluations FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_subject_evaluations.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_subject_evaluations_select_admin ON public.record_subject_evaluations FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_subject_evaluations ON public.record_subject_evaluations FOR SELECT TO authenticated USING (is_admin());

-- ---- record_reading_activities ----
CREATE POLICY record_reading_activities_select_own ON public.record_reading_activities FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_reading_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_reading_activities_insert_own ON public.record_reading_activities FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_reading_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_reading_activities_update_own ON public.record_reading_activities FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_reading_activities.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_reading_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_reading_activities_delete_own ON public.record_reading_activities FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_reading_activities.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_reading_activities_select_admin ON public.record_reading_activities FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_reading_activities ON public.record_reading_activities FOR SELECT TO authenticated USING (is_admin());

-- ---- record_behavioral_assessments ----
CREATE POLICY record_behavioral_assessments_select_own ON public.record_behavioral_assessments FOR SELECT USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_behavioral_assessments.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_behavioral_assessments_insert_own ON public.record_behavioral_assessments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_behavioral_assessments.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_behavioral_assessments_update_own ON public.record_behavioral_assessments FOR UPDATE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_behavioral_assessments.record_id AND records.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM records WHERE records.id = record_behavioral_assessments.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_behavioral_assessments_delete_own ON public.record_behavioral_assessments FOR DELETE USING (EXISTS (SELECT 1 FROM records WHERE records.id = record_behavioral_assessments.record_id AND records.user_id = auth.uid()));
CREATE POLICY record_behavioral_assessments_select_admin ON public.record_behavioral_assessments FOR SELECT TO public USING (is_admin());
CREATE POLICY admin_select_all_record_behavioral_assessments ON public.record_behavioral_assessments FOR SELECT TO authenticated USING (is_admin());

-- ---- orders ----
CREATE POLICY orders_select_own ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY orders_insert_own ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY orders_select_admin ON public.orders FOR SELECT TO public USING (is_admin());
CREATE POLICY orders_update_admin ON public.orders FOR UPDATE TO public USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_select_all_orders ON public.orders FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY admin_update_orders ON public.orders FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ---- payments ----
CREATE POLICY payments_select_own ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY payments_insert_admin ON public.payments FOR INSERT WITH CHECK (is_admin());
CREATE POLICY payments_select_admin ON public.payments FOR SELECT TO public USING (is_admin());
CREATE POLICY payments_update_admin ON public.payments FOR UPDATE TO public USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_select_all_payments ON public.payments FOR SELECT TO authenticated USING (is_admin());

-- ---- reports ----
CREATE POLICY reports_select_own ON public.reports FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = reports.order_id AND orders.user_id = auth.uid()));
CREATE POLICY reports_insert_admin ON public.reports FOR INSERT WITH CHECK (is_admin());
CREATE POLICY reports_select_admin ON public.reports FOR SELECT TO public USING (is_admin());
CREATE POLICY reports_update_admin ON public.reports FOR UPDATE TO public USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_select_all_reports ON public.reports FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY admin_update_reports ON public.reports FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
