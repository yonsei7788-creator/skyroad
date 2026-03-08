import Link from "next/link";

import styles from "./Footer.module.css";

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div>
            <p className={styles.brand}>
              SKY<span className={styles.brandAccent}>ROAD</span>
            </p>
            <p className={styles.brandDesc}>
              AI 기반 생활기록부 분석으로
              <br />
              합리적인 가격의 입시 컨설팅을 제공합니다.
            </p>
          </div>

          <div>
            <h4 className={styles.linkTitle}>서비스</h4>
            <ul className={styles.linkList}>
              <li>
                <a href="#process" className={styles.link}>
                  이용 방법
                </a>
              </li>
              <li>
                <a href="#pricing" className={styles.link}>
                  가격 안내
                </a>
              </li>
              <li>
                <a href="#preview" className={styles.link}>
                  분석 예시
                </a>
              </li>
              <li>
                <a href="#faq" className={styles.link}>
                  자주 묻는 질문
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={styles.linkTitle}>고객 지원</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href="/legal/terms" className={styles.link}>
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className={styles.link}>
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.businessInfo}>
          <p>
            스카이로드(SKYROAD) | 대표: 이지현 | 사업자등록번호: 832-10-03441
          </p>
          <p>업태: 교육서비스업 | 종목: 교육관련 자문 및 평가업</p>
          <p>
            소재지: 경기도 고양시 일산동구 무궁화로 7-63, 8층 840호(장항동,
            우인아크리움빌II)
          </p>
          <p>전화번호: 010-8191-1693 | 이메일: yonsei7788@naver.com</p>
        </div>

        <div className={styles.bottom}>
          <p>&copy; 2026 SKYROAD. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
