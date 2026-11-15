// ============================================================
// 리포트 페이지 간 일관성 검사 (specs/014 A1·A2·A3·E1)
//
// 같은 모집단위(unitKey)가 PART 2·3·4·5 에서 같은 대학명·모집단위·모집군·
// 구분·합격 가능성으로 나오는지, 원서 조합·유리한 대학·상세가 모두 PART 3
// 추천 목록 안에 있는지, 모집군이 시행계획과 같은지, 지원 자격이 맞는지 본다.
// 리포트를 저장하기 직전에 돌리고, 하나라도 어긋나면 저장하지 않는다.
// ============================================================

import { checkEligibility } from "../engine/eligibility.ts";
import type {
  JeongsiReportContent,
  JeongsiSection,
  UnitJudgement,
} from "../report-types.ts";
import type { JeongsiAnalysis } from "../types.ts";

interface UnitView {
  page: string;
  unitKey: string;
  university: string;
  department: string;
  group: string;
  tier?: string;
  chance?: string;
  judgement?: UnitJudgement;
}

const sectionOf = <T extends JeongsiSection["sectionId"]>(
  content: JeongsiReportContent,
  sectionId: T
): Extract<JeongsiSection, { sectionId: T }> | undefined =>
  content.sections.find(
    (section): section is Extract<JeongsiSection, { sectionId: T }> =>
      section.sectionId === sectionId
  );

const labelOf = (view: UnitView): string =>
  `${view.university} ${view.department}(${view.group}군)`;

/** 리포트 안의 모집단위 표시를 페이지별로 모은다 */
const collectViews = (content: JeongsiReportContent): UnitView[] => {
  const views: UnitView[] = [];

  sectionOf(content, "jeongsiUniversityMatch")?.items.forEach((item) => {
    if (!item.unitKey) return;
    views.push({
      page: "PART 2",
      unitKey: item.unitKey,
      university: item.university,
      department: item.department,
      group: item.group,
      judgement: item.judgement,
    });
  });

  sectionOf(content, "jeongsiRecommendation")?.groups.forEach((group) =>
    group.items.forEach((item) => {
      if (!item.judgement) return;
      views.push({
        page: "PART 3",
        unitKey: item.judgement.unitKey,
        university: item.university,
        department: item.department,
        group: item.group,
        tier: item.judgement.tier,
        chance: item.chance,
        judgement: item.judgement,
      });
    })
  );

  sectionOf(content, "jeongsiCombination")?.combinations.forEach(
    (combination) =>
      combination.slots.forEach((slot) => {
        if (!slot.unitKey) return;
        views.push({
          page: `PART 4 「${combination.label}」`,
          unitKey: slot.unitKey,
          university: slot.university,
          department: slot.department,
          group: slot.group,
          tier: slot.tier,
          chance: slot.chance,
        });
      })
  );

  sectionOf(content, "jeongsiUniversityDetail")?.items.forEach((item) => {
    if (!item.judgement) return;
    views.push({
      page: "PART 5",
      unitKey: item.judgement.unitKey,
      university: item.university,
      department: item.department,
      group: item.group,
      tier: item.tier,
      chance: item.chance,
      judgement: item.judgement,
    });
  });

  return views;
};

const sameJudgement = (a: UnitJudgement, b: UnitJudgement): boolean =>
  a.metric === b.metric &&
  a.studentValue === b.studentValue &&
  a.referenceCut === b.referenceCut &&
  a.gapPoints === b.gapPoints &&
  a.tier === b.tier &&
  a.chance === b.chance &&
  (a.resultYears ?? []).join() === (b.resultYears ?? []).join();

/**
 * 리포트의 페이지 간 불일치를 찾는다. 빈 배열이면 일치.
 * analysis 를 주면 모집군·지원 자격을 엔진 데이터와도 대조한다.
 */
export const findReportInconsistencies = (
  content: JeongsiReportContent,
  analysis?: JeongsiAnalysis
): string[] => {
  const problems: string[] = [];
  const views = collectViews(content);
  const part3 = new Map(
    views
      .filter((view) => view.page === "PART 3")
      .map((view) => [view.unitKey, view])
  );

  const recommendationItems =
    sectionOf(content, "jeongsiRecommendation")?.groups.flatMap(
      (group) => group.items
    ) ?? [];
  if (recommendationItems.some((item) => !item.judgement)) {
    problems.push("PART 3 항목에 판정 근거(judgement)가 없음");
  }

  for (const view of views) {
    if (view.page === "PART 3") continue;
    const base = part3.get(view.unitKey);
    if (!base) {
      problems.push(`${view.page} ${labelOf(view)}: PART 3 추천 목록에 없음`);
      continue;
    }
    if (
      view.university !== base.university ||
      view.department !== base.department ||
      view.group !== base.group
    ) {
      problems.push(
        `${view.page} ${labelOf(view)}: PART 3 표기 ${labelOf(base)} 와 다름`
      );
    }
    if (view.tier !== undefined && view.tier !== base.tier) {
      problems.push(
        `${view.page} ${labelOf(view)}: 구분 ${view.tier} ≠ PART 3 ${base.tier}`
      );
    }
    if (view.chance !== undefined && view.chance !== base.chance) {
      problems.push(
        `${view.page} ${labelOf(view)}: 합격 가능성 ${view.chance} ≠ PART 3 ${base.chance}`
      );
    }
    if (
      view.judgement &&
      base.judgement &&
      !sameJudgement(view.judgement, base.judgement)
    ) {
      problems.push(
        `${view.page} ${labelOf(view)}: 판정 근거 수치가 PART 3 과 다름`
      );
    }
  }

  // PART 5 는 PART 3 목록 전체를 다룬다
  const part5Keys = new Set(
    views.filter((view) => view.page === "PART 5").map((view) => view.unitKey)
  );
  for (const [unitKey, view] of part3) {
    if (!part5Keys.has(unitKey)) {
      problems.push(`PART 3 ${labelOf(view)}: PART 5 상세가 없음`);
    }
  }

  const combinations =
    sectionOf(content, "jeongsiCombination")?.combinations ?? [];
  const recommendedCount = combinations.filter(
    (combination) => combination.recommended
  ).length;
  if (combinations.length > 0 && recommendedCount !== 1) {
    problems.push(`PART 4 대표 조합이 ${recommendedCount}개`);
  }
  for (const combination of combinations) {
    const groups = combination.slots.map((slot) => slot.group);
    if (new Set(groups).size !== groups.length) {
      problems.push(`PART 4 「${combination.label}」: 같은 군에 원서 두 장`);
    }
  }

  if (analysis) {
    const evaluationsById = new Map(
      [
        ...(["상향", "적정", "안정"] as const).flatMap(
          (tier) => analysis.recommendations[tier]
        ),
        ...(analysis.sniping ?? []),
      ].map((evaluation) => [evaluation.plan.id, evaluation])
    );
    for (const view of views) {
      const evaluation = evaluationsById.get(view.unitKey);
      if (!evaluation) continue;
      if (evaluation.plan.group !== view.group) {
        problems.push(
          `${view.page} ${labelOf(view)}: 모집군이 시행계획(${evaluation.plan.group}군)과 다름`
        );
      }
      // 엔진 판정(탐구 변환표 포함)과 선택과목 제한을 다시 확인한다
      const eligible =
        evaluation.eligible &&
        checkEligibility(analysis.input.score, evaluation.plan.restrictions)
          .eligible;
      if (!eligible) {
        problems.push(
          `${view.page} ${labelOf(view)}: 지원 자격(선택과목) 불충족`
        );
      }
    }
  }

  return [...new Set(problems)];
};
