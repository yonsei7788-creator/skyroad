"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/libs/supabase/client";

import styles from "./LoginForm.module.css";

const translateError = (message: string): string => {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  return message;
};

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNotAdminError = searchParams.get("error") === "not_admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    isNotAdminError ? "관리자 계정만 로그인할 수 있습니다." : ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      setErrorMessage(translateError(error.message));
      return;
    }

    router.push("/");
  };

  return (
    <div className={styles.card}>
      <div className={styles.logoWrap}>
        <p className={styles.logoText}>
          SKY<span className={styles.logoTextAccent}>ROAD</span>
        </p>
        <p className={styles.slogan}>관리자 계정으로만 로그인할 수 있습니다.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>
            이메일
          </label>
          <input
            id="login-email"
            type="email"
            className={styles.input}
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="login-password" className={styles.label}>
            비밀번호
          </label>
          <input
            id="login-password"
            type="password"
            className={styles.input}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}

        <div className={styles.submitArea}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </div>
      </form>
    </div>
  );
};
