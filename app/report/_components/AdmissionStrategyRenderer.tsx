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
            <div className={styles.cardTitle}>
              <span className={styles.markerSky}>추천 입시 경로</span>
            </div>
          </div>
          <p className={`${styles.small} ${styles.mt6}`}>
            {safeText(data.recommendedPath)}
          </p>
        </div>
      </div>

      {/* Block 2: 대학 추천 (단일 테이블) */}
      {(() => {
        const allCards =
          data.simulations
            ?.flatMap((sim) => sim.cards ?? [])
            .filter(
              (card, idx, arr) =>
                arr.findIndex(
                  (c) =>
                    c.university === card.university &&
                    c.department === card.department
                ) === idx
            ) ?? [];
        const desc = data.simulations?.[0]?.description;
        if (allCards.length === 0) {
          return desc ? (
            <div>
              <div className={`${styles.h3} ${styles.mb8}`}>대학 추천</div>
              <div className={styles.card}>
                <p className={styles.small}>
                  실기 전형이 포함된 예체능 학과는 실기 성적에 따라 합격 여부가
                  크게 달라지므로, 추천 대학을 제공하지 않습니다.
                </p>
              </div>
            </div>
          ) : null;
        }
        // 새 구조: recommendedAdmissionType이 있으면 추천 전형 표시
        const isNewFormat = allCards.some(
          (card) => card.recommendedAdmissionType
        );
        console.log(allCards);

        return (
          <div>
            <div className={`${styles.h3} ${styles.mb8}`}>대학 추천</div>
            {isNewFormat && (
              <p className={`${styles.small} ${styles.mb12}`}>
                <span className={styles.markerYellow}>
                  추천된 학교, 학과, 전형은 합격 가능성이 있거나 인재상에
                  부합하는 최적의 선택지만 선별했습니다.
                </span>
              </p>
            )}
            {!isNewFormat && desc && (
              <p className={`${styles.small} ${styles.mb12}`}>
                {safeText(desc)}
              </p>
            )}
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>대학</th>
                  <th>학과</th>
                  {isNewFormat ? (
                    <th>추천 전형</th>
                  ) : (
                    <>
                      <th>학종</th>
                      <th>교과</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {allCards.map((card, idx) => (
                  <tr key={idx}>
                    <td className={styles.tableCellBold}>{card.university}</td>
                    <td className={styles.small}>{card.department}</td>
                    {isNewFormat ? (
                      <td className={styles.small}>
                        {["학생부종합전형", "학종"].includes(
                          card.recommendedAdmissionType ?? ""
                        )
                          ? "학생부종합"
                          : ["학생부교과전형", "교과"].includes(
                                card.recommendedAdmissionType ?? ""
                              )
                            ? "학생부교과"
                            : "—"}
                      </td>
                    ) : (
                      <>
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
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

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

      {/* Block 4: Type strategies — 제목은 첫 카드에 포함 */}
      {(data.typeStrategies ?? []).map((ts, tsIdx) => (
        <div key={ts.type}>
          {tsIdx === 0 && (
            <div className={`${styles.h3} ${styles.mb12}`}>
              <span className={styles.markerSky}>전형별 전략</span>
            </div>
          )}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>{ts.type}</div>
              <span className={styles.tag}>{ts.suitability}</span>
            </div>
            <p className={`${styles.small} ${styles.mt6}`}>{ts.analysis}</p>
            <p
              className={`${styles.caption} ${styles.mt4}`}
              style={{ fontWeight: 700 }}
            >
              근거: {ts.reason}
            </p>
          </div>
        </div>
      ))}

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

      {/* Block 6: University guide matching — 1대학 1카드 (태그+분석 통합) */}
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

          const title = `${m.university} ${m.department ?? ""}`;

          return (
            <div key={`guide-${idx}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>{title}</div>
              </div>
              {keywords.length > 0 && (
                <div className={styles.mt8}>
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
                <div className={styles.mt12}>
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
                <div className={styles.mt12}>
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
                <div
                  className={styles.mt8}
                  style={{
                    paddingTop: 8,
                    borderTop: "1px solid var(--report-border)",
                  }}
                >
                  <p className={styles.small}>{safeText(analysis)}</p>
                </div>
              )}
            </div>
          );
        })}
    </>
  );
};
