import { NextResponse, type NextRequest } from "next/server";
import { SITE_LOCK_COOKIE, SITE_LOCK_DAYS, siteLockCode, siteLockToken } from "@/lib/siteLock";

// 접속 코드 제출. 맞으면 해시를 쿠키에 심고 원래 가려던 곳으로 보낸다.
// 일반 <form> POST라 자바스크립트 없이도 동작한다.

export async function POST(request: NextRequest) {
  const code = siteLockCode();
  // 잠금이 풀렸는데 옛 화면에서 제출이 들어오면 그냥 메인으로 보낸다.
  // 코드를 맞히라고 되돌려 보내면 맞힐 코드가 없어 영영 못 들어온다.
  if (!code) return NextResponse.redirect(new URL("/", request.url), 303);

  const form = await request.formData();
  const input = String(form.get("code") ?? "").trim();
  const next = sanitizeNext(String(form.get("next") ?? "/"));

  if (input !== code) {
    const back = new URL("/gate", request.url);
    back.searchParams.set("error", "1");
    if (next !== "/") back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SITE_LOCK_COOKIE, await siteLockToken(code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_LOCK_DAYS * 24 * 60 * 60,
  });
  return response;
}

// 열린 리다이렉트 방지 — 같은 사이트 안의 경로만 허용한다.
function sanitizeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
