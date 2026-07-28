"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface CtaButtonProps {
  children: ReactNode;
  className?: string;
}

export const CtaButton = ({ children, className }: CtaButtonProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/record");
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
};
