import { createClient } from "@/lib/supabase/client";
import type { Notice, Notification, Inquiry } from "@/types/auth";

// 알림 · 공지 · 문의 · 멤버 초대.
// 3단계와 같은 방침이다 — 화면이 쓰던 모양은 유지하고 출처만 DB로 바꾼다.

type NotificationRow = {
  id: string;
  profile_id: string;
  message: string;
  link: string | null;
  read: boolean;
  replies: NotificationReply[] | null;
  created_at: string;
};

export interface NotificationReply {
  from: string;
  company: string;
  message: string;
  createdAt: string;
}

function toNotification(row: NotificationRow): Notification & { replies?: NotificationReply[] } {
  return {
    id: row.id,
    userId: row.profile_id,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
    ...(row.replies?.length && { replies: row.replies }),
  };
}

// ── 알림 ────────────────────────────────────────────────────

export async function listMyNotifications() {
  const { data, error } = await createClient()
    .from("notifications")
    .select("id, profile_id, message, link, read, replies, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as NotificationRow[]).map(toNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await createClient().from("notifications").update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await createClient()
    .from("notifications")
    .update({ read: true })
    .eq("read", false);
  if (error) throw new Error(error.message);
}

// 답변 작성자는 서버가 붙인다. 화면이 보낸 이름을 믿으면 남의 이름으로
// 답변을 남길 수 있다.
export async function replyToNotification(id: string, message: string): Promise<void> {
  const { error } = await createClient().rpc("reply_to_notification", {
    p_notification_id: id,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

export async function editNotificationReply(
  id: string,
  index: number,
  message: string | null
): Promise<void> {
  const { error } = await createClient().rpc("edit_my_notification_reply", {
    p_notification_id: id,
    p_index: index,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

export async function requestCompanyInfoChange(message: string): Promise<void> {
  const { error } = await createClient().rpc("request_company_info_change", {
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

// ── 공지 ────────────────────────────────────────────────────

export async function listNotices(): Promise<Notice[]> {
  const { data, error } = await createClient()
    .from("notices")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; title: string; content: string; created_at: string }[]).map(
    (r) => ({ id: r.id, title: r.title, content: r.content, createdAt: r.created_at })
  );
}

// 읽은 공지는 회원마다 다르다. 예전에는 회원별로 localStorage 키를 따로
// 만들어 썼다.
export async function listReadNoticeIds(): Promise<string[]> {
  const { data, error } = await createClient().from("notice_reads").select("notice_id");
  if (error) return [];
  return ((data ?? []) as { notice_id: string }[]).map((r) => r.notice_id);
}

export async function markNoticesRead(noticeIds: string[], profileId: string): Promise<void> {
  if (noticeIds.length === 0) return;
  const { error } = await createClient()
    .from("notice_reads")
    .upsert(
      noticeIds.map((id) => ({ notice_id: id, profile_id: profileId })),
      { onConflict: "notice_id,profile_id" }
    );
  if (error) throw new Error(error.message);
}

// ── 문의 ────────────────────────────────────────────────────

export interface InquiryReply {
  from: string;
  message: string;
  createdAt: string;
}

export type InquiryWithExtras = Inquiry & { title?: string; replies?: InquiryReply[] };

export async function listMyInquiries(): Promise<InquiryWithExtras[]> {
  const { data, error } = await createClient()
    .from("inquiries")
    .select("id, company, name, email, phone, type, title, message, status, replies, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; company: string | null; name: string; email: string; phone: string | null;
    type: string | null; title: string | null; message: string;
    status: Inquiry["status"]; replies: InquiryReply[] | null; created_at: string;
  }[]).map((r) => ({
    id: r.id,
    company: r.company ?? "",
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
    type: r.type ?? "",
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
    ...(r.title && { title: r.title }),
    ...(r.replies?.length && { replies: r.replies }),
  }));
}

export interface InquiryInput {
  company: string;
  name: string;
  email: string;
  phone?: string;
  type: string;
  title?: string;
  message: string;
  profileId?: string;
}

export async function createInquiry(input: InquiryInput): Promise<void> {
  const { error } = await createClient().from("inquiries").insert({
    company: input.company,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    type: input.type,
    title: input.title ?? null,
    message: input.message,
    profile_id: input.profileId ?? null,
  });
  if (error) throw new Error(error.message);
}

// ── 회사 멤버 · 초대 ────────────────────────────────────────

export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  isCompanyAdmin?: boolean;
  status?: string;
}

export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await createClient()
    .from("profiles")
    .select("id, name, status, is_company_admin")
    .eq("company_id", companyId);

  if (error) throw new Error(error.message);
  // 이메일은 auth.users에 있어 여기서 못 읽는다. 회사 멤버 목록에는
  // 이름과 상태만 보여준다.
  return ((data ?? []) as { id: string; name: string; status: string; is_company_admin: boolean }[]).map(
    (r) => ({ id: r.id, name: r.name, email: "", isCompanyAdmin: r.is_company_admin, status: r.status })
  );
}

export async function createCompanyInvite(email: string): Promise<{ token: string; email: string }> {
  const { data, error } = await createClient().rpc("create_company_invite", { p_email: email });
  if (error) throw new Error(error.message);
  const row = data as { token: string; email: string };
  return { token: row.token, email: row.email };
}

export async function delegateCompanyAdmin(targetId: string): Promise<void> {
  const { error } = await createClient().rpc("delegate_company_admin", { p_target: targetId });
  if (error) throw new Error(error.message);
}

export async function setMemberStatus(targetId: string, status: "approved" | "suspended"): Promise<void> {
  const { error } = await createClient().rpc("set_member_status", {
    p_target: targetId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await createClient().rpc("delete_my_account");
  if (error) throw new Error(error.message);
}

// 이름·연락처는 컬럼 권한으로 본인만 쓸 수 있게 열려 있다.
export async function updateMyProfile(name: string, phone: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("로그인이 필요합니다.");
  const { error } = await supabase
    .from("profiles")
    .update({ name, phone })
    .eq("id", data.user.id);
  if (error) throw new Error(error.message);
}

export async function updateMyPartnerCategories(categories: string[]): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("로그인이 필요합니다.");
  const { error } = await supabase
    .from("profiles")
    .update({ partner_categories: categories })
    .eq("id", data.user.id);
  if (error) throw new Error(error.message);
}

export async function changeMyPassword(newPassword: string): Promise<void> {
  const { error } = await createClient().auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export interface InviteInfo {
  email: string;
  companyName: string;
  businessNumber: string;
  invitedByName: string;
}

export async function getInviteByToken(token: string): Promise<InviteInfo | null> {
  const { data, error } = await createClient().rpc("get_invite_by_token", { p_token: token });
  if (error || !data || (data as unknown[]).length === 0) return null;
  const r = (data as {
    email: string; company_name: string; business_number: string; invited_by_name: string;
  }[])[0];
  return {
    email: r.email,
    companyName: r.company_name,
    businessNumber: r.business_number,
    invitedByName: r.invited_by_name,
  };
}
