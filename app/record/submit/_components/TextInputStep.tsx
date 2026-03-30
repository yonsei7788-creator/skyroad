import { Fragment } from "react";
import { AlertCircle, Check, Plus, X } from "lucide-react";

import { AccordionStep } from "./SectionTable";
import type {
  AccordionStepDef,
  ColumnDef,
  CustomSectionProps,
} from "./SectionTable";
import { TableSelect } from "./TableSelect";
import type {
  SchoolRecord,
  CreativeActivityRow,
  CreativeActivityArea,
  ValidationError,
} from "./types";
import { REQUIRED_FIELD_RULES, REQUIRED_SECTION_KEYS } from "./types";
import {
  createEmptyAttendanceRow,
  createEmptyAwardRow,
  createEmptyCertificationRow,
  createEmptyVolunteerRow,
  createEmptyGeneralSubjectRow,
  createEmptyCareerSubjectRow,
  createEmptyArtsPhysicalSubjectRow,
  createEmptySubjectEvaluationRow,
  createEmptyReadingActivityRow,
  createEmptyBehavioralAssessmentRow,
  createEmptyMockExamRow,
} from "./types";

import styles from "../page.module.css";

// ============================================
// 공통 옵션
// ============================================

const YEAR_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
];

const SEMESTER_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
];

const ACHIEVEMENT_5 = [
  { value: "", label: "-" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
];

const ACHIEVEMENT_3 = [
  { value: "", label: "-" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
];

const ACHIEVEMENT_AP = [
  { value: "", label: "-" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "P", label: "P" },
];

const CREATIVE_AREAS: CreativeActivityArea[] = [
  "자율활동",
  "동아리활동",
  "진로활동",
];

// ============================================
// ColumnDef per section
// ============================================

const attendanceColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "62px",
  },
  {
    key: "totalDays",
    label: "수업일수",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "62px",
  },
  {
    key: "absenceIllness",
    label: "질병",
    group: "결석일수",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "absenceUnauthorized",
    label: "미인정",
    group: "결석일수",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "absenceOther",
    label: "기타",
    group: "결석일수",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "latenessIllness",
    label: "질병",
    group: "지각",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "latenessUnauthorized",
    label: "미인정",
    group: "지각",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "latenessOther",
    label: "기타",
    group: "지각",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "earlyLeaveIllness",
    label: "질병",
    group: "조퇴",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "earlyLeaveUnauthorized",
    label: "미인정",
    group: "조퇴",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "earlyLeaveOther",
    label: "기타",
    group: "조퇴",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "classMissedIllness",
    label: "질병",
    group: "결과",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "classMissedUnauthorized",
    label: "미인정",
    group: "결과",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "classMissedOther",
    label: "기타",
    group: "결과",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "36px",
  },
  {
    key: "note",
    label: "특기사항",
    type: "text",
    placeholder: "특기사항",
  },
];

const awardColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "semester",
    label: "학기",
    type: "select",
    options: SEMESTER_OPTIONS,
    width: "54px",
  },
  {
    key: "name",
    label: "수상명",
    type: "text",
    placeholder: "수상명",
  },
  {
    key: "rank",
    label: "등급(위)",
    type: "text",
    placeholder: "금상, 1위 등",
    width: "72px",
  },
  {
    key: "date",
    label: "수상연월일",
    type: "text",
    placeholder: "YYYY.MM.DD",
    width: "90px",
  },
  {
    key: "organization",
    label: "수여기관",
    type: "text",
    placeholder: "수여기관",
    width: "80px",
  },
  {
    key: "participants",
    label: "참가대상(인원)",
    type: "text",
    placeholder: "1학년 전체(357명)",
  },
];

const certificationColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "category",
    label: "구분",
    type: "text",
    placeholder: "자격증/인증",
    width: "80px",
  },
  {
    key: "name",
    label: "명칭/종류",
    type: "text",
    placeholder: "명칭",
  },
  {
    key: "details",
    label: "번호/내용",
    type: "text",
    placeholder: "번호 또는 내용",
  },
  {
    key: "date",
    label: "취득연월일",
    type: "text",
    placeholder: "YYYY.MM.DD",
    width: "90px",
  },
  {
    key: "issuer",
    label: "발급기관",
    type: "text",
    placeholder: "발급기관",
    width: "80px",
  },
];

// ============================================
// 창의적 체험활동 커스텀 섹션
// ============================================

const parseNum = (value: string): number | null => {
  if (value === "") return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

const groupCreativeActivities = (
  rows: CreativeActivityRow[]
): CreativeActivityRow[][] => {
  const yearMap = new Map<number, CreativeActivityRow[]>();
  const yearOrder: number[] = [];

  for (const row of rows) {
    if (!yearMap.has(row.year)) {
      yearMap.set(row.year, []);
      yearOrder.push(row.year);
    }
    yearMap.get(row.year)!.push(row);
  }

  const areaOrder: string[] = [...CREATIVE_AREAS];
  return yearOrder.map((year) => {
    const group = yearMap.get(year)!;
    return [...group].sort(
      (a, b) => areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area)
    );
  });
};

const CreativeActivitySection = ({
  title,
  addLabel,
  record,
  onRecordChange,
}: CustomSectionProps) => {
  const rows = record.creativeActivities;
  const groups = groupCreativeActivities(rows);

  const handleFieldChange = (id: string, field: string, value: unknown) => {
    onRecordChange({
      ...record,
      creativeActivities: rows.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  const handleYearChange = (groupIds: string[], newYear: number) => {
    onRecordChange({
      ...record,
      creativeActivities: rows.map((r) =>
        groupIds.includes(r.id) ? { ...r, year: newYear } : r
      ),
    });
  };

  const handleAddGroup = () => {
    const usedYears = new Set(rows.map((r) => r.year));
    let nextYear = 1;
    while (usedYears.has(nextYear) && nextYear <= 3) nextYear++;
    if (nextYear > 3) nextYear = 1;

    const newRows: CreativeActivityRow[] = CREATIVE_AREAS.map((area) => ({
      id: crypto.randomUUID(),
      year: nextYear,
      area,
      hours: null,
      note: "",
    }));
    onRecordChange({
      ...record,
      creativeActivities: [...rows, ...newRows],
    });
  };

  const handleRemoveGroup = (groupIds: string[]) => {
    onRecordChange({
      ...record,
      creativeActivities: rows.filter((r) => !groupIds.includes(r.id)),
    });
  };

  return (
    <div className={styles.sectionTableWrap}>
      <div className={styles.sectionTableHeader}>
        <h4 className={styles.sectionTableTitle}>{title}</h4>
        <span className={styles.sectionTableCount}>{groups.length}개 학년</span>
      </div>

      {groups.length === 0 ? (
        <p className={styles.sectionTableEmpty}>
          아직 데이터가 없습니다. 아래 버튼으로 추가하세요.
        </p>
      ) : (
        <div className={styles.tableScrollWrap}>
          <table className={styles.sectionTable}>
            <thead>
              <tr>
                <th style={{ width: "62px" }}>학년</th>
                <th style={{ width: "80px" }}>영역</th>
                <th style={{ width: "52px" }}>시간</th>
                <th>특기사항</th>
                <th className={styles.tableThAction} />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const groupIds = group.map((r) => r.id);
                const year = group[0]?.year ?? 1;

                return (
                  <Fragment key={groupIds[0]}>
                    {group.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={
                          idx === group.length - 1
                            ? styles.creativeGroupLastRow
                            : styles.creativeGroupRow
                        }
                      >
                        {idx === 0 && (
                          <td
                            rowSpan={group.length}
                            className={styles.creativeYearCell}
                          >
                            <TableSelect
                              value={year}
                              options={YEAR_OPTIONS}
                              onChange={(v) =>
                                handleYearChange(groupIds, Number(v))
                              }
                            />
                          </td>
                        )}
                        <td>
                          <span className={styles.creativeAreaLabel}>
                            {row.area}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.tableInput}
                            placeholder="0"
                            min={0}
                            value={row.hours ?? ""}
                            onChange={(e) =>
                              handleFieldChange(
                                row.id,
                                "hours",
                                parseNum(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td>
                          <textarea
                            className={styles.tableTextarea}
                            placeholder="특기사항을 입력하세요"
                            rows={2}
                            value={row.note}
                            onChange={(e) =>
                              handleFieldChange(row.id, "note", e.target.value)
                            }
                          />
                        </td>
                        {idx === 0 && (
                          <td
                            rowSpan={group.length}
                            className={styles.tableTdAction}
                            style={{ verticalAlign: "middle" }}
                          >
                            <button
                              type="button"
                              className={styles.tableRemoveBtn}
                              onClick={() => handleRemoveGroup(groupIds)}
                              aria-label="학년 삭제"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        className={styles.addRowButton}
        onClick={handleAddGroup}
      >
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  );
};

const volunteerColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "dateRange",
    label: "일자/기간",
    type: "text",
    placeholder: "YYYY.MM.DD",
    width: "90px",
  },
  {
    key: "place",
    label: "장소/기관",
    type: "text",
    placeholder: "장소 또는 주관기관",
  },
  {
    key: "content",
    label: "활동내용",
    type: "text",
    placeholder: "활동내용",
  },
  {
    key: "hours",
    label: "시간",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "52px",
  },
];

const generalSubjectColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "semester",
    label: "학기",
    type: "select",
    options: SEMESTER_OPTIONS,
    width: "54px",
  },
  {
    key: "category",
    label: "교과",
    type: "text",
    placeholder: "교과명",
    width: "72px",
  },
  {
    key: "subject",
    label: "과목",
    type: "text",
    placeholder: "과목명",
    width: "80px",
  },
  {
    key: "credits",
    label: "단위",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "48px",
  },
  {
    key: "rawScore",
    label: "원점수",
    type: "number",
    placeholder: "0",
    min: 0,
    max: 100,
    width: "52px",
  },
  {
    key: "average",
    label: "평균",
    type: "number",
    placeholder: "0",
    min: 0,
    max: 100,
    step: "0.1",
    isFloat: true,
    width: "52px",
  },
  {
    key: "standardDeviation",
    label: "표준편차",
    type: "number",
    placeholder: "0",
    min: 0,
    step: "0.01",
    isFloat: true,
    width: "56px",
  },
  {
    key: "achievement",
    label: "성취도",
    type: "select",
    options: ACHIEVEMENT_5,
    width: "54px",
  },
  {
    key: "studentCount",
    label: "수강자수",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "56px",
  },
  {
    key: "gradeRank",
    label: "등급",
    type: "number",
    placeholder: "1~9",
    min: 1,
    max: 9,
    width: "48px",
  },
  {
    key: "note",
    label: "비고",
    type: "text",
    placeholder: "공동, 타기관",
    width: "80px",
  },
];

const careerSubjectColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "semester",
    label: "학기",
    type: "select",
    options: SEMESTER_OPTIONS,
    width: "54px",
  },
  {
    key: "category",
    label: "교과",
    type: "text",
    placeholder: "교과명",
    width: "72px",
  },
  {
    key: "subject",
    label: "과목",
    type: "text",
    placeholder: "과목명",
    width: "80px",
  },
  {
    key: "credits",
    label: "단위",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "48px",
  },
  {
    key: "rawScore",
    label: "원점수",
    type: "number",
    placeholder: "0",
    min: 0,
    max: 100,
    width: "52px",
  },
  {
    key: "average",
    label: "평균",
    type: "number",
    placeholder: "0",
    min: 0,
    max: 100,
    step: "0.1",
    isFloat: true,
    width: "52px",
  },
  {
    key: "achievement",
    label: "성취도",
    type: "select",
    options: ACHIEVEMENT_3,
    width: "54px",
  },
  {
    key: "studentCount",
    label: "수강자수",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "56px",
  },
  {
    key: "achievementDistribution",
    label: "분포비율",
    type: "text",
    placeholder: "40%|35.1|24.9",
    width: "100px",
  },
  {
    key: "note",
    label: "비고",
    type: "text",
    placeholder: "공동, 타기관",
    width: "80px",
  },
];

const artsPhysicalColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "semester",
    label: "학기",
    type: "select",
    options: SEMESTER_OPTIONS,
    width: "54px",
  },
  {
    key: "category",
    label: "교과",
    type: "text",
    placeholder: "체육/예술",
    width: "72px",
  },
  {
    key: "subject",
    label: "과목",
    type: "text",
    placeholder: "과목명",
    width: "80px",
  },
  {
    key: "credits",
    label: "단위",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "48px",
  },
  {
    key: "achievement",
    label: "성취도",
    type: "select",
    options: ACHIEVEMENT_AP,
    width: "54px",
  },
];

const subjectEvaluationColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "subject",
    label: "과목",
    type: "text",
    placeholder: "과목명",
    width: "100px",
  },
  {
    key: "evaluation",
    label: "세부능력 및 특기사항",
    type: "textarea",
    placeholder: "교사 서술형 평가를 입력하세요",
  },
];

const readingActivityColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "subjectOrArea",
    label: "과목/영역",
    type: "text",
    placeholder: "과목 또는 영역 (선택)",
    width: "100px",
  },
  {
    key: "content",
    label: "독서활동상황",
    type: "textarea",
    placeholder: "도서목록을 입력하세요",
  },
];

const behavioralColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "assessment",
    label: "행동특성 및 종합의견",
    type: "textarea",
    placeholder: "담임교사 서술형 평가를 입력하세요",
  },
];

const MOCK_EXAM_MONTH_OPTIONS = [
  { value: 3, label: "3월" },
  { value: 4, label: "4월" },
  { value: 6, label: "6월" },
  { value: 7, label: "7월" },
  { value: 9, label: "9월" },
  { value: 10, label: "10월" },
  { value: 11, label: "11월" },
];

const mockExamColumns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: "year",
    label: "학년",
    type: "select",
    options: YEAR_OPTIONS,
    width: "54px",
  },
  {
    key: "month",
    label: "시기",
    type: "select",
    options: MOCK_EXAM_MONTH_OPTIONS,
    width: "62px",
  },
  {
    key: "subject",
    label: "과목",
    type: "text",
    placeholder: "과목명",
    width: "80px",
  },
  {
    key: "score",
    label: "원점수",
    type: "number",
    placeholder: "0",
    min: 0,
    max: 200,
    width: "52px",
  },
  {
    key: "gradeRank",
    label: "등급",
    type: "number",
    placeholder: "1~9",
    min: 1,
    max: 9,
    width: "48px",
  },
  {
    key: "percentile",
    label: "백분위",
    type: "number",
    placeholder: "0",
    min: 0,
    max: 100,
    step: "0.1",
    isFloat: true,
    width: "56px",
  },
  {
    key: "standardScore",
    label: "표준점수",
    type: "number",
    placeholder: "0",
    min: 0,
    width: "56px",
  },
];

// ============================================
// Accordion Steps
// ============================================

const ACCORDION_STEPS: AccordionStepDef[] = [
  {
    stepNumber: 1,
    title: "모의고사 성적",
    sections: [
      {
        key: "mockExams",
        title: "모의고사 성적",
        columns: mockExamColumns,
        addLabel: "모의고사 추가",
        createEmpty: createEmptyMockExamRow,
      },
    ],
  },
  {
    stepNumber: 2,
    title: "출결상황 · 수상경력 · 자격증",
    sections: [
      {
        key: "attendance",
        title: "출결상황",
        columns: attendanceColumns,
        addLabel: "학년 추가",
        createEmpty: createEmptyAttendanceRow,
      },
      {
        key: "awards",
        title: "수상경력",
        columns: awardColumns,
        addLabel: "수상 추가",
        createEmpty: createEmptyAwardRow,
      },
      {
        key: "certifications",
        title: "자격증 및 인증 취득상황",
        columns: certificationColumns,
        addLabel: "자격증 추가",
        createEmpty: createEmptyCertificationRow,
      },
    ],
  },
  {
    stepNumber: 3,
    title: "창의적 체험활동 · 봉사활동",
    sections: [
      {
        key: "creativeActivities",
        title: "창의적 체험활동상황",
        addLabel: "학년 추가",
        customRender: CreativeActivitySection,
      },
      {
        key: "volunteerActivities",
        title: "봉사활동실적",
        columns: volunteerColumns,
        addLabel: "봉사활동 추가",
        createEmpty: createEmptyVolunteerRow,
      },
    ],
  },
  {
    stepNumber: 4,
    title: "교과학습발달상황 · 세부능력 및 특기사항",
    sections: [
      {
        key: "generalSubjects",
        title: "일반선택과목",
        columns: generalSubjectColumns,
        addLabel: "과목 추가",
        createEmpty: createEmptyGeneralSubjectRow,
      },
      {
        key: "careerSubjects",
        title: "진로선택과목",
        columns: careerSubjectColumns,
        addLabel: "과목 추가",
        createEmpty: createEmptyCareerSubjectRow,
      },
      {
        key: "artsPhysicalSubjects",
        title: "체육/예술과목",
        columns: artsPhysicalColumns,
        addLabel: "과목 추가",
        createEmpty: createEmptyArtsPhysicalSubjectRow,
      },
      {
        key: "subjectEvaluations",
        title: "세부능력 및 특기사항",
        columns: subjectEvaluationColumns,
        addLabel: "과목 추가",
        createEmpty: createEmptySubjectEvaluationRow,
      },
    ],
  },
  {
    stepNumber: 5,
    title: "독서활동 · 행동특성 및 종합의견",
    sections: [
      {
        key: "readingActivities",
        title: "독서활동상황",
        columns: readingActivityColumns,
        addLabel: "독서 추가",
        createEmpty: createEmptyReadingActivityRow,
      },
      {
        key: "behavioralAssessments",
        title: "행동특성 및 종합의견",
        columns: behavioralColumns,
        addLabel: "학년 추가",
        createEmpty: createEmptyBehavioralAssessmentRow,
      },
    ],
  },
];

// ============================================
// TextInputStep
// ============================================

interface TextInputStepProps {
  record: SchoolRecord;
  onRecordChange: (record: SchoolRecord) => void;
  requiredFieldErrors?: ValidationError[];
}

export const TextInputStep = ({
  record,
  onRecordChange,
  requiredFieldErrors = [],
}: TextInputStepProps) => {
  const errorKeys = new Set(requiredFieldErrors.map((e) => e.key));
  const allMet = requiredFieldErrors.length === 0;

  return (
    <div className={styles.textInputStep}>
      <div className={styles.textInputHeader}>
        <h3 className={styles.stepSectionTitle}>
          생활기록부 및 모의고사 점수 등록
        </h3>
        <p className={styles.stepSectionDesc}>
          각 STEP을 열어 생기부 데이터를 입력해주세요.{" "}
          <span className={styles.requiredHint}>
            <span className={styles.requiredDot} />
            필수 항목
          </span>
        </p>
      </div>

      {ACCORDION_STEPS.map((step) => (
        <AccordionStep
          key={step.stepNumber}
          step={step}
          record={record}
          onRecordChange={onRecordChange}
          defaultOpen={step.stepNumber === 1}
          errorKeys={errorKeys}
        />
      ))}

      {/* 필수 항목 체크리스트 */}
      <div className={styles.requiredChecklist}>
        <p className={styles.requiredChecklistTitle}>
          {allMet
            ? "모든 필수 항목이 입력되었습니다"
            : "아래 필수 항목을 모두 입력해야 다음 단계로 진행할 수 있습니다"}
        </p>
        <ul className={styles.requiredChecklistItems}>
          {REQUIRED_FIELD_RULES.map((rule) => {
            const count = (record[rule.key] ?? []).length;
            const met = count >= rule.minCount;
            return (
              <li
                key={rule.key}
                className={
                  met
                    ? styles.requiredChecklistItemMet
                    : styles.requiredChecklistItemUnmet
                }
              >
                {met ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>
                  {rule.label}
                  <span className={styles.requiredChecklistCount}>
                    {count}/{rule.minCount}
                    {rule.minCount > 1 ? "건" : "개 학년"} ({rule.minCount}
                    {rule.minCount > 1 ? "건" : "개 학년"} 이상 필수 입력)
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {/* 행 내부 필수값 검증 에러 */}
        {requiredFieldErrors
          .filter(
            (e) =>
              !REQUIRED_FIELD_RULES.some(
                (r) => r.key === e.key && r.message === e.message
              )
          )
          .map((e, i) => (
            <p key={i} className={styles.requiredChecklistItemUnmet}>
              <AlertCircle size={14} />
              <span>{e.message}</span>
            </p>
          ))}
      </div>
    </div>
  );
};
