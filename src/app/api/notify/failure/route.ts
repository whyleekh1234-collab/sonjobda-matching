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
import { sendFailureMail } from "@/lib/failureAlert";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!UUID.test(id)) {
    return NextResponse.json({ sent: false, reason: "id 형식이 아님" }, { status: 400 });
  }

  // 받는 주소와 보낼 내용은 sendFailureMail이 서버에서 다시 읽는다.
  const result = await sendFailureMail(id);
  return NextResponse.json(result, { status: result.reason === "조회 실패" ? 500 : 200 });
}
