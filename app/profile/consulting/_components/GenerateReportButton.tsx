"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

import styles from "../page.module.css";

interface GenerateReportButtonProps {
  orderId: string;
  reportId?: string;
  label?: string;
}

export const GenerateReportButton = ({
  orderId,
  label = "리포트 생성",
}: GenerateReportButtonProps) => {
  const router = useRouter();

  const handleGenerate = () => {
    router.push(`/report/generating?orderId=${orderId}`);
  };

  return (
    <button
      type="button"
      className={styles.generateButton}
      onClick={handleGenerate}
    >
      <Play size={14} />
      {label}
    </button>
  );
};
