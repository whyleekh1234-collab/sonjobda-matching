// 운영자가 파트너사를 초대한다.
//
// 기업보험처럼 스스로 가입하지 못하게 닫아 둔 분야는, 운영자가 넣어 주지
// 않으면 영영 빈다. 그렇다고 운영자가 아이디와 비밀번호를 만들어 건네면
// 남의 비밀번호를 알게 되고 사업자등록증도 남지 않는다.
//
// 그래서 회사와 분야만 운영자가 정하고, 비밀번호는 받는 사람이 정하고
// 등록증도 그 사람이 올린다. 회사 생성과 토큰 발급은 DB 함수가 하고
// 운영자인지도 거기서 따진다 — 이 라우트는 메일을 보내는 일만 한다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, inviteTemplate } from "@/lib/email";

export async function POST(request: Request) {
  // 인증이 입력값 검증보다 먼저다. 순서가 거꾸로면 로그인하지 않은
  // 사람에게도 어떤 값을 어떤 형식으로 보내야 하는지 알려주게 된다.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    companyName?: string;
    businessNumber?: string;
    email?: string;
    categories?: string[];
  };

  // 운영자 권한 확인은 DB 함수가 한다. 호출자의 세션으로 부르므로
  // auth.uid()가 초대를 보낸 사람으로 남는다.
  const { data, error } = await supabase.rpc("admin_invite_partner", {
    p_company_name: body.companyName ?? "",
    p_business_number: body.businessNumber ?? "",
    p_email: body.email ?? "",
    p_categories: body.categories ?? [],
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const row = (data as { invite_token: string; new_company_id: string }[] | null)?.[0];
  if (!row?.invite_token) {
    return NextResponse.json({ message: "초대를 만들지 못했습니다." }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const link = `${origin}/signup?invite=${row.invite_token}`;
  const result = await sendEmail(
    body.email!,
    `[손잡다매칭] ${body.companyName} 파트너사 등록 안내`,
    inviteTemplate(body.companyName!, "손잡다매칭 운영자", link)
  );

  // 메일이 실패해도 초대는 이미 만들어졌다. 링크를 돌려주면 화면에서
  // 복사해 직접 전달할 수 있다 — 다시 만들면 회사가 중복된다.
  return NextResponse.json({
    sent: result.sent,
    link,
    companyId: row.new_company_id,
    ...(result.sent ? {} : { reason: result.reason }),
  });
}
