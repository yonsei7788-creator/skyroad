import type { Metadata } from "next";

import { JeongsiForm } from "./_components/JeongsiForm";
import { loadCategoryOptions } from "./_lib/category-options";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "정시 분석 | 인생스포",
  description: "수능 성적으로 지원 가능 대학과 가·나·다군 조합을 분석합니다.",
};

const JeongsiPage = async () => {
  const categoryOptions = await loadCategoryOptions();

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h1 className={styles.title}>정시 분석</h1>
        <p className={styles.subtitle}>
          수능 성적과 희망 조건을 입력하면 지원 가능 대학과 가·나·다군 조합을
          분석해 드립니다.
        </p>
      </div>

      <div className={styles.container}>
        <div className={styles.card}>
          <JeongsiForm categoryOptions={categoryOptions} />
        </div>
      </div>
    </section>
  );
};

export default JeongsiPage;
