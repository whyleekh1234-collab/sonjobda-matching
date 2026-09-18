import { createClient } from "@/lib/supabase/client";

// 회사 정보 변경 요청.
//
// 회사명·사업자등록번호·주소는 회원이 직접 못 바꾼다(회사 단위 식별 정보라
// 잠가 뒀다). 대신 요청을 남기고 운영자가 승인하면 반영된다.

export interface CompanyChangeRequest {
  id: string;
  companyId: string;
  requestedBy: string;
  requesterName?: string;
  companyName?: string;
  before: { name?: string; business_number?: string; address?: string | null };
  after: { name?: string; business_number?: string; address?: string };
  reason?: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

type Row = {
  id: string;
  company_id: string;
  requested_by: string;
  before_data: CompanyChangeRequest["before"];
  after_data: CompanyChangeRequest["after"];
  reason: string | null;
  status: CompanyChangeRequest["status"];
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  companies?: { name: string } | null;
  profiles?: { name: string } | null;
};

function toRequest(r: Row): CompanyChangeRequest {
  return {
    id: r.id,
    companyId: r.company_id,
    requestedBy: r.requested_by,
    requesterName: r.profiles?.name,
    companyName: r.companies?.name,
    before: r.before_data ?? {},
    after: r.after_data ?? {},
    reason: r.reason ?? undefined,
    status: r.status,
    reviewedAt: r.reviewed_at ?? undefined,
    reviewNote: r.review_note ?? undefined,
    createdAt: r.created_at,
  };
}

const SELECT = `id, company_id, requested_by, before_data, after_data, reason,
  status, reviewed_at, review_note, created_at,
  companies(name),
  profiles!company_change_requests_requested_by_fkey(name)`;

// 내 회사 요청 이력. RLS가 범위를 정한다.
export async function listMyChangeRequests(): Promise<CompanyChangeRequest[]> {
  const { data, error } = await createClient()
    .from("company_change_requests")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toRequest);
}

export async function submitChangeRequest(input: {
  name?: string;
  businessNumber?: string;
  address?: string;
  reason?: string;
}): Promise<void> {
  const { error } = await createClient().rpc("submit_company_change_request", {
    p_name: input.name ?? null,
    p_business_number: input.businessNumber ?? null,
    p_address: input.address ?? null,
    p_reason: input.reason ?? null,
  });
  if (error) throw new Error(error.message);
}

// ── 운영자 ──────────────────────────────────────────────────

export async function listAllChangeRequests(): Promise<CompanyChangeRequest[]> {
  return listMyChangeRequests(); // 같은 쿼리지만 RLS가 운영자에겐 전부 내준다
}

export async function reviewChangeRequest(
  id: string,
  approve: boolean,
  note?: string
): Promise<void> {
  const { error } = await createClient().rpc("admin_review_change_request", {
    p_id: id,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
}

// 화면에 "무엇이 어떻게 바뀌는가"를 보여주기 위한 라벨
export const FIELD_LABELS: Record<string, string> = {
  name: "회사명",
  business_number: "사업자등록번호",
  address: "주소",
};
