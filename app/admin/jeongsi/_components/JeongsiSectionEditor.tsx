"use client";

import { useState } from "react";

import { listEditableFields, setAtPath } from "@/libs/jeongsi/admin-edit";
import type { EditableField } from "@/libs/jeongsi/admin-edit";
import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";

import styles from "../../reports/_components/ReportContentEditor.module.css";
import ownStyles from "../jeongsi-admin.module.css";

interface JeongsiSectionEditorProps {
  content: JeongsiReportContent;
  sectionIndex: number;
  onChange: (content: JeongsiReportContent) => void;
}

interface EditableTextareaProps {
  field: EditableField;
  onCommit: (field: EditableField, value: string) => void;
}

/** 입력 중에는 로컬 상태만 바꾸고, 포커스가 빠질 때 리포트에 반영한다 */
const EditableTextarea = ({ field, onCommit }: EditableTextareaProps) => {
  const [draft, setDraft] = useState(field.value);
  const isEmpty = draft.trim().length === 0;

  const handleBlur = () => {
    if (draft !== field.value) {
      onCommit(field, draft);
    }
  };

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>{field.label}</label>
      <textarea
        className={styles.fieldTextarea}
        value={draft}
        rows={Math.min(8, Math.max(2, Math.ceil(draft.length / 60)))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
      />
      {isEmpty && (
        <span className={ownStyles.fieldError}>
          비어 있으면 저장할 수 없습니다.
        </span>
      )}
    </div>
  );
};

/**
 * 정시 리포트 섹션 하나의 문장 편집기.
 *
 * 수정 가능한 필드는 libs/jeongsi/admin-edit.ts 가 정한다.
 * 점수·컷·격차 같은 숫자는 원천 데이터로 계산한 값이라 여기 나오지 않는다.
 */
export const JeongsiSectionEditor = ({
  content,
  sectionIndex,
  onChange,
}: JeongsiSectionEditorProps) => {
  const section = content.sections[sectionIndex];
  if (!section) return null;

  const fields = listEditableFields(section, sectionIndex);
  const groups = fields.reduce<Map<string, EditableField[]>>(
    (acc, field) =>
      acc.set(field.group, [...(acc.get(field.group) ?? []), field]),
    new Map()
  );

  const handleCommit = (field: EditableField, value: string) => {
    onChange(setAtPath(content, field.path, value));
  };

  if (fields.length === 0) {
    return (
      <p className={ownStyles.editorHint}>
        이 섹션에는 수정할 문장이 없습니다.
      </p>
    );
  }

  return (
    <div className={styles.editor}>
      <p className={ownStyles.editorHint}>
        문장만 수정할 수 있습니다. 점수·기준컷·격차 같은 숫자는 원천 데이터로
        계산한 값이라 바꿀 수 없습니다.
      </p>
      {[...groups.entries()].map(([group, groupFields]) => (
        <div key={group} className={styles.subSection}>
          <div className={styles.subSectionHeader}>
            {group}
            <span className={styles.subSectionCount}>
              {groupFields.length}개
            </span>
          </div>
          {groupFields.map((field) => (
            <EditableTextarea
              key={field.path.join(".")}
              field={field}
              onCommit={handleCommit}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
