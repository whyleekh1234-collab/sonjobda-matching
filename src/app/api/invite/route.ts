import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, inviteTemplate } from "@/lib/email";

// 멤버 초대 메일 발송.
//
// 토큰 발급 자체는 DB 함수(create_company_invite)가 하고 회사 담당자인지도
// 거기서 확인한다. 이 라우트는 이미 발급된 초대를 메일로 보내는 일만 한다.
// 그래서 service_role 키가 필요 없다 — 요청자의 세션으로 초대를 조회할 수
// 있는지가 곧 권한 확인이다.

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ message: "초대 토큰이 없습니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  // 같은 회사 초대만 읽힌다(invites_read_own_company 정책). 남의 회사
  // 초대를 메일로 퍼뜨리는 건 여기서 막힌다.
  const { data: invite } = await supabase
    .from("company_invites")
    .select("email, token, company_id, companies(name), profiles!company_invites_invited_by_fkey(name)")
    .eq("token", body.token)
    .single();

  if (!invite) {
    return NextResponse.json({ message: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  const row = invite as unknown as {
    email: string;
    token: string;
    companies: { name: string } | null;
    profiles: { name: string } | null;
  };

  const origin = request.nextUrl.origin;
  const link = `${origin}/signup?invite=${row.token}`;
  const result = await sendEmail(
    row.email,
    `[손잡다매칭] ${row.companies?.name ?? "회사"} 멤버 초대`,
    inviteTemplate(row.companies?.name ?? "회사", row.profiles?.name ?? "담당자", link)
  );

  if (!result.sent) {
    // 메일이 아직 연결되지 않았으면 링크를 돌려준다. 화면에서 복사해
    // 직접 전달할 수 있다.
    return NextResponse.json({ sent: false, link, reason: result.reason });
  }
  return NextResponse.json({ sent: true, email: row.email });
}
