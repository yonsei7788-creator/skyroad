import type {
  AdmissionPredictionSection,
  ReportPlan,
} from "@/libs/report/types";

import { ReportBadge } from "./ReportBadge";
import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface AdmissionPredictionRendererProps {
  data: AdmissionPredictionSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

const TYPE_LABEL: Record<string, string> = {
  학종: "학생부종합전형 추천",
  교과: "학생부교과전형 추천",
  정시: "정시전형 추천",
};

export const AdmissionPredictionRenderer = ({
  data,
  sectionNumber,
  plan = "lite",
}: AdmissionPredictionRendererProps) => {
  const isPremium = plan === "premium";
  const isStandard = plan === "standard";

  const bannerClass = isPremium
    ? styles.admissionBannerPremium
    : isStandard
      ? styles.admissionBannerStandard
      : styles.admissionBanner;

  const cardClass = isPremium
    ? styles.admissionCardPremium
    : isStandard
      ? styles.admissionCardStandard
      : styles.admissionCard;

  const mainCards = data.predictions.filter(
    (p) => p.universityPredictions && p.universityPredictions.length > 0
  );
  const simpleCards = data.predictions.filter(
    (p) => !p.universityPredictions || p.universityPredictions.length === 0
  );

  return (
    <>
      {/* Block 1: Header + Banner + Prediction cards */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={bannerClass}>
          <div className={styles.admissionBannerRow}>
            <span className={styles.admissionBannerOverline}>추천 전형</span>
            <span className={styles.admissionBannerType}>
              {data.recommendedType}
            </span>
            <span className={styles.tagAccent}>
              {TYPE_LABEL[data.recommendedType] ?? data.recommendedType}
            </span>
          </div>
        </div>

        <div className={styles.admissionSectionLabel}>전형별 합격 예측</div>

        {mainCards.map((pred) => (
          <div key={pred.admissionType} className={cardClass}>
            <div className={styles.admissionCardHeader}>
              <span className={styles.admissionCardType}>
                {pred.admissionType}
              </span>
              <span className={styles.admissionCardRate}>
                {pred.passRateLabel}
              </span>
            </div>
            <p className={styles.admissionCardAnalysis}>{pred.analysis}</p>

            {pred.universityPredictions &&
              pred.universityPredictions.length > 0 && (
                <div className={styles.admissionUniList}>
                  {pred.universityPredictions.map((up) => (
                    <div
                      key={`${up.university}-${up.department}`}
                      className={styles.admissionUniRow}
                    >
                      <span className={styles.admissionUniName}>
                        {up.university}
                      </span>
                      <span className={styles.admissionUniDept}>
                        {up.department}
                      </span>
                      <ReportBadge chance={up.chance} />
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}

        {simpleCards.length > 0 && (
          <div className={styles.admissionSimpleGrid}>
            {simpleCards.map((pred) => (
              <div key={pred.admissionType} className={cardClass}>
                <div className={styles.admissionCardHeader}>
                  <span className={styles.admissionCardType}>
                    {pred.admissionType}
                  </span>
                  <span className={styles.admissionCardRate}>
                    {pred.passRateLabel}
                  </span>
                </div>
                <p className={styles.admissionCardAnalysis}>{pred.analysis}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block 2: AI commentary */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>AI</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>종합 코멘트</div>
            <div className={styles.aiCommentaryText}>{data.overallComment}</div>
          </div>
        </div>
      </div>
    </>
  );
};
