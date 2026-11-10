"use client";

import { useState } from "react";

import {
  JEONGSI_MOCK_REPORT,
  JEONGSI_MOCK_REPORT_BLOCKED,
  JEONGSI_MOCK_REPORT_EDGE,
  JEONGSI_MOCK_REPORT_MEDICAL,
} from "@/libs/jeongsi/mock-data";
import type { JeongsiReportContent } from "@/libs/jeongsi/report-types";

import { JeongsiReport } from "../_report";
import styles from "../_report/jeongsi-report.module.css";
// scripts/jeongsi/build-preview-samples.ts 생성물 — 실데이터 엔진 결과(AI 해설 제외)
import realDataSamples from "./real-data-samples.json";

const REAL_SAMPLES = realDataSamples as unknown as {
  label: string;
  content: JeongsiReportContent;
}[];

const TABS: { label: string; report: JeongsiReportContent }[] = [
  ...REAL_SAMPLES.map((sample) => ({
    label: sample.label,
    report: sample.content,
  })),
  { label: "목 · 기본 케이스", report: JEONGSI_MOCK_REPORT },
  { label: "목 · 극단 케이스", report: JEONGSI_MOCK_REPORT_EDGE },
  { label: "목 · 지원 불가", report: JEONGSI_MOCK_REPORT_BLOCKED },
  { label: "목 · 의약 극상위", report: JEONGSI_MOCK_REPORT_MEDICAL },
];

const JeongsiPreviewPage = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className={styles.previewNotice}>
        정시 분석 리포트 프리뷰 — 「실데이터」 탭은 2027 실데이터로 엔진이
        계산한 결과(AI 해설은 폴백 문구), 「목」 탭은 디자인 검증용 샘플입니다.
      </div>

      <div className={styles.previewBar}>
        {TABS.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`${styles.previewTab} ${
              activeIndex === index ? styles.previewTabActive : ""
            }`}
          >
            {tab.label}
          </button>
        ))}

        <button
          type="button"
          onClick={handlePrint}
          className={styles.previewButton}
        >
          인쇄
        </button>
      </div>

      <JeongsiReport data={TABS[activeIndex].report} />
    </div>
  );
};

export default JeongsiPreviewPage;
