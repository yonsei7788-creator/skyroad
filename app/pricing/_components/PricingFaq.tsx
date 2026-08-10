"use client";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

import { FadeIn } from "../../_components/FadeIn";
import styles from "./PricingFaq.module.css";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    question: "분석 결과는 언제 받을 수 있나요?",
    answer:
      "결제 완료 후 72시간 이내에 이메일로 전달됩니다. AI가 1차 분석한 결과를 전임 컨설턴트가 직접 재검토하고 수정하는 과정이 포함되어 있어, 단순 AI 분석보다 훨씬 높은 정확도를 보장합니다.",
  },
  {
    question: "환불은 가능한가요?",
    answer:
      "AI 분석이 시작되기 전에는 전액 환불이 가능합니다. 분석이 시작된 이후에는 이미 리소스가 투입되므로 환불이 어렵습니다. 자세한 환불 정책은 이용약관을 확인해주세요.",
  },
  {
    question: "플랜 업그레이드가 가능한가요?",
    answer:
      "리포트 전달 전이라면 차액을 추가 결제하여 상위 플랜으로 업그레이드할 수 있습니다. 리포트가 이미 전달된 경우에는 새로운 주문으로 진행해주세요.",
  },
  {
    question: "PDF 업로드가 안 되면 어떻게 하나요?",
    answer:
      "PDF 업로드가 어려운 경우, 생기부 텍스트를 직접 복사하여 텍스트 입력 방식으로 제출하실 수 있습니다. 두 가지 방식 모두 동일한 품질의 분석 결과를 제공합니다.",
  },
  {
    question: "예체능 학과도 추천 대학 분석을 받을 수 있나요?",
    answer:
      "실기 전형이 포함된 예체능 학과(체육, 무용, 음악, 미술 등)는 실기 성적에 따라 합격 여부가 크게 달라지므로, 추천 대학 분석이 제공되지 않습니다. 다만 세특 분석, 역량 평가, 전형별 전략 등 나머지 분석은 정상적으로 제공됩니다.",
  },
];

const FaqAccordionItem = ({ item }: { item: FaqItem }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.accordionItem}>
      <button
        type="button"
        className={styles.accordionTrigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.accordionQuestion}>{item.question}</span>
        <ChevronDown
          size={20}
          className={`${styles.accordionIcon} ${isOpen ? styles.accordionIconOpen : ""}`}
        />
      </button>
      <div
        className={`${styles.accordionContent} ${isOpen ? styles.accordionContentOpen : styles.accordionContentClosed}`}
      >
        <div className={styles.accordionInner}>
          <p className={styles.accordionAnswer}>{item.answer}</p>
        </div>
      </div>
    </div>
  );
};

export const PricingFaq = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>FAQ</p>
          <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className={styles.faqList}>
            {FAQ_DATA.map((item) => (
              <FaqAccordionItem key={item.question} item={item} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
