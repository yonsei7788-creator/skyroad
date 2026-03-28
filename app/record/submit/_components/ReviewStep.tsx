import { AlertCircle } from "lucide-react";

import type { InputMethod, SchoolRecord, ValidationError } from "./types";
import { SECTION_TABS, REQUIRED_SECTION_KEYS } from "./types";

import styles from "../page.module.css";

interface ReviewStepProps {
  method: InputMethod;
  record: SchoolRecord;
  validationErrors?: ValidationError[];
}

export const ReviewStep = ({
  record,
  validationErrors = [],
}: ReviewStepProps) => (
  <div className={styles.reviewStep}>
    {validationErrors.length > 0 && (
      <div className={styles.parseErrorBox}>
        <AlertCircle size={16} />
        <div>
          {validationErrors.map((e, i) => (
            <p key={i}>{e.message}</p>
          ))}
        </div>
      </div>
    )}
    <TextReview record={record} />
  </div>
);

const TextReview = ({ record }: { record: SchoolRecord }) => {
  const totalItems = Object.values(record).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  const filledSections = SECTION_TABS.filter(
    (tab) => (record[tab.key] ?? []).length > 0
  );

  return (
    <>
      <div className={styles.textInputHeader}>
        <h3 className={styles.stepSectionTitle}>입력된 생기부 확인</h3>
        <p className={styles.stepSectionDesc}>
          총 {filledSections.length}개 섹션, {totalItems}개 항목이
          입력되었습니다
        </p>
      </div>

      {filledSections.length > 0 ? (
        <div className={styles.reviewSections}>
          {filledSections.map((tab) => (
            <ReviewSectionBlock
              key={tab.key}
              label={tab.label}
              sectionKey={tab.key}
              record={record}
            />
          ))}
        </div>
      ) : (
        <div className={styles.reviewEmpty}>
          입력된 항목이 없습니다. 이전 단계로 돌아가 데이터를 입력해주세요.
        </div>
      )}
    </>
  );
};

// ============================================
// 섹션별 검토 블록
// ============================================

interface ReviewSectionBlockProps {
  label: string;
  sectionKey: keyof SchoolRecord;
  record: SchoolRecord;
}

const ReviewSectionBlock = ({
  label,
  sectionKey,
  record,
}: ReviewSectionBlockProps) => {
  const rows = record[sectionKey];

  return (
    <div className={styles.reviewSectionBlock}>
      <h4 className={styles.reviewSectionLabel}>
        {REQUIRED_SECTION_KEYS.has(sectionKey) && (
          <span className={styles.requiredDot} />
        )}
        {label}
        <span className={styles.reviewSectionCount}>{rows.length}건</span>
      </h4>

      {sectionKey === "generalSubjects" && (
        <GeneralSubjectsTable rows={record.generalSubjects} />
      )}
      {sectionKey === "careerSubjects" && (
        <CareerSubjectsTable rows={record.careerSubjects} />
      )}
      {sectionKey === "artsPhysicalSubjects" && (
        <ArtsPhysicalTable rows={record.artsPhysicalSubjects} />
      )}
      {sectionKey === "attendance" && (
        <AttendanceTable rows={record.attendance} />
      )}
      {sectionKey === "awards" && (
        <SimpleListReview
          rows={record.awards}
          render={(r) => `${r.year}학년 | ${r.name} | ${r.rank || "-"}`}
        />
      )}
      {sectionKey === "certifications" && (
        <SimpleListReview
          rows={record.certifications}
          render={(r) => `${r.category} | ${r.name} | ${r.date}`}
        />
      )}
      {sectionKey === "creativeActivities" && (
        <SimpleListReview
          rows={record.creativeActivities}
          render={(r) => `${r.year}학년 | ${r.area} | ${r.hours ?? 0}시간`}
        />
      )}
      {sectionKey === "volunteerActivities" && (
        <SimpleListReview
          rows={record.volunteerActivities}
          render={(r) =>
            `${r.year}학년 | ${r.dateRange} | ${r.content} | ${r.hours ?? 0}시간`
          }
        />
      )}
      {sectionKey === "subjectEvaluations" && (
        <SimpleListReview
          rows={record.subjectEvaluations}
          render={(r) =>
            `${r.year}학년 | ${r.subject} | ${r.evaluation.slice(0, 60)}...`
          }
        />
      )}
      {sectionKey === "readingActivities" && (
        <SimpleListReview
          rows={record.readingActivities}
          render={(r) =>
            `${r.year}학년 | ${r.subjectOrArea || "공통"} | ${r.content.slice(0, 60)}...`
          }
        />
      )}
      {sectionKey === "behavioralAssessments" && (
        <SimpleListReview
          rows={record.behavioralAssessments}
          render={(r) => `${r.year}학년 | ${r.assessment.slice(0, 80)}...`}
        />
      )}
      {sectionKey === "mockExams" && <MockExamsTable rows={record.mockExams} />}
    </div>
  );
};

// ============================================
// 테이블 컴포넌트
// ============================================

const GeneralSubjectsTable = ({
  rows,
}: {
  rows: SchoolRecord["generalSubjects"];
}) => (
  <div className={styles.reviewTableWrap}>
    <table className={styles.reviewTable}>
      <caption className="sr-only">일반교과 성적 검토</caption>
      <thead>
        <tr>
          <th scope="col">학기</th>
          <th scope="col">교과</th>
          <th scope="col">과목</th>
          <th scope="col">단위</th>
          <th scope="col">원점수</th>
          <th scope="col">평균</th>
          <th scope="col">표준편차</th>
          <th scope="col">등급</th>
          <th scope="col">비고</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.id}>
            <td>
              <span className={styles.reviewBadge}>
                {g.year}-{g.semester}
              </span>
            </td>
            <td>{g.category || "-"}</td>
            <td>{g.subject || "-"}</td>
            <td>{g.credits ?? "-"}</td>
            <td>{g.rawScore ?? "-"}</td>
            <td>{g.average ?? "-"}</td>
            <td>{g.standardDeviation ?? "-"}</td>
            <td>{g.gradeRank ?? "-"}</td>
            <td>{g.note || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CareerSubjectsTable = ({
  rows,
}: {
  rows: SchoolRecord["careerSubjects"];
}) => (
  <div className={styles.reviewTableWrap}>
    <table className={styles.reviewTable}>
      <caption className="sr-only">진로선택 성적 검토</caption>
      <thead>
        <tr>
          <th scope="col">학기</th>
          <th scope="col">교과</th>
          <th scope="col">과목</th>
          <th scope="col">단위</th>
          <th scope="col">원점수</th>
          <th scope="col">평균</th>
          <th scope="col">성취도</th>
          <th scope="col">분포비율</th>
          <th scope="col">비고</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.id}>
            <td>
              <span className={styles.reviewBadge}>
                {g.year}-{g.semester}
              </span>
            </td>
            <td>{g.category || "-"}</td>
            <td>{g.subject || "-"}</td>
            <td>{g.credits ?? "-"}</td>
            <td>{g.rawScore ?? "-"}</td>
            <td>{g.average ?? "-"}</td>
            <td>{g.achievement || "-"}</td>
            <td>{g.achievementDistribution || "-"}</td>
            <td>{g.note || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ArtsPhysicalTable = ({
  rows,
}: {
  rows: SchoolRecord["artsPhysicalSubjects"];
}) => (
  <div className={styles.reviewTableWrap}>
    <table className={styles.reviewTable}>
      <caption className="sr-only">체육/예술 성적 검토</caption>
      <thead>
        <tr>
          <th scope="col">학기</th>
          <th scope="col">교과</th>
          <th scope="col">과목</th>
          <th scope="col">단위</th>
          <th scope="col">성취도</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.id}>
            <td>
              <span className={styles.reviewBadge}>
                {g.year}-{g.semester}
              </span>
            </td>
            <td>{g.category || "-"}</td>
            <td>{g.subject || "-"}</td>
            <td>{g.credits ?? "-"}</td>
            <td>{g.achievement || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AttendanceTable = ({ rows }: { rows: SchoolRecord["attendance"] }) => (
  <div className={styles.reviewTableWrap}>
    <table className={styles.reviewTable}>
      <caption className="sr-only">출결상황 검토</caption>
      <thead>
        <tr>
          <th scope="col" rowSpan={2}>
            학년
          </th>
          <th scope="col" rowSpan={2}>
            수업일수
          </th>
          <th scope="colgroup" colSpan={3}>
            결석일수
          </th>
          <th scope="colgroup" colSpan={3}>
            지각
          </th>
          <th scope="colgroup" colSpan={3}>
            조퇴
          </th>
          <th scope="colgroup" colSpan={3}>
            결과
          </th>
          <th scope="col" rowSpan={2}>
            특기사항
          </th>
        </tr>
        <tr>
          <th scope="col">질병</th>
          <th scope="col">미인정</th>
          <th scope="col">기타</th>
          <th scope="col">질병</th>
          <th scope="col">미인정</th>
          <th scope="col">기타</th>
          <th scope="col">질병</th>
          <th scope="col">미인정</th>
          <th scope="col">기타</th>
          <th scope="col">질병</th>
          <th scope="col">미인정</th>
          <th scope="col">기타</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <span className={styles.reviewBadge}>{r.year}학년</span>
            </td>
            <td>{r.totalDays ?? "-"}</td>
            <td>{r.absenceIllness ?? "-"}</td>
            <td>{r.absenceUnauthorized ?? "-"}</td>
            <td>{r.absenceOther ?? "-"}</td>
            <td>{r.latenessIllness ?? "-"}</td>
            <td>{r.latenessUnauthorized ?? "-"}</td>
            <td>{r.latenessOther ?? "-"}</td>
            <td>{r.earlyLeaveIllness ?? "-"}</td>
            <td>{r.earlyLeaveUnauthorized ?? "-"}</td>
            <td>{r.earlyLeaveOther ?? "-"}</td>
            <td>{r.classMissedIllness ?? "-"}</td>
            <td>{r.classMissedUnauthorized ?? "-"}</td>
            <td>{r.classMissedOther ?? "-"}</td>
            <td>{r.note || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MockExamsTable = ({ rows }: { rows: SchoolRecord["mockExams"] }) => (
  <div className={styles.reviewTableWrap}>
    <table className={styles.reviewTable}>
      <caption className="sr-only">모의고사 성적 검토</caption>
      <thead>
        <tr>
          <th scope="col">학년</th>
          <th scope="col">시기(월)</th>
          <th scope="col">과목</th>
          <th scope="col">원점수</th>
          <th scope="col">등급</th>
          <th scope="col">백분위</th>
          <th scope="col">표준점수</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>
              <span className={styles.reviewBadge}>{r.year}학년</span>
            </td>
            <td>{r.month}월</td>
            <td>{r.subject || "-"}</td>
            <td>{r.score ?? "-"}</td>
            <td>{r.gradeRank ?? "-"}</td>
            <td>{r.percentile ?? "-"}</td>
            <td>{r.standardScore ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ============================================
// 범용 리스트 리뷰
// ============================================

interface SimpleListReviewProps<T> {
  rows: T[];
  render: (row: T) => string;
}

const SimpleListReview = <T extends { id: string }>({
  rows,
  render,
}: SimpleListReviewProps<T>) => (
  <ul className={styles.reviewList}>
    {rows.map((row) => (
      <li key={row.id} className={styles.reviewListItem}>
        {render(row)}
      </li>
    ))}
  </ul>
);
