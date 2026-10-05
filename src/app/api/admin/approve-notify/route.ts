// 가입 승인 안내 메일.
//
// 회원은 가입해 놓고 기다리는 중이다. 승인됐다는 사실을 사이트에 들어와
// 봐야 아는 것은 앞뒤가 맞지 않는다 — 승인된 줄 모르고 며칠을 더
// 기다리거나, 안 됐다고 여겨 떠난다.
//
// 승인 자체는 DB 함수(admin_update_user)가 한다. 이 라우트는 그 뒤에
// 메일만 보낸다. 메일이 실패해도 승인은 이미 끝났으므로 되돌리지 않고,
// 실패했다는 사실만 돌려준다. 운영자가 알림으로 따로 알릴 수 있다.
//
// 거래 이행에 필요한 안내라 마케팅 수신 동의와 무관하게 보낸다
// (정보통신망법 제50조의 광고성 정보가 아니다).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail, approvedTemplate } from "@/lib/email";

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ message: "서버 설정이 올바르지 않습니다." }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_platform_admin) {
    return NextResponse.json({ message: "운영자 권한이 필요합니다." }, { status: 403 });
  }

  const { profileId } = (await request.json().catch(() => ({}))) as { profileId?: string };
  if (!profileId) {
    return NextResponse.json({ message: "profileId가 필요합니다." }, { status: 400 });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("status, companies(name)")
    .eq("id", profileId)
    .single();

  // 승인된 상태일 때만 보낸다. 제한·정지를 풀 때 "가입이 승인되었습니다"가
  // 가면 받는 쪽이 무슨 일인지 알 수 없다.
  if (target?.status !== "approved") {
    return NextResponse.json({ sent: false, reason: "승인 상태가 아닙니다." });
  }

  // 로그인 메일 주소는 auth 쪽에 있다.
  const { data: authUser } = await admin.auth.admin.getUserById(profileId);
  const to = authUser?.user?.email;
  if (!to) {
    return NextResponse.json({ sent: false, reason: "메일 주소를 찾지 못했습니다." });
  }

  const company = (target as unknown as { companies: { name: string } | null }).companies?.name ?? "귀사";
  const origin = new URL(request.url).origin;
  const result = await sendEmail(
    to,
    "[손잡다매칭] 회원가입이 승인되었습니다",
    approvedTemplate(company, `${origin}/login`)
  );

  return NextResponse.json(
    result.sent ? { sent: true, to } : { sent: false, reason: result.reason }
  );
}
