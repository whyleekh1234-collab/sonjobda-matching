// 운영자 계정 생성.
//
// 운영자는 손잡다메디칼 직원이지 의뢰사·파트너사 회원이 아니다. 그런데
// 지금까지는 운영자를 두려면 그 사람이 먼저 사업자등록번호로 회원가입을
// 하고 승인까지 받아야 했다. 앞뒤가 안 맞는다.
//
// 그래서 관리자 화면에서 계정을 직접 만든다. 가입 절차를 타지 않으므로
// 사업자등록번호 조회도, 승인 대기도 없다.
//
// 만드는 순서가 중요하다.
//   1. auth 계정을 만들되 메타데이터에 이름·사업자번호를 넣지 않는다.
//      그래야 가입 트리거(handle_new_user)가 일찍 빠져나가 프로필을
//      만들지 않는다. 이미 등록된 회사에 붙이려면 초대 토큰이 필요한데
//      운영자에게는 그런 게 없다.
//   2. 프로필을 직접 넣는다. 이때는 아직 평회원이라 SJ-C-00000000이
//      붙는다.
//   3. 운영자 권한을 켠다. 그 순간 트리거가 SJ-ADMIN-0000으로 바꿔 준다.
//
// 2번에서 실패하면 1번에서 만든 계정이 프로필 없이 떠돌게 되므로 지운다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ message: "서버 설정이 올바르지 않습니다." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string; email?: string; password?: string; mfaEmail?: string;
  };
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const mfaEmail = (body.mfaEmail ?? "").trim().toLowerCase();

  if (!name) return NextResponse.json({ message: "이름을 입력해주세요." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ message: "로그인 이메일 형식을 확인해주세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ message: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mfaEmail)) {
    return NextResponse.json({ message: "인증번호 받을 주소 형식을 확인해주세요." }, { status: 400 });
  }
  // 같은 메일함이면 비밀번호 재설정과 인증번호 수신이 한 곳에서 된다.
  // 그건 2단계 인증이 아니다.
  if (mfaEmail === email) {
    return NextResponse.json(
      { message: "인증번호 주소는 로그인 이메일과 달라야 합니다." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const admin = createAdminClient();
  const { data: me, error: meErr } = await admin
    .from("profiles")
    .select("is_platform_admin, company_id")
    .eq("id", user.id)
    .single();

  if (meErr) {
    return NextResponse.json({ message: `계정 정보를 읽지 못했습니다. (${meErr.message})` }, { status: 500 });
  }
  if (!me?.is_platform_admin) {
    return NextResponse.json({ message: "운영자 권한이 필요합니다." }, { status: 403 });
  }

  // 1) auth 계정. 메일 인증 절차는 건너뛴다 — 운영자가 직접 만든 계정이다.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    const dup = /already|registered|exists/i.test(createErr?.message ?? "");
    return NextResponse.json(
      { message: dup ? "이미 가입된 이메일입니다." : "계정을 만들지 못했습니다." },
      { status: 400 }
    );
  }
  const newId = created.user.id;

  // 2) 프로필. 운영자는 회원 목록·통계에서 빠지므로 roles는 형식상의 값이다.
  const { error: profileErr } = await admin.from("profiles").insert({
    id: newId,
    company_id: me.company_id,   // 운영자를 만든 사람과 같은 회사(손잡다메디칼)
    name,
    roles: ["client"],
    active_role: "client",
    status: "approved",
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(newId);   // 껍데기 계정을 남기지 않는다
    return NextResponse.json(
      { message: `프로필을 만들지 못했습니다. (${profileErr.message})` },
      { status: 500 }
    );
  }

  // 3) 권한. 여기서 회원번호가 SJ-ADMIN-0000으로 바뀐다.
  const { error: adminErr } = await admin
    .from("profiles")
    .update({ is_platform_admin: true, mfa_email: mfaEmail })
    .eq("id", newId);
  if (adminErr) {
    await admin.from("profiles").delete().eq("id", newId);
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ message: "운영자 권한을 주지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ created: true });
}
