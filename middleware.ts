import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/about", "/api", "/auth"];

const isPublicPath = (pathname: string): boolean => {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATHS.some((p) => p !== "/" && pathname.startsWith(`${p}/`));
};

const isAdminPath = (pathname: string): boolean =>
  pathname === "/admin" || pathname.startsWith("/admin/");

const isOnboardingPath = (pathname: string): boolean =>
  pathname === "/onboarding" || pathname.startsWith("/onboarding/");

const isHashAnchor = (pathname: string): boolean => pathname.startsWith("/#");

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  });

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

  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (!user || isPublicPath(pathname) || isHashAnchor(pathname)) {
    return supabaseResponse;
  }

  if (isOnboardingPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/record";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed) {
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
