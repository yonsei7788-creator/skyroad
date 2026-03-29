/**
 * Phase 4: 후처리
 *
 * Zod 스키마 검증, ReportContent 조합.
 * 검증 실패 시 섹션별 fallback 전략을 적용한다.
 */

import { z } from "zod/v4";

import { ReportSectionSchema, validateByPlan } from "../schemas.ts";
import { SECTION_ORDER } from "../types.ts";
import type {
  ReportPlan,
  ReportContent,
  ReportMeta,
  ReportSection,
  StudentInfo,
  NonAcademicLevel,
  ActivityConnectivity,
  CompetitiveProfilingSection,
} from "../types.ts";
import { isArtSportDepartment, type PreprocessedData } from "./preprocessor.ts";
import { matchMajorEvaluationCriteria } from "../constants/major-evaluation-criteria.ts";
import { getMajorCourseRecommendations } from "../constants/recommended-courses.ts";
import {
  findMajorInfo,
  getMajorRelatedSubjects,
  MAJOR_INFO_DATA,
} from "../constants/major-info-data.ts";
import { findCutoffData } from "../constants/admission-cutoff-data.ts";
import { correctSubjectNamesInText } from "../constants/subject-name-corrections.ts";

// ─── 검증 결과 타입 ───

export interface SectionValidationResult {
  sectionId: string;
  valid: boolean;
  errors: string[];
}

export interface PostprocessResult {
  content: ReportContent;
  validationResults: SectionValidationResult[];
  planValidationErrors: string[];
}

/**
 * Gemini가 string[] 대신 object[]를 반환하는 경우 string[]으로 정규화.
 * 예: [{item: "전략1", note: "참고"}] → ["전략1"]
 */
const normalizeStringArray = (arr: unknown[]): string[] =>
  arr.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (typeof obj.item === "string") return obj.item;
      const first = Object.values(obj).find((v) => typeof v === "string");
      return typeof first === "string" ? first : JSON.stringify(item);
    }
    return String(item);
  });

// ─── 메인 후처리 함수 ───

export const postprocess = (
  rawSections: ReportSection[],
  preprocessed: PreprocessedData,
  studentInfo: StudentInfo,
  plan: ReportPlan,
  reportId: string,
  universityCandidatesText?: string,
  /** Phase 2에서 감지된 생기부 기반 강점 계열 (예: "예체능교육") */
  detectedMajorGroup?: string,
  /** admissionStrategy에서 majorExploration 기반으로 재생성된 후보군 */
  strategyUniversityCandidatesText?: string
): PostprocessResult => {
  const validationResults: SectionValidationResult[] = [];

  // 1. 각 섹션 Zod 검증
  const validatedSections: ReportSection[] = [];

  for (let section of rawSections) {
    section = normalizeSection(section, preprocessed, plan, studentInfo);
    const result = validateSection(section);
    validationResults.push(result);

    if (!result.valid) {
      console.warn(
        `[report:${reportId}] 섹션 검증 실패 (포함됨): ${section.sectionId}`,
        result.errors.join("; ").substring(0, 500)
      );
    }
    // 검증 실패해도 모든 섹션 포함 — Flash 모델은 스키마를 완벽히 준수하지 않을 수 있음
    validatedSections.push(section);
  }

  // 2. 크로스 섹션 동기화: competencyScore → studentProfile radarChart
  const compScore = validatedSections.find(
    (s) => s.sectionId === "competencyScore"
  ) as any;
  const profile = validatedSections.find(
    (s) => s.sectionId === "studentProfile"
  ) as any;
  if (compScore?.scores && profile?.radarChart) {
    for (const sc of compScore.scores) {
      if (sc.category === "academic") profile.radarChart.academic = sc.score;
      if (sc.category === "career") profile.radarChart.career = sc.score;
      if (sc.category === "community") profile.radarChart.community = sc.score;
    }
    if (compScore.growthGrade) {
      // 등급 기준: S(90~100), A(75~89), B(60~74), C(40~59), D(0~39)
      const growthMap: Record<string, number> = {
        S: 95,
        A: 82,
        B: 67,
        C: 50,
        D: 20,
      };
      const growthNumeric =
        growthMap[compScore.growthGrade] ?? profile.radarChart.growth;
      profile.radarChart.growth = growthNumeric;
      // 발전가능성 숫자 점수를 competencyScore 섹션에 주입
      compScore.growthScore = growthNumeric;
    }
  }

  // 2-1. admissionPrediction: chance 값 정규화 (한글 → 영문)
  const CHANCE_NORMALIZE: Record<string, string> = {
    "매우 높음": "very_high",
    매우높음: "very_high",
    높음: "high",
    보통: "medium",
    낮음: "low",
    "매우 낮음": "very_low",
    매우낮음: "very_low",
  };
  const normalizeChance = (v: unknown): string => {
    if (typeof v !== "string") return "medium";
    const lower = v.trim().toLowerCase();
    if (["very_high", "high", "medium", "low", "very_low"].includes(lower))
      return lower;
    return CHANCE_NORMALIZE[v.trim()] ?? "medium";
  };

  for (const s of validatedSections) {
    if (s.sectionId !== "admissionPrediction") continue;
    const ap = s as any;
    if (!Array.isArray(ap.predictions)) continue;
    for (const pred of ap.predictions) {
      if (!Array.isArray(pred.universityPredictions)) continue;
      for (const up of pred.universityPredictions) {
        up.chance = normalizeChance(up.chance);
      }
    }
  }

  // 2-2. 학종 chance > 교과 chance 강제 (같은 대학)
  // 교과/학종이 별도 AI 호출로 생성되므로 코드에서 일관성 보장
  const admPredForChance = validatedSections.find(
    (s) => s.sectionId === "admissionPrediction"
  ) as any;
  if (admPredForChance && Array.isArray(admPredForChance.predictions)) {
    const CHANCE_ORDER = ["very_low", "low", "medium", "high", "very_high"];
    const chanceIndex = (c: string): number => CHANCE_ORDER.indexOf(c);
    const downgrade = (c: string): string => {
      const idx = chanceIndex(c);
      return idx > 0 ? CHANCE_ORDER[idx - 1] : c;
    };

    const hakjongPred = admPredForChance.predictions.find(
      (p: any) => p.admissionType === "학종"
    );
    const gyogwaPred = admPredForChance.predictions.find(
      (p: any) => p.admissionType === "교과"
    );

    if (
      hakjongPred?.universityPredictions &&
      gyogwaPred?.universityPredictions
    ) {
      const hakjongMap = new Map<string, any>();
      for (const up of hakjongPred.universityPredictions) {
        hakjongMap.set(up.university, up);
      }

      for (const gUp of gyogwaPred.universityPredictions) {
        const hUp = hakjongMap.get(gUp.university);
        if (!hUp) continue;
        // 교과 chance >= 학종 chance → 교과를 한 단계 하향
        while (
          chanceIndex(gUp.chance) >= chanceIndex(hUp.chance) &&
          chanceIndex(gUp.chance) > 0
        ) {
          gUp.chance = downgrade(gUp.chance);
        }
      }
    }
  }

  // 3. 크로스 섹션 동기화: admissionStrategy → admissionPrediction chance 일관성
  const admPred = validatedSections.find(
    (s) => s.sectionId === "admissionPrediction"
  ) as any;
  const admStrat = validatedSections.find(
    (s) => s.sectionId === "admissionStrategy"
  ) as any;
  if (admPred && admStrat) {
    // admissionStrategy의 simulations에서 대학별 chance 수집
    const strategyChanceMap = new Map<string, string>();
    if (Array.isArray(admStrat.simulations)) {
      for (const sim of admStrat.simulations) {
        if (!Array.isArray(sim.cards)) continue;
        for (const card of sim.cards) {
          // chance 정규화 (한글 → 영문)
          if (card.comprehensive?.chance) {
            card.comprehensive.chance = normalizeChance(
              card.comprehensive.chance
            );
          }
          if (card.subject?.chance) {
            card.subject.chance = normalizeChance(card.subject.chance);
          }
          const key = `${card.university}|${card.department}`;
          if (card.comprehensive?.chance) {
            strategyChanceMap.set(key, card.comprehensive.chance);
            strategyChanceMap.set(card.university, card.comprehensive.chance);
          }
          // riskLevel 제거 (v5: 더 이상 사용하지 않음)
          delete card.riskLevel;
        }
      }
    }
  }

  // 3-1. AI 생성 대학-학과가 실제 존재하는지 검증
  // 커리어넷 데이터 기반 대학 후보군 + 유저 희망대학 허용
  const candidateSet = new Set<string>();
  const candidateUniversities = new Set<string>();

  // 커리어넷 데이터에서 목표 학과 관련 대학 후보군 구축
  const targetDept = studentInfo.targetDepartment ?? "";
  if (targetDept) {
    const majorInfo = findMajorInfo(targetDept);
    if (majorInfo) {
      for (const university of majorInfo.universities) {
        candidateSet.add(`${university}|${majorInfo.majorName}`);
        candidateUniversities.add(university);
      }
    }
  }

  // 유저 설정 희망대학도 허용 목록에 추가
  if (studentInfo.targetUniversities) {
    for (const tu of studentInfo.targetUniversities) {
      candidateSet.add(`${tu.universityName}|${tu.department}`);
      candidateUniversities.add(tu.universityName);
    }
  }

  // 커리어넷 기반: 대학에 실제 존재하는 학과인지 검증
  const isRealDepartment = (
    university: string,
    department: string
  ): boolean => {
    for (const m of MAJOR_INFO_DATA) {
      const deptMatch =
        m.majorName === department ||
        m.departments.some(
          (d) =>
            d === department ||
            department === d ||
            department.replace(/[과부]$/, "") === d.replace(/[과부]$/, "")
        );
      if (!deptMatch) continue;

      if (m.universities.includes(university)) return true;
    }
    return false;
  };

  // admissionPrediction: 존재하지 않는 대학-학과 조합 제거
  if (admPred && Array.isArray(admPred.predictions)) {
    for (const pred of admPred.predictions) {
      if (!Array.isArray(pred.universityPredictions)) continue;
      pred.universityPredictions = pred.universityPredictions.filter(
        (up: any) => {
          const exactKey = `${up.university}|${up.department}`;
          // 후보군 정확 매칭
          if (candidateSet.has(exactKey)) return true;
          // 유저 희망대학
          if (
            studentInfo.targetUniversities?.some(
              (tu) => tu.universityName === up.university
            )
          )
            return true;
          // 대학-학과 존재 검증
          if (isRealDepartment(up.university, up.department)) return true;
          console.warn(
            `[report:${reportId}] 존재하지 않는 대학-학과 제거: ${up.university} ${up.department}`
          );
          return false;
        }
      );
    }
  }

  // admissionStrategy: simulations 내 존재하지 않는 대학-학과 조합 제거
  if (admStrat && Array.isArray(admStrat.simulations)) {
    for (const sim of admStrat.simulations) {
      if (!Array.isArray(sim.cards)) continue;
      sim.cards = sim.cards.filter((card: any) => {
        const exactKey = `${card.university}|${card.department}`;
        if (candidateSet.has(exactKey)) return true;
        if (
          studentInfo.targetUniversities?.some(
            (tu) => tu.universityName === card.university
          )
        )
          return true;
        if (isRealDepartment(card.university, card.department)) return true;
        console.warn(
          `[report:${reportId}] 존재하지 않는 추천 대학-학과 제거: ${card.university} ${card.department}`
        );
        return false;
      });
    }
  }

  // 3-1b. 예체능 학과 → chance를 "unavailable"로 변경 (판단 불가 표시)
  if (admPred && Array.isArray(admPred.predictions)) {
    for (const pred of admPred.predictions) {
      if (!Array.isArray(pred.universityPredictions)) continue;
      for (const up of pred.universityPredictions) {
        if (isArtSportDepartment(up.department)) {
          up.chance = "unavailable";
          up.rationale =
            "실기 전형이 포함될 수 있는 예체능계열 학과로, 실기 성적에 따라 합격 여부가 크게 달라지므로 합격 예측을 제공하지 않습니다.";
          console.log(
            `[report:${reportId}] 예체능 학과 판단 불가 처리: ${up.university} ${up.department}`
          );
        }
      }
    }
  }

  // 3-2. 전처리 후보군 외 대학 제거 (AI가 후보군 밖 대학을 임의 추가한 경우 필터링)
  if (universityCandidatesText) {
    const allowedUniversities = new Set<string>();
    try {
      const candidates = JSON.parse(universityCandidatesText) as {
        university: string;
      }[];
      for (const c of candidates) {
        allowedUniversities.add(c.university);
      }
    } catch {
      // 파싱 실패 시 필터링 건너뜀
    }

    // 유저 희망대학도 허용
    if (studentInfo.targetUniversities) {
      for (const tu of studentInfo.targetUniversities) {
        allowedUniversities.add(tu.universityName);
      }
    }

    if (allowedUniversities.size > 0) {
      // admissionPrediction: 후보군 외 대학 제거
      if (admPred && Array.isArray(admPred.predictions)) {
        for (const pred of admPred.predictions) {
          if (!Array.isArray(pred.universityPredictions)) continue;
          const before = pred.universityPredictions.length;
          pred.universityPredictions = pred.universityPredictions.filter(
            (up: any) => {
              if (allowedUniversities.has(up.university)) return true;
              console.log(
                `[report:${reportId}] 후보군 외 대학 제거 (admissionPrediction): ${up.university} ${up.department}`
              );
              return false;
            }
          );
          if (pred.universityPredictions.length < before) {
            console.log(
              `[report:${reportId}] admissionPrediction ${pred.admissionType}: 후보군 외 ${before - pred.universityPredictions.length}개 대학 제거`
            );
          }
        }
      }

      // admissionStrategy: 카드를 코드에서 직접 생성 (AI 생성 카드 제거)
      // 학교명, 학과명, 전형, 합격가능성만 렌더링하므로 AI를 거칠 필요 없음
      // 카드를 코드에서 직접 생성 (후보군 데이터 + 커트라인 기반)
      // strategyUniversityCandidatesText가 없으면 원본 후보군으로 fallback
      const cardCandidatesText =
        strategyUniversityCandidatesText ?? universityCandidatesText;
      if (admStrat && cardCandidatesText) {
        // 학생 등급을 9등급제로 환산 (커트라인이 9등급제 기준)
        const gs = preprocessed.gradingSystem;
        const avg = preprocessed.overallAverage;
        const fiveToNineLocal = (five: number): number => {
          if (five <= 1.0) return 1.5;
          if (five <= 1.5) return 1.5 + (five - 1.0) * 4;
          return 3.5 + (five - 1.5) * 2;
        };
        const studentGrade9 =
          gs === "5등급제" && avg ? fiveToNineLocal(avg) : (avg ?? 0);

        const gapToChance = (gap: number): string => {
          if (gap > 0.5) return "very_low";
          if (gap > 0.2) return "low";
          if (gap >= -0.2) return "medium";
          if (gap >= -0.5) return "high";
          return "very_high";
        };

        try {
          const candidates = JSON.parse(cardCandidatesText) as {
            university: string;
            department: string;
            cutoffData?: string;
          }[];

          const cards = candidates.map((cand) => {
            const cutoffs = findCutoffData(cand.university, cand.department);

            // 교과 chance
            const gyogwaCutoffs = cutoffs.filter(
              (c: any) => c.admissionType === "교과" && c.cutoff50Grade != null
            );
            const gyogwaBest =
              gyogwaCutoffs.length > 0
                ? Math.min(...gyogwaCutoffs.map((c: any) => c.cutoff50Grade))
                : null;
            const gyogwaChance = gyogwaBest
              ? gapToChance(studentGrade9 - gyogwaBest)
              : "medium";
            const gyogwaType = gyogwaCutoffs[0]?.admissionName ?? "학생부교과";

            // 학종 chance (같은 등급 비교 로직)
            const hakjongCutoffs = cutoffs.filter(
              (c: any) => c.admissionType === "학종" && c.cutoff50Grade != null
            );
            const hakjongBest =
              hakjongCutoffs.length > 0
                ? Math.min(...hakjongCutoffs.map((c: any) => c.cutoff50Grade))
                : null;
            const hakjongChance = hakjongBest
              ? gapToChance(studentGrade9 - hakjongBest)
              : "medium";
            const hakjongType =
              hakjongCutoffs[0]?.admissionName ?? "학생부종합";

            return {
              university: cand.university,
              department: cand.department,
              comprehensive: {
                admissionType: hakjongType,
                chance: hakjongChance,
              },
              subject: {
                admissionType: gyogwaType,
                chance: gyogwaChance,
              },
            };
          });

          // 교과와 학종 chance가 동일하면 교과를 한 단계 내림 (같은 값 방지)
          const CHANCE_LEVELS = [
            "very_low",
            "low",
            "medium",
            "high",
            "very_high",
          ];
          for (const card of cards) {
            const compIdx = CHANCE_LEVELS.indexOf(card.comprehensive.chance);
            const subjIdx = CHANCE_LEVELS.indexOf(card.subject.chance);
            if (compIdx === subjIdx && subjIdx > 0) {
              card.subject.chance = CHANCE_LEVELS[subjIdx - 1];
            }
          }

          // simulations 구조에 코드 생성 카드 주입
          // 교과 커트라인(50%cut) 낮은 순(합격선 높은 순)으로 정렬
          cards.sort((a, b) => {
            const aCut = findCutoffData(a.university, a.department)
              .filter(
                (c: any) =>
                  c.admissionType === "교과" && c.cutoff50Grade != null
              )
              .map((c: any) => c.cutoff50Grade as number);
            const bCut = findCutoffData(b.university, b.department)
              .filter(
                (c: any) =>
                  c.admissionType === "교과" && c.cutoff50Grade != null
              )
              .map((c: any) => c.cutoff50Grade as number);
            const aMin = aCut.length > 0 ? Math.min(...aCut) : 9;
            const bMin = bCut.length > 0 ? Math.min(...bCut) : 9;
            return aMin - bMin;
          });

          admStrat.simulations = [{ description: "", cards }];

          console.log(
            `[report:${reportId}] admissionStrategy 카드 코드 생성: ${cards.length}개 (${cards.map((c: any) => c.university).join(", ")})`
          );
        } catch {
          // 파싱 실패 시 AI 생성 카드 유지
        }
      }
    }
  }

  // 3-2b. 교과전형 텍스트에서 성적 추이 표현 강제 제거
  // 프롬프트 규칙만으로는 AI가 반복 위반하므로 코드에서 강제 정화
  const GYOGWA_BANNED_PATTERN =
    /[^.!?]*(?:하락|상승|추세|추이|변화|편차가 불리|반영 과목|강점 과목|이수 여부|서류 평가|서류종합평가|입학사정관)[^.!?]*[.!?]/g;

  const sanitizeGyogwaText = (text: string): string =>
    text
      .replace(GYOGWA_BANNED_PATTERN, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  // admissionStrategy typeStrategies 교과 type
  if (admStrat && Array.isArray(admStrat.typeStrategies)) {
    for (const ts of admStrat.typeStrategies) {
      if (ts.type !== "교과") continue;
      if (ts.analysis) ts.analysis = sanitizeGyogwaText(ts.analysis);
      if (ts.reason) ts.reason = sanitizeGyogwaText(ts.reason);
    }
  }
  // admissionPrediction 교과 predictions
  if (admPred && Array.isArray(admPred.predictions)) {
    for (const pred of admPred.predictions) {
      if (pred.admissionType !== "교과") continue;
      if (pred.analysis) pred.analysis = sanitizeGyogwaText(pred.analysis);
      if (Array.isArray(pred.universityPredictions)) {
        for (const up of pred.universityPredictions) {
          if (up.rationale) up.rationale = sanitizeGyogwaText(up.rationale);
        }
      }
    }
  }

  // 3-3. admissionPrediction: 정시 모의고사 미입력 시 "판단 불가"
  if (
    admPred &&
    !studentInfo.hasMockExamData &&
    Array.isArray(admPred.predictions)
  ) {
    for (const pred of admPred.predictions) {
      if (pred.admissionType !== "정시") continue;
      pred.passRateLabel = "판단 불가";
      pred.passRateRange = [0, 0];
      pred.analysis =
        "모의고사 데이터가 입력되지 않아 정시 전형의 합격 가능성을 판단할 수 없습니다.";
      pred.universityPredictions = [];
    }
  }

  // 3-4. admissionPrediction: 교과전형에서 서울대 제거 (교과전형 미운영)
  if (admPred && Array.isArray(admPred.predictions)) {
    for (const pred of admPred.predictions) {
      if (pred.admissionType !== "교과") continue;
      if (!Array.isArray(pred.universityPredictions)) continue;
      pred.universityPredictions = pred.universityPredictions.filter(
        (up: any) => up.university !== "서울대학교"
      );
    }
  }

  // 3-5. admissionPrediction: 누락된 희망대학 강제 주입
  // AI가 간헐적으로 희망대학을 universityPredictions에서 누락하므로 코드에서 보장
  if (
    admPred &&
    studentInfo.targetUniversities &&
    studentInfo.targetUniversities.length > 0 &&
    Array.isArray(admPred.predictions)
  ) {
    for (const tu of studentInfo.targetUniversities) {
      // 이 희망대학이 어떤 전형 타입에 속하는지 결정
      const admType =
        tu.admissionType === "학생부교과"
          ? "교과"
          : tu.admissionType === "학생부종합"
            ? "학종"
            : tu.admissionType === "고른기회"
              ? "고른기회"
              : null;
      if (!admType) continue;

      // 해당 전형의 prediction 찾기
      const pred = admPred.predictions.find(
        (p: any) => p.admissionType === admType
      );
      if (!pred) continue;
      if (!Array.isArray(pred.universityPredictions)) {
        pred.universityPredictions = [];
      }

      // 이미 포함되어 있는지 확인 (대학명+학과명)
      const exists = pred.universityPredictions.some(
        (up: any) =>
          up.university === tu.universityName && up.department === tu.department
      );
      if (exists) continue;

      // 대학명만 일치하는 항목이 있는지 (학과명이 다른 경우)
      const sameUni = pred.universityPredictions.some(
        (up: any) => up.university === tu.universityName
      );
      if (sameUni) continue;

      // 누락된 희망대학 강제 주입
      console.log(
        `[report:${reportId}] 누락된 희망대학 강제 주입: ${tu.universityName} ${tu.department} (${admType})`
      );
      pred.universityPredictions.push({
        university: tu.universityName,
        department: tu.department,
        chance: "medium",
        rationale: `${tu.universityName} ${tu.department}에 대한 합격 가능성은 최종 등급과 합격선을 기준으로 판단이 필요합니다.`,
      });
    }
  }

  // 3-6. admissionPrediction: 정시 전형 모의고사 미입력 시 chance 강제 null 처리
  if (
    admPred &&
    !studentInfo.hasMockExamData &&
    Array.isArray(admPred.predictions)
  ) {
    for (const pred of admPred.predictions) {
      if (pred.admissionType !== "정시") continue;
      pred.passRateLabel = "판단 불가";
      pred.passRateRange = [0, 0];
      pred.analysis =
        "모의고사 데이터가 입력되지 않아 정시 전형의 합격 가능성을 판단할 수 없습니다.";
      pred.universityPredictions = [];
    }
  }

  // 3-5. admissionPrediction: 유저 희망대학이 있으면, 해당 대학을 유저가 선택한 전형에만 남기기
  if (
    admPred &&
    studentInfo.targetUniversities &&
    studentInfo.targetUniversities.length > 0
  ) {
    // 유저 입력 admissionType → predictions admissionType 매핑
    const typeMapping: Record<string, string> = {
      학생부종합: "학종",
      학생부교과: "교과",
      고른기회: "고른기회",
      정시: "정시",
      논술: "논술",
    };

    // 전형별 허용 대학 맵: { "학종": Set["서울대학교", ...], "교과": Set[...] }
    const allowedByType = new Map<string, Set<string>>();
    for (const tu of studentInfo.targetUniversities) {
      const predType = typeMapping[tu.admissionType] ?? tu.admissionType;
      if (!allowedByType.has(predType)) {
        allowedByType.set(predType, new Set());
      }
      allowedByType.get(predType)!.add(tu.universityName);
    }

    if (Array.isArray(admPred.predictions)) {
      for (const pred of admPred.predictions) {
        if (!Array.isArray(pred.universityPredictions)) continue;
        const allowed = allowedByType.get(pred.admissionType);
        const before = pred.universityPredictions.length;
        // 해당 전형에 허용된 대학만 남기기 (허용 목록이 없으면 전부 제거)
        pred.universityPredictions = pred.universityPredictions.filter(
          (up: any) => allowed?.has(up.university) ?? false
        );
        if (pred.universityPredictions.length < before) {
          console.log(
            `[report:${reportId}] admissionPrediction: 전형 불일치 대학 ${before - pred.universityPredictions.length}개 제거 (${pred.admissionType})`
          );
        }
      }
    }
  }

  // 3-6. admissionPrediction: 유저 희망대학 학과가 데이터에 없으면 "(판단 불가)" 처리
  if (
    admPred &&
    studentInfo.targetUniversities &&
    studentInfo.targetUniversities.length > 0 &&
    Array.isArray(admPred.predictions)
  ) {
    // 데이터에 존재하지 않는 학과를 가진 희망대학 식별
    const unavailableDepts = new Set<string>();
    for (const tu of studentInfo.targetUniversities) {
      const majorInfo = findMajorInfo(tu.department);
      const hasCutoff =
        findCutoffData(tu.universityName, tu.department).length > 0;
      if (!majorInfo && !hasCutoff) {
        unavailableDepts.add(`${tu.universityName}|${tu.department}`);
      }
    }

    if (unavailableDepts.size > 0) {
      for (const pred of admPred.predictions) {
        if (!Array.isArray(pred.universityPredictions)) continue;
        for (const up of pred.universityPredictions) {
          const key = `${up.university}|${up.department}`;
          if (unavailableDepts.has(key)) {
            up.chance = "medium";
            up.rationale =
              "(판단 불가) 해당 학과의 입시 데이터가 확보되지 않아 합격 가능성을 판단할 수 없습니다. 유사 학과의 커트라인을 참고하시기 바랍니다.";
            console.log(
              `[report:${reportId}] admissionPrediction: 데이터 미확보 학과 "(판단 불가)" 처리: ${up.university} ${up.department}`
            );
          }
        }
      }
    }
  }

  // 3-7. admissionStrategy: 학과별 실제 커트라인 기반 검증
  // chance 일관성 보정 + 비현실적/너무 쉬운 대학 제거
  {
    const avg = preprocessed.overallAverage;
    const gs = preprocessed.gradingSystem;
    if (avg != null && gs) {
      // 5→9등급 환산 (커트라인 데이터가 9등급제 기준)
      const fiveToNine = (five: number): number => {
        if (five <= 1.0) return 1.5;
        if (five <= 1.5) return 1.5 + (five - 1.0) * 4;
        return 3.5 + (five - 1.5) * 2;
      };
      const studentGrade9 = gs === "5등급제" ? fiveToNine(avg) : avg;

      // 대학별 커트라인 조회: 학과별 실제 데이터 → 하드코딩 fallback
      const targetDept = studentInfo.targetDepartment ?? "";

      // 모든 희망대학이 교과전형인지 판별
      const isGyogwaOnly =
        (studentInfo.targetUniversities?.length ?? 0) > 0 &&
        studentInfo.targetUniversities!.every(
          (t) => t.admissionType === "학생부교과"
        );

      const getRepCutoff9 = (
        university: string,
        department?: string
      ): number | null => {
        // 교과 50%cut 우선 — 대학 수준을 가장 정확하게 반영하는 지표
        // 학종 cutoff는 전형별 편차가 커서(계열적합 3.29 vs 학업우수 1.86) 대표값으로 부적절
        const dept = department || targetDept;
        if (dept) {
          const cutoffs = findCutoffData(university, dept);
          if (cutoffs.length > 0) {
            // 교과 50%cut 우선
            const gyogwa = cutoffs.find((c) => c.admissionType === "교과");
            if (gyogwa?.cutoff50Grade != null) return gyogwa.cutoff50Grade;
            // 교과 없으면 학종 fallback
            const hakjong = cutoffs.find((c) => c.admissionType === "학종");
            if (hakjong?.cutoff50Grade != null) return hakjong.cutoff50Grade;
            for (const c of cutoffs) {
              if (c.cutoff50Grade != null) return c.cutoff50Grade;
            }
          }
        }
        // 2) fallback: 대학 전체 하드코딩 맵
        return null;
      };

      // 하드코딩 fallback (9등급 기준 통일)
      const universityFallback9: Record<string, number> = {
        서울대학교: 1.5,
        KAIST: 1.5,
        연세대학교: 1.5,
        고려대학교: 1.5,
        포항공과대학교: 1.5,
        서강대학교: 2.0,
        성균관대학교: 2.0,
        한양대학교: 2.0,
        중앙대학교: 2.5,
        경희대학교: 2.5,
        한국외국어대학교: 2.5,
        서울시립대학교: 2.5,
        건국대학교: 3.0,
        동국대학교: 3.0,
        홍익대학교: 3.0,
        아주대학교: 3.5,
        인하대학교: 3.5,
        경북대학교: 3.5,
        부산대학교: 3.5,
        국민대학교: 4.0,
        숭실대학교: 4.0,
        세종대학교: 4.0,
        단국대학교: 4.0,
        서울과학기술대학교: 4.0,
        "한양대학교(ERICA)": 4.5,
        한국항공대학교: 4.5,
        광운대학교: 4.5,
        명지대학교: 4.5,
        인천대학교: 5.0,
        가천대학교: 5.0,
        경기대학교: 5.0,
        충북대학교: 5.0,
        충남대학교: 5.0,
      };

      // 대학+학과의 9등급 커트라인 조회
      const getCutoff9 = (
        university: string,
        department?: string
      ): number | null => {
        const real = getRepCutoff9(university, department);
        if (real != null) return real;
        // ERICA 변형 대응
        if (university.includes("ERICA"))
          return universityFallback9["한양대학교(ERICA)"] ?? null;
        return universityFallback9[university] ?? null;
      };

      // 거리 기준 (9등급 통일): ±1.5
      const unreachableGap9 = 1.5;
      const tooEasyGap9 = 1.5;

      // 유저 희망대학 Set (비현실적 제거에서 예외 — 유저가 직접 선택한 대학은 솔직한 분석과 함께 유지)
      const userTargetUniSet = new Set<string>();
      if (studentInfo.targetUniversities) {
        for (const tu of studentInfo.targetUniversities) {
          userTargetUniSet.add(tu.universityName);
        }
      }

      // admissionPrediction: 비현실적 대학 제거 (유저 희망대학 예외)
      if (admPred && Array.isArray(admPred.predictions)) {
        for (const pred of admPred.predictions) {
          if (!Array.isArray(pred.universityPredictions)) continue;
          pred.universityPredictions = pred.universityPredictions.filter(
            (up: any) => {
              // 유저 희망대학은 등급이 맞지 않더라도 유지
              if (userTargetUniSet.has(up.university)) return true;
              const cutoff9 = getCutoff9(up.university, up.department);
              if (cutoff9 == null) return true;
              if (studentGrade9 - cutoff9 > unreachableGap9) {
                console.log(
                  `[report:${reportId}] 비현실적 대학 제거: ${up.university} (cutoff9=${cutoff9.toFixed(2)}, student9=${studentGrade9.toFixed(2)}, gap=${(studentGrade9 - cutoff9).toFixed(2)})`
                );
                return false;
              }
              return true;
            }
          );
        }
      }

      // [삭제됨] admissionStrategy 카드 보정 — 카드를 코드에서 직접 생성하므로 불필요
      if (false as boolean) {
        for (const sim of admStrat.simulations) {
          if (!Array.isArray(sim.cards)) continue;

          // 1단계: 비현실적/너무 쉬운 대학 제거
          sim.cards = sim.cards.filter((card: any) => {
            const cutoff9 = getCutoff9(card.university, card.department);
            if (cutoff9 == null) return true;
            const gap = studentGrade9 - cutoff9;
            if (gap > unreachableGap9) {
              console.log(
                `[report:${reportId}] 비현실적 추천 제거: ${card.university} (cutoff9=${cutoff9.toFixed(2)}, gap=${gap.toFixed(2)})`
              );
              return false;
            }
            if (gap < -tooEasyGap9) {
              console.log(
                `[report:${reportId}] 하향 과다 추천 제거: ${card.university} (cutoff9=${cutoff9.toFixed(2)}, gap=${gap.toFixed(2)})`
              );
              return false;
            }
            return true;
          });

          // 2단계: riskLevel 제거 (v5: 더 이상 사용하지 않음)
          for (const card of sim.cards) {
            delete card.riskLevel;
          }

          // 3단계: cutoff 기반 chance 강제 보정 (AI가 숫자 비교를 안 하므로 코드에서 처리)
          // 기준: 교과 50%cut vs 학생 등급 (9등급 통일)
          //   gap = studentGrade9 - cutoff9 (양수=미달, 음수=초과)
          //   |gap| <= 0.2 → medium (적정)
          //   gap > 0.2 → low (상향, 미달)  /  gap > 0.5 → very_low
          //   gap < -0.2 → high (안정, 초과)  /  gap < -0.5 → very_high
          {
            const CHANCE_LEVELS = [
              "very_low",
              "low",
              "medium",
              "high",
              "very_high",
            ] as const;
            const gapToChance = (gap: number): string => {
              if (gap > 0.5) return "very_low";
              if (gap > 0.2) return "low";
              if (gap >= -0.2) return "medium";
              if (gap >= -0.5) return "high";
              return "very_high";
            };

            for (const card of sim.cards) {
              const dept = card.department ?? "";
              const cutoffs = findCutoffData(card.university, dept);
              if (cutoffs.length === 0) continue;

              // 교과 50%cut 기준 chance 보정
              if (card.subject?.chance) {
                const gyogwaCutoffs = cutoffs.filter(
                  (c: any) =>
                    c.admissionType === "교과" && c.cutoff50Grade != null
                );
                if (gyogwaCutoffs.length > 0) {
                  // 가장 유리한 교과전형의 50%cut 사용
                  const bestCutoff = Math.min(
                    ...gyogwaCutoffs.map((c: any) => c.cutoff50Grade)
                  );
                  const gap = studentGrade9 - bestCutoff;
                  const correctChance = gapToChance(gap);
                  if (card.subject.chance !== correctChance) {
                    console.log(
                      `[report:${reportId}] 교과 chance 보정: ${card.university} ${card.subject.chance}→${correctChance} (student=${studentGrade9.toFixed(2)}, cutoff50=${bestCutoff.toFixed(2)}, gap=${gap.toFixed(2)})`
                    );
                    card.subject.chance = correctChance;
                  }
                }
              }

              // 학종 50%cut 기준 chance 보정
              if (card.comprehensive?.chance) {
                const hakjongCutoffs = cutoffs.filter(
                  (c: any) =>
                    c.admissionType === "학종" && c.cutoff50Grade != null
                );
                if (hakjongCutoffs.length > 0) {
                  // 가장 유리한 학종전형의 50%cut 사용
                  const bestCutoff = Math.min(
                    ...hakjongCutoffs.map((c: any) => c.cutoff50Grade)
                  );
                  const gap = studentGrade9 - bestCutoff;
                  const correctChance = gapToChance(gap);
                  if (card.comprehensive.chance !== correctChance) {
                    console.log(
                      `[report:${reportId}] 학종 chance 보정: ${card.university} ${card.comprehensive.chance}→${correctChance} (student=${studentGrade9.toFixed(2)}, cutoff50=${bestCutoff.toFixed(2)}, gap=${gap.toFixed(2)})`
                    );
                    card.comprehensive.chance = correctChance;
                  }
                }
              }
            }
          }

          // 4단계: 5등급제 교과전형 현실성 보정
          // 5등급제 2등급 초반 학생에게 인서울 중위권 교과전형 chance "high" 이상은 비현실적
          // 인서울 중위권 교과 합격선은 5등급제 기준 1.4~1.6등급
          if (gs === "5등급제" && avg != null) {
            for (const card of sim.cards) {
              if (!card.subject?.chance) continue;
              const cutoff9 = getCutoff9(card.university, card.department);
              if (cutoff9 == null) continue;

              // 인서울/수도권 중위권 이상 대학 (9등급 기준 커트라인 3.5 이하)
              // 이 대학들의 교과전형 합격선은 5등급제 1.4~1.6 수준
              // 5등급제 2.0 이상 학생에게는 교과 chance를 "medium" 이하로 제한
              if (cutoff9 <= 3.5 && avg >= 2.0) {
                const CHANCE_RANK: Record<string, number> = {
                  very_low: 0,
                  low: 1,
                  medium: 2,
                  high: 3,
                  very_high: 4,
                };
                const currentRank = CHANCE_RANK[card.subject.chance] ?? 2;

                // 교과 합격선(9등급)과 학생 등급(9등급 환산) 격차에 따라 제한
                const gap = studentGrade9 - cutoff9;
                let maxChance: string;
                if (gap > 1.0) {
                  maxChance = "very_low";
                } else if (gap > 0.5) {
                  maxChance = "low";
                } else {
                  maxChance = "medium";
                }

                const maxRank = CHANCE_RANK[maxChance] ?? 2;
                if (currentRank > maxRank) {
                  console.warn(
                    `[report:${reportId}] 5등급제 교과전형 현실성 보정: ${card.university} 교과 ${card.subject.chance}→${maxChance} (5등급 avg=${avg.toFixed(2)}, cutoff9=${cutoff9.toFixed(2)}, gap=${gap.toFixed(2)})`
                  );
                  card.subject.chance = maxChance;
                }
              }
            }
          }
        }
      }
    }
  }

  // [삭제됨] 3-8. 학종/교과 chance 강제 분리 — 카드를 코드에서 직접 생성하므로 불필요
  if (false as boolean) {
    const CHANCE_ORDER_FINAL = [
      "very_low",
      "low",
      "medium",
      "high",
      "very_high",
    ] as const;
    const chanceIdxF = (c: string): number =>
      CHANCE_ORDER_FINAL.indexOf(c as (typeof CHANCE_ORDER_FINAL)[number]);
    const chanceUpF = (c: string): string => {
      const i = chanceIdxF(c);
      return i < CHANCE_ORDER_FINAL.length - 1 ? CHANCE_ORDER_FINAL[i + 1] : c;
    };
    const chanceDownF = (c: string): string => {
      const i = chanceIdxF(c);
      return i > 0 ? CHANCE_ORDER_FINAL[i - 1] : c;
    };
    const bumpPercent = (label: string, delta: number): string => {
      const m = label.match(/^(\d+)~(\d+)%$/);
      if (!m) return label;
      const lo = Math.max(0, Math.min(100, parseInt(m[1]) + delta));
      const hi = Math.max(0, Math.min(100, parseInt(m[2]) + delta));
      return `${lo}~${hi}%`;
    };

    for (const sim of admStrat.simulations) {
      if (!Array.isArray(sim.cards)) continue;
      for (const card of sim.cards) {
        const comp = card.comprehensive;
        const subj = card.subject;
        if (!comp || !subj) continue;

        // chance가 동일하면 → 교과를 한 단계 내림
        if (comp.chance === subj.chance) {
          subj.chance = chanceDownF(subj.chance);
          console.warn(
            `[report:${reportId}] 학종/교과 chance 동일 보정: ${card.university} → 학종=${comp.chance}, 교과=${subj.chance}`
          );
        }

        // 학종 chance가 교과보다 낮으면 → 교과를 학종보다 한 단계 아래로
        if (chanceIdxF(comp.chance) < chanceIdxF(subj.chance)) {
          subj.chance =
            chanceIdxF(comp.chance) > 0
              ? CHANCE_ORDER_FINAL[chanceIdxF(comp.chance) - 1]
              : comp.chance;
          console.warn(
            `[report:${reportId}] 학종<교과 역전 보정: ${card.university} → 학종=${comp.chance}, 교과=${subj.chance}`
          );
        }

        // chancePercentLabel이 동일하면 → 교과 -10%p (학종은 유지)
        if (
          comp.chancePercentLabel &&
          subj.chancePercentLabel &&
          comp.chancePercentLabel === subj.chancePercentLabel
        ) {
          subj.chancePercentLabel = bumpPercent(subj.chancePercentLabel, -10);
          console.warn(
            `[report:${reportId}] 학종/교과 퍼센트 동일 보정: ${card.university} → 학종=${comp.chancePercentLabel}, 교과=${subj.chancePercentLabel}`
          );
        }
      }
    }
  }

  // 3-4. subjectAnalysis: evaluationImpact 코드 기반 강제 설정
  const subjectSection = validatedSections.find(
    (s) => s.sectionId === "subjectAnalysis"
  );
  const subjectData = subjectSection as any;
  if (subjectData?.subjects) {
    const { track } = studentInfo; // "문과" | "이과"
    const grade = studentInfo.grade ?? 3;
    const recommendations = getMajorCourseRecommendations(
      grade,
      preprocessed.curriculumVersion
    );

    // detectedMajorGroup 우선 사용, 없으면 희망학과 폴백
    const targetDept = detectedMajorGroup || studentInfo.targetDepartment || "";
    const matchedMajor = recommendations.find((r) => {
      const majorLower = r.major.toLowerCase();
      const deptLower = targetDept.toLowerCase();
      // 학과명에 계열 키워드 포함 여부
      if (
        deptLower.includes("컴퓨터") ||
        deptLower.includes("소프트웨어") ||
        deptLower.includes("ai") ||
        deptLower.includes("인공지능")
      )
        return majorLower.includes("컴퓨터") || majorLower.includes("ai");
      if (
        deptLower.includes("의") ||
        deptLower.includes("치의") ||
        deptLower.includes("한의")
      )
        return majorLower === "의학";
      if (deptLower.includes("약")) return majorLower === "약학";
      if (deptLower.includes("간호") || deptLower.includes("보건"))
        return majorLower.includes("간호");
      if (
        deptLower.includes("생명") ||
        deptLower.includes("바이오") ||
        deptLower.includes("생화학") ||
        deptLower.includes("미생물")
      )
        return majorLower.includes("생명");
      if (
        deptLower.includes("화학") ||
        deptLower.includes("재료") ||
        deptLower.includes("신소재") ||
        deptLower.includes("화공") ||
        deptLower.includes("에너지")
      )
        return majorLower.includes("화학");
      if (
        deptLower.includes("기계") ||
        deptLower.includes("항공") ||
        deptLower.includes("조선")
      )
        return majorLower === "공학";
      if (
        deptLower.includes("전기") ||
        deptLower.includes("전자") ||
        deptLower.includes("반도체")
      )
        return majorLower === "공학";
      if (
        deptLower.includes("건축") ||
        deptLower.includes("건설") ||
        deptLower.includes("도시") ||
        deptLower.includes("토목")
      )
        return majorLower === "공학";
      if (
        deptLower.includes("지구") ||
        deptLower.includes("천문") ||
        deptLower.includes("대기") ||
        deptLower.includes("해양") ||
        deptLower.includes("환경")
      )
        return majorLower.includes("지구");
      if (deptLower.includes("수학") || deptLower.includes("통계"))
        return majorLower === "자연과학";
      if (deptLower.includes("물리"))
        return majorLower === "자연과학" || majorLower === "공학";
      if (
        deptLower.includes("경영") ||
        deptLower.includes("경제") ||
        deptLower.includes("무역") ||
        deptLower.includes("금융")
      )
        return majorLower.includes("경영") || majorLower.includes("경제");
      if (
        deptLower.includes("정치") ||
        deptLower.includes("행정") ||
        deptLower.includes("사회") ||
        deptLower.includes("심리") ||
        deptLower.includes("미디어")
      )
        return majorLower.includes("사회");
      return false;
    });

    // 핵심 과목 셋 구성 (기존 recommended-courses + 커리어넷 API 데이터)
    const coreSubjectsSet = new Set(matchedMajor?.coreSubjects ?? []);
    const recommendedSet = new Set(matchedMajor?.recommendedCourses ?? []);

    // 커리어넷 API 기반 학과별 관련 교과 (더 정확한 데이터)
    // 커리어넷 원본은 "수학ⅠㆍⅡ", "과학교과 : 물리학Ⅰ" 등 복합 형태이므로 분해 필요
    const expandCareerNetSubjects = (subjects: string[]): string[] => {
      const result: string[] = [];
      for (const raw of subjects) {
        // "과학교과 : 물리학Ⅰ" → "물리학Ⅰ"
        const cleaned = raw.replace(/^[^:]+:\s*/, "").trim();
        // "수학ⅠㆍⅡ" → ["수학Ⅰ", "수학Ⅱ"]
        const combined = cleaned.match(/^(.+?)([ⅠⅡⅢ])ㆍ([ⅠⅡⅢ])$/);
        if (combined) {
          result.push(`${combined[1]}${combined[2]}`);
          result.push(`${combined[1]}${combined[3]}`);
        } else {
          result.push(cleaned);
        }
      }
      return result;
    };

    // 커리어넷 API 검색: detectedMajorGroup은 계열명("예체능교육")이므로
    // 학과명(targetDepartment)으로도 검색하여 합산
    const majorInfoByDept = findMajorInfo(targetDept);
    const majorInfoByTarget = studentInfo.targetDepartment
      ? findMajorInfo(studentInfo.targetDepartment)
      : undefined;
    const mergedElective = [
      ...expandCareerNetSubjects(majorInfoByDept?.electiveSubjects ?? []),
      ...expandCareerNetSubjects(majorInfoByTarget?.electiveSubjects ?? []),
    ];
    const mergedCareer = [
      ...expandCareerNetSubjects(majorInfoByDept?.careerSubjects ?? []),
      ...expandCareerNetSubjects(majorInfoByTarget?.careerSubjects ?? []),
    ];
    const careerNetElective = new Set(mergedElective);
    const careerNetCareer = new Set(mergedCareer);
    const careerNetSubjects = new Set([...mergedElective, ...mergedCareer]);

    // 예체능 과목 목록
    const ARTS_PHYSICAL_SUBJECTS = new Set([
      "체육",
      "체육1",
      "체육2",
      "운동과 건강",
      "스포츠 생활",
      "스포츠 문화",
      "체육 탐구",
      "음악",
      "음악1",
      "음악2",
      "미술",
      "미술1",
      "미술2",
      "음악 감상과 비평",
      "미술 감상과 비평",
      "음악 연주와 창작",
      "미술 창작",
    ]);

    // 예체능/예체능교육 계열이면 예체능 과목을 비핵심에서 제외
    const isArtsPhysicalMajor =
      targetDept === "예체능" ||
      targetDept === "예체능교육" ||
      (studentInfo.targetDepartment ?? "")
        .toLowerCase()
        .match(/체육|음악|미술|무용|디자인/) !== null;

    // 비핵심 과목 (evaluationImpact: very_low)
    // ⚠️ "정보"는 컴공/AI 계열에서 핵심이므로 여기서 제외 — 커리어넷 매칭으로 판정
    const NON_CORE_SUBJECTS = new Set([
      "기술·가정",
      "기술가정",
      "한문",
      "한문Ⅰ",
      "한문Ⅱ",
      "일본어Ⅰ",
      "일본어Ⅱ",
      "중국어Ⅰ",
      "중국어Ⅱ",
      "독일어Ⅰ",
      "프랑스어Ⅰ",
      "스페인어Ⅰ",
      "러시아어Ⅰ",
      "아랍어Ⅰ",
      "베트남어Ⅰ",
      "독서",
      "교양",
      "보건",
      "환경",
      "논리학",
      // 예체능 과목: 예체능/예체능교육 계열이 아닌 경우에만 비핵심
      ...(!isArtsPhysicalMajor
        ? [
            "체육",
            "체육1",
            "체육2",
            "운동과 건강",
            "스포츠 생활",
            "음악",
            "음악1",
            "음악2",
            "미술",
            "미술1",
            "미술2",
            "음악 감상과 비평",
            "미술 감상과 비평",
          ]
        : []),
    ]);

    // 공통 기초 과목 (최소 medium)
    const COMMON_BASE = new Set([
      "국어",
      "문학",
      "화법과 작문",
      "언어와 매체",
      "독서",
      "영어",
      "영어Ⅰ",
      "영어Ⅱ",
      "영어 회화",
      "영어 독해와 작문",
      "화법과 언어",
      "독서와 작문",
      "문학과 매체",
    ]);

    // 수학 과목
    const MATH_SUBJECTS = new Set([
      "수학",
      "수학Ⅰ",
      "수학Ⅱ",
      "미적분",
      "기하",
      "확률과 통계",
      "인공지능 수학",
      "경제 수학",
      "실용 수학",
      "대수",
      "미적분Ⅰ",
      "미적분Ⅱ",
    ]);

    // 과학 과목
    const SCIENCE_SUBJECTS = new Set([
      "통합과학",
      "과학탐구실험",
      "물리학Ⅰ",
      "물리학Ⅱ",
      "화학Ⅰ",
      "화학Ⅱ",
      "생명과학Ⅰ",
      "생명과학Ⅱ",
      "지구과학Ⅰ",
      "지구과학Ⅱ",
      "물리학",
      "화학",
      "생명과학",
      "지구과학",
      "역학과 에너지",
      "전자기와 양자",
      "물질과 에너지",
      "화학 반응의 세계",
      "세포와 물질대사",
      "생물의 유전",
      "지구시스템과학",
      "행성우주과학",
    ]);

    // 사회 과목
    const SOCIAL_SUBJECTS = new Set([
      "한국사",
      "세계사",
      "동아시아사",
      "한국지리",
      "세계지리",
      "여행지리",
      "경제",
      "정치와 법",
      "사회·문화",
      "사회문화",
      "사회문제 탐구",
      "생활과 윤리",
      "윤리와 사상",
      "철학",
      "세계시민과 지리",
    ]);

    type EvalImpact = "very_high" | "high" | "medium" | "low" | "very_low";

    const determineImpact = (subjectName: string): EvalImpact => {
      // "2학년 수학 Ⅱ" → "수학Ⅱ", "1학년 국어" → "국어"
      // 1) 학년 접두사 제거  2) 과목명과 로마숫자 사이 공백 제거
      const name = subjectName
        .trim()
        .replace(/^\d학년\s+/, "")
        .replace(/\s+([ⅠⅡⅢ])/g, "$1");

      // 1. 커리어넷 API 데이터 기반 — 학과별 관련 교과 (최우선)
      if (careerNetElective.has(name)) return "very_high";
      if (careerNetCareer.has(name)) return "high";

      // 2. 기존 recommended-courses 데이터 보완
      if (recommendedSet.has(name)) return "high";

      // 2-1. 예체능/예체능교육 계열: 예체능 과목 최소 medium 보장
      if (isArtsPhysicalMajor && ARTS_PHYSICAL_SUBJECTS.has(name)) {
        return "medium";
      }

      // 3. 비핵심 과목 → very_low (커리어넷/추천과목에 없는 경우에만)
      if (NON_CORE_SUBJECTS.has(name)) return "very_low";

      // 4. 계열 기반 기본 판정
      // "통합" 계열이면 목표학과 기반으로 이과/문과 추정
      const targetDeptLower = (
        studentInfo.targetDepartment ?? ""
      ).toLowerCase();
      const scienceDeptKeywords = [
        "공학",
        "컴퓨터",
        "소프트웨어",
        "전자",
        "기계",
        "화학",
        "물리",
        "수학",
        "생명",
        "바이오",
        "의학",
        "약학",
        "간호",
        "AI",
        "인공지능",
        "데이터",
        "정보",
        "건축",
        "토목",
        "환경",
        "에너지",
        "재료",
        "산업",
        "시스템",
      ];
      const isScience =
        track === "이과" ||
        (track === "통합" &&
          scienceDeptKeywords.some((kw) => targetDeptLower.includes(kw)));

      if (isScience) {
        if (MATH_SUBJECTS.has(name)) return "very_high";
        if (SCIENCE_SUBJECTS.has(name)) return "high";
        if (COMMON_BASE.has(name)) return "medium";
        if (SOCIAL_SUBJECTS.has(name)) return "low";
      } else {
        if (COMMON_BASE.has(name)) return "high";
        if (SOCIAL_SUBJECTS.has(name)) {
          return recommendedSet.has(name) ? "very_high" : "high";
        }
        if (MATH_SUBJECTS.has(name)) {
          return coreSubjectsSet.has("수학") ? "high" : "medium";
        }
        if (SCIENCE_SUBJECTS.has(name)) return "low";
      }

      // 5. 커리어넷에 어떤 형태로든 관련 과목이면 medium
      if (careerNetSubjects.size > 0) return "low";

      return "low";
    };

    for (const subject of subjectData.subjects as {
      subjectName: string;
      evaluationImpact?: string;
      importancePercent?: number;
    }[]) {
      subject.evaluationImpact = determineImpact(subject.subjectName);
      delete subject.importancePercent;
    }
  }

  // 3-x. competitiveProfiling 산출 (코드 기반, AI 태스크 아님)
  {
    const calculateLevel = (): NonAcademicLevel => {
      if (!compScore?.scores) return "중위권";
      const careerScore =
        compScore.scores.find((sc: any) => sc.category === "career")?.score ??
        0;
      const communityScore =
        compScore.scores.find((sc: any) => sc.category === "community")
          ?.score ?? 0;
      const combined = careerScore + communityScore;
      if (combined >= 160) return "상위권";
      if (combined >= 130) return "중상위권";
      if (combined >= 100) return "중위권";
      if (combined >= 70) return "중하위권";
      return "하위권";
    };

    const calculateScore = (level: NonAcademicLevel): number => {
      const ranges: Record<NonAcademicLevel, [number, number]> = {
        상위권: [80, 95],
        중상위권: [65, 80],
        중위권: [50, 65],
        중하위권: [35, 50],
        하위권: [20, 35],
      };
      const [min, max] = ranges[level];
      // 동일 학생이면 플랜과 무관하게 같은 점수가 나오도록 결정적 계산
      const combined =
        (compScore?.scores?.find((sc: any) => sc.category === "career")
          ?.score ?? 0) +
        (compScore?.scores?.find((sc: any) => sc.category === "community")
          ?.score ?? 0);
      const offset = combined % (max - min + 1);
      return min + offset;
    };

    const extractConnectivity = (): ActivityConnectivity => {
      const story = validatedSections.find(
        (s) => s.sectionId === "storyAnalysis"
      ) as any;
      if (story?.careerConsistencyGrade) {
        const grade = story.careerConsistencyGrade;
        if (grade === "S" || grade === "A") return "있음";
        if (grade === "B" || grade === "C") return "보통";
        return "없음";
      }

      const activity = validatedSections.find(
        (s) => s.sectionId === "activityAnalysis"
      ) as any;
      if (activity?.activities) {
        const ratings = activity.activities.flatMap(
          (a: any) =>
            a.yearlyAnalysis?.map((y: any) => y.rating).filter(Boolean) ?? []
        );
        const goodCount = ratings.filter(
          (r: string) => r === "excellent" || r === "good"
        ).length;
        if (goodCount >= 3) return "있음";
        if (goodCount >= 1) return "보통";
      }

      return "보통";
    };

    // majorExploration AI 추천 1순위 학과를 전공 방향으로 사용
    const majorExplSection = validatedSections.find(
      (s) => s.sectionId === "majorExploration"
    ) as Record<string, unknown> | undefined;
    const majorExplSuggestions = majorExplSection?.suggestions as
      | { major: string }[]
      | undefined;
    const majorDirection =
      majorExplSuggestions?.[0]?.major ??
      (profile as any)?.catchPhrase?.split(" ")[0] ??
      studentInfo.targetDepartment ??
      "미정";

    const keywords: string[] = [];
    if (profile?.tags && Array.isArray(profile.tags)) {
      keywords.push(...(profile.tags as string[]).slice(0, 3));
    }
    if (keywords.length === 0) {
      keywords.push(majorDirection);
    }

    const level = calculateLevel();
    const score = calculateScore(level);
    const connectivity = extractConnectivity();

    const competitiveProfilingSection: CompetitiveProfilingSection = {
      sectionId: "competitiveProfiling",
      title: "비교과 경쟁력 정밀 분석",
      level,
      majorDirection,
      keywords,
      connectivity,
      score,
    };

    validatedSections.push(competitiveProfilingSection as ReportSection);
  }

  // 3-9. majorExploration: 플랜별 필드 트리밍
  // AI는 항상 Premium 수준(풀 필드)으로 생성하므로, Standard/Lite에서는 불필요 필드 제거
  if (plan !== "premium") {
    const majorSection = validatedSections.find(
      (s) => s.sectionId === "majorExploration"
    ) as Record<string, unknown> | undefined;
    if (majorSection && Array.isArray(majorSection.suggestions)) {
      for (const sug of majorSection.suggestions as Record<string, unknown>[]) {
        delete sug.university;
        delete sug.gapAnalysis;
      }
    }
  }

  // 4. 섹션 정렬 (플랜별 순서)
  const sectionOrder = SECTION_ORDER[plan];
  validatedSections.sort((a, b) => {
    const aIdx = sectionOrder.indexOf(a.sectionId);
    const bIdx = sectionOrder.indexOf(b.sectionId);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  // 5. ReportMeta 생성
  const meta: ReportMeta = {
    reportId,
    plan,
    studentInfo: {
      name: studentInfo.name,
      grade: studentInfo.grade,
      isGraduate: studentInfo.isGraduate,
      track: studentInfo.track,
      schoolType: studentInfo.schoolType,
      targetUniversity: studentInfo.targetUniversity,
      targetDepartment: studentInfo.targetDepartment,
      hasMockExamData: studentInfo.hasMockExamData,
    },
    createdAt: new Date().toISOString(),
    version: 4,
  };

  // 6. ReportContent 조합
  const content: ReportContent = {
    meta,
    sections: validatedSections,
  };

  // 7. 5등급제(2022 교육과정) 학생: AI 텍스트 내 과목명 보정
  if (preprocessed.curriculumVersion === "2022") {
    const fixText = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof val === "string" && val.length > 0) {
          (obj as Record<string, unknown>)[key] =
            correctSubjectNamesInText(val);
        } else if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            if (typeof val[i] === "string") {
              val[i] = correctSubjectNamesInText(val[i] as string);
            } else if (typeof val[i] === "object") {
              fixText(val[i]);
            }
          }
        } else if (typeof val === "object") {
          fixText(val);
        }
      }
    };
    for (const section of content.sections) {
      fixText(section);
    }
  }

  // 8. 플랜별 검증
  const planValidationErrors = validateByPlan(content);

  return {
    content,
    validationResults,
    planValidationErrors,
  };
};

// ─── AI 금지 표현 치환 ───

// 안전한 치환만 수행 (앞뒤 문맥과 무관하게 1:1 대응되는 표현만)
const AI_TONE_REPLACEMENTS: [RegExp, string][] = [
  // ── ThreeTierRating/assessment 구값 → 신값 변환 ──
  // ⚠️ 독립 명사 "양호"→"보통" 변환은 sanitizeDeep에서 처리
  [/보완필요/g, "미흡"],
  [/보완 필요/g, "미흡"],

  // ── 단독으로 쓰이는 AI식 형용사/부사 → 자연스러운 대체 ──
  [/돋보입니다/g, "강점입니다"],
  [/돋보인다/g, "강점이다"],
  [/돋보이는/g, "눈에 띄는"],
  [/매우 인상적입니다/g, "주요 평가 포인트입니다"],
  [/인상적입니다/g, "평가 포인트입니다"],
  [/주목할 만합니다/g, "중요합니다"],
  [/탁월한 역량/g, "우수한 역량"],
  [/뛰어난 역량/g, "우수한 역량"],
  [/매우 우수한 역량/g, "우수한 역량"],

  // ── 문장 끝 어미 (완전한 어미 단위로만 치환) ──
  [/것으로 사료됩니다/g, "것으로 봅니다"],
  [/바람직합니다/g, "좋겠습니다"],

  // ── "길렀다" 계열 (부자연스러운 표현) ──
  [/협동심을 길렀/g, "협동심을 보여주었"],
  [/배려심을 길렀/g, "배려심을 보여주었"],

  // ── 돋보이다 활용형 추가 ──
  [/돋보여\s/g, "강점이 있어 "],
  [/돋보이며/g, "강점이 있으며"],
  [/돋보이지만/g, "강점이지만"],
  [/돋보임\./g, "강점입니다."],
  [/돋보임$/gm, "강점입니다"],

  // ── 3년 개근 → 2년 개근 (현행 교육과정 기준) ──
  [/3년간\s*개근/g, "재학 기간 동안 개근"],
  [/3년간\s*무결석/g, "재학 기간 동안 무결석"],
  [/3년간\s*무단결석/g, "재학 기간 동안 무단결석"],
  [/3년\s*연속\s*개근/g, "재학 기간 동안 개근"],

  // ── 존재하지 않는 학년 데이터 언급 제거 ──
  [/3학년\s*생기부\s*기록이\s*부재[했하][^\\.]*\./g, ""],
  [/3학년\s*(생기부\s*)?기록이\s*없[어다는][^\\.]*\./g, ""],
  [/3학년\s*데이터가\s*없[어다는][^\\.]*\./g, ""],
  [/3학년[^.]*기록이\s*부재[^.]*\./g, ""],
  [/3학년[^.]*부재[^.]*아쉽[^.]*\./g, ""],
  [/3학년[^.]*없어[^.]*아쉽[^.]*\./g, ""],
  [/3학년[^,]*부재[^,]*,\s*/g, ""],

  // ── 명령형 어미 → 권유형 전환 ──
  [/작성하세요/g, "작성하는 것이 좋습니다"],
  [/설명하세요/g, "설명하는 것이 효과적입니다"],
  [/구성하세요/g, "구성하는 것이 효과적입니다"],
  [/분석하세요/g, "분석하는 것이 좋습니다"],
  [/준비하세요/g, "준비하는 것이 좋습니다"],
  [/활용하세요/g, "활용하는 것이 효과적입니다"],

  // ── "희망하는" 패턴 제거 ──
  [/희망하는\s*[가-힣]+\s*계열\s*학과에?\s*/g, ""],
  [/희망하는\s*[가-힣]+\s*학과에?\s*/g, ""],
  [/희망하는\s*학과[에와의]?\s*/g, ""],
  [/희망\s*학과[에와의]?\s*/g, ""],
  [/희망학과[에와의]?\s*/g, ""],

  // ── 교외 활동 표현 → 교내 활동으로 치환 ──
  [/온라인 강의[를을\s]*활용/g, "교내 수업 활동을 활용"],
  [/온라인 강좌/g, "교내 심화 학습"],

  // ── AI식 칭찬/경쟁력 표현 ──
  [/높은 경쟁력을 가집니다/g, "강점 요소입니다"],
  [/높은 경쟁력이 있습니다/g, "강점 요소입니다"],
  [/경쟁력이 있습니다/g, "강점 요소입니다"],
  [/경쟁력을 가집니다/g, "강점 요소입니다"],
  [/매우 유리합니다/g, "유리한 편입니다"],
  [/매우 적합합니다/g, "적합한 편입니다"],
  [/매우 긍정적입니다/g, "긍정적 요소입니다"],
  [/우수한 수준입니다/g, "보통 수준입니다"],
  [/매우 뛰어나며/g, "보통이며"],
  [/매우 뛰어난/g, "보통인"],

  // ── 기타 AI식 표현 ──
  [/발전시켰/g, "보여주었"],
  [/충분히 합격할 겁니다/g, "합격 가능성이 높습니다"],
  [/충분히 합격/g, "합격 가능성이 높은"],
  // ── 중복 표현 제거 ──
  [/가능성이 높은 가능성이 높습니다/g, "가능성이 높습니다"],
  [/다른 요소로 충분히 커버 가능합니다/g, "다른 요소로 보완 가능합니다"],
  [/충분히 커버 가능합니다/g, "보완 가능합니다"],
  [/충분히 커버/g, "보완"],
  [/충분히 경쟁력/g, "경쟁력"],
  [/충분히 어필/g, "어필"],
  [/충분히 가능/g, "가능"],

  // ── 무의미한 추상 평가 표현 → 제거/대체 ──
  // "비판적 사고력" 치환: 문맥 파괴 방지를 위해 독립 표현만 매칭
  [/비판적 사고력을\s*입증합니다/g, "다각적 분석 역량을 보여줍니다"],
  [/비판적 사고력을\s*보여주었습니다/g, "다각적 분석 역량을 보여주었습니다"],
  [/비판적 사고력을\s*보여줍니다/g, "다각적 분석 역량을 보여줍니다"],
  [/비판적 사고력을\s*드러냅니다/g, "다각적 분석 역량이 나타납니다"],
  [/비판적 사고력을\s*발휘합니다/g, "다각적 분석 역량을 보여줍니다"],
  [/비판적 사고력을\s*드러냈/g, "다각적 분석 역량을 보여주었"],
  [/비판적 사고력을\s*발휘했/g, "다각적 분석 역량을 보여주었"],
  [/비판적 사고력/g, "다각적 분석 역량"],
  [/실질적 기여 의지/g, "참여 의지"],
  [/문제 해결 능력을 보여주었습니다/g, "문제 해결 과정이 기록되어 있습니다"],
  [/창의적 사고를 발휘했습니다/g, "독자적 접근 방식을 시도했습니다"],
  [/리더십을 발휘했습니다/g, "리더 역할을 수행했습니다"],

  // ── "보여줍니다" 계열 → 자연스러운 표현 ──
  [/을 보여줍니다/g, "이 나타납니다"],
  [/를 보여줍니다/g, "가 나타납니다"],
  [/보여줍니다/g, "나타납니다"],
  [/을 보여주며/g, "을 나타내며"],
  [/을 보여주고/g, "을 나타내고"],

  // ── "드러냅니다" 계열 → 자연스러운 표현 ──
  [/드러냅니다/g, "나타납니다"],
  [/드러내며/g, "보이며"],
  [/드러내고/g, "보이고"],

  // ── "드러납니다" 계열 → 자연스러운 표현 ──
  [/잘 드러납니다/g, "잘 나타납니다"],
  [/잘 드러나며/g, "나타나며"],
  [/잘 드러나고/g, "나타나고"],
  [/드러납니다/g, "나타납니다"],
  [/드러나며/g, "나타나며"],

  // ── "확인됩니다" 계열 → 자연스러운 표현 (Gemini 직접 생성 대응) ──
  [/이 확인됩니다/g, "이 나타납니다"],
  [/가 확인됩니다/g, "가 나타납니다"],
  [/잘 확인됩니다/g, "잘 나타납니다"],
  [/확인됩니다/g, "나타납니다"],
  [/확인되며/g, "나타나며"],
  [/확인되고/g, "나타나고"],

  // ── "매우 우수합니다" → 톤 다운 ──
  [/매우 우수합니다/g, "우수한 편입니다"],
  [/매우 우수하여/g, "우수하여"],
  [/매우 높은 수준/g, "높은 수준"],
  [/강력한 강점/g, "주요 강점"],

  // ── "~할 수 있습니다" → "~할 겁니다" (평가 맥락) ──
  [/높은 평가를 받을 수 있습니다/g, "긍정적 요소로 작용할 겁니다"],
  [/매우 높은 평가를 받을 겁니다/g, "긍정적 요소로 작용할 겁니다"],
  [/높은 평가를 받을 겁니다/g, "긍정적 요소로 작용할 겁니다"],
  [/평가할 수 있습니다/g, "평가할 겁니다"],
  [/평가될 수 있습니다/g, "평가될 겁니다"],
  [/작용할 수 있습니다/g, "작용할 겁니다"],

  // ── STEP 8: 문법 오류 교정 (조사 불일치) ──
  [/가능성을 나타납니다/g, "가능성이 나타납니다"],
  [/발전가능성을 나타납니다/g, "발전가능성이 나타납니다"],
  // 부사가 끼어있는 경우도 처리 ("을 잘 나타납니다" → "이 잘 나타납니다")
  [/을 잘 나타납니다/g, "이 잘 나타납니다"],
  [/를 잘 나타납니다/g, "가 잘 나타납니다"],
  [/을 명확히 나타납니다/g, "이 명확히 나타납니다"],
  [/를 명확히 나타납니다/g, "가 명확히 나타납니다"],
  [/을 충분히 나타납니다/g, "이 충분히 나타납니다"],
  [/를 충분히 나타납니다/g, "가 충분히 나타납니다"],
  [/을 나타납니다/g, "이 나타납니다"],
  [/를 나타납니다/g, "가 나타납니다"],
  [/되어지고 있습니다/g, "되고 있습니다"],
  [/보여지고 있습니다/g, "보이고 있습니다"],
  [/보여집니다/g, "보입니다"],
  [/되어집니다/g, "됩니다"],
  [/되어지는/g, "되는"],
  [/보여지는/g, "보이는"],
  [/것으로 보여집니다/g, "것으로 보입니다"],
  [/할 것으로 보여집니다/g, "할 것으로 보입니다"],

  // ── STEP 9: 가운뎃점(·) 오용 수정 — 문장 중간 부적절 삽입 제거 ──
  [/([가-힣])\·([가-힣]{4,})/g, "$1 $2"], // "활동·보고서를 작성" → "활동 보고서를 작성" (4글자 이상 연결 시)

  // ── STEP 10: 전형 명칭 풀네임 ──
  [/(?<![가-힣])학종(?![가-힣])/g, "학생부종합전형"],
  [/(?<![가-힣])교과전형(?![가-힣])/g, "학생부교과전형"],

  // ── 온점 3개(줄임표) → (중략) ──
  [/\.{3,}/g, "(중략)"],
  [/…/g, "(중략)"],

  // ── AI가 날조한 합격선 수치 제거 ──
  [
    /합격자\s*평균\s*등급[은이가]?\s*\d+\.\d+~?\d*\.?\d*등급\s*(내외|수준|정도)?[에서]*\s*형성/g,
    "합격선 데이터 기준으로 형성",
  ],
  [
    /합격자\s*평균[은이가]?\s*\d+\.\d+~?\d*\.?\d*등급\s*(내외|수준|정도)?/g,
    "합격선 데이터 참조",
  ],
  [
    /합격선[은이가]?\s*\d+\.\d+~?\d*\.?\d*등급\s*(내외|수준|정도)?[으로에서]?/g,
    "합격선 데이터 기준",
  ],
  [
    /\d+\.\d+~\d+\.\d+등급\s*(내외|수준|정도)[에의]?\s*(합격선|커트라인)/g,
    "합격선 데이터 기준",
  ],
  // "합격선 데이터 참조으로" → 어색한 표현 수정
  [/합격선 데이터 참조으로/g, "합격선 데이터 기준으로"],
  [/합격선 데이터 기준으로\s*매우\s*높습니다/g, "매우 높은 수준입니다"],

  // ── STEP 11: AI스러운 간접 표현 → 직접 표현 ──
  [/파악하기 어렵게 합니다/g, "파악하기 어렵습니다"],
  [/파악하기 어렵게 만듭니다/g, "파악이 어렵습니다"],
  [/판단하기 어렵게 합니다/g, "판단하기 어렵습니다"],
  [/판단하기 어렵게 만듭니다/g, "판단이 어렵습니다"],
  [/이해하기 어렵게 합니다/g, "이해하기 어렵습니다"],
  [/분석하기 어렵게 합니다/g, "분석하기 어렵습니다"],
  [/평가하기 어렵게 합니다/g, "평가하기 어렵습니다"],
  [/([가-힣]+)하기 어렵게 ([가-힣]*합니다)/g, "$1하기 어렵습니다"],
  [/([가-힣]+)하기 어렵게 ([가-힣]*만듭니다)/g, "$1이 어렵습니다"],
  // "~하게 만듭니다" → "~합니다" (AI식 간접 사역 표현)
  [/불리하게 만듭니다/g, "불리합니다"],
  [/유리하게 만듭니다/g, "유리합니다"],
  [/어렵게 만듭니다/g, "어렵습니다"],
  [/약화시킵니다/g, "약화됩니다"],
  [/강화시킵니다/g, "강화됩니다"],
  // "~라고 할 수 있습니다" → 직접 서술
  [/라고 할 수 있습니다/g, "입니다"],
  [/라고 볼 수 있습니다/g, "로 봅니다"],
  // "~의 가능성이 존재합니다" → 간결하게
  [/의 가능성이 존재합니다/g, "할 수 있습니다"],
  [/의 여지가 존재합니다/g, "할 여지가 있습니다"],
  // "~것으로 예상됩니다" → "~겁니다"
  [/할 것으로 예상됩니다/g, "할 겁니다"],
  [/될 것으로 예상됩니다/g, "될 겁니다"],
  [/할 것으로 예측됩니다/g, "할 겁니다"],
  [/될 것으로 예측됩니다/g, "될 겁니다"],
  [/것으로 예상됩니다/g, "겁니다"],
  [/것으로 예측됩니다/g, "겁니다"],

  // ── STEP 12: 토큰 오류 비정상 단어 교정 ──
  // Gemini가 간헐적으로 생성하는 비정상 한국어 단어
  [/파체했습니다/g, "파악했습니다"],
  [/파체합니다/g, "파악합니다"],
  [/파체하고/g, "파악하고"],
  [/파체된/g, "파악된"],
  [/파체할/g, "파악할"],
  [/파명하/g, "파악하"],

  // ── STEP 13: 조사 누락 교정 (Gemini 토큰 스킵 대응) ──
  // AI가 명사를 생략하고 조사만 남기는 현상 — 조사 제거로 문장 정상화
  // 예: "다만, 가 경영경제" → "다만, 경영경제"
  // 예: "그러나 가 '체육교육과'" → "그러나 '체육교육과'"
  // 예: "있지만, 의 괴리가" → "있지만, 괴리가"
  // 구두점 뒤 고립 조사 (가/은/는/을/를/인/과/와/의)
  [/([,;.!?])\s+(?:가|은|는|을|를|인|과|와|의)\s+(?=[가-힣''""])/g, "$1 "],
  // 줄 시작 고립 조사
  [/^(?:가|은|는|을|를|인|과|와|의)\s+(?=[가-힣''""])/gm, ""],
  // 한글 뒤 공백+고립조사+공백+한글/따옴표 (예: "그러나 인 체육교육과", "그러나 가 '체육교육과'")
  [/([가-힣])\s+(?:인|가|의)\s+(?=[가-힣''""])/g, "$1 "],
];

const sanitizeAiTone = (text: string): string => {
  let result = text;
  for (const [pattern, replacement] of AI_TONE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};

// ─── 한글 서술문 내 영단어 치환 ───

const ENGLISH_WORD_REPLACEMENTS: [RegExp, string][] = [
  // 본문에 노출되는 영단어 → 한글 대체 (JSON enum 값은 제외)
  [/\bhigh\b/gi, "높음"],
  [/\bmedium\b/gi, "보통"],
  [/\blow\b/gi, "낮음"],
  [/\bpriority\b/gi, "우선순위"],
  [/\bimpact\b/gi, "영향"],
];

// JSON enum 값으로 사용되는 필드는 영단어 치환 제외
const ENUM_FIELDS = new Set([
  "sectionId",
  "category",
  "chance",
  "suitability",
  "rating",
  "tier",
  "tierGroup",
  "highlight",
  "connectionType",
  "depth",
  "type",
  "admissionType",
  "achievement",
  "grade",
  "growthGrade",
  "overallRating",
  "gradeTrend",
  "currentTrend",
  "status",
  "importance",
  "evaluationImpact",
  "questionType",
  "assessment",
]);

const sanitizeEnglishWords = (text: string): string => {
  let result = text;
  for (const [pattern, replacement] of ENGLISH_WORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};

/** 객체의 모든 문자열 필드를 재귀적으로 AI 톤 치환 + 영단어 치환 */
const sanitizeDeep = (obj: unknown, fieldName?: string): unknown => {
  if (typeof obj === "string") {
    // enum 필드: 구값→신값 변환만 수행 (톤/영단어 치환은 건너뜀)
    if (fieldName && ENUM_FIELDS.has(fieldName)) {
      if (obj === "양호") return "보통";
      if (obj === "보완필요" || obj === "보완 필요") return "미흡";
      return obj;
    }
    const toned = sanitizeAiTone(obj);
    return sanitizeEnglishWords(toned);
  }
  if (Array.isArray(obj)) return obj.map((item) => sanitizeDeep(item));
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeDeep(value, key);
    }
    return result;
  }
  return obj;
};

// ─── AI 출력 필드명 정규화 + 전처리 데이터 보강 ───

const normalizeSection = (
  section: ReportSection,
  pre: PreprocessedData,
  plan: ReportPlan,
  studentInfo: StudentInfo
): ReportSection => {
  let s = section as any;

  // ── AI 금지 표현 치환 (모든 섹션 공통) ──
  s = sanitizeDeep(s) as any;

  // ── subjectAnalysis: evaluationImpact 정규화 + 플랜별 과목 수 제한 ──
  if (s.sectionId === "subjectAnalysis" && Array.isArray(s.subjects)) {
    const impactMap: Record<string, string> = {
      "very high": "very_high",
      "매우 높음": "very_high",
      높음: "high",
      보통: "medium",
      낮음: "low",
      "very low": "very_low",
      "매우 낮음": "very_low",
    };
    for (const subj of s.subjects) {
      if (subj.evaluationImpact && impactMap[subj.evaluationImpact]) {
        subj.evaluationImpact = impactMap[subj.evaluationImpact];
      }
    }

    // ── 과목 중요도 강제 보정 (계열별 세분화 기준) ──
    const targetDept = studentInfo.targetDepartment ?? "";
    const criteria = matchMajorEvaluationCriteria(targetDept);

    // 비핵심 과목 패턴 (학종 평가에서 변별력 없는 과목)
    // "정보" 과목: 어떤 학과든(컴공 포함) 비핵심. 고교 정보는 1학년 1~2단위
    // 기초 수준으로, 입학사정관은 수학·물리학 세특으로 전공 적합성을 판단함.
    // 과목명은 정규화 후 매칭 (공백/숫자/로마숫자 제거됨)
    const NON_CORE_SUBJECTS = [
      "정보",
      "정보과학",
      "기술[·]?가정",
      "제2외국어",
      "일본어",
      "중국어",
      "독일어",
      "프랑스어",
      "스페인어",
      "러시아어",
      "아랍어",
      "베트남어",
      "한문",
      "교양",
      "진로와?직업",
      "체육",
      "음악",
      "미술",
      "독서",
      "보건",
      "환경",
      "논리학",
      "실용국어",
      "실용영어",
      "심화국어",
      "심화영어",
      "직업",
      "로봇",
    ];
    const NON_CORE_PATTERN = new RegExp(`^(${NON_CORE_SUBJECTS.join("|")})`);
    const CORE_LANG_PATTERN = /^(국어|영어|문학|언어와매체|화법과작문)/;

    // 핵심/권장과목 매칭용 정규화 함수
    const normalizeCourseForMatch = (course: string): string =>
      course.replace(/[ⅠⅡⅢ\s·]/g, "");

    for (const subj of s.subjects) {
      // 과목명 정규화: "2학년 정보", "제2 외국어", "일본어Ⅰ" 등 변형 처리
      const name = (subj.subjectName ?? "")
        .replace(/^\d학년\s*/, "")
        .replace(/\s+/g, "")
        .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ1-9]+$/, "");
      let matched = false;

      if (NON_CORE_PATTERN.test(name)) {
        // 비핵심 과목: 중요도 2% (거의 0에 가깝게)
        subj.importancePercent = 2;
        subj.evaluationImpact = "very_low";
        matched = true;
      }

      // 핵심 권장과목 매칭 (계열별 세분화)
      if (!matched) {
        const isCoreSubject = criteria.coreSubjects.some((core) =>
          name.includes(normalizeCourseForMatch(core))
        );
        if (isCoreSubject) {
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 35);
          subj.evaluationImpact = "very_high";
          matched = true;
        }
      }

      // 권장과목 매칭
      if (!matched) {
        const isRecommended = criteria.recommendedSubjects.some((rec) =>
          name.includes(normalizeCourseForMatch(rec))
        );
        if (isRecommended) {
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 20);
          subj.evaluationImpact = "high";
          matched = true;
        }
      }

      // 국어/영어: 공통 기초 과목
      if (!matched && CORE_LANG_PATTERN.test(name)) {
        subj.importancePercent = Math.min(
          Math.max(subj.importancePercent ?? 10, 10),
          15
        );
        subj.evaluationImpact = "medium";
        matched = true;
      }

      // 안전장치: 어떤 핵심 패턴에도 매칭되지 않은 과목은 중요도 상한 10%
      if (!matched && (subj.importancePercent ?? 0) > 10) {
        subj.importancePercent = 5;
        subj.evaluationImpact = "low";
      }
    }

    // ── 과목 다양성 강제: 같은 교과 카테고리에서 최대 2개 ──
    const getSubjectCategory = (name: string): string => {
      const n = name
        .replace(/^\d학년\s*/, "")
        .replace(/\s+/g, "")
        .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ1-9]+$/, "");
      if (/^(수학|미적분|기하|확률과통계|인공지능수학|경제수학)/.test(n))
        return "수학";
      if (/^(물리학|물리)/.test(n)) return "물리";
      if (/^(화학)/.test(n)) return "화학";
      if (/^(생명과학|생물)/.test(n)) return "생명과학";
      if (/^(지구과학|천문)/.test(n)) return "지구과학";
      if (/^(국어|문학|화법|언어와매체|독서|실용국어|심화국어)/.test(n))
        return "국어";
      if (/^(영어|영어Ⅰ|영어Ⅱ|실용영어|심화영어|영어독해|영어회화)/.test(n))
        return "영어";
      if (
        /^(통합사회|사회|정치|경제|세계사|동아시아사|한국지리|세계지리|사회문화|윤리)/.test(
          n
        )
      )
        return "사회";
      return "기타";
    };

    // 중요도 높은 순 정렬 후, 같은 카테고리에서 최대 2개만 유지
    s.subjects.sort(
      (a: any, b: any) =>
        (b.importancePercent ?? 0) - (a.importancePercent ?? 0)
    );
    const categoryCounts = new Map<string, number>();
    const MAX_PER_CATEGORY = 2;
    s.subjects = s.subjects.filter((subj: any) => {
      const cat = getSubjectCategory(subj.subjectName ?? "");
      const count = categoryCounts.get(cat) ?? 0;
      if (count >= MAX_PER_CATEGORY) return false;
      categoryCounts.set(cat, count + 1);
      return true;
    });

    // 플랜별 과목 수 강제 제한 — 중요도 높은 순으로 선별
    const maxSubjects: Record<ReportPlan, number> = {
      lite: 5,
      standard: 7,
      premium: 10,
    };
    const limit = maxSubjects[plan];
    if (s.subjects.length > limit) {
      // 중요도 높은 순 정렬 후 상위 N개만 유지
      s.subjects.sort(
        (a: any, b: any) =>
          (b.importancePercent ?? 0) - (a.importancePercent ?? 0)
      );
      s.subjects = s.subjects.slice(0, limit);
    }
  }

  if (s.sectionId === "academicAnalysis") {
    // ── 핵심 정량 수치: 코드 전처리 결과로 강제 덮어쓰기 ──
    s.overallAverageGrade = pre.overallAverage;

    s.gradesByYear = pre.averageByGrade.map((g) => ({
      year: g.year,
      semester: g.semester,
      averageGrade: Math.round(g.average * 100) / 100,
    }));

    s.subjectCombinations = pre.subjectCombinations.map((c) => ({
      combination: c.name,
      averageGrade: c.average,
    }));

    const trendMap: Record<string, string> = {
      ascending: "상승",
      stable: "유지",
      descending: "하락",
    };
    s.gradeTrend = trendMap[pre.gradeTrend.direction] || "유지";

    // ── subjectGrades: AI가 미생성/빈 배열이면 전처리 데이터로 fallback ──
    if (
      (!Array.isArray(s.subjectGrades) || s.subjectGrades.length === 0) &&
      Array.isArray(pre.allSubjectGrades) &&
      pre.allSubjectGrades.length > 0
    ) {
      s.subjectGrades = pre.allSubjectGrades.map((sg) => ({
        subject: sg.subject,
        year: sg.year,
        semester: sg.semester,
        grade: sg.gradeRank,
        rawScore: sg.rawScore,
        classAverage: sg.average,
        studentCount: sg.studentCount,
      }));
    }

    // ── subjectGrades: DB 데이터로 null/오류 보정 (등급, 원점수, 평균, 수강자수) ──
    if (Array.isArray(s.subjectGrades)) {
      const dbMap = new Map<
        string,
        {
          gradeRank: number | null;
          rawScore: number | null;
          average: number | null;
          studentCount: number | null;
        }
      >();
      for (const sg of pre.allSubjectGrades ?? []) {
        const key = `${sg.subject}-${sg.year}-${sg.semester}`;
        dbMap.set(key, sg);
      }

      s.subjectGrades = (s.subjectGrades as any[]).map((sg: any) => {
        const key = `${sg.subject}-${sg.year}-${sg.semester}`;
        const db = dbMap.get(key);

        let { grade } = sg;
        let { rawScore } = sg;
        let { classAverage } = sg;
        let { studentCount } = sg;

        if (db) {
          const {
            gradeRank: dbGrade,
            rawScore: dbRaw,
            average: dbAvg,
            studentCount: dbCount,
          } = db;
          if (grade == null && dbGrade != null) grade = dbGrade;
          if (rawScore == null && dbRaw != null) rawScore = dbRaw;
          if (classAverage == null && dbAvg != null) classAverage = dbAvg;
          if (studentCount == null && dbCount != null) studentCount = dbCount;
        }

        // 5등급제: grade > 5이면 clamp
        if (
          pre.gradingSystem === "5등급제" &&
          typeof grade === "number" &&
          grade > 5
        ) {
          grade = Math.min(5, Math.ceil(grade / 2));
        }

        return { ...sg, grade, rawScore, classAverage, studentCount };
      });
    }

    // ── gradeDeviationAnalysis: 전처리 gradeVariance에서 확정값 주입 ──
    const gv = pre.gradeVariance;
    const aiDev = s.gradeDeviationAnalysis ?? {};
    const riskText =
      aiDev.riskAssessment || aiDev.analysis || aiDev.recommendation || "";

    // fallback: AI가 riskAssessment를 생성하지 않은 경우
    const isGO =
      (studentInfo.targetUniversities?.length ?? 0) > 0 &&
      studentInfo.targetUniversities!.every(
        (t) => t.admissionType === "학생부교과"
      );
    let fallbackRisk = "";
    if (gv.spread > 0) {
      if (isGO) {
        // 교과전형 전용: 사정관/학종 개념 없이 평균 등급 관점
        if (gv.spread <= 1) {
          fallbackRisk = `최고 과목(${gv.highest})과 최저 과목(${gv.lowest}) 간 ${gv.spread}등급 차이로, 편차가 크지 않아 교과전형에서 과목별 불이익은 적습니다.`;
        } else if (gv.spread <= 2) {
          fallbackRisk = `최고 과목(${gv.highest})과 최저 과목(${gv.lowest}) 간 ${gv.spread}등급 편차가 있습니다. 교과전형은 최종 평균 등급이 핵심이므로, 최저 과목이 평균을 낮추는 정도를 확인하고 이 과목을 반영 비중이 낮은 대학을 탐색하는 것이 유효합니다.`;
        } else {
          fallbackRisk = `최고 과목(${gv.highest})과 최저 과목(${gv.lowest}) 간 ${gv.spread}등급의 큰 편차가 있습니다. 최저 과목이 전체 평균을 낮추는 주요 원인이므로, 이 과목의 반영 비중이 낮거나 제외되는 대학의 교과전형을 탐색하는 것이 유효합니다.`;
        }
      } else {
        // 학종 포함: 사정관 관점 해석
        if (gv.spread <= 1) {
          fallbackRisk = `최고 과목(${gv.highest})과 최저 과목(${gv.lowest}) 간 ${gv.spread}등급 차이로, 과목 간 편차가 크지 않아 입학사정관이 학업 균형성을 긍정적으로 평가할 수 있는 구조입니다. 다만 전체 등급대에서의 경쟁력은 별도로 판단해야 합니다.`;
        } else if (gv.spread <= 2) {
          fallbackRisk = `최고 과목(${gv.highest})과 최저 과목(${gv.lowest}) 간 ${gv.spread}등급 편차가 있습니다. 입학사정관은 이 정도 편차를 '특정 교과 편중 학습'으로 해석할 수 있으며, 학종에서 학업역량의 균형성 평가에서 약점이 될 수 있습니다. 교과전형에서는 평균 등급에 직접 영향을 주므로 최저 과목 보완이 필요합니다.`;
        } else {
          fallbackRisk = `최고 과목(${gv.highest})과 최저 과목(${gv.lowest}) 간 ${gv.spread}등급의 큰 편차가 있습니다. 입학사정관은 이를 학업 관리 능력의 부족 또는 특정 교과 회피로 판단할 가능성이 높으며, 학종과 교과 모두에서 불리하게 작용합니다. 최저 과목이 전공 핵심 과목인 경우 영향이 더 크므로 즉각적인 보완이 필요합니다.`;
        }
      }
    } else {
      fallbackRisk = "과목별 성적 데이터가 부족하여 편차 분석이 어렵습니다.";
    }

    s.gradeDeviationAnalysis = {
      highestSubject: gv.highest || "-",
      lowestSubject: gv.lowest || "-",
      deviationRange: gv.spread ?? 0,
      riskAssessment: riskText || fallbackRisk,
    };

    // ── majorRelevanceAnalysis: AI 필드명 매핑 ──
    if (s.majorRelevanceAnalysis) {
      const m = s.majorRelevanceAnalysis;
      s.majorRelevanceAnalysis = {
        enrollmentEffort: m.enrollmentEffort || m.comparison || "",
        achievement: m.achievement || m.recommendation || "",
        recommendedSubjects: Array.isArray(m.recommendedSubjects)
          ? m.recommendedSubjects
          : Array.isArray(m.weaknesses)
            ? m.weaknesses
            : Array.isArray(m.strengths)
              ? m.strengths
              : [],
      };
    }

    // ── gradeChangeAnalysis: AI 필드명 매핑 + 코드값 강제 ──
    if (s.gradeChangeAnalysis) {
      const g = s.gradeChangeAnalysis;
      const trend = trendMap[pre.gradeTrend.direction] || "유지";
      let prediction = g.prediction || g.analysis || "";
      // prediction 빈 문자열 방지 (Zod 검증 실패 방지)
      if (!prediction || prediction.trim().length === 0) {
        const trendPredictions: Record<string, string> = {
          상승: "성적 상승 추세는 입학사정관이 발전가능성을 긍정적으로 평가하는 핵심 근거입니다. 현재 추세를 유지하면서 약점 과목을 보완하면 경쟁력을 높일 수 있습니다.",
          유지: "성적이 안정적으로 유지되고 있습니다. 현 수준을 바탕으로 세특과 활동의 깊이를 강화하면 학종에서 경쟁력을 확보할 수 있습니다.",
          하락: "성적 하락 추세는 학업 태도에 대한 의문으로 이어질 수 있습니다. 조속한 성적 반등이 필요하며, 하락 원인을 파악하고 학습 전략을 재수립해야 합니다.",
        };
        prediction = trendPredictions[trend] ?? trendPredictions["유지"];
      }
      s.gradeChangeAnalysis = {
        currentTrend: trend,
        prediction,
        actionItems: normalizeStringArray(
          g.actionItems || g.recommendations || []
        ),
        actionItemPriorities: g.actionItemPriorities || [],
      };
    }

    // ── careerSubjectAnalyses: AI 필드명 정규화 + 전처리 데이터 주입 ──
    if (Array.isArray(s.careerSubjectAnalyses)) {
      const careerMap = new Map(
        pre.careerSubjects.map((cs) => [cs.subject, cs])
      );
      s.careerSubjectAnalyses = s.careerSubjectAnalyses.map((cs: any) => {
        const preData = careerMap.get(cs.subject);
        return {
          subject: cs.subject ?? "",
          achievement: cs.achievement || preData?.achievement || "",
          achievementDistribution:
            cs.achievementDistribution ||
            preData?.achievementDistribution ||
            "",
          interpretation: cs.interpretation || cs.analysis || cs.comment || "",
        };
      });
    }

    // ── fiveGradeSimulation: 등급제에 따라 처리 분기 ──
    if (pre.gradingSystem === "5등급제") {
      // 고1·고2 (5등급제): currentGrade = simulatedGrade = 실제 DB 등급값
      // AI가 9등급제로 잘못 계산하는 것을 방지하기 위해 전처리 데이터로 강제 덮어쓰기
      const subjectGradeMap = new Map<string, number>();
      const gradesWithRank = (pre as any).subjectStats ?? [];
      // subjectStats가 없으면 overallAverage에서 fallback
      if (Array.isArray(s.subjectGrades)) {
        for (const sg of s.subjectGrades as any[]) {
          if (sg.subject && typeof sg.grade === "number") {
            subjectGradeMap.set(sg.subject, sg.grade);
          }
        }
      }

      if (Array.isArray(s.fiveGradeSimulation)) {
        s.fiveGradeSimulation = s.fiveGradeSimulation.map((sim: any) => {
          const subj = sim.subject ?? "";
          // DB 기반 실제 등급 사용, fallback으로 AI값 사용 (단, 1~5 범위 강제)
          let grade =
            subjectGradeMap.get(subj) ?? sim.currentGrade ?? sim.original ?? 3;
          // 5등급제인데 6 이상이면 잘못된 값 → 5로 clamp
          if (typeof grade === "number" && grade > 5)
            grade = Math.min(5, Math.ceil(grade / 2));
          // interpretation에서 "9등급제" 언급 제거
          let interp = sim.interpretation ?? "";
          if (interp.includes("9등급제")) {
            interp = interp
              .replace(
                /9등급제\s*\d+등급은\s*5등급제\s*기준\s*\d+등급으로\s*변환[됩되]니다\.?\s*/g,
                ""
              )
              .replace(/9등급제/g, "5등급제")
              .trim();
            if (!interp) {
              interp = `5등급제 ${grade}등급으로, 동일 등급 내 변별을 위해 원점수와 세특 차별화가 중요합니다.`;
            }
          }
          return {
            subject: subj,
            currentGrade: grade,
            simulatedGrade: grade, // 5등급제는 전환 불필요 → 동일
            interpretation: interp,
          };
        });
      }
    } else if (
      Array.isArray(pre.fiveGradeConversion) &&
      pre.fiveGradeConversion.length > 0
    ) {
      // 고3/졸업 (9등급제) + premium: 전처리 데이터 기반 강제 주입
      const latestBySubject = new Map<
        string,
        { original: number; converted: number }
      >();
      for (const fc of pre.fiveGradeConversion) {
        latestBySubject.set(fc.subject, {
          original: fc.original,
          converted: fc.converted,
        });
      }
      const aiSimMap = new Map<string, string>(
        (Array.isArray(s.fiveGradeSimulation) ? s.fiveGradeSimulation : []).map(
          (sim: any): [string, string] => [
            sim.subject ?? "",
            sim.interpretation ?? "",
          ]
        )
      );
      const targetSubjects: string[] =
        aiSimMap.size > 0
          ? [...aiSimMap.keys()].slice(0, 5)
          : [...latestBySubject.keys()].slice(0, 5);
      s.fiveGradeSimulation = targetSubjects
        .filter((subj: string) => latestBySubject.has(subj))
        .map((subj) => {
          const data = latestBySubject.get(subj)!;
          return {
            subject: subj,
            currentGrade: data.original,
            simulatedGrade: data.converted,
            interpretation: aiSimMap.get(subj) || "",
          };
        });
    } else if (Array.isArray(s.fiveGradeSimulation)) {
      // 9등급제 + non-premium: AI 출력 유지 (수치 정규화만)
      s.fiveGradeSimulation = s.fiveGradeSimulation.map((sim: any) => ({
        subject: sim.subject ?? "",
        currentGrade: sim.currentGrade ?? sim.original ?? null,
        simulatedGrade: sim.simulatedGrade ?? sim.converted ?? null,
        percentileCumulative: sim.percentileCumulative,
        interpretation: sim.interpretation ?? "",
      }));
    }

    // ── universityGradeSimulations: 빈값 행 제거 ──
    if (Array.isArray(s.universityGradeSimulations)) {
      s.universityGradeSimulations = s.universityGradeSimulations
        .map((sim: any) => ({
          university: sim.university ?? "",
          department: sim.department ?? "",
          reflectionMethod: sim.reflectionMethod || sim.method || "",
          calculatedScore: sim.calculatedScore || sim.score || "",
          interpretation: sim.interpretation ?? "",
        }))
        .filter(
          (sim: any) =>
            sim.department && sim.reflectionMethod && sim.calculatedScore
        );
    }
  }

  if (s.sectionId === "competencyScore") {
    // ── 성실성 점수: 출결 데이터 기반 강제 감점 ──
    const attendance = pre.attendanceSummary;
    if (Array.isArray(s.scores) && attendance.length > 0) {
      // 연간 최대 미인정결석 일수 산출
      const maxUnauthorized = Math.max(
        ...attendance.map((a) => a.unauthorized)
      );

      // 감점 기준: 연간 1~2일 → -3, 3~5일 → -8, 6~10일 → -13, 11일+ → -18
      const deduction =
        maxUnauthorized === 0
          ? 0
          : maxUnauthorized <= 2
            ? 3
            : maxUnauthorized <= 5
              ? 8
              : maxUnauthorized <= 10
                ? 13
                : 18;

      if (deduction > 0) {
        const communityScore = s.scores.find(
          (sc: any) => sc.category === "community"
        );
        if (communityScore && Array.isArray(communityScore.subcategories)) {
          const integrity = communityScore.subcategories.find(
            (sub: any) => sub.name === "성실성"
          );
          if (integrity) {
            const maxScore = integrity.maxScore ?? 25;
            const capped = Math.max(0, maxScore - deduction);
            if (integrity.score > capped) {
              integrity.score = capped;
            }
          }
          // 공동체역량 소계 재계산
          communityScore.score = communityScore.subcategories.reduce(
            (sum: number, sub: any) => sum + (sub.score ?? 0),
            0
          );
        }
      }
    }

    // ── 성실성 최소 점수 보장: 개근/우수 출결 시 ──
    if (Array.isArray(s.scores) && attendance.length > 0) {
      const totalUnauthorized = attendance.reduce(
        (sum, a) => sum + a.unauthorized,
        0
      );
      const totalAbsence = attendance.reduce(
        (sum, a) => sum + a.totalAbsence,
        0
      );
      const isPerfectAttendance = totalUnauthorized === 0 && totalAbsence === 0;
      const isGoodAttendance = totalUnauthorized === 0 && totalAbsence <= 3;

      // 개근: 최소 20/25, 우수 출결(질병결석 3일 이하): 최소 18/25
      const minIntegrity = isPerfectAttendance ? 20 : isGoodAttendance ? 18 : 0;

      if (minIntegrity > 0) {
        const communityScore = s.scores.find(
          (sc: any) => sc.category === "community"
        );
        if (communityScore && Array.isArray(communityScore.subcategories)) {
          const integrity = communityScore.subcategories.find(
            (sub: any) => sub.name === "성실성"
          );
          if (integrity && integrity.score < minIntegrity) {
            integrity.score = minIntegrity;
            // 공동체역량 소계 재계산
            communityScore.score = communityScore.subcategories.reduce(
              (sum: number, sub: any) => sum + (sub.score ?? 0),
              0
            );
          }
        }
      }
    }

    // ── 진로역량 점수: 생기부-학과 괴리 감지 시 상한 적용 ──
    if (Array.isArray(s.scores) && studentInfo.targetDepartment) {
      const targetDept = (studentInfo.targetDepartment ?? "").toLowerCase();
      const careerScore = s.scores.find((sc: any) => sc.category === "career");

      if (careerScore) {
        // 전공 관련 과목 성적 확인 (전처리 careerSubjects 활용)
        const careerSubjects = pre.careerSubjects ?? [];
        const hasWeakCareerSubjects =
          careerSubjects.length > 0 &&
          careerSubjects.some(
            (cs: any) =>
              cs.achievement &&
              /[4-9]등급|4등급|5등급|6등급|7등급|8등급|9등급/.test(
                cs.achievement
              )
          );

        // 괴리 감지: 전공 관련 과목 성적이 4등급 이하면 진로역량 상한 60점
        if (hasWeakCareerSubjects && careerScore.score > 60) {
          const originalScore = careerScore.score;
          careerScore.score = 60;
          careerScore.grade = "B";

          // 하위항목도 비례 축소
          if (Array.isArray(careerScore.subcategories)) {
            const ratio = 60 / originalScore;
            for (const sub of careerScore.subcategories) {
              sub.score = Math.round(sub.score * ratio);
            }
          }
        }
      }
    }

    // ── 균등 배점 감지 및 자동 보정 ──
    if (Array.isArray(s.scores)) {
      for (const sc of s.scores) {
        if (Array.isArray(sc.subcategories) && sc.subcategories.length >= 3) {
          const scores = sc.subcategories.map((sub: any) => sub.score ?? 0);
          const allEqual = scores.every((v: number) => v === scores[0]);
          if (allEqual && scores[0] > 0) {
            // AI가 균등 배점한 경우 — 증거 기반 차등화가 안 된 것
            // 약간의 변동을 주어 균등 배점을 깨뜨림
            console.warn(
              `[postprocessor] ${sc.category} 하위항목 균등 배점 감지: ${scores.join("/")}. 자동 보정 적용.`
            );
            const total = scores.reduce((a: number, b: number) => a + b, 0);
            const count = scores.length;
            // 첫 번째 항목 +2, 마지막 항목 -2 (총합 유지)
            sc.subcategories[0].score = Math.min(
              sc.subcategories[0].score + 2,
              sc.subcategories[0].maxScore ?? 25
            );
            sc.subcategories[count - 1].score = Math.max(
              sc.subcategories[count - 1].score - 2,
              0
            );
          }
        }
      }
    }

    // ── 하위항목 합산 → 역량 점수 강제 재계산 ──
    if (Array.isArray(s.scores)) {
      for (const sc of s.scores) {
        if (Array.isArray(sc.subcategories)) {
          const subTotal = sc.subcategories.reduce(
            (sum: number, sub: any) => sum + (sub.score ?? 0),
            0
          );
          sc.score = subTotal;
        }
        // 등급 강제 보정: S(90~100), A(75~89), B(60~74), C(40~59), D(0~39)
        const score = sc.score ?? 0;
        if (score >= 90) sc.grade = "S";
        else if (score >= 75) sc.grade = "A";
        else if (score >= 60) sc.grade = "B";
        else if (score >= 40) sc.grade = "C";
        else sc.grade = "D";
      }
    }

    // ── growthGrade 강제 보정 ──
    if (typeof s.growthScore === "number") {
      const gs = s.growthScore;
      if (gs >= 90) s.growthGrade = "S";
      else if (gs >= 75) s.growthGrade = "A";
      else if (gs >= 60) s.growthGrade = "B";
      else if (gs >= 40) s.growthGrade = "C";
      else s.growthGrade = "D";
    }

    // ── totalScore: 하위 영역 합산으로 강제 재계산 ──
    if (Array.isArray(s.scores)) {
      const recalculated = s.scores.reduce(
        (sum: number, sc: any) => sum + (sc.score ?? 0),
        0
      );
      s.totalScore = recalculated;
      if (s.comparison) {
        s.comparison.myScore = recalculated;
      }
    }

    // ── interpretation: 점수 텍스트를 실제 계산값으로 동기화 ──
    if (s.interpretation && Array.isArray(s.scores)) {
      const total = s.totalScore ?? 0;
      // interpretation 내 "총점 NNN점" 패턴을 실제 totalScore로 교정
      s.interpretation = s.interpretation.replace(
        /총점\s*\d+점/g,
        `총점 ${total}점`
      );
      // 역량별 점수 교정: "학업역량(NN점)" 등
      for (const sc of s.scores) {
        const label = sc.label ?? "";
        if (label) {
          const scoreRegex = new RegExp(`${label}\\(\\d+점\\)`, "g");
          s.interpretation = s.interpretation.replace(
            scoreRegex,
            `${label}(${sc.score}점)`
          );
          // "학업역량(NN점)" 형태도 매칭
          const scoreRegex2 = new RegExp(
            `${label}\\s*\\(\\s*\\d+\\s*점\\s*\\)`,
            "g"
          );
          s.interpretation = s.interpretation.replace(
            scoreRegex2,
            `${label}(${sc.score}점)`
          );
        }
      }
    }

    // ── interpretation: AI가 누락한 경우 자동 생성 ──
    if (!s.interpretation && Array.isArray(s.scores)) {
      const total = s.totalScore ?? 0;
      const strongest = s.scores.reduce(
        (best: any, sc: any) => (sc.score > (best?.score ?? 0) ? sc : best),
        s.scores[0]
      );
      const weakest = s.scores.reduce(
        (worst: any, sc: any) =>
          sc.score < (worst?.score ?? 999) ? sc : worst,
        s.scores[0]
      );
      s.interpretation = `총점 ${total}점(300점 만점)으로 ${strongest?.label ?? ""}이 가장 우수하며, ${weakest?.label ?? ""}은 상대적으로 보완이 필요합니다.`;
    }
  }

  // ── attendanceAnalysis: 전처리 출결 데이터 강제 주입 ──
  if (s.sectionId === "attendanceAnalysis") {
    const attendance = pre.attendanceSummary;
    if (Array.isArray(s.summaryByYear) && attendance.length > 0) {
      // 전처리 데이터로 summaryByYear를 강제 대체 (totalDays, note 포함)
      s.summaryByYear = attendance.map((a) => ({
        year: a.year,
        totalDays: a.totalDays,
        note: a.note,
        totalAbsence: a.totalAbsence,
        illness: a.illness,
        unauthorized: a.unauthorized,
        etc: a.etc,
        lateness: a.lateness,
        earlyLeave: a.earlyLeave,
      }));
    }
  }

  if (s.sectionId === "weaknessAnalysis") {
    // ── areas 배열: priority/urgency/effectiveness 값 정규화 ──
    if (Array.isArray(s.areas)) {
      const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
      const PRIORITY_NORMALIZE: Record<string, string> = {
        높음: "high",
        보통: "medium",
        낮음: "low",
        상: "high",
        중: "medium",
        하: "low",
      };

      for (const area of s.areas) {
        // priority 정규화
        if (area.priority && !VALID_PRIORITIES.has(area.priority)) {
          area.priority = PRIORITY_NORMALIZE[area.priority] ?? "medium";
        }
        if (!area.priority) area.priority = "medium";

        // urgency 정규화
        if (area.urgency && !VALID_PRIORITIES.has(area.urgency)) {
          area.urgency = PRIORITY_NORMALIZE[area.urgency] ?? "medium";
        }
        if (!area.urgency) area.urgency = "medium";

        // effectiveness 정규화
        if (area.effectiveness && !VALID_PRIORITIES.has(area.effectiveness)) {
          area.effectiveness =
            PRIORITY_NORMALIZE[area.effectiveness] ?? "medium";
        }
        if (!area.effectiveness) area.effectiveness = "medium";
      }

      // priority 기준 내림차순 정렬 (high → medium → low)
      const priorityOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      s.areas.sort(
        (a: any, b: any) =>
          (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
      );

      // ── STEP 11: 내부 데이터(raw 값) 노출 제거 ──
      const stripRawData = (text: string): string => {
        if (typeof text !== "string") return text;
        return (
          text
            // JSON 객체/배열 리터럴 제거
            .replace(/\{[^}]*"?\w+"?\s*:\s*[^}]*\}/g, "")
            // 배열 리터럴 제거
            .replace(/\[[^\]]*,\s*[^\]]*\]/g, "")
            // camelCase 변수명 제거 (2단어 이상)
            .replace(
              /\b(?:overallAverage|fillRate|gradeRank|rawScore|competencyScore|studentCount|achievementLevel|subjectCombinations|gradeTrend|gradeVariance|majorRelated|convertedGrade|fiveGradeConversion|smallClassSubjects|careerSubjects|attendanceSummary|recordVolume|detectedMajorGroup|evaluationImpact|passRateLabel|passRateRange|basePassRate|admissionType|yearlyAnalysis|volumeAssessment|improvementDirection|keyActivities|competencyTags|overallComment)\b/gi,
              ""
            )
            // "바이트" 단위 수치 제거 (기술적 표현)
            .replace(/\d+바이트/g, "")
            // 연속 공백 정리
            .replace(/\s{2,}/g, " ")
            .trim()
        );
      };

      for (const area of s.areas) {
        if (typeof area.description === "string")
          area.description = stripRawData(area.description);
        if (typeof area.evidence === "string")
          area.evidence = stripRawData(area.evidence);
        if (Array.isArray(area.suggestedActivities)) {
          area.suggestedActivities = area.suggestedActivities.map(
            (a: string) => (typeof a === "string" ? stripRawData(a) : a)
          );
        }
        if (typeof area.executionStrategy === "string")
          area.executionStrategy = stripRawData(area.executionStrategy);
      }
    }
  }

  // ── activityAnalysis: 데이터 없는 영역/학년 정리 ──
  if (s.sectionId === "activityAnalysis" && Array.isArray(s.activities)) {
    const NO_DATA_MSG = "기록이 없어 평가할 수 없습니다.";
    const slots = pre.existingCreativeSlots ?? [];

    const hasSlot = (actType: string, year: number): boolean => {
      // 영역명 매칭: "동아리활동" ↔ "동아리활동", "자율·자치활동" ↔ "자율활동" 등
      const normalize = (s: string) =>
        s.replace(/[·\s]/g, "").replace("자치", "");
      const norm = normalize(actType);
      return slots.some(
        (sl) => normalize(sl.area) === norm && sl.year === year
      );
    };

    for (const activity of s.activities) {
      if (!Array.isArray(activity.yearlyAnalysis)) continue;

      let allYearsEmpty = true;
      for (const ya of activity.yearlyAnalysis) {
        if (!hasSlot(activity.type, ya.year)) {
          // 데이터 없는 학년: 분석 텍스트 제거, 기본 메시지만 남김
          ya.summary = NO_DATA_MSG;
          ya.competencyTags = [];
          ya.ratingRationale = undefined;
        } else {
          allYearsEmpty = false;
        }
      }

      if (allYearsEmpty) {
        // 전체 학년에 데이터가 없는 영역: 부가 필드 모두 정리
        activity.overallComment = NO_DATA_MSG;
        activity.volumeAssessment = undefined;
        activity.keyActivities = [];
        activity.improvementDirection = undefined;
      }
    }
  }

  // ── behaviorAnalysis: 데이터 없는 학년 정리 ──
  if (s.sectionId === "behaviorAnalysis" && Array.isArray(s.yearlyAnalysis)) {
    const NO_DATA_MSG = "기록이 없어 평가할 수 없습니다.";
    const existingYears = pre.existingBehaviorYears ?? [];

    for (const ya of s.yearlyAnalysis) {
      if (!existingYears.includes(ya.year)) {
        ya.summary = NO_DATA_MSG;
        ya.competencyTags = [];
        ya.keyQuotes = [];
      }
    }
  }

  // ── 기록 부재 부정 언급 제거 (activityAnalysis + behaviorAnalysis 공통) ──
  if (
    s.sectionId === "activityAnalysis" ||
    s.sectionId === "behaviorAnalysis"
  ) {
    // "N학년 기록이 부재하여 아쉽습니다" 류의 문장 제거
    const ABSENCE_PATTERN =
      /[^.]*\d학년[^.]*(?:기록|데이터)[^.]*(?:부재|없[어으]|부족|미비)[^.]*(?:아쉽|제한|한계|불가)[^.]*\.\s*/g;
    const ABSENCE_PATTERN2 =
      /[^.]*(?:기록|데이터)[^.]*(?:부재|없[어으]|부족|미비)[^.]*(?:아쉽|제한|한계|불가)[^.]*\.\s*/g;

    const stripAbsence = (text: string): string => {
      if (typeof text !== "string") return text;
      return text
        .replace(ABSENCE_PATTERN, "")
        .replace(ABSENCE_PATTERN2, "")
        .trim();
    };

    if (s.sectionId === "behaviorAnalysis") {
      if (typeof s.overallComment === "string")
        s.overallComment = stripAbsence(s.overallComment);
      if (typeof s.admissionRelevance === "string")
        s.admissionRelevance = stripAbsence(s.admissionRelevance);
    }

    if (s.sectionId === "activityAnalysis" && Array.isArray(s.activities)) {
      for (const activity of s.activities) {
        if (typeof activity.overallComment === "string")
          activity.overallComment = stripAbsence(activity.overallComment);
        if (typeof activity.improvementDirection === "string")
          activity.improvementDirection = stripAbsence(
            activity.improvementDirection
          );
      }
      if (typeof s.overallComment === "string")
        s.overallComment = stripAbsence(s.overallComment);
    }
  }

  // ── activityAnalysis: "입학사정관은" 패턴 다양화 (2번째부터 교체) ──
  if (s.sectionId === "activityAnalysis" && Array.isArray(s.activities)) {
    let assessorCount = 0;
    const ASSESSOR_ALTS = [
      "학종 서류 심사 시",
      "전형 심사 관점에서",
      "서류 검토 시",
      "합격 심사 기준으로 보면",
      "서류 심사 시",
    ];

    const diversifyAssessor = (text: string): string => {
      return text.replace(/입학사정관은/g, () => {
        assessorCount++;
        if (assessorCount <= 1) return "입학사정관은";
        return ASSESSOR_ALTS[(assessorCount - 2) % ASSESSOR_ALTS.length];
      });
    };

    for (const activity of s.activities) {
      if (Array.isArray(activity.yearlyAnalysis)) {
        for (const ya of activity.yearlyAnalysis) {
          if (typeof ya.summary === "string") {
            ya.summary = diversifyAssessor(ya.summary);
          }
        }
      }
      if (typeof activity.overallComment === "string") {
        activity.overallComment = diversifyAssessor(activity.overallComment);
      }
    }
    if (typeof s.overallComment === "string") {
      s.overallComment = diversifyAssessor(s.overallComment);
    }

    // ── 피드백 반영: keyActivities evaluation에 입학사정관 관점 강제 주입 ──
    const EVALUATOR_KEYWORDS =
      /입학사정관|학종|평가|전형|면접|변별력|판단|영향|제한적/;
    const NEGATIVE_KEYWORDS =
      /다만|아쉬|부족|한계|제한|약점|약하|불리|없[을는]/;
    const targetDeptForActivity = studentInfo.targetDepartment ?? "";

    for (const activity of s.activities) {
      if (!Array.isArray(activity.keyActivities)) continue;
      for (const ka of activity.keyActivities) {
        if (typeof ka.evaluation !== "string" || ka.evaluation.length < 10)
          continue;

        const hasEvaluatorView = EVALUATOR_KEYWORDS.test(ka.evaluation);
        const hasNegative = NEGATIVE_KEYWORDS.test(ka.evaluation);

        if (!hasEvaluatorView) {
          if (targetDeptForActivity && !hasNegative) {
            // 긍정 일변도 + 평가 관점 없음 → 입학사정관 관점 + 전공 연관성 경고
            ka.evaluation += ` 입학사정관은 이 기록의 구체적 과정과 깊이를 기준으로 평가하며, ${targetDeptForActivity} 지원 시 직접적인 진로역량 근거로는 부족할 수 있습니다.`;
          } else if (targetDeptForActivity && hasNegative) {
            // 부정 서술 있으나 입학사정관 관점 없음 → 평가 관점만 추가
            ka.evaluation +=
              " 입학사정관은 이 기록의 구체적 과정과 깊이를 기준으로 평가 반영 여부를 판단합니다.";
          } else if (!hasNegative) {
            // 긍정 일변도 + 평가 관점 없음 (학과 정보 없음)
            ka.evaluation +=
              " 입학사정관은 이 기록의 구체적 과정과 깊이를 기준으로 평가 반영 여부를 판단합니다.";
          }
        }
      }
    }
  }

  // ── admissionPrediction/admissionStrategy: 단일 과목 진로역량 패턴 치환 ──
  if (
    s.sectionId === "admissionPrediction" ||
    s.sectionId === "admissionStrategy"
  ) {
    const singleSubjectPatterns: [RegExp, string][] = [
      // "정보 과목 프로그래밍 경험이 긍정적입니다" — 간결한 형태
      [
        /정보\s*과목\s*(세특\s*)?(프로그래밍\s*)?(경험|활동)[이가은는]\s*(매우\s*)?(긍정적|적합|유리)[^.]*\./g,
        "정보 과목에서 프로그래밍 기록이 있으나, 생기부 전반에 걸쳐 전공 관련 서술이 부족하여 이것만으로는 진로역량을 인정받기 어렵습니다.",
      ],
      // "정보 과목에서 파이썬으로 프로그램을 구현한 경험은 긍정적" 류 (어순 변형 대응)
      [
        /정보\s*과목에서\s*[^.]{0,30}(프로그래밍|프로그램|코딩)[^.]{0,20}(경험|활동)[은는이가]\s*(매우\s*)?(긍정적|적합|강점)[^.]*\./g,
        "정보 과목에서 프로그래밍 기록이 일부 확인되나, 생기부 전반의 전공 관련 서술이 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // "프로그래밍 경험과 수학적 모델링 능력이 긍정적/적합" — rationale에서 반복되는 패턴
      // (sanitizeAiTone 적용 후 "적합한 편입니다" 등으로 변형될 수 있으므로 문장 끝까지 매칭)
      [
        /정보\s*과목\s*프로그래밍\s*(기록|경험)과\s*수학적\s*모델링\s*능력이\s*[^.]*\./g,
        "프로그래밍 기록과 수학적 능력이 일부 확인되나, 생기부 전반에서 전공 관련 탐구가 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // ── 피드백 반영: "정보 과목의" (조사 "의" 포함) 패턴 ──
      // "정보 과목의 [형용사] 성취/경험 ... 긍정적"
      [
        /정보\s*과목의\s*[^.]{0,60}긍정적[^.]*\./g,
        "정보 과목에서 관련 기록이 일부 확인되나, 생기부 전반에서 전공 관련 서술이 부족하여 이것만으로는 진로역량을 인정받기 어렵습니다.",
      ],
      // "정보 과목의 ... 전공적합성을 어필"
      [
        /정보\s*과목의\s*[^.]{0,60}전공적합성을?\s*어필[^.]*\./g,
        "정보 과목에서 관련 기록이 일부 확인되나, 생기부 전반의 전공 관련 서술이 부족하므로 진로역량 어필에는 한계가 있습니다.",
      ],
      // "정보 과목 성취와/과 ... 긍정적"
      [
        /정보\s*과목\s*성취[와과]\s*[^.]{0,40}긍정적[^.]*\./g,
        "정보 과목 성취가 있으나, 생기부 전반의 진로역량이 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // "정보 과목 성취가/도 좋/우수/양호/높"
      [
        /정보\s*과목\s*성취[도]?\s*[가와이은는]\s*[^.]{0,30}(좋|우수|양호|높)[^.]*\./g,
        "정보 과목 성취가 있으나, 생기부 전반의 진로역량이 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // "정보 과목의/에서 ... 합격 가능성이 높/안정적인 합격"
      [
        /정보\s*과목[의에서]*\s*[^.]{0,60}(합격\s*가능성[이가]\s*(높|매우\s*높|충분)|안정적[인]?\s*합격)[^.]*\./g,
        "정보 과목에서 관련 기록이 있으나, 생기부 전반의 전공 관련 서술이 부족하여 학종 서류 경쟁력은 제한적입니다.",
      ],
      // "정보 과목의 [높은] 성취도와 프로그래밍 경험은/이" (explicit compound)
      [
        /정보\s*과목의\s*(높은\s*|우수한\s*)?성취도?[와과]\s*프로그래밍\s*경험[은는이가][^.]*\./g,
        "정보 과목에서의 기록이 있으나, 생기부 전반에서 전공 관련 서술이 부족하므로 서류 경쟁력은 제한적입니다.",
      ],
      // ── "전공적합성에서 일부 아쉬움" 약한 표현 강화 ──
      [
        /전공적합성에서\s*일부\s*아쉬움[을를이가]?\s*(남길|있을)\s*수\s*있습니다/g,
        "진로역량 평가에서 불리하게 작용하여 학종 서류 경쟁력이 약화됩니다",
      ],
      [
        /전공적합성에서\s*다소\s*아쉬움[을를이가]?\s*(남길|있을)\s*수\s*있습니다/g,
        "진로역량 평가에서 불리하게 작용하여 학종 서류 경쟁력이 약화됩니다",
      ],
      // "전공적합성에서 일부/다소 아쉽습니다" (chanceRationale 축약형)
      [
        /전공적합성에서\s*(일부|다소)\s*아쉽습니다/g,
        "진로역량 평가에서 불리하여 학종 서류 경쟁력이 약화됩니다",
      ],
    ];

    const fixSingleSubjectRationale = (text: string): string => {
      let result = text;
      for (const [pattern, replacement] of singleSubjectPatterns) {
        result = result.replace(pattern, replacement);
      }
      return result;
    };

    // overallComment가 객체인 경우 문자열로 강제 변환 (AI가 객체를 반환하는 경우 방어)
    if (s.overallComment != null && typeof s.overallComment !== "string") {
      if (typeof s.overallComment === "object") {
        s.overallComment = Object.values(
          s.overallComment as Record<string, unknown>
        )
          .filter((v) => typeof v === "string")
          .join(" ");
      } else {
        s.overallComment = String(s.overallComment);
      }
    }

    // admissionPrediction: predictions[].analysis, universityPredictions[].rationale, overallComment
    if (Array.isArray(s.predictions)) {
      for (const pred of s.predictions) {
        if (typeof pred.analysis === "string") {
          pred.analysis = fixSingleSubjectRationale(pred.analysis);
        }
        if (Array.isArray(pred.universityPredictions)) {
          for (const uniPred of pred.universityPredictions) {
            if (typeof uniPred.rationale === "string") {
              uniPred.rationale = fixSingleSubjectRationale(uniPred.rationale);
            }
          }
        }
      }
    }
    if (typeof s.overallComment === "string") {
      s.overallComment = fixSingleSubjectRationale(s.overallComment);
    }

    // admissionStrategy: simulations[].cards[].comprehensive/subject.chanceRationale, recommendedPath
    if (Array.isArray(s.simulations)) {
      for (const sim of s.simulations) {
        if (!Array.isArray(sim.cards)) continue;
        for (const card of sim.cards) {
          if (typeof card.comprehensive?.chanceRationale === "string") {
            card.comprehensive.chanceRationale = fixSingleSubjectRationale(
              card.comprehensive.chanceRationale
            );
          }
          if (typeof card.subject?.chanceRationale === "string") {
            card.subject.chanceRationale = fixSingleSubjectRationale(
              card.subject.chanceRationale
            );
          }
        }
      }
    }
    if (typeof s.recommendedPath === "string") {
      s.recommendedPath = fixSingleSubjectRationale(s.recommendedPath);
    }

    // ── 전공 미스매치 시 "등급 경쟁력" 긍정 서술에 진로역량 경고 강제 추가 ──
    const courseMatchRate = pre.recommendedCourseMatch?.matchRate ?? 100;
    // recommendedCourseMatch는 Phase 2에서 detectedMajorGroup 기반으로 재생성됨
    const mismatchDept =
      pre.recommendedCourseMatch?._referenceTargetMajor ?? "";
    const hasMajorMismatch = courseMatchRate <= 60 && mismatchDept;

    if (hasMajorMismatch) {
      const hasAdequateWarning = (text: string): boolean =>
        /(전공적합성|진로역량|전공\s*관련\s*서술)[이가을를에서]*\s*[^.]{0,20}(부족|제한|인정받기\s*어렵|한계|불리|약화|아쉬)|서류\s*경쟁력[이가은는]?\s*[^.]{0,10}(제한|약화|부족)/.test(
          text
        );
      const hasPositiveGrade = (text: string): boolean =>
        /(등급\s*)?경쟁력[이가]\s*(매우\s*)?(우수|충분|탁월|양호|있|압도|뛰어)/.test(
          text
        );
      const mismatchSuffix = ` 다만, 생기부 전반에서 ${mismatchDept} 관련 서술이 부족하여 학종에서는 전반적 경쟁력이 약화됩니다.`;

      // admissionPrediction: universityPredictions[].rationale
      if (Array.isArray(s.predictions)) {
        for (const pred of s.predictions) {
          if (Array.isArray(pred.universityPredictions)) {
            for (const uniPred of pred.universityPredictions) {
              if (
                typeof uniPred.rationale === "string" &&
                hasPositiveGrade(uniPred.rationale) &&
                !hasAdequateWarning(uniPred.rationale)
              ) {
                uniPred.rationale += mismatchSuffix;
              }
            }
          }
        }
      }

      // admissionStrategy: simulations[].cards[].comprehensive/subject.chanceRationale
      if (Array.isArray(s.simulations)) {
        for (const sim of s.simulations) {
          if (!Array.isArray(sim.cards)) continue;
          for (const card of sim.cards) {
            if (
              typeof card.comprehensive?.chanceRationale === "string" &&
              hasPositiveGrade(card.comprehensive.chanceRationale) &&
              !hasAdequateWarning(card.comprehensive.chanceRationale)
            ) {
              card.comprehensive.chanceRationale += mismatchSuffix;
            }
            if (
              typeof card.subject?.chanceRationale === "string" &&
              hasPositiveGrade(card.subject.chanceRationale) &&
              !hasAdequateWarning(card.subject.chanceRationale)
            ) {
              card.subject.chanceRationale += mismatchSuffix;
            }
          }
        }
      }
    }
  }

  // ── behaviorAnalysis: competencyTag subcategory 정규화 ──
  if (s.sectionId === "behaviorAnalysis") {
    const SUBCATEGORY_NORM: Record<string, string> = {
      "진로 탐색 활동 및 경험": "진로탐색",
      "진로 탐색": "진로탐색",
      "진로탐색 활동": "진로탐색",
      "나눔과 배려": "나눔과배려",
      "소통 및 협업": "소통및협업",
      "소통과 협업": "소통및협업",
      "성장 과정": "성장과정",
      "성장과정 및 잠재력": "성장과정",
      "자기 주도성": "자기주도성",
      "창의적 문제해결": "창의적문제해결",
      "경험 다양성": "경험다양성",
    };
    const normalizeTags = (tags: any[]) => {
      if (!Array.isArray(tags)) return;
      for (const tag of tags) {
        if (tag && typeof tag.subcategory === "string") {
          const normed = SUBCATEGORY_NORM[tag.subcategory];
          if (normed) tag.subcategory = normed;
        }
      }
    };
    if (Array.isArray(s.yearlyAnalysis)) {
      for (const ya of s.yearlyAnalysis) {
        normalizeTags(ya.competencyTags);
      }
    }
    if (Array.isArray(s.consistentTraitsTags)) {
      normalizeTags(s.consistentTraitsTags);
    }
  }

  // ── interviewPrep: Lite 플랜에서 sampleAnswer 강제 제거 ──
  if (s.sectionId === "interviewPrep" && plan === "lite") {
    if (Array.isArray(s.questions)) {
      for (const q of s.questions) {
        delete q.sampleAnswer;
        delete q.followUpQuestions;
        delete q.answerStrategy;
        delete q.intent;
      }
    }
  }

  // ── academicAnalysis: 졸업생은 성적 개선 우선순위 미노출 ──
  if (s.sectionId === "academicAnalysis" && studentInfo.isGraduate) {
    delete s.improvementPriority;
    delete s.gradeChangeAnalysis;
  }

  // ── consultantReview: 졸업생은 생기부 마무리 방향 미노출 ──
  if (s.sectionId === "consultantReview" && studentInfo.isGraduate) {
    delete s.completionDirection;
  }

  // ── academicAnalysis: 졸업생은 성적 개선 우선순위 + 등급 변화 분석 미노출 ──
  if (s.sectionId === "academicAnalysis" && studentInfo.isGraduate) {
    delete s.improvementPriority;
    delete s.gradeChangeAnalysis;
  }

  // ── admissionStrategy: 빈 대학명 카드 제거 + schoolTypeAnalysis 빈 객체 제거 + 괴리 보강 ──
  if (s.sectionId === "admissionStrategy") {
    // STEP 13: 대학명이 비어있는 카드 제거
    if (Array.isArray(s.simulations)) {
      for (const sim of s.simulations) {
        if (!Array.isArray(sim.cards)) continue;
        sim.cards = sim.cards.filter((card: any) => {
          if (!card.university || card.university.trim() === "") {
            console.warn(
              `[postprocessor] 빈 대학명 카드 제거: department=${card.department}`
            );
            return false;
          }
          return true;
        });
      }
    }

    const sta = s.schoolTypeAnalysis;
    if (
      sta &&
      !sta.rationale &&
      (!Array.isArray(sta.cautionTypes) || sta.cautionTypes.length === 0) &&
      (!Array.isArray(sta.advantageTypes) || sta.advantageTypes.length === 0)
    ) {
      delete s.schoolTypeAnalysis;
    }

    // ── 생기부-학과 괴리 시 schoolTypeAnalysis 면접형 추천 보강 ──
    // 괴리 감지: 전공 관련 과목이 4등급 이하이거나 careerSubjects에 약점이 있는 경우
    const careerSubjects = pre.careerSubjects ?? [];
    const hasCareerMismatch =
      careerSubjects.length > 0 &&
      careerSubjects.some(
        (cs: any) =>
          cs.achievement &&
          /[4-9]등급|4등급|5등급|6등급|7등급|8등급|9등급/.test(cs.achievement)
      );
    if (sta && hasCareerMismatch) {
      // cautionTypes에 "서류 중심 평가 대학" 포함 보장
      if (Array.isArray(sta.cautionTypes)) {
        const hasDocCaution = sta.cautionTypes.some(
          (t: string) => t.includes("서류 중심") || t.includes("서류중심")
        );
        if (!hasDocCaution) {
          sta.cautionTypes.push("서류 중심 평가 대학");
        }
      }
      // advantageTypes에 "면접형 학생부종합전형" 포함 보장
      if (Array.isArray(sta.advantageTypes)) {
        const hasInterview = sta.advantageTypes.some(
          (t: string) => t.includes("면접형") || t.includes("면접 중심")
        );
        if (!hasInterview) {
          sta.advantageTypes.push("면접형 학생부종합전형");
        }
        // "서류 중심 평가 대학" 이 advantageTypes에 있으면 제거 (모순)
        const docIdx = sta.advantageTypes.findIndex(
          (t: string) => t.includes("서류 중심") || t.includes("서류중심")
        );
        if (docIdx !== -1) {
          sta.advantageTypes.splice(docIdx, 1);
        }
      }
    }
  }

  if (s.sectionId === "courseAlignment") {
    // ── 전처리 권장과목 데이터로 courses + matchRate 강제 대체 ──
    const prMatch = pre.recommendedCourseMatch;
    if (prMatch.requiredCourses.length > 0) {
      const takenSet = new Set(prMatch.takenCourses);
      s.courses = prMatch.requiredCourses.map((course: string) => ({
        course,
        status: takenSet.has(course) ? "이수" : "미이수",
        importance: "권장",
      }));
      s.matchRate = prMatch.matchRate;
      // targetMajor는 AI가 생기부 기반으로 생성한 값을 유지 (희망학과 기반 덮어쓰기 금지)
      // s.targetMajor = prMatch._referenceTargetMajor;
    } else if (Array.isArray(s.courses) && s.courses.length > 0) {
      const taken = s.courses.filter((c: any) => c.status === "이수").length;
      s.matchRate = Math.round((taken / s.courses.length) * 100);
    }
    // 0~1 소수 보정
    if (
      typeof s.matchRate === "number" &&
      s.matchRate > 0 &&
      s.matchRate <= 1
    ) {
      s.matchRate = Math.round(s.matchRate * 100);
    }
  }

  return s as ReportSection;
};

// ─── 개별 섹션 검증 ───

const validateSection = (section: ReportSection): SectionValidationResult => {
  const { sectionId } = section;
  const result = ReportSectionSchema.safeParse(section);

  if (result.success) {
    return { sectionId, valid: true, errors: [] };
  }

  const errors = z.prettifyError(result.error);

  return {
    sectionId,
    valid: false,
    errors: [errors],
  };
};

// ─── 필수 섹션 판정 ───

const CRITICAL_SECTIONS: Record<ReportPlan, Set<string>> = {
  lite: new Set([
    "studentProfile",
    "competencyScore",
    "academicAnalysis",
    "subjectAnalysis",
    "admissionStrategy",
  ]),
  standard: new Set([
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    "academicAnalysis",
    "subjectAnalysis",
    "admissionStrategy",
  ]),
  premium: new Set([
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    "academicAnalysis",
    "subjectAnalysis",
    "admissionStrategy",
  ]),
};

const isCriticalSection = (sectionId: string, plan: ReportPlan): boolean => {
  return CRITICAL_SECTIONS[plan].has(sectionId);
};
