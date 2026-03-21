"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import { createClient } from "@/libs/supabase/client";

import styles from "./OnboardingHeader.module.css";

export const OnboardingHeader = () => {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo}>
            SKY<span className={styles.logoAccent}>ROAD</span>
          </Link>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>
      <div className={styles.spacer} />
    </>
  );
};
