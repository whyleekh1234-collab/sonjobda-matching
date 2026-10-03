// 관리자 2단계 인증 (이메일 코드).
//
// 관리자 계정은 전 회원의 개인정보와 모든 견적 금액을 본다. 비밀번호 하나가
// 뚫리면 끝이라 운영자 계정에만 두 번째 관문을 둔다. 일반 회원은 그대로다 —
// 가입 문턱을 올리면서까지 지킬 권한이 아니다.
//
// 코드는 로그인 이메일이 아니라 따로 지정한 주소로 간다(profiles.mfa_email).
// 같은 메일함으로 보내면 그 하나만 뚫려도 비밀번호 재설정과 인증번호 수신이
// 다 되므로 2단계가 아니게 된다.
//
// 통과 증명은 DB 행이고 쿠키에는 토큰만 담는다. 자세한 이유는
// supabase/phase19_admin_email_mfa.sql에 적어 두었다.

/** proxy.ts와 verify 라우트가 같이 쓴다. 이름이 어긋나면 로그인이 조용히 깨진다. */
export const ADMIN_MFA_COOKIE = "sjd_admin_mfa";

export interface SendResult {
  to: string;      // 가려진 수신 주소 (어디로 갔는지 알 정도만)
  ttlMin: number;
}

async function post(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? "요청에 실패했습니다.");
  return data as Record<string, unknown>;
}

/** 지정된 주소로 6자리 코드를 보낸다. */
export async function sendAdminCode(): Promise<SendResult> {
  const data = await post("/api/admin/mfa/send");
  return { to: String(data.to ?? ""), ttlMin: Number(data.ttlMin ?? 5) };
}

/** 코드를 확인한다. 통과하면 서버가 통과 증명 쿠키를 내려준다. */
export async function verifyAdminCode(code: string): Promise<void> {
  await post("/api/admin/mfa/verify", { code });
}
