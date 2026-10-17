// 사용자에게 보여줄 오류 문구를 고른다.
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

const HANGUL = /[가-힣]/;

export function userMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw && HANGUL.test(raw)) return raw;
  return fallback;
}
