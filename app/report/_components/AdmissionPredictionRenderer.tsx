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
  고른기회: "고른기회전형",
};

const FULL_TYPE_NAME: Record<string, string> = {
  학종: "학생부종합전형",
  교과: "학생부교과전형",
  정시: "수능(정시)전형",
  고른기회: "고른기회전형",
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

  const allPredictions = data.predictions ?? [];
  const hasAnyUniversityPredictions = allPredictions.some(
    (p) => p.universityPredictions && p.universityPredictions.length > 0
  );

  const mainCards = allPredictions.filter(
    (p) => p.universityPredictions && p.universityPredictions.length > 0
  );
  const simpleCards = allPredictions.filter(
    (p) => !p.universityPredictions || p.universityPredictions.length === 0
  );

  const allCards = [...mainCards, ...simpleCards];

  return (
    <>
      {/* Block 1: Header + Banner */}
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

        <div className={styles.admissionSectionLabel}>전형별 합격 판단</div>
      </div>

      {/* Each prediction card as its own block for page splitting */}
      {allCards.map((pred, idx) => (
        <div key={pred.admissionType ?? idx}>
          <div className={cardClass}>
            <div className={styles.admissionCardHeader}>
              <span className={styles.admissionCardType}>
                {FULL_TYPE_NAME[pred.admissionType] ?? pred.admissionType}
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

      {/* 실기 예체능 안내 */}
      {!hasAnyUniversityPredictions && (
        <div>
          <div className={styles.card}>
            <p className={styles.small}>
              실기 전형이 포함된 예체능 학과는 실기 성적에 따라 합격 여부가 크게
              달라지므로, 추천 대학을 제공하지 않습니다.
            </p>
          </div>
        </div>
      )}

      {/* Final block: AI commentary */}
      <div>
        <div className={styles.aiCommentary}>
          <div className={styles.aiCommentaryIcon}>✦</div>
          <div className={styles.aiCommentaryContent}>
            <div className={styles.aiCommentaryLabel}>
              <span className={styles.markerSky}>종합 코멘트</span>
            </div>
            <div className={styles.aiCommentaryText}>
              {safeText(data.overallComment)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
