import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReportEmailParams {
  to: string;
  userName: string;
  planName: string;
  pdfBuffer?: Buffer;
}

const buildEmailHtml = (userName: string, planName: string): string => `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans KR',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.025em;">
                SKYROAD
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                AI 기반 생활기록부 분석 서비스
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">
                ${userName}님, 리포트가 준비되었습니다!
              </h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
                요청하신 <strong style="color:#4f46e5;">${planName}</strong> 플랜의 생기부 분석 리포트가 전문가 검수를 완료하여 발송되었습니다.
              </p>
              <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 12px;color:#334155;font-size:14px;font-weight:600;">
                  리포트 확인 방법
                </p>
                <ol style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
                  <li>SKYROAD 홈페이지에 로그인하세요.</li>
                  <li>마이페이지에서 분석 리포트를 확인하세요.</li>
                  <li>궁금한 점이 있으시면 언제든 문의해 주세요.</li>
                </ol>
              </div>
              <a href="https://skyroadedu.net/profile" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">
                리포트 확인하기
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
                본 메일은 SKYROAD 서비스에서 자동으로 발송되었습니다.<br />
                문의사항이 있으시면 support@skyroadedu.net로 연락해 주세요.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const sendReportEmail = async ({
  to,
  userName,
  planName,
  pdfBuffer,
}: SendReportEmailParams) => {
  const attachments = pdfBuffer
    ? [
        {
          filename: `SKYROAD_리포트_${userName}.pdf`,
          content: pdfBuffer,
        },
      ]
    : undefined;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "SKYROAD <noreply@skyroadedu.net>",
    to,
    subject: `[SKYROAD] ${userName}님의 생기부 분석 리포트가 도착했습니다`,
    html: buildEmailHtml(userName, planName),
    attachments,
  });

  if (error) {
    throw error;
  }
};
