import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

// Supabase 세션 쿠키는 액세스 토큰이 만료되면(기본 1시간) 서버가 매 요청마다
// 갱신해줘야 한다. 이걸 안 하면 로그인이 슬며시 끊긴다. 요청 경로 보호도
// 여기서 같이 한다 — 지금까지는 클라이언트 useEffect 리다이렉트뿐이라
// 페이지 소스가 잠깐이라도 내려간 뒤에 쫓겨났다.
//
// 파일명은 proxy.ts다. Next.js 16부터 middleware.ts는 deprecated고 proxy.ts로
// 이름이 바뀌었다. (https://nextjs.org/docs/messages/middleware-to-proxy)

const PROTECTED_PREFIXES = ["/dashboard", "/mypage"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const needsUser = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (needsUser && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_platform_admin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // 정적 자산과 이미지 최적화 경로는 제외한다.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
