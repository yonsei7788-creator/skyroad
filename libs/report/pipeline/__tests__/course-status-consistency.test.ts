import { matchRecommendedCourses, preprocess } from "../preprocessor";
import {
  postprocess,
  removeMisstatedMissingCourses,
  removeMisstatedTakenCourses,
  scrubCourseStatusStatements,
} from "../postprocessor";
import { buildSystemPromptPrefix } from "../../prompts/system";
import { buildSubjectAnalysisPrompt } from "../../prompts/sections/subject-analysis";
import type { RecordData } from "../preprocessor";
import type { StudentInfo } from "../../types";
import type { ReportSection } from "../../types";

const generalSubject = (
  year: number,
  subject: string,
  category: string
): NonNullable<RecordData["generalSubjects"]>[number] => ({
  year,
  semester: 1,
  category,
  subject,
  credits: 4,
  rawScore: 90,
  average: 70,
  standardDeviation: 12,
  achievement: "A",
  studentCount: 200,
  gradeRank: 2,
});

const studentInfo: StudentInfo = {
  name: "홍길동",
  grade: 2,
  isGraduate: false,
  track: "이과",
  schoolType: "일반고",
  hasMockExamData: false,
  targetDepartment: "컴퓨터공학과",
};

describe("matchRecommendedCourses — 성적표 밖 이수 과목", () => {
  it("세특에만 존재하는 권장과목을 미이수로 분류하지 않는다", () => {
    // Arrange: 성적 행은 없고 세특에만 남은 공동교육과정 과목
    const general = [generalSubject(2, "확률과 통계", "수학")];

    // Act
    const withoutExtra = matchRecommendedCourses(
      general,
      [],
      "공학",
      2,
      "2015"
    );
    const withExtra = matchRecommendedCourses(
      general,
      [],
      "공학",
      2,
      "2015",
      undefined,
      false,
      ["미적분"]
    );

    // Assert
    expect(withoutExtra.missingCourses).toContain("미적분");
    expect(withExtra.missingCourses).not.toContain("미적분");
    expect(withExtra.takenCourses).toContain("미적분");
  });
});

describe("preprocess — 이수 사실 정답 텍스트", () => {
  it("비주요 과목까지 포함한 전체 이수 목록을 만든다", () => {
    // Arrange: 「정보」는 비주요 과목이라 평가 대상 목록에서 제외된다
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(1, "통합과학", "과학"),
        generalSubject(2, "정보", "기술·가정"),
      ] as RecordData["generalSubjects"],
      subjectEvaluations: [
        { year: 2, subject: "미적분", evaluation: "미적분 세특 내용" },
      ] as RecordData["subjectEvaluations"],
    };

    // Act
    const { texts } = preprocess(recordData, studentInfo, "standard");

    // Assert: 전체 목록에는 비주요 과목과 세특 전용 과목이 모두 들어간다
    expect(texts.allTakenSubjectsByYearText).toContain("정보");
    expect(texts.allTakenSubjectsByYearText).toContain("미적분");
    expect(texts.allTakenSubjectsByYearText).toContain("통합과학");
  });

  it("평가 대상 목록에서 빠진 이수 과목을 미이수로 오해하지 않도록 안내한다", () => {
    // Arrange
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(1, "통합과학", "과학"),
        generalSubject(2, "정보", "기술·가정"),
      ] as RecordData["generalSubjects"],
    };

    // Act
    const { texts } = preprocess(recordData, studentInfo, "standard");

    // Assert: 거짓 지시가 사라지고, 빠진 과목이 이수 사실로 명시된다
    expect(texts.completedSubjectsByYearText).not.toContain(
      "'이수하지 않았다'로 판단하세요"
    );
    expect(texts.completedSubjectsByYearText).toContain(
      "이수했으나 평가 대상은 아닌 과목"
    );
    expect(texts.completedSubjectsByYearText).toContain("정보");
  });
});

describe("preprocess — 수강 예정 과목의 이수 판정 일관성", () => {
  it("졸업생의 수강 예정 과목은 이수 목록과 권장과목 매칭 양쪽에 모두 반영된다", () => {
    // Arrange
    const graduate: StudentInfo = {
      ...studentInfo,
      grade: 3,
      isGraduate: true,
      targetDepartment: "기계공학과",
    };
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(2, "확률과 통계", "수학"),
      ] as RecordData["generalSubjects"],
    };

    // Act
    const { data, texts } = preprocess(
      recordData,
      graduate,
      "premium",
      "미적분"
    );

    // Assert: 세 소비처가 같은 답을 낸다
    expect(data.allTakenSubjects).toContain("미적분");
    expect(data.recommendedCourseMatch.takenCourses).toContain("미적분");
    expect(data.recommendedCourseMatch.missingCourses).not.toContain("미적분");
    expect(texts.allTakenSubjectsByYearText).toContain("미적분");
  });
});

describe("buildSystemPromptPrefix — 모든 섹션 공통 이수 정답", () => {
  it("이수 목록을 주입하면 판정 근거 블록이 붙는다", () => {
    // Arrange
    const taken =
      "## 학생이 실제로 이수한 과목 (학년별 전체 목록)\n- 2학년: 미적분";

    // Act
    const prefix = buildSystemPromptPrefix("premium", { takenSubjects: taken });

    // Assert
    expect(prefix).toContain("위 목록을 읽는 방법");
    expect(prefix).toContain("- 2학년: 미적분");
  });

  it("이수 목록이 없으면 블록을 붙이지 않는다", () => {
    // Act
    const prefix = buildSystemPromptPrefix("premium", {});

    // Assert
    expect(prefix).not.toContain("위 목록을 읽는 방법");
  });
});

describe("buildSubjectAnalysisPrompt — 학년별 분할 호출", () => {
  it("이수 목록은 시스템 프롬프트가 담당하고, 섹션 규칙은 그 목록을 가리킨다", () => {
    // Arrange & Act
    const prompt = buildSubjectAnalysisPrompt(
      {
        subjectData: "[2학년 화학Ⅰ]\n세특 내용",
        studentProfile: "프로필",
        studentGrade: 3,
        targetYear: 2,
      },
      "premium"
    );

    // Assert: 목록 자체는 중복 주입하지 않고, 규칙만 공유 블록을 참조한다
    expect(prompt).toContain('"이 학생이 이수한 과목" 목록에 있는 과목을 사용');
    expect(prompt).not.toContain("학년별 전체 목록");
  });
});

describe("removeMisstatedMissingCourses — 표기 변형", () => {
  it("정답은 로마숫자, 서술은 아라비아 숫자여도 오서술을 잡는다", () => {
    // Arrange
    const text = "탐구력은 우수합니다. 물리학2를 이수하지 않아 아쉽습니다.";

    // Act
    const result = removeMisstatedMissingCourses(text, ["물리학Ⅱ"]);

    // Assert
    expect(result).toBe("탐구력은 우수합니다.");
  });

  it("실제 미이수 과목의 서술은 유지한다", () => {
    // Arrange
    const text = "기하를 이수하지 않아 아쉽습니다.";

    // Act
    const result = removeMisstatedMissingCourses(text, ["물리학Ⅱ"]);

    // Assert
    expect(result).toBe(text);
  });
});

describe("removeMisstatedMissingCourses — 어순·조사·부사 변형", () => {
  const COMPLETED = ["미적분"];

  it.each([
    ["기본 조사", "미적분은 이수하지 않았습니다."],
    ["부사 삽입", "미적분은 아직 이수하지 않았습니다."],
    ["부사 삽입 2", "미적분은 여전히 미이수 상태입니다."],
    ["부사 삽입 3", "미적분을 끝까지 이수하지 못했습니다."],
    ["역시/또한", "미적분 역시 이수하지 않았습니다."],
    ["보조사 조차", "미적분조차 이수하지 않았습니다."],
    ["보조사 마저", "미적분마저 이수하지 못했습니다."],
    ["보조사 까지", "미적분까지는 이수하지 못했습니다."],
    ["관형격 의", "미적분의 미이수가 아쉽습니다."],
    ["괄호 삽입구", "미적분(진로선택)을 이수하지 않았습니다."],
    ["이라는 과목", "미적분이라는 과목을 이수하지 않았습니다."],
    ["등을", "미적분 등을 이수하지 않았습니다."],
    ["표 형태 콜론", "미적분: 미이수"],
    ["표 형태 화살표", "미적분 → 미이수"],
    ["어순 역전", "미이수 과목은 미적분입니다."],
    ["어순 역전 항목", "미이수 항목은 미적분입니다."],
  ])("제거: %s", (_label, input) => {
    expect(removeMisstatedMissingCourses(input, COMPLETED)).toBe("");
  });

  it.each([
    [
      "다른 과목의 참인 미이수",
      "미적분 세특은 우수하지만 기하를 이수하지 않은 점은 아쉽습니다.",
    ],
    ["절이 나뉜 서술", "미적분의 경우 성취도가 높고 기하는 미이수입니다."],
    [
      "괄호가 있는 다른 절",
      "미적분(3학년 1학기 이수)은 우수하나 기하는 미이수입니다.",
    ],
    ["이수 후 대조", "미적분 이수 후 기하는 이수하지 못했습니다."],
    ["이미 이수한 나열", "이미 이수한 미적분·확률과 통계는 강점입니다."],
  ])("보존: %s", (_label, input) => {
    expect(removeMisstatedMissingCourses(input, COMPLETED)).toBe(input);
  });

  it.each([
    [
      "받침 없는 항목이 남음",
      "미적분·확률과 통계는 미이수입니다.",
      ["확률과 통계"],
      "미적분은 미이수입니다.",
    ],
    [
      "받침 있는 항목이 남음",
      "미적분·기하를 이수하지 않았습니다.",
      ["기하"],
      "미적분을 이수하지 않았습니다.",
    ],
    [
      "로마숫자 Ⅰ이 남음",
      "물리학Ⅰ·물리학Ⅱ는 미이수입니다.",
      ["물리학Ⅱ"],
      "물리학Ⅰ은 미이수입니다.",
    ],
    [
      "로마숫자 + 이/가",
      "화학Ⅰ·생명과학Ⅰ이 미이수입니다.",
      ["생명과학Ⅰ"],
      "화학Ⅰ이 미이수입니다.",
    ],
  ])("조사 일치: %s", (_label, input, completed, expected) => {
    expect(removeMisstatedMissingCourses(input, completed as string[])).toBe(
      expected
    );
  });
});

describe("교과 영역 요약 서술 보존", () => {
  // 1학년 공통과목 행이 실제로 "수학"·"과학"·"사회"라서 이수 목록에 들어오고,
  // 술어가 앞에 오는 어순에서 영역 요약이 통째로 삭제되던 회귀
  it.each([
    [
      "교과 지시어",
      "미이수 과목은 수학 교과에 집중되어 있습니다.",
      ["수학", "미적분"],
    ],
    ["영역 어순", "미이수 영역은 과학입니다.", ["과학", "미적분"]],
    [
      "항목 어순",
      "미이수 항목은 사회 교과에서 두드러집니다.",
      ["사회", "미적분"],
    ],
    ["계열 지시어", "미이수 과목으로는 수학 계열이 많습니다.", ["수학"]],
    ["표 형태", "미이수: 수학 교과 전반", ["수학"]],
  ])("보존: %s", (_label, input, completed) => {
    expect(removeMisstatedMissingCourses(input, completed as string[])).toBe(
      input
    );
  });

  it.each([
    ["특정 과목 어순 역전", "미이수 과목은 물리학Ⅱ입니다.", ["물리학Ⅱ"]],
    ["항목 어순 역전", "미이수 항목은 미적분입니다.", ["미적분"]],
  ])("제거: %s", (_label, input, completed) => {
    expect(removeMisstatedMissingCourses(input, completed as string[])).toBe(
      ""
    );
  });
});

describe("짧은 과목명이 긴 과목명의 꼬리에 걸리는 경우", () => {
  // COURSE_NAME_BOUNDARY는 이름 뒤만 막아서, 좌측 가드가 없으면
  // "생명과학을 이수하지 않았습니다"가 "과학" 이수를 근거로 삭제된다
  //
  // 학생별 목록에 없는 과목명도 교육과정 어휘(권장과목 표 + 커리어넷 교과)로 막힌다
  it.each([
    ["생활과 윤리", "생활과 윤리를 이수하지 않았습니다.", ["윤리"]],
    ["확률과 통계", "확률과 통계를 이수하지 않았습니다.", ["통계"]],
    ["세계지리", "세계지리는 미이수입니다.", ["지리"]],
    ["언어와 매체", "언어와 매체를 이수하지 않았습니다.", ["매체"]],
    ["화법과 작문", "화법과 작문은 미이수입니다.", ["작문"]],
    ["윤리와 사상", "윤리와 사상을 이수하지 않았습니다.", ["사상"]],
  ])("보존(교육과정 어휘): %s", (_label, input, completed) => {
    expect(removeMisstatedMissingCourses(input, completed as string[])).toBe(
      input
    );
  });

  it.each([
    [
      "고급 물리학",
      "고급 물리학을 이수하지 않았습니다.",
      ["물리학"],
      ["고급 물리학"],
    ],
    [
      "심화 미적분",
      "심화 미적분을 이수하지 않았습니다.",
      ["미적분"],
      ["심화 미적분"],
    ],
  ])("보존: %s", (_label, input, completed, others) => {
    expect(
      removeMisstatedMissingCourses(
        input,
        completed as string[],
        others as string[]
      )
    ).toBe(input);
  });

  it("이름 전체가 일치하면 여전히 제거한다", () => {
    expect(
      removeMisstatedMissingCourses(
        "물리학을 이수하지 않았습니다.",
        ["물리학"],
        ["고급 물리학"]
      )
    ).toBe("");
  });
});

describe("괄호 삽입구가 교과 라벨과 술어를 잇는 경우", () => {
  // 괄호 안이 실제 미이수 과목인 참인 문장인데, 바깥의 교과 라벨이
  // 이수 목록에 있어서 통째로 삭제되던 회귀
  it.each([
    ["수학", "수학(미적분·기하)을 이수하지 않았습니다.", ["수학"]],
    ["과학", "과학(물리학Ⅱ·화학Ⅱ)을 이수하지 않았습니다.", ["과학"]],
    ["사회", "사회(경제·정치와 법)는 미이수입니다.", ["사회"]],
  ])("보존: %s 교과", (_label, input, completed) => {
    expect(removeMisstatedMissingCourses(input, completed as string[])).toBe(
      input
    );
  });
});

describe("나열 인식 — 공백 포함 과목명", () => {
  it("나열의 다른 항목이 공백을 품어도 오서술 과목을 덜어낸다", () => {
    expect(
      removeMisstatedMissingCourses(
        "미적분·확률과 통계는 미이수입니다.",
        ["미적분"],
        ["확률과 통계"]
      )
    ).toBe("확률과 통계는 미이수입니다.");
  });

  it("여덟 과목 나열도 처리한다", () => {
    expect(
      removeMisstatedMissingCourses(
        "미적분·기하·확률과통계·물리학Ⅱ·화학Ⅱ·지구과학Ⅱ·생명과학Ⅱ·경제수학은 미이수입니다.",
        ["미적분"]
      )
    ).toBe(
      "기하·확률과통계·물리학Ⅱ·화학Ⅱ·지구과학Ⅱ·생명과학Ⅱ·경제수학은 미이수입니다."
    );
  });
});

describe("나열 제거 — 양방향 동일 규칙", () => {
  it("조사 슬롯이 비어 있어도 술어 첫 글자를 건드리지 않는다", () => {
    // "이수하지"의 '이'를 조사로 오인해 "가수하지"로 고치던 회귀
    const result = removeMisstatedMissingCourses(
      "기하·미적분이수하지 않았습니다.",
      ["미적분"]
    );
    expect(result).not.toContain("가수");
  });

  it("괄호 삽입구가 조사 앞에 있어도 조사를 맞춘다", () => {
    expect(
      removeMisstatedMissingCourses("미적분·기하(2단위)는 미이수입니다.", [
        "기하",
      ])
    ).toBe("미적분(2단위)은 미이수입니다.");
  });

  it("이수 방향도 술어와 무관한 절의 나열은 건드리지 않는다", () => {
    const text = "미적분·기하는 우수하나 확률과 통계를 이수했습니다.";
    expect(removeMisstatedTakenCourses(text, ["기하"])).toBe(text);
  });

  it("이수 방향의 나열 제거도 조사를 맞춘다", () => {
    expect(
      removeMisstatedTakenCourses("미적분Ⅱ·기하를 이수했습니다.", ["기하"])
    ).toBe("미적분Ⅱ를 이수했습니다.");
  });
});

describe("removeMisstatedTakenCourses — 반대 방향", () => {
  it("이수하지 않은 과목을 이수했다고 단정한 문장을 제거한다", () => {
    // Arrange
    const text = "성적은 안정적입니다. 기하를 이수했습니다.";

    // Act
    const result = removeMisstatedTakenCourses(text, ["기하"]);

    // Assert
    expect(result).toBe("성적은 안정적입니다.");
  });

  it("미이수 확정 목록이 없으면 원문을 그대로 둔다", () => {
    // Arrange
    const text = "미적분을 이수하여 수학적 기반이 탄탄합니다.";

    // Act
    const result = removeMisstatedTakenCourses(text, []);

    // Assert
    expect(result).toBe(text);
  });

  it("교과 영역 단위 서술은 삭제하지 않는다", () => {
    // Arrange
    const text = "과학탐구 과목을 다양하게 이수했습니다.";

    // Act
    const result = removeMisstatedTakenCourses(text, ["기하"]);

    // Assert
    expect(result).toBe(text);
  });
});

describe("이수 서술 판정 — 어순·표기·시제 변형 전수", () => {
  const TAKEN = ["물리학Ⅱ", "화학Ⅱ", "미적분"];
  const MISSING = ["기하", "미적분Ⅱ"];

  describe("이수한 과목을 미이수로 서술한 경우", () => {
    it.each([
      ["인접형", "물리학Ⅱ를 이수하지 않아 아쉽습니다.", ""],
      ["표기 변형", "물리학2를 이수하지 않아 아쉽습니다.", ""],
      [
        "어순 분리",
        "핵심 권장과목인 물리학Ⅱ의 경우 이수하지 않은 것으로 확인됩니다.",
        "",
      ],
      ["어순 역전", "미이수 과목은 물리학Ⅱ입니다.", ""],
      [
        "중점 나열",
        "미적분·기하를 이수하지 않았습니다.",
        "기하를 이수하지 않았습니다.",
      ],
    ])("제거: %s", (_label, input, expected) => {
      expect(removeMisstatedMissingCourses(input, TAKEN)).toBe(expected);
    });

    it.each([
      ["실제 미이수 과목", "기하를 이수하지 않아 아쉽습니다."],
      ["Ⅰ/Ⅱ 구분", "미적분Ⅱ를 이수하지 않아 아쉽습니다."],
      ["과목과 무관한 서술", "탐구 깊이가 부족해 보완이 필요합니다."],
    ])("보존: %s", (_label, input) => {
      expect(removeMisstatedMissingCourses(input, TAKEN)).toBe(input);
    });

    // 알려진 한계: 접속 조사(와/과)로 이어진 나열은 분리하지 않는다.
    // "확률"이 이수 목록에 있을 때 "확률과 통계"를 잘라 없는 과목명을 만들어
    // 내는 쪽이 더 큰 손해라 구분자에서 제외했다.
    it("한계: 접속 조사 나열에서 일부만 오서술이면 문장이 남는다", () => {
      const text = "미적분과 기하를 이수하지 않았습니다.";
      expect(removeMisstatedMissingCourses(text, TAKEN)).toBe(text);
    });

    it("술어와 무관한 절의 나열은 건드리지 않는다", () => {
      // 문장 전체를 훑으면 "확률과 통계"가 앞 절에서 잘려 나가 문장이 깨졌다
      const text = "미적분·확률과 통계는 우수하나 기하는 미이수입니다.";
      expect(
        removeMisstatedMissingCourses(text, ["미적분", "확률과 통계"])
      ).toBe(text);
    });

    it("변경이 없으면 앞뒤 공백까지 원문 그대로 둔다", () => {
      const text = "  전공 적합성이 우수합니다.  ";
      expect(removeMisstatedMissingCourses(text, ["미적분"])).toBe(text);
    });

    it("소수점이 섞인 문장에서 오서술만 제거한다", () => {
      const text =
        "내신 평균은 2.3등급으로 안정적입니다. 미적분을 이수하지 않아 아쉽습니다.";
      expect(removeMisstatedMissingCourses(text, ["미적분"])).toBe(
        "내신 평균은 2.3등급으로 안정적입니다."
      );
    });

    it("한계 대신 얻은 것: 짧은 이름이 긴 과목명을 자르지 않는다", () => {
      const text = "확률과 통계를 이수하지 않았습니다.";
      expect(removeMisstatedMissingCourses(text, ["확률"])).toBe(text);
    });
  });

  describe("이수하지 않은 과목을 이수했다고 서술한 경우", () => {
    it.each([
      ["인접형", "기하를 이수했고 그 경험이 강점입니다.", ""],
      ["어순 분리", "기하의 경우 이수 완료로 확인됩니다.", ""],
      ["중점 나열", "화학Ⅱ·기하를 이수했습니다.", "화학Ⅱ를 이수했습니다."],
    ])("제거: %s", (_label, input, expected) => {
      expect(removeMisstatedTakenCourses(input, MISSING)).toBe(expected);
    });

    it.each([
      ["확인 프레임", "기하를 이수한 것으로 확인됩니다."],
      ["기록 프레임", "기하 이수 기록이 확인됩니다."],
      ["이력 프레임", "기하를 이수한 이력이 있습니다."],
      ["내역 프레임", "기하를 이수한 내역이 있습니다."],
      ["수강 확인 프레임", "기하를 수강한 것으로 나타납니다."],
    ])("제거: %s", (_label, input) => {
      expect(removeMisstatedTakenCourses(input, MISSING)).toBe("");
    });

    it.each([
      ["미래형 이수 권고", "미적분Ⅱ를 이수한다면 전공 적합성이 높아집니다."],
      ["기록 부정", "기하 이수 기록이 확인되지 않습니다."],
      ["가정 프레임", "기하를 이수한 것으로 가정하면 유리합니다."],
      ["의향 표현", "기하를 이수하고 싶다면 3학년에 신청하세요."],
      ["시제 중립 목적형", "기하를 이수하여 수학적 기반을 다지기를 권합니다."],
      ["수단형", "미적분Ⅱ를 이수함으로써 보완할 수 있습니다."],
      ["부정 서술", "기하 이수 기록이 없습니다."],
      ["관형형 + 미래", "기하를 이수한 뒤 심화 탐구로 확장하기를 권합니다."],
      ["관형형 + 일반론", "기하를 이수한 학생은 공학 계열에서 유리합니다."],
      ["가정법", "기하를 이수했더라면 더 좋았을 것입니다."],
      [
        "미이수 서술과 혼재",
        "물리학Ⅱ는 이수했지만 기하는 이수하지 못했습니다.",
      ],
      ["교과 영역 단위", "과학탐구 과목을 다양하게 이수했습니다."],
      ["실제 이수 과목", "물리학Ⅱ를 이수하여 기반이 탄탄합니다."],
    ])("보존: %s", (_label, input) => {
      expect(removeMisstatedTakenCourses(input, MISSING)).toBe(input);
    });
  });
});

describe("scrubCourseStatusStatements — 전 섹션 보정", () => {
  const buildSections = (): ReportSection[] =>
    [
      {
        sectionId: "subjectAnalysis",
        title: "과목별 분석",
        subjects: [
          {
            subjectName: "화학Ⅰ",
            year: 2,
            evaluationComment: "탐구 설계가 우수합니다.",
            improvementDirection:
              "다만 화학2를 이수하지 않은 점이 아쉬우므로 면접에서 보완하세요.",
          },
        ],
      },
      {
        sectionId: "courseAlignment",
        title: "교과 이수 현황",
        courses: [
          { course: "화학Ⅱ", status: "이수", importance: "권장" },
          { course: "기하", status: "미이수", importance: "권장" },
        ],
        missingCourseImpact: "기하 미이수는 보완이 필요합니다.",
      },
      {
        sectionId: "interviewPrep",
        title: "면접 준비",
        questions: ["기하를 이수했으므로 강점입니다."],
      },
    ] as unknown as ReportSection[];

  it("이수한 과목을 미이수로 서술한 문장을 섹션 종류와 무관하게 제거한다", () => {
    // Arrange
    const sections = buildSections();

    // Act
    const fixed = scrubCourseStatusStatements(
      sections,
      ["화학Ⅱ"],
      ["기하"],
      "[test]"
    );

    // Assert
    const subjectAnalysis = sections[0] as unknown as {
      subjects: Record<string, unknown>[];
    };
    expect(fixed).toBeGreaterThan(0);
    expect(subjectAnalysis.subjects[0]).not.toHaveProperty(
      "improvementDirection"
    );
    // 오서술과 무관한 필드는 그대로 남는다
    expect(subjectAnalysis.subjects[0].evaluationComment).toBe(
      "탐구 설계가 우수합니다."
    );
  });

  it("실제 미이수 과목에 대한 정상 서술과 표 구조는 건드리지 않는다", () => {
    // Arrange
    const sections = buildSections();

    // Act
    scrubCourseStatusStatements(sections, ["화학Ⅱ"], ["기하"], "[test]");

    // Assert
    const courseAlignment = sections[1] as unknown as {
      courses: { course: string; status: string }[];
      missingCourseImpact: string;
    };
    expect(courseAlignment.missingCourseImpact).toBe(
      "기하 미이수는 보완이 필요합니다."
    );
    expect(courseAlignment.courses).toEqual([
      { course: "화학Ⅱ", status: "이수", importance: "권장" },
      { course: "기하", status: "미이수", importance: "권장" },
    ]);
  });

  it("배열 안 문자열의 이수 오서술도 제거한다", () => {
    // Arrange
    const sections = buildSections();

    // Act
    scrubCourseStatusStatements(sections, ["화학Ⅱ"], ["기하"], "[test]");

    // Assert
    const interviewPrep = sections[2] as unknown as { questions: string[] };
    expect(interviewPrep.questions).toHaveLength(0);
  });

  it("문장이 전부 오서술이면 빈 문자열 대신 필드를 제거한다", () => {
    // Arrange
    const sections = [
      {
        sectionId: "weaknessAnalysis",
        title: "약점 분석",
        summary: "화학2를 이수하지 않은 점이 아쉽습니다.",
      },
    ] as unknown as ReportSection[];

    // Act
    scrubCourseStatusStatements(sections, ["화학Ⅱ"], [], "[test]");

    // Assert
    const weakness = sections[0] as unknown as Record<string, unknown>;
    expect(weakness).not.toHaveProperty("summary");
    expect(weakness.title).toBe("약점 분석");
  });

  it("이수 서술이 없는 문장은 그대로 둔다", () => {
    // Arrange
    const sections = [
      {
        sectionId: "weaknessAnalysis",
        title: "약점 분석",
        summary: "탐구 주제의 연결성이 약해 보완이 필요합니다.",
      },
    ] as unknown as ReportSection[];

    // Act
    const fixed = scrubCourseStatusStatements(
      sections,
      ["화학Ⅱ"],
      ["기하"],
      "[test]"
    );

    // Assert
    const weakness = sections[0] as unknown as { summary: string };
    expect(fixed).toBe(0);
    expect(weakness.summary).toBe(
      "탐구 주제의 연결성이 약해 보완이 필요합니다."
    );
  });
});

describe("postprocess — 파이프라인 전체 (신고된 케이스 재현)", () => {
  it("이수한 과목을 미이수로 서술한 과목별 분석 문장이 최종 출력에 남지 않는다", () => {
    // Arrange: 화학Ⅰ·화학Ⅱ를 모두 이수한 학생
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(2, "화학Ⅰ", "과학"),
        generalSubject(3, "화학Ⅱ", "과학"),
      ] as RecordData["generalSubjects"],
      subjectEvaluations: [
        { year: 2, subject: "화학Ⅰ", evaluation: "화학Ⅰ 세특 내용" },
        { year: 3, subject: "화학Ⅱ", evaluation: "화학Ⅱ 세특 내용" },
      ] as RecordData["subjectEvaluations"],
    };
    // 3학년 학생이어야 3학년 성적·세특이 분석 범위에 들어온다
    const grade3StudentInfo: StudentInfo = { ...studentInfo, grade: 3 };
    const { data } = preprocess(recordData, grade3StudentInfo, "premium");

    const sections = [
      {
        sectionId: "subjectAnalysis",
        title: "과목별 분석",
        subjects: [
          {
            subjectName: "화학Ⅰ",
            year: 2,
            rating: "good",
            activitySummary: "산-염기 중화 반응을 탐구했습니다.",
            evaluationComment:
              "입학사정관은 탐구 설계의 구체성을 긍정적으로 평가할 수 있습니다.",
            improvementDirection:
              "탐구를 동아리 활동으로 확장하면 진로 일관성이 단단해집니다. 다만 화학2를 이수하지 않은 점이 아쉬우므로 면접에서 보완이 필요합니다.",
          },
        ],
      },
    ] as unknown as ReportSection[];

    // Act
    const result = postprocess(
      sections,
      data,
      grade3StudentInfo,
      "premium",
      "test-report"
    );

    // Assert
    const subjectAnalysis = result.content.sections.find(
      (s) => s.sectionId === "subjectAnalysis"
    ) as unknown as {
      subjects: { improvementDirection?: string }[];
    };
    const direction = subjectAnalysis.subjects[0].improvementDirection ?? "";
    expect(direction).not.toContain("이수하지 않은");
    // 오서술 문장만 사라지고 정상 서술은 남는다
    expect(direction).toContain("동아리 활동으로 확장하면");
  });
});
