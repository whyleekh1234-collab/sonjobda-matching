// 사용자에게 보여줄 오류 문구를 고르고, 예상 못한 실패는 운영자에게 알린다.
//
// 우리가 던지는 오류는 한글이다. RPC가 raise exception으로 내는 것도,
// 데이터 계층이 new Error로 감싸는 것도 전부 읽는 사람을 보고 쓴 말이라
// 그대로 보여주는 게 맞다.
//
// 문제는 그 사이로 새어 나오는 데이터베이스 오류다. 문의 접수 권한이
// 어긋났을 때 "permission denied for table inquiries"가 화면에 그대로
// 떴고, 받은 사람은 무슨 말인지 몰라 다섯 번을 다시 눌렀다. 공식 사이트가
// 맞느냐는 말까지 들었다.
//
// 한글이 한 글자도 없으면 우리가 쓴 말이 아니라고 본다. 거친 기준이지만,
// 틀렸을 때 잃는 것은 영문으로 된 우리 메시지 하나뿐이고 — 그런 것은
// 지금 없다 — 맞았을 때 막는 것은 내부 사정이 그대로 나가는 일이다.
//
// ── 그 기준이 알림의 기준도 된다 ───────────────────────────
//
// 한글이 든 오류는 우리가 예상해 둔 일이다. "이미 등록된 사업자등록번호",
// "마감된 의뢰" 같은 것들로, 규칙이 제대로 돈 결과이지 고장이 아니다.
// 그런 것까지 알리면 하루에 수십 통이 오고, 그러면 아무도 안 본다.
//
// 거꾸로 아래 fallback까지 내려왔다는 것은 우리가 모르는 일이 났다는
// 뜻이다. 알려야 할 것은 정확히 그것이다. 그래서 자리 이름(place)만
// 넘기면 그 한 가지가 운영자에게 간다.

import { eul } from "@/lib/text";

const HANGUL = /[가-힣]/;

export function userMessage(err: unknown, fallback: string, place?: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw && HANGUL.test(raw)) return raw;
  if (place) reportFailure(place, raw || String(err ?? ""));
  return fallback;
}

/**
 * 조용히 실패한 일을 운영자에게 알린다.
 *
 * 문의 접수가 한 달 동안 막혀 있었는데 우리가 안 길은 전화 한 통뿐이었다.
 * 화면은 "다시 시도해주세요"를 띄우고 끝났고, 기록은 누르던 사람 브라우저
 * 콘솔에만 남았다 — 우리가 볼 수 없는 자리다.
 *
 * 기다리지 않는다(await 하지 않는다). 알리는 일이 느리거나 실패해도 사용자
 * 화면은 이미 할 말을 했다. 알리다 난 오류를 다시 알리려 들지도 않는다.
 */
/**
 * 목록을 못 불러왔을 때 보여줄 말을 주고, 같은 사실을 운영자에게 알린다.
 *
 * 비어 보이는 것과 못 불러온 것은 다르다. 파트너사가 받은 의뢰를 못
 * 불러왔는데 빈 화면만 보면 "들어온 일이 없다"고 읽고 닫는다. 그러면
 * 우리는 아무것도 모른다 — 떠난 사람은 말해주지 않는다.
 */
export function loadFailed(
  err: unknown,
  what: string,
  hint = "비어 있는 것은 아닙니다.",
): string {
  reportFailure(`${what} 불러오기`, err instanceof Error ? err.message : String(err ?? ""));
  return `${what}${eul(what)} 불러오지 못했습니다. ${hint} 새로고침해도 같으면 알려주세요.`;
}

export function reportFailure(place: string, message: string) {
  if (typeof window === "undefined") return;

  void (async () => {
    try {
      // 브라우저 전용 모듈이라 여기서 불러온다. 파일 맨 위에서 import하면
      // 이 파일을 쓰는 서버 쪽 코드까지 같이 끌고 들어간다.
      const { createClient } = await import("@/lib/supabase/client");

      const { data } = await createClient().rpc("log_failure", {
        p_place: place,
        p_message: message.slice(0, 1000),
        p_path: window.location.pathname + window.location.search,
        p_agent: navigator.userAgent.slice(0, 200),
      });

      // id가 돌아오면 처음 보는 종류다. 되풀이되는 것은 null을 주므로
      // 메일은 가지 않는다. 그 판단은 DB가 한다 — 화면 여러 개가 같은
      // 실패를 동시에 겪어도 한 번만 세어진다.
      if (!data) return;

      await fetch("/api/notify/failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data }),
        keepalive: true,
      });
    } catch {
      // 삼킨다. 경보가 못 울린 것까지 사용자가 볼 일은 아니다.
    }
  })();
}
