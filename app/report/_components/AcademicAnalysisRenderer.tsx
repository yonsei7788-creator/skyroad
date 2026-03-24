import type { AcademicAnalysisSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface AcademicAnalysisRendererProps {
  data: AcademicAnalysisSection;
  sectionNumber: number;
}

const GRADE_COLOR = (grade: number): string => {
  if (grade === 1) return "var(--grade-excellent)";
  if (grade <= 2) return "var(--grade-good)";
  if (grade <= 3) return "var(--grade-average)";
  return "var(--grade-weak)";
};

const GRADE_ROW_CLASS = (grade: number, s: Record<string, string>): string => {
  if (grade === 1) return s.gradeRowExcellent;
  if (grade <= 2) return s.gradeRowGood;
  if (grade <= 3) return s.gradeRowCaution;
  return s.gradeRowAlert;
};

const TREND_ICON: Record<string, string> = {
  상승: "↑",
  유지: "→",
  하락: "↓",
};

const TREND_TAG_CLASS = (trend: string, s: Record<string, string>): string => {
  if (trend === "상승") return s.tagTrendUp;
  if (trend === "하락") return s.tagTrendDown;
  return s.tagAccent;
};

const hasRawScore = (grades: AcademicAnalysisSection["subjectGrades"]) =>
  (grades ?? []).some((g) => g.rawScore !== undefined);

const hasClassAvg = (grades: AcademicAnalysisSection["subjectGrades"]) =>
  (grades ?? []).some((g) => g.classAverage !== undefined);

/** Safely convert an action item (string or {item, detail} object) to a string */
const toText = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.item === "string") {
      return typeof obj.detail === "string"
        ? `${obj.item}: ${obj.detail}`
        : obj.item;
    }
  }
  return String(v ?? "");
};

/** Check if an object has at least one non-empty value */
const hasContent = (obj: unknown): boolean => {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj as Record<string, unknown>).some(
    (v) => v !== undefined && v !== null && v !== ""
  );
};

export const AcademicAnalysisRenderer = ({
  data,
  sectionNumber,
}: AcademicAnalysisRendererProps) => {
  const showRaw = hasRawScore(data.subjectGrades);
  const showAvg = hasClassAvg(data.subjectGrades);

  return (
    <>
      {/* Block 1: Header + Overview stats + Semester table */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={`${styles.cardGridThree} ${styles.mb16}`}>
          <div className={styles.statCardLarge}>
            <span className={styles.statCardLargeValue}>
              {data.overallAverageGrade?.toFixed(2) ?? "-"}
            </span>
            <span className={styles.statCardLargeLabel}>전체 평균 등급</span>
          </div>
          <div className={styles.statCardLarge}>
            <span
              className={TREND_TAG_CLASS(data.gradeTrend, styles)}
              style={{ fontSize: "1.25rem" }}
            >
              {TREND_ICON[data.gradeTrend]} {data.gradeTrend}
            </span>
            <span className={styles.statCardLargeLabel}>성적 추세</span>
          </div>
          <div className={styles.statCardLarge}>
            <span className={styles.statCardLargeValue}>
              {(data.subjectGrades ?? []).length}
            </span>
            <span className={styles.statCardLargeLabel}>분석 교과 수</span>
          </div>
        </div>

        <div className={styles.ceSubheading}>학기별 평균 등급</div>
        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>학년</th>
              <th className={styles.tableAlignCenter}>학기</th>
              <th className={styles.tableAlignCenter}>평균 등급</th>
            </tr>
          </thead>
          <tbody>
            {(data.gradesByYear ?? []).map((row) => (
              <tr
                key={`${row.year}-${row.semester}`}
                className={GRADE_ROW_CLASS(
                  Math.round(row.averageGrade),
                  styles
                )}
              >
                <td className={styles.tableCellBold}>{row.year}학년</td>
                <td className={styles.tableAlignCenter}>{row.semester}학기</td>
                <td
                  className={`${styles.tableAlignCenter} ${styles.fontBold}`}
                  style={{ color: GRADE_COLOR(row.averageGrade) }}
                >
                  {row.averageGrade?.toFixed(2) ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(data.subjectCombinations ?? []).length > 0 && (
          <>
            <div className={styles.ceSubheading}>교과 조합별 평균</div>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>조합</th>
                  <th className={styles.tableAlignCenter}>평균 등급</th>
                </tr>
              </thead>
              <tbody>
                {(data.subjectCombinations ?? []).map((combo) => (
                  <tr key={combo.combination}>
                    <td className={styles.tableCellBold}>
                      {combo.combination}
                    </td>
                    <td
                      className={`${styles.tableAlignCenter} ${styles.fontBold}`}
                      style={{ color: GRADE_COLOR(combo.averageGrade) }}
                    >
                      {combo.averageGrade?.toFixed(2) ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Block 2+: Subject grades split by year */}
      {(() => {
        const grades = data.subjectGrades ?? [];
        const years = [...new Set(grades.map((g) => g.year))].sort(
          (a, b) => a - b
        );

        const renderGradeTable = (rows: typeof grades, heading?: string) => (
          <div key={heading}>
            <div className={styles.ceSubheading}>{heading}</div>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>교과</th>
                  <th className={styles.tableAlignCenter}>학기</th>
                  <th className={styles.tableAlignCenter}>등급</th>
                  {showRaw && (
                    <th className={styles.tableAlignCenter}>원점수</th>
                  )}
                  {showAvg && <th className={styles.tableAlignCenter}>평균</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr
                    key={`${g.subject}-${g.year}-${g.semester}`}
                    className={GRADE_ROW_CLASS(g.grade, styles)}
                  >
                    <td className={styles.tableCellBold}>{g.subject}</td>
                    <td className={styles.tableAlignCenter}>{g.semester}</td>
                    <td
                      className={`${styles.tableAlignCenter} ${styles.fontBold}`}
                      style={{ color: GRADE_COLOR(g.grade) }}
                    >
                      {g.grade}
                    </td>
                    {showRaw && (
                      <td className={styles.tableAlignCenter}>
                        {g.rawScore ?? "-"}
                      </td>
                    )}
                    {showAvg && (
                      <td className={styles.tableAlignCenter}>
                        {g.classAverage ?? "-"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        return years.map((year) =>
          renderGradeTable(
            grades.filter((g) => g.year === year),
            `교과별 성적 — ${year}학년`
          )
        );
      })()}

      {/* Block 3: AI interpretation */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>✦</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>
              <span className={styles.markerSky}>성적 분석</span>
            </div>
            <div className={styles.aiCommentaryText}>
              {safeText(data.interpretation)}
            </div>
          </div>
        </div>
      </div>

      {/* Block 4a: Grade deviation analysis */}
      {hasContent(data.gradeDeviationAnalysis) && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>과목 간 편차 분석</div>
          </div>
          <div className={`${styles.cardGridThree} ${styles.mt12}`}>
            <div className={styles.miniStat}>
              <span className={styles.miniStatValue}>
                {data.gradeDeviationAnalysis!.highestSubject || "—"}
              </span>
              <span className={styles.miniStatLabel}>최고 과목</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniStatValue}>
                {data.gradeDeviationAnalysis!.lowestSubject || "—"}
              </span>
              <span className={styles.miniStatLabel}>최저 과목</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.miniStatValue}>
                {data.gradeDeviationAnalysis!.deviationRange ?? "—"}
              </span>
              <span className={styles.miniStatLabel}>편차 범위</span>
            </div>
          </div>
          {data.gradeDeviationAnalysis!.riskAssessment && (
            <p className={`${styles.body} ${styles.mt12}`}>
              {safeText(data.gradeDeviationAnalysis!.riskAssessment)}
            </p>
          )}
        </div>
      )}

      {/* Block 4b: Major relevance analysis */}
      {hasContent(data.majorRelevanceAnalysis) && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>전공 관련 교과 분석</div>
          </div>
          {data.majorRelevanceAnalysis!.enrollmentEffort && (
            <p className={`${styles.small} ${styles.mt8}`}>
              <span className={styles.emphasis}>이수 노력:</span>{" "}
              {safeText(data.majorRelevanceAnalysis!.enrollmentEffort)}
            </p>
          )}
          {data.majorRelevanceAnalysis!.achievement && (
            <p className={`${styles.small} ${styles.mt8}`}>
              <span className={styles.emphasis}>성취도:</span>{" "}
              {safeText(data.majorRelevanceAnalysis!.achievement)}
            </p>
          )}
          {Array.isArray(data.majorRelevanceAnalysis!.recommendedSubjects) &&
            data.majorRelevanceAnalysis!.recommendedSubjects.length > 0 && (
              <div className={`${styles.tagGroup} ${styles.mt12}`}>
                {data.majorRelevanceAnalysis!.recommendedSubjects.map(
                  (sub, i) => (
                    <span
                      key={typeof sub === "string" ? sub : i}
                      className={styles.tagAccent}
                    >
                      {typeof sub === "string" ? sub : String(sub)}
                    </span>
                  )
                )}
              </div>
            )}
        </div>
      )}

      {/* Block 5: Grade change analysis */}
      {hasContent(data.gradeChangeAnalysis) &&
        (() => {
          const gca = data.gradeChangeAnalysis!;
          return (
            <div className={styles.cardHighlight}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>등급 변화 분석</div>
                {gca.currentTrend && (
                  <span className={TREND_TAG_CLASS(gca.currentTrend, styles)}>
                    {TREND_ICON[gca.currentTrend]} {gca.currentTrend}
                  </span>
                )}
              </div>
              {gca.prediction && (
                <p className={styles.body}>{safeText(gca.prediction)}</p>
              )}
              {(gca.actionItems ?? []).length > 0 && (
                <>
                  <hr className={styles.dividerDotted} />
                  <div className={`${styles.overline} ${styles.mb8}`}>
                    <span className={styles.markerSky}>실행 항목</span>
                  </div>
                  <ol className={styles.numberedList}>
                    {gca.actionItems!.map((item, idx) => (
                      <li
                        key={toText(item)}
                        className={styles.numberedListItem}
                      >
                        <span className={styles.numberedListNumber}>
                          {idx + 1}
                        </span>
                        {toText(item)}
                        {gca.actionItemPriorities?.[idx] && (
                          <span
                            className={
                              styles[
                                `importance_${gca.actionItemPriorities[idx]}` as keyof typeof styles
                              ]
                            }
                            style={{ marginLeft: 6, whiteSpace: "nowrap" }}
                          >
                            {gca.actionItemPriorities[idx] === "high"
                              ? "★ 중요"
                              : gca.actionItemPriorities[idx] === "medium"
                                ? "● 보통"
                                : ""}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          );
        })()}

      {/* Block 6+: Career subjects — split into chunks of 5 */}
      {(() => {
        const raw = data.careerSubjectAnalyses;
        const cs = Array.isArray(raw) ? raw : [];
        if (cs.length === 0) return null;
        const chunks: (typeof cs)[] = [];
        for (let i = 0; i < cs.length; i += 5) {
          chunks.push(cs.slice(i, i + 5));
        }
        return chunks.map((chunk, ci) => (
          <div key={`career-${ci}`}>
            {ci === 0 && (
              <div className={styles.ceSubheading}>진로선택과목 분석</div>
            )}
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>과목</th>
                  <th className={styles.tableAlignCenter}>성취도</th>
                  <th>분석</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((item) => (
                  <tr key={item.subject}>
                    <td className={styles.tableCellBold}>{item.subject}</td>
                    <td className={styles.tableAlignCenter}>
                      {item.achievement || "—"}
                    </td>
                    <td className={styles.small}>
                      {safeText(item.interpretation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ));
      })()}

      {/* Block 6b: Small class subjects + grade inflation */}
      {((Array.isArray(data.smallClassSubjectAnalyses) &&
        data.smallClassSubjectAnalyses.length > 0) ||
        data.gradeInflationContext) && (
        <div>
          {Array.isArray(data.smallClassSubjectAnalyses) &&
            data.smallClassSubjectAnalyses.length > 0 && (
              <>
                <div className={styles.ceSubheading}>소인수 과목 분석</div>
                <table className={styles.compactTable}>
                  <thead>
                    <tr>
                      <th>과목</th>
                      <th className={styles.tableAlignCenter}>수강인원</th>
                      <th className={styles.tableAlignCenter}>성취수준</th>
                      <th>분석</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.smallClassSubjectAnalyses.map((sc) => (
                      <tr key={sc.subject}>
                        <td className={styles.tableCellBold}>{sc.subject}</td>
                        <td className={styles.tableAlignCenter}>
                          {sc.enrollmentSize}명
                        </td>
                        <td className={styles.tableAlignCenter}>
                          {sc.achievementLevel}
                          {sc.grade && ` (${sc.grade}등급)`}
                        </td>
                        <td className={styles.small}>
                          {safeText(sc.interpretation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

          {data.gradeInflationContext && (
            <div
              className={`${styles.callout} ${styles.calloutCaution} ${styles.mt12}`}
            >
              <div className={styles.calloutContent}>
                <span className={styles.emphasis}>등급 인플레이션:</span>{" "}
                {safeText(data.gradeInflationContext)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Block 7: Five grade simulation — 피드백 반영: 등급 변환 표시 제거
          5등급제 생기부는 5등급제 기준으로, 9등급제 생기부는 9등급제 기준으로 각 평가.
          변환 등급을 알려줄 필요 없음 */}

      {/* Block 8: University simulations + Improvement priority */}
      {((Array.isArray(data.universityGradeSimulations) &&
        data.universityGradeSimulations.length > 0) ||
        (Array.isArray(data.improvementPriority) &&
          data.improvementPriority.length > 0)) && (
        <div>
          {Array.isArray(data.universityGradeSimulations) &&
            data.universityGradeSimulations.length > 0 && (
              <>
                <div className={styles.ceSubheading}>
                  대학별 반영 방법 시뮬레이션
                </div>
                <table className={`${styles.table} ${styles.mb16}`}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: "nowrap" }}>대학</th>
                      <th style={{ whiteSpace: "nowrap", minWidth: 80 }}>
                        학과
                      </th>
                      <th className={styles.tableAlignCenter}>반영 방법</th>
                      <th
                        className={styles.tableAlignCenter}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        환산 점수
                      </th>
                      <th>해석</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.universityGradeSimulations.map((sim) => (
                      <tr key={`${sim.university}-${sim.department}`}>
                        <td
                          className={styles.tableCellBold}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {sim.university}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {sim.department}
                        </td>
                        <td className={styles.tableAlignCenter}>
                          {sim.reflectionMethod}
                        </td>
                        <td className={styles.tableAlignCenter}>
                          {sim.calculatedScore}
                        </td>
                        <td className={styles.small}>
                          {safeText(sim.interpretation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

          {Array.isArray(data.improvementPriority) &&
            data.improvementPriority.length > 0 && (
              <div className={styles.cardHighlight}>
                <div className={styles.cardTitle}>
                  <span className={styles.markerSky}>성적 개선 우선순위</span>
                </div>
                <ol className={`${styles.numberedList} ${styles.mt12}`}>
                  {data.improvementPriority.map((item, idx) => (
                    <li key={toText(item)} className={styles.numberedListItem}>
                      <span className={styles.numberedListNumber}>
                        {idx + 1}
                      </span>
                      {toText(item)}
                    </li>
                  ))}
                </ol>
              </div>
            )}
        </div>
      )}
    </>
  );
};
