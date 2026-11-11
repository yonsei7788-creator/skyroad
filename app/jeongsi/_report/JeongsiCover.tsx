import type { JeongsiReportMeta } from "@/libs/jeongsi/report-types";

import reportStyles from "../../report/_components/report.module.css";
import styles from "./jeongsi-report.module.css";

interface JeongsiCoverProps {
  meta: JeongsiReportMeta;
}

interface ScoreCell {
  area: string;
  value: string;
  sub: string;
}

const buildScoreCells = (meta: JeongsiReportMeta): ScoreCell[] => {
  const { korean, math, english, inquiry1, inquiry2 } = meta.input.score;

  return [
    {
      area: "국어",
      value: `${korean.standardScore}`,
      sub: `${korean.elective} · 백분위 ${korean.percentile}`,
    },
    {
      area: "수학",
      value: `${math.standardScore}`,
      sub: `${math.elective} · 백분위 ${math.percentile}`,
    },
    {
      area: "영어",
      value: `${english.grade}등급`,
      sub: "절대평가",
    },
    {
      area: "탐구",
      value: `${inquiry1.standardScore} · ${inquiry2.standardScore}`,
      sub: `${inquiry1.subject} · ${inquiry2.subject}`,
    },
  ];
};

export const JeongsiCover = ({ meta }: JeongsiCoverProps) => {
  const { input, createdAt } = meta;
  const { preference, score } = input;

  const date = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={reportStyles.coverPage} data-page data-cover>
      <div className={reportStyles.coverCornerTR} />
      <div className={reportStyles.coverCornerBL} />

      {/* 브랜드 + 리포트 종류 */}
      <div className={reportStyles.coverHeader}>
        <div className={reportStyles.coverBrand}>
          시대 <span className={reportStyles.coverBrandAccent}>컨설팅</span>
        </div>
        <div className={reportStyles.coverPlanBadge}>Jeongsi Report</div>
      </div>

      {/* 제목 */}
      <div className={reportStyles.coverMain}>
        <h1 className={reportStyles.coverTitle}>
          2027학년도
          <br />
          정시 지원 분석 리포트
        </h1>

        <div className={reportStyles.coverDivider} />

        <p className={reportStyles.coverSubtitle}>
          수능 성적을 대학별 환산식으로 다시 계산해
          <br />
          {preference.target} 지원 전략을 설계합니다.
        </p>
      </div>

      {/* 수능 성적 요약 */}
      <div className={styles.coverScoreGrid}>
        {buildScoreCells(meta).map((cell) => (
          <div key={cell.area} className={styles.coverScoreCell}>
            <span className={styles.coverScoreArea}>{cell.area}</span>
            <span className={styles.coverScoreValue}>{cell.value}</span>
            <span className={styles.coverScoreSub}>{cell.sub}</span>
          </div>
        ))}
      </div>

      {/* 희망 조건 */}
      <div className={reportStyles.coverStudentCard}>
        <div className={reportStyles.coverStudentRow}>
          <span className={reportStyles.coverStudentLabel}>희망 학과</span>
          <span className={reportStyles.coverStudentValue}>
            {preference.target}
            {preference.targetKind === "field" ? " (계열 단위)" : ""}
          </span>
        </div>
        <div className={reportStyles.coverStudentRow}>
          <span className={reportStyles.coverStudentLabel}>희망 지역</span>
          <span className={reportStyles.coverStudentValue}>
            {preference.region}
          </span>
        </div>
        <div className={reportStyles.coverStudentRow}>
          <span className={reportStyles.coverStudentLabel}>지원 성향</span>
          <span className={reportStyles.coverStudentValue}>
            {preference.risk}
          </span>
        </div>
        <div className={reportStyles.coverStudentRow}>
          <span className={reportStyles.coverStudentLabel}>한국사</span>
          <span className={reportStyles.coverStudentValue}>
            {score.history.grade}등급
          </span>
        </div>
        <div className={reportStyles.coverStudentRow}>
          <span className={reportStyles.coverStudentLabel}>발행일</span>
          <span className={reportStyles.coverStudentValue}>{date}</span>
        </div>
      </div>
    </div>
  );
};
