"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

import styles from "./ParsingOverlay.module.css";

const PHASE_LABELS = [
  "파일을 읽고 있습니다",
  "텍스트를 인식하고 있습니다",
  "항목을 분류하고 있습니다",
  "데이터를 정리하고 있습니다",
];

const TIPS = [
  "성적, 세특, 창체 등을 자동으로 분류합니다",
  "분석에는 보통 2~3분이 소요됩니다",
  "정확도를 높이기 위해 이중 검증을 진행합니다",
  "업로드한 파일은 분석 후 즉시 삭제됩니다",
];

const PHASE_DELAYS_MS = [8_000, 30_000, 60_000];
const TIP_ROTATE_MS = 4_000;
const TIP_FADE_MS = 300;

export const ParsingOverlay = () => {
  const [phase, setPhase] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    const timers = PHASE_DELAYS_MS.map((delay, i) =>
      setTimeout(() => setPhase(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % TIPS.length);
        setTipVisible(true);
      }, TIP_FADE_MS);
    }, TIP_ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <Image
          src="/images/reocrd/pdf-searching.png"
          alt="AI 분석 중"
          width={120}
          height={120}
          className={styles.illustration}
          priority
        />

        <div className={styles.phaseText}>
          <p className={styles.phaseLabel}>
            생기부 데이터를 추출하는 중입니다.
          </p>
          <p key={phase} className={styles.phaseStep}>
            {PHASE_LABELS[phase]}
          </p>
        </div>

        <div className={styles.steps}>
          {PHASE_LABELS.map((label, i) => (
            <div
              key={label}
              className={`${styles.step} ${i <= phase ? styles.stepActive : ""} ${i < phase ? styles.stepDone : ""}`}
            />
          ))}
        </div>

        <p className={`${styles.tip} ${tipVisible ? "" : styles.tipHidden}`}>
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
};
