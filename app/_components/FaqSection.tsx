"use client";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

import { FadeIn } from "./FadeIn";
import styles from "./FaqSection.module.css";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    question: "분석 결과는 언제 받을 수 있나요?",
    answer:
      "결제 완료 후 72시간 이내에 이메일로 전달됩니다. 수십만 건의 데이터를 학습한 AI가 생기부 전 영역을 정밀 분석한 후, 전임 입시 전문가가 결과를 직접 검토하고 보완하는 과정을 거칩니다. 단순히 정보를 나열하는 분석이 아니라, 실제 지원 전략까지 이어질 수 있는 수준의 완성도 높은 리포트를 받아보시게 됩니다.",
  },
  {
    question: "생기부 파일은 안전하게 관리되나요?",
    answer:
      "모든 자료는 암호화된 환경에서 안전하게 처리되며, 외부로 공유되거나 활용되지 않습니다. 분석 완료 후 일정 기간이 지나면 자동으로 삭제되며, 개인정보 보호 기준에 따라 엄격하게 관리됩니다. 입시에 직결되는 민감한 자료인 만큼, 유출이나 오용에 대한 걱정 없이 안심하고 맡기실 수 있습니다.",
  },
  {
    question: "어떤 학년의 생기부도 분석 가능한가요?",
    answer:
      "고1부터 고3, 재수생 및 N수생까지 모두 분석 가능합니다. 다만, 대학 지원 전략은 충분한 데이터가 필요한 만큼, 고2 이상의 생기부가 포함될 때 보다 구체적이고 정밀하게 제공됩니다. 학생의 현재 위치에 맞춰 현실적인 방향과 다음 단계까지 함께 설계해드립니다.",
  },
  {
    question: "분석 결과의 정확도는 어느 정도인가요?",
    answer:
      "AI가 생기부 전 영역을 빠짐없이 분석한 뒤, 전임 입시 전문가가 결과를 직접 검토하고 최종 보완합니다. 단순 해석을 제공하는 것이 아니라, 실제 지원에 적용 가능한 수준까지 정제된 결과를 제공합니다. 단순 참고용이 아닌, 실제 합격 가능성을 높이기 위한 판단과 전략이 함께 담긴 결과입니다.",
  },
  {
    question: "환불은 가능한가요?",
    answer:
      "분석이 시작되기 전에는 전액 환불이 가능합니다. 분석이 시작된 이후에는 AI 분석 및 전문가 검토가 동시에 진행되므로 환불이 어려운 점 양해 부탁드립니다. 분석이 시작되는 순간부터 실제 인력과 시간이 투입되는 맞춤형 작업이 진행됩니다.",
  },
  {
    question: "PDF 업로드가 안 되면 어떻게 하나요?",
    answer:
      "PDF 업로드가 어려운 경우, 생기부 내용을 텍스트로 직접 입력하셔도 동일하게 분석이 가능합니다. 두 가지 방식 모두 동일한 분석 프로세스를 거치며 결과의 차이는 없습니다. 어떤 방식으로 제출하셔도 동일한 기준과 품질로 정확한 결과를 받아보실 수 있습니다.",
  },
  {
    question: "생기부가 부족한데도 효과가 있나요?",
    answer:
      "네, 가능합니다. 현재 생기부 수준을 객관적으로 분석하고, 부족한 부분을 어떻게 보완해야 하는지까지 구체적으로 제시합니다. 지금 상태에서 무엇을 채워야 합격 가능성이 올라가는지 명확하게 확인할 수 있습니다.",
  },
  {
    question: "이미 컨설팅을 받아봤는데, 차이가 있나요?",
    answer:
      "기존 컨설팅이 경험 기반이라면, 본 서비스는 데이터 기반 분석에 전문가 검토가 더해진 구조입니다. 주관적인 조언이 아니라, 근거 있는 분석과 전략을 함께 받아보실 수 있습니다.",
  },
  {
    question: "어떤 학생에게 가장 도움이 되나요?",
    answer:
      "지원 전략이 막막한 학생, 방향이 맞는지 고민되는 학생, 또는 현재 수준에서 더 끌어올리고 싶은 학생에게 효과적입니다. '지금 상태에서 어떻게 합격까지 갈 수 있는지' 알고 싶은 경우 가장 큰 도움이 됩니다.",
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

export const FaqSection = () => {
  return (
    <section id="faq" className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>FAQ</p>
          <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
          <p className={styles.sectionSubtitle}>
            궁금한 점이 있으시면 언제든 문의해주세요
          </p>
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
