import { Check, X } from "lucide-react";

import { FadeIn } from "../../_components/FadeIn";
import styles from "./ComparisonTable.module.css";

type FeatureValue = boolean | string;

interface ComparisonFeature {
  name: string;
  lite: FeatureValue;
  standard: FeatureValue;
  premium: FeatureValue;
}

const FEATURES: ComparisonFeature[] = [
  {
    name: "리포트 분량",
    lite: "18~20p",
    standard: "40~50p",
    premium: "50~60p",
  },
  { name: "학생 유형 + 역량 점수", lite: true, standard: true, premium: true },
  {
    name: "성적 분석 + 권장과목 이수",
    lite: true,
    standard: true,
    premium: true,
  },
  { name: "출결 · 창체 · 행동특성", lite: true, standard: true, premium: true },
  {
    name: "교과 세특 분석",
    lite: "5과목",
    standard: "7과목",
    premium: "10과목+",
  },
  {
    name: "예상 면접 질문",
    lite: "3개",
    standard: "5개 + 출제 의도",
    premium: "8개 + 모범 답변",
  },
  { name: "AI 학과 추천", lite: true, standard: true, premium: true },
  {
    name: "희망 학교·학과 합격 판단",
    lite: false,
    standard: true,
    premium: true,
  },
  {
    name: "세특 주제 추천",
    lite: false,
    standard: "3개",
    premium: "5개 + 활동 설계",
  },
  {
    name: "부족한 부분 + 보완 전략",
    lite: false,
    standard: false,
    premium: true,
  },
  {
    name: "입시 전략 + 지원 조합 추천",
    lite: false,
    standard: false,
    premium: true,
  },
  { name: "실행 로드맵", lite: false, standard: false, premium: true },
  {
    name: "전임 컨설턴트 2차 검수",
    lite: true,
    standard: true,
    premium: true,
  },
];

const CellValue = ({ value }: { value: FeatureValue }) => {
  if (typeof value === "string") {
    return <span className={styles.cellText}>{value}</span>;
  }
  if (value) {
    return (
      <Check
        size={18}
        className={`${styles.cellIcon} ${styles.cellIconSuccess}`}
      />
    );
  }
  return (
    <X size={18} className={`${styles.cellIcon} ${styles.cellIconMuted}`} />
  );
};

export const ComparisonTable = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>Compare</p>
          <h2 className={styles.sectionTitle}>플랜별 상세 비교</h2>
          <p className={styles.sectionSubtitle}>
            어떤 차이가 있는지 한눈에 확인하세요
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.headerRow}>
                  <th className={styles.headerFeature}>기능</th>
                  <th className={styles.headerPlan}>Lite</th>
                  <th
                    className={`${styles.headerPlan} ${styles.headerPopular}`}
                  >
                    Standard
                  </th>
                  <th className={styles.headerPlan}>Premium</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => (
                  <tr key={feature.name} className={styles.row}>
                    <td className={styles.featureCell}>{feature.name}</td>
                    <td className={styles.valueCell}>
                      <CellValue value={feature.lite} />
                    </td>
                    <td
                      className={`${styles.valueCell} ${styles.valueCellPopular}`}
                    >
                      <CellValue value={feature.standard} />
                    </td>
                    <td className={styles.valueCell}>
                      <CellValue value={feature.premium} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
