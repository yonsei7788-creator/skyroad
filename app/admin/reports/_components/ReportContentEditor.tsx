"use client";

import { useState, useCallback } from "react";
import { ChevronRight } from "lucide-react";

import { filterSectionFields } from "@/libs/report/admin-field-whitelist";
import type { ReportPlan } from "@/libs/report/types";

import styles from "./ReportContentEditor.module.css";

interface ReportContentEditorProps {
  content: Record<string, unknown>;
  onChange: (updatedContent: Record<string, unknown>) => void;
}

/** 필드 키 → 한국어 라벨 매핑 (리포트 UI 기준) */
const FIELD_LABELS: Record<string, string> = {
  // 공통
  title: "제목",
  summary: "요약",
  comment: "코멘트",
  comments: "코멘트",
  description: "설명",
  interpretation: "해석",
  rationale: "근거",
  analysis: "분석",
  evidence: "근거",
  overallComment: "종합 코멘트",
  oneLiner: "한줄 요약",
  keywords: "키워드",
  catchPhrase: "캐치프레이즈",
  tags: "태그",
  label: "라벨",
  name: "이름",
  type: "유형",
  category: "카테고리",
  subject: "과목",
  topic: "주제",
  area: "영역",
  grade: "등급",
  score: "점수",
  maxScore: "만점",
  totalScore: "총점",
  rawScore: "원점수",
  year: "학년",
  semester: "학기",

  // 학생 프로필
  studentProfile: "학생 프로필",
  typeName: "학생 유형명",
  typeDescription: "유형 설명",
  radarChart: "역량 레이더 차트",
  characterLabel: "캐릭터 라벨",
  personalityScore: "성향 점수",
  personalityKeywords: "성향 키워드",
  consistentTraits: "일관된 특성",

  // 역량
  competencyScore: "역량 점수",
  competencyRatings: "역량 등급",
  competencySummary: "역량 요약",
  subcategories: "세부 역량",
  subcategory: "세부 역량",
  growthGrade: "발전가능성 등급",
  growthScore: "발전가능성 점수",
  growthComment: "발전가능성 코멘트",
  scores: "역량별 점수",
  myScore: "내 점수",
  estimatedAvg: "추정 평균",
  comparison: "비교 데이터",
  comparisonData: "비교 데이터",
  gradeComment: "등급 코멘트",

  // 입시
  admissionPrediction: "입시 예측",
  admissionStrategy: "입시 전략",
  recommendedType: "추천 전형",
  recommendedTypeReason: "추천 전형 근거",
  predictions: "전형별 예측",
  chance: "합격 가능성",
  university: "대학교",
  department: "학과",
  admissionType: "전형 유형",
  universityPredictions: "대학별 예측",
  recommendedAdmissionType: "추천 전형",
  comprehensive: "학생부종합전형",
  passRateLabel: "합격률 라벨",
  passRateRange: "합격률 범위",
  band: "위험 등급",
  keyFactors: "핵심 요인",
  factor: "요인",
  impact: "영향도",
  riskAnalysis: "리스크 분석",
  portfolioScores: "포트폴리오 점수",
  overallStrategy: "종합 전략",
  recommendedPath: "추천 입시 경로",
  simulations: "지원 시뮬레이션",
  cards: "지원 카드",
  nextSemesterStrategy: "다음 학기 전략",
  typeStrategies: "전형별 전략",
  suitability: "적합도",
  reason: "이유",
  schoolTypeAnalysis: "학교 유형 분석",
  advantageTypes: "유리한 전형",
  cautionTypes: "주의할 전형",
  universityGuideMatching: "대학별 가이드 매칭",
  emphasisKeywords: "강조 키워드",
  matchingKeywords: "매칭 키워드",
  studentStrengthMatch: "학생 강점 매칭",
  studentWeaknessMatch: "학생 약점 매칭",
  matchingAnalysis: "매칭 분석",

  strengths: "강점",
  weaknesses: "약점",
  percentileLabel: "백분위 라벨",
  gradeTrend: "성적 추세",
  recordFillRate: "기록 충실도",
  assessment: "평가",
  snapshot: "스냅샷",
  quickStats: "주요 지표",

  // 분석
  academicAnalysis: "학업 분석",
  courseAlignment: "교과 정합성",
  attendanceAnalysis: "출결 분석",
  activityAnalysis: "활동 분석",
  subjectAnalysis: "세특 분석",
  behaviorAnalysis: "행동특성 분석",

  // 학업
  subjectPerformances: "교과별 성적",
  gradeHistory: "학년별 성적",
  gradeAnalysis: "성적 분석",
  classAverage: "반 평균",
  standardDeviation: "표준편차",
  studentCount: "수강 인원",
  unitCount: "단위수",
  achievementLevel: "성취도",
  originalGrade: "원 등급",
  overallAverageGrade: "전체 평균 등급",
  gradesByYear: "학년별 평균 등급",
  averageGrade: "평균 등급",
  subjectCombinations: "과목 조합별 성적",
  combination: "과목 조합",
  subjectGrades: "과목별 성적 상세",
  gradeDeviationAnalysis: "성적 편차 분석",
  highestSubject: "최고 성적 과목",
  lowestSubject: "최저 성적 과목",
  deviationRange: "편차 범위",
  riskAssessment: "리스크 평가",
  majorRelevanceAnalysis: "전공 관련 과목 분석",
  enrollmentEffort: "이수 노력",
  achievement: "성취도",
  recommendedSubjects: "추천 과목",
  gradeChangeAnalysis: "성적 변화 분석",
  currentTrend: "현재 추세",
  prediction: "예측",
  actionItems: "실행 항목",
  careerSubjectAnalyses: "진로 관련 과목 분석",
  smallClassSubjectAnalyses: "소수 선택 과목 분석",
  enrollmentSize: "수강 인원수",
  gradeInflationContext: "등급 인플레이션 맥락",
  improvementPriority: "개선 우선순위",

  // 교과 정합성
  alignmentRate: "정합률",
  matchedCourses: "일치 교과",
  unmatchedCourses: "미일치 교과",
  courseName: "교과명",
  relevance: "관련성",
  targetMajor: "목표 전공",
  matchRate: "정합률",
  courses: "교과 목록",
  course: "교과명",
  status: "이수 상태",
  missingCourseImpact: "미이수 교과 영향",
  recommendation: "추천 사항",
  medicalRequirements: "의대 필수 요건",
  met: "충족 여부",

  // 출결
  absences: "결석",
  latenesses: "지각",
  earlyLeaves: "조퇴",
  totalDays: "총 일수",
  consecutiveAbsences: "연속 결석",
  attendanceRate: "출석률",
  overallRating: "종합 평가",
  summaryByYear: "학년별 출결 요약",
  totalAbsence: "총 결석",
  illness: "병결",
  unauthorized: "무단결석",
  etc: "기타",
  lateness: "지각",
  earlyLeave: "조퇴",
  note: "특이사항",
  estimationBasis: "추정 근거",
  integrityScore: "성실성 점수",
  impactAnalysis: "영향 분석",
  integrityContribution: "성실성 기여도",
  estimatedDeduction: "예상 감점",
  deductionPoints: "감점 점수",
  improvementAdvice: "개선 조언",

  // 활동
  activities: "활동 영역",
  volunteerHours: "봉사시간",
  clubActivities: "동아리 활동",
  awards: "수상 내역",
  readingList: "독서 활동",
  leadershipRate: "리더십 비율",
  totalPositions: "직책 수",
  positionsByYear: "학년별 직책",
  positions: "직책",
  curriculumVersion: "교육과정",
  yearlyAnalysis: "학년별 분석",
  rating: "평가",
  ratingRationale: "평가 근거",
  volumeAssessment: "분량 평가",
  keyActivities: "주요 활동",
  activity: "활동",
  evaluation: "평가",
  improvementDirection: "개선 방향",

  // 세특
  subjects: "과목별 세특",
  subjectName: "과목명",
  activitySummary: "활동 요약",
  evaluationComment: "평가 코멘트",
  keyQuotes: "주요 인용",
  crossSubjectConnections: "타 과목 연계",
  targetSubject: "연계 과목",
  connectionType: "연계 유형",
  detailedEvaluation: "상세 평가",
  improvementExample: "개선 예시",
  sentenceAnalysis: "문장 분석",
  sentence: "문장",
  improvementSuggestion: "개선 제안",
  subjectRecords: "교과별 세특",
  originalText: "원문",
  source: "출처",
  competencyTags: "역량 태그",
  fillRate: "충실도",
  overallFillRate: "전체 충실도",

  // 행동특성
  behaviorRecords: "행동특성 기록",
  behaviorKeywords: "행동 키워드",
  behaviorSummary: "행동 요약",
  admissionRelevance: "입시 관련성",

  // 전략
  weaknessAnalysis: "약점 분석",
  topicRecommendation: "주제 추천",
  interviewPrep: "면접 대비",
  storyAnalysis: "스토리 분석",
  actionRoadmap: "실행 로드맵",
  directionGuide: "방향 가이드",

  // 약점
  weakPoints: "약점 항목",
  improvementPlan: "개선 방안",
  priority: "우선순위",
  areas: "약점 영역",
  urgency: "긴급도",
  effectiveness: "효과성",
  competencyTag: "역량 태그",
  recordSource: "출처",
  suggestedActivities: "추천 활동",
  executionStrategy: "실행 전략",
  detailedStrategy: "상세 전략",
  subjectLinkStrategy: "과목 연계 전략",

  // 면접
  questions: "예상 질문",
  question: "질문",
  answer: "모범 답변",
  answerStrategy: "답변 전략",
  sampleAnswer: "모범 답변",
  followUp: "후속 질문",
  followUpQuestions: "후속 질문",
  questionType: "질문 유형",
  intent: "질문 의도",
  answerKeywords: "답변 키워드",
  context: "배경",
  readinessScore: "준비도 점수",
  questionDistribution: "질문 분포",
  count: "개수",
  importance: "중요도",

  // 로드맵
  roadmapItems: "로드맵 항목",
  timeline: "일정",
  tasks: "할일",
  milestones: "마일스톤",
  month: "월",
  action: "실행 항목",
  completionStrategy: "완성 전략",
  phases: "단계별 계획",
  phase: "단계",
  period: "기간",
  goals: "목표",
  deadline: "마감 기한",
  estimatedImpact: "예상 임팩트",
  prewriteProposals: "사전 작성 제안",
  evaluationWritingGuide: "세특 작성 가이드",
  structure: "구조",
  goodExample: "좋은 예시",
  badExample: "나쁜 예시",
  projectedOutcome: "예상 결과",
  currentScore: "현재 점수",
  projectedScore: "예상 점수",
  interviewTimeline: "면접 일정",

  // 부록
  majorExploration: "전공 탐색",
  majors: "관련 전공",
  majorName: "전공명",
  currentTargetAssessment: "현재 목표 평가",
  suggestions: "추천 전공",
  major: "전공",
  fitScore: "적합도 점수",
  strengthMatch: "강점 매칭",
  gapAnalysis: "갭 분석",

  // 벤치마크
  benchmark: "벤치마크",
  benchmarkComparison: "벤치마크 비교",
  myValue: "내 수치",
  targetRangeAvg: "목표 범위 평균",
  overallAvg: "전체 평균",
  zScore: "Z-Score",
  percentileEstimate: "백분위 추정",
  percentile: "백분위",

  // 원문 인용
  citations: "원문 인용",
  originalTextCitations: "원문 인용 목록",

  // 새 필드 (v4 개선)
  chancePercentLabel: "합격 가능성 퍼센트",
  percentileCumulative: "누적 백분위",
  actionItemPriorities: "실행 항목 우선순위",
  tierGroupedRecommendations: "조합별 대학 추천",
  tierGroup: "조합 유형",
  sampleEvaluation: "세특 서술 예시",
  // 주제 추천
  topics: "추천 주제",
  difficulty: "난이도",
  synergyScore: "시너지 점수",
  keywordSuggestions: "키워드 제안",
  existingConnection: "기존 활동 연계",
  activityDesign: "활동 설계",
  steps: "단계",
  expectedResult: "예상 결과",
  relatedSubjects: "관련 과목",

  // 전임 컨설턴트 2차 검수
  consultantReview: "전임 컨설턴트 2차 검수",
  courseEffort: "전공 교과 이수 노력 + 성취도",
  completionDirection: "생기부 마무리 방향",
  finalAdvice: "종합 한줄 조언",
  evaluationGuide: "입학사정관 평가 가이드",
  majorFit: "전공 적합성",
  academicAbility: "학업 역량",
  inquiryAbility: "탐구 역량",
  growthPotential: "발전 가능성",
  keyInsights: "핵심 인사이트",
  analysisMethodology: "분석 방법론",

  // 비교과 경쟁력 분석
  competitiveProfiling: "비교과 경쟁력 분석",
  level: "비교과 수준",
  majorDirection: "전공 방향",
  connectivity: "활동 연계성",

  // 기타
  maxCapacityChars: "최대 글자수",
  actualChars: "실제 글자수",
  rangeMin: "최솟값",
  rangeMax: "최댓값",
  items: "항목",
  details: "상세",
  recommendations: "추천",
  strategies: "전략",
  highlights: "하이라이트",
  volumeMetric: "분량 지표",
};

const formatLabel = (key: string): string => {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  // fallback: camelCase → 띄어쓰기
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

const setNestedValue = (
  obj: Record<string, unknown>,
  path: (string | number)[],
  value: unknown
): Record<string, unknown> => {
  const result = structuredClone(obj);

  let current: any = result;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
  return result;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// ─── Editable Fields ───

interface EditableTextFieldProps {
  value: string;
  isLong: boolean;
  onCommit: (value: string) => void;
}

const EditableTextField = ({
  value,
  isLong,
  onCommit,
}: EditableTextFieldProps) => {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    if (localValue !== value) {
      onCommit(localValue);
    }
  };

  if (isLong) {
    return (
      <textarea
        className={styles.fieldTextarea}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        rows={Math.min(8, Math.max(2, Math.ceil(value.length / 60)))}
      />
    );
  }

  return (
    <input
      type="text"
      className={styles.fieldInput}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

interface EditableStringArrayFieldProps {
  value: string[];
  onCommit: (value: string[]) => void;
}

const EditableStringArrayField = ({
  value,
  onCommit,
}: EditableStringArrayFieldProps) => {
  const [localValue, setLocalValue] = useState(value.join("\n"));

  const handleBlur = () => {
    const newValue = localValue
      .split("\n")
      .filter((line) => line.trim() !== "");
    onCommit(newValue);
  };

  return (
    <textarea
      className={styles.fieldTextarea}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      rows={Math.max(2, value.length)}
    />
  );
};

// ─── Recursive Field Renderer ───

const MAX_DEPTH = 3;

/** Fields that should never be editable */
const READONLY_KEYS = new Set([
  "sectionId",
  "score",
  "maxScore",
  "totalScore",
  "grade",
  "fillRate",
  "matchRate",
  "overallFillRate",
  "overallAverageGrade",
  "percentile",
  "radarChart",
  "myValue",
  "targetRangeAvg",
  "overallAvg",
  "zScore",
  "percentileEstimate",
  "rawScore",
  "classAverage",
  "standardDeviation",
  "studentCount",
  "unitCount",
  "achievementLevel",
  "passRateRange",
]);

interface FieldRendererProps {
  fields: Record<string, unknown>;
  path: (string | number)[];
  depth: number;
  content: Record<string, unknown>;
  onChange: (updatedContent: Record<string, unknown>) => void;
  readonlyKeys?: Set<string>;
}

const FieldRenderer = ({
  fields,
  path,
  depth,
  content,
  onChange,
  readonlyKeys: readonlyKeysProp,
}: FieldRendererProps) => {
  const effectiveReadonlyKeys = readonlyKeysProp ?? READONLY_KEYS;
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = useCallback((key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleFieldChange = useCallback(
    (fieldPath: (string | number)[], value: unknown) => {
      const updated = setNestedValue(content, fieldPath, value);
      onChange(updated);
    },
    [content, onChange]
  );

  return (
    <>
      {Object.entries(fields).map(([key, value]) => {
        if (key === "sectionId" || key === "title") return null;

        const fieldPath = [...path, key];
        const label = formatLabel(key);
        const isReadonly = effectiveReadonlyKeys.has(key);

        // String values
        if (typeof value === "string") {
          if (isReadonly) {
            return (
              <div key={key} className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{label}</label>
                <div className={styles.fieldReadonly}>{value}</div>
              </div>
            );
          }
          return (
            <div key={key} className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{label}</label>
              <EditableTextField
                value={value}
                isLong={value.length >= 40}
                onCommit={(v) => handleFieldChange(fieldPath, v)}
              />
            </div>
          );
        }

        // Number values — always read-only
        if (typeof value === "number") {
          return (
            <div key={key} className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{label}</label>
              <div className={styles.fieldReadonly}>{value}</div>
            </div>
          );
        }

        // Boolean values — always read-only
        if (typeof value === "boolean") {
          return (
            <div key={key} className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{label}</label>
              <div className={styles.fieldReadonly}>
                {value ? "true" : "false"}
              </div>
            </div>
          );
        }

        // Arrays
        if (Array.isArray(value)) {
          if (value.length === 0) return null;

          // String arrays → editable multiline
          if (value.every((item) => typeof item === "string")) {
            return (
              <div key={key} className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{label}</label>
                <EditableStringArrayField
                  value={value as string[]}
                  onCommit={(v) => handleFieldChange(fieldPath, v)}
                />
              </div>
            );
          }

          // Object arrays → 인라인 렌더링 (collapse 없음)
          if (value.every((item) => isRecord(item))) {
            if (depth >= MAX_DEPTH) {
              return (
                <div key={key} className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>{label}</label>
                  <div className={styles.fieldReadonly}>
                    [{value.length}개 항목]
                  </div>
                </div>
              );
            }

            // 짧은 배열(≤2)은 자동 펼침, 긴 배열은 collapse 카드
            const autoExpand = value.length <= 2;

            return (
              <div key={key} className={styles.fieldGroup}>
                <div className={styles.subSectionHeader}>
                  {label}
                  <span className={styles.subSectionCount}>
                    ({value.length}개)
                  </span>
                </div>
                <div className={styles.arrayItemsContainer}>
                  {(value as Record<string, unknown>[]).map((item, index) => {
                    const itemPath = [...fieldPath, index];
                    const itemKey = `${key}-${index}`;
                    const isOpen = openItems[itemKey] ?? autoExpand;
                    // 항목별 의미있는 라벨 추출
                    const itemLabel =
                      typeof item.subject === "string"
                        ? item.subject
                        : typeof item.subjectName === "string"
                          ? item.subjectName
                          : typeof item.topic === "string"
                            ? item.topic
                            : typeof item.area === "string"
                              ? item.area
                              : typeof item.type === "string"
                                ? item.type
                                : typeof item.category === "string"
                                  ? item.category
                                  : typeof item.major === "string"
                                    ? item.major
                                    : typeof item.university === "string"
                                      ? item.university
                                      : typeof item.question === "string"
                                        ? item.question
                                        : typeof item.phase === "string"
                                          ? item.phase
                                          : typeof item.year === "string" ||
                                              typeof item.year === "number"
                                            ? `${item.year}학년`
                                            : `#${index + 1}`;

                    return (
                      <div key={index} className={styles.arrayItem}>
                        <button
                          type="button"
                          className={styles.arrayItemToggle}
                          onClick={() => toggleItem(itemKey)}
                        >
                          <ChevronRight
                            size={14}
                            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                          />
                          <span className={styles.arrayItemHeaderText}>
                            {itemLabel}
                          </span>
                        </button>
                        {isOpen && (
                          <div className={styles.arrayItemBody}>
                            <FieldRenderer
                              fields={item}
                              path={itemPath}
                              depth={depth + 1}
                              content={content}
                              onChange={onChange}
                              readonlyKeys={effectiveReadonlyKeys}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Mixed/primitive arrays → read-only
          return (
            <div key={key} className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{label}</label>
              <div className={styles.fieldReadonly}>
                {JSON.stringify(value)}
              </div>
            </div>
          );
        }

        // Nested objects → 인라인 렌더링 (collapse 없음)
        if (isRecord(value)) {
          if (depth >= MAX_DEPTH) {
            return (
              <div key={key} className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{label}</label>
                <div className={styles.fieldReadonly}>
                  {JSON.stringify(value, null, 2)}
                </div>
              </div>
            );
          }

          return (
            <div key={key} className={styles.fieldGroup}>
              <div className={styles.subSectionHeader}>{label}</div>
              <div className={styles.subSection}>
                <FieldRenderer
                  fields={value}
                  path={fieldPath}
                  depth={depth + 1}
                  content={content}
                  onChange={onChange}
                  readonlyKeys={effectiveReadonlyKeys}
                />
              </div>
            </div>
          );
        }

        // null/undefined
        if (value === null || value === undefined) return null;

        return null;
      })}
    </>
  );
};

// ─── Single Section Editor (for 3-panel review layout) ───

interface SingleSectionEditorProps {
  content: Record<string, unknown>;
  sectionIndex: number;
  plan: ReportPlan;
  onChange: (updatedContent: Record<string, unknown>) => void;
}

export const SingleSectionEditor = ({
  content,
  sectionIndex,
  plan,
  onChange,
}: SingleSectionEditorProps) => {
  const sections = content.sections as Record<string, unknown>[] | undefined;
  const section = sections?.[sectionIndex];

  if (!section || !isRecord(section)) {
    return <div>섹션 데이터가 없습니다.</div>;
  }

  const sectionId =
    typeof section.sectionId === "string" ? section.sectionId : "";

  const rawFields = Object.fromEntries(
    Object.entries(section).filter(([k]) => k !== "title" && k !== "sectionId")
  );

  const { filtered, readonlyKeys } = filterSectionFields(
    rawFields,
    sectionId,
    plan
  );

  // 화이트리스트에서 readonly로 마킹된 키들을 READONLY_KEYS에 추가
  const mergedReadonlyKeys = new Set([...READONLY_KEYS, ...readonlyKeys]);

  return (
    <FieldRenderer
      fields={filtered}
      path={["sections", sectionIndex]}
      depth={0}
      content={content}
      onChange={onChange}
      readonlyKeys={mergedReadonlyKeys}
    />
  );
};

// ─── Main Editor ───

export const ReportContentEditor = ({
  content,
  onChange,
}: ReportContentEditorProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // sections can be an array (ReportSection[]) or object
  const sections = Array.isArray(content.sections)
    ? (content.sections as Record<string, unknown>[])
    : null;
  const sectionsObj = isRecord(content.sections) ? content.sections : null;

  return (
    <div className={styles.editor}>
      {/* Array-based sections (actual report format) */}
      {sections &&
        sections.map((section, index) => {
          const sectionId =
            typeof section.sectionId === "string"
              ? section.sectionId
              : `section-${index}`;
          const title =
            typeof section.title === "string"
              ? section.title
              : formatLabel(sectionId);
          const isOpen = openSections[sectionId] ?? false;

          return (
            <div key={sectionId} className={styles.sectionAccordion}>
              <button
                className={`${styles.sectionHeader} ${isOpen ? styles.sectionHeaderOpen : ""}`}
                onClick={() => toggleSection(sectionId)}
              >
                <span className={styles.sectionHeaderLabel}>
                  <span className={styles.sectionIndex}>{index + 1}</span>
                  {title}
                </span>
                <ChevronRight
                  size={16}
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                />
              </button>
              {isOpen && (
                <div className={styles.sectionBody}>
                  <FieldRenderer
                    fields={Object.fromEntries(
                      Object.entries(section).filter(
                        ([k]) => k !== "title" && k !== "sectionId"
                      )
                    )}
                    path={["sections", index]}
                    depth={0}
                    content={content}
                    onChange={onChange}
                  />
                </div>
              )}
            </div>
          );
        })}

      {/* Object-based sections (legacy) */}
      {sectionsObj &&
        Object.entries(sectionsObj).map(([sectionKey, sectionValue]) => {
          if (!isRecord(sectionValue)) return null;

          const title =
            typeof sectionValue.title === "string"
              ? sectionValue.title
              : formatLabel(sectionKey);
          const isOpen = openSections[sectionKey] ?? false;

          return (
            <div key={sectionKey} className={styles.sectionAccordion}>
              <button
                className={`${styles.sectionHeader} ${isOpen ? styles.sectionHeaderOpen : ""}`}
                onClick={() => toggleSection(sectionKey)}
              >
                {title}
                <ChevronRight
                  size={16}
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                />
              </button>
              {isOpen && (
                <div className={styles.sectionBody}>
                  <FieldRenderer
                    fields={Object.fromEntries(
                      Object.entries(sectionValue).filter(
                        ([k]) => k !== "title"
                      )
                    )}
                    path={["sections", sectionKey]}
                    depth={0}
                    content={content}
                    onChange={onChange}
                  />
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};
