import { Trash2 } from "lucide-react";

import type {
  CareerSubjectRow,
  ArtsPhysicalSubjectRow,
  AttendanceRow,
  AwardRow,
  CertificationRow,
  CreativeActivityRow,
  CreativeActivityArea,
  VolunteerRow,
  SubjectEvaluationRow,
  ReadingActivityRow,
  BehavioralAssessmentRow,
} from "./types";

import styles from "../page.module.css";

const YEAR_OPTIONS = [1, 2, 3] as const;
const SEMESTER_OPTIONS = [1, 2] as const;

// ============================================
// 공통 헬퍼
// ============================================

const parseNum = (value: string, isFloat = false): number | null => {
  if (value === "") return null;
  const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

interface RowShellProps {
  onRemove?: () => void;
  canRemove: boolean;
  children: React.ReactNode;
}

const RowShell = ({ onRemove, canRemove, children }: RowShellProps) => (
  <div className={styles.gradeRow}>
    <div className={styles.sectionRowFields}>{children}</div>
    {canRemove && onRemove && (
      <button
        type="button"
        className={styles.gradeRowRemove}
        onClick={onRemove}
        aria-label="행 삭제"
      >
        <Trash2 size={16} />
      </button>
    )}
  </div>
);

// ============================================
// 진로선택과목
// ============================================

interface CareerSubjectRowFormProps {
  row: CareerSubjectRow;
  onChange: (id: string, field: keyof CareerSubjectRow, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const CareerSubjectRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: CareerSubjectRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
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
        onChange={(e) => onChange(row.id, "credits", parseNum(e.target.value))}
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
        onChange={(e) => onChange(row.id, "rawScore", parseNum(e.target.value))}
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
          onChange(row.id, "average", parseNum(e.target.value, true))
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
        {["A", "B", "C"].map((v) => (
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
        onChange={(e) =>
          onChange(row.id, "studentCount", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowFieldWide}>
      <label className={styles.gradeRowLabel}>성취도별 분포비율</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="예: 40%|35.1|24.9"
        value={row.achievementDistribution}
        onChange={(e) =>
          onChange(row.id, "achievementDistribution", e.target.value)
        }
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
  </RowShell>
);

// ============================================
// 체육/예술과목
// ============================================

interface ArtsPhysicalRowFormProps {
  row: ArtsPhysicalSubjectRow;
  onChange: (
    id: string,
    field: keyof ArtsPhysicalSubjectRow,
    value: unknown
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const ArtsPhysicalRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: ArtsPhysicalRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
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
        placeholder="체육/예술"
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
        onChange={(e) => onChange(row.id, "credits", parseNum(e.target.value))}
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
        {["A", "B", "C", "P"].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  </RowShell>
);

// ============================================
// 출결상황
// ============================================

interface AttendanceRowFormProps {
  row: AttendanceRow;
  onChange: (id: string, field: keyof AttendanceRow, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const AttendanceRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: AttendanceRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}학년
          </option>
        ))}
      </select>
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>수업일수</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.totalDays ?? ""}
        onChange={(e) =>
          onChange(row.id, "totalDays", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>결석(질병)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.absenceIllness ?? ""}
        onChange={(e) =>
          onChange(row.id, "absenceIllness", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>결석(미인정)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.absenceUnauthorized ?? ""}
        onChange={(e) =>
          onChange(row.id, "absenceUnauthorized", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>결석(기타)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.absenceOther ?? ""}
        onChange={(e) =>
          onChange(row.id, "absenceOther", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>지각(질병)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.latenessIllness ?? ""}
        onChange={(e) =>
          onChange(row.id, "latenessIllness", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>지각(미인정)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.latenessUnauthorized ?? ""}
        onChange={(e) =>
          onChange(row.id, "latenessUnauthorized", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>지각(기타)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.latenessOther ?? ""}
        onChange={(e) =>
          onChange(row.id, "latenessOther", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>조퇴(질병)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.earlyLeaveIllness ?? ""}
        onChange={(e) =>
          onChange(row.id, "earlyLeaveIllness", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>조퇴(미인정)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.earlyLeaveUnauthorized ?? ""}
        onChange={(e) =>
          onChange(row.id, "earlyLeaveUnauthorized", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>조퇴(기타)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.earlyLeaveOther ?? ""}
        onChange={(e) =>
          onChange(row.id, "earlyLeaveOther", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>결과(질병)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.classMissedIllness ?? ""}
        onChange={(e) =>
          onChange(row.id, "classMissedIllness", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>결과(미인정)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.classMissedUnauthorized ?? ""}
        onChange={(e) =>
          onChange(row.id, "classMissedUnauthorized", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>결과(기타)</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.classMissedOther ?? ""}
        onChange={(e) =>
          onChange(row.id, "classMissedOther", parseNum(e.target.value))
        }
      />
    </div>
    <div className={styles.gradeRowFieldFull}>
      <label className={styles.gradeRowLabel}>특기사항</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="특기사항 (선택)"
        value={row.note}
        onChange={(e) => onChange(row.id, "note", e.target.value)}
      />
    </div>
  </RowShell>
);

// ============================================
// 수상경력
// ============================================

interface AwardRowFormProps {
  row: AwardRow;
  onChange: (id: string, field: keyof AwardRow, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const AwardRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: AwardRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}학년
          </option>
        ))}
      </select>
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>수상명</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="수상명"
        value={row.name}
        onChange={(e) => onChange(row.id, "name", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>등급(위)</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="금상, 1위 등"
        value={row.rank}
        onChange={(e) => onChange(row.id, "rank", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>수상연월일</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="YYYY.MM.DD"
        value={row.date}
        onChange={(e) => onChange(row.id, "date", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>수여기관</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="수여기관"
        value={row.organization}
        onChange={(e) => onChange(row.id, "organization", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowFieldWide}>
      <label className={styles.gradeRowLabel}>참가대상(인원)</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="예: 1학년 전체(357명)"
        value={row.participants}
        onChange={(e) => onChange(row.id, "participants", e.target.value)}
      />
    </div>
  </RowShell>
);

// ============================================
// 자격증/인증
// ============================================

interface CertificationRowFormProps {
  row: CertificationRow;
  onChange: (id: string, field: keyof CertificationRow, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const CertificationRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: CertificationRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>구분</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="자격증/인증"
        value={row.category}
        onChange={(e) => onChange(row.id, "category", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>명칭/종류</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="명칭"
        value={row.name}
        onChange={(e) => onChange(row.id, "name", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>번호/내용</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="번호 또는 내용"
        value={row.details}
        onChange={(e) => onChange(row.id, "details", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>취득연월일</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="YYYY.MM.DD"
        value={row.date}
        onChange={(e) => onChange(row.id, "date", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>발급기관</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="발급기관"
        value={row.issuer}
        onChange={(e) => onChange(row.id, "issuer", e.target.value)}
      />
    </div>
  </RowShell>
);

// ============================================
// 창의적 체험활동
// ============================================

const AREA_OPTIONS: CreativeActivityArea[] = [
  "자율활동",
  "동아리활동",
  "진로활동",
];

interface CreativeActivityRowFormProps {
  row: CreativeActivityRow;
  onChange: (
    id: string,
    field: keyof CreativeActivityRow,
    value: unknown
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const CreativeActivityRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: CreativeActivityRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}학년
          </option>
        ))}
      </select>
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>영역</label>
      <select
        className={styles.gradeRowSelect}
        value={row.area}
        onChange={(e) => onChange(row.id, "area", e.target.value)}
      >
        {AREA_OPTIONS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>시간</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.hours ?? ""}
        onChange={(e) => onChange(row.id, "hours", parseNum(e.target.value))}
      />
    </div>
    <div className={styles.gradeRowFieldFull}>
      <label className={styles.gradeRowLabel}>특기사항</label>
      <textarea
        className={styles.sectionTextarea}
        placeholder="특기사항을 입력하세요"
        rows={3}
        value={row.note}
        onChange={(e) => onChange(row.id, "note", e.target.value)}
      />
    </div>
  </RowShell>
);

// ============================================
// 봉사활동
// ============================================

interface VolunteerRowFormProps {
  row: VolunteerRow;
  onChange: (id: string, field: keyof VolunteerRow, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const VolunteerRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: VolunteerRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}학년
          </option>
        ))}
      </select>
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>일자/기간</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="YYYY.MM.DD"
        value={row.dateRange}
        onChange={(e) => onChange(row.id, "dateRange", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>장소/기관</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="장소 또는 주관기관"
        value={row.place}
        onChange={(e) => onChange(row.id, "place", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>활동내용</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="활동내용"
        value={row.content}
        onChange={(e) => onChange(row.id, "content", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>시간</label>
      <input
        type="number"
        className={styles.gradeRowInput}
        placeholder="0"
        min={0}
        value={row.hours ?? ""}
        onChange={(e) => onChange(row.id, "hours", parseNum(e.target.value))}
      />
    </div>
  </RowShell>
);

// ============================================
// 세부능력 및 특기사항
// ============================================

interface SubjectEvaluationRowFormProps {
  row: SubjectEvaluationRow;
  onChange: (
    id: string,
    field: keyof SubjectEvaluationRow,
    value: unknown
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const SubjectEvaluationRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: SubjectEvaluationRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}학년
          </option>
        ))}
      </select>
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
    <div className={styles.gradeRowFieldFull}>
      <label className={styles.gradeRowLabel}>세부능력 및 특기사항</label>
      <textarea
        className={styles.sectionTextarea}
        placeholder="교사 서술형 평가를 입력하세요"
        rows={4}
        value={row.evaluation}
        onChange={(e) => onChange(row.id, "evaluation", e.target.value)}
      />
    </div>
  </RowShell>
);

// ============================================
// 독서활동
// ============================================

interface ReadingActivityRowFormProps {
  row: ReadingActivityRow;
  onChange: (
    id: string,
    field: keyof ReadingActivityRow,
    value: unknown
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const ReadingActivityRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: ReadingActivityRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}학년
          </option>
        ))}
      </select>
    </div>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>과목/영역</label>
      <input
        type="text"
        className={styles.gradeRowInput}
        placeholder="과목 또는 영역 (선택)"
        value={row.subjectOrArea}
        onChange={(e) => onChange(row.id, "subjectOrArea", e.target.value)}
      />
    </div>
    <div className={styles.gradeRowFieldFull}>
      <label className={styles.gradeRowLabel}>독서활동상황</label>
      <textarea
        className={styles.sectionTextarea}
        placeholder="도서목록을 입력하세요"
        rows={3}
        value={row.content}
        onChange={(e) => onChange(row.id, "content", e.target.value)}
      />
    </div>
  </RowShell>
);

// ============================================
// 행동특성 및 종합의견
// ============================================

interface BehavioralAssessmentRowFormProps {
  row: BehavioralAssessmentRow;
  onChange: (
    id: string,
    field: keyof BehavioralAssessmentRow,
    value: unknown
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const BehavioralAssessmentRowForm = ({
  row,
  onChange,
  onRemove,
  canRemove,
}: BehavioralAssessmentRowFormProps) => (
  <RowShell onRemove={() => onRemove(row.id)} canRemove={canRemove}>
    <div className={styles.gradeRowField}>
      <label className={styles.gradeRowLabel}>학년</label>
      <select
        className={styles.gradeRowSelect}
        value={row.year}
        onChange={(e) => onChange(row.id, "year", parseInt(e.target.value, 10))}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}학년
          </option>
        ))}
      </select>
    </div>
    <div className={styles.gradeRowFieldFull}>
      <label className={styles.gradeRowLabel}>행동특성 및 종합의견</label>
      <textarea
        className={styles.sectionTextarea}
        placeholder="담임교사 서술형 평가를 입력하세요"
        rows={4}
        value={row.assessment}
        onChange={(e) => onChange(row.id, "assessment", e.target.value)}
      />
    </div>
  </RowShell>
);
