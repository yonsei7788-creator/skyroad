/**
 * `/jeongsi/preview` 의 실데이터 탭용 리포트 샘플 생성기
 *
 * 실데이터(libs/jeongsi/data/*.json)로 엔진을 돌려 리포트 콘텐츠를 만든다.
 * AI 해설은 호출하지 않으므로 해설 칸에는 폴백 문구가 들어간다 — 수치·구성
 * 검증용이다. 데이터를 다시 만들면 이 스크립트도 다시 돌린다.
 *
 * Usage: npx tsx scripts/jeongsi/build-preview-samples.ts
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { analyzeJeongsi } from "../../libs/jeongsi/engine/analyze.ts";
import { buildJeongsiReport } from "../../libs/jeongsi/report/build.ts";

import type { JeongsiReportContent } from "../../libs/jeongsi/report-types.ts";
import type { JeongsiInput } from "../../libs/jeongsi/types.ts";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "app",
  "jeongsi",
  "preview",
  "real-data-samples.json"
);

interface SampleSpec {
  label: string;
  input: JeongsiInput;
}

const SAMPLES: SampleSpec[] = [
  {
    label: "실데이터 · 상위권 이과",
    input: {
      score: {
        examYear: 2026,
        korean: { elective: "언어와매체", standardScore: 131, percentile: 96 },
        math: { elective: "미적분", standardScore: 137, percentile: 98 },
        english: { grade: 2 },
        inquiry1: { subject: "물리학I", standardScore: 68, percentile: 93 },
        inquiry2: { subject: "지구과학I", standardScore: 65, percentile: 88 },
        history: { grade: 2 },
      },
      preference: {
        target: "컴퓨터공학과",
        targetKind: "department",
        region: "서울",
        risk: "균형",
      },
    },
  },
  {
    label: "실데이터 · 중위권 문과",
    input: {
      score: {
        examYear: 2026,
        korean: { elective: "화법과작문", standardScore: 118, percentile: 82 },
        math: { elective: "확률과통계", standardScore: 120, percentile: 84 },
        english: { grade: 3 },
        inquiry1: { subject: "사회문화", standardScore: 62, percentile: 85 },
        inquiry2: { subject: "생활과윤리", standardScore: 60, percentile: 80 },
        history: { grade: 3 },
      },
      preference: {
        target: "경영학과",
        targetKind: "department",
        region: "전국",
        risk: "안정",
      },
    },
  },
  {
    label: "실데이터 · 의약 최상위",
    input: {
      score: {
        examYear: 2026,
        korean: { elective: "언어와매체", standardScore: 139, percentile: 99 },
        math: { elective: "미적분", standardScore: 145, percentile: 100 },
        english: { grade: 1 },
        inquiry1: { subject: "화학I", standardScore: 72, percentile: 99 },
        inquiry2: { subject: "생명과학I", standardScore: 71, percentile: 98 },
        history: { grade: 1 },
      },
      preference: {
        target: "의예과",
        targetKind: "department",
        region: "전국",
        risk: "공격",
      },
    },
  },
];

const main = async (): Promise<void> => {
  const samples: { label: string; content: JeongsiReportContent }[] = [];
  for (const [index, sample] of SAMPLES.entries()) {
    const analysis = await analyzeJeongsi(sample.input);
    const content = await buildJeongsiReport(analysis, {
      reportId: `preview-real-${index + 1}`,
    });
    samples.push({ label: sample.label, content });
  }
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(samples)}\n`, "utf-8");
  console.log(`${samples.length}개 샘플 → ${OUTPUT_PATH}`);
};

void main();
