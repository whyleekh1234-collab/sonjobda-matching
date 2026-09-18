import { createClient } from "@/lib/supabase/client";
import type { Notice } from "@/types/auth";

// 관리자 화면 전용. 운영자는 1단계 스키마의 is_platform_admin() 정책 덕에
// 모든 회사의 데이터를 읽을 수 있다. 쓰기는 2~4단계에서 컬럼 단위로 잠가
// 뒀으므로 자격 검사가 들어간 함수를 거친다.

export interface AdminUser {
  id: string;
  memberCode?: string;
  name: string;
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
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await createClient().rpc("admin_list_users");
  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; member_code: string; name: string; email: string; phone: string | null;
    company: string; business_number: string; address: string | null;
    roles: string[]; active_role: string; partner_categories: string[] | null;
    status: string; is_company_admin: boolean; is_platform_admin: boolean;
    verified: boolean; allow_category_edit: boolean; created_at: string;
  }[]).map((r) => ({
    id: r.id,
    memberCode: r.member_code,
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
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
}

export async function listAllInquiries(): Promise<AdminInquiry[]> {
  const { data, error } = await createClient()
    .from("inquiries")
    .select("id, company, name, email, phone, type, title, message, status, replies, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; company: string | null; name: string; email: string; phone: string | null;
    type: string | null; title: string | null; message: string;
    status: AdminInquiry["status"]; replies: AdminInquiry["replies"]; created_at: string;
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
