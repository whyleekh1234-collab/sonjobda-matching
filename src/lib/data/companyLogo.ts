import { createClient } from "@/lib/supabase/client";
import { supabaseUrl } from "@/lib/supabase/env";

// 회사 로고. 공개 버킷 company-logos에 <회사id>/logo.<ext>로 올린다.

const BUCKET = "company-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
// SVG는 받지 않는다. 그림이 아니라 스크립트를 품을 수 있는 문서라서다.
// 로고는 공개 버킷에 올라가고 주소가 그대로 열리는데, 주소창으로 연
// SVG 안의 스크립트는 실제로 돈다. 화면에 <img>로 박힐 때는 안 돌지만
// 그건 우리가 어떻게 쓰느냐에 달린 것이고, 파일은 주소만 알면 누구나
// 연다. 우리 저장소가 남의 악성코드를 날라 주는 자리가 된다.
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // 같은 경로에 덮어써도 브라우저 캐시가 옛 그림을 보여주지 않게 경로에 버전을 붙인다.
  return `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function validateLogo(file: File): string | null {
  if (!LOGO_TYPES.includes(file.type)) return "PNG, JPG, WEBP 파일만 올릴 수 있습니다.";
  if (file.size > LOGO_MAX_BYTES) return "로고 파일은 2MB 이하여야 합니다.";
  return null;
}

// 올리고 회사에 연결한다. 반환값은 저장된 경로.
export async function uploadCompanyLogo(companyId: string, file: File): Promise<string> {
  const err = validateLogo(file);
  if (err) throw new Error(err);
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // 확장자가 바뀌면 옛 파일이 남으므로 이름에 시각을 넣고, 옛 것은 지운다.
  const path = `${companyId}/logo-${Date.now()}.${ext}`;
  const supabase = createClient();

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (upErr) throw new Error("로고를 올리지 못했습니다: " + upErr.message);

  const { error: rpcErr } = await supabase.rpc("set_my_company_logo", { p_path: path });
  if (rpcErr) throw new Error(rpcErr.message);

  // 옛 로고 정리 (실패해도 무시)
  const { data: list } = await supabase.storage.from(BUCKET).list(companyId);
  const stale = (list ?? []).map((f) => `${companyId}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await supabase.storage.from(BUCKET).remove(stale);

  return path;
}

export async function removeCompanyLogo(companyId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_my_company_logo", { p_path: null });
  if (error) throw new Error(error.message);
  const { data: list } = await supabase.storage.from(BUCKET).list(companyId);
  const files = (list ?? []).map((f) => `${companyId}/${f.name}`);
  if (files.length) await supabase.storage.from(BUCKET).remove(files);
}
