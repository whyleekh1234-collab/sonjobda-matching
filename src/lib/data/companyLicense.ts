import { createClient } from "@/lib/supabase/client";

// 사업자등록증. 비공개 버킷 business-licenses에 <회사id>/license.<ext>로 올린다.
//
// 로고와 달리 공개하지 않는다. 등록증에는 대표자 성명과 주소가 들어 있고,
// 개인사업자는 그게 개인정보다. 운영자만 서버를 거쳐 서명 링크로 연다.
//
// 회사를 처음 등록할 때만 받는다. 초대 링크로 합류하는 멤버는 회사가 이미
// 검증됐으므로 묻지 않는다.

const BUCKET = "business-licenses";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["application/pdf", "image/png", "image/jpeg"];

export const LICENSE_ACCEPT = ".pdf,.png,.jpg,.jpeg";

/** 문제가 있으면 사용자에게 보여줄 문구를, 없으면 null을 준다. */
export function validateLicense(file: File): string | null {
  if (!TYPES.includes(file.type)) return "PDF, PNG, JPG 파일만 올릴 수 있습니다.";
  if (file.size > MAX_BYTES) return "파일 크기는 5MB 이하만 가능합니다.";
  return null;
}

/**
 * 올리고 회사에 연결한다.
 *
 * 가입 직후에 부른다. 그 시점에는 프로필이 막 만들어진 상태라
 * current_company_id()가 제 회사를 가리킨다.
 */
export async function uploadCompanyLicense(companyId: string, file: File): Promise<void> {
  const err = validateLicense(file);
  if (err) throw new Error(err);

  const ext =
    file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  // 경로는 하나로 고정한다. 다시 올리면 덮어쓰고, 옛 파일이 남지 않는다.
  const path = `${companyId}/license.${ext}`;

  const supabase = createClient();
  // upsert는 쓰지 않는다. insert 정책만 있는 버킷에서 upsert를 켜면 RLS
  // 위반으로 막힌다 — 로고를 붙일 때 같은 것에 걸렸는데 또 밟았다.
  //
  // 가입할 때 한 번만 올리므로 같은 경로에 파일이 이미 있는 경우는 없다.
  // 나중에 다시 올리는 기능을 붙이려면 삭제 정책부터 둬야 한다.
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (upErr) throw new Error("사업자등록증을 올리지 못했습니다: " + upErr.message);

  const { error: rpcErr } = await supabase.rpc("set_my_company_license", {
    p_path: path,
    p_name: file.name,
  });
  if (rpcErr) throw new Error(rpcErr.message);
}
