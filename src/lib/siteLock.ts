// 비공개 운영 잠금.
//
// 특허 출원 전이라 사이트를 내부 인원에게만 보여줘야 한다. SITE_ACCESS_CODE
// 환경변수가 있으면 모든 경로 앞에 접속 코드 화면이 붙고, 변수를 지우면
// 그 즉시 공개로 바뀐다. 코드 자체가 아니라 그 해시를 쿠키에 담아 두므로
// 쿠키를 봐도 코드는 알 수 없다.
//
// proxy(Edge)와 라우트 핸들러 양쪽에서 쓰므로 Web Crypto만 사용한다.

export const SITE_LOCK_COOKIE = "site_access";
export const SITE_LOCK_DAYS = 30;

export function siteLockCode(): string | null {
  const code = process.env.SITE_ACCESS_CODE?.trim();
  return code ? code : null;
}

export async function siteLockToken(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`sonjobda-site-lock:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hasSiteAccess(cookieValue: string | undefined): Promise<boolean> {
  const code = siteLockCode();
  if (!code) return true;
  if (!cookieValue) return false;
  return cookieValue === (await siteLockToken(code));
}
