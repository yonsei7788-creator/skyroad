import Image from "next/image";

import { FadeIn } from "./FadeIn";
import styles from "./ServiceCardSection.module.css";

interface ServiceCardData {
  title: string;
  description: string;
  image: string;
}

const SERVICES: ServiceCardData[] = [
  {
    title: "이 생기부로, 어디까지 가능한지 보여드립니다",
    description:
      "학생의 생기부를 데이터로 해석해 현재 위치와 합격 가능성을 명확히 드러냅니다",
    image: "/images/landing/service-1.png",
  },
  {
    title: "잘 맞는 전공이 아니라, 붙을 수 있는 전공을 찾습니다",
    description:
      "생기부와 전공의 연결성을 분석해 합격 가능성이 높은 선택지를 제시합니다",
    image: "/images/landing/service-2.png",
  },
  {
    title: "읽고 끝나는 리포트가 아니라, 결과를 바꾸는 전략입니다",
    description:
      "단순 분석이 아닌, 실제 지원에 바로 적용 가능한 구체적인 합격 전략을 담았습니다",
    image: "/images/landing/service-3.png",
  },
  {
    title: "면접장에서 실제로 나올 질문만 준비합니다",
    description:
      "학생 생기부 기반으로 도출된 질문으로 실전에서 당황하지 않도록 대비합니다",
    image: "/images/landing/service-4.png",
  },
  {
    title: "지금 뭘 해야 할지, 더 이상 고민할 필요 없습니다",
    description:
      "남은 기간 동안 가장 효과적인 활동만 우선순위에 맞게 설계해드립니다",
    image: "/images/landing/service-5.png",
  },
  {
    title: "마지막은 사람이 결정합니다",
    description:
      "AI가 분석한 결과를 전문가가 직접 점검하고 합격으로 이어질 수 있도록 전략을 다듬습니다",
    image: "/images/landing/service-6.png",
  },
];

const ServiceCard = ({ item }: { item: ServiceCardData }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardDesc}>{item.description}</p>
      </div>
      <div className={styles.cardImage}>
        <Image
          src={item.image}
          alt={item.title}
          width={280}
          height={200}
          className={styles.image}
        />
      </div>
    </div>
  );
};

export const ServiceCardSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <div className={styles.header}>
            <span className={styles.label}>Services</span>
            <h2 className={styles.title}>리포트 하나에 담기는 6가지 분석</h2>
            <p className={styles.subtitle}>
              모든 분석 결과는 전문가 검수를 거쳐 전달됩니다
            </p>
          </div>
        </FadeIn>
        <div className={styles.grid}>
          {SERVICES.map((item, index) => (
            <FadeIn key={item.title} delay={index * 0.08}>
              <ServiceCard item={item} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};
