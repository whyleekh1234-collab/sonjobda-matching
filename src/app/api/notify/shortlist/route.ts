// 1차 선정 메일 발송.
//
// 앱 안 알림만으로는 파트너사가 선정된 줄 모르고 지나간다. 1차 선정은
// "조건을 보완해 다시 내보라"는 신호라, 모르고 지나가면 단계 자체가
// 무의미해진다.
//
// 의뢰사가 누구인지는 메일에 적지 않는다. 회사명은 최종 매칭 전까지
// 공개되지 않는 정보다 — 메일이 그 구멍이 되면 안 된다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail, shortlistedTemplate } from "@/lib/email";

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ sent: 0, reason: "SUPABASE_SECRET_KEY 없음" });
  }

  const { quoteId } = (await request.json().catch(() => ({}))) as { quoteId?: string };
  if (!quoteId) {
    return NextResponse.json({ message: "quoteId가 필요합니다." }, { status: 400 });
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

  const { data: quote } = await admin
    .from("quotes")
    .select("id, company_id, shortlisted_at, requests(id, title, company_id)")
    .eq("id", quoteId)
    .single();

  const req = quote?.requests as unknown as { title: string; company_id: string } | null;
  if (!quote || !req) {
    return NextResponse.json({ message: "견적을 찾을 수 없습니다." }, { status: 404 });
  }
  // 그 의뢰를 올린 회사만 부를 수 있다.
  if (!me || me.company_id !== req.company_id) {
    return NextResponse.json({ message: "이 의뢰의 당사자가 아닙니다." }, { status: 403 });
  }
  // 선정을 해제한 뒤에 호출되면 보낼 것이 없다.
  if (!quote.shortlisted_at) {
    return NextResponse.json({ sent: 0, reason: "선정 상태가 아닙니다." });
  }

  const { data: members } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", quote.company_id)
    .eq("status", "approved");

  const origin = new URL(request.url).origin;
  let sent = 0;
  for (const m of members ?? []) {
    const { data } = await admin.auth.admin.getUserById(m.id);
    const to = data.user?.email;
    if (!to) continue;
    const r = await sendEmail(
      to,
      "[손잡다매칭] 1차 선정되었습니다",
      shortlistedTemplate(req.title, `${origin}/dashboard/partner`)
    );
    if (r.sent) sent++;
  }

  return NextResponse.json({ sent });
}
