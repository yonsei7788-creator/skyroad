import { Trash2 } from "lucide-react";

import type { GeneralSubjectRow } from "./types";

import styles from "../page.module.css";

interface GradeRowFormProps {
  row: GeneralSubjectRow;
  onChange: (
    id: string,
    field: keyof GeneralSubjectRow,
    value: unknown
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const YEAR_OPTIONS = [1, 2, 3] as const;
const SEMESTER_OPTIONS = [1, 2] as const;

export const GradeRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: GradeRowFormProps) => {
  const handleNumberChange = (
    field: keyof GeneralSubjectRow,
    value: string,
    isFloat = false
  ) => {
    if (value === "") {
      onChange(row.id, field, null);
      return;
    }
    const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
    if (!isNaN(parsed)) {
      onChange(row.id, field, parsed);
    }
  };

  return (
    <div className={styles.gradeRow}>
      <div className={styles.gradeRowFields}>
        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>학년</label>
          <select
            className={styles.gradeRowSelect}
            value={row.year}
            onChange={(e) =>
              onChange(row.id, "year", parseInt(e.target.value, 10))
            }
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}학년
              </option>
            ))}
          </select>
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>학기</label>
          <select
            className={styles.gradeRowSelect}
            value={row.semester}
            onChange={(e) =>
              onChange(row.id, "semester", parseInt(e.target.value, 10))
            }
          >
            {SEMESTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}학기
              </option>
            ))}
          </select>
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>교과</label>
          <input
            type="text"
            className={styles.gradeRowInput}
            placeholder="교과명"
            value={row.category}
            onChange={(e) => onChange(row.id, "category", e.target.value)}
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>과목</label>
          <input
            type="text"
            className={styles.gradeRowInput}
            placeholder="과목명"
            value={row.subject}
            onChange={(e) => onChange(row.id, "subject", e.target.value)}
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>단위수</label>
          <input
            type="number"
            className={styles.gradeRowInput}
            placeholder="0"
            min={0}
            value={row.credits ?? ""}
            onChange={(e) => handleNumberChange("credits", e.target.value)}
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>원점수</label>
          <input
            type="number"
            className={styles.gradeRowInput}
            placeholder="0~100"
            min={0}
            max={100}
            value={row.rawScore ?? ""}
            onChange={(e) => handleNumberChange("rawScore", e.target.value)}
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>평균</label>
          <input
            type="number"
            className={styles.gradeRowInput}
            placeholder="0~100"
            step="0.1"
            min={0}
            max={100}
            value={row.average ?? ""}
            onChange={(e) =>
              handleNumberChange("average", e.target.value, true)
            }
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>표준편차</label>
          <input
            type="number"
            className={styles.gradeRowInput}
            placeholder="0~"
            step="0.01"
            min={0}
            value={row.standardDeviation ?? ""}
            onChange={(e) =>
              handleNumberChange("standardDeviation", e.target.value, true)
            }
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>성취도</label>
          <select
            className={styles.gradeRowSelect}
            value={row.achievement}
            onChange={(e) => onChange(row.id, "achievement", e.target.value)}
          >
            <option value="">-</option>
            {["A", "B", "C", "D", "E"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>수강자수</label>
          <input
            type="number"
            className={styles.gradeRowInput}
            placeholder="0"
            min={0}
            value={row.studentCount ?? ""}
            onChange={(e) => handleNumberChange("studentCount", e.target.value)}
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>석차등급</label>
          <input
            type="number"
            className={styles.gradeRowInput}
            placeholder="1~9"
            min={1}
            max={9}
            value={row.gradeRank ?? ""}
            onChange={(e) => handleNumberChange("gradeRank", e.target.value)}
          />
        </div>

        <div className={styles.gradeRowField}>
          <label className={styles.gradeRowLabel}>비고</label>
          <input
            type="text"
            className={styles.gradeRowInput}
            placeholder="예: 공동, 타기관"
            value={row.note}
            onChange={(e) => onChange(row.id, "note", e.target.value)}
          />
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          className={styles.gradeRowRemove}
          onClick={() => onRemove(row.id)}
          aria-label="행 삭제"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};
