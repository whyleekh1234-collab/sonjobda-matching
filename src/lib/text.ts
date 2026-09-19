// break-keep(단어 단위 줄바꿈)을 쓰면 "심포지엄/웨비나/CSO/환자유치"처럼
// 띄어쓰기 없이 슬래시로 이어진 글은 한 덩어리로 취급돼 카드 밖으로
// 잘린다. 슬래시 뒤에 폭 0짜리 줄바꿈 허용 문자(U+200B)를 끼워 거기서는
// 꺾이게 한다. 화면엔 아무것도 안 보인다.
export function breakAfterSlash(s: string): string {
  return s.replace(/\//g, "/​");
}
