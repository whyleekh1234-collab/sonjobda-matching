import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

// 클라이언트 컴포넌트에서 쓴다. ("use client"가 붙은 파일)
// 세션은 쿠키에 저장되므로 서버 쪽과 자동으로 공유된다.
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
