import type { AcademicAnalysisSection } from "@/libs/report/types";

import styles from "./report.module.css";
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
  grades.some((g) => g.rawScore !== undefined);

const hasClassAvg = (grades: AcademicAnalysisSection["subjectGrades"]) =>
  grades.some((g) => g.classAverage !== undefined);

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
              {data.overallAverageGrade.toFixed(2)}
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
              {data.subjectGrades.length}
            </span>
            <span className={styles.statCardLargeLabel}>분석 교과 수</span>
          </div>
        </div>

        <div className={styles.ceSubheading}>학기별 평균 등급</div>
        <table className={styles.gradeTable}>
          <thead>
            <tr>
              <th>학년</th>
              <th className={styles.tableAlignCenter}>학기</th>
              <th className={styles.tableAlignCenter}>평균 등급</th>
            </tr>
          </thead>
          <tbody>
            {data.gradesByYear.map((row) => (
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
                  {row.averageGrade.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Block 2: Subject combination + Subject grades table */}
      <div>
        {data.subjectCombinations.length > 0 && (
          <>
            <div className={styles.ceSubheading}>교과 조합별 평균</div>
            <table className={`${styles.table} ${styles.mb16}`}>
              <thead>
                <tr>
                  <th>조합</th>
                  <th className={styles.tableAlignCenter}>평균 등급</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectCombinations.map((combo) => (
                  <tr key={combo.combination}>
                    <td className={styles.tableCellBold}>
                      {combo.combination}
                    </td>
                    <td
                      className={`${styles.tableAlignCenter} ${styles.fontBold}`}
                      style={{ color: GRADE_COLOR(combo.averageGrade) }}
                    >
                      {combo.averageGrade.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className={styles.ceSubheading}>교과별 성적</div>
        <table className={styles.gradeTable}>
          <thead>
            <tr>
              <th>교과</th>
              <th className={styles.tableAlignCenter}>학년</th>
              <th className={styles.tableAlignCenter}>학기</th>
              <th className={styles.tableAlignCenter}>등급</th>
              {showRaw && <th className={styles.tableAlignCenter}>원점수</th>}
              {showAvg && <th className={styles.tableAlignCenter}>평균</th>}
            </tr>
          </thead>
          <tbody>
            {data.subjectGrades.map((g) => (
              <tr
                key={`${g.subject}-${g.year}-${g.semester}`}
                className={GRADE_ROW_CLASS(g.grade, styles)}
              >
                <td className={styles.tableCellBold}>{g.subject}</td>
                <td className={styles.tableAlignCenter}>{g.year}</td>
                <td className={styles.tableAlignCenter}>{g.semester}</td>
                <td
                  className={`${styles.tableAlignCenter} ${styles.fontBold}`}
                  style={{ color: GRADE_COLOR(g.grade) }}
                >
                  {g.grade}등급
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

      {/* Block 3: AI interpretation + stat analyses */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>AI</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>성적 분석</div>
            <div className={styles.aiCommentaryText}>{data.interpretation}</div>
          </div>
        </div>

        {data.subjectStatAnalyses && data.subjectStatAnalyses.length > 0 && (
          <div className={styles.mt16}>
            <div className={styles.ceSubheading}>원점수-평균-표준편차 분석</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>교과</th>
                  <th className={styles.tableAlignCenter}>Z점수</th>
                  <th className={styles.tableAlignCenter}>추정 백분위</th>
                  <th>해석</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectStatAnalyses.map((stat) => (
                  <tr key={`${stat.subject}-${stat.year}-${stat.semester}`}>
                    <td className={styles.tableCellBold}>{stat.subject}</td>
                    <td className={styles.tableAlignCenter}>
                      {stat.zScore.toFixed(2)}
                    </td>
                    <td className={styles.tableAlignCenter}>
                      {stat.percentileEstimate}%
                    </td>
                    <td className={styles.small}>{stat.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Block 4: Deviation + Major relevance + School type */}
      {(data.gradeDeviationAnalysis ||
        data.majorRelevanceAnalysis ||
        data.schoolTypeAdjustment) && (
        <div>
          {data.gradeDeviationAnalysis && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>과목 간 편차 분석</div>
              </div>
              <div className={`${styles.cardGridThree} ${styles.mt12}`}>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>
                    {data.gradeDeviationAnalysis.highestSubject}
                  </span>
                  <span className={styles.miniStatLabel}>최고 과목</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>
                    {data.gradeDeviationAnalysis.lowestSubject}
                  </span>
                  <span className={styles.miniStatLabel}>최저 과목</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>
                    {data.gradeDeviationAnalysis.deviationRange}
                  </span>
                  <span className={styles.miniStatLabel}>편차 범위</span>
                </div>
              </div>
              <p className={`${styles.body} ${styles.mt12}`}>
                {data.gradeDeviationAnalysis.riskAssessment}
              </p>
            </div>
          )}

          {data.majorRelevanceAnalysis && (
            <div className={`${styles.card} ${styles.mt12}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>전공 관련 교과 분석</div>
              </div>
              <p className={`${styles.small} ${styles.mt8}`}>
                <span className={styles.emphasis}>이수 노력:</span>{" "}
                {data.majorRelevanceAnalysis.enrollmentEffort}
              </p>
              <p className={`${styles.small} ${styles.mt8}`}>
                <span className={styles.emphasis}>성취도:</span>{" "}
                {data.majorRelevanceAnalysis.achievement}
              </p>
              {data.majorRelevanceAnalysis.recommendedSubjects &&
                data.majorRelevanceAnalysis.recommendedSubjects.length > 0 && (
                  <div className={`${styles.tagGroup} ${styles.mt12}`}>
                    {data.majorRelevanceAnalysis.recommendedSubjects.map(
                      (sub) => (
                        <span key={sub} className={styles.tagAccent}>
                          {sub}
                        </span>
                      )
                    )}
                  </div>
                )}
            </div>
          )}

          {data.schoolTypeAdjustment && (
            <div className={`${styles.callout} ${styles.mt12}`}>
              <div className={styles.calloutContent}>
                <span className={styles.emphasis}>학교 유형 보정:</span>{" "}
                {data.schoolTypeAdjustment}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Block 5: Grade change analysis */}
      {data.gradeChangeAnalysis && (
        <div className={styles.cardHighlight}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>등급 변화 분석</div>
            <span
              className={TREND_TAG_CLASS(
                data.gradeChangeAnalysis.currentTrend,
                styles
              )}
            >
              {TREND_ICON[data.gradeChangeAnalysis.currentTrend]}{" "}
              {data.gradeChangeAnalysis.currentTrend}
            </span>
          </div>
          <p className={styles.body}>{data.gradeChangeAnalysis.prediction}</p>
          <hr className={styles.dividerDotted} />
          <div className={`${styles.overline} ${styles.mb8}`}>실행 항목</div>
          <ol className={styles.numberedList}>
            {data.gradeChangeAnalysis.actionItems.map((item, idx) => (
              <li key={item} className={styles.numberedListItem}>
                <span className={styles.numberedListNumber}>{idx + 1}</span>
                {item}
                {data.gradeChangeAnalysis?.actionItemPriorities?.[idx] && (
                  <span
                    className={
                      styles[
                        `importance_${data.gradeChangeAnalysis.actionItemPriorities[idx]}` as keyof typeof styles
                      ]
                    }
                    style={{ marginLeft: 6 }}
                  >
                    {data.gradeChangeAnalysis.actionItemPriorities[idx] ===
                    "high"
                      ? "★ 중요"
                      : data.gradeChangeAnalysis.actionItemPriorities[idx] ===
                          "medium"
                        ? "● 보통"
                        : "○ 참고"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Block 6: Career subjects + Small class subjects */}
      {((data.careerSubjectAnalyses && data.careerSubjectAnalyses.length > 0) ||
        (data.smallClassSubjectAnalyses &&
          data.smallClassSubjectAnalyses.length > 0)) && (
        <div>
          {data.careerSubjectAnalyses &&
            data.careerSubjectAnalyses.length > 0 && (
              <>
                <div className={styles.ceSubheading}>진로선택과목 분석</div>
                <div className={styles.ceCardGrid}>
                  {data.careerSubjectAnalyses.map((cs) => (
                    <div key={cs.subject} className={styles.card}>
                      <div className={styles.cardTitle}>{cs.subject}</div>
                      <p className={`${styles.small} ${styles.mt8}`}>
                        <span className={styles.emphasis}>성취도:</span>{" "}
                        {cs.achievement}
                      </p>
                      <p className={`${styles.small} ${styles.mt4}`}>
                        <span className={styles.emphasis}>분포:</span>{" "}
                        {cs.achievementDistribution}
                      </p>
                      <p className={`${styles.small} ${styles.mt4}`}>
                        {cs.interpretation}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

          {data.smallClassSubjectAnalyses &&
            data.smallClassSubjectAnalyses.length > 0 && (
              <div className={styles.mt16}>
                <div className={styles.ceSubheading}>소인수 과목 분석</div>
                <div className={styles.ceCardGrid}>
                  {data.smallClassSubjectAnalyses.map((sc) => (
                    <div key={sc.subject} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>{sc.subject}</div>
                        <span className={styles.tag}>
                          {sc.enrollmentSize}명
                        </span>
                      </div>
                      <p className={`${styles.small} ${styles.mt6}`}>
                        <span className={styles.emphasis}>성취수준:</span>{" "}
                        {sc.achievementLevel}
                      </p>
                      {sc.grade && (
                        <p className={`${styles.small} ${styles.mt4}`}>
                          <span className={styles.emphasis}>등급:</span>{" "}
                          {sc.grade}
                        </p>
                      )}
                      <p className={`${styles.small} ${styles.mt4}`}>
                        {sc.interpretation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {data.gradeInflationContext && (
            <div
              className={`${styles.callout} ${styles.calloutCaution} ${styles.mt12}`}
            >
              <div className={styles.calloutContent}>
                <span className={styles.emphasis}>등급 인플레이션:</span>{" "}
                {data.gradeInflationContext}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Block 7: Five grade simulation */}
      {data.fiveGradeSimulation &&
        data.fiveGradeSimulation.length > 0 &&
        (() => {
          const fgSim = data.fiveGradeSimulation;
          const showPercentile = fgSim.some(
            (sim) => sim.percentileCumulative !== undefined
          );
          return (
            <div>
              <div className={styles.ceSubheading}>5등급제 전환 시뮬레이션</div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>교과</th>
                    <th className={styles.tableAlignCenter}>현재 등급</th>
                    <th className={styles.tableAlignCenter}>전환 등급</th>
                    {showPercentile && (
                      <th className={styles.tableAlignCenter}>누적 백분위</th>
                    )}
                    <th>해석</th>
                  </tr>
                </thead>
                <tbody>
                  {fgSim.map((sim) => (
                    <tr key={sim.subject}>
                      <td className={styles.tableCellBold}>{sim.subject}</td>
                      <td className={styles.tableAlignCenter}>
                        {sim.currentGrade}
                      </td>
                      <td className={styles.tableAlignCenter}>
                        {sim.simulatedGrade}
                      </td>
                      {showPercentile && (
                        <td className={styles.tableAlignCenter}>
                          {sim.percentileCumulative !== undefined
                            ? `${sim.percentileCumulative}%`
                            : "—"}
                        </td>
                      )}
                      <td className={styles.small}>{sim.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

      {/* Block 8: University simulations + Improvement priority */}
      {((data.universityGradeSimulations &&
        data.universityGradeSimulations.length > 0) ||
        (data.improvementPriority && data.improvementPriority.length > 0)) && (
        <div>
          {data.universityGradeSimulations &&
            data.universityGradeSimulations.length > 0 && (
              <>
                <div className={styles.ceSubheading}>
                  대학별 반영 방법 시뮬레이션
                </div>
                <table className={`${styles.table} ${styles.mb16}`}>
                  <thead>
                    <tr>
                      <th>대학</th>
                      <th>학과</th>
                      <th className={styles.tableAlignCenter}>반영 방법</th>
                      <th className={styles.tableAlignCenter}>환산 점수</th>
                      <th>해석</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.universityGradeSimulations.map((sim) => (
                      <tr key={`${sim.university}-${sim.department}`}>
                        <td className={styles.tableCellBold}>
                          {sim.university}
                        </td>
                        <td>{sim.department}</td>
                        <td className={styles.tableAlignCenter}>
                          {sim.reflectionMethod}
                        </td>
                        <td className={styles.tableAlignCenter}>
                          {sim.calculatedScore}
                        </td>
                        <td className={styles.small}>{sim.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

          {data.improvementPriority && data.improvementPriority.length > 0 && (
            <div className={styles.cardHighlight}>
              <div className={styles.cardTitle}>성적 개선 우선순위</div>
              <ol className={`${styles.numberedList} ${styles.mt12}`}>
                {data.improvementPriority.map((item, idx) => (
                  <li key={item} className={styles.numberedListItem}>
                    <span className={styles.numberedListNumber}>{idx + 1}</span>
                    {item}
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
