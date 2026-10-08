// 가입 신청이 들어왔다고 운영자에게 알린다.
//
// 지금까지는 아무것도 가지 않았다. 운영자가 관리자 화면에 들어와야 승인
// 대기가 쌓인 것을 알았고, 그 사이 가입한 사람은 "승인 후 로그인할 수
// 있습니다"만 보고 기다렸다. 며칠 묵는 일이 생긴다.
//
// 클라이언트가 보낸 값은 하나도 쓰지 않는다. 받는 주소도 보낼 내용도 전부
// 서버가 다시 읽는다 — 그러지 않으면 이 주소를 두드려 아무 데나 메일을
// 보낼 수 있다. 세션으로 "누가 방금 가입했는지"만 확인하고, 나머지는
// 서비스 키로 직접 조회한다.
//
// 메일 실패가 가입을 되돌리게 두지 않는다. 계정은 이미 만들어졌고 승인
// 대기 목록에도 올라가 있다. 메일은 알리는 수단일 뿐이라, 실패해도
// 조용히 넘기고 가입은 그대로 끝낸다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const SITE = "https://www.sonjobdamd.com";

// 대표 주소는 늘 넣는다. 운영자 계정의 인증번호 수신 주소도 함께 보낸다 —
// 운영자가 늘면 받는 사람도 같이 는다. 한 곳에 적어 두면 사람이 바뀔 때
// 고치는 것을 잊는다.
const ALWAYS = "contact@sonjobdamd.com";

const ROLE_LABEL: Record<string, string> = { client: "의뢰사", partner: "파트너사" };

export async function POST() {
  if (!hasAdminKey()) {
    return NextResponse.json({ sent: false, reason: "서버 키 없음" });
  }

  // 방금 가입한 본인인지 확인한다. 가입 직후 짧게 세션이 열려 있다.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ sent: false, reason: "세션 없음" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("name, phone, roles, partner_categories, status, member_code, company_id")
    .eq("id", user.id)
    .single();

  // 승인 대기인 경우에만 알린다. 이 주소를 반복해서 두드려도 메일이
  // 쏟아지지 않는다.
  if (!profile || profile.status !== "pending") {
    return NextResponse.json({ sent: false, reason: "승인 대기 상태가 아님" });
  }

  const { data: company } = await admin
    .from("companies")
    .select("name, business_number, org_type, license_path")
    .eq("id", profile.company_id)
    .single();

  const { data: operators } = await admin
    .from("profiles")
    .select("mfa_email")
    .eq("is_platform_admin", true);

  const to = [...new Set([
    ALWAYS,
    ...(operators ?? []).map((o) => o.mfa_email).filter((e): e is string => Boolean(e)),
  ])];

  const roles = (profile.roles ?? []).map((r: string) => ROLE_LABEL[r] ?? r).join(" · ");
  const categories = (profile.partner_categories ?? []).join(", ");

  const rows: [string, string][] = [
    ["회사", `${company?.name ?? "-"} (${company?.business_number ?? "-"})`],
    ["유형", company?.org_type === "hospital" ? "병원·기관" : "기업"],
    ["담당자", `${profile.name} · ${profile.member_code}`],
    ["이메일", user.email ?? "-"],
    ["연락처", profile.phone || "-"],
    ["가입 구분", roles || "-"],
    ...(categories ? ([["파트너사 분야", categories]] as [string, string][]) : []),
    ["사업자등록증", company?.license_path ? "제출함" : "미제출"],
  ];

  const html = `
  <div style="font-family:system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a">새 가입 신청이 들어왔습니다</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b">승인 전에는 서비스를 이용할 수 없습니다.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:9px 0;color:#64748b;white-space:nowrap;width:110px;vertical-align:top">${k}</td>
          <td style="padding:9px 0;color:#0f172a">${v}</td>
        </tr>`).join("")}
    </table>
    <a href="${SITE}/admin?tab=users"
       style="display:inline-block;margin-top:22px;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">
      관리자에서 확인하기
    </a>
    ${company?.license_path ? "" : `
    <p style="margin:20px 0 0;font-size:13px;color:#b45309;background:#fffbeb;border-radius:8px;padding:13px;line-height:1.7">
      사업자등록증이 올라오지 않았습니다. 서류 없이는 신청자가 그 회사 사람인지 확인할 수 없으니,
      승인 전에 제출을 요청해주세요.
    </p>`}
  </div>`;

  const results = await Promise.allSettled(
    to.map((addr) => sendEmail(addr, `[손잡다매칭] 가입 신청 — ${company?.name ?? profile.name}`, html)),
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.sent).length;

  return NextResponse.json({ sent: sent > 0, to: to.length, delivered: sent });
}
