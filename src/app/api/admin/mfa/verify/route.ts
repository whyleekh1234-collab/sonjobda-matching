// 관리자 2단계 인증 — 인증번호 확인.
//
// 맞으면 통과 증명을 DB에 한 줄 남기고, 그 토큰을 httpOnly 쿠키로 내린다.
// proxy.ts가 /admin 요청마다 그 토큰을 확인한다. 쿠키에 "통과함" 같은 값을
// 담지 않는 이유는, 그런 값은 브라우저에서 고쳐 쓸 수 있기 때문이다.

import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

export const ADMIN_MFA_COOKIE = "sjd_admin_mfa";

const SESSION_TTL_HOURS = 8;   // 하루 업무를 넘기지 않는 길이
const MAX_ATTEMPTS = 5;

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

/** 길이가 같은 해시끼리 상수 시간 비교. 틀린 자리를 시간으로 알려주지 않는다. */
function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ message: "서버 설정이 올바르지 않습니다." }, { status: 500 });
  }

  const { code } = (await request.json().catch(() => ({}))) as { code?: string };
  const digits = (code ?? "").replace(/\D/g, "");
  if (digits.length !== 6) {
    return NextResponse.json({ message: "6자리 숫자를 입력해주세요." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();
  if (profileErr) {
    return NextResponse.json(
      { message: `계정 정보를 읽지 못했습니다. (${profileErr.message})` },
      { status: 500 }
    );
  }
  if (!profile?.is_platform_admin) {
    return NextResponse.json({ message: "관리자 권한이 없는 계정입니다." }, { status: 403 });
  }

  const { data: row } = await admin
    .from("admin_mfa_codes")
    .select("id, code_hash, attempts, expires_at, used_at")
    .eq("profile_id", user.id)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ message: "인증번호를 먼저 요청해주세요." }, { status: 400 });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ message: "인증번호가 만료되었습니다. 다시 받아주세요." }, { status: 400 });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    // 무차별 대입을 막는다. 시도 횟수를 넘기면 그 코드는 버린다.
    await admin.from("admin_mfa_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);
    return NextResponse.json(
      { message: "시도 횟수를 초과했습니다. 인증번호를 다시 받아주세요." },
      { status: 429 }
    );
  }

  if (!sameHash(row.code_hash, hash(digits))) {
    await admin.from("admin_mfa_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    const left = MAX_ATTEMPTS - (row.attempts + 1);
    return NextResponse.json(
      { message: `인증번호가 올바르지 않습니다. (남은 시도 ${Math.max(left, 0)}회)` },
      { status: 400 }
    );
  }

  // 같은 코드를 두 번 쓰지 못하게 바로 닫는다.
  await admin.from("admin_mfa_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);

  // 예전 증명은 정리한다. 관리자 세션이 여기저기 살아 있을 이유가 없다.
  await admin.from("admin_mfa_sessions").delete().eq("profile_id", user.id);

  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600_000);
  const { data: session, error } = await admin
    .from("admin_mfa_sessions")
    .insert({ profile_id: user.id, expires_at: expiresAt.toISOString() })
    .select("token")
    .single();

  if (error || !session) {
    return NextResponse.json({ message: "인증을 완료하지 못했습니다." }, { status: 500 });
  }

  const res = NextResponse.json({ verified: true });
  res.cookies.set(ADMIN_MFA_COOKIE, session.token, {
    httpOnly: true,                                  // 스크립트가 읽지 못한다
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",   // 로컬은 http라 끈다
    path: "/",
    expires: expiresAt,
  });
  return res;
}
