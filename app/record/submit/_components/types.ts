// ============================================
// 입력 방식 및 위저드 단계
// ============================================

export type InputMethod = "pdf" | "image" | "text";

export type WizardStep = 1 | 2 | 3 | 4;

// ============================================
// 생기부 섹션별 Row 타입
// ============================================

/** 출결상황 */
export interface AttendanceRow {
  id: string;
  year: number;
  totalDays: number | null;
  absenceIllness: number | null;
  absenceUnauthorized: number | null;
  absenceOther: number | null;
  latenessIllness: number | null;
  latenessUnauthorized: number | null;
  latenessOther: number | null;
  earlyLeaveIllness: number | null;
  earlyLeaveUnauthorized: number | null;
  earlyLeaveOther: number | null;
  classMissedIllness: number | null;
  classMissedUnauthorized: number | null;
  classMissedOther: number | null;
  note: string;
}

/** 수상경력 */
export interface AwardRow {
  id: string;
  year: number;
  name: string;
  rank: string;
  date: string;
  organization: string;
  participants: string;
}

/** 자격증 및 인증 취득상황 */
export interface CertificationRow {
  id: string;
  category: string;
  name: string;
  details: string;
  date: string;
  issuer: string;
}

/** 창의적 체험활동 영역 */
export type CreativeActivityArea = "자율활동" | "동아리활동" | "진로활동";

/** 창의적 체험활동상황 */
export interface CreativeActivityRow {
  id: string;
  year: number;
  area: CreativeActivityArea;
  hours: number | null;
  note: string;
}

/** 봉사활동실적 */
export interface VolunteerRow {
  id: string;
  year: number;
  dateRange: string;
  place: string;
  content: string;
  hours: number | null;
}

/** 교과학습발달상황 - 일반선택과목 */
export interface GeneralSubjectRow {
  id: string;
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  rawScore: number | null;
  average: number | null;
  standardDeviation: number | null;
  achievement: string;
  studentCount: number | null;
  gradeRank: number | null;
  note: string;
}

/** 교과학습발달상황 - 진로선택과목 */
export interface CareerSubjectRow {
  id: string;
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  rawScore: number | null;
  average: number | null;
  achievement: string;
  studentCount: number | null;
  achievementDistribution: string;
  note: string;
}

/** 교과학습발달상황 - 체육/예술과목 */
export interface ArtsPhysicalSubjectRow {
  id: string;
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  achievement: string;
}

/** 세부능력 및 특기사항 */
export interface SubjectEvaluationRow {
  id: string;
  year: number;
  subject: string;
  evaluation: string;
}

/** 독서활동상황 */
export interface ReadingActivityRow {
  id: string;
  year: number;
  subjectOrArea: string;
  content: string;
}

/** 행동특성 및 종합의견 */
export interface BehavioralAssessmentRow {
  id: string;
  year: number;
  assessment: string;
}

/** 모의고사 성적 */
export interface MockExamRow {
  id: string;
  year: number;
  month: number;
  subject: string;
  score: number | null;
  gradeRank: number | null;
  percentile: number | null;
  standardScore: number | null;
}

// ============================================
// 통합 생기부 데이터 구조
// ============================================

export interface SchoolRecord {
  attendance: AttendanceRow[];
  awards: AwardRow[];
  certifications: CertificationRow[];
  creativeActivities: CreativeActivityRow[];
  volunteerActivities: VolunteerRow[];
  generalSubjects: GeneralSubjectRow[];
  careerSubjects: CareerSubjectRow[];
  artsPhysicalSubjects: ArtsPhysicalSubjectRow[];
  subjectEvaluations: SubjectEvaluationRow[];
  readingActivities: ReadingActivityRow[];
  behavioralAssessments: BehavioralAssessmentRow[];
  mockExams: MockExamRow[];
}

// ============================================
// 섹션 탭 정의
// ============================================

export type RecordSectionTab =
  | "generalSubjects"
  | "careerSubjects"
  | "artsPhysicalSubjects"
  | "subjectEvaluations"
  | "creativeActivities"
  | "attendance"
  | "awards"
  | "readingActivities"
  | "behavioralAssessments"
  | "certifications"
  | "volunteerActivities"
  | "mockExams";

export interface SectionTabConfig {
  key: RecordSectionTab;
  label: string;
  shortLabel: string;
}

export const SECTION_TABS: SectionTabConfig[] = [
  { key: "generalSubjects", label: "일반교과 성적", shortLabel: "일반교과" },
  { key: "careerSubjects", label: "진로선택 성적", shortLabel: "진로선택" },
  {
    key: "artsPhysicalSubjects",
    label: "체육/예술 성적",
    shortLabel: "체육/예술",
  },
  {
    key: "subjectEvaluations",
    label: "세부능력 및 특기사항",
    shortLabel: "세특",
  },
  {
    key: "creativeActivities",
    label: "창의적 체험활동",
    shortLabel: "창체",
  },
  { key: "attendance", label: "출결상황", shortLabel: "출결" },
  { key: "awards", label: "수상경력", shortLabel: "수상" },
  { key: "readingActivities", label: "독서활동", shortLabel: "독서" },
  {
    key: "behavioralAssessments",
    label: "행동특성 및 종합의견",
    shortLabel: "행특",
  },
  { key: "certifications", label: "자격증/인증", shortLabel: "자격증" },
  {
    key: "volunteerActivities",
    label: "봉사활동",
    shortLabel: "봉사",
  },
  { key: "mockExams", label: "모의고사 성적", shortLabel: "모의고사" },
];

// ============================================
// 위저드 상태
// ============================================

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
}

export interface WizardState {
  step: WizardStep;
  method: InputMethod | null;
  pdfFile: File | null;
  pdfFileName: string;
  images: ImageFile[];
  record: SchoolRecord;
  isParsing: boolean;
  parseError: string | null;
  draftId: string | null;
  draftLoading: boolean;
}

// ============================================
// 초기값 및 팩토리 함수
// ============================================

export const createEmptySchoolRecord = (): SchoolRecord => ({
  attendance: [],
  awards: [],
  certifications: [],
  creativeActivities: [],
  volunteerActivities: [],
  generalSubjects: [],
  careerSubjects: [],
  artsPhysicalSubjects: [],
  subjectEvaluations: [],
  readingActivities: [],
  behavioralAssessments: [],
  mockExams: [],
});

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  method: null,
  pdfFile: null,
  pdfFileName: "",
  images: [],
  record: createEmptySchoolRecord(),
  isParsing: false,
  parseError: null,
  draftId: null,
  draftLoading: true,
};

// ---- Row 팩토리 함수 ----

export const createEmptyAttendanceRow = (): AttendanceRow => ({
  id: crypto.randomUUID(),
  year: 1,
  totalDays: null,
  absenceIllness: null,
  absenceUnauthorized: null,
  absenceOther: null,
  latenessIllness: null,
  latenessUnauthorized: null,
  latenessOther: null,
  earlyLeaveIllness: null,
  earlyLeaveUnauthorized: null,
  earlyLeaveOther: null,
  classMissedIllness: null,
  classMissedUnauthorized: null,
  classMissedOther: null,
  note: "",
});

export const createEmptyAwardRow = (): AwardRow => ({
  id: crypto.randomUUID(),
  year: 1,
  name: "",
  rank: "",
  date: "",
  organization: "",
  participants: "",
});

export const createEmptyCertificationRow = (): CertificationRow => ({
  id: crypto.randomUUID(),
  category: "",
  name: "",
  details: "",
  date: "",
  issuer: "",
});

export const createEmptyCreativeActivityRow = (): CreativeActivityRow => ({
  id: crypto.randomUUID(),
  year: 1,
  area: "자율활동",
  hours: null,
  note: "",
});

export const createEmptyVolunteerRow = (): VolunteerRow => ({
  id: crypto.randomUUID(),
  year: 1,
  dateRange: "",
  place: "",
  content: "",
  hours: null,
});

export const createEmptyGeneralSubjectRow = (): GeneralSubjectRow => ({
  id: crypto.randomUUID(),
  year: 1,
  semester: 1,
  category: "",
  subject: "",
  credits: null,
  rawScore: null,
  average: null,
  standardDeviation: null,
  achievement: "",
  studentCount: null,
  gradeRank: null,
  note: "",
});

export const createEmptyCareerSubjectRow = (): CareerSubjectRow => ({
  id: crypto.randomUUID(),
  year: 1,
  semester: 1,
  category: "",
  subject: "",
  credits: null,
  rawScore: null,
  average: null,
  achievement: "",
  studentCount: null,
  achievementDistribution: "",
  note: "",
});

export const createEmptyArtsPhysicalSubjectRow =
  (): ArtsPhysicalSubjectRow => ({
    id: crypto.randomUUID(),
    year: 1,
    semester: 1,
    category: "",
    subject: "",
    credits: null,
    achievement: "",
  });

export const createEmptySubjectEvaluationRow = (): SubjectEvaluationRow => ({
  id: crypto.randomUUID(),
  year: 1,
  subject: "",
  evaluation: "",
});

export const createEmptyReadingActivityRow = (): ReadingActivityRow => ({
  id: crypto.randomUUID(),
  year: 1,
  subjectOrArea: "",
  content: "",
});

export const createEmptyBehavioralAssessmentRow =
  (): BehavioralAssessmentRow => ({
    id: crypto.randomUUID(),
    year: 1,
    assessment: "",
  });

export const createEmptyMockExamRow = (): MockExamRow => ({
  id: crypto.randomUUID(),
  year: 1,
  month: 6,
  subject: "",
  score: null,
  gradeRank: null,
  percentile: null,
  standardScore: null,
});

// ============================================
// 필수 입력 검증 (AI 파이프라인 필수 데이터)
// ============================================

export interface RequiredFieldRule {
  key: keyof SchoolRecord;
  label: string;
  minCount: number;
  message: string;
}

/**
 * AI 리포트 생성에 필수적인 섹션과 최소 입력 기준.
 * - generalSubjects: 성적 분석의 핵심 (최소 3과목 = 1학기분)
 * - subjectEvaluations: 세특 분석의 핵심 (최소 1과목)
 * - creativeActivities: 창체 분석의 핵심 (최소 1개 학년)
 * - behavioralAssessments: 행특 분석의 핵심 (최소 1개 학년)
 * - attendance: 출결 분석의 핵심 (최소 1개 학년)
 */
export const REQUIRED_FIELD_RULES: RequiredFieldRule[] = [
  {
    key: "generalSubjects",
    label: "일반교과 성적",
    minCount: 3,
    message: "일반교과 성적을 최소 3과목 이상 입력해주세요",
  },
  {
    key: "subjectEvaluations",
    label: "세부능력 및 특기사항",
    minCount: 1,
    message: "세부능력 및 특기사항을 최소 1과목 이상 입력해주세요",
  },
  {
    key: "creativeActivities",
    label: "창의적 체험활동",
    minCount: 1,
    message: "창의적 체험활동을 최소 1개 학년 이상 입력해주세요",
  },
  {
    key: "behavioralAssessments",
    label: "행동특성 및 종합의견",
    minCount: 1,
    message: "행동특성 및 종합의견을 최소 1개 학년 이상 입력해주세요",
  },
  {
    key: "attendance",
    label: "출결상황",
    minCount: 1,
    message: "출결상황을 최소 1개 학년 이상 입력해주세요",
  },
];

/** 필수 섹션 키 Set (빠른 조회용) */
export const REQUIRED_SECTION_KEYS = new Set<keyof SchoolRecord>(
  REQUIRED_FIELD_RULES.map((r) => r.key)
);

export interface ValidationError {
  key: keyof SchoolRecord;
  label: string;
  message: string;
  current: number;
  required: number;
}

/** 필수 필드 검증. 미충족 항목만 반환. */
export const validateRequiredFields = (
  record: SchoolRecord
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // ── 1) 섹션별 최소 행 수 검증 ──
  for (const rule of REQUIRED_FIELD_RULES) {
    const count = (record[rule.key] ?? []).length;
    if (count < rule.minCount) {
      errors.push({
        key: rule.key,
        label: rule.label,
        message: rule.message,
        current: count,
        required: rule.minCount,
      });
    }
  }

  // ── 2) 행 내부 필수값 검증 ──

  // 출결: 수업일수 필수
  for (const row of record.attendance) {
    if (row.totalDays === null || row.totalDays === undefined) {
      errors.push({
        key: "attendance",
        label: "출결상황",
        message: `${row.year}학년 수업일수가 비어있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }

  // 일반교과: 과목명, 등급 필수
  for (const row of record.generalSubjects) {
    if (!row.subject) {
      errors.push({
        key: "generalSubjects",
        label: "일반교과 성적",
        message: `${row.year}-${row.semester}학기 과목명이 비어있는 행이 있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }
  const noGradeRows = record.generalSubjects.filter(
    (r) => r.gradeRank === null || r.gradeRank === undefined
  );
  if (
    record.generalSubjects.length > 0 &&
    noGradeRows.length === record.generalSubjects.length
  ) {
    errors.push({
      key: "generalSubjects",
      label: "일반교과 성적",
      message: "모든 일반교과의 석차등급이 비어있습니다",
      current: 0,
      required: 1,
    });
  }

  // 진로선택: 과목명 필수
  for (const row of record.careerSubjects) {
    if (!row.subject) {
      errors.push({
        key: "careerSubjects",
        label: "진로선택 성적",
        message: `${row.year}-${row.semester}학기 과목명이 비어있는 행이 있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }

  // 체육/예술: 과목명 필수
  for (const row of record.artsPhysicalSubjects) {
    if (!row.subject) {
      errors.push({
        key: "artsPhysicalSubjects",
        label: "체육/예술 성적",
        message: `${row.year}-${row.semester}학기 과목명이 비어있는 행이 있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }

  // 세특: 과목명, 내용 필수
  for (const row of record.subjectEvaluations) {
    if (!row.subject || !row.evaluation) {
      errors.push({
        key: "subjectEvaluations",
        label: "세부능력 및 특기사항",
        message: `${row.year}학년 세특에 과목명 또는 내용이 비어있는 행이 있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }

  // 창체: 영역 필수
  for (const row of record.creativeActivities) {
    if (!row.area) {
      errors.push({
        key: "creativeActivities",
        label: "창의적 체험활동",
        message: `${row.year}학년 창체 영역이 비어있는 행이 있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }

  // 행특: 내용 필수
  for (const row of record.behavioralAssessments) {
    if (!row.assessment) {
      errors.push({
        key: "behavioralAssessments",
        label: "행동특성 및 종합의견",
        message: `${row.year}학년 행동특성 내용이 비어있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }

  // 모의고사: 과목명 필수
  for (const row of record.mockExams) {
    if (!row.subject) {
      errors.push({
        key: "mockExams",
        label: "모의고사 성적",
        message: `${row.year}학년 ${row.month}월 모의고사 과목명이 비어있는 행이 있습니다`,
        current: 0,
        required: 1,
      });
      break;
    }
  }

  return errors;
};
