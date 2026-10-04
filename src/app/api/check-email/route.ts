// 이메일 중복 확인.
//
// 가입 버튼을 누른 뒤에야 중복을 아는 건 늦다. 폼을 다 채우고 나서
// 되돌아가야 하고, Supabase가 이메일 존재 여부를 숨기는 설정에서는
// 에러조차 나지 않아 "가입됐다"고 안내하고도 실제로는 안 되는 일이 생긴다.
//
// 다만 이런 확인은 그 자체로 "이 이메일이 가입돼 있는가"를 묻는 통로다.
// 그래서 DB 함수는 anon에게 열지 않고 여기서만 부르며, 같은 곳에서
// 짧은 간격으로 두드리는 것을 막는다. 완벽한 방어는 아니지만, 사전을
// 통째로 대입해 회원 목록을 긁어가는 것은 막는다.

import { NextResponse } from "next/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

// 서버 인스턴스 메모리에만 둔다. 재시작하면 지워지고 여러 인스턴스에
// 나뉘면 각자 센다 — 그래도 없는 것보다 낫다. 제대로 하려면 Redis 같은
// 공용 저장소가 필요한데, 지금 규모에서는 과하다.
const hits = new Map<string, { count: number; until: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || rec.until < now) {
    hits.set(ip, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ message: "서버 설정이 올바르지 않습니다." }, { status: 500 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (tooMany(ip)) {
    return NextResponse.json(
      { message: "확인 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const value = (email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    return NextResponse.json({ message: "이메일 형식을 확인해주세요." }, { status: 400 });
  }

  const { data, error } = await createAdminClient().rpc("email_taken", { p_email: value });
  if (error) {
    return NextResponse.json(
      { message: `확인하지 못했습니다. (${error.message})` },
      { status: 500 }
    );
  }

  return NextResponse.json({ available: data !== true });
}
