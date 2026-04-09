import type { ReportPlan, StudentProfileSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface StudentProfileRendererProps {
  data: StudentProfileSection;
  sectionNumber: number;
  plan?: ReportPlan;
}

const CATEGORY_LABEL: Record<string, string> = {
  academic: "학업 역량",
  career: "진로 역량",
  community: "공동체 역량",
  growth: "발전 가능성",
};

const IDENTITY_STYLE: Record<string, string> = {
  lite: "",
  standard: "profileIdentityStandard",
  premium: "profileIdentityPremium",
};

export const StudentProfileRenderer = ({
  data,
  sectionNumber,
  plan = "lite",
}: StudentProfileRendererProps) => {
  const radarEntries = Object.entries(data.radarChart ?? {}) as [
    string,
    number,
  ][];
  const totalScore = radarEntries.reduce((sum, [, v]) => sum + v, 0);
  const isPremium = plan === "premium";
  const monogramChar = (data.typeName ?? "?").charAt(0);

  const identityClass = IDENTITY_STYLE[plan]
    ? styles[IDENTITY_STYLE[plan] as keyof typeof styles]
    : styles.profileIdentity;

  return (
    <div className={styles.section}>
      <SectionHeader number={sectionNumber} title={data.title} />

      {/* Type identity card */}
      <div className={identityClass ?? styles.profileIdentity}>
        <div
          className={
            isPremium ? styles.profileMonogramPremium : styles.profileMonogram
          }
        >
          {monogramChar}
        </div>
        <div className={styles.profileTypeInfo}>
          <div className={styles.profileTypeName}>{data.typeName}</div>
          <p className={styles.profileTypeDesc}>
            {safeText(data.typeDescription)}
          </p>
        </div>
      </div>

      {/* Competency stats */}
      <div className={styles.profileStatsLabel}>역량 프로필</div>
      <div className={styles.profileStatsGrid}>
        {radarEntries.map(([key, value], i) => (
          <div
            key={key}
            className={
              i === 0 ? styles.profileStatBlockPrimary : styles.profileStatBlock
            }
          >
            <div className={styles.profileStatLabel}>
              {CATEGORY_LABEL[key] ?? key}
            </div>
            <div
              className={
                i === 0
                  ? styles.profileStatValueAccent
                  : styles.profileStatValue
              }
            >
              {value}
            </div>
            <div className={styles.profileStatDenom}>/100</div>
            {isPremium && (
              <div className={styles.profileStatBar}>
                <div
                  className={styles.profileStatBarFill}
                  style={{ width: `${value}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tags */}
      <div className={styles.profileTags}>
        {(data.tags ?? []).map((tag, idx) => (
          <span key={`tag-${idx}`} className={styles.profileTag}>
            {String(tag)}
          </span>
        ))}
      </div>

      {/* Catch phrase */}
      <div
        className={
          isPremium
            ? styles.profileCatchPhrasePremium
            : styles.profileCatchPhrase
        }
      >
        <span className={styles.profileCatchPhraseText}>
          {safeText(data.catchPhrase)}
        </span>
      </div>
    </div>
  );
};
