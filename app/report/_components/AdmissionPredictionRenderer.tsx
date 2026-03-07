import type {
  AdmissionPredictionSection,
  ReportPlan,
} from "@/libs/report/types";

import { ReportBadge } from "./ReportBadge";
import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface AdmissionPredictionRendererProps {
  data: AdmissionPredictionSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

const TYPE_LABEL: Record<string, string> = {
  학종: "학생부종합전형",
  교과: "학생부교과전형",
  정시: "수능(정시)전형",
};

const FULL_TYPE_NAME: Record<string, string> = {
  학종: "학생부종합전형",
  교과: "학생부교과전형",
  정시: "수능(정시)전형",
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

  const mainCards = (data.predictions ?? []).filter(
    (p) => p.universityPredictions && p.universityPredictions.length > 0
  );
  const simpleCards = (data.predictions ?? []).filter(
    (p) => !p.universityPredictions || p.universityPredictions.length === 0
  );

  const allCards = [...mainCards, ...simpleCards];

  return (
    <>
      {/* Block 1: Header + Banner + first prediction card */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={bannerClass}>
          <div className={styles.admissionBannerRow}>
            <span className={styles.admissionBannerOverline}>추천 전형</span>
            <span className={styles.admissionBannerType}>
              {TYPE_LABEL[data.recommendedType] ?? data.recommendedType}
            </span>
          </div>
        </div>

        <div className={styles.admissionSectionLabel}>전형별 합격 예측</div>

        {allCards.length > 0 &&
          (() => {
            const [pred] = allCards;
            return (
              <div className={cardClass}>
                <div className={styles.admissionCardHeader}>
                  <span className={styles.admissionCardType}>
                    {FULL_TYPE_NAME[pred.admissionType] ?? pred.admissionType}
                  </span>
                  <span className={styles.admissionCardRate}>
                    {pred.passRateLabel}
                  </span>
                </div>
                <p className={styles.admissionCardAnalysis}>
                  {safeText(pred.analysis)}
                </p>
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
            );
          })()}
      </div>

      {/* Remaining prediction cards — each as its own block */}
      {allCards.slice(1).map((pred, idx) => (
        <div key={pred.admissionType ?? idx}>
          <div className={cardClass}>
            <div className={styles.admissionCardHeader}>
              <span className={styles.admissionCardType}>
                {FULL_TYPE_NAME[pred.admissionType] ?? pred.admissionType}
              </span>
              <span className={styles.admissionCardRate}>
                {pred.passRateLabel}
              </span>
            </div>
            <p className={styles.admissionCardAnalysis}>
              {safeText(pred.analysis)}
            </p>
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
        </div>
      ))}

      {/* Final block: AI commentary */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>AI</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>종합 코멘트</div>
            <div className={styles.aiCommentaryText}>
              {safeText(data.overallComment)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
