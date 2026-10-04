// 회사소개서 열람 링크.
//
// 자격 판단을 화면에 맡기지 않는다. "보기 버튼이 보이니까 볼 수 있다"가
// 아니라, 요청이 올 때마다 서버가 다시 따진다.
//
// 열어주는 범위는 운영자와 "나에게 견적을 낸 회사"까지다. 아무나 열면
// 파트너사의 영업 자료가 그대로 새고, 매칭 성사 뒤에만 열면 정작 의뢰사가
// 판단할 때 쓸 수가 없다.
//
// 링크는 10분이면 만료된다. 소개서는 분량이 있어 읽는 데 시간이 걸리므로
// 사업자등록증(5분)보다는 길게 둔다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

const BUCKET = "company-profiles";
const TTL_SEC = 10 * 60;

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ message: "서버 설정이 올바르지 않습니다." }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const { companyId } = (await request.json().catch(() => ({}))) as { companyId?: string };
  if (!companyId) {
    return NextResponse.json({ message: "companyId가 필요합니다." }, { status: 400 });
  }

  // 자격 판단은 DB 함수가 한다. 호출자의 세션으로 부르므로 current_company_id()가
  // 제 회사를 가리킨다 — 서버에서 회사 id를 넘겨받아 믿는 구조가 아니다.
  const { data: allowed, error: checkErr } = await supabase.rpc("can_view_profile_doc", {
    p_company_id: companyId,
  });
  if (checkErr) {
    return NextResponse.json({ message: `확인하지 못했습니다. (${checkErr.message})` }, { status: 500 });
  }
  if (allowed !== true) {
    return NextResponse.json(
      { message: "이 회사의 소개서를 열람할 권한이 없습니다." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("profile_doc_path")
    .eq("id", companyId)
    .single();

  if (!company?.profile_doc_path) {
    return NextResponse.json({ message: "등록된 회사소개서가 없습니다." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(company.profile_doc_path, TTL_SEC);

  if (error || !data) {
    return NextResponse.json({ message: "열람 링크를 만들지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl });
}
