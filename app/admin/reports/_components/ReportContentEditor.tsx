"use client";

import { useState, useCallback } from "react";
import { ChevronRight } from "lucide-react";

import styles from "./ReportContentEditor.module.css";

interface ReportContentEditorProps {
  content: Record<string, unknown>;
  onChange: (updatedContent: Record<string, unknown>) => void;
}

/** 필드 키 → 한국어 라벨 매핑 */
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

  // 학생 프로필
  studentProfile: "학생 프로필",
  typeName: "유형명",
  typeDescription: "유형 설명",
  radarChart: "레이더 차트",
  characterLabel: "캐릭터 라벨",
  personalityScore: "성향 점수",
  personalityKeywords: "성향 키워드",

  // 역량
  competencyScore: "역량 점수",
  competencyRatings: "역량 등급",
  competencySummary: "역량 요약",
  subcategories: "하위 항목",
  subcategory: "하위 항목",
  growthGrade: "발전가능성 등급",
  growthComment: "발전가능성 코멘트",
  scores: "점수 상세",
  myScore: "내 점수",
  estimatedAvg: "추정 평균",

  // 입시
  admissionPrediction: "입시 예측",
  admissionStrategy: "입시 전략",
  recommendedType: "추천 전형",
  recommendedTypeReason: "추천 전형 근거",
  predictions: "예측 결과",
  chance: "합격 가능성",
  university: "대학교",
  department: "학과",
  admissionType: "전형 유형",
  passRateLabel: "합격률 라벨",
  passRateRange: "합격률 범위",
  band: "위험 등급",
  keyFactors: "핵심 요인",
  factor: "요인",
  impact: "영향도",
  riskAnalysis: "리스크 분석",
  portfolioScores: "포트폴리오 점수",
  overallStrategy: "종합 전략",

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
  semester: "학기",
  originalGrade: "원 등급",

  // 교과 정합성
  alignmentRate: "정합률",
  matchedCourses: "일치 교과",
  unmatchedCourses: "미일치 교과",
  courseName: "교과명",
  relevance: "관련성",

  // 출결
  absences: "결석",
  latenesses: "지각",
  earlyLeaves: "조퇴",
  totalDays: "총 일수",
  consecutiveAbsences: "연속 결석",
  attendanceRate: "출석률",

  // 활동
  activities: "활동 내역",
  volunteerHours: "봉사시간",
  clubActivities: "동아리 활동",
  awards: "수상 내역",
  readingList: "독서 활동",
  leadershipRate: "리더십 비율",
  totalPositions: "직책 수",
  positionsByYear: "학년별 직책",
  positions: "직책",

  // 세특
  subjectRecords: "교과별 세특",
  originalText: "원문",
  source: "출처",
  competencyTags: "역량 태그",
  fillRate: "충실도",
  matchRate: "매칭률",
  overallFillRate: "전체 충실도",
  overallAverageGrade: "전체 평균 등급",

  // 행동특성
  behaviorRecords: "행동특성 기록",
  behaviorKeywords: "행동 키워드",
  behaviorSummary: "행동 요약",

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

  // 면접
  questions: "예상 질문",
  question: "질문",
  answer: "모범 답변",
  answerStrategy: "답변 전략",
  sampleAnswer: "모범 답변",
  followUp: "후속 질문",

  // 로드맵
  roadmapItems: "로드맵 항목",
  timeline: "일정",
  tasks: "할일",
  milestones: "마일스톤",
  month: "월",
  action: "실행 항목",

  // 부록
  majorExploration: "전공 탐색",
  majors: "관련 전공",
  majorName: "전공명",

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
  gradeComment: "등급 사유",
  ratingRationale: "평가 사유",
  importance: "중요도",
  chancePercentLabel: "합격 가능성 퍼센트",
  percentileCumulative: "누적 백분위",
  actionItemPriorities: "실행 항목 우선순위",
  tierGroupedRecommendations: "조합별 대학 추천",
  tierGroup: "조합 유형",
  nextSemesterStrategy: "다음 학기 전략",
  sampleEvaluation: "세특 서술 예시",

  // 전임 컨설턴트 2차 검수
  consultantReview: "전임 컨설턴트 2차 검수",
  gradeAnalysis: "성적 구조 분석",
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
}

const FieldRenderer = ({
  fields,
  path,
  depth,
  content,
  onChange,
}: FieldRendererProps) => {
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  const toggleSub = useCallback((key: string) => {
    setOpenSubs((prev) => ({ ...prev, [key]: !prev[key] }));
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
        const isReadonly = READONLY_KEYS.has(key);

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

          // Object arrays → collapsible list
          if (value.every((item) => isRecord(item))) {
            if (depth >= MAX_DEPTH) {
              return (
                <div key={key} className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>{label}</label>
                  <div className={styles.fieldReadonly}>
                    [{value.length} items]
                  </div>
                </div>
              );
            }

            const isOpen = openSubs[key] ?? false;
            return (
              <div key={key} className={styles.fieldGroup}>
                <button
                  className={styles.subSectionToggle}
                  onClick={() => toggleSub(key)}
                >
                  <ChevronRight
                    size={14}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                  />
                  {label} ({value.length})
                </button>
                {isOpen && (
                  <div className={styles.subSection}>
                    {(value as Record<string, unknown>[]).map((item, index) => {
                      const itemPath = [...fieldPath, index];
                      const itemKey = `${key}-${index}`;
                      const isItemOpen = openSubs[itemKey] ?? false;
                      // Try to get a meaningful label for each item
                      const itemLabel =
                        typeof item.subject === "string"
                          ? item.subject
                          : typeof item.topic === "string"
                            ? item.topic
                            : typeof item.area === "string"
                              ? item.area
                              : typeof item.type === "string"
                                ? item.type
                                : typeof item.category === "string"
                                  ? item.category
                                  : `#${index + 1}`;

                      return (
                        <div key={index}>
                          <button
                            className={styles.subSectionToggle}
                            onClick={() => toggleSub(itemKey)}
                          >
                            <ChevronRight
                              size={12}
                              className={`${styles.chevron} ${isItemOpen ? styles.chevronOpen : ""}`}
                            />
                            <span className={styles.arrayItemLabel}>
                              {itemLabel}
                            </span>
                          </button>
                          {isItemOpen && (
                            <div className={styles.subSection}>
                              <FieldRenderer
                                fields={item}
                                path={itemPath}
                                depth={depth + 1}
                                content={content}
                                onChange={onChange}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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

        // Nested objects
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

          const isOpen = openSubs[key] ?? false;
          return (
            <div key={key} className={styles.fieldGroup}>
              <button
                className={styles.subSectionToggle}
                onClick={() => toggleSub(key)}
              >
                <ChevronRight
                  size={14}
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                />
                {label}
              </button>
              {isOpen && (
                <div className={styles.subSection}>
                  <FieldRenderer
                    fields={value}
                    path={fieldPath}
                    depth={depth + 1}
                    content={content}
                    onChange={onChange}
                  />
                </div>
              )}
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
  onChange: (updatedContent: Record<string, unknown>) => void;
}

export const SingleSectionEditor = ({
  content,
  sectionIndex,
  onChange,
}: SingleSectionEditorProps) => {
  const sections = content.sections as Record<string, unknown>[] | undefined;
  const section = sections?.[sectionIndex];

  if (!section || !isRecord(section)) {
    return <div>섹션 데이터가 없습니다.</div>;
  }

  const fields = Object.fromEntries(
    Object.entries(section).filter(([k]) => k !== "title" && k !== "sectionId")
  );

  return (
    <FieldRenderer
      fields={fields}
      path={["sections", sectionIndex]}
      depth={0}
      content={content}
      onChange={onChange}
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
