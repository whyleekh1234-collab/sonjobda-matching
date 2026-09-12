import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

// 서버 컴포넌트, 라우트 핸들러, 서버 액션에서 쓴다.
// 요청마다 새로 만든다. 모듈 최상단에서 한 번 만들어 재사용하면 다른 사용자의
// 세션이 섞인다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없어 예외가 난다.
          // 세션 갱신은 미들웨어(2단계)가 담당하므로 여기서는 무시해도 된다.
        }
      },
    },
  });
}
