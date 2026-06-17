import type { CompetencyAxis, CompetencyHighlightItem } from "../types.ts";

/**
 * 5축 세분화 레이더 결정적 재집계 (신규 리포트 v5+).
 *
 * 기존 4대 역량(학업/진로/공동체/발전가능성)의 하위항목 점수를
 * 5개 소비자 친화 축(내신/세특/전공적합성/비교과/성장성)으로 결정적 변환한다.
 * 추가 AI 추정 없이 이미 확정된 점수만 사용하므로 사실 정합성이 보장된다.
 *
 * 매핑:
 * - 내신       = (학업성취도 + 교과성취도) / 만점 × 100
 * - 세특       = (탐구력 + 진로탐색) / 만점 × 100
 * - 전공적합성 = 진로역량 총점 (0~100)
 * - 비교과     = 공동체역량 총점 (0~100)
 * - 성장성     = 발전가능성 점수 (0~100)
 */

interface RawSubScore {
  name?: string;
  score?: number;
  maxScore?: number;
  comment?: string;
}

interface RawCategoryScore {
  category?: string;
  label?: string;
  score?: number;
  subcategories?: RawSubScore[];
}

const clamp100 = (n: number): number =>
  Math.max(0, Math.min(100, Math.round(n)));

const norm = (score: number, max: number): number =>
  max > 0 ? (score / max) * 100 : 0;

export const buildCompetencyAxes = (
  scores: RawCategoryScore[],
  growthScore: number
): CompetencyAxis[] => {
  const findCat = (cat: string) => scores.find((sc) => sc.category === cat);

  const subOf = (
    cat: string,
    nameIncludes: string
  ): { score: number; max: number } => {
    const c = findCat(cat);
    const sub = c?.subcategories?.find((x) =>
      (x.name ?? "").includes(nameIncludes)
    );
    return sub
      ? { score: sub.score ?? 0, max: sub.maxScore ?? 0 }
      : { score: 0, max: 0 };
  };

  const achievement = subOf("academic", "학업성취도"); // 0~35
  const courseAch = subOf("career", "교과성취도"); // 0~35
  const inquiry = subOf("academic", "탐구력"); // 0~40
  const careerExplore = subOf("career", "진로탐색"); // 0~40
  const careerCat = findCat("career");
  const communityCat = findCat("community");

  const axes: CompetencyAxis[] = [
    {
      key: "naesin",
      label: "내신",
      score: clamp100(
        norm(
          achievement.score + courseAch.score,
          achievement.max + courseAch.max
        )
      ),
    },
    {
      key: "setuk",
      label: "세특",
      score: clamp100(
        norm(
          inquiry.score + careerExplore.score,
          inquiry.max + careerExplore.max
        )
      ),
    },
    {
      key: "majorFit",
      label: "전공적합성",
      score: clamp100(careerCat?.score ?? 0),
    },
    {
      key: "extracurricular",
      label: "비교과",
      score: clamp100(communityCat?.score ?? 0),
    },
    {
      key: "growth",
      label: "성장성",
      score: clamp100(growthScore),
    },
  ];

  // 강점축(최고)·보완축(최저) 표시 — 동점 시 정의 순서 우선
  let maxIdx = 0;
  let minIdx = 0;
  axes.forEach((a, i) => {
    if (a.score > axes[maxIdx].score) maxIdx = i;
    if (a.score < axes[minIdx].score) minIdx = i;
  });

  // 모든 축이 동점이면 강·약점 구분 없이 표시
  if (maxIdx !== minIdx) {
    axes[maxIdx].isStrength = true;
    axes[minIdx].isWeakness = true;
  }

  return axes;
};

/**
 * 데이터 기반 강점·보완 항목 도출 (신규 리포트 v5+).
 *
 * 4대 역량의 하위항목 점수·만점·실제 채점 코멘트만으로 결정적으로 산출한다.
 * 추가 AI 추정 없음 → "어떤 항목이 강점이고, 어떤 부분을 보완하면 점수가
 * 오르는지(=감점된 만큼이 향상 여지)"를 학생별 사실 근거로 제시한다.
 *
 * - 보완 항목: 감점액(gap = maxScore - score)이 큰 순으로 상위 N개.
 *   gap 자체가 보완 시 향상 가능한 점수이며, reason(실제 코멘트)에 감점 사유가 담겨 있다.
 * - 강점 항목: 충족률(score/maxScore)이 높은 순으로 상위 N개.
 */
export const buildCompetencyHighlights = (
  scores: RawCategoryScore[],
  limit = 3
): {
  strengths: CompetencyHighlightItem[];
  improvements: CompetencyHighlightItem[];
} => {
  const items: CompetencyHighlightItem[] = [];

  for (const cat of scores) {
    const categoryLabel = cat.label ?? "";
    for (const sub of cat.subcategories ?? []) {
      const score = sub.score ?? 0;
      const maxScore = sub.maxScore ?? 0;
      if (maxScore <= 0) continue;
      items.push({
        name: sub.name ?? "",
        categoryLabel,
        score,
        maxScore,
        gap: Math.max(0, maxScore - score),
        reason: sub.comment ?? "",
      });
    }
  }

  const fillRate = (it: CompetencyHighlightItem) => it.score / it.maxScore;

  // 보완: 감점액(gap) 큰 순 → 동률이면 충족률 낮은 순
  const improvements = items
    .filter((it) => it.gap > 0)
    .sort((a, b) => b.gap - a.gap || fillRate(a) - fillRate(b))
    .slice(0, limit);

  // 강점: 충족률 높은 순 → 동률이면 만점이 큰 항목 우선
  const strengths = [...items]
    .sort((a, b) => fillRate(b) - fillRate(a) || b.maxScore - a.maxScore)
    .slice(0, limit);

  return { strengths, improvements };
};
