import { createClient } from "@/lib/supabase/client";

// 회사소개서.
//
// 파트너 역량을 체크박스로만 받으면 레퍼런스도 수행 사례도 담을 수 없다.
// 그렇다고 구조화된 항목을 버리면 의뢰사가 견적을 숫자로 비교할 수 없다.
// 그래서 숫자는 항목으로, 깊이는 이 파일로 나눈다.
//
// 비공개 버킷에 둔다. 아무나 열면 파트너사의 영업 자료가 그대로 새고,
// 매칭 뒤에만 열면 정작 판단할 때 못 본다. "나에게 견적을 낸 회사"까지만
// 열어주는 판단은 서버가 한다.

const BUCKET = "company-profiles";
const MAX_BYTES = 20 * 1024 * 1024;
const TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const PROFILE_DOC_ACCEPT = ".pdf,.ppt,.pptx";

export function validateProfileDoc(file: File): string | null {
  if (!TYPES.includes(file.type)) return "PDF 또는 PPT 파일만 올릴 수 있습니다.";
  if (file.size > MAX_BYTES) return "파일 크기는 20MB 이하만 가능합니다.";
  return null;
}

/** 올리고 회사에 연결한다. 같은 경로에 덮어쓴다. */
export async function uploadProfileDoc(companyId: string, file: File): Promise<void> {
  const err = validateProfileDoc(file);
  if (err) throw new Error(err);

  const ext = file.type === "application/pdf" ? "pdf"
    : file.type === "application/vnd.ms-powerpoint" ? "ppt" : "pptx";
  const path = `${companyId}/profile.${ext}`;

  const supabase = createClient();
  // upsert는 insert 정책과 충돌해 RLS 위반이 난다(로고·등록증에서 밟았다).
  // 다시 올리는 경우를 위해 같은 경로의 옛 파일을 먼저 치운다 — 이 버킷에는
  // 삭제 정책을 뒀으므로 동작한다.
  await supabase.storage.from(BUCKET).remove([path]);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (upErr) throw new Error("회사소개서를 올리지 못했습니다: " + upErr.message);

  const { error: rpcErr } = await supabase.rpc("set_my_company_profile_doc", {
    p_path: path,
    p_name: file.name,
  });
  if (rpcErr) throw new Error(rpcErr.message);
}

/** 첨부를 지운다. 파일과 기록을 함께 치운다. */
export async function removeProfileDoc(companyId: string): Promise<void> {
  const supabase = createClient();
  for (const ext of ["pdf", "ppt", "pptx"]) {
    await supabase.storage.from(BUCKET).remove([`${companyId}/profile.${ext}`]);
  }
  const { error } = await supabase.rpc("set_my_company_profile_doc", {
    p_path: null,
    p_name: null,
  });
  if (error) throw new Error(error.message);
}

/**
 * 열람용 서명 링크를 받는다.
 *
 * 자격 판단은 서버가 한다 — 운영자이거나, 내 회사가 올린 의뢰에 그 회사가
 * 견적을 낸 경우. 화면이 "볼 수 있다"고 주장하는 것을 믿지 않는다.
 */
export async function openProfileDoc(companyId: string): Promise<string> {
  const res = await fetch("/api/partner-profile-doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "열 수 없습니다.");
  return data.url as string;
}
