// ============================================================
// 선택과목 응시 제한(SubjectRestriction) 필터
//
// 대학이 요구하는 수학 선택과목·탐구 영역 조건을 학생의 응시
// 과목과 비교해 지원 가능 여부와 한국어 사유를 만든다.
// ============================================================

import { isScienceInquiry } from "./convert-score";

import type {
  InquirySubject,
  SubjectRestriction,
  SuneungScore,
} from "../types";

/** 제한 판정 결과 */
export interface EligibilityResult {
  eligible: boolean;
  /** 통과하지 못했을 때의 사유. 통과 시 undefined */
  reason?: string;
}

const PASSED: EligibilityResult = { eligible: true };

/** "미적분·기하" 형태로 과목 목록을 잇는다 */
const joinSubjects = (subjects: string[]): string => subjects.join("·");

/** 학생의 탐구 응시 과목 목록 */
const inquirySubjects = (score: SuneungScore): InquirySubject[] => [
  score.inquiry1.subject,
  score.inquiry2.subject,
];

const checkMathRestriction = (
  score: SuneungScore,
  allowed: SubjectRestriction["math"]
): EligibilityResult => {
  if (!allowed || allowed.length === 0) {
    return PASSED;
  }
  if (allowed.includes(score.math.elective)) {
    return PASSED;
  }

  return {
    eligible: false,
    reason:
      `수학 ${score.math.elective} 응시자는 지원할 수 없습니다. ` +
      `(지원 가능: ${joinSubjects(allowed)})`,
  };
};

const checkInquiryRestriction = (
  score: SuneungScore,
  restriction: SubjectRestriction["inquiry"]
): EligibilityResult => {
  if (!restriction || restriction === "제한없음") {
    return PASSED;
  }

  const subjects = inquirySubjects(score);
  const scienceCount = subjects.filter(isScienceInquiry).length;

  if (restriction === "과탐필수" && scienceCount < 2) {
    return {
      eligible: false,
      reason:
        "탐구 2과목 모두 과학탐구를 응시해야 지원할 수 있습니다. " +
        `(응시 과목: ${joinSubjects(subjects)})`,
    };
  }

  if (restriction === "과탐1과목이상" && scienceCount < 1) {
    return {
      eligible: false,
      reason:
        "탐구에서 과학탐구를 1과목 이상 응시해야 지원할 수 있습니다. " +
        `(응시 과목: ${joinSubjects(subjects)})`,
    };
  }

  return PASSED;
};

/**
 * 선택과목 제한 통과 여부.
 * 제한이 없으면(undefined) 항상 통과한다.
 */
export const checkEligibility = (
  score: SuneungScore,
  restrictions?: SubjectRestriction
): EligibilityResult => {
  if (!restrictions) {
    return PASSED;
  }

  const mathResult = checkMathRestriction(score, restrictions.math);
  if (!mathResult.eligible) {
    return mathResult;
  }

  return checkInquiryRestriction(score, restrictions.inquiry);
};

// ─── 같은 학과의 인문·자연 분리 모집 ───

/** 응시 과목으로 본 학생의 계열. 수학·탐구가 엇갈리면 판정하지 않는다 */
export type ApplicantTrack = "인문" | "자연";

export const resolveApplicantTrack = (
  score: SuneungScore
): ApplicantTrack | null => {
  const sciences = inquirySubjects(score).filter(isScienceInquiry).length;
  const calculusTrack = score.math.elective !== "확률과통계";
  if (calculusTrack && sciences > 0) return "자연";
  if (!calculusTrack && sciences === 0) return "인문";
  return null;
};

const TRACK_SUFFIX = /\((인문|자연)\)$/;

/**
 * 같은 학과를 (인문)·(자연)으로 나눠 뽑을 때, 학생 계열에 맞는 단위가
 * 있으면 반대 계열 단위는 후보에서 뺀다. 같은 학과의 자기 계열 단위를 두고
 * 반대 계열 단위를 권하는 것은 컨설팅 판단이 아니다(실측: 자연계 학생에게
 * 이화여대 인공지능데이터사이언스학부(인문)). 짝이 없는 단위는 교차 지원이
 * 가능한 실제 선택지이므로 남긴다.
 */
export const excludeOtherTrackSplits = <
  T extends { university: string; department: string },
>(
  plans: T[],
  track: ApplicantTrack | null
): T[] => {
  if (!track) return plans;
  const baseOf = (plan: T) =>
    `${plan.university}|${plan.department.replace(TRACK_SUFFIX, "")}`;
  const ownTrackBases = new Set(
    plans
      .filter((plan) => plan.department.match(TRACK_SUFFIX)?.[1] === track)
      .map(baseOf)
  );
  return plans.filter((plan) => {
    const suffix = plan.department.match(TRACK_SUFFIX)?.[1];
    return !suffix || suffix === track || !ownTrackBases.has(baseOf(plan));
  });
};
