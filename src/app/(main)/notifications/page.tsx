"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  listMyNotifications,
  listNotices,
  listReadNoticeIds,
  markNoticesRead,
  markNotificationRead as markNotificationReadApi,
  markAllNotificationsRead as markAllNotificationsReadApi,
  replyToNotification,
  editNotificationReply,
  type NotificationReply,
} from "@/lib/data/notices";
import type { Notification, Notice } from "@/types/auth";

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"notifications" | "notices">("notifications");
  const [notifications, setNotifications] = useState<(Notification & { replies?: NotificationReply[] })[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingReply, setEditingReply] = useState<{ notifId: string; replyIdx: number } | null>(null);
  const [editReplyText, setEditReplyText] = useState("");

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const [notifs, noticeList, readIds] = await Promise.all([
        listMyNotifications(),
        listNotices(),
        listReadNoticeIds(),
      ]);
      setNotifications(notifs);
      setNotices(noticeList);
      setReadNoticeIds(readIds);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    // 세션 확인이 끝나기 전에는 판단하지 않는다. 확인 중에도 user는 잠깐
    // null이라, 이걸 빼면 로그인한 사람도 로그인 화면으로 튕긴다.
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    reload();
  }, [user, router, reload, isLoading]);

  const run = async (fn: () => Promise<void>, successMessage?: string) => {
    try {
      await fn();
      await reload();
      if (successMessage) alert(successMessage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "처리하지 못했습니다.");
    }
  };

  const markNotificationRead = (id: string) => run(() => markNotificationReadApi(id));

  const markAllNotificationsRead = () => run(() => markAllNotificationsReadApi());

  const markNoticeRead = (noticeId: string) => {
    if (!user || readNoticeIds.includes(noticeId)) return;
    setReadNoticeIds((prev) => [...prev, noticeId]);
    markNoticesRead([noticeId], user.id).catch(console.error);
  };

  const markAllNoticesRead = () => {
    if (!user) return;
    const unread = notices.map((n) => n.id).filter((id) => !readNoticeIds.includes(id));
    if (unread.length === 0) return;
    setReadNoticeIds(notices.map((n) => n.id));
    markNoticesRead(unread, user.id).catch(console.error);
  };

  const sendReply = (notifId: string) => {
    if (!replyText.trim() || !user) return;
    const text = replyText;
    setReplyingTo(null);
    setReplyText("");
    run(() => replyToNotification(notifId, text), "답변이 전송되었습니다.");
  };

  const updateReply = (notifId: string, replyIdx: number) => {
    if (!editReplyText.trim() || !user) return;
    const text = editReplyText;
    setEditingReply(null);
    setEditReplyText("");
    run(() => editNotificationReply(notifId, replyIdx, text));
  };

  const deleteReply = (notifId: string, replyIdx: number) => {
    if (!confirm("답변을 삭제하시겠습니까?") || !user) return;
    run(() => editNotificationReply(notifId, replyIdx, null));
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const unreadNoticeCount = notices.filter((n) => !readNoticeIds.includes(n.id)).length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-foreground/50">불러오는 중...</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">알림 센터</h1>
        <p className="mt-1 text-sm text-foreground/50">관리자로부터 받은 알림과 공지사항을 확인하세요.</p>

        {/* 탭 */}
        <div className="mt-6 flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`relative border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === "notifications" ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"}`}
          >
            알림
            {unreadNotifCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{unreadNotifCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("notices")}
            className={`relative border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === "notices" ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"}`}
          >
            공지사항
            {unreadNoticeCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{unreadNoticeCount}</span>
            )}
          </button>
        </div>

        {/* 알림 탭 */}
        {activeTab === "notifications" && (
          <div className="mt-6">
            {notifications.length > 0 && unreadNotifCount > 0 && (
              <div className="mb-4 flex justify-end">
                <button onClick={markAllNotificationsRead} className="text-xs font-medium text-primary hover:underline">모두 읽음 처리</button>
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="mt-4 text-sm text-foreground/40">받은 알림이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...notifications].reverse().map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => { if (!notif.read) markNotificationRead(notif.id); }}
                    className={`cursor-pointer rounded-xl border p-4 transition-colors ${notif.read ? "border-border bg-background" : "border-blue-200 bg-blue-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${notif.read ? "bg-muted text-foreground/30" : "bg-blue-100 text-blue-600"}`}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                          </svg>
                        </div>
                        <div>
                          <p className="mb-0.5 text-xs text-primary/60">손잡다매칭 관리자</p>
                          <p className={`text-sm ${notif.read ? "text-foreground/60" : "font-medium text-foreground"}`}>{notif.message}</p>
                          <p className="mt-1 text-xs text-foreground/30">{new Date(notif.createdAt).toLocaleString("ko-KR")}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === notif.id ? null : notif.id); setReplyText(""); }}
                        className="flex-shrink-0 rounded px-2 py-1 text-xs font-medium text-foreground/50 hover:bg-muted hover:text-foreground">
                        답변
                      </button>
                    </div>
                    {/* 기존 답변 표시 */}
                    {(notif as Notification & { replies?: { from: string; company: string; message: string; createdAt: string }[] }).replies?.map((reply, ri) => (
                      <div key={ri} className="mt-2 ml-11 rounded-lg bg-muted/50 p-3" onClick={(e) => e.stopPropagation()}>
                        {editingReply?.notifId === notif.id && editingReply?.replyIdx === ri ? (
                          <div className="flex gap-2">
                            <input type="text" value={editReplyText} onChange={(e) => setEditReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && editReplyText.trim()) updateReply(notif.id, ri); }}
                              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
                            <button onClick={() => updateReply(notif.id, ri)} className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5">저장</button>
                            <button onClick={() => setEditingReply(null)} className="rounded px-2 py-1 text-xs text-foreground/40 hover:bg-muted">취소</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <p className="text-xs text-foreground/40">{reply.company} {reply.from} · {new Date(reply.createdAt).toLocaleString("ko-KR")}</p>
                              {reply.from === user?.name && (
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingReply({ notifId: notif.id, replyIdx: ri }); setEditReplyText(reply.message); }}
                                    className="rounded px-1.5 py-0.5 text-xs text-foreground/30 hover:text-primary">수정</button>
                                  <button onClick={() => deleteReply(notif.id, ri)}
                                    className="rounded px-1.5 py-0.5 text-xs text-foreground/30 hover:text-red-500">삭제</button>
                                </div>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-foreground/70">{reply.message}</p>
                          </>
                        )}
                      </div>
                    ))}
                    {/* 답변 입력란 */}
                    {replyingTo === notif.id && (
                      <div className="mt-3 ml-11 flex gap-2">
                        <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                          placeholder="답변을 입력하세요"
                          onKeyDown={(e) => { if (e.key === "Enter" && replyText.trim()) sendReply(notif.id); }}
                          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        <button onClick={() => sendReply(notif.id)}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark">전송</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 공지사항 탭 */}
        {activeTab === "notices" && (
          <div className="mt-6">
            {notices.length > 0 && unreadNoticeCount > 0 && (
              <div className="mb-4 flex justify-end">
                <button onClick={markAllNoticesRead} className="text-xs font-medium text-primary hover:underline">모두 읽음 처리</button>
              </div>
            )}
            {notices.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
                <p className="mt-4 text-sm text-foreground/40">등록된 공지사항이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...notices].reverse().map((notice) => {
                  const isRead = readNoticeIds.includes(notice.id);
                  return (
                    <div
                      key={notice.id}
                      className={`rounded-xl border p-5 transition-colors ${isRead ? "border-border bg-background" : "border-amber-200 bg-amber-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            {!isRead && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                            <h3 className={`text-sm ${isRead ? "font-medium text-foreground/60" : "font-semibold text-foreground"}`}>{notice.title}</h3>
                          </div>
                          <p className={`mt-2 whitespace-pre-wrap text-sm ${isRead ? "text-foreground/40" : "text-foreground/70"}`}>{notice.content}</p>
                          <p className="mt-2 text-xs text-foreground/30">{new Date(notice.createdAt).toLocaleString("ko-KR")}</p>
                        </div>
                        {!isRead && (
                          <button onClick={() => markNoticeRead(notice.id)} className="flex-shrink-0 rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-100">
                            읽음
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
