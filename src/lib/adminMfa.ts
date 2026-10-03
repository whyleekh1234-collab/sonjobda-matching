// 관리자 2단계 인증(TOTP).
//
// 관리자 계정은 전 회원의 개인정보와 모든 견적 금액을 볼 수 있다.
// 비밀번호 하나만 뚫리면 끝이므로, 운영자 계정에만 OTP를 건다.
// 일반 회원은 그대로 둔다 — 가입 문턱을 올리면서 지킬 만한 권한이 아니다.
//
// Supabase Auth의 MFA를 그대로 쓴다. 인증이 끝나면 세션의 보증 수준(AAL)이
// aal1에서 aal2로 올라가고, 그 값이 액세스 토큰에 박힌다. proxy.ts가
// /admin 요청마다 그 수준을 확인하므로, 화면을 건너뛰고 URL을 직접 쳐도
// 통과하지 못한다.
//
// 복구 수단은 두지 않았다. 백업 코드를 만들면 그 코드가 또 하나의
// 비밀번호가 되어 보관 문제가 생긴다. 인증 앱을 잃어버리면 Supabase
// 대시보드(Authentication → Users → 해당 계정)에서 등록된 factor를
// 지우고 다시 등록하면 된다. 운영자가 소수일 때 맞는 선택이다.

import { createClient } from "@/lib/supabase/client";

export type MfaStep = "done" | "enroll" | "verify";

/** 로그인 직후 다음에 뭘 해야 하는지 알려준다. */
export async function nextMfaStep(): Promise<MfaStep> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error(error.message);

  // 이미 이번 세션에서 OTP까지 통과했다.
  if (data.currentLevel === "aal2") return "done";
  // 등록된 수단이 있어 올라갈 수 있다 → 코드만 받으면 된다.
  if (data.nextLevel === "aal2") return "verify";
  // 올라갈 수단 자체가 없다 → 먼저 등록해야 한다.
  return "enroll";
}

export interface EnrollInfo {
  factorId: string;
  qrCode: string; // SVG data URL
  secret: string; // QR을 못 읽을 때 직접 입력하는 값
}

/** 인증 앱에 등록할 QR과 비밀키를 만든다. */
export async function startEnroll(): Promise<EnrollInfo> {
  const supabase = createClient();

  // 등록하다 만 factor가 남아 있으면 다시 등록할 때 이름이 겹쳐 거부된다.
  // 미완료분은 치우고 시작한다.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `손잡다매칭 관리자 ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) throw new Error(error.message);
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/**
 * 6자리 코드를 확인한다. 통과하면 세션이 aal2로 올라간다.
 *
 * factorId를 넘기지 않으면 등록된 수단 중 첫 번째를 쓴다. 로그인할 때마다
 * 쓰는 경로다.
 */
export async function verifyCode(code: string, factorId?: string): Promise<void> {
  const supabase = createClient();

  let id = factorId;
  if (!id) {
    const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) throw new Error(listErr.message);
    id = factors?.totp?.[0]?.id;
    if (!id) throw new Error("등록된 인증 수단이 없습니다. 다시 로그인해 등록해주세요.");
  }

  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: id });
  if (chErr) throw new Error(chErr.message);

  const { error } = await supabase.auth.mfa.verify({
    factorId: id,
    challengeId: ch.id,
    code: code.replace(/\D/g, ""),
  });
  if (error) throw new Error("인증번호가 올바르지 않습니다. 앱에 표시된 6자리를 다시 확인해주세요.");
}
