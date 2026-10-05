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
  <p style="margin:0 0 24px;font-size:18px;font-weight:700">손잡다매칭</p>
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

/**
 * 가입 승인 안내.
 *
 * 회원은 가입해 놓고 기다리는 중이다. 승인은 사이트에 들어와 봐야 아는
 * 일이 아니다 — 승인된 줄 모르고 며칠을 더 기다리거나, 안 됐다고 여겨
 * 떠난다. 거래 이행에 필요한 안내라 마케팅 수신 동의와 무관하게 보낸다.
 */
export function approvedTemplate(companyName: string, link: string) {
  return layout(
    "회원가입이 승인되었습니다",
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       <strong>${companyName}</strong>의 회원가입이 승인되었습니다.
       지금부터 손잡다매칭을 이용하실 수 있습니다.
     </p>
     <p style="margin:0 0 20px">
       <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;
          color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
          로그인하기</a>
     </p>
     <p style="margin:0;font-size:13px;color:#7b8695">
       문의가 있으시면 contact@sonjobdamd.com으로 알려주세요.
     </p>`
  );
}

/**
 * 로그인 이메일이 바뀌었다는 통지.
 *
 * 원래 주소와 새 주소 양쪽에 보낸다. 원래 주소로도 보내야 본인이 하지
 * 않은 변경을 알아챌 수 있다 — 운영자가 대신 바꾸는 경로가 있는 한,
 * 몰래 바꿀 수 없게 만드는 것은 통지뿐이다.
 */
export function emailChangedTemplate(companyName: string, prev: string, next: string, link: string) {
  return layout(
    "계정 이메일이 변경되었습니다",
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       ${companyName ? `<strong>${companyName}</strong>의 ` : ""}손잡다매칭 로그인 이메일이 바뀌었습니다.
     </p>
     <p style="margin:0 0 20px;padding:12px 16px;background:#f4f6fa;border-radius:8px;
        font-size:14px;line-height:1.7;color:#4c5766">
       ${prev}<br>↓<br><strong>${next}</strong>
     </p>
     <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       앞으로는 새 주소로 로그인해주세요.
     </p>
     <p style="margin:0 0 20px">
       <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;
          color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
          로그인하기</a>
     </p>
     <p style="margin:0;font-size:13px;color:#7b8695">
       본인이 요청하지 않았다면 즉시 contact@sonjobdamd.com으로 알려주세요.
     </p>`
  );
}

// ── 매칭 알림 ───────────────────────────────────────────────
//
// 지금까지는 앱 안에 알림만 띄웠다. 그러면 파트너사가 대시보드에 들어와야
// 수주한 사실을 알게 되어, 매칭이 성사되고도 며칠 모르는 일이 생긴다.
// 거래 진행에 필요한 안내라 마케팅 수신 동의와 무관하게 보낸다.
//
// 메일에는 상대 회사명까지만 적고 담당자 연락처는 싣지 않는다. 메일함은
// 전달되고 전달되는 곳이라, 연락처는 로그인한 화면에서만 보이게 둔다.

function button(link: string, label: string) {
  return `<p style="margin:0 0 20px">
       <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;
          color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
          ${label}</a>
     </p>`;
}

/** 최종 선정된 파트너사에게. */
export function matchWonTemplate(title: string, clientCompany: string, link: string) {
  return layout(
    "수주에 성공했습니다",
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       <strong>${clientCompany}</strong>의 &ldquo;${title}&rdquo; 의뢰에 제출하신 견적이
       최종 선정되었습니다. 이제 서로의 담당자 연락처가 공개됩니다.
     </p>
     ${button(link, "연락처 확인하기")}
     <p style="margin:0;font-size:13px;color:#7b8695">
       연락처는 로그인 후 대시보드에서 확인하실 수 있습니다.
     </p>`
  );
}

/** 의뢰사에게. */
export function matchMadeTemplate(title: string, partnerCompany: string, link: string) {
  return layout(
    "매칭이 성사되었습니다",
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       &ldquo;${title}&rdquo; 의뢰를 <strong>${partnerCompany}</strong>와 매칭했습니다.
       이제 서로의 담당자 연락처가 공개됩니다.
     </p>
     ${button(link, "연락처 확인하기")}
     <p style="margin:0;font-size:13px;color:#7b8695">
       이후 계약과 업무 진행은 두 회사가 직접 하시게 됩니다.
     </p>`
  );
}

/** 선정되지 않은 파트너사에게. 기다리게 두지 않는 것이 예의다. */
export function matchNotSelectedTemplate(title: string, link: string) {
  return layout(
    "의뢰가 마감되었습니다",
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       &ldquo;${title}&rdquo; 의뢰의 파트너사가 결정되어 마감되었습니다.
       이번에는 선정되지 않았습니다.
     </p>
     ${button(link, "다른 의뢰 보기")}
     <p style="margin:0;font-size:13px;color:#7b8695">
       새로운 의뢰는 계속 올라옵니다. 다음 기회에 뵙겠습니다.
     </p>`
  );
}

/** 1차 선정된 파트너사에게. 의뢰사가 누구인지는 아직 밝히지 않는다. */
export function shortlistedTemplate(title: string, link: string) {
  return layout(
    "1차 선정되었습니다",
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4c5766">
       &ldquo;${title}&rdquo; 의뢰의 <strong>1차 선정 대상</strong>이 되었습니다.
       조건을 보완해 견적을 다시 제출하실 수 있습니다.
     </p>
     ${button(link, "견적 보완하기")}
     <p style="margin:0;font-size:13px;color:#7b8695">
       아직 최종 선정은 아닙니다. 최종 선정되면 의뢰사의 회사명과 담당자
       연락처가 공개됩니다.
     </p>`
  );
}
