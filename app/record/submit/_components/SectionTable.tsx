"use client";

import { Fragment, useState, type ComponentType } from "react";
import { ChevronDown, Plus, X } from "lucide-react";

import type { SchoolRecord } from "./types";
import { REQUIRED_SECTION_KEYS } from "./types";
import { TableSelect } from "./TableSelect";

import styles from "../page.module.css";

// ============================================
// Column Definition
// ============================================

export interface ColumnDef<T> {
  key: keyof T & string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  width?: string;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  step?: string;
  isFloat?: boolean;
  /** 같은 group 값을 가진 컬럼은 2단 헤더로 그룹핑 */
  group?: string;
}

// ============================================
// Section / Accordion Step Definitions
// ============================================

export interface CustomSectionProps {
  title: string;
  addLabel: string;
  record: SchoolRecord;
  onRecordChange: (record: SchoolRecord) => void;
}

export interface SectionDef {
  key: keyof SchoolRecord;
  title: string;
  addLabel: string;
  columns?: ColumnDef<Record<string, unknown>>[];

  createEmpty?: () => any;
  customRender?: ComponentType<CustomSectionProps>;
}

export interface AccordionStepDef {
  stepNumber: number;
  title: string;
  sections: SectionDef[];
}

// ============================================
// Helpers
// ============================================

const parseNum = (value: string, isFloat = false): number | null => {
  if (value === "") return null;
  const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

// ============================================
// CellRenderer
// ============================================

interface CellRendererProps {
  column: ColumnDef<Record<string, unknown>>;
  value: unknown;
  onChange: (value: unknown) => void;
}

const CellRenderer = ({ column, value, onChange }: CellRendererProps) => {
  switch (column.type) {
    case "select":
      return (
        <TableSelect
          value={value as string | number}
          options={column.options ?? []}
          onChange={(v) => {
            const isNum = column.options?.some(
              (o) => typeof o.value === "number"
            );
            onChange(isNum ? parseInt(String(v), 10) : v);
          }}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className={styles.tableInput}
          placeholder={column.placeholder ?? ""}
          min={column.min}
          max={column.max}
          step={column.step}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(parseNum(e.target.value, column.isFloat))}
        />
      );
    case "textarea":
      return (
        <textarea
          className={styles.tableTextarea}
          placeholder={column.placeholder ?? ""}
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          type="text"
          className={styles.tableInput}
          placeholder={column.placeholder ?? ""}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
};

// ============================================
// TableHead (supports grouped 2-row headers)
// ============================================

interface HeaderEntry {
  type: "standalone" | "group";
  label: string;
  colSpan: number;
  key: string;
  width?: string;
}

const buildHeaderRows = (
  cols: ColumnDef<Record<string, unknown>>[]
): {
  topRow: HeaderEntry[];
  bottomRow: ColumnDef<Record<string, unknown>>[];
} | null => {
  const hasGroups = cols.some((c) => c.group);
  if (!hasGroups) return null;

  const topRow: HeaderEntry[] = [];
  const bottomRow: ColumnDef<Record<string, unknown>>[] = [];

  let i = 0;
  while (i < cols.length) {
    const col = cols[i];
    if (!col.group) {
      topRow.push({
        type: "standalone",
        label: col.label,
        colSpan: 1,
        key: col.key,
        width: col.width,
      });
      i++;
    } else {
      const groupName = col.group;
      let count = 0;
      while (i + count < cols.length && cols[i + count].group === groupName) {
        bottomRow.push(cols[i + count]);
        count++;
      }
      topRow.push({
        type: "group",
        label: groupName,
        colSpan: count,
        key: `group-${groupName}`,
      });
      i += count;
    }
  }
  return { topRow, bottomRow };
};

const TableHead = ({
  inlineColumns,
}: {
  inlineColumns: ColumnDef<Record<string, unknown>>[];
}) => {
  const grouped = buildHeaderRows(inlineColumns);

  if (!grouped) {
    return (
      <thead>
        <tr>
          {inlineColumns.map((col) => (
            <th
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
            >
              {col.label}
            </th>
          ))}
          <th className={styles.tableThAction} />
        </tr>
      </thead>
    );
  }

  const { topRow, bottomRow } = grouped;

  return (
    <thead>
      <tr>
        {topRow.map((entry) =>
          entry.type === "standalone" ? (
            <th
              key={entry.key}
              rowSpan={2}
              style={entry.width ? { width: entry.width } : undefined}
            >
              {entry.label}
            </th>
          ) : (
            <th key={entry.key} colSpan={entry.colSpan}>
              {entry.label}
            </th>
          )
        )}
        <th className={styles.tableThAction} rowSpan={2} />
      </tr>
      <tr>
        {bottomRow.map((col) => (
          <th
            key={col.key}
            style={col.width ? { width: col.width } : undefined}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
};

// ============================================
// SectionTable
// ============================================

interface SectionTableProps {
  title: string;
  columns: ColumnDef<Record<string, unknown>>[];
  rows: Record<string, unknown>[];
  addLabel: string;
  onAdd: () => void;
  onChange: (id: string, field: string, value: unknown) => void;
  onRemove: (id: string) => void;
  isRequired?: boolean;
}

export const SectionTable = ({
  title,
  columns,
  rows,
  addLabel,
  onAdd,
  onChange,
  onRemove,
  isRequired,
}: SectionTableProps) => {
  const inlineColumns = columns.filter((c) => c.type !== "textarea");
  const textareaColumns = columns.filter((c) => c.type === "textarea");

  return (
    <div className={styles.sectionTableWrap}>
      <div className={styles.sectionTableHeader}>
        <h4 className={styles.sectionTableTitle}>
          {isRequired && <span className={styles.requiredDot} />}
          {title}
        </h4>
        <span className={styles.sectionTableCount}>{rows.length}건</span>
      </div>

      {rows.length === 0 ? (
        <p className={styles.sectionTableEmpty}>
          아직 데이터가 없습니다. 아래 버튼으로 추가하세요.
        </p>
      ) : (
        <div className={styles.tableScrollWrap}>
          <table className={styles.sectionTable}>
            <TableHead inlineColumns={inlineColumns} />
            <tbody>
              {rows.map((row) => (
                <Fragment key={String(row.id)}>
                  <tr>
                    {inlineColumns.map((col) => (
                      <td key={col.key}>
                        <CellRenderer
                          column={col}
                          value={row[col.key]}
                          onChange={(val) =>
                            onChange(String(row.id), col.key, val)
                          }
                        />
                      </td>
                    ))}
                    <td className={styles.tableTdAction}>
                      <button
                        type="button"
                        className={styles.tableRemoveBtn}
                        onClick={() => onRemove(String(row.id))}
                        aria-label="삭제"
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                  {textareaColumns.map((col) => (
                    <tr
                      key={`${String(row.id)}-${col.key}`}
                      className={styles.tableTextareaRow}
                    >
                      <td colSpan={inlineColumns.length + 1}>
                        <div className={styles.tableTextareaCell}>
                          <span className={styles.tableTextareaLabel}>
                            {col.label}
                          </span>
                          <CellRenderer
                            column={col}
                            value={row[col.key]}
                            onChange={(val) =>
                              onChange(String(row.id), col.key, val)
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className={styles.addRowButton} onClick={onAdd}>
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  );
};

// ============================================
// AccordionStep
// ============================================

interface AccordionStepProps {
  step: AccordionStepDef;
  record: SchoolRecord;
  onRecordChange: (record: SchoolRecord) => void;
  defaultOpen?: boolean;
  errorKeys?: Set<keyof SchoolRecord>;
}

export const AccordionStep = ({
  step,
  record,
  onRecordChange,
  defaultOpen = false,
  errorKeys,
}: AccordionStepProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const totalRows = step.sections.reduce((acc, s) => {
    const rows = record[s.key];
    return acc + (Array.isArray(rows) ? rows.length : 0);
  }, 0);

  const handleChange = (
    sectionKey: keyof SchoolRecord,
    id: string,
    field: string,
    value: unknown
  ) => {
    const rows = record[sectionKey] as unknown as Record<string, unknown>[];
    const updated = rows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    onRecordChange({ ...record, [sectionKey]: updated });
  };

  const handleRemove = (sectionKey: keyof SchoolRecord, id: string) => {
    const rows = record[sectionKey] as unknown as Record<string, unknown>[];
    onRecordChange({
      ...record,
      [sectionKey]: rows.filter((r) => r.id !== id),
    });
  };

  const handleAdd = (
    sectionKey: keyof SchoolRecord,

    createEmpty: () => any
  ) => {
    const current = record[sectionKey] as unknown as Record<string, unknown>[];
    onRecordChange({
      ...record,
      [sectionKey]: [...current, createEmpty()],
    });
  };

  const hasRequired = step.sections.some((s) =>
    REQUIRED_SECTION_KEYS.has(s.key)
  );
  const hasError = errorKeys && step.sections.some((s) => errorKeys.has(s.key));

  return (
    <div
      className={`${styles.accordion} ${isOpen ? styles.accordionOpen : ""} ${hasError ? styles.accordionError : ""}`}
    >
      <button
        type="button"
        className={styles.accordionTrigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.accordionStepBadge}>
          STEP {String(step.stepNumber).padStart(2, "0")}
        </span>
        <span className={styles.accordionTitle}>{step.title}</span>
        {hasRequired && <span className={styles.requiredBadge}>필수</span>}
        {totalRows > 0 && (
          <span className={styles.accordionCount}>{totalRows}</span>
        )}
        <ChevronDown
          size={18}
          className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ""}`}
        />
      </button>

      {isOpen && (
        <div className={styles.accordionContent}>
          {step.sections.map((section) => {
            const isRequired = REQUIRED_SECTION_KEYS.has(section.key);
            const isSectionError = errorKeys?.has(section.key);
            const Custom = section.customRender;
            if (Custom) {
              return (
                <div
                  key={section.key}
                  className={
                    isSectionError ? styles.sectionErrorHighlight : undefined
                  }
                >
                  <Custom
                    title={section.title}
                    addLabel={section.addLabel}
                    record={record}
                    onRecordChange={onRecordChange}
                  />
                  {isRequired && <span className={styles.sectionRequiredDot} />}
                </div>
              );
            }
            return (
              <div
                key={section.key}
                className={
                  isSectionError ? styles.sectionErrorHighlight : undefined
                }
              >
                <SectionTable
                  title={section.title}
                  columns={section.columns ?? []}
                  rows={
                    record[section.key] as unknown as Record<string, unknown>[]
                  }
                  addLabel={section.addLabel}
                  onAdd={() =>
                    handleAdd(section.key, section.createEmpty ?? (() => ({})))
                  }
                  onChange={(id, field, value) =>
                    handleChange(section.key, id, field, value)
                  }
                  onRemove={(id) => handleRemove(section.key, id)}
                  isRequired={isRequired}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
