import { createClient } from "@/lib/supabase/client";
import type { Notice } from "@/types/auth";

// 관리자 화면 전용. 운영자는 1단계 스키마의 is_platform_admin() 정책 덕에
// 모든 회사의 데이터를 읽을 수 있다. 쓰기는 2~4단계에서 컬럼 단위로 잠가
// 뒀으므로 자격 검사가 들어간 함수를 거친다.

export interface AdminUser {
  id: string;
  memberCode?: string;
  name: string;
  companyId?: string;
  company: string;
  email: string;
  roles: string[];
  activeRole: string;
  partnerCategories?: string[];
  phone?: string;
  businessNumber?: string;
  address?: string;
  status: string;
  verified?: boolean;
  isCompanyAdmin?: boolean;
  isPlatformAdmin?: boolean;
  allowCategoryEdit?: boolean;
  createdAt?: string;
  // 광고성 정보 수신 동의. 동의 시각까지 들고 있어야 "언제 받았는지"에
  // 답할 수 있다.
  marketingConsent?: boolean;
  marketingConsentAt?: string | null;
  // 운영자가 2단계 인증번호를 받을 주소. 로그인 이메일과 달라야 한다.
  mfaEmail?: string | null;
  // 사업자등록증. 경로는 비공개라 운영자가 서버를 거쳐 서명 링크로 연다.
  licensePath?: string | null;
  licenseName?: string | null;
  // 기각을 뺀 실제 제재 횟수. 정책 제6조 ③의 "누적 3회"가 이 값이다.
  sanctionCount?: number;
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await createClient().rpc("admin_list_users");
  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; member_code: string; name: string; email: string; phone: string | null;
    company_id?: string; company: string; business_number: string; address: string | null;
    roles: string[]; active_role: string; partner_categories: string[] | null;
    status: string; is_company_admin: boolean; is_platform_admin: boolean;
    verified: boolean; allow_category_edit: boolean; created_at: string;
    marketing_consent: boolean | null; marketing_consent_at: string | null;
    mfa_email: string | null;
    license_path: string | null; license_name: string | null;
    sanction_count: number | null;
  }[]).map((r) => ({
    id: r.id,
    memberCode: r.member_code,
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
    companyId: r.company_id,
    company: r.company,
    businessNumber: r.business_number,
    address: r.address ?? "",
    roles: r.roles,
    activeRole: r.active_role,
    partnerCategories: r.partner_categories ?? [],
    status: r.status,
    isCompanyAdmin: r.is_company_admin,
    isPlatformAdmin: r.is_platform_admin,
    verified: r.verified,
    allowCategoryEdit: r.allow_category_edit,
    createdAt: r.created_at,
    marketingConsent: r.marketing_consent ?? false,
    marketingConsentAt: r.marketing_consent_at ?? null,
    mfaEmail: r.mfa_email ?? null,
    licensePath: r.license_path ?? null,
    licenseName: r.license_name ?? null,
    sanctionCount: r.sanction_count ?? 0,
  }));
}

export async function updateUser(
  targetId: string,
  fields: { status?: string; verified?: boolean; allowCategoryEdit?: boolean }
): Promise<void> {
  const { error } = await createClient().rpc("admin_update_user", {
    p_target: targetId,
    p_status: fields.status ?? null,
    p_verified: fields.verified ?? null,
    p_allow_category_edit: fields.allowCategoryEdit ?? null,
  });
  if (error) throw new Error(error.message);
}

// 운영자가 회원 개인 정보를 직접 고친다. 비운 항목은 그대로 둔다.
export async function updateProfileAsAdmin(
  targetId: string,
  fields: { name?: string; phone?: string; roles?: string[]; partnerCategories?: string[] }
): Promise<void> {
  const { error } = await createClient().rpc("admin_update_profile", {
    p_target: targetId,
    p_name: fields.name ?? null,
    p_phone: fields.phone ?? null,
    p_roles: fields.roles ?? null,
    p_partner_categories: fields.partnerCategories ?? null,
  });
  if (error) throw new Error(error.message);
}

// 회사 정보 직접 수정. 사업자번호를 바꾸면 국세청 검증이 초기화된다.
export async function updateCompanyAsAdmin(
  companyId: string,
  fields: { name?: string; businessNumber?: string; address?: string }
): Promise<void> {
  const { error } = await createClient().rpc("admin_update_company", {
    p_company_id: companyId,
    p_name: fields.name ?? null,
    p_business_number: fields.businessNumber ?? null,
    p_address: fields.address ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteUser(targetId: string): Promise<void> {
  const { error } = await createClient().rpc("admin_delete_user", { p_target: targetId });
  if (error) throw new Error(error.message);
}

// ── 문의 ────────────────────────────────────────────────────

export interface AdminInquiry {
  id: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  title?: string;
  message: string;
  status: "new" | "read" | "replied" | "closed";
  replies?: { from: string; message: string; createdAt: string }[];
  createdAt: string;
  // 신고(type=report)일 때 채워진다. 대상이 특정되지 않으면 조사할 수가 없다.
  profileId?: string | null;
  targetCompanyId?: string | null;
  targetRequestId?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
}

export async function listAllInquiries(): Promise<AdminInquiry[]> {
  const { data, error } = await createClient()
    .from("inquiries")
    .select("id, company, name, email, phone, type, title, message, status, replies, created_at, profile_id, target_company_id, target_request_id, resolution, resolved_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; company: string | null; name: string; email: string; phone: string | null;
    type: string | null; title: string | null; message: string;
    status: AdminInquiry["status"]; replies: AdminInquiry["replies"]; created_at: string;
    profile_id: string | null; target_company_id: string | null;
    target_request_id: string | null; resolution: string | null; resolved_at: string | null;
  }[]).map((r) => ({
    id: r.id,
    company: r.company ?? "",
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
    type: r.type ?? "",
    title: r.title ?? undefined,
    message: r.message,
    status: r.status,
    replies: r.replies ?? [],
    profileId: r.profile_id,
    targetCompanyId: r.target_company_id,
    targetRequestId: r.target_request_id,
    resolution: r.resolution,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
  }));
}

export async function replyInquiry(inquiryId: string, message: string): Promise<void> {
  const { error } = await createClient().rpc("admin_reply_inquiry", {
    p_inquiry_id: inquiryId,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

export async function editInquiryReply(
  inquiryId: string,
  index: number,
  message: string | null
): Promise<void> {
  const { error } = await createClient().rpc("admin_edit_inquiry_reply", {
    p_inquiry_id: inquiryId,
    p_index: index,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

export async function setInquiryStatus(
  inquiryId: string,
  status: AdminInquiry["status"]
): Promise<void> {
  const { error } = await createClient().rpc("admin_set_inquiry_status", {
    p_inquiry_id: inquiryId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

// ── 공지 ────────────────────────────────────────────────────
// notices는 테이블 권한이 살아 있고 운영자 정책이 있어 직접 쓴다.

export async function createNotice(title: string, content: string): Promise<void> {
  const { error } = await createClient().from("notices").insert({ title, content });
  if (error) throw new Error(error.message);
}

export async function deleteNotice(id: string): Promise<void> {
  const { error } = await createClient().from("notices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listAllNotices(): Promise<Notice[]> {
  const { data, error } = await createClient()
    .from("notices")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; title: string; content: string; created_at: string }[]).map(
    (r) => ({ id: r.id, title: r.title, content: r.content, createdAt: r.created_at })
  );
}

// ── 알림 ────────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  notifCode?: string;
  userId: string;
  fromUserId?: string;
  message: string;
  read: boolean;
  createdAt: string;
  replies?: { from: string; company: string; message: string; createdAt: string }[];
}

export async function listAllNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await createClient()
    .from("notifications")
    .select("id, notif_code, profile_id, from_profile_id, message, read, replies, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; notif_code: string | null; profile_id: string; from_profile_id: string | null;
    message: string; read: boolean; replies: AdminNotification["replies"]; created_at: string;
  }[]).map((r) => ({
    id: r.id,
    notifCode: r.notif_code ?? undefined,
    userId: r.profile_id,
    fromUserId: r.from_profile_id ?? undefined,
    message: r.message,
    read: r.read,
    replies: r.replies ?? [],
    createdAt: r.created_at,
  }));
}

export async function replyNotification(notificationId: string, message: string): Promise<void> {
  const { error } = await createClient().rpc("admin_reply_notification", {
    p_notification_id: notificationId,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

export async function setCompanyAdmin(targetId: string, value: boolean): Promise<void> {
  const { error } = await createClient().rpc("admin_set_company_admin", {
    p_target: targetId,
    p_value: value,
  });
  if (error) throw new Error(error.message);
}

// 운영자 본인에게 온 알림을 전부 읽음 처리한다. notifications_update_own
// 정책과 read 컬럼 권한으로 직접 쓸 수 있다.
export async function markAllMyNotificationsRead(): Promise<void> {
  const { error } = await createClient()
    .from("notifications")
    .update({ read: true })
    .eq("read", false);
  if (error) throw new Error(error.message);
}

export async function sendNotification(profileId: string, message: string): Promise<void> {
  const { error } = await createClient().rpc("admin_send_notification", {
    p_profile_id: profileId,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await createClient().from("notifications").update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * 운영자 권한을 주거나 뺀다.
 *
 * 계정을 나눠 쓰지 않고 사람마다 따로 두기 위한 것이다. 2단계 인증
 * 통과 증명이 계정당 하나라 공유하면 서로를 로그아웃시키고, 무엇보다
 * 누가 무엇을 했는지 남지 않는다.
 *
 * 권한을 줄 때는 인증번호를 받을 주소가 반드시 필요하다. 로그인
 * 이메일과 같으면 서버가 거부한다 — 같은 메일함이면 2단계가 아니다.
 */
export async function setPlatformAdmin(
  profileId: string,
  on: boolean,
  mfaEmail?: string
): Promise<void> {
  const { error } = await createClient().rpc("admin_set_platform_admin", {
    p_profile_id: profileId,
    p_on: on,
    p_mfa_email: mfaEmail ?? null,
  });
  if (error) throw new Error(error.message);
}

/** 이미 운영자인 사람의 인증번호 수신 주소만 바꾼다. */
export async function setMfaEmail(profileId: string, mfaEmail: string): Promise<void> {
  const { error } = await createClient().rpc("admin_set_mfa_email", {
    p_profile_id: profileId,
    p_mfa_email: mfaEmail,
  });
  if (error) throw new Error(error.message);
}

// ── 제재 ────────────────────────────────────────────────────
//
// 운영정책 제6조 ③이 "누적 3회면 영구 탈퇴"를 약속하는데 셀 방법이
// 없었다. 상태값 하나만 있고 이력이 없었기 때문이다. 이제 제재할 때마다
// 사유와 함께 한 줄씩 남는다.

export type SanctionKind = "warning" | "restrict" | "suspend" | "dismiss";

export const SANCTION_LABELS: Record<SanctionKind, string> = {
  warning: "경고",
  restrict: "이용 제한",
  suspend: "이용 정지",
  dismiss: "기각 (제재 없음)",
};

export interface SanctionRow {
  id: string;
  kind: SanctionKind;
  reason: string;
  createdAt: string;
  decidedByName: string | null;
  inquiryId: string | null;
}

/**
 * 제재한다. 이력을 남기고, 상태를 바꾸고, 당사자에게 알리는 것을 한
 * 트랜잭션으로 처리한다 — 따로 놀면 "상태는 정지인데 이력이 없는"
 * 회원이 생긴다.
 *
 * 반환값은 그 회원의 누적 제재 횟수다. 3회가 넘으면 화면이 영구 탈퇴를
 * 검토하라고 알려준다.
 */
export async function sanctionMember(
  profileId: string,
  kind: SanctionKind,
  reason: string,
  inquiryId?: string
): Promise<{ count: number; status: string }> {
  const { data, error } = await createClient().rpc("admin_sanction", {
    p_profile_id: profileId,
    p_kind: kind,
    p_reason: reason,
    p_inquiry_id: inquiryId ?? null,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { sanction_count: number; member_status: string }
    | undefined;
  return { count: row?.sanction_count ?? 0, status: row?.member_status ?? "" };
}

export async function listSanctions(profileId: string): Promise<SanctionRow[]> {
  const { data, error } = await createClient().rpc("admin_list_sanctions", {
    p_profile_id: profileId,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; kind: SanctionKind; reason: string; created_at: string;
    decided_by_name: string | null; inquiry_id: string | null;
  }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    reason: r.reason,
    createdAt: r.created_at,
    decidedByName: r.decided_by_name,
    inquiryId: r.inquiry_id,
  }));
}

/** 신고를 종결한다. 제재했든 기각했든 처리 결과를 남긴다. */
export async function resolveInquiry(inquiryId: string, resolution: string): Promise<void> {
  const { error } = await createClient().rpc("admin_resolve_inquiry", {
    p_inquiry_id: inquiryId,
    p_resolution: resolution,
  });
  if (error) throw new Error(error.message);
}
