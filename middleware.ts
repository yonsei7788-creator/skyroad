import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/auth"];

const isPublicPath = (pathname: string): boolean => {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(`${p}/`));
};

const isOnboardingPath = (pathname: string): boolean =>
  pathname === "/onboarding" || pathname.startsWith("/onboarding/");

const isInternalPdfRequest = (
  request: NextRequest,
  pathname: string
): boolean => {
  if (!pathname.startsWith("/report/")) return false;
  const pdfSecret = process.env.PDF_SECRET_TOKEN;
  if (!pdfSecret) return false;
  return request.nextUrl.searchParams.get("_token") === pdfSecret;
};

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;

  // 서버사이드 PDF 생성(Puppeteer)이 로그인 세션 없이 리포트 렌더링 페이지에
  // 접근하는 내부 요청. 페이지 자체가 _token을 검증하므로 미들웨어에서는
  // 로그인/권한 체크 없이 그대로 통과시킨다.
  if (isInternalPdfRequest(request, pathname)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isPublicPath(pathname)) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_admin");
    return NextResponse.redirect(url);
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (isOnboardingPath(pathname)) {
    if (profile.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/record";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!profile.onboarding_completed) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};

export const middleware = async (request: NextRequest) => {
  return updateSession(request);
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/records/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
