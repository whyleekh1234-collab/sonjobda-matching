// 서버 쪽에서 난 실패를 운영자에게 알린다. 서버 전용.
//
// 클라이언트 쪽은 src/lib/errorMessage.ts가 맡는다. 거기서는 브라우저가
// log_failure를 직접 부르고, 처음 보는 종류면 /api/notify/failure를 두드린다.
// 여기는 그 라우트의 알맹이다.
//
// 적기만 하는 일은 failureLog.ts에 있다. 서로를 참조하는 고리가 되지
// 않도록 갈라 두었다 — lib/email이 발송 실패를 적어야 하는데, 그 파일을
// 여기서 부르고 있다.

import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const SITE = "https://www.sonjobdamd.com";
const ALWAYS = "contact@sonjobdamd.com";

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface MailResult {
  sent: boolean;
  to?: number;
  delivered?: number;
  reason?: string;
}

/**
 * 기록 한 줄을 운영자에게 메일로 보낸다.
 *
 * 받는 주소와 내용은 전부 여기서 다시 읽는다 — 부르는 쪽이 넘기는 것은
 * id뿐이다. 그러지 않으면 /api/notify/failure를 두드려 아무 내용이나
 * 운영자에게 보낼 수 있다.
 *
 * claim_failure_email이 "내가 보낸다"를 한 번의 호출로 확정한다. 읽고
 * 나서 따로 찍는 방식이면 두 요청이 같이 들어왔을 때 두 통이 간다.
 */
export async function sendFailureMail(id: string): Promise<MailResult> {
  if (!hasAdminKey()) return { sent: false, reason: "서버 키 없음" };

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("claim_failure_email", { p_id: id });
  if (error) {
    console.error("실패 기록을 읽지 못했습니다:", error.message);
    return { sent: false, reason: "조회 실패" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { sent: false, reason: "보낼 차례가 아님" };

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

  // 이 메일은 실패를 알리는 메일이다. 이것이 또 실패하면 sendEmail이
  // 다시 기록하려 들 수 있으므로, 여기서는 label을 넘기지 않는다
  // (sendEmail이 "실패 —"로 시작하는 제목은 다시 기록하지 않는다).
  const results = await Promise.allSettled(
    to.map((addr) => sendEmail(addr, `[손잡다매칭] 실패 — ${row.place ?? "알 수 없는 곳"}`, html)),
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.sent).length;

  return { sent: sent > 0, to: to.length, delivered: sent };
}
