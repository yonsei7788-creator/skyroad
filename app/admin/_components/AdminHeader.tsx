"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  ArrowLeftRight,
  CircleUser,
  LogOut,
  ChevronDown,
} from "lucide-react";

import { createClient } from "@/libs/supabase/client";

import { useSidebar } from "./AdminLayoutClient";
import styles from "./AdminHeader.module.css";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "대시보드",
  "/admin/users": "유저 관리",
  "/admin/records": "생기부 관리",
  "/admin/reports": "리포트 관리",
  "/admin/settings": "설정",
};

const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  const match = Object.keys(PAGE_TITLES).find((key) =>
    pathname.startsWith(`${key}/`)
  );
  return match ? PAGE_TITLES[match] : "어드민";
};

interface AdminHeaderProps {
  adminName: string;
}

export const AdminHeader = ({ adminName }: AdminHeaderProps) => {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageTitle = getPageTitle(pathname);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isDropdownOpen, closeDropdown]);

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0].trim();
        if (name.startsWith("sb-")) {
          document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`;
        }
      });
    }
    window.location.href = "/";
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={toggleSidebar}
          aria-label="사이드바 토글"
        >
          <Menu size={20} />
        </button>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      <div className={styles.right}>
        <Link href="/" className={styles.modeSwitch}>
          <ArrowLeftRight size={14} />
          유저 모드로 돌아가기
        </Link>

        <div className={styles.profileArea} ref={dropdownRef}>
          <button
            type="button"
            className={styles.profileButton}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <CircleUser size={20} />
            <span className={styles.profileName}>{adminName}</span>
            <ChevronDown size={14} />
          </button>

          {isDropdownOpen && (
            <div className={styles.dropdown}>
              <Link
                href="/"
                className={styles.dropdownItem}
                onClick={closeDropdown}
              >
                <ArrowLeftRight size={14} />
                유저 모드
              </Link>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={handleSignOut}
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
