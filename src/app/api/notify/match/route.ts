// 매칭 결과 메일 발송.
//
// 지금까지는 앱 안에 알림만 띄웠다. 그러면 파트너사가 대시보드에 들어와야
// 수주한 사실을 알게 되어, 매칭이 성사되고도 며칠 모르는 일이 생긴다.
//
// 메일 발송은 accept_quote 트랜잭션 안에 넣지 않는다. 외부 API 호출이
// 트랜잭션에 묶이면 메일 서버가 느릴 때 매칭 자체가 늦어지고, 발송이
// 실패하면 이미 성사된 매칭까지 되돌아간다. 매칭은 DB에서 끝내고 메일은
// 그 뒤에 따로 보낸다. 메일이 실패해도 매칭은 남고, 앱 안 알림도 남는다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import {
  sendEmail,
  matchWonTemplate,
  matchMadeTemplate,
  matchNotSelectedTemplate,
} from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 그 회사에서 메일을 받을 사람들. 승인된 회원에게만 보낸다. */
async function companyEmails(admin: SupabaseClient, companyId: string): Promise<string[]> {
  const { data: members } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "approved");

  const emails: string[] = [];
  for (const m of members ?? []) {
    // 이메일은 profiles가 아니라 auth에 있다.
    const { data } = await admin.auth.admin.getUserById(m.id);
    if (data.user?.email) emails.push(data.user.email);
  }
  return [...new Set(emails)];
}

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ sent: 0, reason: "SUPABASE_SECRET_KEY 없음" });
  }

  const { requestId } = (await request.json().catch(() => ({}))) as { requestId?: string };
  if (!requestId) {
    return NextResponse.json({ message: "requestId가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: me } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const { data: req } = await admin
    .from("requests")
    .select("id, title, status, company_id, companies!requests_company_id_fkey(name)")
    .eq("id", requestId)
    .single();

  if (!req) {
    return NextResponse.json({ message: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }
  // 이 의뢰를 매칭한 당사자(의뢰사)만 부를 수 있다. 남의 매칭 결과를
  // 메일로 뿌리는 경로가 되면 안 된다.
  if (!me || me.company_id !== req.company_id) {
    return NextResponse.json({ message: "이 의뢰의 당사자가 아닙니다." }, { status: 403 });
  }
  // 아직 성사되지 않았다면 보낼 것이 없다.
  if (req.status !== "matched") {
    return NextResponse.json({ sent: 0, reason: "매칭 상태가 아닙니다." });
  }

  const { data: quotes } = await admin
    .from("quotes")
    .select("company_id, status, companies!quotes_company_id_fkey(name)")
    .eq("request_id", requestId);

  const accepted = (quotes ?? []).find((q) => q.status === "accepted");
  if (!accepted) {
    return NextResponse.json({ sent: 0, reason: "수락된 견적이 없습니다." });
  }

  const origin = new URL(request.url).origin;
  const title = req.title as string;
  const clientName = (req.companies as unknown as { name: string } | null)?.name ?? "의뢰사";
  const partnerName =
    (accepted.companies as unknown as { name: string } | null)?.name ?? "파트너사";

  let sent = 0;
  const send = async (to: string, subject: string, html: string) => {
    const r = await sendEmail(to, subject, html);
    if (r.sent) sent++;
  };

  // 선정된 파트너사
  for (const to of await companyEmails(admin, accepted.company_id)) {
    await send(
      to,
      "[손잡다매칭] 수주에 성공했습니다",
      matchWonTemplate(title, clientName, `${origin}/dashboard/partner`)
    );
  }

  // 의뢰사
  for (const to of await companyEmails(admin, req.company_id)) {
    await send(
      to,
      "[손잡다매칭] 매칭이 성사되었습니다",
      matchMadeTemplate(title, partnerName, `${origin}/dashboard/client`)
    );
  }

  // 선정되지 않은 파트너사. 결과를 모른 채 기다리게 두지 않는다.
  const losers = new Set(
    (quotes ?? [])
      .filter((q) => q.status === "not_selected" && q.company_id !== accepted.company_id)
      .map((q) => q.company_id)
  );
  for (const companyId of losers) {
    for (const to of await companyEmails(admin, companyId)) {
      await send(
        to,
        "[손잡다매칭] 의뢰가 마감되었습니다",
        matchNotSelectedTemplate(title, `${origin}/dashboard/partner`)
      );
    }
  }

  return NextResponse.json({ sent });
}
