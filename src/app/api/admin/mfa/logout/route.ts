// 2단계 인증 증명을 끊는다.
//
// 로그아웃은 지금까지 Supabase 세션만 끊고 있었다. 그러면 인증 증명은
// 8시간 동안 그대로 살아 있어, 같은 브라우저에서 다시 로그인하면
// 인증번호를 묻지 않고 바로 들어온다. 공용 PC에서 자리를 뜨는 경우를
// 생각하면 로그아웃이 절반만 되는 셈이다.
//
// 쿠키만 지우는 것으로는 부족하다. 토큰은 DB에도 한 줄 남아 있어,
// 쿠키 값을 적어 둔 사람이 되돌려 넣으면 다시 통과한다. 그 줄까지 지운다.

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_MFA_COOKIE } from "@/lib/adminMfa";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_MFA_COOKIE)?.value;

  // 끊는 일에는 자격을 따지지 않는다. 토큰을 들고 있다는 것 자체가
  // 그 증명의 주인이라는 뜻이고, 남의 증명을 끊어 줄 길도 없다.
  if (token && hasAdminKey()) {
    await createAdminClient().from("admin_mfa_sessions").delete().eq("token", token);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_MFA_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
