-- 수강 예정 과목 (학생이 자유 텍스트로 입력)
ALTER TABLE records ADD COLUMN IF NOT EXISTS planned_subjects text;
ALTER TABLE record_drafts ADD COLUMN IF NOT EXISTS planned_subjects text;

-- 기존 시그니처 제거 후 p_planned_subjects 파라미터 추가
DROP FUNCTION IF EXISTS public.upsert_record(uuid, text, text, uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);

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
  p_behavioral_assessments jsonb DEFAULT '[]'::jsonb,
  p_mock_exams jsonb DEFAULT '[]'::jsonb,
  p_planned_subjects text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_record_id UUID;
  v_row JSONB;
BEGIN
  IF p_existing_record_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM records WHERE id = p_existing_record_id AND user_id = p_user_id) THEN
      RAISE EXCEPTION 'Record not found or unauthorized';
    END IF;

    DELETE FROM record_attendance WHERE record_id = p_existing_record_id;
    DELETE FROM record_awards WHERE record_id = p_existing_record_id;
    DELETE FROM record_certifications WHERE record_id = p_existing_record_id;
    DELETE FROM record_creative_activities WHERE record_id = p_existing_record_id;
    DELETE FROM record_volunteer_activities WHERE record_id = p_existing_record_id;
    DELETE FROM record_general_subjects WHERE record_id = p_existing_record_id;
    DELETE FROM record_career_subjects WHERE record_id = p_existing_record_id;
    DELETE FROM record_arts_physical_subjects WHERE record_id = p_existing_record_id;
    DELETE FROM record_subject_evaluations WHERE record_id = p_existing_record_id;
    DELETE FROM record_reading_activities WHERE record_id = p_existing_record_id;
    DELETE FROM record_behavioral_assessments WHERE record_id = p_existing_record_id;
    DELETE FROM record_mock_exams WHERE record_id = p_existing_record_id;

    UPDATE records
    SET submission_type = p_submission_type,
        grade_level = p_grade_level,
        planned_subjects = p_planned_subjects,
        updated_at = now()
    WHERE id = p_existing_record_id;

    v_record_id := p_existing_record_id;
  ELSE
    INSERT INTO records (user_id, submission_type, grade_level, planned_subjects)
    VALUES (p_user_id, p_submission_type, p_grade_level, p_planned_subjects)
    RETURNING id INTO v_record_id;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_attendance) LOOP
    INSERT INTO record_attendance (record_id, year, total_days, absence_illness, absence_unauthorized, absence_other, lateness_illness, lateness_unauthorized, lateness_other, early_leave_illness, early_leave_unauthorized, early_leave_other, class_missed_illness, class_missed_unauthorized, class_missed_other, note)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'total_days')::INT, (v_row->>'absence_illness')::INT, (v_row->>'absence_unauthorized')::INT, (v_row->>'absence_other')::INT, (v_row->>'lateness_illness')::INT, (v_row->>'lateness_unauthorized')::INT, (v_row->>'lateness_other')::INT, (v_row->>'early_leave_illness')::INT, (v_row->>'early_leave_unauthorized')::INT, (v_row->>'early_leave_other')::INT, (v_row->>'class_missed_illness')::INT, (v_row->>'class_missed_unauthorized')::INT, (v_row->>'class_missed_other')::INT, v_row->>'note');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_awards) LOOP
    INSERT INTO record_awards (record_id, year, name, rank, date, organization, participants)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'name', v_row->>'rank', v_row->>'date', v_row->>'organization', v_row->>'participants');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_certifications) LOOP
    INSERT INTO record_certifications (record_id, category, name, details, date, issuer)
    VALUES (v_record_id, v_row->>'category', v_row->>'name', v_row->>'details', v_row->>'date', v_row->>'issuer');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_creative_activities) LOOP
    INSERT INTO record_creative_activities (record_id, year, area, hours, note)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'area', (v_row->>'hours')::INT, v_row->>'note');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_volunteer_activities) LOOP
    INSERT INTO record_volunteer_activities (record_id, year, date_range, place, content, hours)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'date_range', v_row->>'place', v_row->>'content', (v_row->>'hours')::INT);
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_general_subjects) LOOP
    INSERT INTO record_general_subjects (record_id, year, semester, category, subject, credits, raw_score, average, standard_deviation, achievement, student_count, grade_rank, note)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'semester')::INT, v_row->>'category', v_row->>'subject', (v_row->>'credits')::INT, (v_row->>'raw_score')::NUMERIC, (v_row->>'average')::NUMERIC, (v_row->>'standard_deviation')::NUMERIC, v_row->>'achievement', (v_row->>'student_count')::INT, (v_row->>'grade_rank')::INT, v_row->>'note');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_career_subjects) LOOP
    INSERT INTO record_career_subjects (record_id, year, semester, category, subject, credits, raw_score, average, achievement, student_count, achievement_distribution, note)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'semester')::INT, v_row->>'category', v_row->>'subject', (v_row->>'credits')::INT, (v_row->>'raw_score')::NUMERIC, (v_row->>'average')::NUMERIC, v_row->>'achievement', (v_row->>'student_count')::INT, v_row->>'achievement_distribution', v_row->>'note');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_arts_physical_subjects) LOOP
    INSERT INTO record_arts_physical_subjects (record_id, year, semester, category, subject, credits, achievement)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'semester')::INT, v_row->>'category', v_row->>'subject', (v_row->>'credits')::INT, v_row->>'achievement');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_subject_evaluations) LOOP
    INSERT INTO record_subject_evaluations (record_id, year, subject, evaluation)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'subject', v_row->>'evaluation');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_reading_activities) LOOP
    INSERT INTO record_reading_activities (record_id, year, subject_or_area, content)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'subject_or_area', v_row->>'content');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_behavioral_assessments) LOOP
    INSERT INTO record_behavioral_assessments (record_id, year, assessment)
    VALUES (v_record_id, (v_row->>'year')::INT, v_row->>'assessment');
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_mock_exams) LOOP
    INSERT INTO record_mock_exams (record_id, year, month, subject, score, grade_rank, percentile, standard_score)
    VALUES (v_record_id, (v_row->>'year')::INT, (v_row->>'month')::INT, v_row->>'subject', (v_row->>'score')::INT, (v_row->>'grade_rank')::INT, (v_row->>'percentile')::NUMERIC, (v_row->>'standard_score')::INT);
  END LOOP;

  DELETE FROM record_drafts WHERE user_id = p_user_id;

  RETURN v_record_id;
END;
$function$;
