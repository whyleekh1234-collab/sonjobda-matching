import { createHash, randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail, findEmailCodeTemplate } from "@/lib/email";

// 이메일 찾기.
//
// 인증번호를 서버에서만 만들고 서버에서만 확인한다. 브라우저가 코드를
// 받아보면 메일을 열지 않고도 통과할 수 있어 본인 확인이 성립하지 않는다.
// 그래서 발급(send)과 확인(verify)을 이 라우트가 모두 처리하고, 응답에는
// 코드를 담지 않는다.

const PURPOSE = "find_email";
const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;

const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email}:${code}`).digest("hex");

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

// 이름 + 전화번호(또는 이메일)로 가입 이메일을 찾는다. 로그인 전 상태라
// 일반 키로 부르는 공개 함수를 쓴다.
async function resolveEmail(body: {
  method: "phone" | "email";
  name: string;
  phone?: string;
  email?: string;
}): Promise<string | null> {
  const anon = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false },
  });

  const { data } =
    body.method === "phone"
      ? await anon.rpc("rpc_find_email_by_phone", { p_name: body.name, p_phone: body.phone ?? "" })
      : await anon.rpc("rpc_find_email_by_email", { p_name: body.name, p_email: body.email ?? "" });

  return (data as string | null) ?? null;
}

export async function POST(request: NextRequest) {
  let body: {
    action: "send" | "verify";
    method: "phone" | "email";
    name: string;
    phone?: string;
    email?: string;
    code?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!hasAdminKey()) {
    return NextResponse.json(
      { message: "서버에 SUPABASE_SECRET_KEY가 설정되지 않아 인증번호를 발급할 수 없습니다." },
      { status: 503 }
    );
  }

  const target = await resolveEmail(body);
  if (!target) {
    return NextResponse.json(
      {
        message:
          body.method === "phone"
            ? "일치하는 회원 정보가 없습니다. 담당자 이름과 휴대폰 번호를 확인해주세요."
            : "일치하는 회원 정보가 없습니다. 담당자 이름과 이메일을 확인해주세요.",
      },
      { status: 404 }
    );
  }

  const admin = createAdminClient();

  if (body.action === "send") {
    await admin.rpc("purge_expired_email_codes");

    // 한 주소로 무한정 발송되지 않게 막는다.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("email_verifications")
      .select("id", { count: "exact", head: true })
      .eq("email", target)
      .eq("purpose", PURPOSE)
      .gte("created_at", hourAgo);

    if ((count ?? 0) >= MAX_CODES_PER_HOUR) {
      return NextResponse.json(
        { message: "인증번호를 너무 자주 요청했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { error } = await admin.from("email_verifications").insert({
      email: target,
      purpose: PURPOSE,
      code_hash: hashCode(target, code),
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
    });
    if (error) {
      return NextResponse.json({ message: "인증번호 발급에 실패했습니다." }, { status: 500 });
    }

    const result = await sendEmail(target, "[손잡다매칭] 이메일 찾기 인증번호", findEmailCodeTemplate(code));

    if (!result.sent) {
      // 메일 발송이 아직 연결되지 않은 개발 환경에서는 화면에서 이어서
      // 확인할 수 있게 코드를 돌려준다. 운영에서는 절대 내보내지 않는다.
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ sent: false, devCode: code, reason: result.reason });
      }
      return NextResponse.json({ message: "메일 발송에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ sent: true, maskedEmail: maskEmail(target) });
  }

  if (body.action === "verify") {
    const { data: rows } = await admin
      .from("email_verifications")
      .select("id, code_hash, attempts, expires_at, used_at")
      .eq("email", target)
      .eq("purpose", PURPOSE)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row || new Date(row.expires_at) < new Date()) {
      return NextResponse.json(
        { message: "인증번호가 만료되었습니다. 다시 요청해주세요." },
        { status: 400 }
      );
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: "입력 횟수를 초과했습니다. 다시 요청해주세요." },
        { status: 429 }
      );
    }

    if (row.code_hash !== hashCode(target, (body.code ?? "").trim())) {
      await admin
        .from("email_verifications")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return NextResponse.json({ message: "인증번호가 일치하지 않습니다." }, { status: 400 });
    }

    await admin
      .from("email_verifications")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    return NextResponse.json({ verified: true, maskedEmail: maskEmail(target) });
  }

  return NextResponse.json({ message: "알 수 없는 요청입니다." }, { status: 400 });
}
