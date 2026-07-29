import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "./_components/LoginForm";
import { NoticeModal } from "./_components/NoticeModal";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "로그인 | SKYROAD",
};

const LoginPage = () => {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <NoticeModal />
    </div>
  );
};

export default LoginPage;
