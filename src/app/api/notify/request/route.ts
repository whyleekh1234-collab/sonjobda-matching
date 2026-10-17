// 새 의뢰 메일 발송.
//
// 앱 안 알림은 47단계의 트리거가 만든다. 그것만으로는 로그인한 사람만
// 안다 — 파트너사가 매일 들어와 보지는 않는다. 매칭 플랫폼에서 "일이
// 들어왔다"를 알리지 않는 것은 전화가 와도 벨이 울리지 않는 것과 같다.
//
// 의뢰사가 누구인지는 메일에 적지 않는다. 회사명은 최종 매칭 전까지
// 공개되지 않는 정보다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail, newRequestTemplate } from "@/lib/email";

// 시연용 계정 주소로는 보내지 않는다.
//
// 이 메일은 사람이 누르지 않아도 의뢰가 올라올 때마다 자동으로 나간다.
// 시연 계정(partner@test.com 같은 것)이 섞여 있으면 그만큼 반송이 쌓이고,
// 반송률이 높아지면 메일 서비스가 도메인 전체의 발송을 조인다. 그러면
// 진짜 파트너사에게 갈 메일까지 같이 막힌다.
//
// example.* 는 RFC 2606이 "절대 쓰이지 않는다"고 못 박아 둔 이름이라
// 어차피 받을 사람이 없다. test.com은 시연 계정들이 쓰는 주소다.
const UNDELIVERABLE = ["test.com", "example.com", "example.net", "example.org"];

function deliverable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return !UNDELIVERABLE.includes(domain);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    .select("id, title, category, budget, deadline, company_id, status")
    .eq("id", requestId)
    .single();

  if (!req) {
    return NextResponse.json({ message: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }
  // 그 의뢰를 올린 회사만 부를 수 있다. 아무나 부를 수 있으면 남의
  // 의뢰를 가지고 메일을 쏟아 낼 수 있다.
  if (!me || me.company_id !== req.company_id) {
    return NextResponse.json({ message: "이 의뢰의 당사자가 아닙니다." }, { status: 403 });
  }
  // 올리자마자 회수한 경우에는 보낼 것이 없다.
  if (req.status !== "pending") {
    return NextResponse.json({ sent: 0, reason: "열려 있는 의뢰가 아닙니다." });
  }

  // 그 분야를 등록한 승인 회원. 의뢰를 올린 회사는 뺀다.
  const { data: targets } = await admin
    .from("profiles")
    .select("id, company_id")
    .eq("status", "approved")
    .contains("partner_categories", [req.category])
    .neq("company_id", req.company_id);

  const origin = new URL(request.url).origin;
  const link = `${origin}/dashboard/partner`;
  const html = newRequestTemplate(
    req.category,
    req.title,
    req.budget ?? "",
    req.deadline ?? "",
    link,
  );

  let sent = 0;
  let skipped = 0;
  for (const t of targets ?? []) {
    const { data } = await admin.auth.admin.getUserById(t.id);
    const to = data.user?.email;
    if (!to) continue;
    if (!deliverable(to)) {
      skipped += 1;
      continue;
    }
    const r = await sendEmail(to, `[손잡다매칭] 새 의뢰 — ${req.category}`, html);
    if (r.sent) sent += 1;
  }

  return NextResponse.json({ sent, skipped, to: (targets ?? []).length });
}
