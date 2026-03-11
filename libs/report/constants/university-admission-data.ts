/**
 * 주요 대학 입시 데이터 상수
 *
 * 2025~2028학년도 기준의 주요 대학 입시 데이터를 정의한다.
 * 현실적인 수치를 기반으로 한 참고용 데이터이며,
 * AI 리포트의 대학 후보군 생성에 사용된다.
 */

import type { ReportPlan } from "../types.ts";

// ─── 타입 정의 ───

interface AdmissionType {
  type: "학생부종합" | "학생부교과" | "정시";
  name: string;
  cutoffGrade: number;
  cutoffGrade70: number;
  competitionRate: number;
  enrollment: number;
}

export interface UniversityAdmissionEntry {
  university: string;
  department: string;
  track: "문과" | "이과" | "예체능" | "통합";
  admissionTypes: AdmissionType[];
  tier: number;
}

export interface UniversityCandidate {
  university: string;
  department: string;
  admissionType: string;
  admissionTypeName: string;
  tier: "상향" | "적정" | "안정" | "하향";
  cutoffGrade: number;
  cutoffGrade70?: number;
  competitionRate: number;
  enrollment: number;
}

// ─── 학과 유사도 매핑 ───

const DEPARTMENT_CATEGORY_MAP: Record<string, string[]> = {
  인문: [
    "국어국문학과",
    "영어영문학과",
    "사학과",
    "철학과",
    "심리학과",
    "국어국문",
    "영어영문",
    "사학",
    "철학",
    "심리학",
    "국문학",
    "영문학",
    "문학",
    "어문",
    "인문학",
    "동양어",
    "서양어",
    "불어불문",
    "독어독문",
    "중어중문",
    "일어일문",
    "언어학",
  ],
  사회과학: [
    "정치외교학과",
    "행정학과",
    "사회학과",
    "미디어커뮤니케이션학과",
    "정치외교",
    "행정",
    "사회학",
    "미디어",
    "커뮤니케이션",
    "신문방송",
    "언론정보",
    "사회복지",
    "도시계획",
    "문헌정보",
    "지리학",
  ],
  경영경제: [
    "경영학과",
    "경제학과",
    "회계학과",
    "국제통상학과",
    "경영",
    "경제",
    "회계",
    "국제통상",
    "무역",
    "금융",
    "재무",
    "마케팅",
    "세무",
    "물류",
    "경영정보",
  ],
  자연과학: [
    "수학과",
    "물리학과",
    "화학과",
    "생명과학과",
    "수학",
    "물리",
    "화학",
    "생명과학",
    "통계",
    "천문",
    "지구과학",
    "환경과학",
    "생물",
    "자연과학",
  ],
  공학: [
    "컴퓨터공학과",
    "전기전자공학과",
    "기계공학과",
    "화학공학과",
    "컴퓨터공학",
    "전기전자",
    "기계공학",
    "화학공학",
    "전자공학",
    "소프트웨어",
    "정보통신",
    "산업공학",
    "건축공학",
    "토목공학",
    "신소재",
    "재료공학",
    "에너지",
    "반도체",
    "AI",
    "인공지능",
    "데이터사이언스",
    "로봇공학",
  ],
  의약학: [
    "의예과",
    "치의예과",
    "한의예과",
    "약학과",
    "수의예과",
    "의학",
    "치의학",
    "한의학",
    "약학",
    "수의학",
    "간호학",
  ],
  교육: [
    "교육학과",
    "교육",
    "국어교육",
    "영어교육",
    "수학교육",
    "사회교육",
    "과학교육",
    "체육교육",
    "유아교육",
    "특수교육",
  ],
  예체능: [
    "미술",
    "음악",
    "체육",
    "디자인",
    "무용",
    "연극영화",
    "실용음악",
    "시각디자인",
    "산업디자인",
    "패션디자인",
  ],
};

// ─── 입시 데이터 ───

export const UNIVERSITY_ADMISSION_DATA: UniversityAdmissionEntry[] = [
  // ============================================================
  // 티어 1: 서울대, 연세대, 고려대
  // ============================================================

  // 서울대 - 문과
  {
    university: "서울대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.4,
        competitionRate: 8.5,
        enrollment: 40,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 5.2,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.2,
        competitionRate: 4.5,
        enrollment: 30,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "경제학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.5,
        competitionRate: 7.8,
        enrollment: 35,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 4.8,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.3,
        competitionRate: 4.2,
        enrollment: 25,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "정치외교학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 6.5,
        enrollment: 30,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 4.0,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.4,
        competitionRate: 3.8,
        enrollment: 20,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "심리학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.6,
        competitionRate: 9.2,
        enrollment: 20,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 5.5,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.4,
        competitionRate: 5.0,
        enrollment: 15,
      },
    ],
    tier: 1,
  },

  // 서울대 - 이과
  {
    university: "서울대학교",
    department: "컴퓨터공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.3,
        competitionRate: 10.5,
        enrollment: 45,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 6.0,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.2,
        competitionRate: 5.5,
        enrollment: 35,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "전기정보공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.4,
        competitionRate: 8.0,
        enrollment: 40,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 5.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.3,
        competitionRate: 4.8,
        enrollment: 30,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "의예과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 12.0,
        enrollment: 30,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.2,
        competitionRate: 8.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.0,
        competitionRate: 7.5,
        enrollment: 20,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "기계공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 7.0,
        enrollment: 40,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 4.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.4,
        competitionRate: 4.0,
        enrollment: 30,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "화학생물공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 6.8,
        enrollment: 35,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 4.2,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.4,
        competitionRate: 3.8,
        enrollment: 25,
      },
    ],
    tier: 1,
  },

  // 연세대 - 문과
  {
    university: "연세대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 9.0,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 4.5,
        enrollment: 25,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.3,
        competitionRate: 5.0,
        enrollment: 40,
      },
    ],
    tier: 1,
  },
  {
    university: "연세대학교",
    department: "경제학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 7.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 4.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.4,
        competitionRate: 4.5,
        enrollment: 30,
      },
    ],
    tier: 1,
  },
  {
    university: "연세대학교",
    department: "영어영문학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.8,
        competitionRate: 6.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 3.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 3.8,
        enrollment: 20,
      },
    ],
    tier: 1,
  },

  // 연세대 - 이과
  {
    university: "연세대학교",
    department: "컴퓨터과학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 11.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.4,
        competitionRate: 5.5,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.3,
        competitionRate: 5.8,
        enrollment: 35,
      },
    ],
    tier: 1,
  },
  {
    university: "연세대학교",
    department: "전기전자공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 8.5,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 4.8,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.4,
        competitionRate: 4.5,
        enrollment: 40,
      },
    ],
    tier: 1,
  },
  {
    university: "연세대학교",
    department: "의예과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 15.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 9.0,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.0,
        competitionRate: 8.5,
        enrollment: 20,
      },
    ],
    tier: 1,
  },

  // 고려대 - 문과
  {
    university: "고려대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 8.5,
        enrollment: 55,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 4.8,
        enrollment: 25,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.4,
        competitionRate: 4.8,
        enrollment: 45,
      },
    ],
    tier: 1,
  },
  {
    university: "고려대학교",
    department: "정치외교학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 6.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 3.8,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.5,
        competitionRate: 3.5,
        enrollment: 25,
      },
    ],
    tier: 1,
  },
  {
    university: "고려대학교",
    department: "심리학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.8,
        competitionRate: 7.8,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 4.2,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 4.5,
        enrollment: 18,
      },
    ],
    tier: 1,
  },

  // 고려대 - 이과
  {
    university: "고려대학교",
    department: "컴퓨터학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 10.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 5.5,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.3,
        competitionRate: 5.0,
        enrollment: 35,
      },
    ],
    tier: 1,
  },
  {
    university: "고려대학교",
    department: "전기전자공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 7.5,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 4.5,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.4,
        competitionRate: 4.2,
        enrollment: 40,
      },
    ],
    tier: 1,
  },
  {
    university: "고려대학교",
    department: "의예과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 14.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 8.5,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.0,
        competitionRate: 8.0,
        enrollment: 20,
      },
    ],
    tier: 1,
  },

  // ============================================================
  // 티어 2: 성균관대, 서강대, 한양대
  // ============================================================

  // 성균관대 - 문과
  {
    university: "성균관대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 8.0,
        enrollment: 60,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.8,
        competitionRate: 4.5,
        enrollment: 30,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.6,
        competitionRate: 4.0,
        enrollment: 50,
      },
    ],
    tier: 2,
  },
  {
    university: "성균관대학교",
    department: "사회과학계열",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 6.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 3.8,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 3.5,
        enrollment: 30,
      },
    ],
    tier: 2,
  },

  // 성균관대 - 이과
  {
    university: "성균관대학교",
    department: "소프트웨어학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 10.5,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 5.5,
        enrollment: 25,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.5,
        competitionRate: 5.0,
        enrollment: 40,
      },
    ],
    tier: 2,
  },
  {
    university: "성균관대학교",
    department: "전자전기공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 7.5,
        enrollment: 55,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 4.5,
        enrollment: 25,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.6,
        competitionRate: 4.0,
        enrollment: 45,
      },
    ],
    tier: 2,
  },
  {
    university: "성균관대학교",
    department: "의예과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 13.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 8.0,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.0,
        competitionRate: 7.5,
        enrollment: 20,
      },
    ],
    tier: 2,
  },

  // 서강대 - 문과
  {
    university: "서강대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합(일반)",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 7.5,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 4.0,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 4.0,
        enrollment: 35,
      },
    ],
    tier: 2,
  },
  {
    university: "서강대학교",
    department: "경제학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합(일반)",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 6.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 3.5,
        enrollment: 25,
      },
    ],
    tier: 2,
  },

  // 서강대 - 이과
  {
    university: "서강대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합(일반)",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 9.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 5.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.6,
        competitionRate: 4.5,
        enrollment: 30,
      },
    ],
    tier: 2,
  },
  {
    university: "서강대학교",
    department: "전자공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합(일반)",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 7.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 4.2,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 3.8,
        enrollment: 28,
      },
    ],
    tier: 2,
  },

  // 한양대 - 문과
  {
    university: "한양대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 8.0,
        enrollment: 55,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 4.5,
        enrollment: 25,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 4.2,
        enrollment: 45,
      },
    ],
    tier: 2,
  },
  {
    university: "한양대학교",
    department: "미디어커뮤니케이션학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 7.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 4.0,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 3.8,
        enrollment: 20,
      },
    ],
    tier: 2,
  },

  // 한양대 - 이과
  {
    university: "한양대학교",
    department: "컴퓨터소프트웨어학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 10.0,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 5.5,
        enrollment: 22,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.6,
        competitionRate: 5.0,
        enrollment: 40,
      },
    ],
    tier: 2,
  },
  {
    university: "한양대학교",
    department: "전기생체공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 7.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 3.8,
        enrollment: 35,
      },
    ],
    tier: 2,
  },
  {
    university: "한양대학교",
    department: "의예과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 14.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 8.5,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.0,
        competitionRate: 8.0,
        enrollment: 20,
      },
    ],
    tier: 2,
  },

  // ============================================================
  // 티어 3: 중앙대, 경희대, 한국외대, 서울시립대
  // ============================================================

  // 중앙대 - 문과
  {
    university: "중앙대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "다빈치형인재",
        cutoffGrade: 2.2,
        cutoffGrade70: 2.5,
        competitionRate: 7.5,
        enrollment: 55,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 4.5,
        enrollment: 25,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 4.0,
        enrollment: 45,
      },
    ],
    tier: 3,
  },
  {
    university: "중앙대학교",
    department: "미디어커뮤니케이션학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "다빈치형인재",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 8.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 5.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 4.5,
        enrollment: 25,
      },
    ],
    tier: 3,
  },

  // 중앙대 - 이과
  {
    university: "중앙대학교",
    department: "소프트웨어학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "다빈치형인재",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 9.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 5.0,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 4.5,
        enrollment: 35,
      },
    ],
    tier: 3,
  },
  {
    university: "중앙대학교",
    department: "의학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "다빈치형인재",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.2,
        competitionRate: 12.0,
        enrollment: 20,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.2,
        competitionRate: 7.5,
        enrollment: 8,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 7.0,
        enrollment: 15,
      },
    ],
    tier: 3,
  },
  {
    university: "중앙대학교",
    department: "전자전기공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "다빈치형인재",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 7.0,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 4.0,
        enrollment: 22,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 3.8,
        enrollment: 40,
      },
    ],
    tier: 3,
  },

  // 경희대 - 문과
  {
    university: "경희대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "네오르네상스",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 7.0,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 4.0,
        enrollment: 22,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 3.8,
        enrollment: 40,
      },
    ],
    tier: 3,
  },
  {
    university: "경희대학교",
    department: "국제학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "네오르네상스",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 6.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.2,
        cutoffGrade70: 2.5,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 3.5,
        enrollment: 25,
      },
    ],
    tier: 3,
  },

  // 경희대 - 이과
  {
    university: "경희대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "네오르네상스",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 8.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 4.5,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 4.0,
        enrollment: 30,
      },
    ],
    tier: 3,
  },
  {
    university: "경희대학교",
    department: "의예과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "네오르네상스",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.2,
        competitionRate: 13.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.2,
        competitionRate: 7.5,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.1,
        competitionRate: 7.0,
        enrollment: 18,
      },
    ],
    tier: 3,
  },

  // 한국외대 - 문과
  {
    university: "한국외국어대학교",
    department: "영어학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 6.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.2,
        cutoffGrade70: 2.5,
        competitionRate: 3.8,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 3.5,
        enrollment: 28,
      },
    ],
    tier: 3,
  },
  {
    university: "한국외국어대학교",
    department: "국제통상학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 6.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 3.2,
        enrollment: 22,
      },
    ],
    tier: 3,
  },

  // 서울시립대 - 문과
  {
    university: "서울시립대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.2,
        cutoffGrade70: 2.5,
        competitionRate: 6.8,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 4.0,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.5,
        enrollment: 35,
      },
    ],
    tier: 3,
  },
  {
    university: "서울시립대학교",
    department: "행정학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 5.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 3.0,
        enrollment: 25,
      },
    ],
    tier: 3,
  },

  // 서울시립대 - 이과
  {
    university: "서울시립대학교",
    department: "컴퓨터과학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 8.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 4.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 4.0,
        enrollment: 28,
      },
    ],
    tier: 3,
  },

  // ============================================================
  // 티어 4: 건국대, 동국대, 숭실대, 홍익대, 국민대
  // ============================================================

  // 건국대 - 문과
  {
    university: "건국대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "KU자기추천",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 6.5,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 4.0,
        enrollment: 22,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.2,
        cutoffGrade70: 2.5,
        competitionRate: 3.5,
        enrollment: 40,
      },
    ],
    tier: 4,
  },
  {
    university: "건국대학교",
    department: "미디어커뮤니케이션학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "KU자기추천",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 7.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 4.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 4.0,
        enrollment: 20,
      },
    ],
    tier: 4,
  },

  // 건국대 - 이과
  {
    university: "건국대학교",
    department: "컴퓨터공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "KU자기추천",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 8.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 5.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 4.0,
        enrollment: 32,
      },
    ],
    tier: 4,
  },

  // 동국대 - 문과
  {
    university: "동국대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "Do Dream",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 6.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 3.8,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.5,
        enrollment: 35,
      },
    ],
    tier: 4,
  },
  {
    university: "동국대학교",
    department: "영화영상학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "Do Dream",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 9.5,
        enrollment: 20,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 5.5,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 5.0,
        enrollment: 15,
      },
    ],
    tier: 4,
  },

  // 동국대 - 이과
  {
    university: "동국대학교",
    department: "컴퓨터공학전공",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "Do Dream",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 7.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 4.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 4.0,
        enrollment: 28,
      },
    ],
    tier: 4,
  },

  // 숭실대 - 문과
  {
    university: "숭실대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "SSU미래인재",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 5.5,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 3.5,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.0,
        enrollment: 35,
      },
    ],
    tier: 4,
  },

  // 숭실대 - 이과
  {
    university: "숭실대학교",
    department: "컴퓨터학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "SSU미래인재",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 7.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 4.5,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.8,
        enrollment: 30,
      },
    ],
    tier: 4,
  },

  // 홍익대 - 문과
  {
    university: "홍익대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 5.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 3.5,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.2,
        enrollment: 32,
      },
    ],
    tier: 4,
  },

  // 홍익대 - 이과
  {
    university: "홍익대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 7.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 4.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.5,
        enrollment: 28,
      },
    ],
    tier: 4,
  },

  // 국민대 - 문과
  {
    university: "국민대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "국민프런티어",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 5.5,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 3.5,
        enrollment: 22,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 3.0,
        enrollment: 40,
      },
    ],
    tier: 4,
  },

  // 국민대 - 이과
  {
    university: "국민대학교",
    department: "소프트웨어학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "국민프런티어",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 7.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.5,
        enrollment: 32,
      },
    ],
    tier: 4,
  },

  // ============================================================
  // 티어 5: 숙명여대, 세종대, 단국대, 광운대, 상명대
  // ============================================================

  // 숙명여대 - 문과
  {
    university: "숙명여자대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "숙명인재",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 5.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 3.5,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 3.0,
        enrollment: 32,
      },
    ],
    tier: 5,
  },
  {
    university: "숙명여자대학교",
    department: "미디어학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "숙명인재",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 6.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 3.8,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 3.2,
        enrollment: 20,
      },
    ],
    tier: 5,
  },

  // 숙명여대 - 이과
  {
    university: "숙명여자대학교",
    department: "컴퓨터과학전공",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "숙명인재",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 6.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 4.0,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 3.5,
        enrollment: 22,
      },
    ],
    tier: 5,
  },

  // 세종대 - 문과
  {
    university: "세종대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "창의인재",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 5.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 3.2,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 2.8,
        enrollment: 35,
      },
    ],
    tier: 5,
  },

  // 세종대 - 이과
  {
    university: "세종대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "창의인재",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 7.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.5,
        enrollment: 30,
      },
    ],
    tier: 5,
  },

  // 단국대 - 문과
  {
    university: "단국대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "DKU인재",
        cutoffGrade: 3.4,
        cutoffGrade70: 3.7,
        competitionRate: 5.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학생부교과우수자",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 3.0,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 2.8,
        enrollment: 35,
      },
    ],
    tier: 5,
  },

  // 단국대 - 이과
  {
    university: "단국대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "DKU인재",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 6.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과우수자",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 4.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 3.2,
        enrollment: 28,
      },
    ],
    tier: 5,
  },

  // 광운대 - 문과
  {
    university: "광운대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "광운참인재",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 4.8,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 3.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 2.5,
        enrollment: 30,
      },
    ],
    tier: 5,
  },

  // 광운대 - 이과
  {
    university: "광운대학교",
    department: "컴퓨터정보공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "광운참인재",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 6.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 3.0,
        enrollment: 30,
      },
    ],
    tier: 5,
  },

  // 상명대 - 문과
  {
    university: "상명대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "상명인재",
        cutoffGrade: 3.6,
        cutoffGrade70: 3.9,
        competitionRate: 4.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 3.4,
        cutoffGrade70: 3.7,
        competitionRate: 3.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 2.5,
        enrollment: 28,
      },
    ],
    tier: 5,
  },

  // 상명대 - 이과
  {
    university: "상명대학교",
    department: "컴퓨터과학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "상명인재",
        cutoffGrade: 3.4,
        cutoffGrade70: 3.7,
        competitionRate: 5.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 3.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 2.8,
        enrollment: 22,
      },
    ],
    tier: 5,
  },

  // ============================================================
  // 티어 6: 한성대, 덕성여대, 서울여대, 가천대, 인하대
  // ============================================================

  // 한성대 - 문과
  {
    university: "한성대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "한성인재",
        cutoffGrade: 3.9,
        cutoffGrade70: 4.2,
        competitionRate: 4.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.7,
        cutoffGrade70: 4.0,
        competitionRate: 3.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.4,
        cutoffGrade70: 3.7,
        competitionRate: 2.5,
        enrollment: 30,
      },
    ],
    tier: 6,
  },

  // 한성대 - 이과
  {
    university: "한성대학교",
    department: "컴퓨터공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "한성인재",
        cutoffGrade: 3.6,
        cutoffGrade70: 3.9,
        competitionRate: 5.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.4,
        cutoffGrade70: 3.7,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 2.8,
        enrollment: 25,
      },
    ],
    tier: 6,
  },

  // 덕성여대 - 문과
  {
    university: "덕성여자대학교",
    department: "경영학전공",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "덕성인재",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 4.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 3.6,
        cutoffGrade70: 3.9,
        competitionRate: 3.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 2.5,
        enrollment: 22,
      },
    ],
    tier: 6,
  },

  // 덕성여대 - 이과
  {
    university: "덕성여자대학교",
    department: "컴퓨터공학전공",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "덕성인재",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 5.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 3.0,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 2.5,
        enrollment: 18,
      },
    ],
    tier: 6,
  },

  // 서울여대 - 문과
  {
    university: "서울여자대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "바롬인재",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 4.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 2.8,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 2.2,
        enrollment: 22,
      },
    ],
    tier: 6,
  },

  // 서울여대 - 이과
  {
    university: "서울여자대학교",
    department: "소프트웨어융합학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "바롬인재",
        cutoffGrade: 3.7,
        cutoffGrade70: 4.0,
        competitionRate: 5.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 3.0,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 2.5,
        enrollment: 18,
      },
    ],
    tier: 6,
  },

  // 가천대 - 문과
  {
    university: "가천대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "가천바람개비",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 4.5,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 3.0,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 2.5,
        enrollment: 35,
      },
    ],
    tier: 6,
  },

  // 가천대 - 이과
  {
    university: "가천대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "가천바람개비",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 6.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 3.5,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 2.8,
        enrollment: 30,
      },
    ],
    tier: 6,
  },

  // 인하대 - 문과
  {
    university: "인하대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "인하미래인재",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 5.5,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 3.5,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 3.0,
        enrollment: 35,
      },
    ],
    tier: 6,
  },

  // 인하대 - 이과
  {
    university: "인하대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "인하미래인재",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 7.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.2,
        enrollment: 30,
      },
    ],
    tier: 6,
  },

  // ============================================================
  // 티어 7: 아주대, 경기대, 한국항공대
  // ============================================================

  // 아주대 - 문과
  {
    university: "아주대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "ACE",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 5.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 3.2,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 2.8,
        enrollment: 30,
      },
    ],
    tier: 7,
  },
  {
    university: "아주대학교",
    department: "사회과학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "ACE",
        cutoffGrade: 3.4,
        cutoffGrade70: 3.7,
        competitionRate: 4.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 2.8,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 2.5,
        enrollment: 22,
      },
    ],
    tier: 7,
  },

  // 아주대 - 이과
  {
    university: "아주대학교",
    department: "소프트웨어학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "ACE",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 7.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.2,
        enrollment: 30,
      },
    ],
    tier: 7,
  },

  // 경기대 - 문과
  {
    university: "경기대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "KGU학생부종합",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 4.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 2.8,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 2.2,
        enrollment: 30,
      },
    ],
    tier: 7,
  },

  // 경기대 - 이과
  {
    university: "경기대학교",
    department: "컴퓨터공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "KGU학생부종합",
        cutoffGrade: 3.7,
        cutoffGrade70: 4.0,
        competitionRate: 5.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 3.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 2.5,
        enrollment: 25,
      },
    ],
    tier: 7,
  },

  // 한국항공대 - 이과
  {
    university: "한국항공대학교",
    department: "항공전자정보공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "미래인재",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 6.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 3.0,
        enrollment: 28,
      },
    ],
    tier: 7,
  },
  {
    university: "한국항공대학교",
    department: "소프트웨어학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "미래인재",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 6.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 3.8,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 3.0,
        enrollment: 22,
      },
    ],
    tier: 7,
  },

  // ============================================================
  // 티어 8: 삼육대, 한신대, 수원대
  // ============================================================

  // 삼육대 - 문과
  {
    university: "삼육대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 3.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.3,
        cutoffGrade70: 4.6,
        competitionRate: 2.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 2.0,
        enrollment: 25,
      },
    ],
    tier: 8,
  },

  // 삼육대 - 이과
  {
    university: "삼육대학교",
    department: "컴퓨터공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.2,
        cutoffGrade70: 4.5,
        competitionRate: 4.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 2.8,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.7,
        cutoffGrade70: 4.0,
        competitionRate: 2.2,
        enrollment: 22,
      },
    ],
    tier: 8,
  },

  // 한신대 - 문과
  {
    university: "한신대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "한신인재",
        cutoffGrade: 4.7,
        cutoffGrade70: 5.0,
        competitionRate: 3.2,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 2.2,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.2,
        cutoffGrade70: 4.5,
        competitionRate: 1.8,
        enrollment: 22,
      },
    ],
    tier: 8,
  },

  // 한신대 - 이과
  {
    university: "한신대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "한신인재",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 3.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.3,
        cutoffGrade70: 4.6,
        competitionRate: 2.5,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 2.0,
        enrollment: 18,
      },
    ],
    tier: 8,
  },

  // 수원대 - 문과
  {
    university: "수원대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "미래인재",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.1,
        competitionRate: 3.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 2.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.3,
        cutoffGrade70: 4.6,
        competitionRate: 1.8,
        enrollment: 25,
      },
    ],
    tier: 8,
  },

  // 수원대 - 이과
  {
    university: "수원대학교",
    department: "컴퓨터학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "미래인재",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 3.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.3,
        cutoffGrade70: 4.6,
        competitionRate: 2.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 2.0,
        enrollment: 22,
      },
    ],
    tier: 8,
  },

  // ============================================================
  // 커리어넷 검증 추가: 수도권 주요 대학
  // ============================================================

  // 이화여자대학교 - 문과 (티어 2)
  {
    university: "이화여자대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "미래인재",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 6.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "고교추천",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 4.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 4.5,
        enrollment: 25,
      },
    ],
    tier: 2,
  },
  // 이화여자대학교 - 이과
  {
    university: "이화여자대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "미래인재",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 7.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "고교추천",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 4.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 5.0,
        enrollment: 20,
      },
    ],
    tier: 2,
  },

  // 서울과학기술대학교 - 문과 (티어 5)
  {
    university: "서울과학기술대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학교생활우수자",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 5.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.0,
        enrollment: 20,
      },
    ],
    tier: 5,
  },
  // 서울과학기술대학교 - 이과
  {
    university: "서울과학기술대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학교생활우수자",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 6.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 4.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.5,
        enrollment: 25,
      },
    ],
    tier: 5,
  },

  // 성신여자대학교 - 문과 (티어 5)
  {
    university: "성신여자대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학교생활우수자",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 4.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "교과우수자",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 3.0,
        enrollment: 15,
      },
    ],
    tier: 5,
  },

  // 동덕여자대학교 - 문과 (티어 6)
  {
    university: "동덕여자대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "동덕프론티어",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 4.0,
        enrollment: 28,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 2.5,
        enrollment: 12,
      },
    ],
    tier: 6,
  },

  // 명지대학교 - 문과 (티어 5)
  {
    university: "명지대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "명지인재",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 4.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 3.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.0,
        competitionRate: 2.5,
        enrollment: 20,
      },
    ],
    tier: 5,
  },
  // 명지대학교 - 이과
  {
    university: "명지대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "명지인재",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 5.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 3.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.0,
        enrollment: 18,
      },
    ],
    tier: 5,
  },

  // 인천대학교 - 문과 (티어 5)
  {
    university: "인천대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "자기추천",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 4.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 3.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.0,
        competitionRate: 2.5,
        enrollment: 25,
      },
    ],
    tier: 5,
  },
  // 인천대학교 - 이과
  {
    university: "인천대학교",
    department: "컴퓨터공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "자기추천",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 5.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 3.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.0,
        enrollment: 20,
      },
    ],
    tier: 5,
  },

  // 서경대학교 - 문과 (티어 7)
  {
    university: "서경대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.2,
        cutoffGrade70: 4.5,
        competitionRate: 3.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 2.0,
        enrollment: 12,
      },
    ],
    tier: 7,
  },

  // 가톨릭대학교 - 문과 (티어 4)
  {
    university: "가톨릭대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "잠재능력우수자",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 5.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학업성적우수자",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.5,
        enrollment: 15,
      },
    ],
    tier: 4,
  },

  // 한양대학교 ERICA - 문과 (티어 4)
  {
    university: "한양대학교(ERICA)",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 5.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 3.0,
        enrollment: 20,
      },
    ],
    tier: 4,
  },
  // 한양대학교 ERICA - 이과
  {
    university: "한양대학교(ERICA)",
    department: "컴퓨터학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 6.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 4.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.5,
        enrollment: 25,
      },
    ],
    tier: 4,
  },

  // 을지대학교 - 문과 (티어 7)
  {
    university: "을지대학교",
    department: "간호학과",
    track: "통합",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "을지인재",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 4.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "교과성적우수자",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 3.0,
        enrollment: 15,
      },
    ],
    tier: 7,
  },

  // 성공회대학교 - 문과 (티어 7)
  {
    university: "성공회대학교",
    department: "사회복지학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 3.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 2.2,
        enrollment: 12,
      },
    ],
    tier: 7,
  },

  // 한세대학교 - 문과 (티어 8)
  {
    university: "한세대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.1,
        competitionRate: 2.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 1.8,
        enrollment: 12,
      },
    ],
    tier: 8,
  },

  // 협성대학교 - 문과 (티어 8)
  {
    university: "협성대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 2.8,
        enrollment: 28,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.3,
        cutoffGrade70: 4.6,
        competitionRate: 2.0,
        enrollment: 12,
      },
    ],
    tier: 8,
  },
  // 협성대학교 - 이과
  {
    university: "협성대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.3,
        cutoffGrade70: 4.6,
        competitionRate: 3.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.0,
        cutoffGrade70: 4.3,
        competitionRate: 2.2,
        enrollment: 10,
      },
    ],
    tier: 8,
  },

  // 대진대학교 - 문과 (티어 8)
  {
    university: "대진대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 2.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.3,
        cutoffGrade70: 4.6,
        competitionRate: 1.8,
        enrollment: 12,
      },
    ],
    tier: 8,
  },

  // 강남대학교 - 문과 (티어 8)
  {
    university: "강남대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.1,
        competitionRate: 2.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 1.8,
        enrollment: 15,
      },
    ],
    tier: 8,
  },

  // 신한대학교 - 문과 (티어 9)
  {
    university: "신한대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 5.2,
        cutoffGrade70: 5.5,
        competitionRate: 2.2,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 1.5,
        enrollment: 12,
      },
    ],
    tier: 9,
  },

  // 용인대학교 - 문과 (티어 9)
  {
    university: "용인대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 2.5,
        enrollment: 28,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.1,
        competitionRate: 1.8,
        enrollment: 12,
      },
    ],
    tier: 9,
  },

  // ============================================================
  // 커리어넷 검증 추가: 거점 국립대
  // ============================================================

  // 부산대학교 - 문과 (티어 3)
  {
    university: "부산대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 5.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.5,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 3.0,
        enrollment: 30,
      },
    ],
    tier: 3,
  },
  // 부산대학교 - 이과
  {
    university: "부산대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 6.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 4.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.5,
        enrollment: 25,
      },
    ],
    tier: 3,
  },

  // 경북대학교 - 문과 (티어 3)
  {
    university: "경북대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반학생",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 5.0,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역인재",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.0,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 3.0,
        enrollment: 30,
      },
    ],
    tier: 3,
  },
  // 경북대학교 - 이과
  {
    university: "경북대학교",
    department: "컴퓨터학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반학생",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 5.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "지역인재",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.5,
        enrollment: 25,
      },
    ],
    tier: 3,
  },

  // 전남대학교 - 문과 (티어 4)
  {
    university: "전남대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "고교생활우수자",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 4.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "지역인재",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 2.5,
        enrollment: 25,
      },
    ],
    tier: 4,
  },

  // 충남대학교 - 문과 (티어 4)
  {
    university: "충남대학교",
    department: "경영학부",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "PRISM인재",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 4.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 2.5,
        enrollment: 25,
      },
    ],
    tier: 4,
  },
  // 충남대학교 - 이과
  {
    university: "충남대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "PRISM인재",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 5.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 3.0,
        enrollment: 20,
      },
    ],
    tier: 4,
  },

  // 충북대학교 - 문과 (티어 4)
  {
    university: "충북대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 4.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 2.8,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 2.5,
        enrollment: 20,
      },
    ],
    tier: 4,
  },

  // 전북대학교 - 문과 (티어 4)
  {
    university: "전북대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "큰사람",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 4.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 2.8,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 2.5,
        enrollment: 25,
      },
    ],
    tier: 4,
  },

  // 강원대학교 - 문과 (티어 5)
  {
    university: "강원대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "미래인재",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 3.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 2.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.0,
        competitionRate: 2.0,
        enrollment: 20,
      },
    ],
    tier: 5,
  },

  // 제주대학교 - 문과 (티어 5)
  {
    university: "제주대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반학생",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 3.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.2,
        cutoffGrade70: 3.5,
        competitionRate: 2.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 2.0,
        enrollment: 20,
      },
    ],
    tier: 5,
  },

  // 국립한밭대학교 - 이과 (티어 6)
  {
    university: "국립한밭대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "한밭인재",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 4.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 2.8,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 2.5,
        enrollment: 18,
      },
    ],
    tier: 6,
  },

  // 국립금오공과대학교 - 이과 (티어 6)
  {
    university: "국립금오공과대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 3.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 2.5,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 2.0,
        enrollment: 18,
      },
    ],
    tier: 6,
  },

  // 국립군산대학교 - 문과 (티어 6)
  {
    university: "국립군산대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 3.8,
        cutoffGrade70: 4.1,
        competitionRate: 3.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 3.5,
        cutoffGrade70: 3.8,
        competitionRate: 2.2,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 3.3,
        cutoffGrade70: 3.6,
        competitionRate: 1.8,
        enrollment: 20,
      },
    ],
    tier: 6,
  },

  // ============================================================
  // 추가 학과 다양성: 인문/사회/자연과학/공학 계열 추가
  // ============================================================

  // 연세대 - 사회과학
  {
    university: "연세대학교",
    department: "행정학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.8,
        competitionRate: 6.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 3.5,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.5,
        competitionRate: 3.5,
        enrollment: 20,
      },
    ],
    tier: 1,
  },

  // 고려대 - 인문
  {
    university: "고려대학교",
    department: "국어국문학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 5.0,
        enrollment: 20,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 3.0,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 3.0,
        enrollment: 15,
      },
    ],
    tier: 1,
  },

  // 성균관대 - 인문
  {
    university: "성균관대학교",
    department: "영어영문학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 5.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.2,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 3.0,
        enrollment: 20,
      },
    ],
    tier: 2,
  },

  // 한양대 - 자연과학
  {
    university: "한양대학교",
    department: "화학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 2.2,
        cutoffGrade70: 2.5,
        competitionRate: 5.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 3.0,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 2.8,
        enrollment: 18,
      },
    ],
    tier: 2,
  },

  // 중앙대 - 사회과학
  {
    university: "중앙대학교",
    department: "심리학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "다빈치형인재",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 8.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.2,
        cutoffGrade70: 2.5,
        competitionRate: 5.0,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.0,
        cutoffGrade70: 2.3,
        competitionRate: 4.5,
        enrollment: 18,
      },
    ],
    tier: 3,
  },

  // 경희대 - 자연과학
  {
    university: "경희대학교",
    department: "생명과학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "네오르네상스",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 5.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 3.2,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 2.8,
        enrollment: 18,
      },
    ],
    tier: 3,
  },

  // 건국대 - 자연과학
  {
    university: "건국대학교",
    department: "화학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "KU자기추천",
        cutoffGrade: 3.0,
        cutoffGrade70: 3.3,
        competitionRate: 4.5,
        enrollment: 20,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.8,
        cutoffGrade70: 3.1,
        competitionRate: 2.8,
        enrollment: 8,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 2.5,
        enrollment: 15,
      },
    ],
    tier: 4,
  },

  // 동국대 - 사회과학
  {
    university: "동국대학교",
    department: "행정학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "Do Dream",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 5.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 3.2,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 2.8,
        enrollment: 18,
      },
    ],
    tier: 4,
  },

  // 인하대 - 공학
  {
    university: "인하대학교",
    department: "전자공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "인하미래인재",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 6.5,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 3.8,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 3.0,
        enrollment: 35,
      },
    ],
    tier: 6,
  },

  // 아주대 - 공학
  {
    university: "아주대학교",
    department: "전자공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "ACE",
        cutoffGrade: 3.1,
        cutoffGrade70: 3.4,
        competitionRate: 6.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 3.8,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 3.0,
        enrollment: 30,
      },
    ],
    tier: 7,
  },

  // ============================================================
  // 추가 인문/교육 계열
  // ============================================================

  {
    university: "서울대학교",
    department: "국어국문학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 5.5,
        enrollment: 20,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 3.5,
        enrollment: 8,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.5,
        competitionRate: 3.0,
        enrollment: 15,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "영어영문학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.6,
        competitionRate: 6.0,
        enrollment: 22,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.8,
        competitionRate: 3.8,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.5,
        competitionRate: 3.2,
        enrollment: 18,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "생명과학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.6,
        competitionRate: 6.5,
        enrollment: 30,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 4.0,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.4,
        competitionRate: 3.5,
        enrollment: 22,
      },
    ],
    tier: 1,
  },
  {
    university: "서울대학교",
    department: "수리과학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "일반전형",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.5,
        competitionRate: 6.0,
        enrollment: 25,
      },
      {
        type: "학생부종합",
        name: "지역균형",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 3.8,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.0,
        cutoffGrade70: 1.3,
        competitionRate: 3.5,
        enrollment: 18,
      },
    ],
    tier: 1,
  },

  // 연세대 - 자연과학
  {
    university: "연세대학교",
    department: "생명과학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 5.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 3.2,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 3.0,
        enrollment: 22,
      },
    ],
    tier: 1,
  },
  {
    university: "연세대학교",
    department: "화학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "활동우수형",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 5.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "추천형",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 3.0,
        enrollment: 10,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 2.8,
        enrollment: 18,
      },
    ],
    tier: 1,
  },

  // 고려대 - 공학
  {
    university: "고려대학교",
    department: "기계공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 6.5,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.7,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.5,
        competitionRate: 3.8,
        enrollment: 35,
      },
    ],
    tier: 1,
  },
  {
    university: "고려대학교",
    department: "화공생명공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학업우수형",
        cutoffGrade: 1.6,
        cutoffGrade70: 1.9,
        competitionRate: 5.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학교추천",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.3,
        cutoffGrade70: 1.6,
        competitionRate: 3.2,
        enrollment: 28,
      },
    ],
    tier: 1,
  },

  // 성균관대 - 공학
  {
    university: "성균관대학교",
    department: "기계공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 6.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.7,
        cutoffGrade70: 2.0,
        competitionRate: 3.8,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.4,
        cutoffGrade70: 1.7,
        competitionRate: 3.5,
        enrollment: 35,
      },
    ],
    tier: 2,
  },
  {
    university: "성균관대학교",
    department: "화학공학/고분자공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "계열모집",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 5.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 3.0,
        enrollment: 28,
      },
    ],
    tier: 2,
  },

  // 한양대 - 공학 추가
  {
    university: "한양대학교",
    department: "기계공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 6.5,
        enrollment: 50,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 1.8,
        cutoffGrade70: 2.1,
        competitionRate: 3.8,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.5,
        cutoffGrade70: 1.8,
        competitionRate: 3.5,
        enrollment: 40,
      },
    ],
    tier: 2,
  },

  // 중앙대 - 공학 추가
  {
    university: "중앙대학교",
    department: "기계공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "다빈치형인재",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 6.0,
        enrollment: 45,
      },
      {
        type: "학생부교과",
        name: "학교장추천",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 3.5,
        enrollment: 20,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 3.2,
        enrollment: 35,
      },
    ],
    tier: 3,
  },

  // 경희대 - 공학
  {
    university: "경희대학교",
    department: "전자공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "네오르네상스",
        cutoffGrade: 2.3,
        cutoffGrade70: 2.6,
        competitionRate: 6.5,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.9,
        cutoffGrade70: 2.2,
        competitionRate: 3.0,
        enrollment: 28,
      },
    ],
    tier: 3,
  },

  // 건국대 - 공학 추가
  {
    university: "건국대학교",
    department: "전기전자공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "KU자기추천",
        cutoffGrade: 2.6,
        cutoffGrade70: 2.9,
        competitionRate: 6.5,
        enrollment: 40,
      },
      {
        type: "학생부교과",
        name: "지역균형",
        cutoffGrade: 2.4,
        cutoffGrade70: 2.7,
        competitionRate: 4.0,
        enrollment: 18,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.1,
        cutoffGrade70: 2.4,
        competitionRate: 3.5,
        enrollment: 32,
      },
    ],
    tier: 4,
  },

  // 숭실대 - 공학 추가
  {
    university: "숭실대학교",
    department: "전자정보공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "SSU미래인재",
        cutoffGrade: 2.9,
        cutoffGrade70: 3.2,
        competitionRate: 6.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 2.7,
        cutoffGrade70: 3.0,
        competitionRate: 3.5,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 2.5,
        cutoffGrade70: 2.8,
        competitionRate: 3.0,
        enrollment: 28,
      },
    ],
    tier: 4,
  },

  // 가천대 - 의약학
  {
    university: "가천대학교",
    department: "의예과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "가천바람개비",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.3,
        competitionRate: 12.0,
        enrollment: 20,
      },
      {
        type: "학생부교과",
        name: "학생부우수자",
        cutoffGrade: 1.2,
        cutoffGrade70: 1.3,
        competitionRate: 7.5,
        enrollment: 8,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 1.1,
        cutoffGrade70: 1.2,
        competitionRate: 7.0,
        enrollment: 15,
      },
    ],
    tier: 6,
  },

  // ============================================================
  // 티어 9: 한국산업기술대, 서울신학대, 한경국립대, 평택대
  // ============================================================

  // 한국산업기술대 - 문과
  {
    university: "한국산업기술대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 5.2,
        cutoffGrade70: 5.5,
        competitionRate: 2.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 1.8,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.0,
        competitionRate: 1.5,
        enrollment: 20,
      },
    ],
    tier: 9,
  },
  // 한국산업기술대 - 이과
  {
    university: "한국산업기술대학교",
    department: "컴퓨터공학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 3.0,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.1,
        competitionRate: 2.2,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 2.0,
        enrollment: 25,
      },
    ],
    tier: 9,
  },

  // 서울신학대 - 문과
  {
    university: "서울신학대학교",
    department: "사회복지학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 5.5,
        cutoffGrade70: 5.8,
        competitionRate: 2.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.3,
        cutoffGrade70: 5.6,
        competitionRate: 1.5,
        enrollment: 12,
      },
    ],
    tier: 9,
  },

  // 한경국립대 - 문과
  {
    university: "한경국립대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "한경인재",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 2.8,
        enrollment: 35,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.1,
        competitionRate: 2.0,
        enrollment: 15,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.5,
        cutoffGrade70: 4.8,
        competitionRate: 1.8,
        enrollment: 20,
      },
    ],
    tier: 9,
  },
  // 한경국립대 - 이과
  {
    university: "한경국립대학교",
    department: "컴퓨터응용수학부",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "한경인재",
        cutoffGrade: 5.2,
        cutoffGrade70: 5.5,
        competitionRate: 2.5,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 1.8,
        enrollment: 12,
      },
      {
        type: "정시",
        name: "정시 일반",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.0,
        competitionRate: 1.5,
        enrollment: 18,
      },
    ],
    tier: 9,
  },

  // 평택대 - 문과
  {
    university: "평택대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "PTU종합",
        cutoffGrade: 5.3,
        cutoffGrade70: 5.6,
        competitionRate: 2.2,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 1.5,
        enrollment: 12,
      },
    ],
    tier: 9,
  },
  // 평택대 - 이과
  {
    university: "평택대학교",
    department: "데이터정보학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "PTU종합",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 2.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 4.8,
        cutoffGrade70: 5.1,
        competitionRate: 1.8,
        enrollment: 10,
      },
    ],
    tier: 9,
  },

  // ============================================================
  // 티어 10: 성결대, 안양대, 중부대, 한라대
  // ============================================================

  // 성결대 - 문과
  {
    university: "성결대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "성결인재",
        cutoffGrade: 5.8,
        cutoffGrade70: 6.2,
        competitionRate: 2.0,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.5,
        cutoffGrade70: 5.8,
        competitionRate: 1.5,
        enrollment: 15,
      },
    ],
    tier: 10,
  },
  // 성결대 - 이과
  {
    university: "성결대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "성결인재",
        cutoffGrade: 5.5,
        cutoffGrade70: 5.8,
        competitionRate: 2.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.3,
        cutoffGrade70: 5.6,
        competitionRate: 1.8,
        enrollment: 10,
      },
    ],
    tier: 10,
  },

  // 안양대 - 문과
  {
    university: "안양대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "안양인재",
        cutoffGrade: 5.5,
        cutoffGrade70: 5.8,
        competitionRate: 2.2,
        enrollment: 28,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.3,
        cutoffGrade70: 5.6,
        competitionRate: 1.6,
        enrollment: 12,
      },
    ],
    tier: 10,
  },
  // 안양대 - 이과
  {
    university: "안양대학교",
    department: "소프트웨어학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "안양인재",
        cutoffGrade: 5.3,
        cutoffGrade70: 5.6,
        competitionRate: 2.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.0,
        cutoffGrade70: 5.3,
        competitionRate: 1.8,
        enrollment: 10,
      },
    ],
    tier: 10,
  },

  // 중부대 - 문과
  {
    university: "중부대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 6.0,
        cutoffGrade70: 6.5,
        competitionRate: 1.8,
        enrollment: 30,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.8,
        cutoffGrade70: 6.2,
        competitionRate: 1.3,
        enrollment: 15,
      },
    ],
    tier: 10,
  },
  // 중부대 - 이과
  {
    university: "중부대학교",
    department: "컴퓨터공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 5.8,
        cutoffGrade70: 6.2,
        competitionRate: 2.0,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.5,
        cutoffGrade70: 5.8,
        competitionRate: 1.5,
        enrollment: 10,
      },
    ],
    tier: 10,
  },

  // 한라대 - 문과
  {
    university: "한라대학교",
    department: "경영학과",
    track: "문과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 6.2,
        cutoffGrade70: 6.5,
        competitionRate: 1.5,
        enrollment: 25,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 6.0,
        cutoffGrade70: 6.3,
        competitionRate: 1.2,
        enrollment: 12,
      },
    ],
    tier: 10,
  },
  // 한라대 - 이과
  {
    university: "한라대학교",
    department: "정보통신공학과",
    track: "이과",
    admissionTypes: [
      {
        type: "학생부종합",
        name: "학생부종합",
        cutoffGrade: 6.0,
        cutoffGrade70: 6.3,
        competitionRate: 1.8,
        enrollment: 22,
      },
      {
        type: "학생부교과",
        name: "학생부교과",
        cutoffGrade: 5.8,
        cutoffGrade70: 6.0,
        competitionRate: 1.3,
        enrollment: 8,
      },
    ],
    tier: 10,
  },
];

// ─── 학과 카테고리 판별 ───

const getDepartmentCategory = (department: string): string | null => {
  for (const [category, keywords] of Object.entries(DEPARTMENT_CATEGORY_MAP)) {
    if (keywords.some((keyword) => department.includes(keyword))) {
      return category;
    }
  }
  return null;
};

const isSimilarDepartment = (dept1: string, dept2: string): boolean => {
  if (!dept1 || !dept2) return false;
  const cat1 = getDepartmentCategory(dept1);
  const cat2 = getDepartmentCategory(dept2);
  if (cat1 && cat2 && cat1 === cat2) return true;
  // 직접 포함 관계 체크
  return dept1.includes(dept2) || dept2.includes(dept1);
};

// ─── 플랜별 후보군 수 설정 ───

const CANDIDATE_COUNTS: Record<
  ReportPlan,
  Record<"상향" | "적정" | "안정" | "하향", number>
> = {
  lite: { 상향: 2, 적정: 2, 안정: 2, 하향: 2 },
  standard: { 상향: 3, 적정: 3, 안정: 3, 하향: 3 },
  premium: { 상향: 4, 적정: 4, 안정: 4, 하향: 4 },
};

// ─── 후보군 생성 함수 ───

/**
 * 학생의 환산 등급, 목표 학과, 계열 등을 기반으로
 * 상향/적정/안정/하향 대학 후보군을 생성한다.
 */
export const generateUniversityCandidates = (
  convertedGrade: number,
  targetDepartment: string,
  track: string,
  schoolType: string,
  plan: ReportPlan
): UniversityCandidate[] => {
  // 1. 계열 기반 필터링
  const trackFilter = track === "문과" ? "문과" : "이과";
  const filteredEntries = UNIVERSITY_ADMISSION_DATA.filter(
    (entry) => entry.track === trackFilter || entry.track === "통합"
  );

  // 2. 학종 기준 커트라인으로 티어 분류
  const classifyTier = (
    cutoffGrade: number
  ): "상향" | "적정" | "안정" | "하향" => {
    const diff = cutoffGrade - convertedGrade;
    if (diff < -0.5) return "상향";
    if (diff >= -0.5 && diff <= 0.3) return "적정";
    if (diff > 0.3 && diff <= 0.8) return "안정";
    return "하향";
  };

  // 3. 각 대학-학과에 대해 학종 기준 우선 매핑
  interface ScoredEntry {
    entry: UniversityAdmissionEntry;
    admission: AdmissionType;
    tierLabel: "상향" | "적정" | "안정" | "하향";
    relevanceScore: number;
  }

  const scoredEntries: ScoredEntry[] = [];

  for (const entry of filteredEntries) {
    // 학생부종합 우선, 없으면 학생부교과
    const primaryAdmission =
      entry.admissionTypes.find((a) => a.type === "학생부종합") ??
      entry.admissionTypes.find((a) => a.type === "학생부교과");

    if (!primaryAdmission) continue;

    const tierLabel = classifyTier(primaryAdmission.cutoffGrade);

    // 관련도 점수 계산
    // 핵심: 같은 티어 안에서 학생 등급에 가장 가까운 대학을 우선 선택
    // gradeDiff가 작을수록(=현실적일수록) 높은 점수
    const absDiff = Math.abs(primaryAdmission.cutoffGrade - convertedGrade);
    // 등급 근접도: 0에 가까울수록 높은 점수 (최대 20점)
    const proximityScore = Math.max(0, 20 - absDiff * 5);

    let relevanceScore = proximityScore;

    // 학과 매칭 보너스 (근접도보다 낮은 가중치)
    if (targetDepartment && entry.department.includes(targetDepartment)) {
      relevanceScore += 8;
    } else if (
      targetDepartment &&
      isSimilarDepartment(entry.department, targetDepartment)
    ) {
      relevanceScore += 4;
    }

    // 다양성을 위한 약간의 랜덤성 (같은 점수 내에서 순서 변경)
    relevanceScore += Math.random() * 2;

    scoredEntries.push({
      entry,
      admission: primaryAdmission,
      tierLabel,
      relevanceScore,
    });
  }

  // 4. 티어별 분류
  const grouped: Record<"상향" | "적정" | "안정" | "하향", ScoredEntry[]> = {
    상향: [],
    적정: [],
    안정: [],
    하향: [],
  };

  for (const scored of scoredEntries) {
    grouped[scored.tierLabel].push(scored);
  }

  // 5. 각 그룹 내에서 관련도 + 다양성 기준 정렬
  const sortByRelevance = (entries: ScoredEntry[]): ScoredEntry[] =>
    entries.sort((a, b) => b.relevanceScore - a.relevanceScore);

  for (const key of Object.keys(grouped) as Array<keyof typeof grouped>) {
    grouped[key] = sortByRelevance(grouped[key]);
  }

  // 6. 각 티어에서 필요한 수만큼 선택 (대학 중복 방지)
  const counts = CANDIDATE_COUNTS[plan];
  const result: UniversityCandidate[] = [];
  const selectedUniversities = new Set<string>();

  const selectFromGroup = (
    group: ScoredEntry[],
    tierLabel: "상향" | "적정" | "안정" | "하향",
    count: number
  ) => {
    let selected = 0;
    for (const scored of group) {
      if (selected >= count) break;

      // 같은 대학 중복 방지 (단, 학과가 다르면 허용)
      const key = `${scored.entry.university}-${scored.entry.department}`;
      if (selectedUniversities.has(key)) continue;

      // 같은 대학은 최대 2개 학과까지만
      const sameUnivCount = [...selectedUniversities].filter((k) =>
        k.startsWith(scored.entry.university)
      ).length;
      if (sameUnivCount >= 2) continue;

      selectedUniversities.add(key);

      result.push({
        university: scored.entry.university,
        department: scored.entry.department,
        admissionType: scored.admission.type,
        admissionTypeName: scored.admission.name,
        tier: tierLabel,
        cutoffGrade: scored.admission.cutoffGrade,
        cutoffGrade70: scored.admission.cutoffGrade70,
        competitionRate: scored.admission.competitionRate,
        enrollment: scored.admission.enrollment,
      });

      selected++;
    }
  };

  selectFromGroup(grouped["상향"], "상향", counts["상향"]);
  selectFromGroup(grouped["적정"], "적정", counts["적정"]);
  selectFromGroup(grouped["안정"], "안정", counts["안정"]);
  selectFromGroup(grouped["하향"], "하향", counts["하향"]);

  return result;
};
