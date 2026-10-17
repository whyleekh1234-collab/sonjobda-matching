// break-keep(단어 단위 줄바꿈)을 쓰면 "심포지엄/웨비나/CSO/환자유치"처럼
// 띄어쓰기 없이 슬래시로 이어진 글은 한 덩어리로 취급돼 카드 밖으로
// 잘린다. 슬래시 뒤에 폭 0짜리 줄바꿈 허용 문자(U+200B)를 끼워 거기서는
// 꺾이게 한다. 화면엔 아무것도 안 보인다.
export function breakAfterSlash(s: string): string {
  return s.replace(/\//g, "/​");
}

// 받침에 따라 목적격 조사를 고른다. "의뢰를" / "알림을".
//
// 틀린 조사는 읽는 사람이 바로 알아챈다. 그 한 글자 때문에 안내문
// 전체가 기계가 쓴 말로 읽히고, 그러면 안내를 안 믿는다.
export function eul(word: string): string {
  const s = word.trim();
  const code = s.charCodeAt(s.length - 1);
  // 한글 음절이 아니면(영문·숫자·기호) 안전한 쪽으로 둔다.
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "을";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
}
