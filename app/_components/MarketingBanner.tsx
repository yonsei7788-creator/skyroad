"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkle, X } from "lucide-react";

import { useAuthStore } from "@/libs/store/auth-provider";

import {
  BANNER_COOKIE_MAX_AGE,
  BANNER_COOKIE_NAME,
} from "./marketing-banner-constants";
import styles from "./MarketingBanner.module.css";

interface MarketingBannerProps {
  initiallyDismissed: boolean;
}

export const MarketingBanner = ({
  initiallyDismissed,
}: MarketingBannerProps) => {
  const router = useRouter();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!initiallyDismissed);
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);

  // 헤더가 배너 높이만큼 아래로 밀려나도록 CSS 변수로 실제 높이를 전달
  useEffect(() => {
    const root = document.documentElement;

    if (!isVisible || !bannerRef.current) {
      root.style.setProperty("--marketing-banner-height", "0px");
      return;
    }

    const el = bannerRef.current;
    const updateHeight = () => {
      root.style.setProperty(
        "--marketing-banner-height",
        `${el.offsetHeight}px`
      );
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);

    return () => {
      observer.disconnect();
      root.style.setProperty("--marketing-banner-height", "0px");
    };
  }, [isVisible]);

  const handleClick = () => {
    if (user) {
      router.push("/pricing");
      return;
    }
    openAuthModal("/pricing");
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    document.cookie = `${BANNER_COOKIE_NAME}=1; path=/; max-age=${BANNER_COOKIE_MAX_AGE}`;
    setIsVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* 데스크톱: 헤더 위 상단 배너 */}
      <div
        ref={bannerRef}
        className={styles.banner}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.inner}>
          <div className={styles.centerGroup}>
            <div className={styles.sirenBubbleGroup}>
              <Image
                src="/images/siren.png"
                alt=""
                width={80}
                height={80}
                className={styles.sirenArea}
                aria-hidden="true"
              />

              <div className={styles.speechBubble}>
                <span className={styles.speechLine}>지금 안 보면</span>
                <span className={styles.speechLine}>후회합니다!</span>
              </div>
            </div>

            <div className={styles.mainTextWrap}>
              <div className={styles.mainTextInner}>
                <Sparkle
                  className={styles.sparkleStart}
                  aria-hidden="true"
                  fill="currentColor"
                />
                <p className={styles.mainText}>
                  생기부가 거의 완성됐다면, 지금 바로 내 수시카드를 확인하세요!
                </p>
                <span className={styles.underline} aria-hidden="true" />
                <Sparkle
                  className={styles.sparkleEnd}
                  aria-hidden="true"
                  fill="currentColor"
                />
              </div>
            </div>
          </div>

          <div className={styles.rightArea}>
            <p className={styles.subText}>
              생기부는 끝났고,
              <br />
              이제 <span className={styles.highlight}>지원 전략</span>이 합격을
              결정합니다.
            </p>
            <span className={styles.ctaButton}>
              수시카드 확인하기
              <ArrowRight size={14} />
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="배너 닫기"
        >
          <X size={18} />
        </button>
      </div>

      {/* 모바일: 중앙 팝업 */}
      <div className={styles.popupOverlay}>
        <div
          className={styles.popupCard}
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <button
            type="button"
            className={styles.popupCloseButton}
            onClick={handleClose}
            aria-label="배너 닫기"
          >
            <X size={18} />
          </button>

          <Image
            src="/images/siren.png"
            alt=""
            width={104}
            height={104}
            className={styles.popupSirenArea}
            aria-hidden="true"
          />

          <div className={styles.popupSpeechBubble}>
            <span className={styles.speechLine}>지금 안 보면</span>
            <span className={styles.speechLine}>후회합니다!</span>
          </div>

          <p className={styles.popupMainText}>
            생기부가 거의 완성됐다면,
            <br />
            지금 바로 내 수시카드를 확인하세요!
          </p>
          <span className={styles.popupUnderline} aria-hidden="true" />
        </div>
      </div>
    </>
  );
};
