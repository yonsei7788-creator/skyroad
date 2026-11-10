import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { JeongsiForm } from "@/app/jeongsi/_components/JeongsiForm";
import { loadCategoryOptions } from "@/app/jeongsi/_lib/category-options";
import formStyles from "@/app/jeongsi/page.module.css";

import styles from "../jeongsi-admin.module.css";

/** 어드민 정시 분석 생성 — 기존 입력 폼을 그대로 쓴다 */
const AdminJeongsiNewPage = async () => {
  const categoryOptions = await loadCategoryOptions();

  return (
    <div className={styles.container}>
      <Link href="/admin/jeongsi" className={styles.backLink}>
        <ArrowLeft size={16} />
        정시 분석 목록
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>정시 분석 생성</h1>
          <p className={styles.subtitle}>
            학생의 수능 성적과 희망 조건을 입력하면 지원 가능 대학과 가·나·다군
            조합을 분석합니다.
          </p>
        </div>
      </div>

      <div className={formStyles.card}>
        <JeongsiForm categoryOptions={categoryOptions} />
      </div>
    </div>
  );
};

export default AdminJeongsiNewPage;
