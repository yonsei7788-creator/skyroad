import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";

import styles from "../legal.module.css";

export const metadata = {
  title: "이용약관",
  description: "SKYROAD 서비스 이용약관입니다.",
  alternates: { canonical: "/legal/terms" },
};

const TermsPage = () => {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <article className={styles.article}>
          <h1>이용약관</h1>
          <p className={styles.updatedAt}>최종 수정일: 2026년 3월 8일</p>

          <nav className={styles.toc}>
            <div className={styles.tocTitle}>목차</div>
            <ol className={styles.tocList}>
              <li>
                <a href="#article-1">목적</a>
              </li>
              <li>
                <a href="#article-2">용어의 정의</a>
              </li>
              <li>
                <a href="#article-3">약관의 효력 및 변경</a>
              </li>
              <li>
                <a href="#article-4">서비스의 제공 및 변경</a>
              </li>
              <li>
                <a href="#article-5">서비스의 이용</a>
              </li>
              <li>
                <a href="#article-6">회원가입</a>
              </li>
              <li>
                <a href="#article-7">결제 및 환불</a>
              </li>
              <li>
                <a href="#article-8">이용자의 의무</a>
              </li>
              <li>
                <a href="#article-9">회사의 의무</a>
              </li>
              <li>
                <a href="#article-10">면책조항</a>
              </li>
              <li>
                <a href="#article-11">분쟁 해결</a>
              </li>
            </ol>
          </nav>

          <h2 id="article-1">제1조 (목적)</h2>
          <p>
            이 약관은 스카이로드(이하 &ldquo;회사&rdquo;)가 제공하는 AI 기반
            생활기록부 분석 및 입시 컨설팅 서비스(이하 &ldquo;서비스&rdquo;)의
            이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타
            필요한 사항을 규정함을 목적으로 합니다.
          </p>

          <h2 id="article-2">제2조 (용어의 정의)</h2>
          <ol>
            <li>
              <strong>&ldquo;서비스&rdquo;</strong>란 회사가 제공하는 AI 기반
              생활기록부 분석, 입시 전략 리포트 작성 등 관련 일체의 서비스를
              말합니다.
            </li>
            <li>
              <strong>&ldquo;이용자&rdquo;</strong>란 이 약관에 따라 회사가
              제공하는 서비스를 받는 회원 및 비회원을 말합니다.
            </li>
            <li>
              <strong>&ldquo;회원&rdquo;</strong>이란 회사에 개인정보를 제공하여
              회원등록을 한 자로서, 회사의 서비스를 이용할 수 있는 자를
              말합니다.
            </li>
            <li>
              <strong>&ldquo;리포트&rdquo;</strong>란 이용자가 제출한
              생활기록부를 기반으로 AI 분석을 거쳐 생성되는 분석 결과물을
              말합니다.
            </li>
            <li>
              <strong>&ldquo;콘텐츠&rdquo;</strong>란 회사가 제공하는 분석 결과,
              입시 전략 자료, 보고서 등을 의미합니다.
            </li>
          </ol>

          <h2 id="article-3">제3조 (약관의 효력 및 변경)</h2>
          <ol>
            <li>
              이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게
              공지함으로써 효력이 발생합니다.
            </li>
            <li>
              회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수
              있으며, 변경 시 적용일자 및 변경사유를 명시하여 현행 약관과 함께
              서비스 초기 화면에 7일 전부터 공지합니다.
            </li>
          </ol>

          <h2 id="article-4">제4조 (서비스의 제공 및 변경)</h2>
          <ol>
            <li>
              회사는 다음과 같은 서비스를 제공합니다.
              <ul>
                <li>맞춤형 생활기록부 정밀 분석</li>
                <li>학생 맞춤형 입시 전략 분석</li>
                <li>대학 지원 전략 가이드</li>
                <li>기타 회사가 정하는 입시 관련 정보 제공 서비스</li>
              </ul>
            </li>
            <li>
              회사는 서비스의 내용을 변경할 수 있으며, 변경 시 사전에
              공지합니다.
            </li>
          </ol>

          <h2 id="article-5">제5조 (서비스의 이용)</h2>
          <ol>
            <li>
              서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한
              연중무휴, 1일 24시간 운영을 원칙으로 합니다.
            </li>
            <li>
              리포트는 생활기록부 제출 후 AI 분석이 완료되는 시점에 전달되며,
              시스템 상황에 따라 소요 시간이 달라질 수 있습니다.
            </li>
          </ol>

          <h2 id="article-6">제6조 (회원가입)</h2>
          <ol>
            <li>
              이용자는 회사가 정한 양식에 따라 회원정보를 기입한 후 이 약관에
              동의한다는 의사표시를 함으로써 회원가입을 신청합니다.
            </li>
            <li>
              회사는 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.
              <ul>
                <li>
                  가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이
                  있는 경우
                </li>
                <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                <li>
                  기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고
                  판단되는 경우
                </li>
              </ul>
            </li>
          </ol>

          <h2 id="article-7">제7조 (결제 및 환불)</h2>
          <ol>
            <li>
              서비스 이용료는 회사가 정한 가격 정책에 따르며, 이용권 구매 시점에
              결제됩니다.
            </li>
            <li>
              결제는 토스페이먼츠를 통해 처리되며, 이용 가능한 결제 수단은
              서비스 내에 안내됩니다.
            </li>
          </ol>

          <div className={styles.highlight}>
            <p>
              <strong>환불 기준</strong>
            </p>
            <p>서비스 특성상 AI 분석이 시작되기 전까지 환불이 가능합니다.</p>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>구분</th>
                <th>상태</th>
                <th>환불 가능 여부</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>결제 완료 후 분석 시작 전</td>
                <td>대기 중</td>
                <td>
                  <span className={styles.badgeGreen}>전액 환불</span>
                </td>
              </tr>
              <tr>
                <td>AI 분석이 시작된 이후</td>
                <td>분석 중</td>
                <td>
                  <span className={styles.badgeRed}>환불 불가</span>
                </td>
              </tr>
              <tr>
                <td>리포트 열람 이후</td>
                <td>전달 완료</td>
                <td>
                  <span className={styles.badgeRed}>환불 불가</span>
                </td>
              </tr>
            </tbody>
          </table>

          <ol start={3}>
            <li>
              환불 요청은 이메일(yonsei7788@naver.com) 또는 고객센터를 통해
              접수할 수 있으며, 승인 시 원결제 수단으로 환불 처리됩니다.
            </li>
          </ol>

          <h2 id="article-8">제8조 (이용자의 의무)</h2>
          <p>이용자는 서비스 이용 시 다음 각 호의 행위를 해서는 안 됩니다.</p>
          <ul>
            <li>
              타인의 개인정보를 도용하거나 생활기록부를 무단으로 제출하는 행위
            </li>
            <li>리포트를 복제, 배포, 상업적으로 이용하는 행위</li>
            <li>회사의 서비스 운영을 방해하는 행위</li>
            <li>기타 관련 법령에 위반되는 행위</li>
          </ul>

          <h2 id="article-9">제9조 (회사의 의무)</h2>
          <ol>
            <li>
              회사는 관련 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를
              하지 않으며, 지속적이고 안정적으로 서비스를 제공하기 위하여 최선을
              다합니다.
            </li>
            <li>
              회사는 이용자의 개인정보를 보호하기 위해 보안 시스템을 갖추어야
              하며, 개인정보처리방침을 공시하고 준수합니다.
            </li>
          </ol>

          <h2 id="article-10">제10조 (면책조항)</h2>
          <div className={styles.highlight}>
            <p>
              리포트에 포함된 대학 합격 가능성, 지원 전략 등의 분석 결과는{" "}
              <strong>참고 자료</strong>이며, 실제 입시 결과를 보장하지
              않습니다.
            </p>
          </div>
          <ol>
            <li>
              서비스는 참고용 정보 제공을 목적으로 하며, 최종 입시 결정은
              이용자의 판단에 따릅니다.
            </li>
            <li>
              회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등
              불가항력적인 사유로 인한 서비스 중단에 대해 책임지지 않습니다.
            </li>
          </ol>

          <h2 id="article-11">제11조 (분쟁 해결)</h2>
          <ol>
            <li>
              회사와 이용자 간 발생한 분쟁에 관한 소송은 대한민국 법률을
              적용하며, 회사의 본사 소재지를 관할하는 법원을 전속 관할법원으로
              합니다.
            </li>
          </ol>

          <hr />

          <h2>회사 정보</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoGrid}>
              <span className={styles.infoLabel}>회사명</span>
              <span className={styles.infoValue}>스카이로드</span>
              <span className={styles.infoLabel}>서비스명</span>
              <span className={styles.infoValue}>SKYROAD</span>
              <span className={styles.infoLabel}>대표자</span>
              <span className={styles.infoValue}>이지현</span>
              <span className={styles.infoLabel}>사업자등록번호</span>
              <span className={styles.infoValue}>832-10-03441</span>
              <span className={styles.infoLabel}>주소</span>
              <span className={styles.infoValue}>
                경기도 고양시 장항동 746 우인아크리움빌 2차 840
              </span>
              <span className={styles.infoLabel}>이메일</span>
              <span className={styles.infoValue}>yonsei7788@naver.com</span>
              <span className={styles.infoLabel}>전화번호</span>
              <span className={styles.infoValue}>010-8191-1693</span>
            </div>
          </div>

          <p>본 약관은 2026년 3월 8일부터 시행됩니다.</p>
        </article>
      </main>
      <Footer />
    </>
  );
};

export default TermsPage;
