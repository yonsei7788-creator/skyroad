"use client";

import { BadgeCheck, Check, Star, X } from "lucide-react";

import { CtaButton } from "../../_components/CtaButton";
import { FadeIn } from "../../_components/FadeIn";
import styles from "./PlanCards.module.css";

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
  tag: string;
}

const PLANS: Plan[] = [
  {
    name: "Lite Report",
    slug: "lite",
    subtitle: "기본 진단형",
    price: "59,000",
    pages: "10~12페이지",
    popular: false,
    point: "내 생기부 현재 위치, 빠르게 파악하기",
    tag: "빠른 진단",
    cta: "59,000원으로 시작하기",
    features: [
      { text: "한줄 총평 + 핵심 키워드 3개", included: true },
      { text: "전체 요약 분석 (강점/약점)", included: true },
      { text: "세특 분석 (창체 + 과목별)", included: true },
      { text: "부족한 부분 분석 + 보완 활동", included: true },
      { text: "탐구 주제 추천 3개", included: true },
      { text: "예상 면접 질문 8~10개", included: true },
      { text: "내신 + 모의고사 분석", included: true },
      { text: "대학 지원 조합 (고2 이상)", included: true },
      { text: "등급 변화 가능성 분석", included: false },
      { text: "대학별 합격 가능성 표시", included: false },
    ],
  },
  {
    name: "Standard Report",
    slug: "standard",
    subtitle: "실전 전략형",
    price: "99,000",
    pages: "15~18페이지",
    popular: true,
    point: "합격 가능성 분석 + 지원 전략까지",
    tag: "가장 많이 선택",
    cta: "99,000원으로 시작하기",
    features: [
      { text: "Lite Report 전체 포함", included: true },
      { text: "세특 분석 강화 (상세 평가)", included: true },
      { text: "등급 변화 가능성 분석", included: true },
      { text: "대학 지원 전략 (2P)", included: true },
      { text: "대학별 합격 가능성 표시", included: true },
      { text: "상향/안정/하향 전략", included: true },
      { text: "생기부 스토리 구조 분석", included: false },
      { text: "컨설팅급 보완 전략", included: false },
      { text: "탐구 주제 + 활동 설계", included: false },
      { text: "면접 심화 대비 + 모범 답변", included: false },
    ],
  },
  {
    name: "Premium Report",
    slug: "premium",
    subtitle: "프리미엄 설계형",
    price: "199,000",
    pages: "20~25페이지",
    popular: false,
    point: "오프라인 컨설팅 수준, 온라인 가격으로",
    tag: "컨설팅급 분석",
    cta: "199,000원으로 시작하기",
    features: [
      { text: "Standard Report 전체 포함", included: true },
      { text: "세특 문장 단위 정밀 분석", included: true },
      { text: "생기부 스토리 구조 분석", included: true },
      { text: "컨설팅급 보완 전략", included: true },
      { text: "진로 + 선택과목 연계 전략", included: true },
      { text: "탐구 주제 + 활동 설계", included: true },
      { text: "면접 심화 대비 + 모범 답변", included: true },
      { text: "중요도 % + 평가 영향도", included: true },
      { text: "핵심 문장 하이라이트", included: true },
      { text: "구체적 실행 로드맵", included: true },
    ],
  },
];

export const PlanCards = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
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

                <div className={styles.cardTag}>{plan.tag}</div>

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
                          className={`${styles.featureIcon} ${styles.featureIconSuccess}`}
                        />
                      ) : (
                        <X
                          size={16}
                          className={`${styles.featureIcon} ${styles.featureIconMuted}`}
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
          <br />* 리포트 열람 기간은 구매일로부터 최대 12개월입니다
        </p>
      </div>
    </section>
  );
};
