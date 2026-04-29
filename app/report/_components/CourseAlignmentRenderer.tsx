import type { CourseAlignmentSection } from "@/libs/report/types";

import { ReportProgress } from "./ReportProgress";
import styles from "./report.module.css";
import { renderInsightMarkers } from "./insight-marker";
import { SectionHeader } from "./SectionHeader";

interface CourseAlignmentRendererProps {
  data: CourseAlignmentSection;
  sectionNumber: number;
}

const STATUS_CLASS: Record<string, string> = {
  "\uC774\uC218": styles.tagStrength,
  "\uBBF8\uC774\uC218": styles.tagWeakness,
};

const IMPORTANCE_CLASS: Record<string, string> = {
  "\uD544\uC218": styles.tagAccent,
  "\uD575\uC2EC \uAD8C\uC7A5": styles.tagStrength,
  "\uAD8C\uC7A5": styles.tagAccent,
};

export const CourseAlignmentRenderer = ({
  data,
  sectionNumber,
}: CourseAlignmentRendererProps) => {
  const courses = data.courses ?? [];

  // 필수 데이터 없으면 섹션 렌더링 스킵
  if (courses.length === 0 && !data.targetMajor) return null;
  const matchRate =
    data.matchRate > 0
      ? data.matchRate
      : courses.length > 0
        ? Math.round(
            (courses.filter((c) => c.status === "이수").length /
              courses.length) *
              100
          )
        : 0;

  return (
    <>
      {/* Block 1: SectionHeader + table + impact + AI strategy (한 페이지) */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={`${styles.h3} ${styles.mb12}`}>{data.targetMajor}</div>
        <ReportProgress
          label="권장과목 이수율"
          value={matchRate}
          variant={matchRate >= 80 ? "strength" : "weakness"}
        />

        <div className={`${styles.h3} ${styles.mt24} ${styles.mb12}`}>
          과목별 이수 현황
        </div>
        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>과목명</th>
              <th className={styles.tableAlignCenter}>중요도</th>
              <th className={styles.tableAlignCenter}>이수 여부</th>
            </tr>
          </thead>
          <tbody>
            {(data.courses ?? []).map((course) => (
              <tr key={course.course}>
                <td className={styles.tableCellBold}>{course.course}</td>
                <td className={styles.tableAlignCenter}>
                  <span className={IMPORTANCE_CLASS[course.importance]}>
                    {course.importance}
                  </span>
                </td>
                <td className={styles.tableAlignCenter}>
                  <span className={STATUS_CLASS[course.status]}>
                    {course.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className={`${styles.callout} ${styles.calloutCaution} ${styles.mt20}`}
        >
          <div className={styles.calloutContent}>
            <span className={`${styles.emphasis} ${styles.markerYellow}`}>
              미이수 과목 영향:
            </span>{" "}
            {renderInsightMarkers(data.missingCourseImpact)}
          </div>
        </div>

        {data.recommendation && (
          <div className={`${styles.aiCommentary} ${styles.mt16}`}>
            <div className={styles.aiCommentaryIcon}>✦</div>
            <div className={styles.aiCommentaryContent}>
              <div className={styles.aiCommentaryLabel}>
                <span className={styles.markerSky}>이수 전략</span>
              </div>
              <div className={styles.aiCommentaryText}>
                {renderInsightMarkers(data.recommendation)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Block 4: Medical requirements (Standard+) */}
      {data.medicalRequirements && data.medicalRequirements.length > 0 && (
        <div className={styles.mt24}>
          <div className={`${styles.h3} ${styles.mb12}`}>
            대학별 요구사항 매칭
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>대학</th>
                <th>학과</th>
                <th className={styles.tableAlignCenter}>충족 여부</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {data.medicalRequirements.map((req) => (
                <tr key={`${req.university}-${req.department}`}>
                  <td className={styles.tableCellBold}>{req.university}</td>
                  <td>{req.department}</td>
                  <td className={styles.tableAlignCenter}>
                    <span
                      className={
                        req.met ? styles.tagStrength : styles.tagWeakness
                      }
                    >
                      {req.met ? "충족" : "미충족"}
                    </span>
                  </td>
                  <td className={styles.small}>
                    {renderInsightMarkers(req.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
