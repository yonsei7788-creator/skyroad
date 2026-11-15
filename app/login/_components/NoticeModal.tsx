"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, MessageCircle, X } from "lucide-react";

import styles from "./NoticeModal.module.css";

const KAKAO_OPEN_CHAT_URL = "https://open.kakao.com/o/sGtx5Hli";

export const NoticeModal = () => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => setIsOpen(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <motion.div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="서비스 운영 안내"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="닫기"
            >
              <X size={20} />
            </button>

            <div className={styles.iconWrap}>
              <Megaphone size={22} />
            </div>

            <h2 className={styles.title}>서비스 운영 안내</h2>

            <div className={styles.body}>
              <p>안녕하세요, 스카이로드입니다.</p>
              <p>
                교육부의 학생부 온라인 활용 정책 변경에 따라 2026년 7월 29일부터
                학생부를 활용한 온라인 컨설팅 및 관련 서비스 운영을 중단하게
                되었습니다.
              </p>
              <p>
                그동안 스카이로드를 믿고 이용해 주신 모든 분들께 진심으로
                감사드립니다.
              </p>
              <p>
                서비스 중단과 관련하여 궁금하신 사항이나 필요한 문의가 있으신
                경우에는 오픈채팅을 통해 문의해 주시면 순차적으로
                안내드리겠습니다.
              </p>
              <p className={styles.signature}>
                감사합니다.
                <br />
                SKYROAD 드림
              </p>
            </div>

            <div className={styles.actions}>
              <a
                href={KAKAO_OPEN_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.chatButton}
              >
                <MessageCircle size={16} />
                오픈채팅 문의하기
              </a>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleClose}
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
