import type {
  AreaScoreRow,
  JeongsiScoreAnalysisSection,
} from "@/libs/jeongsi/report-types";
import type { ScoreArea } from "@/libs/jeongsi/types";

import styles from "./jeongsi-report.module.css";
import { JeongsiPartHeading } from "./JeongsiPartHeading";

interface JeongsiScoreAnalysisRendererProps {
  data: JeongsiScoreAnalysisSection;
  partNumber: string;
}

/** 표·차트의 고정 표시 순서. 순위와 무관하게 항상 같은 축을 유지한다 */
const AREA_ORDER: ScoreArea[] = ["korean", "math", "inquiry", "english"];

const EMPTY = "—";

const formatSigned = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(1)}`;

/** 분포 막대의 축 하한. 가장 낮은 백분위 아래 10점 단위로 끊는다 */
const axisMinOf = (percentiles: number[]): number =>
  Math.max(0, Math.floor((Math.min(...percentiles) - 5) / 10) * 10);

const toAxisPercent = (value: number, min: number): number =>
  Math.min(100, Math.max(0, ((value - min) / (100 - min)) * 100));

export const JeongsiScoreAnalysisRenderer = ({
  data,
  partNumber,
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
  ).filter((row): row is AreaScoreRow => row !== undefined);

  const scoredRows = orderedRows.filter(
    (row): row is AreaScoreRow & { percentile: number } =>
      row.percentile !== null && row.area !== "english"
  );
  const englishRow = orderedRows.find((row) => row.area === "english");
  const tableRows = orderedRows.filter((row) => row.area !== "english");

  const percentiles = scoredRows.map((row) => row.percentile);
  const spread =
    percentiles.length > 1
      ? Math.max(...percentiles) - Math.min(...percentiles)
      : null;
  const axisMin = percentiles.length > 0 ? axisMinOf(percentiles) : 0;
  const axisMid = Math.round((axisMin + 100) / 2);

  const fillColorOf = (area: ScoreArea): string => {
    if (strengthSet.has(area)) return "#34d399";
    if (weaknessSet.has(area)) return "#fca5a5";
    return "#a5b4fc";
  };

  /** 강점·약점으로 판정된 영역만 색을 입힌다 */
  const deviationClassOf = (area: ScoreArea): string => {
    if (strengthSet.has(area)) return styles.cellUp;
    if (weaknessSet.has(area)) return styles.cellDown;
    return styles.cellFlat;
  };

  const strengthRows = rows.filter((row) => strengthSet.has(row.area));
  const weaknessRows = rows.filter((row) => weaknessSet.has(row.area));

  const areaTitle = (prefix: string, items: AreaScoreRow[]): string =>
    items.length === 0
      ? `${prefix} · 해당 없음`
      : `${prefix} · ${items
          .map((row) =>
            row.percentile === null
              ? row.label
              : `${row.label} 백분위 ${row.percentile}`
          )
          .join(", ")}`;

  return (
    <>
      {/* Block 1: 제목 + 요약 수치 */}
      <div>
        <JeongsiPartHeading
          partNumber={partNumber}
          title={data.title}
          lead="영역별 위치와 강점·약점 구조를 진단합니다. 순위·편차는 백분위가 있는 국어·수학·탐구로 계산합니다."
        />
        <div className={styles.statGrid}>
          <div className={styles.statCell}>
            <span className={styles.statLabel}>국·수·탐 평균 백분위</span>
            <span className={styles.statValue}>
              {averagePercentile.toFixed(1)}
            </span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statLabel}>표준점수 합 (국+수+탐)</span>
            <span className={styles.statValue}>{totalStandardScore}</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statLabel}>영역 간 백분위 차이</span>
            <span className={styles.statValue}>
              {spread === null ? EMPTY : spread.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Block 2: 영역별 성적 표 */}
      <div>
        <div className={styles.blockTitle}>영역별 성적</div>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>영역</th>
              <th className={styles.cellLeft}>응시 과목</th>
              <th>표준점수</th>
              <th>백분위</th>
              <th>순위</th>
              <th>평균 대비</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.area}>
                <td className={styles.cellBold}>
                  {row.label}
                  {strengthSet.has(row.area) && (
                    <span className={styles.strengthTag}>강점</span>
                  )}
                  {weaknessSet.has(row.area) && (
                    <span className={styles.weaknessTag}>약점</span>
                  )}
                </td>
                <td className={styles.cellLeft}>{row.subjectName ?? EMPTY}</td>
                <td>{row.standardScore ?? EMPTY}</td>
                <td className={styles.cellBold}>{row.percentile ?? EMPTY}</td>
                <td>{row.rank ?? EMPTY}</td>
                <td
                  className={
                    row.deviation === null
                      ? undefined
                      : deviationClassOf(row.area)
                  }
                >
                  {row.deviation === null ? EMPTY : formatSigned(row.deviation)}
                </td>
              </tr>
            ))}
            {englishRow && (
              <tr className={styles.rowMuted}>
                <td>영어</td>
                <td className={styles.cellLeft} colSpan={5}>
                  {englishRow.grade === null
                    ? "등급 미입력"
                    : `${englishRow.grade}등급`}{" "}
                  · 절대평가라 백분위·순위 비교에서 제외 (대학별 등급 점수로
                  반영)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Block 3: 백분위 분포 */}
      {scoredRows.length > 0 && (
        <div>
          <div className={styles.blockTitle}>
            백분위 분포{" "}
            <span className={styles.blockTitleSub}>
              · 축 {axisMin}–100, 점선은 국·수·탐 평균{" "}
              {averagePercentile.toFixed(1)}
            </span>
          </div>
          <div className={styles.distBars}>
            {scoredRows.map((row) => (
              <div key={row.area} className={styles.distRow}>
                <span className={styles.distLabel}>{row.label}</span>
                <div className={styles.distTrack}>
                  <div
                    className={styles.distFill}
                    style={{
                      width: `${toAxisPercent(row.percentile, axisMin)}%`,
                      background: fillColorOf(row.area),
                    }}
                  />
                  <div
                    className={styles.distAverage}
                    style={{
                      left: `${toAxisPercent(averagePercentile, axisMin)}%`,
                    }}
                  />
                </div>
                <span className={styles.distValue}>{row.percentile}</span>
              </div>
            ))}
            <div className={styles.distRow}>
              <span />
              <div className={styles.distAxis}>
                <span>{axisMin}</span>
                <span>{axisMid}</span>
                <span>100</span>
              </div>
              <span />
            </div>
          </div>
        </div>
      )}

      {/* Block 4: 강점 / 약점 */}
      <div className={styles.areaCards}>
        <div className={`${styles.areaCard} ${styles.areaCardStrength}`}>
          <span className={styles.areaCardTitleStrength}>
            {areaTitle("강점", strengthRows)}
          </span>
          <p className={styles.areaCardText}>{strengthComment}</p>
        </div>
        <div className={`${styles.areaCard} ${styles.areaCardWeakness}`}>
          <span className={styles.areaCardTitleWeakness}>
            {areaTitle("약점", weaknessRows)}
          </span>
          <p className={styles.areaCardText}>{weaknessComment}</p>
        </div>
      </div>

      {/* Block 5: 총평 */}
      <div className={styles.insightBox}>
        <span className={styles.insightLabel}>컨설턴트 해석</span>
        <p className={styles.insightText}>{overallComment}</p>
      </div>
    </>
  );
};
