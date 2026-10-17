// 메일 발송. Resend의 HTTP API를 직접 부른다(SDK를 따로 받지 않는다).
//
// 키가 없으면 보내지 않고 보낸 척도 하지 않는다. 부르는 쪽이 sent=false를
// 보고 개발 중임을 알 수 있어야 한다. 조용히 실패하면 "메일이 안 온다"는
// 문의만 쌓인다.

import { reportServerFailure } from "@/lib/failureLog";

const FROM = process.env.EMAIL_FROM ?? "손잡다매칭 <onboarding@resend.dev>";

export interface SendResult {
  sent: boolean;
  reason?: string;
}

// 실패를 적을 때 쓸 이름. 제목에서 변하는 부분을 떼어 낸다.
//
// "[손잡다매칭] 가입 신청 — (주)이모티브"를 그대로 쓰면 회사마다 새
// 종류가 되어, 같은 고장이 수십 줄로 쌓이고 메일도 수십 통 간다.
// "가입 신청"까지만 남기면 한 줄에 모인다.
function label(subject: string): string {
  return subject
    .replace(/^\[손잡다매칭\]\s*/, "")
    .split(" — ")[0]
    .trim() || "메일";
}

// 실패를 알리는 메일이 또 실패하면 그것까지 적지 않는다. 적어도 나르는
// 길이 이미 끊긴 상태라 줄만 늘고, 운영자가 볼 때 원래 고장이 그 아래
// 묻힌다.
const SELF = "실패";

/**
 * name은 실패를 적을 때 쓸 이름이다. 제목에 회사명처럼 변하는 값이
 * 들어가는 경우에만 넘긴다 — 안 넘기면 제목에서 뽑으므로 회사마다
 * 다른 종류가 되어, 같은 고장이 회사 수만큼 쌓이고 메일도 그만큼 간다.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  name?: string,
): Promise<SendResult> {
  const place = name?.trim() || label(subject);

  // 발송이 안 된 것을 부르는 쪽이 세기만 하고 이유는 버렸다. 키가
  // 만료되거나 도메인이 막히면 수주 알림·1차 선정·가입 승인 메일이
  // 전부 조용히 안 나가고, 받는 사람도 보낸 사람도 모른다.
  const fail = (reason: string): SendResult => {
    if (place !== SELF) {
      void reportServerFailure(`메일 발송 — ${place}`, reason);
    }
    return { sent: false, reason };
  };

  // 키가 없는 것도 적는다. 키를 바꾸고 Vercel에 넣는 것을 잊으면 모든
  // 메일이 조용히 안 나가는데, 그때 아무 기록도 없으면 알 길이 없다.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return fail("RESEND_API_KEY가 설정되지 않았습니다.");
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
  } catch (err) {
    // 네트워크가 끊기면 fetch가 던진다. 전에는 이것이 라우트 밖으로
    // 튀어 500이 됐고, 메일 하나 때문에 가입이나 승인이 실패했다.
    return fail(`보내지 못했습니다: ${err instanceof Error ? err.message : "알 수 없음"}`);
  }

  if (!res.ok) {
    const body = await res.text();
    return fail(`발송 실패 (${res.status}): ${body.slice(0, 200)}`);
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
