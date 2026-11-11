export type ReportStatus =
  | "ai_pending"
  | "review_pending"
  | "review_complete"
  | "delivered";

export interface AdminReport {
  id: string;
  userName: string | null;
  userEmail: string;
  planName: string;
  targetUniversity: string | null;
  status: ReportStatus;
  createdAt: string;
  aiGeneratedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  deliveredAt: string | null;
}

export type AiStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "deferred";

export interface ReportDetail extends AdminReport {
  orderId: string;
  content: unknown;
  reviewNotes: string | null;
  aiStatus: AiStatus;
  aiProgress: number;
  aiCurrentSection: string | null;
  aiError: string | null;
  aiRetryCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 정시 분석 리포트 생성 상태 (jeongsi_reports.ai_status) */
export type JeongsiReportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/** 어드민 정시 분석 목록의 한 행 */
export interface AdminJeongsiReport {
  id: string;
  createdAt: string;
  /** 생성한 관리자 이름 */
  createdBy: string | null;
  /** 희망 학과·계열 */
  target: string;
  region: string;
  risk: string;
  /** 국·수·탐(2과목 평균) 평균 백분위 */
  averagePercentile: number | null;
  status: JeongsiReportStatus;
  progress: number;
  error: string | null;
}

/** 어드민 정시 리포트 상세 (수정·PDF 화면) */
export interface AdminJeongsiReportDetail extends AdminJeongsiReport {
  updatedAt: string;
  /** libs/jeongsi/report-types.ts 의 JeongsiReportContent. 생성 전이면 null */
  content: unknown;
}
