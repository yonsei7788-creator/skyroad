import type { JeongsiReportStatus } from "@/app/admin/types";

/** Postgres "relation does not exist" — 마이그레이션 미적용 */
export const UNDEFINED_TABLE_CODE = "42P01";

export const JEONGSI_STATUSES: JeongsiReportStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed",
];

export interface InputSummary {
  target: string;
  region: string;
  risk: string;
  averagePercentile: number | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const numberAt = (value: unknown, key: string): number | null => {
  if (!isRecord(value)) return null;
  const found = value[key];
  return typeof found === "number" ? found : null;
};

/** 저장된 JeongsiInput 에서 목록에 보여줄 값만 꺼낸다 */
export const summarizeInput = (input: unknown): InputSummary => {
  const preference = isRecord(input) ? input.preference : null;
  const score = isRecord(input) ? input.score : null;
  const text = (key: string): string =>
    isRecord(preference) && typeof preference[key] === "string"
      ? (preference[key] as string)
      : "-";

  const korean = isRecord(score) ? numberAt(score.korean, "percentile") : null;
  const math = isRecord(score) ? numberAt(score.math, "percentile") : null;
  const inquiry1 = isRecord(score)
    ? numberAt(score.inquiry1, "percentile")
    : null;
  const inquiry2 = isRecord(score)
    ? numberAt(score.inquiry2, "percentile")
    : null;
  const averagePercentile =
    korean !== null && math !== null && inquiry1 !== null && inquiry2 !== null
      ? Math.round(((korean + math + (inquiry1 + inquiry2) / 2) / 3) * 10) / 10
      : null;

  return {
    target: text("target"),
    region: text("region"),
    risk: text("risk"),
    averagePercentile,
  };
};
