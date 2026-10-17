// 회원 탈퇴.
//
// 전에는 화면에서 delete_my_account를 바로 불렀다. 그 함수가 서류 파일까지
// 지웠는데, Supabase가 storage 테이블의 직접 삭제를 막으면서 마지막 멤버의
// 탈퇴가 통째로 실패하게 됐다(42501). 행을 지워도 실제 파일은 남기 때문에
// Storage API를 쓰라는 것이다.
//
// 그래서 둘로 나눈다. 계정과 DB 정리는 그대로 함수가 하고, 파일 파기는
// 여기서 Storage API로 한다. 함수는 "마지막 멤버였으면 그 회사 id"를
// 돌려주므로, 지울 것이 있는지는 그 값 하나로 안다.
//
// 순서는 함수가 먼저다. 파일을 먼저 지우면 뒤이어 함수가 실패했을 때
// 사용자는 계정을 그대로 둔 채 서류만 잃는다. 반대로 하면 최악의 경우
// 파일이 남는데, 그건 기록에 남겨 운영자가 치울 수 있다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { reportServerFailure } from "@/lib/failureLog";

// 회사에 달리는 서류 세 가지. 등록증만이 아니라 로고와 회사소개서도
// 같이 파기한다 — 개인정보처리방침이 묶어서 적어 둔 것들이다.
const BUCKETS = ["business-licenses", "company-logos", "company-profiles"];

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요했습니다." }, { status: 401 });
  }

  // 사용자 자신의 권한으로 부른다. 함수 안에서 auth.uid()를 쓰므로
  // 서비스 키로 부르면 누가 나가는지 알 수 없다.
  const { data: companyId, error } = await supabase.rpc("delete_my_account");
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  // 마지막 멤버가 아니었으면 지울 서류가 없다.
  if (typeof companyId !== "string") {
    return NextResponse.json({ ok: true, purged: 0 });
  }

  // 여기부터는 계정이 이미 지워졌다. 무엇이 잘못되든 사용자에게 "탈퇴가
  // 안 됐다"고 할 수는 없다 — 이미 됐다. 못 지운 것은 기록으로 남긴다.
  if (!hasAdminKey()) {
    await reportServerFailure(
      "탈퇴 서류 파기",
      `서버 키가 없어 ${companyId}의 서류를 파기하지 못했습니다.`,
    );
    return NextResponse.json({ ok: true, purged: 0 });
  }

  const admin = createAdminClient();
  let purged = 0;
  const stuck: string[] = [];

  for (const bucket of BUCKETS) {
    try {
      const { data: files, error: listErr } = await admin.storage.from(bucket).list(companyId);
      if (listErr) {
        stuck.push(`${bucket}: 목록을 읽지 못했습니다 (${listErr.message})`);
        continue;
      }
      if (!files?.length) continue;

      const paths = files.map((f) => `${companyId}/${f.name}`);
      const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
      if (rmErr) {
        stuck.push(`${bucket}: ${paths.length}개를 지우지 못했습니다 (${rmErr.message})`);
        continue;
      }
      purged += paths.length;
    } catch (err) {
      stuck.push(`${bucket}: ${err instanceof Error ? err.message : "알 수 없음"}`);
    }
  }

  if (stuck.length) {
    // 파기한다고 약관에 적어 두고 안 한 상태다. 사람이 손으로 치워야 한다.
    await reportServerFailure(
      "탈퇴 서류 파기",
      `회사 ${companyId}의 서류가 남았습니다. ${stuck.join(" / ")}`,
    );
  }

  return NextResponse.json({ ok: true, purged });
}
