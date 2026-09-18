"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  listPartnerRequests,
  upsertMyQuote,
  uploadQuoteAttachment,
  withdrawMyQuote,
  getAttachmentUrl,
} from "@/lib/data/requests";
import {
  listNotices,
  listMyNotifications,
  markNotificationRead as markNotificationReadApi,
} from "@/lib/data/notices";
import MatchContactPanel from "@/components/dashboard/MatchContact";
import { quoteStatusLabels, defaultTimeline } from "@/types/matching";
import type { MatchRequest, Quote, QuoteStatus, TimelineItem } from "@/types/matching";
import type { Notice, Notification } from "@/types/auth";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MatchRequest | null>(null);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [quoteForm, setQuoteForm] = useState({
    subjectCount: "", siteCountCapital: "", siteCountLocal: "",
    trialDuration: "", perSubjectDuration: "",
    timeline: defaultTimeline.map((t) => ({ ...t })),
    amount: "", memo: "",
    expectedCra: "", monitoringPerSite: "", edcBrand: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "closed" | QuoteStatus>("all");
  const [sentSortBy, setSentSortBy] = useState<"quoteCode" | "title" | "category" | "client" | "amount" | "status" | "date">("date");
  const [sentSortDir, setSentSortDir] = useState<"asc" | "desc">("desc");
  const toggleSentSort = (key: typeof sentSortBy) => {
    if (sentSortBy === key) setSentSortDir(sentSortDir === "asc" ? "desc" : "asc");
    else { setSentSortBy(key); setSentSortDir("asc"); }
  };
  const [activeSection, setActiveSection] = useState<"activity" | "received" | "sent" | "won">("activity");

  // 어떤 의뢰가 보이는지는 서버가 정한다. 내 카테고리의 열린 의뢰와, 우리
  // 회사가 견적을 낸 의뢰만 응답에 담겨 온다. 자기 회사가 올린 의뢰는
  // 애초에 오지 않는다.
  const loadRequests = useCallback(async () => {
    if (!user) return;
    try {
      setRequests(await listPartnerRequests());
    } catch (err) {
      console.error(err);
      setRequests([]);
    }
  }, [user]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const loadNotices = useCallback(async () => {
    if (!user) return;
    try {
      const [noticeList, notifs] = await Promise.all([listNotices(), listMyNotifications()]);
      setNotices(noticeList);
      setNotifications(notifs);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  const markNotificationRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      await loadNotices();
    } catch (err) {
      console.error(err);
    }
  };

  // 의뢰서에서 위탁업무 파싱하여 타임라인 생성
  const getTimelineFromRequest = (request: MatchRequest): TimelineItem[] => {
    // 보험 의뢰는 업무범위/소요개월 개념이 없으므로 빈 목록
    if (request.category === "임상시험 보험") return [];
    const lines = (request.description || "").split("\n");
    const tasksLine = lines.find((l) => l.startsWith("위탁업무:"));
    if (!tasksLine) return defaultTimeline.map((t) => ({ ...t }));
    const requestTasks = tasksLine.split(": ").slice(1).join(": ").split(", ").map((t) => t.trim());
    return requestTasks.map((label) => ({ label, months: "", na: false }));
  };

  // 견적의 주인은 회사다. 같은 회사 담당자끼리는 하나의 견적을 이어서 다룬다.
  const getMyQuote = (request: MatchRequest) =>
    user ? (request.quotes || []).find((q) => q.companyId === user.companyId) : undefined;

  const getMyQuoteStatus = (request: MatchRequest): QuoteStatus =>
    getMyQuote(request)?.status ?? "new";

  // 한 회사당 한 의뢰에 견적 하나라는 규칙은 DB의 유니크 제약이 지킨다.
  // 동료가 먼저 낸 견적이 있으면 그게 곧 "내 회사 견적"이다.
  const hasCompanyQuote = (request: MatchRequest): boolean => {
    const mine = getMyQuote(request);
    return !!mine && mine.partnerId !== user?.id &&
      ["quoted", "client_reviewing", "accepted", "client_hold", "reviewing"].includes(mine.status);
  };

  // 총 예상시간 계산
  const totalMonths = quoteForm.timeline.reduce((sum, t) => sum + (parseFloat(t.months) || 0), 0);

  // 견적 고유번호(QT-)는 DB 시퀀스가 붙인다. 예전처럼 기존 최대값+1로
  // 만들면 두 회사가 동시에 제출할 때 같은 번호가 나온다.
  const buildQuoteInput = () => ({
    amount: quoteForm.amount,
    duration: `${totalMonths}개월`,
    memo: quoteForm.memo,
    timeline: quoteForm.timeline,
    details: {
      subjectCount: quoteForm.subjectCount,
      siteCountCapital: quoteForm.siteCountCapital,
      siteCountLocal: quoteForm.siteCountLocal,
      trialDuration: quoteForm.trialDuration,
      perSubjectDuration: quoteForm.perSubjectDuration,
      expectedCra: quoteForm.expectedCra,
      monitoringPerSite: quoteForm.monitoringPerSite,
      edcBrand: quoteForm.edcBrand,
    },
  });

  // 제출·임시저장·거절·보류·재개가 전부 "내 회사 견적을 이 상태로 쓴다"라서
  // 한 곳으로 모은다. 서버가 자기 회사 의뢰인지, 마감됐는지, 의뢰사가 이미
  // 확인했는지를 검사하고 거부 사유를 그대로 돌려준다.
  const writeQuote = async (
    requestId: string,
    status: QuoteStatus,
    input: Parameters<typeof upsertMyQuote>[2] = {}
  ) => {
    try {
      await upsertMyQuote(requestId, status, input);
      setSelectedRequest(null);
      await loadRequests();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : "처리하지 못했습니다.");
      return false;
    }
  };

  // 견적 제출
  const submitQuote = async () => {
    if (!user || !selectedRequest) return;
    // 업무범위 소요개월 체크
    const emptyTimeline = quoteForm.timeline.filter((t) => !t.months.trim());
    if (emptyTimeline.length > 0) { alert(`업무범위의 "${emptyTimeline[0].label}" 소요개월을 입력해주세요.`); return; }
    // 모니터링 횟수 체크
    if (quoteForm.timeline.some((t) => t.label === "모니터링") && !quoteForm.monitoringPerSite.trim()) { alert("기관별 모니터링 횟수를 입력해주세요."); return; }
    // 견적금액 체크
    if (!quoteForm.amount.trim()) { alert("견적 금액을 입력해주세요."); return; }
    // 첨부파일 체크 (이미 올려둔 게 있으면 다시 안 올려도 된다)
    const existing = getMyQuote(selectedRequest);
    if (!attachment && !existing?.attachmentName) { alert("견적서 파일을 첨부해주세요."); return; }
    // 한 회사당 하나 규칙은 DB가 지킨다. 동료가 이미 낸 견적이 있으면 막는다.
    if (hasCompanyQuote(selectedRequest)) {
      alert("동일 회사에서 이미 이 의뢰에 견적을 제출했습니다.\n한 회사당 하나의 견적만 제출할 수 있습니다.");
      return;
    }

    if (!confirm("최종 견적서를 제출하시겠습니까?\n의뢰사가 견적을 확인한 이후에는 수정 및 회수가 불가능합니다.")) return;

    setIsSaving(true);
    const uploaded = await uploadAttachmentIfAny(selectedRequest.id);
    if (uploaded === null) { setIsSaving(false); return; }  // 첨부 실패 시 제출하지 않는다
    const ok = await writeQuote(selectedRequest.id, "quoted", { ...buildQuoteInput(), ...uploaded });
    setIsSaving(false);
    if (!ok) return;

    setQuoteForm({ subjectCount: "", siteCountCapital: "", siteCountLocal: "", trialDuration: "", perSubjectDuration: "", timeline: [], amount: "", memo: "", expectedCra: "", monitoringPerSite: "", edcBrand: "" });
    setAttachment(null);
    setIsEditing(false);
    alert("견적서가 제출되었습니다.");
  };

  // 의뢰 거절
  const rejectRequest = async (requestId: string) => {
    if (!user || !confirm("이 의뢰를 거절하시겠습니까?")) return;
    await writeQuote(requestId, "rejected", { memo: "거절" });
  };

  // 임시저장
  const saveDraft = async (requestId: string) => {
    if (!user || !selectedRequest) return;
    setIsSaving(true);
    const uploaded = await uploadAttachmentIfAny(requestId);
    if (uploaded === null) { setIsSaving(false); return; }
    const ok = await writeQuote(requestId, "reviewing", { ...buildQuoteInput(), ...uploaded });
    setIsSaving(false);
    if (!ok) return;
    setIsEditing(false);
    alert("임시저장되었습니다.");
  };

  // 첨부파일은 행에 base64로 담지 않고 Storage에 올린다. 5MB짜리 파일을
  // 문자열로 바꾸면 DB 행이 그만큼 부풀고 목록 조회까지 같이 느려진다.
  //
  // 업로드가 실패하면 null을 돌려준다. 예전에는 빈 객체를 돌려줘서 제출이
  // 그대로 진행됐고, 첨부가 필수인데도 파일 없이 견적만 올라간 뒤
  // "제출되었습니다"가 떴다.
  const uploadAttachmentIfAny = async (requestId: string) => {
    if (!attachment || !user) return {};
    try {
      const { path, name } = await uploadQuoteAttachment(user.companyId, requestId, attachment);
      return { attachmentPath: path, attachmentName: name };
    } catch (err) {
      alert(err instanceof Error ? err.message : "첨부파일 업로드에 실패했습니다.");
      return null;
    }
  };

  // 첨부파일은 비공개 버킷에 있어 주소를 그대로 열 수 없다. 볼 때마다
  // 짧게 유효한 서명 링크를 받아서 연다.
  const openAttachment = async (path?: string) => {
    if (!path) return;
    const url = await getAttachmentUrl(path);
    if (url) window.open(url, "_blank");
    else alert("첨부파일을 열지 못했습니다.");
  };

  // 파일 첨부 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하만 가능합니다.");
      return;
    }
    setAttachment(file);
  };

  // 받은 의뢰 = 아직 열려 있는(pending) 의뢰. 숫자(stats)와 목록(filteredRequests)이 동일 집합을 사용한다.
  const openRequests = requests.filter((r) => r.status === "pending");
  // 마감된 의뢰 = 매칭 성사/완료/회수된 의뢰 (더 이상 견적 제출 불가)
  const closedRequests = requests.filter(
    (r) => r.status === "matched" || r.status === "completed" || r.status === "cancelled"
  );

  // 필터링 ("마감" 탭은 closedRequests, 나머지는 열린 의뢰를 견적상태별로)
  const filteredRequests = (
    filterStatus === "closed"
      ? closedRequests
      : openRequests.filter((r) => filterStatus === "all" || getMyQuoteStatus(r) === filterStatus)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 보류 처리
  const holdRequest = async (requestId: string) => {
    await writeQuote(requestId, "hold", { memo: "보류" });
  };

  // 보류→검토중 재전환
  const resumeReview = async (requestId: string) => {
    await writeQuote(requestId, "reviewing");
  };

  // 보낸 견적: quoted 상태인 것
  const sentQuotes = requests.filter((r) => ["quoted", "client_reviewing", "accepted", "client_hold", "client_rejected", "not_selected"].includes(getMyQuoteStatus(r)));
  // 매칭 성사: 매칭 성사된 요청 중 내 견적이 있는 것
  const wonRequests = requests.filter((r) => (r.status === "matched" || r.status === "completed") && (r.quotes || []).some((q) => q.companyId === user?.companyId && q.status === "accepted"));

  const stats = {
    total: openRequests.length,
    newCount: openRequests.filter((r) => getMyQuoteStatus(r) === "new").length,
    reviewing: openRequests.filter((r) => getMyQuoteStatus(r) === "reviewing").length,
    quoted: sentQuotes.length,
    rejected: openRequests.filter((r) => getMyQuoteStatus(r) === "rejected").length,
    hold: openRequests.filter((r) => getMyQuoteStatus(r) === "hold").length,
    won: wonRequests.length,
    closed: closedRequests.length,
  };

  // 전체 활동 피드 생성
  type ActivityType = "received" | "draft" | "submitted" | "rejected" | "hold" | "won" | "notification";
  interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    detail: string;
    date: string;
    requestId?: string;
  }

  const activityConfig: Record<ActivityType, { icon: string; color: string; bgColor: string }> = {
    received: { icon: "M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z", color: "text-blue-600", bgColor: "bg-blue-100" },
    draft: { icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10", color: "text-amber-600", bgColor: "bg-amber-100" },
    submitted: { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-600", bgColor: "bg-emerald-100" },
    rejected: { icon: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-red-500", bgColor: "bg-red-100" },
    hold: { icon: "M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-gray-500", bgColor: "bg-gray-100" },
    won: { icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0", color: "text-amber-600", bgColor: "bg-amber-100" },
    notification: { icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0", color: "text-purple-600", bgColor: "bg-purple-100" },
  };

  const activities: Activity[] = [];

  // 의뢰 수신
  requests.forEach((req) => {
    activities.push({ id: `recv-${req.id}`, type: "received", title: `"${req.title}" 의뢰를 받았습니다`, detail: `${req.clientCompany} | ${req.category}`, date: req.createdAt, requestId: req.id });
  });

  // 견적 관련 활동
  requests.forEach((req) => {
    (req.quotes || []).filter((q) => q.companyId === user?.companyId).forEach((q) => {
      if (q.status === "reviewing") {
        activities.push({ id: `draft-${q.id}`, type: "draft", title: `"${req.title}" 견적서를 임시저장했습니다`, detail: q.amount ? `금액: ${q.amount}` : "작성 중", date: q.createdAt, requestId: req.id });
      } else if (q.status === "quoted") {
        activities.push({ id: `submit-${q.id}`, type: "submitted", title: `"${req.title}" 견적서를 제출했습니다`, detail: `금액: ${q.amount}${q.attachmentName ? " | 첨부: " + q.attachmentName : ""}`, date: q.createdAt, requestId: req.id });
      } else if (q.status === "rejected") {
        activities.push({ id: `reject-${q.id}`, type: "rejected", title: `"${req.title}" 의뢰를 거절했습니다`, detail: req.clientCompany, date: q.createdAt, requestId: req.id });
      } else if (q.status === "hold") {
        activities.push({ id: `hold-${q.id}`, type: "hold", title: `"${req.title}" 의뢰를 보류했습니다`, detail: req.clientCompany, date: q.createdAt, requestId: req.id });
      }
    });
  });

  // 매칭 성사
  wonRequests.forEach((req) => {
    activities.push({ id: `won-${req.id}`, type: "won", title: `"${req.title}" 수주에 성공했습니다`, detail: `${req.clientCompany} | 예산: ${req.budget}`, date: req.createdAt, requestId: req.id });
  });

  // 알림
  notifications.forEach((notif) => {
    activities.push({ id: `notif-${notif.id}`, type: "notification", title: "관리자로부터 알림을 받았습니다", detail: notif.message, date: notif.createdAt });
  });

  // 공지사항
  notices.forEach((notice) => {
    activities.push({ id: `notice-${notice.id}`, type: "notification", title: `공지사항: ${notice.title}`, detail: notice.content, date: notice.createdAt });
  });

  // 최신순 정렬
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 계정 상태 안내 */}
        {user?.status === "restricted" && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <p className="text-sm font-medium text-amber-800">계정이 제한되었습니다</p>
            </div>
            <p className="mt-1 text-sm text-amber-600">관리자의 확인이 필요합니다. 알림을 확인하시거나 관리자에게 문의해주세요. 현재 조회만 가능합니다.</p>
          </div>
        )}
        {user?.status === "suspended" && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              <p className="text-sm font-medium text-red-800">계정이 정지되었습니다</p>
            </div>
            <p className="mt-1 text-sm text-red-600">서비스 이용이 제한됩니다. 관리자에게 문의해주세요.</p>
          </div>
        )}

        {/* 상단 */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">파트너사 대시보드</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {user?.company}에 들어온 의뢰를 확인하고 견적서를 제출하세요.
          </p>
        </div>

        {/* 메인 카드 3개 */}
        <div className="sticky top-[108px] z-30 mt-8 grid grid-cols-1 gap-4 bg-muted pb-4 sm:grid-cols-3">
          <button onClick={() => { setActiveSection("received"); setFilterStatus("all"); }}
            className={`rounded-xl border p-6 text-left transition-all ${activeSection === "received" ? "border-primary bg-primary/5 shadow-md" : "border-border bg-surface shadow-card hover:border-primary/30 hover:shadow-md"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50">받은 의뢰</p>
                <p className="mt-1 text-3xl font-bold text-primary">{stats.total}</p>
                <p className="mt-1 text-xs text-foreground/40">신규 {stats.newCount} | 검토중 {stats.reviewing}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-light p-3 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" /></svg>
              </div>
            </div>
          </button>
          <button onClick={() => setActiveSection("sent")}
            className={`rounded-xl border p-6 text-left transition-all ${activeSection === "sent" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-border bg-surface shadow-card hover:border-emerald-300 hover:shadow-md"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50">보낸 견적</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600">{stats.quoted}</p>
                <p className="mt-1 text-xs text-foreground/40">제출 완료된 견적서</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 p-3 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
            </div>
          </button>
          <button onClick={() => setActiveSection("won")}
            className={`rounded-xl border p-6 text-left transition-all ${activeSection === "won" ? "border-amber-500 bg-amber-50 shadow-md" : "border-border bg-surface shadow-card hover:border-amber-300 hover:shadow-md"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50">매칭 성사</p>
                <p className="mt-1 text-3xl font-bold text-amber-600">{stats.won}</p>
                <p className="mt-1 text-xs text-foreground/40">매칭 성사된 프로젝트</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 p-3 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" /></svg>
              </div>
            </div>
          </button>
        </div>

        {/* 섹션 탭 */}
        <div className="mt-6 flex gap-2 border-b border-border pb-0">
          {([
            { key: "activity" as const, label: "전체 활동" },
            { key: "received" as const, label: "받은 의뢰" },
            { key: "sent" as const, label: "보낸 견적" },
            { key: "won" as const, label: "매칭 성사" },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => { setActiveSection(tab.key); if (tab.key === "received") setFilterStatus("all"); }}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeSection === tab.key ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ 전체 활동 섹션 ═══ */}
        {activeSection === "activity" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">전체 활동</h2>
            <p className="mt-1 text-sm text-foreground/50">모든 활동 내역을 시간순으로 확인하세요.</p>
            <div className="mt-4">
              {activities.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">아직 활동 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* 타임라인 세로선 */}
                  <div className="absolute left-5 top-3 bottom-3 w-px bg-border" />
                  {activities.map((act) => {
                    const config = activityConfig[act.type];
                    const req = act.requestId ? requests.find((r) => r.id === act.requestId) : null;
                    return (
                      <div key={act.id}
                        onClick={() => {
                          if (req) {
                            setSelectedRequest(req);
                            const myQuote = (req.quotes || []).find((q) => q.companyId === user?.companyId);
                            if (myQuote && myQuote.status === "reviewing") {
                              setQuoteForm({ subjectCount: "", siteCountCapital: "", siteCountLocal: "", trialDuration: "", perSubjectDuration: "", timeline: myQuote.timeline || getTimelineFromRequest(req), amount: myQuote.amount, memo: myQuote.memo, expectedCra: myQuote.expectedCra || "", monitoringPerSite: myQuote.monitoringPerSite || "", edcBrand: myQuote.edcBrand || "" });
                              // 이미 올라간 첨부는 서버에 있다. 다시 고르지 않으면 그대로 유지된다.
                              setAttachment(null);
                            } else { setQuoteForm({ subjectCount: "", siteCountCapital: "", siteCountLocal: "", trialDuration: "", perSubjectDuration: "", timeline: req ? getTimelineFromRequest(req) : [], amount: "", memo: "", expectedCra: "", monitoringPerSite: "", edcBrand: "" }); setAttachment(null); }
                          } else if (act.type === "notification") {
                            markNotificationRead(act.id.replace("notif-", ""));
                            router.push("/notifications");
                          }
                        }}
                        className={`relative flex gap-4 py-3 cursor-pointer`}>
                        {/* 아이콘 */}
                        <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                          <svg className={`h-5 w-5 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={config.icon} />
                          </svg>
                        </div>
                        {/* 내용 */}
                        <div className="flex-1 rounded-xl border border-border bg-surface shadow-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
                          <p className="text-sm font-medium text-foreground">{act.title}</p>
                          <p className="mt-0.5 text-xs text-foreground/50">{act.detail}</p>
                          <p className="mt-1 text-xs text-foreground/30">{new Date(act.date).toLocaleString("ko-KR")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}


        {/* ═══ 받은 의뢰 섹션 ═══ */}
        {activeSection === "received" && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">받은 의뢰</h2>
            </div>
            {/* 상태 필터 탭 */}
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {([
                { key: "all" as const, label: "전체", count: stats.total },
                { key: "new" as const, label: "신규", count: stats.newCount },
                { key: "reviewing" as const, label: "검토중", count: stats.reviewing },
                { key: "hold" as const, label: "보류", count: stats.hold },
                { key: "rejected" as const, label: "거절", count: stats.rejected },
                { key: "closed" as const, label: "마감", count: stats.closed },
              ]).map((tab) => (
                <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === tab.key ? "bg-primary text-white" : "bg-surface text-foreground/60 hover:bg-muted"}`}>
                  {tab.label} {tab.count > 0 && <span className="ml-0.5">{tab.count}</span>}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">{requests.length === 0 ? "아직 받은 의뢰가 없습니다." : "해당 상태의 의뢰가 없습니다."}</p>
                  {!user?.partnerCategories?.length && <p className="mt-2 text-sm text-foreground/40">파트너 카테고리가 설정되지 않았습니다.</p>}
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const myStatus = getMyQuoteStatus(req);
                  const statusInfo = quoteStatusLabels[myStatus];
                  const closedLabel = req.status === "cancelled" ? "회수됨" : (req.status === "matched" || req.status === "completed") ? "마감(매칭 성사)" : null;
                  return (
                    <div key={req.id} onClick={() => {
                      setSelectedRequest(req);
                      const myQuote = (req.quotes || []).find((q) => q.companyId === user?.companyId);
                      if (myQuote && (myQuote.status === "reviewing" || myQuote.status === "quoted")) {
                        setQuoteForm({
                          subjectCount: myQuote.subjectCount || "", siteCountCapital: myQuote.siteCountCapital || "", siteCountLocal: myQuote.siteCountLocal || "",
                          trialDuration: myQuote.trialDuration || "", perSubjectDuration: myQuote.perSubjectDuration || "",
                          timeline: myQuote.timeline || getTimelineFromRequest(req),
                          amount: myQuote.amount, memo: myQuote.memo,
                          expectedCra: myQuote.expectedCra || "", monitoringPerSite: myQuote.monitoringPerSite || "", edcBrand: myQuote.edcBrand || "",
                        });
                        setAttachment(null);
                      } else {
                        setQuoteForm({ subjectCount: "", siteCountCapital: "", siteCountLocal: "", trialDuration: "", perSubjectDuration: "", timeline: getTimelineFromRequest(req), amount: "", memo: "", expectedCra: "", monitoringPerSite: "", edcBrand: "" });
                        setAttachment(null);
                      }
                    }} className="cursor-pointer rounded-xl border border-border bg-surface shadow-card p-5 transition-all hover:border-primary hover:shadow-lg">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{req.category}</span>
                        {closedLabel ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">{closedLabel}</span>
                        ) : (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                        )}
                        <span className="text-xs text-foreground/40">{new Date(req.createdAt).toLocaleDateString("ko-KR")}</span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-foreground">{req.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-4 text-xs text-foreground/50">
                        <span className="break-all">의뢰사: {req.clientCompany}</span>
                        <span>예산: {req.budget}</span>
                        <span>마감: {req.deadline === "미정" ? "미정" : new Date(req.deadline).toLocaleDateString("ko-KR")}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══ 보낸 견적 섹션 ═══ */}
        {activeSection === "sent" && (() => {
          return (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">보낸 견적</h2>
            <p className="mt-1 text-sm text-foreground/50">제출 완료한 견적서 목록입니다.</p>
            <div className="mt-4">
              {sentQuotes.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">제출한 견적이 없습니다.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-surface shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {([
                            { key: "quoteCode" as const, label: "견적번호", align: "text-center" },
                            { key: "title" as const, label: "프로젝트명", align: "text-center" },
                            { key: "category" as const, label: "서비스유형", align: "text-center" },
                            { key: "client" as const, label: "의뢰사", align: "text-center" },
                            { key: "amount" as const, label: "견적금액", align: "text-center" },
                            { key: "status" as const, label: "상태", align: "text-center" },
                            { key: "date" as const, label: "제출일", align: "text-center" },
                          ]).map((col) => (
                            <th key={col.key} onClick={() => toggleSentSort(col.key)}
                              className={`cursor-pointer select-none px-4 py-3 font-medium text-foreground/50 hover:text-foreground ${col.align}`}>
                              {col.label} {sentSortBy === col.key && <span className="text-primary">{sentSortDir === "asc" ? "▲" : "▼"}</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...sentQuotes].sort((a, b) => {
                          const aQ = (a.quotes || []).find((q) => q.companyId === user?.companyId);
                          const bQ = (b.quotes || []).find((q) => q.companyId === user?.companyId);
                          let cmp = 0;
                          if (sentSortBy === "quoteCode") cmp = (aQ?.quoteCode || "").localeCompare(bQ?.quoteCode || "");
                          else if (sentSortBy === "title") cmp = a.title.localeCompare(b.title);
                          else if (sentSortBy === "category") cmp = a.category.localeCompare(b.category);
                          else if (sentSortBy === "client") cmp = a.clientCompany.localeCompare(b.clientCompany);
                          else if (sentSortBy === "amount") cmp = Number((aQ?.amount || "0").replace(/[^\d]/g, "")) - Number((bQ?.amount || "0").replace(/[^\d]/g, ""));
                          else if (sentSortBy === "status") cmp = (aQ?.status || "").localeCompare(bQ?.status || "");
                          else if (sentSortBy === "date") cmp = new Date(aQ?.createdAt || 0).getTime() - new Date(bQ?.createdAt || 0).getTime();
                          return sentSortDir === "desc" ? -cmp : cmp;
                        }).map((req) => {
                          const myQuote = (req.quotes || []).find((q) => q.companyId === user?.companyId && ["quoted", "client_reviewing", "accepted", "client_hold", "client_rejected", "not_selected"].includes(q.status));
                          const isOpen = selectedRequest?.id === req.id && activeSection === "sent";
                          const statusLabel = myQuote?.status === "accepted" ? "수락됨" : myQuote?.status === "client_reviewing" ? "의뢰사 검토중" : myQuote?.status === "client_rejected" ? "거절됨" : myQuote?.status === "not_selected" ? "미결정" : myQuote?.status === "client_hold" ? "의뢰사 보류" : "견적완료";
                          const statusColor = myQuote?.status === "accepted" ? "bg-primary/10 text-primary" : myQuote?.status === "client_reviewing" ? "bg-amber-100 text-amber-700" : myQuote?.status === "client_rejected" ? "bg-red-100 text-red-600" : myQuote?.status === "not_selected" ? "bg-gray-100 text-gray-500" : myQuote?.status === "client_hold" ? "bg-gray-100 text-gray-600" : "bg-emerald-100 text-emerald-700";
                          return (
                            <React.Fragment key={req.id}>
                              <tr onClick={() => setSelectedRequest(isOpen ? null : req)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                                <td className="px-4 py-3 text-left font-mono text-xs text-foreground/50">{myQuote?.quoteCode || "-"}</td>
                                <td className="px-4 py-3 text-center font-medium text-foreground">{req.title}</td>
                                <td className="px-4 py-3 text-center"><span className="rounded-lg bg-muted px-2 py-0.5 text-xs text-foreground/60">{req.category}</span></td>
                                <td className="px-4 py-3 text-center break-all text-foreground/70">{req.clientCompany}</td>
                                <td className="px-4 py-3 text-right font-semibold text-primary">{myQuote?.amount || "-"}원</td>
                                <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>{statusLabel}</span></td>
                                <td className="px-4 py-3 text-center text-xs text-foreground/50">{myQuote ? new Date(myQuote.createdAt).toLocaleDateString("ko-KR") : "-"}</td>
                              </tr>
                              {isOpen && (
                                <tr><td colSpan={7} className="bg-muted/10 px-4 py-4">
                                  <div className="space-y-3">
                                    {/* 견적 상세 */}
                                    <div className="grid grid-cols-3 gap-3">
                                      <div className="rounded-lg border border-border bg-surface p-3 text-center">
                                        <p className="text-xs text-foreground/40">견적 금액</p>
                                        <p className="mt-1 text-lg font-bold text-primary">{myQuote?.amount}원</p>
                                      </div>
                                      <div className="rounded-lg border border-border bg-surface p-3 text-center">
                                        <p className="text-xs text-foreground/40">소요 기간</p>
                                        <p className="mt-1 text-base font-semibold text-foreground">{myQuote?.duration || "-"}</p>
                                      </div>
                                      <div className="rounded-lg border border-border bg-surface p-3 text-center">
                                        <p className="text-xs text-foreground/40">의뢰 예산</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">{req.budget}</p>
                                      </div>
                                    </div>
                                    {/* 업무범위 */}
                                    {myQuote?.timeline && myQuote.timeline.filter((t: { months: string }) => t.months).length > 0 && (
                                      <div>
                                        <p className="text-xs text-foreground/40">업무범위 및 소요개월</p>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                          {myQuote.timeline.filter((t: { months: string }) => t.months).map((t: { label: string; months: string }, ti: number) => (
                                            <span key={ti} className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
                                              <span className="text-foreground/60">{t.label}</span> <span className="font-semibold text-foreground">{t.months}개월</span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* 모니터링/EDC */}
                                    {(myQuote?.expectedCra || myQuote?.monitoringPerSite || myQuote?.edcBrand) && (
                                      <div className="flex flex-wrap gap-3 text-sm">
                                        {myQuote.expectedCra && <span className="rounded-md border border-border bg-surface px-2 py-1 text-xs">CRA {myQuote.expectedCra}명</span>}
                                        {myQuote.monitoringPerSite && <span className="rounded-md border border-border bg-surface px-2 py-1 text-xs">모니터링 {myQuote.monitoringPerSite}회/기관</span>}
                                        {myQuote.edcBrand && <span className="rounded-md border border-border bg-surface px-2 py-1 text-xs">EDC: {myQuote.edcBrand}</span>}
                                      </div>
                                    )}
                                    {/* 메모 */}
                                    {myQuote?.memo && (
                                      <div className="rounded-lg bg-surface p-3"><p className="text-xs text-foreground/40">메모</p><p className="mt-0.5 text-sm text-foreground/70">{myQuote.memo}</p></div>
                                    )}
                                    {/* 첨부파일 */}
                                    {myQuote?.attachmentName && (
                                      <button onClick={() => openAttachment(myQuote.attachmentData)}
                                        className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3 text-primary/70 hover:border-primary hover:text-primary">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                        <span className="text-sm">{myQuote.attachmentName}</span>
                                      </button>
                                    )}
                                    {/* 수정/회수 or 안내 */}
                                    {req.status === "pending" && myQuote?.status === "quoted" ? (
                                      <div className="flex gap-2">
                                        <button onClick={() => {
                                          setSelectedRequest(req);
                                          if (myQuote) {
                                            setQuoteForm({ subjectCount: "", siteCountCapital: "", siteCountLocal: "", trialDuration: "", perSubjectDuration: "", timeline: myQuote.timeline || getTimelineFromRequest(req), amount: myQuote.amount, memo: myQuote.memo, expectedCra: "", monitoringPerSite: "", edcBrand: "" });
                                            setAttachment(null);
                                          }
                                          setIsEditing(true);
                                        }} className="rounded-lg border border-primary/30 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5">수정</button>
                                        <button onClick={async () => {
                                          if (!confirm("제출한 견적서를 회수하시겠습니까?\n회수된 견적은 의뢰사에게 더 이상 노출되지 않습니다.")) return;
                                          try {
                                            await withdrawMyQuote(req.id);
                                            setSelectedRequest(null);
                                            await loadRequests();
                                          } catch (err) {
                                            alert(err instanceof Error ? err.message : "회수하지 못했습니다.");
                                          }
                                        }} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50">견적 회수</button>
                                      </div>
                                    ) : (
                                      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                                        {myQuote?.status === "accepted" ? "의뢰사가 수락한 견적입니다." : myQuote?.status === "client_rejected" ? "의뢰사가 거절한 견적입니다." : myQuote?.status === "not_selected" ? "다른 파트너사가 선정되었습니다." : myQuote?.status === "client_reviewing" ? "의뢰사가 검토 중입니다. 수정/회수가 불가합니다." : myQuote?.status === "client_hold" ? "의뢰사가 보류한 견적입니다." : "의뢰사가 확인한 견적은 수정/회수가 불가합니다."}
                                      </p>
                                    )}
                                  </div>
                                </td></tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* ═══ 매칭 성사 섹션 ═══ */}
        {activeSection === "won" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">매칭 성사</h2>
            <p className="mt-1 text-sm text-foreground/50">매칭이 완료되어 수주한 프로젝트입니다.</p>
            <div className="mt-4 space-y-4">
              {wonRequests.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">아직 매칭 성사한 프로젝트가 없습니다.</p>
                  <p className="mt-1 text-sm text-foreground/40">견적서를 제출하고 의뢰사의 선택을 기다려보세요.</p>
                </div>
              ) : wonRequests.map((req) => {
                const myQuote = (req.quotes || []).find((q) => q.companyId === user?.companyId);
                return (
                  <div key={req.id} onClick={() => setSelectedRequest(req)}
                    className="cursor-pointer rounded-xl border border-amber-200 bg-amber-50/50 p-5 transition-all hover:border-amber-400 hover:shadow-lg">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{req.category}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">매칭 성사</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-foreground">{req.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-foreground/50">
                      <span>의뢰사: {req.clientCompany}</span>
                      <span>견적금액: <span className="font-medium text-foreground">{myQuote?.amount}</span></span>
                      <span>예산: {req.budget}</span>
                    </div>
                    {/* 의뢰사 연락처 공개 */}
                    <MatchContactPanel requestId={req.id} show="client" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 의뢰 상세 + 견적 작성 모달 ═══ */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => { setSelectedRequest(null); setIsEditing(false); }}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">의뢰 상세</h2>
              <button onClick={() => { setSelectedRequest(null); setIsEditing(false); }} className="rounded-lg p-1 text-foreground/40 hover:bg-muted hover:text-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 의뢰 정보 */}
            <div className="mt-6 space-y-4">
              {/* 헤더 */}
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground/60">{selectedRequest.category}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quoteStatusLabels[getMyQuoteStatus(selectedRequest)].color}`}>
                  {quoteStatusLabels[getMyQuoteStatus(selectedRequest)].label}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">{selectedRequest.title}</h3>

              {/* 기본 정보 카드 - 2x2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-4 overflow-hidden">
                  <p className="text-sm text-foreground/40">의뢰사</p>
                  <p className="mt-1 text-base font-semibold text-foreground break-words">{selectedRequest.clientCompany}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm text-foreground/40">예산</p>
                  <p className="mt-1 text-base font-semibold text-primary">{selectedRequest.budget}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm text-foreground/40">희망 마감일</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{selectedRequest.deadline === "미정" ? "미정" : new Date(selectedRequest.deadline + "T00:00:00").toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm text-foreground/40">등록일</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{new Date(selectedRequest.createdAt).toLocaleDateString("ko-KR")}</p>
                </div>
              </div>

              {/* 상세 내용 */}
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <h4 className="text-base font-semibold text-foreground">상세 내용</h4>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  {selectedRequest.description.split("\n").map((line, i) => {
                    if (!line.trim()) return null;
                    const isSubItem = line.startsWith("  -");
                    if (isSubItem) {
                      return <p key={i} className="col-span-2 pl-4 text-sm text-foreground/50">{line.trim()}</p>;
                    }
                    const parts = line.split(": ");
                    if (parts.length >= 2) {
                      const label = parts[0];
                      const value = parts.slice(1).join(": ");
                      const isLong = value.length > 30 || label === "위탁업무" || label === "추가 요구사항";
                      return (
                        <div key={i} className={isLong ? "col-span-2" : ""}>
                          <p className="text-sm text-foreground/40">{label}</p>
                          <p className="mt-0.5 text-base font-medium text-foreground">{value}</p>
                        </div>
                      );
                    }
                    return <p key={i} className="col-span-2 text-base text-foreground/70">{line}</p>;
                  })}
                </div>
              </div>
            </div>

            {/* 견적 작성 or 제출 완료 상태 */}
            {(() => {
              const myStatus = getMyQuoteStatus(selectedRequest);
              const myQuote = (selectedRequest.quotes || []).find((q) => q.companyId === user?.companyId);

              // 마감된 의뢰(매칭 성사/완료/회수)는 더 이상 견적을 제출할 수 없다.
              // 단, 이미 제출해 의뢰사 검토/수락/미결정 등으로 확정된 내 견적은 그대로 조회되게 둔다.
              const isClosed =
                selectedRequest.status === "matched" ||
                selectedRequest.status === "completed" ||
                selectedRequest.status === "cancelled";
              const decided = ["accepted", "not_selected", "client_reviewing", "client_hold", "client_rejected"].includes(myStatus);
              if (isClosed && !decided) {
                return (
                  <div className="mt-6 rounded-xl border border-border bg-muted p-4">
                    <p className="text-sm font-medium text-foreground">마감된 의뢰입니다.</p>
                    <p className="mt-1 text-xs text-foreground/50">
                      {selectedRequest.status === "cancelled"
                        ? "의뢰사가 회수한 의뢰로, 더 이상 견적을 제출할 수 없습니다."
                        : "다른 파트너사와 매칭이 완료되어 더 이상 견적을 제출할 수 없습니다."}
                    </p>
                  </div>
                );
              }

              if (myStatus === "rejected") {
                return (
                  <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                    이 의뢰를 거절하셨습니다.
                  </div>
                );
              }

              if (myStatus === "hold") {
                return (
                  <div className="mt-6">
                    <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                      이 의뢰를 보류 중입니다.
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => resumeReview(selectedRequest.id)}
                        className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                        다시 검토하기
                      </button>
                    </div>
                  </div>
                );
              }

              if (["quoted", "client_reviewing", "accepted", "client_hold", "client_rejected", "not_selected"].includes(myStatus) && myQuote && !isEditing) {
                return (
                  <div className="mt-6">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-emerald-700">제출된 견적서</h4>
                        {myQuote.status === "quoted" && selectedRequest.status === "pending" && (
                          <button onClick={() => {
                            setQuoteForm({ subjectCount: "", siteCountCapital: "", siteCountLocal: "", trialDuration: "", perSubjectDuration: "", timeline: myQuote.timeline || getTimelineFromRequest(selectedRequest), amount: myQuote.amount, memo: myQuote.memo, expectedCra: "", monitoringPerSite: "", edcBrand: "" });
                            setAttachment(null);
                            setIsEditing(true);
                          }} className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">수정</button>
                        )}
                      </div>
                      {/* 핵심 정보 */}
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-emerald-100 bg-surface p-3 text-center">
                          <p className="text-xs text-emerald-600/60">견적 금액</p>
                          <p className="mt-1 text-lg font-bold text-primary">{myQuote.amount}원</p>
                        </div>
                        <div className="rounded-lg border border-emerald-100 bg-surface p-3 text-center">
                          <p className="text-xs text-emerald-600/60">소요 기간</p>
                          <p className="mt-1 text-base font-semibold text-foreground">{myQuote.duration || "-"}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-100 bg-surface p-3 text-center">
                          <p className="text-xs text-emerald-600/60">견적번호</p>
                          <p className="mt-1 font-mono text-sm text-foreground/60">{myQuote.quoteCode || "-"}</p>
                        </div>
                      </div>
                      {/* 업무범위 */}
                      {myQuote.timeline && myQuote.timeline.filter((t: { months: string }) => t.months).length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-emerald-600/60">업무범위 및 소요개월</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {myQuote.timeline.filter((t: { months: string }) => t.months).map((t: { label: string; months: string }, ti: number) => (
                              <span key={ti} className="rounded-md border border-emerald-200 bg-surface px-2 py-1 text-xs">
                                <span className="text-foreground/60">{t.label}</span> <span className="font-semibold text-foreground">{t.months}개월</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* 모니터링/EDC */}
                      {((myQuote as { monitoringPerSite?: string }).monitoringPerSite || (myQuote as { expectedCra?: string }).expectedCra || (myQuote as { edcBrand?: string }).edcBrand) && (
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                          {(myQuote as { expectedCra?: string }).expectedCra && (
                            <div><span className="text-xs text-emerald-600/60">예상 투입 CRA</span><p className="font-medium text-emerald-700">{(myQuote as { expectedCra: string }).expectedCra}명</p></div>
                          )}
                          {(myQuote as { monitoringPerSite?: string }).monitoringPerSite && (
                            <div><span className="text-xs text-emerald-600/60">기관별 모니터링 횟수</span><p className="font-medium text-emerald-700">{(myQuote as { monitoringPerSite: string }).monitoringPerSite}회</p></div>
                          )}
                          {(myQuote as { edcBrand?: string }).edcBrand && (
                            <div><span className="text-xs text-emerald-600/60">EDC 브랜드</span><p className="font-medium text-emerald-700">{(myQuote as { edcBrand: string }).edcBrand}</p></div>
                          )}
                        </div>
                      )}
                      {/* 메모 */}
                      {myQuote.memo && (
                        <div className="mt-3 rounded-lg bg-surface p-3"><span className="text-xs text-emerald-600/60">메모</span><p className="mt-0.5 text-sm text-foreground/70">{myQuote.memo}</p></div>
                      )}
                      {/* 첨부파일 */}
                      {myQuote.attachmentName && (
                        <button onClick={() => openAttachment(myQuote.attachmentData)}
                          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-surface p-3 text-emerald-700 hover:bg-emerald-50">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                          <div className="text-left">
                            <p className="text-sm font-medium">견적서 다운로드</p>
                            <p className="text-xs text-emerald-600/50">{myQuote.attachmentName}</p>
                          </div>
                        </button>
                      )}
                      {/* 제출일 */}
                      <p className="mt-3 text-xs text-emerald-600/50">제출일: {new Date(myQuote.createdAt).toLocaleString("ko-KR")}</p>
                    </div>
                  </div>
                );
              }

              // 같은 회사 동료가 이미 제출한 경우
              if (hasCompanyQuote(selectedRequest) && myStatus === "new") {
                return (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-800">같은 회사의 다른 담당자가 이미 이 의뢰에 견적을 제출했습니다.</p>
                    <p className="mt-1 text-xs text-amber-600">한 회사당 하나의 견적만 제출할 수 있습니다.</p>
                  </div>
                );
              }

              // 신규 or 검토중 or 수정 모드 → 견적 작성 폼
              const updateTimeline = (idx: number, value: string) => {
                const updated = [...quoteForm.timeline];
                updated[idx] = { ...updated[idx], months: value };
                setQuoteForm({ ...quoteForm, timeline: updated });
              };
              return (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-foreground">{isEditing ? "견적서 수정" : "견적서 작성"}</h4>
                    {isEditing && <button onClick={() => setIsEditing(false)} className="text-xs font-medium text-foreground/50 hover:underline">취소</button>}
                  </div>
                  <div className="mt-4 space-y-5">
                    {/* 업무범위 및 소요개월 (보험 의뢰는 표시하지 않음) */}
                    {selectedRequest?.category !== "임상시험 보험" && (
                    <div className="rounded-xl border border-border p-4">
                      <h5 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <svg className="h-4 w-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        업무범위 및 소요개월
                      </h5>
                      <div className="mt-3 space-y-2">
                        {quoteForm.timeline.map((item, idx) => (
                          <div key={item.label} className="flex items-center gap-3">
                            <span className="w-40 text-sm font-medium text-foreground/70">{item.label}</span>
                            <input type="text" value={item.months}
                              onChange={(e) => updateTimeline(idx, e.target.value.replace(/\D/g, ""))}
                              inputMode="numeric" placeholder="개월"
                              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-4 py-2.5">
                        <span className="text-sm font-medium text-primary">총 소요개월</span>
                        <span className="text-lg font-bold text-primary">{totalMonths.toFixed(1)} 개월</span>
                      </div>
                    </div>
                    )}

                    {/* 모니터링 선택 시 추가 입력 */}
                    {quoteForm.timeline.some((t) => t.label === "모니터링") && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground">예상 투입 CRA</label>
                          <input type="text" inputMode="numeric" value={quoteForm.expectedCra}
                            onChange={(e) => setQuoteForm({ ...quoteForm, expectedCra: e.target.value.replace(/\D/g, "") })}
                            placeholder="예: 3" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground">기관별 모니터링 횟수 *</label>
                          <input type="text" inputMode="numeric" value={quoteForm.monitoringPerSite}
                            onChange={(e) => setQuoteForm({ ...quoteForm, monitoringPerSite: e.target.value.replace(/\D/g, "") })}
                            placeholder="예: 15" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        </div>
                      </div>
                    )}

                    {/* DM 선택 + eCRF일 때 EDC 브랜드 */}
                    {quoteForm.timeline.some((t) => t.label === "DM(데이터관리)" || t.label === "EDC 구축/운영") && (
                      <div>
                        <label className="block text-sm font-medium text-foreground">EDC 브랜드</label>
                        <input type="text" value={quoteForm.edcBrand}
                          onChange={(e) => setQuoteForm({ ...quoteForm, edcBrand: e.target.value })}
                          placeholder="예: Medidata Rave, CRScube" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    )}

                    {/* 견적 금액 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">견적 금액 (원화) *</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">&#8361;</span>
                        <input type="text" inputMode="numeric" value={quoteForm.amount}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d]/g, "");
                            const formatted = raw ? Number(raw).toLocaleString("ko-KR") : "";
                            setQuoteForm({ ...quoteForm, amount: formatted });
                          }}
                          placeholder="숫자만 입력" className="w-full rounded-lg border border-border py-2.5 pl-8 pr-12 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/30">원</span>
                      </div>
                      {quoteForm.amount && (
                        <p className="mt-1 text-xs text-foreground/40">
                          {(() => {
                            const num = Number(quoteForm.amount.replace(/,/g, ""));
                            if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억원`;
                            if (num >= 10000) return `${(num / 10000).toFixed(0)}만원`;
                            return `${num.toLocaleString()}원`;
                          })()}
                        </p>
                      )}
                    </div>

                    {/* 첨부파일 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">견적서 첨부하기 *</label>
                      <div className="mt-1">
                        {attachment ? (
                          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                              <span className="text-sm text-foreground/70">{attachment.name}</span>
                            </div>
                            <button onClick={() => setAttachment(null)} className="text-xs text-red-500 hover:underline">삭제</button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-foreground/40 transition-colors hover:border-primary hover:text-primary">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                            파일 선택 (PDF 또는 Word 문서만 업로드 가능, 최대 10MB)
                            <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.ppt,.pptx" />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* 프로젝트 설명 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground">프로젝트 설명</label>
                      <textarea value={quoteForm.memo} onChange={(e) => setQuoteForm({ ...quoteForm, memo: e.target.value })}
                        rows={3} placeholder="프로젝트에 대한 상세 설명을 작성하세요"
                        className="mt-1 w-full resize-none rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    </div>

                    {/* 버튼 */}
                    {user?.status === "restricted" ? (
                      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-600 border-t border-border mt-4">계정이 제한되어 견적서를 제출할 수 없습니다.</div>
                    ) : (
                    <div className="flex gap-3 border-t border-border pt-4">
                      <button onClick={submitQuote}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                        견적서 발송
                      </button>
                      <button onClick={() => saveDraft(selectedRequest.id)}
                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50">
                        임시저장
                      </button>
                      <button onClick={() => holdRequest(selectedRequest.id)}
                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50">
                        보류
                      </button>
                      <button onClick={() => rejectRequest(selectedRequest.id)}
                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50">
                        거절
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
