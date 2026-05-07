import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { InputMethod } from "./types";

import styles from "../page.module.css";

interface MethodSelectStepProps {
  onSelect: (method: InputMethod) => void;
}

const METHODS = [
  {
    id: "pdf" as const,
    image: "/images/reocrd/pdf-upload.png",
    title: "PDF 업로드",
    description:
      "파일이 있다면 가장 빠르게 시작할 수 있어요 🙂\n업로드 후, 제대로 반영되었는지만 확인해주세요",
  },
  {
    id: "text" as const,
    image: "/images/reocrd/custom-text.png",
    title: "직접 입력",
    description:
      "직접 입력해서 시작할 수 있어요 🙂\n작성 후, 내용이 잘 입력되었는지만 확인해주세요",
  },
] as const;

export const MethodSelectStep = ({ onSelect }: MethodSelectStepProps) => (
  <>
    <div className={styles.methodGrid}>
      {METHODS.map(({ id, image, title, description }) => (
        <button
          key={id}
          type="button"
          className={styles.methodCard}
          onClick={() => onSelect(id)}
        >
          <div className={styles.methodIcon}>
            <Image src={image} alt={title} width={56} height={56} />
          </div>
          <span className={styles.methodTitle}>{title}</span>
          <span className={styles.methodDesc}>{description}</span>
        </button>
      ))}
    </div>
    <p className={styles.methodGuideHint}>
      생기부 PDF가 없으신가요?
      <Link
        href="/guide/record"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.methodGuideLink}
      >
        발급 방법 보기
        <ArrowRight size={14} />
      </Link>
    </p>
  </>
);
