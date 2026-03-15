import type { AdmissionStrategySection, ReportPlan } from "@/libs/report/types";

import { ReportBadge } from "./ReportBadge";
import styles from "./report.module.css";
import { safeText } from "./safe-text";
import { SectionHeader } from "./SectionHeader";

interface AdmissionStrategyRendererProps {
  data: AdmissionStrategySection;
  sectionNumber: number;
  plan?: ReportPlan;
}

export const AdmissionStrategyRenderer = ({
  data,
  sectionNumber,
  plan = "lite",
}: AdmissionStrategyRendererProps) => {
  return (
    <>
      {/* Block 1: Header + recommended path */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.cardAccent}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>추천 입시 경로</div>
          </div>
          <p className={`${styles.small} ${styles.mt6}`}>
            {safeText(data.recommendedPath)}
          </p>
        </div>
      </div>

      {/* Block 2: Simulation groups (위험형 + 안정형) */}
      {data.simulations?.map((sim) => (
        <div key={sim.type}>
          <div className={`${styles.h3} ${styles.mb8}`}>
            지원 조합 — {sim.type} 지원
          </div>
          <p className={`${styles.small} ${styles.mb12}`}>
            {safeText(sim.description)}
          </p>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>대학</th>
                <th>학과</th>
                <th className={styles.tableAlignCenter}>유형</th>
                <th>학종</th>
                <th>교과</th>
              </tr>
            </thead>
            <tbody>
              {(sim.cards ?? []).map((card, idx) => (
                <tr key={idx}>
                  <td className={styles.tableCellBold}>{card.university}</td>
                  <td className={styles.small}>{card.department}</td>
                  <td className={styles.tableAlignCenter}>
                    <span className={styles.tag}>{card.riskLevel}</span>
                  </td>
                  <td className={styles.tableAlignCenter}>
                    {card.comprehensive?.chance ? (
                      <ReportBadge chance={card.comprehensive.chance} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={styles.tableAlignCenter}>
                    {card.subject?.chance ? (
                      <ReportBadge chance={card.subject.chance} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Block 3: Card-by-card rationale */}
      {data.simulations?.[0]?.cards?.some(
        (c) => c.comprehensive?.chanceRationale
      ) && (
        <div>
          <div className={`${styles.h3} ${styles.mb12}`}>
            대학별 합격 가능성 분석
          </div>
        </div>
      )}
      {data.simulations
        ?.flatMap((sim) => sim.cards ?? [])
        .filter(
          (card, idx, arr) =>
            arr.findIndex(
              (c) =>
                c.university === card.university &&
                c.department === card.department
            ) === idx
        )
        .filter((card) => card.comprehensive?.chanceRationale)
        .map((card, idx) => (
          <div key={`rationale-${idx}`} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                {card.university} {card.department}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className={styles.tag}>{card.riskLevel}</span>
                {card.comprehensive?.chance && (
                  <ReportBadge chance={card.comprehensive.chance} />
                )}
              </div>
            </div>
            {/* 학종 분석 */}
            <div className={styles.mt6}>
              <p className={`${styles.caption} ${styles.mb4}`}>
                <span className={styles.emphasis}>학종</span>{" "}
                {card.comprehensive?.admissionType}
                {card.comprehensive?.chancePercentLabel &&
                  ` (${card.comprehensive.chancePercentLabel})`}
              </p>
              <p className={styles.small}>
                {safeText(card.comprehensive?.chanceRationale)}
              </p>
            </div>
            {/* 교과 분석 */}
            {card.subject && (
              <div className={styles.mt8}>
                <p className={`${styles.caption} ${styles.mb4}`}>
                  <span className={styles.emphasis}>교과</span>{" "}
                  {card.subject.admissionType}
                  {card.subject.chancePercentLabel &&
                    ` (${card.subject.chancePercentLabel})`}
                </p>
                <p className={styles.small}>
                  {safeText(card.subject.chanceRationale)}
                </p>
              </div>
            )}
          </div>
        ))}

      {/* Next semester strategy */}
      {data.nextSemesterStrategy && (
        <div>
          <div className={styles.cardAccent}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>다음 학기 전략</div>
            </div>
            <p className={`${styles.small} ${styles.mt6}`}>
              {safeText(data.nextSemesterStrategy)}
            </p>
          </div>
        </div>
      )}

      {/* Block 4: Type strategies */}
      {data.typeStrategies && data.typeStrategies.length > 0 && (
        <div>
          <div className={`${styles.h3} ${styles.mb12}`}>전형별 전략</div>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>전형</th>
                <th className={styles.tableAlignCenter}>적합도</th>
                <th>분석</th>
              </tr>
            </thead>
            <tbody>
              {data.typeStrategies.map((ts) => (
                <tr key={ts.type}>
                  <td className={styles.tableCellBold}>{ts.type}</td>
                  <td className={styles.tableAlignCenter}>
                    <span className={styles.tag}>{ts.suitability}</span>
                  </td>
                  <td>
                    <p className={styles.small}>{ts.analysis}</p>
                    <p
                      className={`${styles.caption} ${styles.mt4}`}
                      style={{ fontWeight: 700 }}
                    >
                      근거: {ts.reason}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Block 5: School type analysis */}
      {data.schoolTypeAnalysis && (
        <div>
          <div className={`${styles.h3} ${styles.mb8}`}>학교 유형 분석</div>
          <p className={styles.small}>{data.schoolTypeAnalysis.rationale}</p>
          <div className={`${styles.tagGroup} ${styles.mt8}`}>
            {(data.schoolTypeAnalysis.advantageTypes ?? []).map((t) => (
              <span key={t} className={styles.tag}>
                유리: {t}
              </span>
            ))}
            {(data.schoolTypeAnalysis.cautionTypes ?? []).map((t) => (
              <span key={t} className={styles.tag}>
                주의: {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Block 6: University guide matching */}
      {data.universityGuideMatching &&
        data.universityGuideMatching.length > 0 &&
        data.universityGuideMatching.map((match, idx) => {
          const m = match as any;
          const keywords: string[] = Array.isArray(m.emphasisKeywords)
            ? m.emphasisKeywords
            : Array.isArray(m.matchingKeywords)
              ? m.matchingKeywords
              : Array.isArray(m.keywords)
                ? m.keywords
                : [];
          const strengths: string[] = Array.isArray(m.studentStrengthMatch)
            ? m.studentStrengthMatch
            : [];
          const weaknesses: string[] = Array.isArray(m.studentWeaknessMatch)
            ? m.studentWeaknessMatch
            : [];
          const analysis: string | undefined =
            typeof m.analysis === "string"
              ? m.analysis
              : typeof m.matchingAnalysis === "string"
                ? m.matchingAnalysis
                : undefined;

          if (
            keywords.length === 0 &&
            strengths.length === 0 &&
            weaknesses.length === 0 &&
            !analysis
          )
            return null;

          return (
            <div key={idx} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  {m.university} {m.department ?? ""}
                </div>
              </div>
              {keywords.length > 0 && (
                <div className={`${styles.mt8}`}>
                  <div className={`${styles.overline} ${styles.mb4}`}>
                    핵심 키워드
                  </div>
                  <div className={styles.tagGroup}>
                    {keywords.map((kw) => (
                      <span key={kw} className={styles.tagAccent}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {strengths.length > 0 && (
                <div className={`${styles.mt12}`}>
                  <div className={`${styles.overline} ${styles.mb4}`}>
                    강점 매칭
                  </div>
                  <div className={styles.tagGroup}>
                    {strengths.map((s) => (
                      <span key={s} className={styles.tagStrength}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {weaknesses.length > 0 && (
                <div className={`${styles.mt12}`}>
                  <div className={`${styles.overline} ${styles.mb4}`}>
                    보완 필요
                  </div>
                  <div className={styles.tagGroup}>
                    {weaknesses.map((w) => (
                      <span key={w} className={styles.tagWeakness}>
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {analysis && (
                <div className={`${styles.mt12}`}>
                  <p className={styles.small}>{safeText(analysis)}</p>
                </div>
              )}
            </div>
          );
        })}
    </>
  );
};
