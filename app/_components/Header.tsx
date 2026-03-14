"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  ArrowRight,
  Ticket,
  CircleUser,
  ChevronDown,
  FileText,
  UserCog,
  LogOut,
  ClipboardList,
  GraduationCap,
  Shield,
} from "lucide-react";

import { useAuthStore } from "@/libs/store/auth-provider";
import { createClient } from "@/libs/supabase/client";

import { AuthModal } from "./AuthModal";
import styles from "./Header.module.css";

const NAV_ITEMS = [{ label: "서비스 소개", href: "/about" }];

const PROFILE_MENU_ITEMS = [
  { label: "컨설팅 내역", href: "/profile/consulting", icon: FileText },
  { label: "목표 대학 수정", href: "/profile/target", icon: GraduationCap },
  { label: "내 정보 수정", href: "/profile/settings", icon: UserCog },
] as const;

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);

  const isLoggedIn = !!user;
  const showRecordLink = isLoggedIn && onboardingCompleted;

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

  const handleOpenAuthModal = () => {
    openAuthModal();
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <div className={styles.left}>
            <Link href="/" className={styles.logo}>
              <Image
                src="/images/skyroad-logo.png"
                alt="SKYROAD"
                width={150}
                height={60}
              />
            </Link>

            <nav className={styles.desktopNav}>
              {showRecordLink && (
                <Link href="/record" className={styles.navLinkAccent}>
                  생기부 분석
                </Link>
              )}
              {isLoggedIn && (
                <Link href="/profile/consulting" className={styles.navLink}>
                  컨설팅 내역
                </Link>
              )}
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.navLink}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.desktopRight}>
            {role === "admin" && (
              <Link href="/admin/dashboard" className={styles.adminButton}>
                <Shield size={14} />
                어드민
              </Link>
            )}
            <Link href="/pricing" className={styles.ticketButton}>
              <Ticket size={16} className={styles.ticketIcon} />
              이용권
            </Link>
            <span className={styles.divider} />
            {isLoggedIn ? (
              <div className={styles.profileWrapper} ref={dropdownRef}>
                <button
                  type="button"
                  className={styles.profileButton}
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  <CircleUser size={22} color="#4f46e5" strokeWidth={2} />
                  프로필
                  <ChevronDown
                    size={18}
                    className={`${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ""}`}
                    strokeWidth={2}
                  />
                </button>
                {isDropdownOpen && (
                  <div className={styles.dropdown}>
                    {PROFILE_MENU_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={styles.dropdownItem}
                        onClick={closeDropdown}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </Link>
                    ))}
                    <div className={styles.dropdownDivider} />
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={handleSignOut}
                    >
                      <LogOut size={16} />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className={styles.authButton}
                onClick={handleOpenAuthModal}
              >
                로그인
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="메뉴 열기"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNav}>
              {showRecordLink && (
                <Link
                  href="/record"
                  className={styles.mobileLinkAccent}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <ClipboardList size={16} />
                  생기부 분석
                </Link>
              )}
              {isLoggedIn && (
                <Link
                  href="/profile/consulting"
                  className={styles.mobileLink}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FileText size={16} />
                  컨설팅 내역
                </Link>
              )}
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.mobileLink}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className={styles.mobileBottom}>
                <Link
                  href="/pricing"
                  className={styles.mobileTicket}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Ticket size={16} className={styles.ticketIcon} />
                  이용권
                </Link>
                {!isLoggedIn && (
                  <button
                    type="button"
                    className={styles.mobileCta}
                    onClick={handleOpenAuthModal}
                  >
                    로그인
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
              {isLoggedIn && (
                <div className={styles.mobileProfileMenu}>
                  {role === "admin" && (
                    <Link
                      href="/admin/dashboard"
                      className={styles.mobileProfileLink}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Shield size={16} />
                      어드민
                    </Link>
                  )}
                  {PROFILE_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={styles.mobileProfileLink}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    className={styles.mobileProfileLink}
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    로그아웃
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>
      <div className={styles.spacer} />

      <AuthModal />
    </>
  );
};
