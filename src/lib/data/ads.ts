import { createClient } from "@/lib/supabase/client";
import { supabaseUrl } from "@/lib/supabase/env";

// 메인 화면 광고. 돈을 받고 파는 자리라 운영자만 등록한다(36단계).

const BUCKET = "ad-images";
export const AD_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const AD_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

// 메인에 둔 자리 수. 넉 칸을 채우고, 빈 칸은 "광고 문의"로 남는다.
export const AD_SLOTS = 4;

export type ActiveAd = {
  id: string;
  slot: number;
  companyName: string;
  headline: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  // 우리 사이트에 상세 화면이 있는지. 있으면 카드가 /ads/<id>로 걸리고,
  // 없으면 광고주 사이트로 바로 나간다.
  hasDetail: boolean;
};

export type AdDetail = {
  companyName: string;
  headline: string;
  body: string | null;
  detailBody: string | null;
  imageUrl: string | null;
  detailUrls: string[];
  linkUrl: string | null;
  ctaLabel: string | null;
};

export type AdminAd = {
  id: string;
  slot: number;
  companyName: string;
  companyId: string | null;
  headline: string;
  body: string | null;
  imagePath: string | null;
  linkUrl: string | null;
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  clickCount: number;
  memo: string | null;
  // 켜져 있고 게재 기간 안이라 실제로 메인에 보이는 상태인지.
  isLive: boolean;
  detailBody: string | null;
  detailImages: string[];
  ctaLabel: string | null;
};

// 함수가 돌려주는 image_url은 버킷 경로까지만이라, 호스트를 붙여 완성한다.
// 버킷이 둘(광고용 그림 / 회사 로고)이어서 어느 쪽인지는 SQL이 이미 판단했다.
function absolute(path: string | null): string | null {
  return path ? `${supabaseUrl()}${path}` : null;
}

export async function listActiveAds(): Promise<ActiveAd[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_active_ads");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    slot: r.slot as number,
    companyName: r.company_name as string,
    headline: r.headline as string,
    body: (r.body as string) ?? null,
    imageUrl: absolute((r.image_url as string) ?? null),
    linkUrl: (r.link_url as string) ?? null,
    hasDetail: Boolean(r.has_detail),
  }));
}

// 상세 화면. 게재 기간이 끝난 광고는 null이 온다 — 주소를 들고 있어도
// 열리면 돈을 안 받은 기간에 광고가 살아 있는 셈이다.
export async function getAdDetail(id: string): Promise<AdDetail | null> {
  const { data, error } = await createClient().rpc("get_ad_detail", { p_id: id });
  if (error) throw new Error(error.message);
  const r = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    companyName: r.company_name as string,
    headline: r.headline as string,
    body: (r.body as string) ?? null,
    detailBody: (r.detail_body as string) ?? null,
    imageUrl: absolute((r.image_url as string) ?? null),
    detailUrls: ((r.detail_urls as string[]) ?? []).map((u) => `${supabaseUrl()}${u}`),
    linkUrl: (r.link_url as string) ?? null,
    ctaLabel: (r.cta_label as string) ?? null,
  };
}

// 클릭 집계. 실패해도 광고주 사이트로는 가야 하므로 조용히 삼킨다.
export async function recordAdClick(adId: string): Promise<void> {
  try {
    await createClient().rpc("record_ad_click", { p_ad_id: adId });
  } catch {
    /* 집계는 참고치다. 이것 때문에 이동을 막지 않는다. */
  }
}

// ── 운영자 ──────────────────────────────────────────────────

export async function adminListAds(): Promise<AdminAd[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_list_ads");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    slot: r.slot as number,
    companyName: r.company_name as string,
    companyId: (r.company_id as string) ?? null,
    headline: r.headline as string,
    body: (r.body as string) ?? null,
    imagePath: (r.image_path as string) ?? null,
    linkUrl: (r.link_url as string) ?? null,
    startsOn: (r.starts_on as string) ?? null,
    endsOn: (r.ends_on as string) ?? null,
    isActive: Boolean(r.is_active),
    clickCount: (r.click_count as number) ?? 0,
    memo: (r.memo as string) ?? null,
    isLive: Boolean(r.is_live),
    detailBody: (r.detail_body as string) ?? null,
    detailImages: ((r.detail_images as string[]) ?? []),
    ctaLabel: (r.cta_label as string) ?? null,
  }));
}

export type AdInput = {
  id?: string | null;
  slot: number;
  companyName: string;
  companyId?: string | null;
  headline: string;
  body?: string | null;
  imagePath?: string | null;
  linkUrl?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  isActive?: boolean;
  memo?: string | null;
  detailBody?: string | null;
  detailImages?: string[] | null;
  ctaLabel?: string | null;
};

export async function adminSaveAd(input: AdInput): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_save_ad", {
    p_slot: input.slot,
    p_company_name: input.companyName,
    p_headline: input.headline,
    p_id: input.id ?? null,
    p_company_id: input.companyId ?? null,
    p_body: input.body ?? null,
    p_image_path: input.imagePath ?? null,
    p_link_url: input.linkUrl ?? null,
    p_starts_on: input.startsOn ?? null,
    p_ends_on: input.endsOn ?? null,
    p_is_active: input.isActive ?? true,
    p_memo: input.memo ?? null,
    p_detail_body: input.detailBody ?? null,
    p_detail_images: input.detailImages ?? null,
    p_cta_label: input.ctaLabel ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function adminDeleteAd(id: string): Promise<void> {
  const { error } = await createClient().rpc("admin_delete_ad", { p_id: id });
  if (error) throw new Error(error.message);
}

export function validateAdImage(file: File): string | null {
  if (!AD_IMAGE_TYPES.includes(file.type)) return "PNG, JPG, WEBP, SVG 파일만 올릴 수 있습니다.";
  if (file.size > AD_IMAGE_MAX_BYTES) return "그림 파일은 2MB 이하여야 합니다.";
  return null;
}

// 올리고 저장된 경로를 돌려준다. 자리 번호 폴더에 시각을 붙여 둔다 —
// 같은 자리의 광고를 갈아끼울 때 옛 그림이 캐시에 남지 않는다.
export async function uploadAdImage(slot: number, file: File): Promise<string> {
  const err = validateAdImage(file);
  if (err) throw new Error(err);
  const ext =
    file.type === "image/svg+xml" ? "svg" :
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" : "jpg";
  // 같은 밀리초에 여러 장이 올라가면 경로가 겹친다. 상세 그림은 한 번에
  // 여러 장을 올리므로 뒤에 난수를 붙인다.
  const path = `slot-${slot}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await createClient().storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error("그림을 올리지 못했습니다: " + error.message);
  return path;
}
