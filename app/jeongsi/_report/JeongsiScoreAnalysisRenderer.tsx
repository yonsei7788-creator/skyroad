import type { JeongsiScoreAnalysisSection } from "@/libs/jeongsi/report-types";
import type { ScoreArea } from "@/libs/jeongsi/types";

import {
  ReportBarChart,
  ReportTable,
  SectionHeader,
} from "../../report/_components";
import reportStyles from "../../report/_components/report.module.css";
import styles from "./jeongsi-report.module.css";

interface JeongsiScoreAnalysisRendererProps {
  data: JeongsiScoreAnalysisSection;
  sectionNumber: number;
}

/** 표·차트의 고정 표시 순서. 순위와 무관하게 항상 동일한 축을 유지한다 */
const AREA_ORDER: ScoreArea[] = ["korean", "math", "english", "inquiry"];

const AREA_LABEL: Record<ScoreArea, string> = {
  korean: "국어",
  math: "수학",
  english: "영어",
  inquiry: "탐구",
};

const EMPTY = "—";

const formatNumber = (value: number | null): string =>
  value === null ? EMPTY : String(value);

const formatDeviation = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

export const JeongsiScoreAnalysisRenderer = ({
  data,
  sectionNumber,
}: JeongsiScoreAnalysisRendererProps) => {
  const {
    rows,
    averagePercentile,
    totalStandardScore,
    strengthAreas,
    weaknessAreas,
    overallComment,
    strengthComment,
    weaknessComment,
  } = data;

  const strengthSet = new Set(strengthAreas);
  const weaknessSet = new Set(weaknessAreas);

  const orderedRows = AREA_ORDER.map((area) =>
    rows.find((row) => row.area === area)
  ).filter((row): row is (typeof rows)[number] => row !== undefined);

  const topArea = rows.find((row) => row.rank === 1);

  const chartRows = orderedRows.filter((row) => row.percentile !== null);
  const missingChartRows = orderedRows.filter((row) => row.percentile === null);

  const getBarColor = (area: ScoreArea): string => {
    if (strengthSet.has(area)) return "var(--report-strength)";
    if (weaknessSet.has(area)) return "var(--report-weakness)";
    return "var(--report-accent)";
  };

  const deviationClass = (value: number): string => {
    if (value > 0) return `${styles.deviationChip} ${styles.deviationUp}`;
    if (value < 0) return `${styles.deviationChip} ${styles.deviationDown}`;
    return `${styles.deviationChip} ${styles.deviationFlat}`;
  };

  return (
    <>
      {/* Block 1: 헤더 + 요약 수치 */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <span className={styles.statCardLabel}>평균 백분위</span>
            <div className={styles.statCardValueRow}>
              <span className={styles.statCardValue}>
                {averagePercentile.toFixed(1)}
              </span>
              <span className={styles.statCardUnit}>%ile</span>
            </div>
            <span className={styles.statCardNote}>국어 · 수학 · 탐구 기준</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statCardLabel}>표준점수 합</span>
            <div className={styles.statCardValueRow}>
              <span className={styles.statCardValue}>{totalStandardScore}</span>
              <span className={styles.statCardUnit}>점</span>
            </div>
            <span className={styles.statCardNote}>국어 + 수학 + 탐구 합산</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statCardLabel}>최강 영역</span>
            <div className={styles.statCardValueRow}>
              <span className={styles.statCardValue}>
                {topArea ? topArea.label : EMPTY}
              </span>
              <span className={styles.statCardUnit}>1순위</span>
            </div>
            <span className={styles.statCardNote}>
              {topArea?.subjectName ?? "국어·수학·탐구 중 상대 순위 기준"}
            </span>
          </div>
        </div>
      </div>

      {/* Block 2: 영역별 상세 표 */}
      <div>
        <div className={styles.blockLabel}>영역별 성적 상세</div>
        <ReportTable
          data={orderedRows}
          keyExtractor={(row) => row.area}
          columns={[
            {
              key: "area",
              header: "영역",
              render: (row) => (
                <span className={reportStyles.tableCellBold}>{row.label}</span>
              ),
            },
            {
              key: "subject",
              header: "응시 과목",
              render: (row) => (
                <span className={reportStyles.small}>
                  {row.subjectName ?? EMPTY}
                </span>
              ),
            },
            {
              key: "standardScore",
              header: "표준점수",
              align: "center",
              render: (row) => formatNumber(row.standardScore),
            },
            {
              key: "percentile",
              header: "백분위",
              align: "center",
              render: (row) => formatNumber(row.percentile),
            },
            {
              key: "grade",
              header: "등급",
              align: "center",
              render: (row) =>
                row.grade === null ? EMPTY : `${row.grade}등급`,
            },
            {
              key: "rank",
              header: "순위",
              align: "center",
              render: (row) =>
                row.rank === null ? (
                  EMPTY
                ) : (
                  <span
                    className={`${styles.rankMark} ${
                      row.rank === 1 ? styles.rankMarkTop : ""
                    }`}
                  >
                    {row.rank}
                  </span>
                ),
            },
            {
              key: "deviation",
              header: "평균 대비",
              align: "center",
              render: (row) =>
                row.deviation === null ? (
                  EMPTY
                ) : (
                  <span className={deviationClass(row.deviation)}>
                    {formatDeviation(row.deviation)}
                  </span>
                ),
            },
          ]}
        />
        <p className={styles.noteLine}>
          순위와 평균 대비는 국어·수학·탐구 평균 백분위{" "}
          {averagePercentile.toFixed(1)}을 기준으로 합니다. 영어는 등급만
          발표되므로 순위·편차에 넣지 않습니다.
        </p>
      </div>

      {/* Block 3: 영역별 백분위 차트 */}
      <div>
        <div className={styles.blockLabel}>영역별 백분위 분포</div>

        {chartRows.length === 0 ? (
          <div className={styles.nullNotice}>
            백분위가 입력된 영역이 없어 분포를 표시할 수 없습니다.
          </div>
        ) : (
          <>
            <div className={styles.chartFix}>
              <ReportBarChart
                data={chartRows.map((row) => ({
                  name: row.label,
                  value: row.percentile ?? 0,
                  color: getBarColor(row.area),
                }))}
                height={180}
                yDomain={[0, 100]}
                formatTooltip={(value) => String(value)}
              />
            </div>
            <div className={reportStyles.chartLegend}>
              <span className={reportStyles.chartLegendItem}>
                <span
                  className={reportStyles.chartLegendDot}
                  style={{ background: "var(--report-strength)" }}
                />
                강점 영역
              </span>
              <span className={reportStyles.chartLegendItem}>
                <span
                  className={reportStyles.chartLegendDot}
                  style={{ background: "var(--report-accent)" }}
                />
                평균 수준
              </span>
              <span className={reportStyles.chartLegendItem}>
                <span
                  className={reportStyles.chartLegendDot}
                  style={{ background: "var(--report-weakness)" }}
                />
                약점 영역
              </span>
            </div>
            {missingChartRows.length > 0 && (
              <p className={styles.noteLine}>
                {missingChartRows.map((row) => row.label).join(" · ")} 영역은
                백분위가 없어(등급만 발표) 차트에서 제외했습니다.
              </p>
            )}
          </>
        )}
      </div>

      {/* Block 4: 강점 / 약점 */}
      <div>
        <div className={styles.blockLabel}>강점과 약점</div>
        <div className={styles.areaSplit}>
          <div className={`${styles.areaPanel} ${styles.areaPanelStrength}`}>
            <div className={styles.areaPanelHead}>
              <span className={styles.areaPanelLabel}>강점 영역</span>
              <div className={styles.areaPanelTags}>
                {strengthAreas.length === 0 ? (
                  <span className={styles.nullValue}>해당 없음</span>
                ) : (
                  strengthAreas.map((area) => (
                    <span key={area} className={styles.areaTagStrength}>
                      {AREA_LABEL[area]}
                    </span>
                  ))
                )}
              </div>
            </div>
            <p className={styles.areaPanelText}>{strengthComment}</p>
          </div>

          <div className={`${styles.areaPanel} ${styles.areaPanelWeakness}`}>
            <div className={styles.areaPanelHead}>
              <span className={styles.areaPanelLabel}>약점 영역</span>
              <div className={styles.areaPanelTags}>
                {weaknessAreas.length === 0 ? (
                  <span className={styles.nullValue}>해당 없음</span>
                ) : (
                  weaknessAreas.map((area) => (
                    <span key={area} className={styles.areaTagWeakness}>
                      {AREA_LABEL[area]}
                    </span>
                  ))
                )}
              </div>
            </div>
            <p className={styles.areaPanelText}>{weaknessComment}</p>
          </div>
        </div>
      </div>

      {/* Block 5: 총평 */}
      <div>
        <div className={reportStyles.aiCommentary}>
          <div className={reportStyles.aiCommentaryIcon}>✦</div>
          <div className={reportStyles.aiCommentaryContent}>
            <div className={reportStyles.aiCommentaryLabel}>
              <span className={reportStyles.markerSky}>성적 총평</span>
            </div>
            <div className={reportStyles.aiCommentaryText}>
              {overallComment}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
