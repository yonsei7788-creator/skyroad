import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";

import styles from "../legal.module.css";

export const metadata = {
  title: "개인정보처리방침 | SKYROAD",
};

const PrivacyPage = () => {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <article className={styles.article}>
          <h1>개인정보처리방침</h1>
          <p className={styles.updatedAt}>최종 수정일: 2026년 3월 8일</p>

          <div className={styles.highlight}>
            <p>
              스카이로드(이하 &ldquo;회사&rdquo;)는 이용자의 개인정보를
              중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본
              방침을 통해 이용자의 개인정보가 어떻게 수집, 이용, 보호되는지
              안내합니다.
            </p>
          </div>

          <nav className={styles.toc}>
            <div className={styles.tocTitle}>목차</div>
            <ol className={styles.tocList}>
              <li>
                <a href="#privacy-1">수집하는 개인정보 항목</a>
              </li>
              <li>
                <a href="#privacy-2">수집 및 이용 목적</a>
              </li>
              <li>
                <a href="#privacy-3">보유 및 이용 기간</a>
              </li>
              <li>
                <a href="#privacy-4">제3자 제공</a>
              </li>
              <li>
                <a href="#privacy-5">개인정보의 파기</a>
              </li>
              <li>
                <a href="#privacy-6">이용자의 권리</a>
              </li>
              <li>
                <a href="#privacy-7">안전성 확보 조치</a>
              </li>
              <li>
                <a href="#privacy-8">쿠키의 사용</a>
              </li>
              <li>
                <a href="#privacy-9">개인정보 보호책임자</a>
              </li>
              <li>
                <a href="#privacy-10">고지의 의무</a>
              </li>
            </ol>
          </nav>

          <h2 id="privacy-1">1. 수집하는 개인정보 항목</h2>
          <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>

          <h3>필수 수집 항목</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>수집 시점</th>
                <th>수집 항목</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>회원가입</td>
                <td>이메일 주소, 이름</td>
              </tr>
              <tr>
                <td>서비스 이용</td>
                <td>학교명, 학년, 입학연도</td>
              </tr>
              <tr>
                <td>생기부 분석</td>
                <td>생활기록부 문서 (PDF 또는 텍스트)</td>
              </tr>
              <tr>
                <td>결제</td>
                <td>결제 수단 정보, 결제 내역</td>
              </tr>
            </tbody>
          </table>

          <h3>자동 수집 항목</h3>
          <ul>
            <li>IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보</li>
          </ul>

          <h2 id="privacy-2">2. 개인정보의 수집 및 이용 목적</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>목적</th>
                <th>상세 내용</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>서비스 제공</strong>
                </td>
                <td>
                  생활기록부 분석, 리포트 작성 및 전달, 맞춤형 입시 전략 제공
                </td>
              </tr>
              <tr>
                <td>
                  <strong>회원 관리</strong>
                </td>
                <td>본인 확인, 부정 이용 방지, 고지사항 전달</td>
              </tr>
              <tr>
                <td>
                  <strong>서비스 개선</strong>
                </td>
                <td>서비스 이용 통계 분석, 신규 서비스 개발</td>
              </tr>
              <tr>
                <td>
                  <strong>마케팅</strong>
                </td>
                <td>이벤트 안내, 서비스 관련 정보 제공 (동의한 경우에 한함)</td>
              </tr>
            </tbody>
          </table>

          <h2 id="privacy-3">3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체
            없이 파기합니다. 단, 관련 법령에 의한 보존 기간은 아래와 같습니다.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>보존 항목</th>
                <th>기간</th>
                <th>근거 법령</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>계약 또는 청약철회 기록</td>
                <td>5년</td>
                <td>전자상거래법</td>
              </tr>
              <tr>
                <td>대금결제 및 재화 공급 기록</td>
                <td>5년</td>
                <td>전자상거래법</td>
              </tr>
              <tr>
                <td>소비자 불만/분쟁 처리 기록</td>
                <td>3년</td>
                <td>전자상거래법</td>
              </tr>
              <tr>
                <td>웹사이트 방문 기록</td>
                <td>3개월</td>
                <td>통신비밀보호법</td>
              </tr>
            </tbody>
          </table>

          <h2 id="privacy-4">4. 개인정보의 제3자 제공</h2>
          <p>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
            다만, 다음의 경우에는 예외로 합니다.
          </p>
          <ul>
            <li>이용자가 사전에 동의한 경우</li>
            <li>
              법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에
              따라 수사기관의 요구가 있는 경우
            </li>
          </ul>
          <div className={styles.highlight}>
            <p>
              <strong>결제 처리 위탁:</strong> 결제 시 토스페이먼츠(Toss
              Payments)에 결제 처리에 필요한 최소한의 정보가 제공됩니다.
            </p>
          </div>

          <h2 id="privacy-5">5. 개인정보의 파기</h2>
          <p>
            회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가
            불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
          </p>
          <ul>
            <li>
              <strong>전자적 파일:</strong> 복구 및 재생이 불가능한 방법으로
              영구 삭제
            </li>
            <li>
              <strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각
            </li>
          </ul>

          <h2 id="privacy-6">6. 이용자의 권리와 행사 방법</h2>
          <p>이용자는 다음과 같은 권리를 행사할 수 있습니다.</p>
          <ul>
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있는 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ul>
          <p>
            위 권리 행사는 서비스 내 설정 메뉴에서 직접 처리하거나, 이메일을
            통해 요청할 수 있습니다.
          </p>

          <h2 id="privacy-7">7. 개인정보의 안전성 확보 조치</h2>
          <p>
            회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
            있습니다.
          </p>
          <ul>
            <li>비밀번호의 암호화 저장 및 관리</li>
            <li>해킹 등에 대비한 기술적 대책</li>
            <li>개인정보 접근 제한 및 접근 권한 관리</li>
            <li>개인정보 취급 직원의 최소화 및 교육</li>
          </ul>

          <h2 id="privacy-8">8. 쿠키의 사용</h2>
          <p>
            회사는 이용자에게 개인화된 서비스를 제공하기 위해 쿠키를 사용합니다.
            이용자는 웹 브라우저 설정을 통해 쿠키의 허용 또는 거부를 선택할 수
            있습니다.
          </p>

          <h2 id="privacy-9">9. 개인정보 보호책임자</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoGrid}>
              <span className={styles.infoLabel}>담당부서</span>
              <span className={styles.infoValue}>개인정보보호팀</span>
              <span className={styles.infoLabel}>이메일</span>
              <span className={styles.infoValue}>yonsei7788@naver.com</span>
              <span className={styles.infoLabel}>전화번호</span>
              <span className={styles.infoValue}>010-8191-1693</span>
            </div>
          </div>

          <h2 id="privacy-10">10. 고지의 의무</h2>
          <p>
            본 개인정보처리방침은 법령, 정책 또는 보안 기술의 변경에 따라 내용의
            추가, 삭제 및 수정이 있을 시에는 변경사항의 시행 7일 전부터 서비스
            공지사항을 통하여 고지할 것입니다.
          </p>

          <hr />
          <p>본 개인정보처리방침은 2026년 3월 8일부터 시행됩니다.</p>
        </article>
      </main>
      <Footer />
    </>
  );
};

export default PrivacyPage;
