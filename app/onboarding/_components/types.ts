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
  highSchoolRegion: string;
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

/** 고교 소재지 (시/도) */
export const REGION_OPTIONS = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
] as const;

export type Region = (typeof REGION_OPTIONS)[number];

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
