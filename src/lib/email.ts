// 메일 발송. Resend의 HTTP API를 직접 부른다(SDK를 따로 받지 않는다).
//
// 키가 없으면 보내지 않고 보낸 척도 하지 않는다. 부르는 쪽이 sent=false를
// 보고 개발 중임을 알 수 있어야 한다. 조용히 실패하면 "메일이 안 온다"는
// 문의만 쌓인다.

const FROM = process.env.EMAIL_FROM ?? "손잡다매칭 <onboarding@resend.dev>";

export interface SendResult {
  sent: boolean;
  reason?: string;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY가 설정되지 않았습니다." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { sent: false, reason: `발송 실패 (${res.status}): ${body.slice(0, 200)}` };
  }
  return { sent: true };
}

// ── 본문 ────────────────────────────────────────────────────

function layout(title: string, body: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
  <p style="margin:0 0 24px;font-size:18px;font-weight:700"><span style="color:#2563eb">손잡다</span>매칭</p>
  <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${title}</h1>
  ${body}
  <hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0">
  <p style="margin:0;font-size:12px;color:#7b8695">
    (주) 손잡다메디칼 · 본 메일은 발신 전용입니다.
  </p>
</div>`;
}

export function findEmailCodeTemplate(code: string) {
  return layout(
    "이메일 찾기 인증번호",
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       아래 인증번호를 입력하면 가입하신 이메일을 확인할 수 있습니다.
     </p>
     <p style="margin:0 0 20px;padding:16px;background:#f1f5f9;border-radius:8px;
               font-size:28px;font-weight:700;letter-spacing:6px;text-align:center">${code}</p>
     <p style="margin:0;font-size:13px;color:#7b8695">
       10분 안에 입력해주세요. 본인이 요청하지 않았다면 이 메일을 무시하시면 됩니다.
     </p>`
  );
}

export function inviteTemplate(companyName: string, invitedBy: string, link: string) {
  return layout(
    `${companyName} 멤버로 초대되었습니다`,
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       ${invitedBy}님이 손잡다매칭에서 <strong>${companyName}</strong>의 멤버로 초대했습니다.
       아래 버튼을 눌러 가입을 진행해주세요.
     </p>
     <p style="margin:0 0 20px">
       <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;
          color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
          가입하기</a>
     </p>
     <p style="margin:0;font-size:13px;color:#7b8695">
       링크는 14일 후 만료됩니다. 가입 후에는 관리자 승인을 거쳐야 이용할 수 있습니다.
     </p>`
  );
}
