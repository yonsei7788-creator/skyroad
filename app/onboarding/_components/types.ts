// app/onboarding/_components/types.ts

export type OnboardingStep = 1 | 2;

export interface OnboardingState {
  step: OnboardingStep;
  profileCompleted: boolean;
  universityCompleted: boolean;
}

/** Step 1: 입시 정보 */
export interface ProfileStepData {
  name: string;
  phone: string;
  highSchoolName: string;
  highSchoolType: string;
  grade: string;
  admissionYear: number | null;
}

/** Step 3: 목표 대학 (1~3지망) */
export type UniversityPriority = 1 | 2 | 3 | 4 | 5 | 6;

export interface TargetUniversity {
  id?: string;
  priority: UniversityPriority;
  universityName: string;
  admissionType: string;
  department: string;
  subField: string;
}

export interface UniversityStepData {
  universities: TargetUniversity[];
}

/** 학교 유형 */
export const SCHOOL_TYPES = [
  "일반고",
  "특목고",
  "자율고",
  "특성화고",
  "영재학교",
  "과학고",
  "외국어고",
  "국제고",
  "예술고",
  "체육고",
  "마이스터고",
] as const;

export type SchoolType = (typeof SCHOOL_TYPES)[number];

/** 전형 유형 */
export const ADMISSION_TYPES = [
  "학생부종합",
  "학생부교과",
  "고른기회",
  "논술",
  "실기/실적",
  "기타",
] as const;

export type AdmissionType = (typeof ADMISSION_TYPES)[number];
