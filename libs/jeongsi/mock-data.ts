// ============================================================
// 정시 분석 리포트 목 데이터
//
// 용도: DB·AI 없이 `/jeongsi/preview` 에서 리포트 레이아웃을
//       반복 검증하기 위한 디자인용 픽스처.
//
// 두 가지 변형을 제공한다.
// - JEONGSI_MOCK_REPORT: 현실적인 평균 케이스
// - JEONGSI_MOCK_REPORT_EDGE: 극단 케이스 (긴 대학/학과명, 결측값 다수,
//   군 공백 조합) — 레이아웃이 깨지는 지점을 미리 잡기 위한 스트레스 픽스처
//
// ⚠️ notices 는 손으로 쓰지 말 것.
//    `report/build.ts` 의 buildRecommendationNotices() 가 확정하는 값이다.
//    각 시나리오의 JeongsiInput 으로 analyzeJeongsi() → buildRecommendationNotices()
//    를 호출해 반환값을 그대로 붙여넣는다. 손으로 지어내면 실제로는 나오지 않는
//    텍스트로 레이아웃을 검증하게 되고, 도메인 규칙(§6.1-e 다른 계열 대체 금지)을
//    어기는 문구가 섞인 적이 있다.
// ============================================================

import type {
  JeongsiCombinationSection,
  JeongsiRecommendationSection,
  JeongsiReportContent,
  JeongsiScoreAnalysisSection,
  JeongsiUniversityDetailSection,
  JeongsiUniversityMatchSection,
} from "./report-types";
import type { JeongsiInput } from "./types";

const MOCK_INPUT: JeongsiInput = {
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
};

// ─── PART 1 ───

const SCORE_ANALYSIS: JeongsiScoreAnalysisSection = {
  sectionId: "jeongsiScoreAnalysis",
  title: "성적 종합 분석",
  rows: [
    {
      area: "math",
      label: "수학",
      subjectName: "미적분",
      standardScore: 137,
      percentile: 98,
      grade: 1,
      rank: 1,
      deviation: 3.2,
    },
    {
      area: "korean",
      label: "국어",
      subjectName: "언어와매체",
      standardScore: 131,
      percentile: 96,
      grade: 1,
      rank: 2,
      deviation: 1.2,
    },
    {
      area: "inquiry",
      label: "탐구",
      subjectName: "물리학I · 지구과학I",
      standardScore: 133,
      percentile: 90.5,
      grade: 2,
      rank: 3,
      deviation: -4.3,
    },
    {
      area: "english",
      label: "영어",
      subjectName: null,
      standardScore: null,
      percentile: null,
      grade: 2,
      rank: null,
      deviation: null,
    },
  ],
  averagePercentile: 94.8,
  totalStandardScore: 401,
  strengthAreas: ["math", "korean"],
  weaknessAreas: ["english", "inquiry"],
  overallComment:
    "국어·수학 표준점수 합 268점으로 상위권 대학 자연계열 지원이 가능한 성적대입니다. 특히 수학 미적분 표준점수 137점(백분위 98)은 전국 상위 2% 구간으로, 수학 반영비율이 높은 대학에서 결정적인 무기가 됩니다. 다만 영어 2등급과 탐구 백분위 90.5는 네 영역 평균을 끌어내리는 요인이므로, 영어를 감점 방식으로 반영하거나 탐구 반영비율이 낮은 전형을 선별하는 것이 지원 전략의 출발점입니다.",
  strengthComment:
    "수학과 국어가 동시에 백분위 96 이상이라는 점이 가장 큰 강점입니다. 상위권 대학 자연계열은 대부분 국어와 수학의 합산 반영비율이 65~75%에 달하므로, 두 영역이 함께 강한 구조는 환산점수 산출에서 복리로 작용합니다. 미적분 응시자에게 가산점을 부여하는 대학에서는 이 강점이 한 번 더 증폭됩니다.",
  weaknessComment:
    "영어 2등급은 영어를 비율로 반영하는 대학에서 환산점수를 유의미하게 깎습니다. 반면 감점 방식 대학에서는 1~2등급 간 감점 차이가 1점 내외에 불과해 실질 손실이 거의 없습니다. 탐구는 두 과목 간 백분위 격차(93 / 88)가 있어 상위 1과목만 반영하는 대학이 유리합니다.",
};

// ─── PART 2 ───

const UNIVERSITY_MATCH: JeongsiUniversityMatchSection = {
  sectionId: "jeongsiUniversityMatch",
  title: "나에게 유리한 대학 분석",
  items: [
    {
      university: "서울대학교",
      department: "컴퓨터공학부",
      group: "가",
      ratioSummary: "국33.3·수40·탐26.7 / 영어 감점",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      advantageScore: 92,
      reason:
        "수학 반영비율이 40%로 전국 최고 수준이고 영어를 비율에서 제외한 뒤 감점으로만 반영하기 때문에, 수학이 가장 강하고 영어가 상대적으로 약한 구조와 정확히 맞물립니다. 탐구를 변환표준점수로 환산하는 방식도 백분위 90대 초반 구간에서는 원점수 대비 손실이 작습니다.",
    },
    {
      university: "성균관대학교",
      department: "소프트웨어학과",
      group: "나",
      ratioSummary: "국30·수40·탐30 / 영어 가산",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      advantageScore: 88,
      reason:
        "수학 40% 반영에 미적분 응시자 가산점 5%가 더해져 수학 강점이 두 번 반영됩니다. 영어를 가산 방식으로 처리해 2등급의 불이익이 1점 미만으로 제한되는 점도 유리합니다.",
    },
    {
      university: "서울시립대학교",
      department: "컴퓨터과학부",
      group: "가",
      ratioSummary: "국20·수30·영20·탐30",
      metricSummary: "국·수 표준점수 / 탐구 백분위",
      advantageScore: 85,
      reason:
        "국어 반영비율이 20%로 낮은 대신 수학과 탐구가 각 30%로 높아, 수학 강점을 살리면서 국어 의존도를 낮출 수 있는 구조입니다. 다만 영어를 20% 비율로 반영하므로 2등급의 손실이 다른 대학보다 크게 나타납니다.",
    },
    {
      university: "한양대학교 ERICA캠퍼스",
      department: "인공지능학과",
      group: "나",
      ratioSummary: "국25·수35·영10·탐30",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      advantageScore: 81,
      reason:
        "수학 35%와 탐구 30%의 조합으로 자연계 강점형에 유리하며, 영어 반영비율이 10%로 낮아 영어 2등급의 영향이 제한적입니다.",
    },
    {
      university: "중앙대학교",
      department: "소프트웨어학부 첨단융합 인공지능전공",
      group: "나",
      ratioSummary: "국25·수40·탐35 / 영어 감점",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수(상위 1과목)",
      advantageScore: 78,
      reason:
        "탐구를 상위 1과목만 반영하므로 물리학I 백분위 93만 계산되어 두 과목 평균 대비 2.5점을 회복합니다. 수학 40% 반영도 유리하나, 탐구 반영비율 35%가 높아 탐구 1과목 성적에 결과가 크게 좌우되는 변동성은 감안해야 합니다.",
    },
  ],
  overallComment:
    "유리한 대학의 공통 조건은 세 가지로 정리됩니다. 첫째 수학 반영비율 35% 이상, 둘째 영어를 비율이 아닌 감점·가산으로 처리, 셋째 탐구를 변환표준점수로 환산. 이 세 조건을 모두 만족하는 대학에서는 네 영역 평균 백분위(92.4)보다 환산 등수가 한 단계 이상 올라갑니다. 반대로 영어를 15% 이상 비율로 반영하는 대학은 같은 성적으로도 경쟁자에게 밀리므로 지원 우선순위를 낮추는 것이 합리적입니다.",
};

// ─── PART 3 ───

const RECOMMENDATION: JeongsiRecommendationSection = {
  sectionId: "jeongsiRecommendation",
  title: "지원 가능 대학·학과",
  groups: [
    {
      tier: "상향",
      items: [
        {
          university: "서울대학교",
          department: "컴퓨터공학부",
          group: "가",
          quota: 31,
          convertedScore: 684.2,
          referenceCut: 691.5,
          gapRatio: -0.73,
          chance: "낮음",
          comment:
            "전년도 기준컷까지 7.3점 부족하지만, 수학 40% 반영 구조에서 미적분 고득점이 희소해 실질 격차는 더 좁습니다.",
        },
        {
          university: "연세대학교",
          department: "인공지능학과",
          group: "나",
          quota: 24,
          convertedScore: 712.8,
          referenceCut: 718.0,
          gapRatio: -0.74,
          chance: "낮음",
          comment:
            "국어 반영비율이 높아 불리하나 신설 학과 특성상 입결 변동폭이 커 상향 카드로는 유효합니다.",
        },
        {
          university: "고려대학교",
          department: "컴퓨터학과",
          group: "가",
          quota: 28,
          convertedScore: 695.1,
          referenceCut: 699.3,
          gapRatio: -0.6,
          chance: "보통",
          comment:
            "탐구 변환표준점수 적용으로 백분위 손실이 작고, 기준컷과의 격차가 환산 총점의 0.6%에 불과해 상향 중 가장 현실적입니다.",
        },
      ],
    },
    {
      tier: "적정",
      items: [
        {
          university: "성균관대학교",
          department: "소프트웨어학과",
          group: "나",
          quota: 42,
          convertedScore: 718.6,
          referenceCut: 714.2,
          gapRatio: 0.63,
          chance: "보통",
          comment:
            "미적분 가산 5%가 반영되어 기준컷을 4.4점 상회합니다. 모집인원 42명으로 충원 여지도 넓습니다.",
        },
        {
          university: "한양대학교",
          department: "컴퓨터소프트웨어학부",
          group: "나",
          quota: 38,
          convertedScore: 638.2,
          referenceCut: 634.5,
          gapRatio: 0.53,
          chance: "보통",
          comment:
            "영어 반영비율 10%로 약점 노출이 적고, 전년 대비 모집인원이 4명 늘어 기준컷 하락 가능성이 있습니다.",
        },
        {
          university: "서강대학교",
          department: "컴퓨터공학과",
          group: "나",
          quota: 26,
          convertedScore: 688.3,
          referenceCut: 690.1,
          gapRatio: -0.26,
          chance: "보통",
          comment:
            "기준컷과 거의 동일한 지점이라 경쟁률에 따라 결과가 갈립니다. 모집인원이 적어 변동성은 높습니다.",
        },
      ],
    },
    {
      tier: "안정",
      items: [
        {
          university: "중앙대학교",
          department: "소프트웨어학부 첨단융합 인공지능전공",
          group: "나",
          quota: 45,
          convertedScore: 735.9,
          referenceCut: 721.4,
          gapRatio: 2.07,
          chance: "높음",
          comment:
            "탐구 상위 1과목 반영이 유리하게 작동해 기준컷을 14.5점(환산 총점의 2.1%) 상회합니다. 안정 카드로 가장 안전합니다.",
        },
        {
          university: "서울시립대학교",
          department: "컴퓨터과학부",
          group: "가",
          quota: 34,
          convertedScore: 681.7,
          referenceCut: null,
          gapRatio: null,
          chance: "보통",
          comment:
            "학과 신설 분리로 전년도 입결이 공개되지 않았습니다. 통합 학부 기준 추정 기준컷으로는 안정권이나 판단 근거가 제한적입니다.",
        },
        {
          university: "건국대학교",
          department: "컴퓨터공학부",
          group: "다",
          quota: 29,
          convertedScore: 742.3,
          referenceCut: 718.8,
          gapRatio: 3.36,
          chance: "높음",
          comment:
            "다군 유일한 안정 카드입니다. 기준컷을 23.5점 상회하며 다군 특성상 충원율이 높아 합격 확률이 큽니다.",
        },
      ],
    },
  ],
  // buildRecommendationNotices() 실제 출력 (poolStage 2).
  // 손으로 쓰지 말 것 — 이 값은 코드가 확정한다. 추출 방법은 파일 상단 주석 참고.
  notices: [
    "희망하신 컴퓨터공학과 외에 컴퓨터·IT 계열(소프트웨어·인공지능 등)까지 함께 비교했습니다. 희망 지역(서울)의 컴퓨터공학과만으로는 현재 성적에 맞는 지원처를 고루 찾기 어려워 비교 범위를 넓혔습니다.",
    "현재 성적에 정확히 '적정'으로 분류되는 곳이 많지 않아, 기준컷과의 격차가 적정에 가장 가까운 곳을 함께 담았습니다. 함께 담은 대학의 실제 구분은 코멘트와 대학별 상세 분석에 적었습니다.",
  ],
  overallComment:
    "가군은 상향, 나군은 적정, 다군은 안정으로 배치하는 것이 이 성적대의 기본 골격입니다. 가군에 서울대·고려대를 두고 나군에서 성균관대·한양대로 실질 합격을 노리며, 다군 건국대로 하한선을 확보하는 구조입니다. 주의할 점은 나군 경쟁 밀도입니다. 상위권 자연계 모집이 나군에 집중되어 있어 적정 3곳 중 2곳이 나군에 몰리는데, 실제 지원은 1곳만 가능하므로 성균관대와 한양대 중 어느 쪽을 쓸지 원서 접수 기간 경쟁률 추이를 보고 결정해야 합니다.",
};

// ─── PART 4 ───

const COMBINATION: JeongsiCombinationSection = {
  sectionId: "jeongsiCombination",
  title: "가·나·다군 지원 조합",
  risk: "균형",
  combinations: [
    {
      id: "combo-balanced",
      label: "균형 조합",
      slots: [
        {
          group: "가",
          university: "서울대학교",
          department: "컴퓨터공학부",
          tier: "상향",
          chance: "낮음",
        },
        {
          group: "나",
          university: "성균관대학교",
          department: "소프트웨어학과",
          tier: "적정",
          chance: "보통",
        },
        {
          group: "다",
          university: "건국대학교",
          department: "컴퓨터공학부",
          tier: "안정",
          chance: "높음",
        },
      ],
      strategy:
        "지원 성향 '균형'에 가장 부합하는 표준 조합입니다. 가군에서 최상단을 노리고, 나군에서 실질 합격 가능성이 가장 높은 성균관대를 확보하며, 다군 건국대로 하한선을 고정합니다. 세 군 모두 합격 가능성이 다른 구간에 분포하므로 전체 불합격 위험이 가장 낮습니다.",
    },
    {
      id: "combo-aggressive",
      label: "소신 조합",
      slots: [
        {
          group: "가",
          university: "서울대학교",
          department: "컴퓨터공학부",
          tier: "상향",
          chance: "낮음",
        },
        {
          group: "나",
          university: "연세대학교",
          department: "인공지능학과",
          tier: "상향",
          chance: "낮음",
        },
        {
          group: "다",
          university: "건국대학교",
          department: "컴퓨터공학부",
          tier: "안정",
          chance: "높음",
        },
      ],
      strategy:
        "가·나군을 모두 상향으로 채우고 다군 하나로만 안전망을 두는 공격적 구성입니다. 재수를 감수할 수 있다면 유효하지만, 다군 한 장에 모든 하한선이 걸리므로 다군 경쟁률이 급등하면 전체가 흔들립니다. 지원 성향 '균형'보다 한 단계 공격적인 선택입니다.",
    },
    {
      id: "combo-safe",
      label: "안정 중심 조합",
      slots: [
        {
          group: "가",
          university: "서울시립대학교",
          department: "컴퓨터과학부",
          tier: "안정",
          chance: "보통",
        },
        {
          group: "나",
          university: "한양대학교",
          department: "컴퓨터소프트웨어학부",
          tier: "적정",
          chance: "보통",
        },
        {
          group: "다",
          university: "건국대학교",
          department: "컴퓨터공학부",
          tier: "안정",
          chance: "높음",
        },
      ],
      strategy:
        "세 군 모두 적정 이하로 배치해 합격 자체를 최우선으로 둔 구성입니다. 다만 가군에 상향 카드를 쓰지 않으면 이 성적으로 도달 가능한 상단을 포기하는 셈이므로, 성적 상승이 없는 재수 불가 상황에서만 권장합니다.",
    },
    {
      id: "combo-no-c",
      label: "다군 공백 조합",
      slots: [
        {
          group: "가",
          university: "고려대학교",
          department: "컴퓨터학과",
          tier: "상향",
          chance: "보통",
        },
        {
          group: "나",
          university: "서강대학교",
          department: "컴퓨터공학과",
          tier: "적정",
          chance: "보통",
        },
      ],
      strategy:
        "고려대와 서강대는 모두 다군 모집을 하지 않고, 희망 학과에서 다군으로 지원할 만한 모집단위도 없어 다군이 비는 구성입니다. 상위권 지원에서는 흔한 형태로, 잘못된 조합이 아닙니다. 다만 다군을 비우면 안전망이 사라지므로 상향을 고려대 한 곳으로 제한하고 나군을 적정으로 묶어 균형을 맞췄습니다.",
    },
  ],
  overallComment:
    "조합 선택의 기준은 '다군을 쓸 것인가'입니다. 다군은 모집 규모가 작고 상위권 대학이 적은 대신 충원율이 높아, 안정 카드로서의 가치가 가군·나군보다 큽니다. 균형 조합과 소신 조합의 차이는 나군 한 칸뿐이지만 결과는 크게 갈립니다. 나군에 성균관대를 쓰면 실질 합격 가능성이 60% 이상이고, 연세대를 쓰면 가·나군 동시 불합격 가능성이 70%를 넘습니다.",
};

// ─── PART 5 ───

const UNIVERSITY_DETAIL: JeongsiUniversityDetailSection = {
  sectionId: "jeongsiUniversityDetail",
  title: "대학별 상세 분석",
  items: [
    {
      university: "서울대학교",
      department: "컴퓨터공학부",
      group: "가",
      quota: 31,
      competitionRate: 3.42,
      ratioSummary: "국어 33.3 · 수학 40 · 탐구 26.7",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      englishHistorySummary: "영어 2등급 -0.5점 · 한국사 2등급 감점 없음",
      bonusSummary: null,
      restrictionSummary: "미적분 또는 기하 응시 필수 · 과탐 2과목 필수",
      convertedScore: 684.2,
      totalScore: 700,
      referenceCut: 691.5,
      cutHistory: [
        { year: 2024, cut: 688.4 },
        { year: 2025, cut: 690.1 },
        { year: 2026, cut: 691.5 },
      ],
      tier: "상향",
      chance: "낮음",
      reason:
        "수학 40% 반영은 전국 최고 비율이고 영어를 감점으로만 처리하므로 반영 구조상 가장 유리한 대학입니다. 3개년 기준컷이 매년 1~2점씩 상승하는 추세라 전년 기준컷을 그대로 기준으로 삼으면 과소평가될 수 있으나, 미적분·과탐 필수 제한을 모두 충족하므로 상향 1순위로 둘 가치가 있습니다.",
    },
    {
      university: "고려대학교",
      department: "컴퓨터학과",
      group: "가",
      quota: 28,
      competitionRate: 4.18,
      ratioSummary: "국어 30 · 수학 35 · 탐구 25 · 영어 10",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      englishHistorySummary: "영어 2등급 97/100점 환산 · 한국사 가산 9.8점",
      bonusSummary: "미적분·기하 응시 시 수학 표준점수 3% 가산",
      restrictionSummary: "과탐 1과목 이상 응시",
      convertedScore: 695.1,
      totalScore: 700,
      referenceCut: 699.3,
      cutHistory: [
        { year: 2024, cut: 696.0 },
        { year: 2025, cut: 698.2 },
        { year: 2026, cut: 699.3 },
      ],
      tier: "상향",
      chance: "보통",
      reason:
        "미적분 가산 3%가 적용되어 수학 강점이 추가로 반영되고, 기준컷과의 격차가 4.2점(환산 총점의 0.6%)에 불과합니다. 영어를 10% 비율로 반영하지만 2등급 환산점이 97점으로 1등급과 3점 차이뿐이어서 실질 손실은 0.3점 수준입니다. 상향 중 합격 가능성이 가장 현실적인 선택지입니다.",
    },
    {
      university: "연세대학교",
      department: "인공지능학과",
      group: "나",
      quota: 24,
      competitionRate: null,
      ratioSummary: "국어 33.3 · 수학 33.3 · 탐구 33.3",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      englishHistorySummary: "영어 2등급 -1점 감점 · 한국사 2등급 감점 없음",
      bonusSummary: null,
      restrictionSummary: null,
      convertedScore: 712.8,
      totalScore: 1000,
      referenceCut: 718.0,
      cutHistory: [
        { year: 2024, cut: null },
        { year: 2025, cut: 715.3 },
        { year: 2026, cut: 718.0 },
      ],
      tier: "상향",
      chance: "낮음",
      reason:
        "세 영역을 동일 비율로 반영하므로 수학 강점이 희석되고, 상대적으로 약한 탐구가 33.3%로 크게 반영됩니다. 2025학년도 신설 학과로 3개년 입결이 2년치만 존재해 기준컷 예측 신뢰도가 낮습니다. 영어 감점이 1점뿐인 점은 유리하나 전체 구조는 불리한 편입니다.",
    },
    {
      university: "성균관대학교",
      department: "소프트웨어학과",
      group: "나",
      quota: 42,
      competitionRate: 5.76,
      ratioSummary: "국어 30 · 수학 40 · 탐구 30",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      englishHistorySummary: "영어 2등급 가산 98점 · 한국사 2등급 가산 10점",
      bonusSummary: "미적분·기하 응시 시 수학 반영점수 5% 가산",
      restrictionSummary: null,
      convertedScore: 718.6,
      totalScore: 1000,
      referenceCut: 714.2,
      cutHistory: [
        { year: 2024, cut: 710.8 },
        { year: 2025, cut: 712.5 },
        { year: 2026, cut: 714.2 },
      ],
      tier: "적정",
      chance: "보통",
      reason:
        "수학 40% 반영에 미적분 가산 5%가 더해져 이 성적에서 가장 큰 상승폭이 발생하는 대학입니다. 영어를 가산 방식으로 처리해 2등급 손실이 2점에 불과하고, 모집인원 42명으로 충원 여지도 넓습니다. 기준컷을 4.4점 상회하므로 적정 1순위입니다.",
    },
    {
      university: "한양대학교",
      department: "컴퓨터소프트웨어학부",
      group: "나",
      quota: 38,
      competitionRate: 6.21,
      ratioSummary: "국어 25 · 수학 35 · 탐구 30 · 영어 10",
      metricSummary: "국·수 표준점수 / 탐구 백분위",
      englishHistorySummary:
        "영어 2등급 96/100점 환산 · 한국사 2등급 가산 10점",
      bonusSummary: "과탐 응시 과목당 3점 가산 (2과목 +6점)",
      restrictionSummary: null,
      // 가산을 보유하지만 환산점수·기준컷 모두 기준 만점 이내인 전형적 형태.
      // 수학 가산 5% 는 기준 만점의 1.6% 수준이라 보통은 만점을 넘지 않는다.
      convertedScore: 638.2,
      totalScore: 700,
      referenceCut: 634.5,
      cutHistory: [
        { year: 2024, cut: 628.0 },
        { year: 2025, cut: 631.4 },
        { year: 2026, cut: 634.5 },
      ],
      tier: "적정",
      chance: "보통",
      reason:
        "과탐 2과목 응시 가산 6점과 한국사 가산 10점이 그대로 적용되고 영어 반영비율도 10%로 낮아 약점 노출이 적습니다. 가산을 모두 받아도 환산점수는 기준 만점 700점의 91.2% 수준으로, 가산 보유 모집단위라고 해서 기준 만점을 넘지는 않습니다. 다만 탐구를 백분위로 반영해 변환표준점수 대비 손실이 발생하며, 전년 대비 모집인원이 4명 늘어 기준컷이 소폭 하락할 여지가 있습니다.",
    },
    {
      university: "서강대학교",
      department: "컴퓨터공학과",
      group: "나",
      quota: 26,
      competitionRate: 7.04,
      ratioSummary: "국어 34.4 · 수학 46.9 · 탐구 18.7",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      englishHistorySummary: "영어 2등급 가산 97.5점 · 한국사 2등급 가산 10점",
      bonusSummary: null,
      restrictionSummary: null,
      convertedScore: 688.3,
      totalScore: 1000,
      referenceCut: 690.1,
      cutHistory: [
        { year: 2024, cut: 684.7 },
        { year: 2025, cut: 687.9 },
        { year: 2026, cut: 690.1 },
      ],
      tier: "적정",
      chance: "보통",
      reason:
        "수학 46.9%는 전국에서 가장 높은 수학 반영비율로 수학 강점이 극대화되고, 탐구 반영비율이 18.7%로 낮아 약점이 가려집니다. 기준컷과의 격차가 1.8점으로 거의 동일한 지점이라 경쟁률에 따라 결과가 갈립니다. 모집인원 26명으로 변동성이 큰 편입니다.",
    },
    {
      university: "중앙대학교",
      department: "소프트웨어학부 첨단융합 인공지능전공",
      group: "나",
      quota: 45,
      competitionRate: 5.33,
      ratioSummary: "국어 25 · 수학 40 · 탐구 35",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수(상위 1과목)",
      englishHistorySummary: "영어 2등급 -3점 감점 · 한국사 2등급 감점 없음",
      bonusSummary: "미적분·기하 응시 시 수학 표준점수 4% 가산",
      restrictionSummary: null,
      convertedScore: 735.9,
      totalScore: 1000,
      referenceCut: 721.4,
      cutHistory: [
        { year: 2024, cut: 716.2 },
        { year: 2025, cut: 719.0 },
        { year: 2026, cut: 721.4 },
      ],
      tier: "안정",
      chance: "높음",
      reason:
        "탐구를 상위 1과목만 반영하므로 물리학I 백분위 93만 계산되어 두 과목 평균 대비 2.5점을 회복합니다. 여기에 수학 40% 반영과 미적분 가산 4%가 겹쳐 기준컷을 14.5점 상회합니다. 영어 감점 3점을 감안해도 안정권이 확실한 대학입니다.",
    },
    {
      university: "서울시립대학교",
      department: "컴퓨터과학부",
      group: "가",
      quota: 34,
      competitionRate: null,
      ratioSummary: "국어 20 · 수학 30 · 탐구 30 · 영어 20",
      metricSummary: "국·수 표준점수 / 탐구 백분위",
      englishHistorySummary: "영어 2등급 92/100점 환산 · 한국사 2등급 만점",
      bonusSummary: null,
      restrictionSummary: "과탐 1과목 이상 응시",
      convertedScore: 681.7,
      totalScore: 1000,
      referenceCut: null,
      cutHistory: [
        { year: 2024, cut: null },
        { year: 2025, cut: null },
        { year: 2026, cut: null },
      ],
      tier: "안정",
      chance: "보통",
      reason:
        "2027학년도부터 컴퓨터과학부가 전자전기컴퓨터공학부에서 분리 신설되어 비교 가능한 입결이 없습니다. 통합 학부 기준 추정 기준컷으로는 안정권이나 판단 근거가 제한적입니다. 영어를 20% 비율로 반영하는 구조는 이 성적에 불리하므로, 입결 공개 전까지는 보수적으로 접근하는 것이 좋습니다.",
    },
    {
      university: "건국대학교",
      department: "컴퓨터공학부",
      group: "다",
      quota: 29,
      competitionRate: 9.87,
      ratioSummary: "국어 25 · 수학 35 · 탐구 25 · 영어 15",
      metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
      englishHistorySummary: "영어 2등급 95/100점 환산 · 한국사 2등급 만점",
      bonusSummary: "미적분·기하 응시 시 수학 표준점수 3% 가산",
      restrictionSummary: null,
      convertedScore: 742.3,
      totalScore: 1000,
      referenceCut: 718.8,
      cutHistory: [
        { year: 2024, cut: 711.5 },
        { year: 2025, cut: 715.2 },
        { year: 2026, cut: 718.8 },
      ],
      tier: "안정",
      chance: "높음",
      reason:
        "기준컷을 23.5점(환산 총점의 3.4%) 상회하는 가장 안전한 카드입니다. 다군 경쟁률이 9.87:1로 높게 보이지만 다군은 상위권 대학 중복 지원이 많아 충원율이 100%를 넘는 경우가 일반적이므로 실질 합격 가능성은 경쟁률보다 훨씬 높습니다.",
    },
  ],
};

/** 현실적인 평균 케이스 */
export const JEONGSI_MOCK_REPORT: JeongsiReportContent = {
  meta: {
    reportId: "jeongsi-mock-0001",
    input: MOCK_INPUT,
    createdAt: "2026-12-08T09:00:00.000Z",
    version: 1,
  },
  sections: [
    SCORE_ANALYSIS,
    UNIVERSITY_MATCH,
    RECOMMENDATION,
    COMBINATION,
    UNIVERSITY_DETAIL,
  ],
};

// ============================================================
// 스트레스 픽스처
//
// 레이아웃을 깨뜨릴 수 있는 조건을 의도적으로 몰아넣는다.
// - 극단적으로 긴 대학명·학과명
// - referenceCut / gapRatio / competitionRate / cutHistory 전면 결측
// - 군 두 칸이 비어 있는 조합
// - 한 문장이 과도하게 긴 AI 해설
// ============================================================

const LONG_UNIVERSITY = "한국공학대학교 제2캠퍼스";
const LONG_DEPARTMENT =
  "인공지능융합소프트웨어학부 지능형반도체설계전공(산학협력 계약학과)";

const EDGE_SCORE_ANALYSIS: JeongsiScoreAnalysisSection = {
  ...SCORE_ANALYSIS,
  rows: [
    {
      area: "korean",
      label: "국어",
      subjectName: "화법과작문",
      standardScore: 104,
      percentile: 62,
      grade: 4,
      rank: 3,
      deviation: -3.7,
    },
    {
      area: "math",
      label: "수학",
      subjectName: "확률과통계",
      standardScore: 112,
      percentile: 78,
      grade: 3,
      rank: 1,
      deviation: 12.3,
    },
    {
      area: "inquiry",
      label: "탐구",
      subjectName: "생활과윤리 · 사회문화",
      standardScore: null,
      percentile: null,
      grade: null,
      rank: 2,
      deviation: 0,
    },
    {
      area: "english",
      label: "영어",
      subjectName: null,
      standardScore: null,
      percentile: null,
      grade: 5,
      rank: null,
      deviation: null,
    },
  ],
  averagePercentile: 65.7,
  totalStandardScore: 216,
  strengthAreas: ["math"],
  weaknessAreas: ["english", "korean", "inquiry"],
  overallComment:
    "네 영역 중 세 영역이 평균 백분위를 밑돌고 탐구는 성적 입력이 누락되어 환산 가능한 영역이 국어·수학뿐인 상태이므로, 탐구 백분위가 확정되기 전까지는 어떤 대학의 환산점수도 확정값으로 받아들이면 안 되고 아래의 모든 수치는 탐구를 평균값으로 가정한 임시 추정이라는 점을 전제로 읽어야 하며 실제 지원 판단은 반드시 성적 재입력 후 다시 산출해야 합니다.",
  strengthComment:
    "확률과통계 응시자 중 백분위 78은 상대적으로 높은 편이며, 수학 반영비율이 높고 미적분 가산이 없는 대학에서는 이 강점이 유지됩니다.",
  weaknessComment:
    "영어 5등급은 비율 반영 대학에서 치명적입니다. 영어를 감점으로 처리하는 대학으로 지원 범위를 좁히는 것이 사실상 유일한 선택입니다.",
};

const EDGE_UNIVERSITY_MATCH: JeongsiUniversityMatchSection = {
  sectionId: "jeongsiUniversityMatch",
  title: "나에게 유리한 대학 분석",
  items: [
    {
      university: LONG_UNIVERSITY,
      department: LONG_DEPARTMENT,
      group: "다",
      ratioSummary:
        "국20·수40·탐20·영20 / 한국사 가산 / 수학 선택과목 가산 없음",
      metricSummary:
        "국어 백분위 / 수학 백분위 / 탐구 백분위(상위 1과목) / 영어 등급환산",
      advantageScore: 100,
      reason:
        "수학 반영비율이 40%이면서 수학 선택과목 가산이 없어 확률과통계 응시자에게 불이익이 발생하지 않는 드문 구조입니다.",
    },
    {
      university: "서울과학기술대학교",
      department: "인공지능응용학과",
      group: "가",
      ratioSummary: "국25·수35·탐25·영15",
      metricSummary: "국·수 표준점수 / 탐구 백분위",
      advantageScore: 0,
      reason:
        "영어 15% 비율 반영으로 5등급의 손실이 환산점수 전체를 끌어내립니다.",
    },
  ],
  overallComment:
    "현재 입력된 성적으로 유리하다고 판단할 수 있는 대학은 수학 반영비율이 높고 영어를 감점 방식으로 처리하는 소수에 한정됩니다.",
};

const EDGE_RECOMMENDATION: JeongsiRecommendationSection = {
  sectionId: "jeongsiRecommendation",
  title: "지원 가능 대학·학과",
  groups: [
    {
      tier: "상향",
      items: [
        {
          university: LONG_UNIVERSITY,
          department: LONG_DEPARTMENT,
          group: "다",
          quota: 8,
          convertedScore: 512.4,
          referenceCut: null,
          gapRatio: null,
          chance: "매우낮음",
          comment:
            "계약학과 신설로 입결이 존재하지 않아 기준컷 비교가 불가능합니다.",
        },
      ],
    },
    {
      tier: "적정",
      items: [
        {
          university: "국립한밭대학교",
          department: "컴퓨터공학과",
          group: "나",
          quota: 31,
          convertedScore: 548.9,
          referenceCut: 544.0,
          gapRatio: 0.7,
          chance: "보통",
          comment: "기준컷을 소폭 상회합니다.",
        },
      ],
    },
    {
      tier: "안정",
      items: [],
    },
  ],
  // buildRecommendationNotices() 실제 출력 (poolStage 2 + 적정 근접 대체).
  // 두 건 모두 긴 문장이라 불릿 목록 레이아웃의 가장 무거운 경우가 된다.
  notices: [
    "희망하신 인공지능융합소프트웨어학부 지능형반도체설계전공 외에 인접 계열까지 함께 비교했습니다. 희망 지역(서울)의 인공지능융합소프트웨어학부 지능형반도체설계전공만으로는 현재 성적에 맞는 지원처를 고루 찾기 어려워 비교 범위를 넓혔습니다.",
    "현재 성적에 정확히 '적정'으로 분류되는 곳이 많지 않아, 기준컷과의 격차가 적정에 가장 가까운 곳을 함께 담았습니다. 함께 담은 대학의 실제 구분은 코멘트와 대학별 상세 분석에 적었습니다.",
  ],
  overallComment:
    "탐구 성적이 입력되지 않아 안정으로 분류할 수 있는 곳을 가려내지 못했습니다. 탐구 성적을 입력하면 다시 분석할 수 있습니다.",
};

const EDGE_COMBINATION: JeongsiCombinationSection = {
  sectionId: "jeongsiCombination",
  title: "가·나·다군 지원 조합",
  risk: "공격",
  combinations: [
    {
      id: "edge-combo-1",
      label: "다군 단독 조합",
      slots: [
        {
          group: "다",
          university: LONG_UNIVERSITY,
          department: LONG_DEPARTMENT,
          tier: "상향",
          chance: "매우낮음",
        },
      ],
      strategy:
        "가·나군에 지원 가능한 학과가 산출되지 않아 다군 한 장만 남은 구성입니다. 안전망이 전혀 없으므로 성적 재입력 후 재분석이 반드시 필요합니다.",
    },
  ],
  overallComment: "유효한 조합이 1개뿐이라 조합 비교가 불가능합니다.",
};

const EDGE_UNIVERSITY_DETAIL: JeongsiUniversityDetailSection = {
  sectionId: "jeongsiUniversityDetail",
  title: "대학별 상세 분석",
  items: [
    {
      university: LONG_UNIVERSITY,
      department: LONG_DEPARTMENT,
      group: "다",
      quota: 8,
      competitionRate: null,
      ratioSummary: "국어 20 · 수학 40 · 탐구 20 · 영어 20",
      metricSummary:
        "국어 백분위 / 수학 백분위 / 탐구 백분위(상위 1과목) / 영어 등급환산",
      englishHistorySummary: "영어 5등급 68/100점 환산 · 한국사 4등급 -2점",
      bonusSummary: null,
      restrictionSummary: null,
      convertedScore: 512.4,
      totalScore: 1000,
      referenceCut: null,
      cutHistory: [
        { year: 2024, cut: null },
        { year: 2025, cut: null },
        { year: 2026, cut: null },
      ],
      tier: "상향",
      chance: "매우낮음",
      reason:
        "산학협력 계약학과로 2027학년도 신설되어 비교 가능한 입결이 전혀 없고 모집인원도 8명에 불과해 경쟁률 변동이 결과를 거의 전적으로 좌우하므로, 현재 환산점수만으로는 합격 가능성을 추정하기 어렵고 원서 접수 기간의 실시간 경쟁률을 직접 확인한 뒤 판단해야 합니다.",
    },
  ],
};

/** 극단 케이스 — 긴 이름, 결측값, 빈 구간 */
export const JEONGSI_MOCK_REPORT_EDGE: JeongsiReportContent = {
  meta: {
    reportId: "jeongsi-mock-edge-0001",
    input: {
      score: {
        examYear: 2026,
        korean: { elective: "화법과작문", standardScore: 104, percentile: 62 },
        math: { elective: "확률과통계", standardScore: 112, percentile: 78 },
        english: { grade: 5 },
        inquiry1: { subject: "생활과윤리", standardScore: 95, percentile: 55 },
        inquiry2: { subject: "사회문화", standardScore: 93, percentile: 51 },
        history: { grade: 4 },
      },
      preference: {
        target: "인공지능융합소프트웨어학부 지능형반도체설계전공",
        targetKind: "department",
        region: "전국",
        risk: "공격",
      },
    },
    createdAt: "2026-12-08T09:00:00.000Z",
    version: 1,
  },
  sections: [
    EDGE_SCORE_ANALYSIS,
    EDGE_UNIVERSITY_MATCH,
    EDGE_RECOMMENDATION,
    EDGE_COMBINATION,
    EDGE_UNIVERSITY_DETAIL,
  ],
};

// ============================================================
// 지원 불가 픽스처
//
// 확률과통계 + 사회탐구 응시자가 의예과를 희망하는 경우.
// 성적 자체는 나쁘지 않지만 거의 모든 의예과가 미적분·기하와 과탐을
// 요구하므로 지원 가능한 모집단위가 0개가 된다.
//
// 이때 PART 2~5 가 전부 빈 채로 나가면 학생은 이유를 알 수 없다.
// notices 가 "성적이 모자란 게 아니라 응시 과목 때문"임을 전달하는
// 자리이고, 이 픽스처가 그 경로 전체를 검증한다.
// ============================================================

const BLOCKED_INPUT: JeongsiInput = {
  score: {
    examYear: 2026,
    korean: { elective: "화법과작문", standardScore: 125, percentile: 92 },
    math: { elective: "확률과통계", standardScore: 128, percentile: 94 },
    english: { grade: 1 },
    inquiry1: { subject: "생활과윤리", standardScore: 65, percentile: 90 },
    inquiry2: { subject: "사회문화", standardScore: 63, percentile: 87 },
    history: { grade: 1 },
  },
  preference: {
    target: "의예과",
    targetKind: "department",
    region: "전국",
    risk: "안정",
  },
};

/** 선택과목 제한으로 지원 가능 대학이 0개인 케이스 */
export const JEONGSI_MOCK_REPORT_BLOCKED: JeongsiReportContent = {
  meta: {
    reportId: "jeongsi-mock-blocked-0001",
    input: BLOCKED_INPUT,
    createdAt: "2026-12-08T09:00:00.000Z",
    version: 1,
  },
  sections: [
    {
      sectionId: "jeongsiScoreAnalysis",
      title: "성적 종합 분석",
      rows: [
        {
          area: "math",
          label: "수학",
          subjectName: "확률과통계",
          standardScore: 128,
          percentile: 94,
          grade: 1,
          rank: 1,
          deviation: 2.7,
        },
        {
          area: "korean",
          label: "국어",
          subjectName: "화법과작문",
          standardScore: 125,
          percentile: 92,
          grade: 2,
          rank: 2,
          deviation: 0.7,
        },
        {
          area: "english",
          label: "영어",
          subjectName: null,
          standardScore: null,
          percentile: null,
          grade: 1,
          rank: null,
          deviation: null,
        },
        {
          area: "inquiry",
          label: "탐구",
          subjectName: "생활과윤리 · 사회문화",
          standardScore: 128,
          percentile: 88.5,
          grade: 2,
          rank: 4,
          deviation: -2.8,
        },
      ],
      averagePercentile: 91.3,
      totalStandardScore: 381,
      strengthAreas: ["math", "english"],
      weaknessAreas: ["inquiry"],
      overallComment:
        "네 영역 모두 백분위 87 이상으로 고르게 높은 성적입니다. 영어 1등급과 한국사 1등급도 확보되어 있어 대부분의 상위권 대학에서 감점 요인이 없습니다. 다만 이 리포트의 결론은 성적이 아니라 응시 과목에서 갈립니다. 확률과통계와 사회탐구 조합으로는 희망 학과인 의예과에 지원할 수 있는 모집단위가 사실상 존재하지 않습니다.",
      strengthComment:
        "수학 확률과통계 백분위 94는 같은 과목 응시자 중 최상위권이고, 영어 1등급은 비율 반영 대학에서도 손실이 없습니다. 자연계 제한이 없는 모집단위라면 충분히 경쟁력 있는 조합입니다.",
      weaknessComment:
        "약점은 영역 성적이 아니라 과목 선택입니다. 의예과는 거의 전 대학이 미적분 또는 기하 응시와 과탐 1~2과목을 필수로 요구하며, 이 조건은 성적으로 보완할 수 없는 자격 요건입니다.",
    },
    {
      sectionId: "jeongsiUniversityMatch",
      title: "나에게 유리한 대학 분석",
      items: [],
      overallComment:
        "선택과목 제한을 통과하는 의예과 모집단위가 없어 반영방식을 비교할 대상 자체가 산출되지 않았습니다. 지원 가능한 범위를 다시 정한 뒤에야 유리한 대학을 가릴 수 있습니다.",
    },
    {
      sectionId: "jeongsiRecommendation",
      title: "지원 가능 대학·학과",
      groups: [
        { tier: "상향", items: [] },
        { tier: "적정", items: [] },
        { tier: "안정", items: [] },
      ],
      // buildRecommendationNotices() 실제 출력 (blockedByRestrictions).
      // 대체 계열을 제안하지 않는다: 리포트가 "전공을 바꿔야 한다"는 판단을
      // 대신 내리지 않는다는 규칙(§6.1-e)이고, 약학도 의약 그룹이라 과탐을
      // 똑같이 요구하므로 사실관계로도 틀린 제안이 된다.
      notices: [
        "희망하신 의예과는 정시에서 수능 응시 과목 조건이 있어, 현재 응시 과목(수학 확률과통계, 탐구 생활과윤리·사회문화)으로는 지원할 수 있는 곳이 없습니다. 이 계열은 과학탐구 1과목 이상을 요구합니다. 희망 계열을 바꿔 다시 분석해 보세요.",
      ],
      overallComment:
        "희망하신 의예과는 수능 응시 과목 조건을 충족하지 못해 지원할 수 있는 곳이 산출되지 않았습니다. 성적이 모자라서가 아니라, 의예과가 요구하는 응시 과목과 실제 응시 과목이 달라 생긴 결과입니다. 이 조건은 성적으로 보완할 수 있는 항목이 아니므로, 지원 전략은 희망 계열을 다시 정한 뒤에 세울 수 있습니다.",
    },
    {
      sectionId: "jeongsiCombination",
      title: "가·나·다군 지원 조합",
      risk: "안정",
      combinations: [],
      overallComment:
        "지원 가능한 모집단위가 없어 가·나·다군 조합을 구성할 수 없습니다. 희망 학과를 조정한 뒤 다시 분석해 주세요.",
    },
    {
      sectionId: "jeongsiUniversityDetail",
      title: "대학별 상세 분석",
      items: [],
    },
  ],
};

// ============================================================
// 의약계열 극상위 픽스처
//
// 기준 만점을 넘는 환산점수는 "가산을 보유한 모집단위"면 아무 데서나
// 생기는 것이 아니라, 백분위 99 이상 극상위 컷에서만 나타난다.
// (실측: 가산 보유 32개 중 환산점수 입결 6개, 그중 총점 초과는 2개)
//
// 초과 폭도 최대 0.7% 수준이다. 수학 가산 5% 는 총점의 약 1.6% 라
// 평범한 컷은 넘기지 못하고, 초과 원인은 수학 가산과 한국사 가산
// 두 갈래로 나뉜다 — 그래서 렌더러는 bonus 필드가 아니라
// convertedScore > totalScore 값 비교로만 판정한다.
// ============================================================

const MEDICAL_INPUT: JeongsiInput = {
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
    risk: "균형",
  },
};

/** 극상위 성적 — 기준 만점을 넘는 환산점수가 실제로 나오는 구간 */
export const JEONGSI_MOCK_REPORT_MEDICAL: JeongsiReportContent = {
  meta: {
    reportId: "jeongsi-mock-medical-0001",
    input: MEDICAL_INPUT,
    createdAt: "2026-12-08T09:00:00.000Z",
    version: 1,
  },
  sections: [
    {
      sectionId: "jeongsiScoreAnalysis",
      title: "성적 종합 분석",
      rows: [
        {
          area: "math",
          label: "수학",
          subjectName: "미적분",
          standardScore: 145,
          percentile: 100,
          grade: 1,
          rank: 1,
          deviation: 0.7,
        },
        {
          area: "korean",
          label: "국어",
          subjectName: "언어와매체",
          standardScore: 139,
          percentile: 99,
          grade: 1,
          rank: 2,
          deviation: -0.3,
        },
        {
          area: "inquiry",
          label: "탐구",
          subjectName: "화학I · 생명과학I",
          standardScore: 143,
          percentile: 98.5,
          grade: 1,
          rank: 3,
          deviation: -0.8,
        },
        {
          area: "english",
          label: "영어",
          subjectName: null,
          standardScore: null,
          percentile: null,
          grade: 1,
          rank: null,
          deviation: null,
        },
      ],
      averagePercentile: 99.3,
      totalStandardScore: 427,
      strengthAreas: ["math"],
      weaknessAreas: [],
      overallComment:
        "네 영역 모두 백분위 98 이상으로 전국 최상위권입니다. 미적분 백분위 100과 과탐 두 과목 모두 1등급을 확보해 의약계열 지원 자격 요건도 전부 충족합니다. 이 구간에서는 영역 간 강약보다 대학별 환산식의 소수점 차이가 당락을 가르므로, 반영비율과 가산점 구조를 대학별로 따져 보는 것이 전략의 전부입니다.",
      strengthComment:
        "수학 미적분 표준점수 145는 사실상 만점 구간입니다. 수학 반영비율이 높고 미적분 가산이 붙는 대학에서 이 강점이 가장 크게 증폭됩니다.",
      weaknessComment:
        "뚜렷한 약점 영역이 없습니다. 다만 탐구 두 과목 간 백분위가 1점 차이로 갈려, 상위 1과목만 반영하는 대학에서 미세한 이득이 있습니다.",
    },
    {
      sectionId: "jeongsiUniversityMatch",
      title: "나에게 유리한 대학 분석",
      items: [
        {
          university: "경북대학교",
          department: "의예과",
          group: "가",
          ratioSummary: "국20·수30·탐30 / 영어 가산 · 한국사 가산",
          metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
          advantageScore: 95,
          reason:
            "미적분 가산 5%와 한국사 1등급 가산 10점이 모두 적용되어, 가산만으로 기준 만점의 2% 가까이를 추가로 확보합니다. 수학 30% 반영도 유리합니다.",
        },
        {
          university: "부산대학교",
          department: "의예과",
          group: "나",
          ratioSummary: "국20·수30·탐30 / 영어 가산 · 한국사 가산",
          metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
          advantageScore: 93,
          reason:
            "경북대와 환산 구조가 거의 같고, 과탐 두 과목을 모두 반영해 화학I·생명과학I 조합이 손실 없이 반영됩니다.",
        },
      ],
      overallComment:
        "지방 거점 국립대 의예과는 미적분 가산과 한국사 가산을 함께 운영하는 곳이 많아, 이 성적 구조에서 환산점수가 기준 만점을 넘어서는 구간이 나옵니다. 기준 만점은 가산을 제외한 값이므로 100%를 넘는 것 자체는 정상입니다.",
    },
    {
      sectionId: "jeongsiRecommendation",
      title: "지원 가능 대학·학과",
      groups: [
        {
          tier: "상향",
          items: [
            {
              university: "서울대학교",
              department: "의예과",
              group: "가",
              quota: 39,
              convertedScore: 697.8,
              referenceCut: 699.1,
              gapRatio: -0.19,
              chance: "보통",
              comment:
                "기준컷까지 1.3점 차이로, 이 구간에서는 탐구 변환표준점수 한 칸에 결과가 갈립니다.",
            },
          ],
        },
        {
          tier: "적정",
          items: [
            {
              university: "경북대학교",
              department: "의예과",
              group: "가",
              quota: 34,
              convertedScore: 1007.2,
              referenceCut: 1004.6,
              gapRatio: 0.26,
              chance: "보통",
              comment:
                "가산을 포함한 환산점수가 기준 만점 1000점을 넘습니다. 기준컷도 함께 넘어 있어 비교 자체는 정상적으로 됩니다.",
            },
          ],
        },
        {
          tier: "안정",
          items: [
            {
              university: "부산대학교",
              department: "의예과",
              group: "나",
              quota: 30,
              convertedScore: 1006.1,
              referenceCut: 998.4,
              gapRatio: 0.77,
              chance: "높음",
              comment:
                "기준컷을 7.7점 상회합니다. 기준컷은 기준 만점 이내인데 내 환산점수만 넘는 형태입니다.",
            },
          ],
        },
      ],
      // buildRecommendationNotices() 실제 출력 (poolStage 2).
      // 기준 만점 초과 설명은 notices 가 아니라 PART 5 각 카드의
      // reason(AI 필드)과 "가산점 포함" 표시가 담당한다.
      notices: [
        "희망하신 의예과 외에 의약계열(치의학·한의학·약학 등)까지 함께 비교했습니다. 희망 지역(전국)의 의예과만으로는 현재 성적에 맞는 지원처를 고루 찾기 어려워 비교 범위를 넓혔습니다.",
      ],
      overallComment:
        "이 성적대에서는 가산 구조가 당락을 가릅니다. 미적분 가산과 한국사 가산을 함께 운영하는 지방 거점 국립대 의예과에서 환산점수가 가장 크게 올라가고, 가산이 없는 서울대 의예과에서는 상대적으로 이득이 줄어듭니다.",
    },
    {
      sectionId: "jeongsiCombination",
      title: "가·나·다군 지원 조합",
      risk: "균형",
      combinations: [
        {
          id: "medical-combo-1",
          label: "거점 국립대 중심 조합",
          slots: [
            {
              group: "가",
              university: "경북대학교",
              department: "의예과",
              tier: "적정",
              chance: "보통",
            },
            {
              group: "나",
              university: "부산대학교",
              department: "의예과",
              tier: "안정",
              chance: "높음",
            },
          ],
          strategy:
            "가산 구조가 유리한 두 곳을 가·나군에 배치한 조합입니다. 의예과는 다군 모집이 거의 없어 다군이 비는 것이 일반적입니다.",
        },
      ],
      overallComment:
        "의예과는 다군 모집 자체가 드물어 가·나군 두 장으로 승부하는 것이 표준입니다. 서울대 의예과를 가군에 쓰면 경북대를 포기해야 하므로, 상향 한 장과 안정 한 장 중 어느 쪽을 가군에 둘지가 유일한 선택입니다.",
    },
    {
      sectionId: "jeongsiUniversityDetail",
      title: "대학별 상세 분석",
      items: [
        {
          university: "서울대학교",
          department: "의예과",
          group: "가",
          quota: 39,
          competitionRate: 3.18,
          ratioSummary: "국어 33.3 · 수학 40 · 탐구 26.7",
          metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
          englishHistorySummary:
            "영어 1등급 감점 없음 · 한국사 1등급 감점 없음",
          bonusSummary: null,
          restrictionSummary: "미적분 또는 기하 응시 필수 · 과탐 2과목 필수",
          // 가산이 없는 구조 — 환산점수·기준컷 모두 기준 만점 이내
          convertedScore: 697.8,
          totalScore: 700,
          referenceCut: 699.1,
          cutHistory: [
            { year: 2024, cut: 697.2 },
            { year: 2025, cut: 698.4 },
            { year: 2026, cut: 699.1 },
          ],
          tier: "상향",
          chance: "보통",
          reason:
            "가산점이 전혀 없는 구조라 환산점수가 기준 만점 700점을 넘지 않습니다. 가산으로 벌 수 있는 여지가 없어 순수 표준점수 경쟁이 되며, 기준컷까지 1.3점 차이로 탐구 변환표준점수 한 칸에 결과가 갈립니다.",
        },
        {
          university: "경북대학교",
          department: "의예과",
          group: "가",
          quota: 34,
          competitionRate: 5.94,
          ratioSummary: "국어 20 · 수학 30 · 탐구 30 · 영어 20",
          metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
          englishHistorySummary:
            "영어 1등급 가산 20점 · 한국사 1등급 가산 10점",
          bonusSummary: "미적분·기하 응시 시 수학 반영점수 5% 가산",
          restrictionSummary: "미적분 또는 기하 응시 필수 · 과탐 2과목 필수",
          // 환산점수와 기준컷이 모두 기준 만점을 넘는 극상위 케이스 (100.7% / 100.5%)
          convertedScore: 1007.2,
          totalScore: 1000,
          referenceCut: 1004.6,
          cutHistory: [
            { year: 2024, cut: 1001.8 },
            { year: 2025, cut: 1003.2 },
            { year: 2026, cut: 1004.6 },
          ],
          tier: "적정",
          chance: "보통",
          reason:
            "미적분 가산 5%와 한국사 가산 10점이 모두 적용되어 환산점수가 기준 만점 1000점을 0.7% 넘어섭니다. 기준컷 역시 같은 가산을 포함한 값이라 함께 1000점을 넘으며, 둘을 비교하는 데에는 문제가 없습니다. 이 초과는 백분위 99 이상 구간에서만 나타납니다.",
        },
        {
          university: "부산대학교",
          department: "의예과",
          group: "나",
          quota: 30,
          competitionRate: 7.43,
          ratioSummary: "국어 20 · 수학 30 · 탐구 30 · 영어 20",
          metricSummary: "국·수 표준점수 / 탐구 변환표준점수",
          englishHistorySummary:
            "영어 1등급 가산 20점 · 한국사 1등급 가산 10점",
          bonusSummary: "미적분·기하 응시 시 수학 반영점수 5% 가산",
          restrictionSummary: "미적분 또는 기하 응시 필수 · 과탐 2과목 필수",
          // 내 환산점수만 기준 만점을 넘고 기준컷은 이내인 혼합 형태
          convertedScore: 1006.1,
          totalScore: 1000,
          referenceCut: 998.4,
          cutHistory: [
            { year: 2024, cut: 994.1 },
            { year: 2025, cut: 996.7 },
            { year: 2026, cut: 998.4 },
          ],
          tier: "안정",
          chance: "높음",
          reason:
            "경북대와 환산 구조가 거의 같지만 기준컷은 998.4점으로 기준 만점 이내입니다. 내 환산점수만 1000점을 넘는 형태로, 가산을 받은 상위권과 그렇지 않은 합격선의 차이가 그대로 드러납니다. 기준컷을 7.7점 상회해 안정권입니다.",
        },
      ],
    },
  ],
};
