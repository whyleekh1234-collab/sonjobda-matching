// 사업자등록증 열람 링크.
//
// 등록증은 비공개 버킷에 있고, 회원에게는 읽기 권한조차 주지 않았다.
// 운영자만 서버를 거쳐 한시적인 서명 링크를 받는다. 권한을 안 여는 것이
// 가장 단순한 방어라, 열람 경로를 여기 하나로 좁혀 둔다.
//
// 링크는 5분이면 만료된다. 승인 심사 중에 보는 용도라 그 정도면 충분하고,
// 길게 열어두면 그 주소가 돌아다닐 수 있다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

const BUCKET = "business-licenses";
const TTL_SEC = 5 * 60;

export async function POST(request: Request) {
  if (!hasAdminKey()) {
    return NextResponse.json({ message: "서버 설정이 올바르지 않습니다." }, { status: 500 });
  }

  const { companyId } = (await request.json().catch(() => ({}))) as { companyId?: string };
  if (!companyId) {
    return NextResponse.json({ message: "companyId가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const admin = createAdminClient();
  const { data: me, error: meErr } = await admin
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (meErr) {
    return NextResponse.json({ message: `계정 정보를 읽지 못했습니다. (${meErr.message})` }, { status: 500 });
  }
  if (!me?.is_platform_admin) {
    return NextResponse.json({ message: "운영자 권한이 필요합니다." }, { status: 403 });
  }

  const { data: company } = await admin
    .from("companies")
    .select("license_path")
    .eq("id", companyId)
    .single();

  if (!company?.license_path) {
    return NextResponse.json({ message: "등록된 사업자등록증이 없습니다." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(company.license_path, TTL_SEC);

  if (error || !data) {
    return NextResponse.json({ message: "열람 링크를 만들지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl });
}
