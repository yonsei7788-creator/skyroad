import { BadgeCheck, Check, Star, X } from "lucide-react";

import { CtaButton } from "./CtaButton";
import { FadeIn } from "./FadeIn";
import styles from "./PricingSection.module.css";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  slug: "lite" | "standard" | "premium";
  subtitle: string;
  price: string;
  pages: string;
  popular: boolean;
  features: PlanFeature[];
  cta: string;
  point: string;
}

const PLANS: Plan[] = [
  {
    name: "Lite Report",
    slug: "lite",
    subtitle: "기본 진단형",
    price: "59,000",
    pages: "18~20페이지",
    popular: false,
    point: "내 생기부 현재 위치, 빠르게 파악하기",
    cta: "Lite 선택하기",
    features: [
      { text: "학생 유형 분류 + 역량 점수", included: true },
      { text: "성적 분석 + 권장과목 이수 분석", included: true },
      { text: "출결 · 창체 · 행동특성 분석", included: true },
      { text: "교과 세특 분석 (5과목)", included: true },
      { text: "예상 면접 질문 3개", included: true },
      { text: "AI 학과 추천", included: true },
      { text: "전임 컨설턴트 2차 검수", included: true },
      { text: "희망 학교·학과 판단", included: false },
      { text: "세특 주제 추천", included: false },
      { text: "부족한 부분 + 보완 전략", included: false },
    ],
  },
  {
    name: "Standard Report",
    slug: "standard",
    subtitle: "실전 전략형",
    price: "99,000",
    pages: "40~50페이지",
    popular: true,
    point: "합격 가능성 분석 + 지원 전략까지",
    cta: "Standard 선택하기",
    features: [
      { text: "Lite Report 전체 포함", included: true },
      { text: "교과 세특 분석 확장 (7과목)", included: true },
      { text: "희망 학교·학과 판단 (학종/교과/정시)", included: true },
      { text: "세특 주제 추천 3개", included: true },
      { text: "예상 면접 질문 5개 + 출제 의도", included: true },
      { text: "전임 컨설턴트 2차 검수", included: true },
      { text: "부족한 부분 + 보완 전략", included: false },
      { text: "입시 전략 + 지원 조합 추천", included: false },
      { text: "실행 로드맵", included: false },
      { text: "면접 모범 답변 + 꼬리 질문", included: false },
    ],
  },
  {
    name: "Premium Report",
    slug: "premium",
    subtitle: "프리미엄 설계형",
    price: "199,000",
    pages: "50~60페이지",
    popular: false,
    point: "오프라인 컨설팅 수준, 온라인 가격으로",
    cta: "Premium 선택하기",
    features: [
      { text: "Standard Report 전체 포함", included: true },
      { text: "교과 세특 정밀 분석 (10과목+)", included: true },
      { text: "부족한 부분 + 보완 전략", included: true },
      { text: "입시 전략 + 지원 조합 추천", included: true },
      { text: "실행 로드맵 (학기별 계획)", included: true },
      { text: "세특 주제 추천 5개 + 활동 설계", included: true },
      { text: "면접 모범 답변 + 꼬리 질문", included: true },
      { text: "전임 컨설턴트 2차 검수", included: true },
    ],
  },
];

export const PricingSection = () => {
  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>Pricing</p>
          <h2 className={styles.sectionTitle}>나에게 맞는 플랜을 선택하세요</h2>
          <p className={styles.sectionSubtitle}>
            모든 플랜에 AI 분석 + 전임 컨설턴트 검수가 포함됩니다
          </p>
        </FadeIn>

        <div className={styles.cardsGrid}>
          {PLANS.map((plan, index) => (
            <FadeIn key={plan.name} delay={index * 0.12}>
              <div
                className={`${styles.card} ${plan.popular ? styles.cardPopular : ""}`}
              >
                {plan.popular && (
                  <div className={styles.popularBadge}>
                    <Star size={12} fill="currentColor" />
                    가장 인기
                  </div>
                )}

                <div className={styles.cardHeader}>
                  <p className={styles.cardSubtitle}>{plan.subtitle}</p>
                  <h3 className={styles.cardName}>{plan.name}</h3>
                  <div className={styles.cardPrice}>
                    <span className={styles.priceValue}>{plan.price}</span>
                    <span className={styles.priceUnit}>원</span>
                  </div>
                  <p className={styles.cardPages}>{plan.pages}</p>
                </div>

                <div className={styles.verifiedBadge}>
                  <BadgeCheck size={14} />
                  전임 컨설턴트 검수 포함
                </div>

                <div className={styles.divider} />

                <p className={styles.point}>{plan.point}</p>

                <ul className={styles.features}>
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className={`${styles.feature} ${!feature.included ? styles.featureDisabled : ""}`}
                    >
                      {feature.included ? (
                        <Check
                          size={16}
                          className={styles.featureIcon}
                          style={{ color: "var(--color-success-600)" }}
                        />
                      ) : (
                        <X
                          size={16}
                          className={styles.featureIcon}
                          style={{ color: "var(--color-neutral-300)" }}
                        />
                      )}
                      {feature.text}
                    </li>
                  ))}
                </ul>

                <CtaButton
                  className={`${styles.cardCta} ${plan.popular ? styles.cardCtaPrimary : styles.cardCtaDefault}`}
                  plan={plan.slug}
                >
                  {plan.cta}
                </CtaButton>
              </div>
            </FadeIn>
          ))}
        </div>

        <p className={styles.note}>
          * 대학 지원 조합은 고2 이상 생기부가 포함된 경우에만 제공됩니다
        </p>
      </div>
    </section>
  );
};
