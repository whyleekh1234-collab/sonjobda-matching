// 관리자 2단계 인증 — 인증번호 발급.
//
// 비밀번호를 통과한 운영자에게만 코드를 낸다. 로그인 이메일이 아니라
// profiles.mfa_email로 보낸다 — 같은 메일함으로 보내면 그 하나만 뚫려도
// 비밀번호 재설정과 인증번호 수신이 다 되므로 2단계가 아니게 된다.

import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const CODE_TTL_MIN = 5;
const RESEND_COOLDOWN_SEC = 60;

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

/** 보낸 주소를 통째로 돌려주지 않는다. 어디로 갔는지 알 정도만 보여준다. */
function maskEmail(email: string) {
  const [id, domain] = email.split("@");
  if (!domain) return "***";
  const head = id.slice(0, 2);
  return `${head}${"*".repeat(Math.max(id.length - 2, 1))}@${domain}`;
}

export async function POST() {
  if (!hasAdminKey()) {
    return NextResponse.json(
      { message: "서버에 SUPABASE_SECRET_KEY가 없어 인증번호를 발급할 수 없습니다." },
      { status: 500 }
    );
  }

  // 비밀번호까지 통과한 세션인지 먼저 본다. 여기를 직접 두드려도
  // 로그인하지 않았으면 코드가 나가지 않는다.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_platform_admin, mfa_email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ message: "관리자 권한이 없는 계정입니다." }, { status: 403 });
  }
  if (!profile.mfa_email) {
    return NextResponse.json(
      { message: "이 계정에 인증번호를 받을 주소가 설정되지 않았습니다. 관리자에게 문의해주세요." },
      { status: 400 }
    );
  }

  // 연타로 메일을 쏟아내지 못하게 한다.
  const { data: recent } = await admin
    .from("admin_mfa_codes")
    .select("created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SEC) {
      return NextResponse.json(
        { message: `잠시 후 다시 시도해주세요. (${Math.ceil(RESEND_COOLDOWN_SEC - elapsed)}초)` },
        { status: 429 }
      );
    }
  }

  await admin.rpc("purge_expired_admin_mfa");

  // 아직 살아 있는 코드는 무효로 돌린다. 이전 메일의 숫자가 계속 통하면
  // 유효한 코드가 여러 개 떠다니게 된다.
  await admin
    .from("admin_mfa_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("used_at", null);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();

  const { error: insErr } = await admin.from("admin_mfa_codes").insert({
    profile_id: user.id,
    code_hash: hash(code),
    expires_at: expiresAt,
  });
  if (insErr) {
    return NextResponse.json({ message: "인증번호를 발급하지 못했습니다." }, { status: 500 });
  }

  const result = await sendEmail(
    profile.mfa_email,
    "[손잡다매칭] 관리자 인증번호",
    adminCodeTemplate(code)
  );
  if (!result.sent) {
    return NextResponse.json(
      { message: "인증번호 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true, to: maskEmail(profile.mfa_email), ttlMin: CODE_TTL_MIN });
}

function adminCodeTemplate(code: string) {
  return `
  <div style="font-family:system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">관리자 인증번호</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b">
      아래 6자리를 관리자 로그인 화면에 입력해주세요. ${CODE_TTL_MIN}분 후 만료됩니다.
    </p>
    <div style="font-size:32px;font-weight:700;letter-spacing:10px;background:#f1f5f9;color:#0f172a;padding:18px;text-align:center;border-radius:10px">
      ${code}
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
      본인이 요청하지 않았다면 누군가 관리자 비밀번호를 알고 있다는 뜻입니다.
      즉시 비밀번호를 변경해주세요.
    </p>
  </div>`;
}
