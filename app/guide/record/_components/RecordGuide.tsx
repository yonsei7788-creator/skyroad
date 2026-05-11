"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X, ZoomIn } from "lucide-react";

import styles from "./RecordGuide.module.css";

type IssueMethod = "kakao" | "gov24";
type StepSection = "issue" | "upload";
type CalloutType = "tip" | "warning" | "note";
type AspectKind = "landscape" | "portrait";

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
  aspect: AspectKind;
  steps: Step[];
  uploadSteps: Step[];
}

const KAKAO_IMAGE_WIDTH = 360;
const KAKAO_IMAGE_HEIGHT = 779;
const GOV24_IMAGE_WIDTH = 960;
const GOV24_IMAGE_HEIGHT = 540;

const ISSUE_GUIDES: Record<IssueMethod, IssueGuide> = {
  kakao: {
    aspect: "portrait",
    steps: [
      {
        title: "카카오톡 '더보기'에서 '전자증명서' 선택",
        image: {
          src: "/images/record/guide/kakao/카카오톡-1.png",
          alt: "카카오톡 더보기 화면의 전자증명서 메뉴",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "전자증명서 목록에서 '학교생활기록부 (초중고)' 선택",
        image: {
          src: "/images/record/guide/kakao/카카오톡-2.png",
          alt: "전자증명서 목록에서 학교생활기록부(초중고) 선택",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "교육청과 학교 이름 선택 후 약관 동의",
        description:
          "본인이 다닌 시도교육청과 고등학교를 검색해 선택하고, 카카오-행정안전부 제3자 제공 동의에 체크해주세요.",
        image: {
          src: "/images/record/guide/kakao/카카오톡-3.png",
          alt: "교육청과 학교 이름을 입력하는 발급 신청 화면",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "학적 정보 확인 후 '인증 후 신청하기' 클릭",
        image: {
          src: "/images/record/guide/kakao/카카오톡-4.png",
          alt: "학적 정보 확인 화면의 인증 후 신청하기 버튼",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "본인 인증 진행 후 발급 완료",
        description:
          "본인 명의의 휴대폰으로 인증을 완료하면 전자증명서가 자동으로 저장됩니다. PASS, 문자, 신용카드 인증 모두 가능합니다.",
      },
    ],
    uploadSteps: [
      {
        title: "스카이로드 우측 상단의 메뉴 버튼 클릭",
        image: {
          src: "/images/record/guide/kakao/카카오톡-5.png",
          alt: "스카이로드 모바일 화면의 우측 상단 메뉴 버튼",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "메뉴에서 '생기부 분석' 선택",
        image: {
          src: "/images/record/guide/kakao/카카오톡-6.png",
          alt: "사이드 메뉴의 생기부 분석 항목",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "보라색 '등록하기' 버튼 클릭",
        image: {
          src: "/images/record/guide/kakao/카카오톡-7.png",
          alt: "생활기록부 분석 화면의 등록하기 버튼",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "'PDF 업로드' 선택",
        image: {
          src: "/images/record/guide/kakao/카카오톡-8.png",
          alt: "PDF 업로드 옵션 선택 화면",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
      {
        title: "생기부 PDF 파일 업로드",
        image: {
          src: "/images/record/guide/kakao/카카오톡-9.png",
          alt: "PDF 파일 업로드 화면",
          width: KAKAO_IMAGE_WIDTH,
          height: KAKAO_IMAGE_HEIGHT,
        },
      },
    ],
  },
  gov24: {
    aspect: "landscape",
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
          src: "/images/record/guide/24/정부24-1.png",
          alt: "정부24에서 학교생활기록부(초중고) 검색 결과",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "'신청 내용' 칸의 '검색' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/정부24-2.png",
          alt: "신청 내용 칸의 검색 버튼",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "시도교육청 선택 후 학교 검색",
        description:
          "시도교육청을 선택하고, 소속 고등학교명을 입력해 '검색' 버튼을 눌러주세요.",
        image: {
          src: "/images/record/guide/24/정부24-3.png",
          alt: "시도교육청과 학교 검색 화면",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "수령방법 '온라인발급(본인출력)' 선택 후 '신청하기' 클릭",
        description:
          "소속 고등학교 선택 후 수령방법을 '온라인발급(본인출력)'으로 설정하고 우측 하단 '신청하기' 버튼을 누르세요.",
        image: {
          src: "/images/record/guide/24/정부24-4.png",
          alt: "수령방법 온라인발급(본인출력) 선택",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "'서비스 신청 내역'에서 '문서출력' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/정부24-5.png",
          alt: "서비스 신청 내역의 문서출력 버튼",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "'문서출력' 창 상단의 '인쇄' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/정부24-6.png",
          alt: "문서출력 창 상단의 인쇄 버튼",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "'대상'을 'PDF로 저장'으로 설정 후 '저장' 클릭",
        description:
          "인쇄 다이얼로그의 대상 항목을 'PDF로 저장'으로 변경한 뒤 하단 '저장' 버튼을 누르면 PDF 파일이 생성됩니다.",
        image: {
          src: "/images/record/guide/24/정부24-7.png",
          alt: "인쇄 대화상자의 PDF로 저장 설정",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
    ],
    uploadSteps: [
      {
        title: "스카이로드 상단 메뉴에서 '생기부 분석' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/정부24-8.png",
          alt: "스카이로드 상단의 생기부 분석 버튼",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "보라색 '등록하기' 버튼 클릭",
        image: {
          src: "/images/record/guide/24/정부24-9.png",
          alt: "생활기록부 분석 화면의 등록하기 버튼",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "'PDF 업로드' 선택",
        image: {
          src: "/images/record/guide/24/정부24-10.png",
          alt: "PDF 업로드 옵션 선택",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
      {
        title: "생기부 PDF 파일 업로드",
        image: {
          src: "/images/record/guide/24/정부24-11.png",
          alt: "PDF 파일 업로드 화면",
          width: GOV24_IMAGE_WIDTH,
          height: GOV24_IMAGE_HEIGHT,
        },
      },
    ],
  },
};

const METHOD_OPTIONS: { key: IssueMethod; label: string; sub: string }[] = [
  { key: "kakao", label: "카카오톡 전자증명서", sub: "모바일" },
  { key: "gov24", label: "정부24", sub: "PC" },
];

const buildStepId = (method: IssueMethod, section: StepSection, idx: number) =>
  `step-${method}-${section}-${idx}`;

export const RecordGuide = () => {
  const [method, setMethod] = useState<IssueMethod>("kakao");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<StepImage | null>(null);
  const guide = ISSUE_GUIDES[method];

  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-step-card]")
    );
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [method]);

  useEffect(() => {
    if (!lightboxImage) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxImage(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
    };
  }, [lightboxImage]);

  const handleMethodChange = (next: IssueMethod) => {
    if (next === method) return;
    setMethod(next);
    setActiveId(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <article className={styles.guide}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>발급 가이드</p>
          <h1 className={styles.heroTitle}>
            학교생활기록부 발급부터 업로드까지
          </h1>
          <p className={styles.heroLead}>
            발급 방식을 선택하면 단계별 화면과 함께 따라할 수 있어요.
          </p>
          <div className={styles.methodSwitch} role="tablist">
            {METHOD_OPTIONS.map((option) => {
              const isActive = method === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.methodChip} ${isActive ? styles.methodChipActive : ""}`}
                  onClick={() => handleMethodChange(option.key)}
                >
                  <span className={styles.methodChipLabel}>{option.label}</span>
                  <span className={styles.methodChipSub}>{option.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className={styles.layoutShell}>
        <div className={styles.layout} key={method}>
          <aside className={styles.rail} aria-label="가이드 단계 목차">
            <RailGroup
              eyebrow="STEP 01"
              label="발급"
              section="issue"
              method={method}
              steps={guide.steps}
              activeId={activeId}
            />
            <RailGroup
              eyebrow="STEP 02"
              label="업로드"
              section="upload"
              method={method}
              steps={guide.uploadSteps}
              activeId={activeId}
            />
          </aside>

          <main className={styles.content}>
            <SectionBlock
              eyebrow="STEP 01 · 발급"
              title="학교생활기록부 발급하기"
              lead={
                method === "kakao"
                  ? "카카오톡 전자증명서로 모바일에서 바로 PDF를 발급받습니다."
                  : "PC 브라우저로 정부24에 접속해 PDF를 발급받습니다."
              }
            >
              {guide.steps.map((step, idx) => (
                <StepCard
                  key={`issue-${idx}`}
                  id={buildStepId(method, "issue", idx)}
                  index={idx + 1}
                  step={step}
                  aspect={guide.aspect}
                  onImageClick={setLightboxImage}
                />
              ))}
            </SectionBlock>

            <SectionBlock
              eyebrow="STEP 02 · 업로드"
              title="스카이로드에 PDF 업로드"
              lead="발급받은 PDF 파일을 스카이로드에 등록하면 분석이 시작됩니다."
            >
              {guide.uploadSteps.map((step, idx) => (
                <StepCard
                  key={`upload-${idx}`}
                  id={buildStepId(method, "upload", idx)}
                  index={idx + 1}
                  step={step}
                  aspect={guide.aspect}
                  onImageClick={setLightboxImage}
                />
              ))}
            </SectionBlock>
          </main>
        </div>
      </div>

      <section className={styles.bottomCta}>
        <div className={styles.bottomCtaInner}>
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

      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </article>
  );
};

interface RailGroupProps {
  eyebrow: string;
  label: string;
  section: StepSection;
  method: IssueMethod;
  steps: Step[];
  activeId: string | null;
}

const RailGroup = ({
  eyebrow,
  label,
  section,
  method,
  steps,
  activeId,
}: RailGroupProps) => {
  return (
    <div className={styles.railGroup}>
      <div className={styles.railHeader}>
        <span className={styles.railEyebrow}>{eyebrow}</span>
        <span className={styles.railLabel}>{label}</span>
      </div>
      <ol className={styles.railList}>
        {steps.map((step, idx) => {
          const id = buildStepId(method, section, idx);
          const isActive = activeId === id;
          return (
            <li
              key={id}
              className={`${styles.railItem} ${isActive ? styles.railItemActive : ""}`}
            >
              <a href={`#${id}`} className={styles.railLink}>
                <span className={styles.railNumber}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className={styles.railText}>{step.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

interface SectionBlockProps {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}

const SectionBlock = ({
  eyebrow,
  title,
  lead,
  children,
}: SectionBlockProps) => {
  return (
    <section className={styles.sectionBlock}>
      <header className={styles.sectionHeader}>
        <p className={styles.sectionEyebrow}>
          <span className={styles.sectionEyebrowRule} aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionLead}>{lead}</p>
      </header>
      <ol className={styles.cardList}>{children}</ol>
    </section>
  );
};

interface StepCardProps {
  id: string;
  index: number;
  step: Step;
  aspect: AspectKind;
  onImageClick: (image: StepImage) => void;
}

const StepCard = ({ id, index, step, aspect, onImageClick }: StepCardProps) => {
  const hasImage = !!step.image;
  const cardClass = hasImage
    ? aspect === "portrait"
      ? styles.cardPortrait
      : styles.cardLandscape
    : styles.cardTextOnly;

  return (
    <li id={id} data-step-card className={`${styles.card} ${cardClass}`}>
      <div className={styles.cardBody}>
        <span className={styles.cardNumber}>
          {String(index).padStart(2, "0")}
        </span>
        <div className={styles.cardText}>
          <h3 className={styles.cardTitle}>{step.title}</h3>
          {step.description && (
            <p className={styles.cardDescription}>{step.description}</p>
          )}
          {step.notice && (
            <Callout type="warning" label="주의">
              {step.notice}
            </Callout>
          )}
        </div>
      </div>
      {step.image && (
        <button
          type="button"
          className={styles.cardImageButton}
          onClick={() => onImageClick(step.image as StepImage)}
          aria-label={`${step.image.alt} 확대해서 보기`}
        >
          <span className={styles.cardImageFrame}>
            <Image
              src={step.image.src}
              alt={step.image.alt}
              width={step.image.width}
              height={step.image.height}
              quality={100}
              sizes={
                aspect === "portrait"
                  ? "(max-width: 767px) 280px, 280px"
                  : "(max-width: 767px) 100vw, 560px"
              }
            />
            <span className={styles.cardImageZoom} aria-hidden="true">
              <ZoomIn size={14} />
              확대
            </span>
          </span>
        </button>
      )}
    </li>
  );
};

interface LightboxProps {
  image: StepImage;
  onClose: () => void;
}

const Lightbox = ({ image, onClose }: LightboxProps) => {
  return (
    <div
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label="닫기"
      >
        <X size={20} />
      </button>
      <div
        className={styles.lightboxFrame}
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width * 3}
          height={image.height * 3}
          quality={100}
          sizes="90vw"
          className={styles.lightboxImage}
        />
      </div>
    </div>
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
