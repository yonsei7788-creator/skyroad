import { z } from "zod/v4";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    NEXT_PUBLIC_API_URL: z.url().optional(),

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),

    // OAuth - Google
    OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
    OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),

    // OAuth - Kakao
    OAUTH_KAKAO_CLIENT_ID: z.string().optional(),
    OAUTH_KAKAO_CLIENT_SECRET: z.string().optional(),

    // NEIS (교육정보 개방 포털)
    NEIS_API_KEY: z.string().optional(),

    // 커리어넷 (진로정보망)
    CAREER_NET_API_KEY: z.string().optional(),

    // Gemini AI
    GEMINI_API_KEY: z.string().optional(),

    // Supabase Service Role (어드민 전용)
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Resend (이메일 발송)
    RESEND_API_KEY: z.string().optional(),

    // TossPayments (결제)
    TOSS_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_TOSS_CLIENT_KEY: z.string().optional(),

    // PDF 생성 내부 인증 토큰
    PDF_SECRET_TOKEN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!!data.OAUTH_GOOGLE_CLIENT_ID !== !!data.OAUTH_GOOGLE_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Google OAuth client ID and secret must be provided together.",
        path: ["OAUTH_GOOGLE_CLIENT_ID"],
      });
    }
    if (!!data.OAUTH_KAKAO_CLIENT_ID !== !!data.OAUTH_KAKAO_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kakao OAuth client ID and secret must be provided together.",
        path: ["OAUTH_KAKAO_CLIENT_ID"],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ 환경변수 검증 실패:");
  console.error(z.flattenError(parsed.error).fieldErrors);
  throw new Error("환경변수가 올바르지 않습니다.");
}

export const env = parsed.data;
