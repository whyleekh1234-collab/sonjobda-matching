import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// 서버 전용. 이 키는 RLS를 통째로 우회한다.
//
// 반드시 라우트 핸들러 안에서만 부를 것. 클라이언트 컴포넌트에서 import하면
// 키가 브라우저 번들에 들어간다. NEXT_PUBLIC_ 접두사가 없으므로 Next.js가
// 클라이언트에서는 값을 빈 문자열로 치환하지만, 그 전에 이 파일이 번들에
// 들어가는 것 자체가 잘못이다.
//
// 쓰는 곳은 인증번호 보관 한 곳뿐이다. 그 테이블은 정책이 하나도 없어서
// 일반 키로는 읽지도 쓰지도 못한다 — 코드를 브라우저가 볼 수 있으면
// 본인 확인이 성립하지 않기 때문이다.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY가 없습니다. Supabase 대시보드 > Project Settings > API Keys에서 secret key를 발급해 .env.local에 넣어주세요."
    );
  }
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasAdminKey() {
  return !!process.env.SUPABASE_SECRET_KEY;
}
