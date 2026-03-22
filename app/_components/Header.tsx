"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  BookOpen,
} from "lucide-react";

import { useAuthStore } from "@/libs/store/auth-provider";
import { createClient } from "@/libs/supabase/client";

import { AuthModal } from "./AuthModal";
import styles from "./Header.module.css";

const NAV_ITEMS = [{ label: "서비스 소개", href: "/about", icon: BookOpen }];

const PROFILE_MENU_ITEMS = [
  { label: "컨설팅 내역", href: "/profile/consulting", icon: FileText },
  { label: "목표 대학 수정", href: "/profile/target", icon: GraduationCap },
  { label: "추천인 코드", href: "/profile/referral", icon: Ticket },
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

  const isProfileLoaded = useAuthStore((s) => s.isProfileLoaded);
  const isLoggedIn = !!user;
  const showRecordLink = isLoggedIn && onboardingCompleted;
  const showAdmin = isLoggedIn && isProfileLoaded && role === "admin";

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

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleOpenAuthModal = () => {
    openAuthModal();
    closeMobileMenu();
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      // signOut 실패 시 쿠키를 수동으로 비우고 강제 이동
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
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <div className={styles.left}>
            <Link href="/" className={styles.logo}>
              SKY<span className={styles.logoAccent}>ROAD</span>
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
            {showAdmin && (
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
      </header>

      {/* Mobile Overlay — header 밖에 배치 (backdrop-filter containing block 회피) */}
      <div
        className={`${styles.mobileOverlay} ${isMobileMenuOpen ? styles.open : ""}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Menu */}
      <div
        className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ""}`}
      >
        <nav className={styles.mobileNav}>
          {/* Group 1: Navigation */}
          <div className={styles.mobileGroup}>
            <div className={styles.mobileGroupLabel}>메뉴</div>
            {showRecordLink && (
              <Link
                href="/record"
                className={styles.mobileLinkAccent}
                onClick={closeMobileMenu}
              >
                <span className={styles.mobileLinkIcon}>
                  <ClipboardList size={16} />
                </span>
                생기부 분석
              </Link>
            )}
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.mobileLink}
                onClick={closeMobileMenu}
              >
                <span className={styles.mobileLinkIcon}>
                  <item.icon size={16} />
                </span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Group 2: Account (logged in) */}
          {isLoggedIn && (
            <div className={styles.mobileGroup}>
              <div className={styles.mobileGroupLabel}>내 계정</div>
              {PROFILE_MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.mobileLink}
                  onClick={closeMobileMenu}
                >
                  <span className={styles.mobileLinkIcon}>
                    <item.icon size={16} />
                  </span>
                  {item.label}
                </Link>
              ))}
              <div className={styles.mobileGroupDivider} />
              <button
                type="button"
                className={styles.mobileLogout}
                onClick={handleSignOut}
              >
                <span className={styles.mobileLinkIcon}>
                  <LogOut size={16} />
                </span>
                로그아웃
              </button>
            </div>
          )}

          {/* CTA Area */}
          <div className={styles.mobileCta}>
            <Link
              href="/pricing"
              className={styles.mobileTicket}
              onClick={closeMobileMenu}
            >
              <Ticket size={16} className={styles.ticketIcon} />
              이용권 구매
            </Link>
            {!isLoggedIn && (
              <button
                type="button"
                className={styles.mobileAuthButton}
                onClick={handleOpenAuthModal}
              >
                로그인
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Admin Link */}
          {showAdmin && (
            <Link
              href="/admin/dashboard"
              className={styles.mobileAdminLink}
              onClick={closeMobileMenu}
            >
              <Shield size={14} />
              어드민
            </Link>
          )}
        </nav>
      </div>
      <div className={styles.spacer} />

      <AuthModal />
    </>
  );
};
