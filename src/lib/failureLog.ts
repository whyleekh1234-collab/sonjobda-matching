// 서버 쪽에서 난 실패를 기록한다. 서버 전용.
//
// 메일을 보내는 쪽(failureAlert.ts)과 일부러 갈라 두었다. 그쪽은 메일을
// 보내려고 lib/email을 부르고, lib/email은 발송이 실패하면 이 파일을
// 부른다. 한 파일에 두면 서로를 참조하는 고리가 된다.
//
// 가르는 데는 그보다 나은 이유가 있다. 서버 쪽 실패 중 압도적으로 많은
// 것이 "메일이 안 나갔다"이고, 그것을 메일로 알리려 들면 같은 이유로
// 또 실패한다. 그런 소식을 나르는 길은 관리자 화면밖에 없다. 그래서
// 여기는 적기만 한다.

import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

/**
 * 기다리지 않아도 된다(void로 띄워 보내도 된다). 알리는 일이 실패해도
 * 원래 하던 일은 그대로 끝나야 한다.
 */
export async function reportServerFailure(place: string, message: string): Promise<void> {
  if (!hasAdminKey()) return;
  try {
    await createAdminClient().rpc("log_failure", {
      p_place: place,
      p_message: message.slice(0, 1000),
      p_path: null,
      p_agent: "서버",
    });
  } catch {
    // 삼킨다. 경보가 못 울린 것까지 원래 하던 일을 막을 이유는 없다.
  }
}
