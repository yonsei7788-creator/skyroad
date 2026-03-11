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

      {/* Block 2: Recommendations — tierGrouped: each group its own block */}
      {data.tierGroupedRecommendations ? (
        data.tierGroupedRecommendations.map((group) => (
          <div key={group.tierGroup}>
            <div className={`${styles.h3} ${styles.mb8}`}>
              추천 대학 — {group.tierGroup} 조합
            </div>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>대학</th>
                  <th>학과</th>
                  <th>전형</th>
                  <th className={styles.tableAlignCenter}>전략</th>
                  {(group.recommendations ?? []).some((r) => r.chance) && (
                    <th className={styles.tableAlignCenter}>가능성</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(group.recommendations ?? []).map((rec, idx) => (
                  <tr key={idx}>
                    <td className={styles.tableCellBold}>{rec.university}</td>
                    <td className={styles.small}>{rec.department}</td>
                    <td className={styles.small}>{rec.admissionType}</td>
                    <td className={styles.tableAlignCenter}>
                      <ReportBadge strategy={rec.tier} />
                    </td>
                    {(group.recommendations ?? []).some((r) => r.chance) && (
                      <td className={styles.tableAlignCenter}>
                        {rec.chance ? <ReportBadge chance={rec.chance} /> : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <div>
          <div className={`${styles.h3} ${styles.mb12}`}>추천 대학</div>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>대학</th>
                <th>학과</th>
                <th>전형</th>
                <th className={styles.tableAlignCenter}>전략</th>
                {(data.recommendations ?? []).some((r) => r.chance) && (
                  <th className={styles.tableAlignCenter}>가능성</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(data.recommendations ?? []).map((rec, idx) => (
                <tr key={idx}>
                  <td className={styles.tableCellBold}>{rec.university}</td>
                  <td className={styles.small}>{rec.department}</td>
                  <td className={styles.small}>{rec.admissionType}</td>
                  <td className={styles.tableAlignCenter}>
                    <ReportBadge strategy={rec.tier} />
                  </td>
                  {(data.recommendations ?? []).some((r) => r.chance) && (
                    <td className={styles.tableAlignCenter}>
                      {rec.chance ? <ReportBadge chance={rec.chance} /> : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Next semester strategy — separate block */}
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

      {/* Block 3: Chance rationale */}
      {(data.recommendations ?? []).some((r) => r.chanceRationale) && (
        <div>
          <div className={`${styles.h3} ${styles.mb12}`}>
            대학별 합격 가능성 분석
          </div>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>대학 · 학과</th>
                <th>분석</th>
              </tr>
            </thead>
            <tbody>
              {(data.recommendations ?? [])
                .filter((r) => r.chanceRationale)
                .map((rec, idx) => (
                  <tr key={idx}>
                    <td className={styles.tableCellBold}>
                      {rec.university} {rec.department}
                    </td>
                    <td className={styles.small}>{rec.chanceRationale}</td>
                  </tr>
                ))}
            </tbody>
          </table>
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
                    <p className={`${styles.caption} ${styles.mt4}`}>
                      <span className={styles.emphasis}>근거:</span> {ts.reason}
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

      {/* Block 6: CSAT minimum strategy */}
      {data.csatMinimumStrategy && (
        <div>
          <div className={`${styles.h3} ${styles.mb8}`}>수능 최저 전략</div>
          <p className={styles.small}>{safeText(data.csatMinimumStrategy)}</p>
        </div>
      )}

      {/* Block 7: Application simulation */}
      {data.applicationSimulation && (
        <div>
          <div className={`${styles.h3} ${styles.mb8}`}>
            지원 조합 시뮬레이션
          </div>
          <p className={`${styles.small} ${styles.mb12}`}>
            {data.applicationSimulation.description}
          </p>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>전형</th>
                <th className={styles.tableAlignCenter}>지원 수</th>
                <th>목표 대학</th>
              </tr>
            </thead>
            <tbody>
              {(data.applicationSimulation.details ?? []).map((detail, idx) => (
                <tr key={idx}>
                  <td className={styles.tableCellBold}>
                    {detail.admissionType}
                  </td>
                  <td className={styles.tableAlignCenter}>{detail.count}</td>
                  <td className={styles.small}>
                    {(detail.targetUniversities ?? []).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Block 8: University guide matching */}
      {data.universityGuideMatching &&
        data.universityGuideMatching.length > 0 && (
          <div>
            <div className={`${styles.h3} ${styles.mb12}`}>
              대학별 인재상 매칭
            </div>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: "nowrap" }}>대학</th>
                  <th>핵심 키워드</th>
                  <th>강점 매칭</th>
                  <th style={{ minWidth: 120 }}>보완 필요</th>
                </tr>
              </thead>
              <tbody>
                {data.universityGuideMatching.map((match, idx) => (
                  <tr key={idx}>
                    <td className={styles.tableCellBold}>{match.university}</td>
                    <td>
                      <div className={styles.tagGroup}>
                        {(Array.isArray(match.emphasisKeywords)
                          ? match.emphasisKeywords
                          : []
                        ).map((kw) => (
                          <span key={kw} className={styles.tag}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className={styles.tagGroup}>
                        {(Array.isArray(match.studentStrengthMatch)
                          ? match.studentStrengthMatch
                          : []
                        ).map((s) => (
                          <span key={s} className={styles.tag}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ minWidth: 120, overflow: "visible" }}>
                      <div className={styles.tagGroup}>
                        {(Array.isArray(match.studentWeaknessMatch)
                          ? match.studentWeaknessMatch
                          : []
                        ).map((w) => (
                          <span key={w} className={styles.tag}>
                            {w}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Block 9: Risk bands (v4) — hidden for premium */}
      {plan !== "premium" &&
        data.universityRiskBands &&
        data.universityRiskBands.length > 0 && (
          <div>
            <div className={`${styles.h3} ${styles.mb12}`}>
              대학별 리스크 밴드
            </div>
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>대학</th>
                  <th>학과</th>
                  <th className={styles.tableAlignCenter}>리스크</th>
                  <th>근거</th>
                </tr>
              </thead>
              <tbody>
                {data.universityRiskBands.map((rb, idx) => (
                  <tr key={idx}>
                    <td className={styles.tableCellBold}>{rb.university}</td>
                    <td className={styles.small}>{rb.department}</td>
                    <td className={styles.tableAlignCenter}>
                      <span className={styles.tag}>{rb.band}</span>
                    </td>
                    <td className={styles.small}>{rb.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
};
