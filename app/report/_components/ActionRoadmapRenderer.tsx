import type { ActionRoadmapSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { renderInsightMarkers } from "./insight-marker";
import { SectionHeader } from "./SectionHeader";

interface ActionRoadmapRendererProps {
  data: ActionRoadmapSection;
  sectionNumber: number;
}

export const ActionRoadmapRenderer = ({
  data,
  sectionNumber,
}: ActionRoadmapRendererProps) => {
  return (
    <>
      {/* Block 1: Header + completion strategy */}
      <div>
        <SectionHeader number={sectionNumber} title={data.title} />

        <div className={styles.cardAccent}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <span className={styles.markerSky}>생기부 마무리 전략</span>
            </div>
          </div>
          <p className={`${styles.small} ${styles.mt6}`}>
            {renderInsightMarkers(data.completionStrategy)}
          </p>
        </div>
      </div>

      {/* Block 2: Milestones (v4) + Prewrite proposals */}
      {((data.milestones?.length ?? 0) > 0 ||
        (data.prewriteProposals?.length ?? 0) > 0) && (
        <div>
          {data.milestones && data.milestones.length > 0 && (
            <>
              <div className={`${styles.h3} ${styles.mb12}`}>핵심 마일스톤</div>
              <table className={styles.compactTable}>
                <thead>
                  <tr>
                    <th>마일스톤</th>
                    <th className={styles.tableAlignCenter}>마감</th>
                    <th className={styles.tableAlignCenter}>우선순위</th>
                    <th>예상 효과</th>
                  </tr>
                </thead>
                <tbody>
                  {data.milestones.map((ms) => (
                    <tr key={ms.id}>
                      <td>
                        <span className={styles.tableCellBold}>{ms.title}</span>
                        <span className={`${styles.caption} ${styles.ml8}`}>
                          {ms.category}
                        </span>
                      </td>
                      <td
                        className={`${styles.tableAlignCenter} ${styles.caption}`}
                      >
                        {ms.deadline}
                      </td>
                      <td className={styles.tableAlignCenter}>
                        <span className={styles.tag}>{ms.priority}</span>
                      </td>
                      <td className={styles.small}>{ms.estimatedImpact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {data.prewriteProposals && data.prewriteProposals.length > 0 && (
            <>
              <div
                className={`${styles.h3} ${data.milestones?.length ? styles.mt24 : ""} ${styles.mb8}`}
              >
                사전 준비 활동 제안
              </div>
              <div className={styles.caption}>
                {data.prewriteProposals.map((proposal, idx) => (
                  <p key={idx} className={idx > 0 ? styles.mt4 : undefined}>
                    {idx + 1}. {proposal}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Block 3: Evaluation writing guide */}
      {data.evaluationWritingGuide &&
        ((data.evaluationWritingGuide.structure?.length ?? 0) > 0 ||
          data.evaluationWritingGuide.goodExample ||
          data.evaluationWritingGuide.badExample) && (
          <div>
            <div className={`${styles.h3} ${styles.mb8}`}>
              세특 서술 전략 가이드
            </div>

            <div className={`${styles.overline} ${styles.mb6}`}>서술 구조</div>
            <div className={styles.caption}>
              {(data.evaluationWritingGuide.structure ?? []).map(
                (item, idx) => (
                  <p key={idx} className={idx > 0 ? styles.mt4 : undefined}>
                    {idx + 1}. {item}
                  </p>
                )
              )}
            </div>

            <div className={`${styles.callout} ${styles.mt16}`}>
              <div className={styles.calloutContent}>
                <span className={styles.emphasis}>좋은 예시:</span>{" "}
                {data.evaluationWritingGuide.goodExample}
              </div>
            </div>

            <p className={`${styles.small} ${styles.mt12}`}>
              <span className={styles.emphasis}>개선 필요 예시:</span>{" "}
              {data.evaluationWritingGuide.badExample}
            </p>
          </div>
        )}

      {/* Block 4: Projected outcome (v4) + interview timeline */}
      {((data.projectedOutcome?.length ?? 0) > 0 || data.interviewTimeline) && (
        <div>
          {data.projectedOutcome && data.projectedOutcome.length > 0 && (
            <>
              <div className={`${styles.h3} ${styles.mb12}`}>
                예상 성과 전망
              </div>
              <table className={styles.compactTable}>
                <thead>
                  <tr>
                    <th>영역</th>
                    <th className={styles.tableAlignCenter}>현재</th>
                    <th className={styles.tableAlignCenter}>예상</th>
                    <th className={styles.tableAlignCenter}>변화</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projectedOutcome.map((po) => (
                    <tr key={po.category}>
                      <td className={styles.tableCellBold}>{po.category}</td>
                      <td className={styles.tableAlignCenter}>
                        {po.currentScore}
                      </td>
                      <td
                        className={`${styles.tableAlignCenter} ${styles.tableCellBold}`}
                      >
                        {po.projectedScore}
                      </td>
                      <td className={styles.tableAlignCenter}>
                        +{po.projectedScore - po.currentScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {data.interviewTimeline && (
            <div
              className={`${styles.aiCommentary} ${data.projectedOutcome?.length ? styles.mt20 : ""}`}
            >
              <div className={styles.aiCommentaryIcon}>✦</div>
              <div className={styles.aiCommentaryContent}>
                <div className={styles.aiCommentaryLabel}>
                  <span className={styles.markerSky}>면접 대비 타임라인</span>
                </div>
                <div className={styles.aiCommentaryText}>
                  {renderInsightMarkers(data.interviewTimeline)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
