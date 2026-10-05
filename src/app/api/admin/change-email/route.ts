// 회원의 로그인 이메일을 바꾼다.
//
// 가입할 때 주소를 잘못 적으면 그 계정은 사실상 막힌다. 비밀번호 재설정
// 링크도, 승인·제재 안내도 받을 수 없는 곳으로 간다. 본인도 운영자도
// 고칠 수 없으니 새로 가입하는 수밖에 없는데, 사업자등록번호가 이미
// 등록돼 있어 그것도 막힌다.
//
// 그래서 운영자가 고칠 수 있게 한다. 다만 이메일은 로그인 아이디다.
// 남의 주소를 제 것으로 바꾸면 비밀번호 재설정만으로 그 계정을 통째로
// 가져갈 수 있다. 운영자가 여럿이 되면 더 그렇다.
//
// 그래서 몰래 바꿀 수 없게 만든다.
//   · 원래 주소에도 "바뀌었다"는 메일이 간다. 본인이 한 일이 아니면
//     그 메일로 알아챈다.
//   · 회원 알림에도 기록을 남긴다.
// 둘 다 실패해도 변경은 되돌리지 않는다 — 바꾼 뒤에 알리는 일이라,
// 알리기에 실패했다고 되돌리면 계정이 어중간한 상태가 된다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail, emailChangedTemplate } from "@/lib/email";

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
    .select("is_platform_admin, name")
    .eq("id", user.id)
    .single();
  if (!me?.is_platform_admin) {
    return NextResponse.json({ message: "운영자 권한이 필요합니다." }, { status: 403 });
  }

  const { profileId, newEmail } = (await request.json().catch(() => ({}))) as {
    profileId?: string;
    newEmail?: string;
  };
  const next = (newEmail ?? "").trim().toLowerCase();
  if (!profileId || !next) {
    return NextResponse.json({ message: "회원과 새 이메일이 필요합니다." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
    return NextResponse.json({ message: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  // 바꾸려는 사람이 누구인지, 지금 주소가 무엇인지.
  const { data: target } = await admin.auth.admin.getUserById(profileId);
  const prev = target?.user?.email;
  if (!prev) {
    return NextResponse.json({ message: "해당 회원을 찾을 수 없습니다." }, { status: 404 });
  }
  if (prev.toLowerCase() === next) {
    return NextResponse.json({ message: "지금과 같은 주소입니다." }, { status: 400 });
  }

  // 이미 쓰는 주소면 두 계정이 한 주소를 두고 다투게 된다.
  const { data: list } = await admin.auth.admin.listUsers();
  if (list?.users?.some((u) => u.email?.toLowerCase() === next && u.id !== profileId)) {
    return NextResponse.json({ message: "이미 다른 회원이 쓰는 이메일입니다." }, { status: 400 });
  }

  // email_confirm을 켜서 바로 쓸 수 있게 한다. 끄면 회원이 새 주소로
  // 확인 메일을 눌러야 로그인되는데, 주소를 잘못 적어 못 받는 상황을
  // 고치는 중이라 또 막힐 수 있다.
  const { error: updErr } = await admin.auth.admin.updateUserById(profileId, {
    email: next,
    email_confirm: true,
  });
  if (updErr) {
    return NextResponse.json({ message: `바꾸지 못했습니다. (${updErr.message})` }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("name, companies(name)")
    .eq("id", profileId)
    .single();
  const company = (profile as unknown as { companies: { name: string } | null })?.companies?.name ?? "";

  // 양쪽에 알린다. 원래 주소로도 보내야 몰래 바꾸는 것을 알아챈다.
  const origin = new URL(request.url).origin;
  const html = emailChangedTemplate(company, prev, next, `${origin}/login`);
  const [toOld, toNew] = await Promise.all([
    sendEmail(prev, "[손잡다매칭] 계정 이메일이 변경되었습니다", html),
    sendEmail(next, "[손잡다매칭] 계정 이메일이 변경되었습니다", html),
  ]);

  // 화면 안 알림으로도 남긴다. 메일을 못 받아도 로그인하면 보인다.
  await admin.from("notifications").insert({
    profile_id: profileId,
    from_profile_id: user.id,
    message:
      `[계정] 로그인 이메일이 변경되었습니다\n\n${prev} → ${next}\n\n` +
      "본인이 요청하지 않았다면 즉시 고객센터(contact@sonjobdamd.com)로 알려주세요.",
    link: "/mypage",
  });

  return NextResponse.json({
    ok: true,
    prev,
    next,
    notified: { old: toOld.sent, new: toNew.sent },
  });
}
