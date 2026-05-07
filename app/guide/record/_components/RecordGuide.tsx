"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import styles from "./RecordGuide.module.css";

type IssueMethod = "kakao" | "gov24";
type CalloutType = "tip" | "warning" | "note";

interface StepImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface Step {
  title: string;
  description?: string;
  notice?: string;
  image?: StepImage;
}

interface IssueGuide {
  steps: Step[];
}

const ISSUE_GUIDES: Record<IssueMethod, IssueGuide> = {
  kakao: {
    steps: [
      {
        title: "카카오톡 실행 후 하단의 '더보기(점 3개)' 버튼 클릭",
        image: {
          src: "/images/record/guide/kakao/1.png",
          alt: "카카오톡 하단 더보기 버튼 위치",
          width: 304,
          height: 375,
        },
      },
      {
        title: "'지갑' 버튼 클릭 후 우측 상단 '발급' 버튼 클릭",
        image: {
          src: "/images/record/guide/kakao/2.png",
          alt: "카카오톡 지갑 화면의 발급 버튼",
          width: 296,
          height: 497,
        },
      },
      {
        title: "'학교생활기록부초중고' 선택",
        image: {
          src: "/images/record/guide/kakao/3.png",
          alt: "전자증명서 목록에서 학교생활기록부초중고 선택",
          width: 280,
          height: 419,
        },
      },
      {
        title: "이용약관 동의 후 시도교육청 및 소속 고등학교 선택",
        image: {
          src: "/images/record/guide/kakao/4.png",
          alt: "교육청과 학교 선택 화면",
          width: 314,
          height: 341,
        },
      },
      {
        title: "본인 인증 진행",
        description:
          "본인 명의의 휴대폰으로 인증을 완료해주세요. PASS, 문자, 신용카드 인증 모두 가능합니다.",
      },
      {
        title: "'저장하기' → '비밀번호 설정 없이 저장하기' 선택",
        description:
          "비밀번호를 설정하지 않아야 PDF 업로드 시 추가 절차 없이 사용할 수 있습니다.",
        image: {
          src: "/images/record/guide/kakao/5.png",
          alt: "비밀번호 설정 없이 저장하기 선택 화면",
          width: 361,
          height: 361,
        },
      },
    ],
  },
  gov24: {
    steps: [
      {
        title: "정부24 접속",
        description: "PC 브라우저에서 정부24(gov.kr) 웹사이트에 접속해주세요.",
      },
      {
        title: "검색창에 '학교생활기록부(초중고)'를 선택해서 발급",
        notice:
          "재학생의 경우 '학교생활기록부(대입전형용)'을 선택하면 발급되지 않습니다. 반드시 '학교생활기록부(초중고)'를 선택해주세요.",
        image: {
          src: "/images/record/guide/24/1.jpeg",
          alt: "정부24에서 학교생활기록부(초중고) 검색 결과",
          width: 444,
          height: 301,
        },
      },
      {
        title: "'신청 내용' 칸의 '검색' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/2.png",
          alt: "신청 내용 칸의 검색 버튼",
          width: 441,
          height: 193,
        },
      },
      {
        title: "시도교육청 선택 후 학교 검색",
        description:
          "시도교육청을 선택하고, 소속 고등학교명을 입력해 '검색' 버튼을 눌러주세요.",
        image: {
          src: "/images/record/guide/24/3.png",
          alt: "시도교육청과 학교 검색 화면",
          width: 433,
          height: 242,
        },
      },
      {
        title: "수령방법 '온라인발급(본인출력)' 선택 후 '신청하기' 클릭",
        description:
          "소속 고등학교 선택 후 수령방법을 '온라인발급(본인출력)'으로 설정하고 우측 하단 '신청하기' 버튼을 누르세요.",
        image: {
          src: "/images/record/guide/24/4.png",
          alt: "수령방법 온라인발급(본인출력) 선택",
          width: 677,
          height: 221,
        },
      },
      {
        title: "'서비스 신청 내역'에서 '문서출력' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/5.png",
          alt: "서비스 신청 내역의 문서출력 버튼",
          width: 552,
          height: 87,
        },
      },
      {
        title: "'문서출력' 창 상단의 '인쇄' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/6.png",
          alt: "문서출력 창 상단의 인쇄 버튼",
          width: 537,
          height: 206,
        },
      },
      {
        title: "'대상'을 'PDF로 저장'으로 설정 후 '저장' 클릭",
        description:
          "인쇄 다이얼로그의 대상 항목을 'PDF로 저장'으로 변경한 뒤 하단 '저장' 버튼을 누르면 PDF 파일이 생성됩니다.",
      },
    ],
  },
};

const UPLOAD_STEPS: Step[] = [
  {
    title: "스카이로드 상단 메뉴에서 '생기부 분석' 버튼 클릭",
    image: {
      src: "/images/record/guide/24/7.png",
      alt: "스카이로드 상단의 생기부 분석 버튼",
      width: 500,
      height: 238,
    },
  },
  {
    title: "보라색 '등록하기' 버튼 클릭",
    image: {
      src: "/images/record/guide/24/8.png",
      alt: "생활기록부 분석 화면의 등록하기 버튼",
      width: 691,
      height: 213,
    },
  },
  {
    title: "'PDF 업로드' 선택",
    image: {
      src: "/images/record/guide/24/9.png",
      alt: "PDF 업로드 옵션 선택",
      width: 707,
      height: 295,
    },
  },
  {
    title: "생기부 PDF 파일 업로드",
    image: {
      src: "/images/record/guide/24/10.png",
      alt: "PDF 파일 업로드 화면",
      width: 583,
      height: 396,
    },
  },
];

const METHOD_OPTIONS: { key: IssueMethod; label: string }[] = [
  { key: "kakao", label: "카카오톡 전자증명서" },
  { key: "gov24", label: "정부24" },
];

export const RecordGuide = () => {
  const [method, setMethod] = useState<IssueMethod>("kakao");
  const guide = ISSUE_GUIDES[method];

  return (
    <article className={styles.guide}>
      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowRule} aria-hidden="true" />
              STEP 01 · 발급
            </p>
            <h2 className={styles.title}>학교생활기록부 발급하기</h2>
            <p className={styles.lead}>
              카카오톡 또는 정부24에서 학교생활기록부 PDF를 발급받습니다.
            </p>
            <div
              className={styles.tabs}
              role="tablist"
              aria-label="발급 방법 선택"
            >
              {METHOD_OPTIONS.map((option) => {
                const isActive = method === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                    onClick={() => setMethod(option.key)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </header>

          <ol className={styles.stepList} key={method}>
            {guide.steps.map((step, idx) => (
              <StepItem key={`${method}-${idx}`} index={idx + 1} step={step} />
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionFollow}`}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowRule} aria-hidden="true" />
              STEP 02 · 업로드
            </p>
            <h2 className={styles.title}>스카이로드에 PDF 업로드</h2>
            <p className={styles.lead}>
              발급받은 PDF 파일을 스카이로드에 등록하면 분석이 시작됩니다.
            </p>
          </header>

          <ol className={styles.stepList}>
            {UPLOAD_STEPS.map((step, idx) => (
              <StepItem key={`upload-${idx}`} index={idx + 1} step={step} />
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.bottomCta}>
        <div className={styles.container}>
          <p className={styles.bottomCtaTitle}>발급이 완료되셨나요?</p>
          <p className={styles.bottomCtaSubtitle}>
            준비된 PDF로 바로 등록을 시작할 수 있습니다.
          </p>
          <Link href="/record/submit" className={styles.bottomCtaButton}>
            생기부 등록하러 가기
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </article>
  );
};

interface StepItemProps {
  index: number;
  step: Step;
}

const StepItem = ({ index, step }: StepItemProps) => {
  const isPortrait = step.image ? step.image.width < 400 : false;
  const hasImage = !!step.image;

  return (
    <li className={`${styles.step} ${hasImage ? "" : styles.stepNoImage}`}>
      <div className={styles.stepNumberCol}>
        <span className={styles.stepNumber}>{index}</span>
      </div>
      <div className={styles.stepBody}>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        {step.description && (
          <p className={styles.stepDescription}>{step.description}</p>
        )}
        {step.notice && (
          <Callout type="warning" label="주의">
            {step.notice}
          </Callout>
        )}
        {step.image && (
          <figure
            className={`${styles.frame} ${isPortrait ? styles.framePortrait : ""}`}
          >
            <Image
              src={step.image.src}
              alt={step.image.alt}
              width={step.image.width}
              height={step.image.height}
              quality={100}
              sizes={isPortrait ? "320px" : "(max-width: 760px) 100vw, 712px"}
            />
          </figure>
        )}
      </div>
    </li>
  );
};

interface CalloutProps {
  type: CalloutType;
  label: string;
  children: ReactNode;
}

const Callout = ({ type, label, children }: CalloutProps) => {
  const variantClass = {
    tip: styles.calloutTip,
    warning: styles.calloutWarning,
    note: styles.calloutNote,
  }[type];

  return (
    <aside className={`${styles.callout} ${variantClass}`}>
      <span className={styles.calloutLabel}>{label}</span>
      <div className={styles.calloutBody}>{children}</div>
    </aside>
  );
};
