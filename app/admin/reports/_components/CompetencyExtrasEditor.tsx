"use client";

import { useState } from "react";

import styles from "./ReportContentEditor.module.css";

// ============================================================
// 역량 점수 섹션 전용 검수 에디터 (신규 리포트 v5+ 필드)
//
// 제네릭 FieldRenderer는 숫자를 항상 읽기전용으로 처리하고
// readonly 판정이 키 이름 기준(score/maxScore 충돌)이라
// competencyAxes / competencyHighlights는 별도 에디터로 편집한다.
//
// - 축 점수 편집 시 강점(최고)/보완(최저) 축을 파이프라인과 동일 규칙으로 재계산
// - 강점/보완 항목 점수 편집 시 gap(향상 여지 = maxScore - score) 자동 재계산
// ============================================================

interface AxisItem {
  key?: string;
  label?: string;
  score?: number;
  isStrength?: boolean;
  isWeakness?: boolean;
}

interface HighlightItem {
  name?: string;
  categoryLabel?: string;
  score?: number;
  maxScore?: number;
  gap?: number;
  reason?: string;
}

interface CompetencyExtras {
  competencyAxes?: AxisItem[];
  competencyHighlights?: {
    strengths?: HighlightItem[];
    improvements?: HighlightItem[];
  };
}

interface CompetencyExtrasEditorProps {
  content: Record<string, unknown>;
  sectionIndex: number;
  onChange: (updatedContent: Record<string, unknown>) => void;
}

// ── blur 시점에 커밋하는 입력 컴포넌트 (제네릭 에디터와 동일 UX) ──

const TextInput = ({
  value,
  long,
  onCommit,
}: {
  value: string;
  long?: boolean;
  onCommit: (v: string) => void;
}) => {
  const [local, setLocal] = useState(value);
  const handleBlur = () => {
    if (local !== value) onCommit(local);
  };
  if (long) {
    return (
      <textarea
        className={styles.fieldTextarea}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        rows={Math.min(6, Math.max(2, Math.ceil((local.length || 1) / 60)))}
      />
    );
  }
  return (
    <input
      type="text"
      className={styles.fieldInput}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

const NumberInput = ({
  value,
  min,
  max,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) => {
  const [local, setLocal] = useState(String(value));
  const handleBlur = () => {
    const parsed = Math.round(Number(local));
    const clamped = Number.isFinite(parsed)
      ? Math.max(min, Math.min(max, parsed))
      : value;
    setLocal(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return (
    <input
      type="number"
      className={styles.fieldInput}
      value={local}
      min={min}
      max={max}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

// ── 강점/보완 축 재계산 (buildCompetencyAxes와 동일 규칙) ──
const recomputeAxisFlags = (axes: AxisItem[]): void => {
  if (axes.length === 0) return;
  let maxIdx = 0;
  let minIdx = 0;
  axes.forEach((a, i) => {
    if ((a.score ?? 0) > (axes[maxIdx].score ?? 0)) maxIdx = i;
    if ((a.score ?? 0) < (axes[minIdx].score ?? 0)) minIdx = i;
  });
  axes.forEach((a) => {
    delete a.isStrength;
    delete a.isWeakness;
  });
  if (maxIdx !== minIdx) {
    axes[maxIdx].isStrength = true;
    axes[minIdx].isWeakness = true;
  }
};

export const CompetencyExtrasEditor = ({
  content,
  sectionIndex,
  onChange,
}: CompetencyExtrasEditorProps) => {
  const sections = content.sections as Record<string, unknown>[] | undefined;
  const section = sections?.[sectionIndex] as
    | (Record<string, unknown> & CompetencyExtras)
    | undefined;

  const axes = section?.competencyAxes;
  const highlights = section?.competencyHighlights;
  const hasAxes = Array.isArray(axes) && axes.length > 0;
  const hasHighlights =
    !!highlights &&
    ((highlights.strengths?.length ?? 0) > 0 ||
      (highlights.improvements?.length ?? 0) > 0);

  // 신규 리포트가 아니면(필드 없음) 아무것도 렌더하지 않음
  if (!hasAxes && !hasHighlights) return null;

  // 섹션을 복제·수정한 뒤 onChange 호출
  const mutate = (
    fn: (s: Record<string, unknown> & CompetencyExtras) => void
  ) => {
    const next = structuredClone(content);
    const nextSection = (next.sections as Record<string, unknown>[])[
      sectionIndex
    ] as Record<string, unknown> & CompetencyExtras;
    fn(nextSection);
    onChange(next);
  };

  const handleAxis = (
    index: number,
    field: "label" | "score",
    value: string | number
  ) => {
    mutate((s) => {
      const list = s.competencyAxes;
      if (!list?.[index]) return;
      if (field === "score") {
        list[index].score = value as number;
        recomputeAxisFlags(list);
      } else {
        list[index].label = value as string;
      }
    });
  };

  const handleHighlight = (
    group: "strengths" | "improvements",
    index: number,
    field: keyof HighlightItem,
    value: string | number
  ) => {
    mutate((s) => {
      const item = s.competencyHighlights?.[group]?.[index];
      if (!item) return;
      (item[field] as string | number) = value;
      if (field === "score" || field === "maxScore") {
        item.gap = Math.max(0, (item.maxScore ?? 0) - (item.score ?? 0));
      }
    });
  };

  const renderHighlightGroup = (
    group: "strengths" | "improvements",
    label: string,
    items: HighlightItem[]
  ) => (
    <div className={styles.fieldGroup}>
      <div className={styles.subSectionHeader}>
        {label}
        <span className={styles.subSectionCount}>({items.length}개)</span>
      </div>
      <div className={styles.arrayItemsContainer}>
        {items.map((item, index) => (
          <div key={`${group}-${index}`} className={styles.arrayItem}>
            <div className={styles.arrayItemBody}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>항목명</label>
                <TextInput
                  value={item.name ?? ""}
                  onCommit={(v) => handleHighlight(group, index, "name", v)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>소속 역량</label>
                <TextInput
                  value={item.categoryLabel ?? ""}
                  onCommit={(v) =>
                    handleHighlight(group, index, "categoryLabel", v)
                  }
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>점수</label>
                <NumberInput
                  value={item.score ?? 0}
                  min={0}
                  max={item.maxScore ?? 100}
                  onCommit={(v) => handleHighlight(group, index, "score", v)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>만점</label>
                <NumberInput
                  value={item.maxScore ?? 0}
                  min={0}
                  max={1000}
                  onCommit={(v) => handleHighlight(group, index, "maxScore", v)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  향상 여지(자동 계산)
                </label>
                <div className={styles.fieldReadonly}>+{item.gap ?? 0}점</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>근거/사유</label>
                <TextInput
                  value={item.reason ?? ""}
                  long
                  onCommit={(v) => handleHighlight(group, index, "reason", v)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {hasAxes && (
        <div className={styles.fieldGroup}>
          <div className={styles.subSectionHeader}>
            역량 5축 레이더
            <span className={styles.subSectionCount}>
              (점수 변경 시 강점·보완 축 자동 갱신)
            </span>
          </div>
          <div className={styles.arrayItemsContainer}>
            {axes!.map((axis, index) => (
              <div key={axis.key ?? index} className={styles.arrayItem}>
                <div className={styles.arrayItemBody}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      축 이름
                      {axis.isStrength ? " · 강점" : ""}
                      {axis.isWeakness ? " · 보완" : ""}
                    </label>
                    <TextInput
                      value={axis.label ?? ""}
                      onCommit={(v) => handleAxis(index, "label", v)}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>점수 (0~100)</label>
                    <NumberInput
                      value={axis.score ?? 0}
                      min={0}
                      max={100}
                      onCommit={(v) => handleAxis(index, "score", v)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {highlights?.strengths &&
        highlights.strengths.length > 0 &&
        renderHighlightGroup("strengths", "강점 항목", highlights.strengths)}

      {highlights?.improvements &&
        highlights.improvements.length > 0 &&
        renderHighlightGroup(
          "improvements",
          "보완하면 향상되는 항목",
          highlights.improvements
        )}
    </>
  );
};
