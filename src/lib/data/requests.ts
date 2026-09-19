import { createClient } from "@/lib/supabase/client";
import type { MatchRequest, Quote, QuoteStatus, RequestStatus, TimelineItem } from "@/types/matching";

// DB의 requests/quotes/companies를 화면이 지금까지 써 온 MatchRequest 모양으로
// 되조립한다. 두 대시보드의 JSX가 "의뢰 안에 견적 배열이 들어 있는" 형태를
// 그대로 쓰고 있어서, 출처만 Supabase로 바꾸고 모양은 유지한다.
//
// 바뀐 의미가 하나 있다. 견적의 주인이 회원에서 회사로 바뀌었다.
// "내 견적"을 찾을 때 q.partnerId가 아니라 q.companyId를 user.companyId와
// 비교해야 한다.

const REQUEST_SELECT = `
  id, request_code, match_code, company_id, created_by,
  title, category, description, budget, deadline, status, form_data, created_at,
  companies!requests_company_id_fkey(name),
  quotes(
    id, quote_code, request_id, company_id, submitted_by,
    amount, duration, memo, timeline, details,
    attachment_path, attachment_name, status, created_at,
    companies!quotes_company_id_fkey(name)
  )
`;

type QuoteRow = {
  id: string;
  quote_code: string | null;
  request_id: string;
  company_id: string;
  submitted_by: string | null;   // 담당자가 탈퇴하면 null. 견적 자체는 회사 것이라 남는다.
  amount: number | null;
  duration: string | null;
  memo: string | null;
  timeline: TimelineItem[] | null;
  details: Record<string, unknown> | null;
  attachment_path: string | null;
  attachment_name: string | null;
  status: QuoteStatus;
  created_at: string;
  companies: { name: string } | null;
};

type RequestRow = {
  id: string;
  request_code: string | null;
  match_code: string | null;
  company_id: string;
  created_by: string | null;     // 담당자가 탈퇴하면 null. 의뢰 자체는 회사 것이라 남는다.
  title: string;
  category: string;
  description: string | null;
  budget: string | null;
  deadline: string | null;
  status: RequestStatus;
  form_data: Record<string, unknown> | null;
  created_at: string;
  companies: { name: string } | null;
  quotes: QuoteRow[] | null;
};

// 화면은 금액을 "1,234,000" 같은 문자열로 다루고 DB는 숫자로 담는다.
function formatAmount(n: number | null): string {
  return n === null ? "" : n.toLocaleString("ko-KR");
}

export function parseAmount(s: string): number | null {
  const digits = (s ?? "").replace(/[^0-9]/g, "");
  return digits === "" ? null : Number(digits);
}

function toQuote(row: QuoteRow): Quote {
  const d = (row.details ?? {}) as Record<string, string | string[] | undefined>;
  const text = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : undefined);
  return {
    id: row.id,
    ...(row.quote_code && { quoteCode: row.quote_code }),
    requestId: row.request_id,
    companyId: row.company_id,
    partnerId: row.submitted_by ?? "",
    partnerCompany: row.companies?.name ?? "",
    amount: formatAmount(row.amount),
    duration: row.duration ?? "",
    memo: row.memo ?? "",
    ...(row.timeline && { timeline: row.timeline }),
    ...(row.attachment_name && { attachmentName: row.attachment_name }),
    ...(row.attachment_path && { attachmentData: row.attachment_path }),
    subjectCount: text("subjectCount"),
    siteCountCapital: text("siteCountCapital"),
    siteCountLocal: text("siteCountLocal"),
    trialDuration: text("trialDuration"),
    perSubjectDuration: text("perSubjectDuration"),
    expectedCra: text("expectedCra"),
    monitoringPerSite: text("monitoringPerSite"),
    edcBrand: text("edcBrand"),
    ...(Array.isArray(d.partnerCategories) && { partnerCategories: d.partnerCategories }),
    status: row.status,
    createdAt: row.created_at,
  };
}

function toRequest(row: RequestRow): MatchRequest {
  return {
    id: row.id,
    ...(row.request_code && { requestCode: row.request_code }),
    ...(row.match_code && { matchCode: row.match_code }),
    clientId: row.created_by ?? "",
    clientCompany: row.companies?.name ?? "",
    title: row.title,
    category: row.category,
    description: row.description ?? "",
    budget: row.budget ?? "",
    deadline: row.deadline ?? "",
    status: row.status,
    createdAt: row.created_at,
    offers: [],
    quotes: (row.quotes ?? []).map(toQuote),
    ...(row.form_data && { formData: row.form_data }),
  };
}

// ── 조회 ────────────────────────────────────────────────────
// 어떤 의뢰가 보이는지는 RLS가 정한다. 의뢰사는 자기 회사 의뢰 전부,
// 파트너사는 자기 카테고리의 열린 의뢰 + 자기 회사가 견적을 낸 의뢰.
// 클라이언트에서 거르지 않는다 — 걸러봐야 응답에는 이미 담겨 있으니
// 의미가 없고, 서버가 애초에 안 주는 게 맞다.

// 의뢰사 대시보드: 내 회사가 등록한 의뢰
export async function listMyCompanyRequests(companyId: string): Promise<MatchRequest[]> {
  const { data, error } = await createClient()
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RequestRow[]).map(toRequest);
}

// 파트너사 대시보드: 볼 수 있는 의뢰 전부 (RLS가 범위를 정한다)
// 파트너사로서 보는 의뢰 목록. RLS가 "내 분야의 열린 의뢰 + 내 회사 의뢰"를
// 내주는데, 뒤쪽은 의뢰사 화면 몫이다. 겸업 회사가 자기 의뢰를 파트너
// 화면에서 보면 안 되므로 excludeCompanyId로 걸러낸다. 운영자는 안 넘긴다.
export async function listPartnerRequests(excludeCompanyId?: string): Promise<MatchRequest[]> {
  let q = createClient()
    .from("requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false });
  if (excludeCompanyId) q = q.neq("company_id", excludeCompanyId);
  const { data, error } = await q;

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RequestRow[]).map(toRequest);
}

export async function getRequest(id: string): Promise<MatchRequest | null> {
  const { data, error } = await createClient()
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return toRequest(data as unknown as RequestRow);
}

// ── 의뢰 쓰기 ───────────────────────────────────────────────

export interface RequestInput {
  title: string;
  category: string;
  description: string;
  budget: string;
  deadline: string;
  formData: Record<string, unknown>;
}

export async function createRequest(
  input: RequestInput,
  companyId: string,
  userId: string
): Promise<MatchRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .insert({
      company_id: companyId,
      created_by: userId,
      title: input.title,
      category: input.category,
      description: input.description,
      budget: input.budget,
      // 빈 문자열은 date 컬럼에 들어가지 않는다
      deadline: input.deadline || null,
      form_data: input.formData,
    })
    .select(REQUEST_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return toRequest(data as unknown as RequestRow);
}

export async function updateRequest(id: string, input: RequestInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("requests")
    .update({
      title: input.title,
      category: input.category,
      description: input.description,
      budget: input.budget,
      deadline: input.deadline || null,
      form_data: input.formData,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function withdrawRequest(id: string): Promise<void> {
  const { error } = await createClient().rpc("withdraw_request", { p_request_id: id });
  if (error) throw new Error(error.message);
}

export async function extendDeadline(id: string, days = 5): Promise<void> {
  const { error } = await createClient().rpc("extend_request_deadline", {
    p_request_id: id,
    p_days: days,
  });
  if (error) throw new Error(error.message);
}

// ── 견적 쓰기 ───────────────────────────────────────────────
// 전부 함수를 거친다. 의뢰사와 파트너사가 같은 테이블을 다른 자격으로
// 건드리는데, RLS도 컬럼 권한도 그 둘을 구분하지 못하기 때문이다.

export interface QuoteInput {
  amount?: string;
  duration?: string;
  memo?: string;
  timeline?: TimelineItem[];
  details?: Record<string, string | undefined>;
  attachmentPath?: string;
  attachmentName?: string;
}

export async function upsertMyQuote(
  requestId: string,
  status: QuoteStatus,
  input: QuoteInput = {}
): Promise<void> {
  const { error } = await createClient().rpc("upsert_my_quote", {
    p_request_id: requestId,
    p_status: status,
    p_amount: input.amount ? parseAmount(input.amount) : null,
    p_duration: input.duration ?? null,
    p_memo: input.memo ?? null,
    p_timeline: input.timeline ?? null,
    p_details: input.details ?? {},
    p_attachment_path: input.attachmentPath ?? null,
    p_attachment_name: input.attachmentName ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function withdrawMyQuote(requestId: string): Promise<void> {
  const { error } = await createClient().rpc("withdraw_my_quote", { p_request_id: requestId });
  if (error) throw new Error(error.message);
}

export async function setQuoteStatusAsClient(quoteId: string, status: QuoteStatus): Promise<void> {
  const { error } = await createClient().rpc("set_quote_status_as_client", {
    p_quote_id: quoteId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

export async function acceptQuote(quoteId: string): Promise<void> {
  const { error } = await createClient().rpc("accept_quote", { p_quote_id: quoteId });
  if (error) throw new Error(error.message);
}

// ── 첨부파일 ────────────────────────────────────────────────
// base64를 행에 담지 않고 Storage에 올린다. 경로 첫 칸이 회사 id여야
// 업로드 정책을 통과한다.

const BUCKET = "quote-attachments";

// Storage 키에는 한글을 쓸 수 없다(Invalid key로 거부된다). 실제 파일명은
// 거의 다 한글이므로, 저장 경로는 안전한 문자로 만들고 원래 이름은 따로
// 컬럼에 담는다. 화면에는 원래 이름이 그대로 보인다.
function safeKey(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) : "";
  return ext ? `file.${ext}` : "file";
}

export async function uploadQuoteAttachment(
  companyId: string,
  requestId: string,
  file: File
): Promise<{ path: string; name: string }> {
  const path = `${companyId}/${requestId}/${Date.now()}-${safeKey(file.name)}`;
  const { error } = await createClient().storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return { path, name: file.name };
}

// 비공개 버킷이라 볼 때마다 한시적으로 열리는 링크를 받아야 한다.
export async function getAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}

// ── 매칭 성사 후 연락처 ─────────────────────────────────────
// 성사 전에는 서로의 프로필을 읽을 수 없다. 성사된 뒤 이 함수로만 열린다.

export interface MatchContact {
  side: "client" | "partner";
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
}

export async function getMatchContacts(requestId: string): Promise<MatchContact[]> {
  const { data, error } = await createClient().rpc("get_match_contacts", {
    p_request_id: requestId,
  });
  if (error || !data) return [];
  return (data as {
    side: "client" | "partner";
    company_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
  }[]).map((r) => ({
    side: r.side,
    companyName: r.company_name,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
  }));
}
