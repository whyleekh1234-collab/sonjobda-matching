import { createClient } from "@/lib/supabase/client";

// 메인 화면 전광판에 쓰는 숫자. 46단계의 open_request_counts를 부른다.
//
// requests를 직접 읽지 않는다. RLS가 비회원에게 한 줄도 안 주고, 그게
// 맞다 — 의뢰 제목과 내용은 남의 사업 계획이다. 함수는 분야 이름과
// 건수만 돌려준다.

export interface OpenCount {
  category: string;
  count: number;
}

export async function listOpenCounts(): Promise<OpenCount[]> {
  const { data, error } = await createClient().rpc("open_request_counts");
  if (error) throw new Error(error.message);
  // 함수의 반환 칸 이름은 cat/cnt다. 테이블 칸과 이름이 겹치지 않게
  // 지어 둔 것이라, 바깥에서 쓰는 이름으로 여기서 바꿔 준다.
  return ((data ?? []) as { cat: string; cnt: number }[]).map((r) => ({
    category: r.cat,
    count: Number(r.cnt),
  }));
}
