// ============================================================
// 어드민 검수 에디터용 섹션별 필드 화이트리스트
//
// 각 섹션의 리포트 UI 렌더러에서 실제로 표시되는 필드만
// 검수 에디터에 노출하기 위한 설정.
//
// - true: 필드 표시 (기존 editable/readonly 로직 유지)
// - "readonly": 강제 읽기전용 표시
// - FieldWhitelist(객체): 중첩 필드 지정 (배열이면 각 아이템에 적용)
// ============================================================

import type { ReportPlan } from "./types";

// ─── 타입 ───

export interface FieldWhitelist {
  [key: string]: true | "readonly" | FieldWhitelist;
}

export type FieldDirective = true | "readonly" | FieldWhitelist;

interface SectionWhitelistConfig {
  fields: FieldWhitelist;
  /** 플랜별 추가/덮어쓰기 필드 (base fields 위에 shallow merge) */
  planOverrides?: Partial<Record<ReportPlan, FieldWhitelist>>;
}

// ─── 섹션별 화이트리스트 ───

const SECTION_FIELD_WHITELIST: Record<string, SectionWhitelistConfig> = {
  // ── Part 1: 진단 ──

  studentProfile: {
    fields: {
      typeName: true,
      typeDescription: true,
      radarChart: "readonly",
      tags: true,
      catchPhrase: true,
    },
  },

  competencyScore: {
    fields: {
      totalScore: "readonly",
      growthGrade: true,
      growthScore: "readonly",
      growthComment: true,
      scores: {
        category: true,
        label: true,
        score: "readonly",
        maxScore: "readonly",
        grade: true,
        gradeComment: true,
        subcategories: {
          name: true,
          score: "readonly",
          maxScore: "readonly",
        },
      },
      comparison: {
        myScore: "readonly",
        targetRangeAvg: "readonly",
        overallAvg: "readonly",
      },
      interpretation: true,
    },
  },

  competitiveProfiling: {
    fields: {
      level: true,
      majorDirection: true,
      keywords: true,
      connectivity: true,
      score: "readonly",
    },
  },

  // ── Part 1: 진단 (Standard+) ──

  admissionPrediction: {
    fields: {
      recommendedType: true,
      predictions: {
        admissionType: true,
        analysis: true,
        universityPredictions: {
          university: true,
          department: true,
        },
      },
      overallComment: true,
    },
  },

  // ── Part 2: 정밀 분석 ──

  academicAnalysis: {
    fields: {
      overallAverageGrade: "readonly",
      gradeTrend: true,
      gradesByYear: {
        year: "readonly",
        semester: "readonly",
        averageGrade: "readonly",
      },
      subjectCombinations: {
        combination: "readonly",
        averageGrade: "readonly",
      },
      subjectGrades: {
        subject: "readonly",
        year: "readonly",
        semester: "readonly",
        grade: "readonly",
        rawScore: "readonly",
        classAverage: "readonly",
      },
      gradeDeviationAnalysis: {
        highestSubject: true,
        lowestSubject: true,
        deviationRange: "readonly",
        riskAssessment: true,
      },
      majorRelevanceAnalysis: {
        enrollmentEffort: true,
        achievement: true,
        recommendedSubjects: true,
      },
      gradeChangeAnalysis: {
        currentTrend: true,
        prediction: true,
        actionItems: true,
        actionItemPriorities: true,
      },
      careerSubjectAnalyses: {
        subject: true,
        achievement: true,
        interpretation: true,
      },
      smallClassSubjectAnalyses: {
        subject: true,
        enrollmentSize: "readonly",
        achievementLevel: true,
        grade: "readonly",
        interpretation: true,
      },
      gradeInflationContext: true,
      improvementPriority: true,
      interpretation: true,
    },
  },

  courseAlignment: {
    fields: {
      targetMajor: true,
      matchRate: "readonly",
      courses: {
        course: true,
        importance: true,
        status: true,
      },
      missingCourseImpact: true,
      recommendation: true,
      medicalRequirements: {
        university: true,
        department: true,
        met: "readonly",
        details: true,
      },
    },
  },

  attendanceAnalysis: {
    fields: {
      overallRating: true,
      summaryByYear: {
        year: "readonly",
        totalDays: "readonly",
        totalAbsence: "readonly",
        illness: "readonly",
        unauthorized: "readonly",
        etc: "readonly",
        lateness: "readonly",
        earlyLeave: "readonly",
        note: true,
      },
      comparisonData: {
        myValue: "readonly",
        targetRangeAvg: "readonly",
        overallAvg: "readonly",
        estimationBasis: true,
      },
      integrityScore: "readonly",
      impactAnalysis: true,
      integrityContribution: true,
      estimatedDeduction: {
        deductionPoints: "readonly",
        rationale: true,
      },
      improvementAdvice: true,
    },
  },

  activityAnalysis: {
    fields: {
      curriculumVersion: true,
      activities: {
        type: true,
        yearlyAnalysis: {
          year: "readonly",
          rating: true,
          summary: true,
          competencyTags: {
            subcategory: true,
          },
          ratingRationale: true,
        },
        volumeAssessment: true,
        overallComment: true,
        keyActivities: {
          activity: true,
          evaluation: true,
          competencyTags: {
            subcategory: true,
          },
        },
        improvementDirection: true,
      },
      overallComment: true,
    },
  },

  subjectAnalysis: {
    fields: {
      subjects: {
        subjectName: true,
        year: "readonly",
        rating: true,
        competencyTags: {
          subcategory: true,
          assessment: true,
        },
        activitySummary: true,
        evaluationComment: true,
        keyQuotes: true,
        crossSubjectConnections: {
          targetSubject: true,
          connectionType: true,
        },
        detailedEvaluation: true,
        improvementDirection: true,
        improvementExample: true,
        sentenceAnalysis: {
          sentence: true,
          evaluation: true,
          improvementSuggestion: true,
        },
      },
    },
  },

  behaviorAnalysis: {
    fields: {
      characterLabel: {
        label: true,
        rationale: true,
      },
      personalityScore: "readonly",
      consistentTraits: true,
      personalityKeywords: true,
      yearlyAnalysis: {
        year: "readonly",
        summary: true,
        keyQuotes: true,
        competencyTags: {
          subcategory: true,
        },
      },
      overallComment: true,
      admissionRelevance: true,
    },
  },

  // ── Part 3: 전략 & 실행 ──

  interviewPrep: {
    fields: {
      readinessScore: "readonly",
      questionDistribution: {
        type: "readonly",
        count: "readonly",
      },
      questions: {
        questionType: true,
        importance: true,
        question: true,
        intent: true,
        answerKeywords: true,
        answerStrategy: true,
        sampleAnswer: true,
        followUpQuestions: {
          question: true,
          context: true,
        },
      },
    },
  },

  // ── Part 3: 전략 (Standard+) ──

  topicRecommendation: {
    fields: {
      topics: {
        topic: true,
        relatedSubjects: true,
        difficulty: true,
        synergyScore: "readonly",
        importance: true,
        keywordSuggestions: true,
        description: true,
        rationale: true,
        existingConnection: true,
        activityDesign: {
          steps: true,
          expectedResult: true,
        },
        sampleEvaluation: true,
      },
    },
  },

  // ── Part 3: 전략 (Premium) ──

  weaknessAnalysis: {
    fields: {
      areas: {
        area: true,
        priority: true,
        urgency: true,
        effectiveness: true,
        description: true,
        evidence: true,
        competencyTag: {
          subcategory: true,
          assessment: true,
        },
        recordSource: true,
        suggestedActivities: true,
        executionStrategy: true,
        detailedStrategy: true,
        subjectLinkStrategy: true,
      },
    },
  },

  admissionStrategy: {
    fields: {
      recommendedPath: true,
      simulations: {
        description: true,
        cards: {
          university: true,
          department: true,
          recommendedAdmissionType: true,
          comprehensive: {
            chance: true,
          },
          subject: {
            chance: true,
          },
        },
      },
      nextSemesterStrategy: true,
      typeStrategies: {
        type: true,
        suitability: true,
        analysis: true,
        reason: true,
      },
      schoolTypeAnalysis: {
        rationale: true,
        advantageTypes: true,
        cautionTypes: true,
      },
      universityGuideMatching: {
        university: true,
        department: true,
        emphasisKeywords: true,
        matchingKeywords: true,
        keywords: true,
        studentStrengthMatch: true,
        studentWeaknessMatch: true,
        analysis: true,
        matchingAnalysis: true,
      },
    },
  },

  actionRoadmap: {
    fields: {
      completionStrategy: true,
      phases: {
        phase: true,
        period: true,
        goals: true,
      },
      milestones: {
        title: true,
        category: true,
        deadline: true,
        priority: true,
        estimatedImpact: true,
      },
      prewriteProposals: true,
      evaluationWritingGuide: {
        structure: true,
        goodExample: true,
        badExample: true,
      },
      projectedOutcome: {
        category: "readonly",
        currentScore: "readonly",
        projectedScore: "readonly",
      },
      interviewTimeline: true,
    },
  },

  // ── 부록 ──

  majorExploration: {
    fields: {
      currentTargetAssessment: true,
      suggestions: {
        major: true,
        fitScore: "readonly",
        strengthMatch: true,
        rationale: true,
        gapAnalysis: true,
      },
    },
  },

  // ── 총평 ──

  consultantReview: {
    fields: {
      gradeAnalysis: true,
      courseEffort: true,
      admissionStrategy: true,
      completionDirection: true,
      finalAdvice: true,
      evaluationGuide: {
        majorFit: true,
        academicAbility: true,
        inquiryAbility: true,
        growthPotential: true,
        keyInsights: true,
        analysisMethodology: true,
      },
    },
  },
};

// ─── 필터 함수 ───

/**
 * 화이트리스트 기반으로 섹션 필드를 필터링한다.
 * 화이트리스트에 없는 필드는 결과에 포함되지 않는다.
 */
export const filterSectionFields = (
  sectionData: Record<string, unknown>,
  sectionId: string,
  plan: ReportPlan
): { filtered: Record<string, unknown>; readonlyKeys: Set<string> } => {
  const config = SECTION_FIELD_WHITELIST[sectionId];

  // 화이트리스트가 없는 섹션은 원본 그대로 반환
  if (!config) {
    return { filtered: sectionData, readonlyKeys: new Set() };
  }

  // base fields + planOverrides 병합
  const mergedFields: FieldWhitelist = {
    ...config.fields,
    ...(config.planOverrides?.[plan] ?? {}),
  };

  const readonlyKeys = new Set<string>();

  const applyWhitelist = (
    data: Record<string, unknown>,
    whitelist: FieldWhitelist
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    for (const [key, directive] of Object.entries(whitelist)) {
      if (!(key in data)) continue;

      const value = data[key];

      if (directive === true) {
        result[key] = value;
      } else if (directive === "readonly") {
        result[key] = value;
        readonlyKeys.add(key);
      } else if (typeof directive === "object" && directive !== null) {
        // 중첩 화이트리스트
        if (Array.isArray(value)) {
          // 배열의 각 아이템에 서브 화이트리스트 적용
          result[key] = value.map((item) => {
            if (
              typeof item === "object" &&
              item !== null &&
              !Array.isArray(item)
            ) {
              return applyWhitelist(item as Record<string, unknown>, directive);
            }
            return item;
          });
        } else if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          // 중첩 객체에 서브 화이트리스트 적용
          result[key] = applyWhitelist(
            value as Record<string, unknown>,
            directive
          );
        } else {
          // 예상치 못한 타입이면 그대로 포함
          result[key] = value;
        }
      }
    }

    return result;
  };

  return {
    filtered: applyWhitelist(sectionData, mergedFields),
    readonlyKeys,
  };
};
