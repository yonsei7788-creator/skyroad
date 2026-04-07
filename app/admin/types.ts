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

export type AiStatus = "pending" | "processing" | "completed" | "failed";

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
