// 조용히 실패한 일을 운영자에게 메일로 알린다.
//
// 문의 접수가 한 달 동안 막혀 있었다. 그동안 우리가 안 방법은 하나뿐이었다
// — 가입하려던 분이 전화로 알려줬다. 관리자 화면에 배지를 띄우는 것으로는
// 운영자가 들어와 보는 날까지 미뤄진다. 돈이 되는 길이 끊긴 일은 그날
// 알아야 한다.
//
// ── 믿는 것과 믿지 않는 것 ─────────────────────────────────
//
// 클라이언트가 보내는 것은 기록 한 줄의 id뿐이다. 자리 이름도 오류 내용도
// 받는 주소도 전부 서버가 다시 읽는다. 그러지 않으면 이 주소를 두드려
// 아무 내용이나 운영자에게 보낼 수 있다.
//
// 로그인 여부는 묻지 않는다. 가입과 비밀번호 재설정은 로그인 전에 실패하고,
// 그 두 가지가 막히는 것이 가장 무겁다. 대신 보내는 양에 천장을 둔다 —
// 같은 자리는 하루에 한 통이고(claim_failure_email), 기록 자체도 한 시간에
// 200줄에서 멈춘다(log_failure).

import { NextResponse } from "next/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const SITE = "https://www.sonjobdamd.com";
const ALWAYS = "contact@sonjobdamd.com";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ sent: false, reason: "서버 키 없음" });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!UUID.test(id)) {
    return NextResponse.json({ sent: false, reason: "id 형식이 아님" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 이 한 번의 호출이 "내가 보낸다"를 확정한다. 보낼 차례가 아니면 빈 값이
  // 온다. 읽고 나서 따로 찍는 방식이면 두 요청이 같이 들어왔을 때 같은
  // 메일이 두 통 간다.
  const { data, error } = await admin.rpc("claim_failure_email", { p_id: id });
  if (error) {
    console.error("실패 기록을 읽지 못했습니다:", error.message);
    return NextResponse.json({ sent: false, reason: "조회 실패" }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json({ sent: false, reason: "보낼 차례가 아님" });
  }

  const { data: operators } = await admin
    .from("profiles")
    .select("mfa_email")
    .eq("is_platform_admin", true);

  const to = [...new Set([
    ALWAYS,
    ...(operators ?? []).map((o) => o.mfa_email).filter((e): e is string => Boolean(e)),
  ])];

  const rows: [string, string][] = [
    ["막힌 곳", row.place ?? "-"],
    ["겪은 사람", row.who ?? "-"],
    ["화면 주소", row.path ?? "-"],
  ];

  const html = `
  <div style="font-family:system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a">${esc(row.place ?? "어딘가")}에서 실패했습니다</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b">
      사용자는 &ldquo;잠시 후 다시 시도해주세요&rdquo;를 봤습니다. 우리가 예상해 둔 오류가 아닙니다.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:9px 0;color:#64748b;white-space:nowrap;width:90px;vertical-align:top">${k}</td>
          <td style="padding:9px 0;color:#0f172a;word-break:break-all">${esc(v)}</td>
        </tr>`).join("")}
    </table>
    <p style="margin:18px 0 0;padding:13px 15px;background:#0f172a;border-radius:8px;
       font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.6;
       color:#e2e8f0;word-break:break-all">${esc(row.message ?? "")}</p>
    <a href="${SITE}/admin?tab=failures"
       style="display:inline-block;margin-top:22px;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">
      관리자에서 확인하기
    </a>
    <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.7">
      같은 곳에서 난 실패는 하루에 한 통만 보냅니다. 되풀이되는 횟수는 관리자 화면에 쌓입니다.
    </p>
  </div>`;

  const results = await Promise.allSettled(
    to.map((addr) => sendEmail(addr, `[손잡다매칭] 실패 — ${row.place ?? "알 수 없는 곳"}`, html)),
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.sent).length;

  return NextResponse.json({ sent: sent > 0, to: to.length, delivered: sent });
}
