import Image from "next/image";

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
    id: "image" as const,
    image: "/images/reocrd/image-upload.png",
    title: "이미지 업로드",
    description:
      "파일 없어도 괜찮아요 🙂\n사진으로 업로드해주시고, 정상적으로 업로드되었는지 확인 부탁드려요",
  },
  {
    id: "text" as const,
    image: "/images/reocrd/custom-text.png",
    title: "직접 입력",
    description:
      "간단하게 직접 입력해서 시작할 수 있어요 🙂\n작성 후, 내용이 잘 입력되었는지만 확인해주세요",
  },
] as const;

export const MethodSelectStep = ({ onSelect }: MethodSelectStepProps) => (
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
);
