import type { CompetencyCategory, WordCloudSection } from "@/libs/report/types";

import styles from "./report.module.css";
import { SectionHeader } from "./SectionHeader";

interface WordCloudRendererProps {
  data: WordCloudSection;
  sectionNumber: number;
}

const CATEGORY_LABEL: Record<CompetencyCategory, string> = {
  academic: "학업",
  career: "진로",
  community: "공동체",
  growth: "성장",
};

export const WordCloudRenderer = ({
  data,
  sectionNumber,
}: WordCloudRendererProps) => {
  const sorted = [...data.words].sort((a, b) => b.frequency - a.frequency);

  return (
    <div>
      <SectionHeader number={sectionNumber} title={data.title} />

      <table className={styles.compactTable}>
        <thead>
          <tr>
            <th>키워드</th>
            <th className={styles.tableAlignCenter}>빈도</th>
            <th className={styles.tableAlignCenter}>영역</th>
            <th>키워드</th>
            <th className={styles.tableAlignCenter}>빈도</th>
            <th className={styles.tableAlignCenter}>영역</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(sorted.length / 2) }).map(
            (_, rowIdx) => {
              const left = sorted[rowIdx * 2];
              const right = sorted[rowIdx * 2 + 1];
              return (
                <tr key={rowIdx}>
                  <td className={styles.tableCellBold}>{left?.text}</td>
                  <td className={styles.tableAlignCenter}>{left?.frequency}</td>
                  <td className={styles.tableAlignCenter}>
                    {left?.category ? (
                      <span className={styles.tag}>
                        {CATEGORY_LABEL[left.category]}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={styles.tableCellBold}>{right?.text ?? ""}</td>
                  <td className={styles.tableAlignCenter}>
                    {right?.frequency ?? ""}
                  </td>
                  <td className={styles.tableAlignCenter}>
                    {right?.category ? (
                      <span className={styles.tag}>
                        {CATEGORY_LABEL[right.category]}
                      </span>
                    ) : right ? (
                      "—"
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
};
