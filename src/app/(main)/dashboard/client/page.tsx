"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  listMyCompanyRequests,
  withdrawRequest as withdrawRequestApi,
  extendDeadline as extendDeadlineApi,
  setQuoteStatusAsClient,
  acceptQuote,
} from "@/lib/data/requests";
import { listNotices, listMyNotifications } from "@/lib/data/notices";
import MatchContactPanel from "@/components/dashboard/MatchContact";
import { statusLabels } from "@/types/matching";
import type { MatchRequest, QuoteStatus } from "@/types/matching";
import type { Notice, Notification } from "@/types/auth";
import Link from "next/link";
import Greeting from "@/components/dashboard/Greeting";
import PartnerProfileCard from "@/components/partner/PartnerProfileCard";
import { listPartnerProfiles, type PartnerProfile } from "@/lib/data/partnerProfiles";

type Section = "activity" | "requests" | "quotes" | "completed" | "undecided";

export default function ClientDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("activity");
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [openQuoteRequestId, setOpenQuoteRequestId] = useState<string | null>(null);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<"all" | "client_reviewing" | "client_hold" | "accepted" | "client_rejected" | "not_selected" | "undecided">("all");
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  // 견적을 낸 파트너사들의 역량 프로필. 회사 id → 프로필.
  const [partnerProfiles, setPartnerProfiles] = useState<Record<string, PartnerProfile>>({});

  const reloadRequests = useCallback(async () => {
    if (!user) return;
    try {
      const list = await listMyCompanyRequests(user.companyId);
      setRequests(list);
      const ids = [...new Set(list.flatMap((r) => (r.quotes ?? []).map((q) => q.companyId)).filter(Boolean))] as string[];
      listPartnerProfiles(ids).then(setPartnerProfiles).catch(console.error);
    } catch (err) {
      console.error(err);
      alert("의뢰 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  }, [user]);

  useEffect(() => { reloadRequests(); }, [reloadRequests]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    Promise.all([listNotices(), listMyNotifications()])
      .then(([noticeList, notifs]) => {
        if (!alive) return;
        setNotices(noticeList);
        setNotifications(notifs);
      })
      .catch(console.error);
    return () => { alive = false; };
  }, [user]);

  // 임시저장 확인
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ projectName: string; step: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sonjobda_request_draft");
    if (stored) {
      setHasDraft(true);
      const data = JSON.parse(stored);
      setDraftInfo({ projectName: data.projectName || "제목 없음", step: data.step || 1 });
    }
  }, []);

  const deleteDraft = () => {
    if (confirm("임시저장된 견적 요청서를 삭제하시겠습니까?")) {
      localStorage.removeItem("sonjobda_request_draft");
      setHasDraft(false);
      setDraftInfo(null);
    }
  };

  // 서버가 거부한 이유(마감된 의뢰, 남의 회사 의뢰 등)를 그대로 보여준다.
  const runAction = async (fn: () => Promise<void>, successMessage?: string) => {
    try {
      await fn();
      await reloadRequests();
      if (successMessage) alert(successMessage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "처리하지 못했습니다.");
    }
  };

  const withdrawRequest = (id: string) => {
    if (!confirm("이 견적 요청을 회수하시겠습니까?\n회수된 요청은 파트너사에게 더 이상 노출되지 않습니다.")) return;
    runAction(() => withdrawRequestApi(id));
  };

  const extendDeadline = (id: string) => {
    if (!confirm("마감일을 오늘 기준 5일 연장하시겠습니까?")) return;
    runAction(() => extendDeadlineApi(id, 5), "마감일이 연장되었습니다.");
  };

  const markQuotesAsReviewing = async (quotes: { id: string; status: string }[]) => {
    const fresh = quotes.filter((q) => q.status === "quoted");
    if (fresh.length === 0) return;
    try {
      await Promise.all(fresh.map((q) => setQuoteStatusAsClient(q.id, "client_reviewing")));
      await reloadRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const updateQuoteStatus = (requestId: string, quoteId: string, newStatus: string) => {
    if (newStatus === "accepted") {
      if (!confirm("이 견적을 수락하시겠습니까?\n\n수락 시 다른 파트너사의 견적은 미결정 처리됩니다.\n이 작업은 되돌릴 수 없으며, 해당 업체에 회사명 및 연락처가 노출됩니다.")) return;
      // 견적 수락은 여러 행을 한 번에 바꾼다(고른 견적 수락, 나머지 미결정,
      // 의뢰 마감, 매칭번호 부여). 중간에 끊기면 안 되므로 서버가 한
      // 트랜잭션으로 처리한다.
      runAction(() => acceptQuote(quoteId));
      return;
    }
    if (newStatus === "client_rejected" && !confirm("이 견적을 거절하시겠습니까?")) return;
    runAction(() => setQuoteStatusAsClient(quoteId, newStatus as QuoteStatus));
  };

  // 통계
  const quotedRequests = requests.filter((r) => (r.quotes || []).some((q) => ["quoted", "client_reviewing", "accepted", "client_rejected", "not_selected", "client_hold"].includes(q.status)));
  const completedRequests = requests.filter((r) => r.status === "matched" || r.status === "completed");

  // 예산 범위 → 중간값 변환
  const budgetToNumber = (budget: string): number => {
    if (budget === "1천만원 미만") return 5000000;
    if (budget === "1천만원 ~ 5천만원") return 30000000;
    if (budget === "5천만원 ~ 1억원") return 75000000;
    if (budget === "1억원 ~ 5억원") return 300000000;
    if (budget === "5억원 ~ 10억원") return 750000000;
    if (budget === "10억원 이상") return 1500000000;
    return 0;
  };

  // 예산 절감액 계산 (매칭 성사된 프로젝트: 예상예산 중간값 - 실제 수락 견적금액)
  const totalSavings = completedRequests.reduce((sum, r) => {
    const budgetMid = budgetToNumber(r.budget || "");
    if (!budgetMid) return sum;
    const acceptedQuote = (r.quotes || []).find((q) => q.status === "accepted");
    if (!acceptedQuote?.amount) return sum;
    const actualAmount = parseInt(acceptedQuote.amount.replace(/,/g, ""), 10);
    if (isNaN(actualAmount) || actualAmount <= 0) return sum;
    const saving = budgetMid - actualAmount;
    return sum + (saving > 0 ? saving : 0);
  }, 0);

  const formatKoreanAmount = (n: number): string => {
    if (n >= 100000000) return `${(n / 100000000).toFixed(1).replace(/\.0$/, "")}억원`;
    if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`;
    return `${n.toLocaleString()}원`;
  };

  // 미결정 프로젝트: 견적을 받았지만 아직 아무 파트너사도 수락하지 않은 의뢰
  const undecidedRequests = requests.filter((r) =>
    r.status !== "matched" && r.status !== "completed" && r.status !== "cancelled" &&
    (r.quotes || []).some((q) => ["quoted", "client_reviewing", "client_hold"].includes(q.status))
  );
  const decidedOrUndecided = requests.filter((r) =>
    r.status !== "cancelled" &&
    (r.quotes || []).some((q) => ["quoted", "client_reviewing", "client_hold", "accepted", "client_rejected", "not_selected"].includes(q.status))
  );
  const undecidedRate = decidedOrUndecided.length > 0 ? Math.round((undecidedRequests.length / decidedOrUndecided.length) * 100) : 0;
  const totalQuotes = requests.reduce((sum, r) => {
    const deadline = new Date(r.createdAt); deadline.setDate(deadline.getDate() + 7);
    if (deadline < new Date() || r.status !== "pending") return sum;
    return sum + (r.quotes || []).filter((q) => ["quoted", "client_reviewing", "client_hold"].includes(q.status)).length;
  }, 0);

  // 전체 활동 피드
  type ActivityType = "registered" | "quote_received" | "completed" | "notification";
  interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    detail: string;
    date: string;
    request?: MatchRequest;
  }

  const activityConfig: Record<ActivityType, { icon: string; color: string; bgColor: string }> = {
    registered: { icon: "M12 4v16m8-8H4", color: "text-blue-600", bgColor: "bg-blue-100" },
    quote_received: { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-600", bgColor: "bg-emerald-100" },
    completed: { icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0", color: "text-amber-600", bgColor: "bg-amber-100" },
    notification: { icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0", color: "text-purple-600", bgColor: "bg-purple-100" },
  };

  const activities: Activity[] = [];

  requests.forEach((req) => {
    activities.push({ id: `reg-${req.id}`, type: "registered", title: `"${req.title}" 의뢰를 등록했습니다`, detail: `${req.category} | 예산: ${req.budget}`, date: req.createdAt, request: req });
    (req.quotes || []).filter((q) => q.status === "quoted").forEach((q) => {
      activities.push({ id: `quote-${q.id}`, type: "quote_received", title: `"${req.title}" 견적서를 받았습니다`, detail: `${q.partnerCompany} | 금액: ${q.amount}`, date: q.createdAt, request: req });
    });
    if (req.status === "matched" || req.status === "completed") {
      activities.push({ id: `done-${req.id}`, type: "completed", title: `"${req.title}" 매칭이 완료되었습니다`, detail: req.category, date: req.createdAt, request: req });
    }
  });
  notifications.forEach((notif) => {
    activities.push({ id: `notif-${notif.id}`, type: "notification", title: "관리자로부터 알림을 받았습니다", detail: notif.message, date: notif.createdAt });
  });
  notices.forEach((notice) => {
    activities.push({ id: `notice-${notice.id}`, type: "notification", title: `공지사항: ${notice.title}`, detail: notice.content, date: notice.createdAt });
  });
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Greeting name={user?.name} company={`${user?.company ?? ""} 의뢰사 대시보드`} />
          {user?.status !== "restricted" && user?.status !== "suspended" && (
            <Link href="/request/new"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              견적 요청
            </Link>
          )}
        </div>

        {/* 임시저장 배너 */}
        {hasDraft && draftInfo && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">작성 중인 견적 요청서가 있습니다</p>
                <p className="text-xs text-amber-600">{draftInfo.projectName ? `"${draftInfo.projectName}"` : "제목 미입력"} · {draftInfo.step}단계까지 작성</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/request/new" className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">이어서 작성</Link>
              <button onClick={deleteDraft} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-100">삭제</button>
            </div>
          </div>
        )}

        {/* 메인 카드 3개 */}
        <div className="sticky top-[108px] z-30 mt-8 grid grid-cols-1 gap-4 bg-muted pb-4 sm:grid-cols-3">
          <button onClick={() => setActiveSection("requests")}
            className={`rounded-xl border p-6 text-left transition-all ${activeSection === "requests" ? "border-primary bg-primary/5 shadow-md" : "border-border bg-surface shadow-card hover:border-primary/30 hover:shadow-md"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50">등록한 의뢰</p>
                <p className="mt-1 text-3xl font-bold text-primary">{requests.length}</p>
                <p className="mt-1 text-xs text-foreground/40">대기 {requests.filter((r) => r.status === "pending").length} | 진행 {requests.filter((r) => r.status === "matching").length}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-light p-3 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
            </div>
          </button>
          <button onClick={() => setActiveSection("quotes")}
            className={`rounded-xl border p-6 text-left transition-all ${activeSection === "quotes" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-border bg-surface shadow-card hover:border-emerald-300 hover:shadow-md"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50">받은 견적</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600">{totalQuotes}</p>
                <p className="mt-1 text-xs text-foreground/40">{quotedRequests.length}개 의뢰에 대한 견적</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 p-3 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </button>
          <button onClick={() => setActiveSection("completed")}
            className={`rounded-xl border p-6 text-left transition-all ${activeSection === "completed" ? "border-amber-500 bg-amber-50 shadow-md" : "border-border bg-surface shadow-card hover:border-amber-300 hover:shadow-md"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/50">매칭 성사</p>
                <p className="mt-1 text-3xl font-bold text-amber-600">{completedRequests.length}</p>
                <p className="mt-1 text-xs text-foreground/40">완료된 프로젝트</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 p-3 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" /></svg>
              </div>
            </div>
          </button>
        </div>

        {/* 인사이트 카드 */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface shadow-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-400 p-2.5 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/50">예산 절감액</p>
                <p className="text-xl font-bold text-green-600">{totalSavings > 0 ? formatKoreanAmount(totalSavings) : "-"}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground/40">매칭 성사된 프로젝트의 예상 예산 대비 실제 견적 금액 차이입니다. 손잡다매칭을 통해 절감된 비용을 확인하세요.</p>
          </div>
          <button onClick={() => setActiveSection("undecided")}
            className={`rounded-xl border p-5 text-left transition-all ${activeSection === "undecided" ? "border-orange-500 bg-orange-50 shadow-md" : "border-border bg-surface shadow-card hover:border-orange-300 hover:shadow-md"}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-400 p-2.5 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/50">미결정 프로젝트</p>
                <p className="text-xl font-bold text-orange-600">{undecidedRate}%<span className="ml-2 text-sm font-medium text-foreground/40">({undecidedRequests.length}건)</span></p>
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground/40">견적을 받았지만 아직 파트너사를 선택하지 않은 비율입니다. 보류도 미결정으로 포함되어 계산됩니다.</p>
          </button>
        </div>

        {/* 섹션 탭 */}
        <div className="mt-6 flex gap-2 border-b border-border">
          {([
            { key: "activity" as const, label: "전체 활동" },
            { key: "requests" as const, label: "등록한 의뢰" },
            { key: "quotes" as const, label: "받은 견적" },
            { key: "completed" as const, label: "매칭 성사" },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveSection(tab.key)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeSection === tab.key ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ 전체 활동 ═══ */}
        {activeSection === "activity" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">전체 활동</h2>
            <div className="mt-4">
              {activities.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">아직 활동 내역이 없습니다.</p>
                  <Link href="/request/new" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">첫 의뢰 등록하기</Link>
                </div>
              ) : (
                <div className="relative space-y-0">
                  <div className="absolute left-5 top-3 bottom-3 w-px bg-border" />
                  {activities.map((act) => {
                    const config = activityConfig[act.type];
                    return (
                      <div key={act.id}
                        onClick={() => {
                          if (act.type === "notification") { router.push("/notifications"); }
                          else if (act.type === "quote_received" && act.request) { setActiveSection("quotes"); }
                          else if (act.type === "completed" && act.request) { setActiveSection("completed"); }
                          else if (act.request) { setActiveSection("requests"); setOpenRequestId(act.request.id); }
                        }}
                        className="relative flex gap-4 py-3 cursor-pointer">
                        <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                          <svg className={`h-5 w-5 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={config.icon} />
                          </svg>
                        </div>
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

        {/* ═══ 등록한 의뢰 ═══ */}
        {activeSection === "requests" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">등록한 의뢰</h2>
            <div className="mt-4 space-y-4">
              {requests.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">등록된 의뢰가 없습니다.</p>
                  <Link href="/request/new" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">첫 의뢰 등록하기</Link>
                </div>
              ) : [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req) => <RequestCard key={req.id} request={req} onWithdraw={withdrawRequest} onExtendDeadline={extendDeadline} defaultOpen={openRequestId === req.id} />)}
            </div>
          </div>
        )}

        {/* ═══ 받은 견적 ═══ */}
        {activeSection === "quotes" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">받은 견적</h2>
            <p className="mt-1 text-sm text-foreground/50">파트너사로부터 받은 견적서 목록입니다.</p>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {([
                { key: "all" as const, label: "전체" },
                { key: "undecided" as const, label: "미결정" },
                { key: "client_reviewing" as const, label: "검토중" },
                { key: "client_hold" as const, label: "보류" },
                { key: "accepted" as const, label: "수락" },
              ]).map((tab) => (
                <button key={tab.key} onClick={() => setQuoteStatusFilter(tab.key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${quoteStatusFilter === tab.key ? "bg-primary text-white" : "bg-surface text-foreground/60 hover:bg-muted"}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-4">
              {(() => {
                const filtered = quoteStatusFilter === "all" ? quotedRequests
                  : quoteStatusFilter === "undecided" ? quotedRequests.filter((r) => r.status !== "matched" && r.status !== "completed" && r.status !== "cancelled" && (r.quotes || []).some((q) => ["quoted", "client_reviewing", "client_hold"].includes(q.status)))
                  : quotedRequests.filter((r) => (r.quotes || []).some((q) => q.status === quoteStatusFilter));
                return filtered.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">받은 견적이 없습니다.</p>
                </div>
              ) : filtered.map((req) => {
                const quotes = (req.quotes || []).filter((q) => ["quoted", "client_reviewing", "accepted", "not_selected", "client_rejected", "client_hold"].includes(q.status));
                const amounts = quotes.filter((q) => ["quoted", "client_reviewing", "accepted", "client_hold"].includes(q.status)).map((q) => Number(q.amount.replace(/[^\d]/g, ""))).filter((n) => n > 0);
                const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
                const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
                const formatKRW = (n: number) => { if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`; if (n >= 10000) return `${(n / 10000).toFixed(0)}만`; return n.toLocaleString(); };
                const isOpen = openQuoteRequestId === req.id;
                const deadlineDate = new Date(req.createdAt); deadlineDate.setDate(deadlineDate.getDate() + 7);
                return (
                  <div key={req.id} id={`quote-card-${req.id}`} className="rounded-xl border border-border bg-surface shadow-card transition-shadow hover:shadow-md">
                    <button onClick={() => {
                      if (!isOpen) {
                        // 펼쳐서 처음 확인하는 순간 quoted → client_reviewing.
                        // 파트너사 쪽에서 "의뢰사가 확인함"으로 보이고, 이 시점
                        // 이후로는 파트너사가 견적을 수정할 수 없다.
                        markQuotesAsReviewing(req.quotes || []);
                      }
                      setOpenQuoteRequestId(isOpen ? null : req.id);
                    }} className="flex w-full items-center justify-between p-5 text-left">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{req.category}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusLabels[req.status]?.color || "bg-gray-100 text-gray-600"}`}>{statusLabels[req.status]?.label || req.status}</span>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">견적 {quotes.length}건</span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">{req.title}</h3>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="text-xs"><span className="text-foreground/40">견적 범위</span><p className="mt-0.5 font-semibold text-primary">{amounts.length > 0 ? (minAmount === maxAmount ? `${formatKRW(minAmount)}원` : `${formatKRW(minAmount)} ~ ${formatKRW(maxAmount)}원`) : "-"}</p></div>
                          <div className="text-xs"><span className="text-foreground/40">의뢰 예산</span><p className="mt-0.5 font-medium text-foreground">{req.budget}</p></div>
                          <div className="text-xs"><span className="text-foreground/40">마감일</span><p className="mt-0.5 font-medium text-foreground">{deadlineDate.toLocaleDateString("ko-KR")}</p></div>
                          <div className="text-xs"><span className="text-foreground/40">파트너사</span><p className="mt-0.5 font-medium text-foreground">{quotes.length}곳</p></div>
                        </div>
                      </div>
                      <svg className={`ml-4 h-5 w-5 flex-shrink-0 text-foreground/30 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border px-5 py-5">
                        <h4 className="text-sm font-semibold text-foreground">파트너사별 견적 비교</h4>
                        <div className="mt-4 space-y-3">
                          {quotes.map((quote) => {
                            const isQuoteOpen = expandedQuoteId === quote.id;
                            return (
                            <div key={quote.id} className={`rounded-xl border transition-shadow hover:shadow-md ${quote.status === "accepted" ? "border-primary bg-primary/5" : quote.status === "client_rejected" || quote.status === "not_selected" ? "border-border bg-muted/30" : "border-emerald-200 bg-surface"}`}>
                              <button onClick={() => setExpandedQuoteId(isQuoteOpen ? null : quote.id)} className="flex w-full items-center justify-between p-5 text-left">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground/60">{quote.partnerCompany.charAt(0)}</div>
                                  <div>
                                    <p className="break-all text-base font-semibold text-foreground">{quote.partnerCompany} {quote.quoteCode && <span className="ml-1 font-mono text-xs text-foreground/30">{quote.quoteCode}</span>}</p>
                                    {/* 담당자 이름은 매칭 성사 전에는 공개되지 않는다. 성사 후 아래 연락처 칸에 나온다. */}
                                    <p className="text-xs text-foreground/40">제출일: {new Date(quote.createdAt).toLocaleDateString("ko-KR")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${quote.status === "accepted" ? "bg-primary/10 text-primary" : quote.status === "client_rejected" ? "bg-red-100 text-red-600" : quote.status === "not_selected" ? "bg-gray-100 text-gray-500" : quote.status === "client_hold" ? "bg-gray-100 text-gray-600" : quote.status === "client_reviewing" ? "bg-amber-100 text-amber-700" : quote.status === "quoted" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                    {quote.status === "accepted" ? "수락됨" : quote.status === "client_rejected" ? "거절됨" : quote.status === "not_selected" ? "미결정" : quote.status === "client_hold" ? "보류" : quote.status === "client_reviewing" ? "검토중" : quote.status === "quoted" ? "신규" : "대기"}
                                  </span>
                                  {quote.amount && <span className="text-sm font-bold text-primary">{quote.amount}</span>}
                                  <svg className={`h-4 w-4 text-foreground/30 transition-transform ${isQuoteOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                              </button>

                              {isQuoteOpen && (<div className="border-t border-border px-5 pb-5 pt-4">
                              {/* 견적 핵심 정보 */}
                              <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                                  <p className="text-xs text-primary/60">견적 금액</p>
                                  <p className="mt-1 text-lg font-bold text-primary">{quote.amount}</p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                                  <p className="text-xs text-foreground/40">소요 기간</p>
                                  <p className="mt-1 text-base font-semibold text-foreground">{quote.duration || "-"}</p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                                  <p className="text-xs text-foreground/40">제출일</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">{new Date(quote.createdAt).toLocaleDateString("ko-KR")}</p>
                                </div>
                              </div>

                              {/* 업무범위 요약 */}
                              {quote.timeline && quote.timeline.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-foreground/40">업무범위 및 소요개월</p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {quote.timeline.filter((t: { months: string }) => t.months).map((t: { label: string; months: string }, ti: number) => (
                                      <span key={ti} className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                                        <span className="text-foreground/60">{t.label}</span> <span className="font-semibold text-foreground">{t.months}개월</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 파트너사 유형 (견적 제출 시점의 값이 견적에 담겨 온다) */}
                              {(() => {
                                const partnerUser = { partnerCategories: quote.partnerCategories };
                                return partnerUser.partnerCategories?.length ? (
                                  <div className="mt-3">
                                    <p className="text-xs text-foreground/40">회사유형</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {partnerUser.partnerCategories.map((cat: string) => (
                                        <span key={cat} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/60">{cat}</span>
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              })()}

                              {/* 파트너사 회사 역량 */}
                              <PartnerProfileCard profile={partnerProfiles[quote.companyId]} categories={quote.partnerCategories ?? []} />

                              {/* 모니터링/EDC */}
                              {(quote.expectedCra || quote.monitoringPerSite || quote.edcBrand) && (
                                <div className="mt-3 grid grid-cols-3 gap-3">
                                  {quote.expectedCra && (
                                    <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                                      <p className="text-xs text-foreground/40">예상 투입 CRA</p>
                                      <p className="mt-0.5 text-sm font-semibold text-foreground">{quote.expectedCra}명</p>
                                    </div>
                                  )}
                                  {quote.monitoringPerSite && (
                                    <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                                      <p className="text-xs text-foreground/40">기관별 모니터링</p>
                                      <p className="mt-0.5 text-sm font-semibold text-foreground">{quote.monitoringPerSite}회</p>
                                    </div>
                                  )}
                                  {quote.edcBrand && (
                                    <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                                      <p className="text-xs text-foreground/40">EDC 브랜드</p>
                                      <p className="mt-0.5 text-sm font-semibold text-foreground">{quote.edcBrand}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 메모 */}
                              {quote.memo && (
                                <div className="mt-3 rounded-lg bg-muted/30 p-3">
                                  <p className="text-xs text-foreground/40">메모</p>
                                  <p className="mt-0.5 text-sm text-foreground/70">{quote.memo}</p>
                                </div>
                              )}

                              {/* 첨부파일 */}
                              {quote.attachmentName && (
                                <button onClick={() => { if ((quote as { attachmentData?: string }).attachmentData) { const a = document.createElement("a"); a.href = (quote as { attachmentData: string }).attachmentData; a.download = quote.attachmentName || "file"; a.click(); } }}
                                  className="mt-3 flex w-full items-center gap-2 rounded-lg border border-border p-3 text-primary/70 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                  <div className="text-left">
                                    <p className="text-sm font-medium">견적서 다운로드</p>
                                    <p className="text-xs text-foreground/40">{quote.attachmentName}</p>
                                  </div>
                                </button>
                              )}

                              {/* 마감일 + 수락/거절/보류 */}
                              {(quote.status === "client_reviewing" || quote.status === "client_hold") && req.status === "pending" && (
                                <div className="mt-4 border-t border-border pt-4">
                                  <div className="mb-3 text-xs text-foreground/40">
                                    마감일: {(() => { const d = new Date(req.createdAt); d.setDate(d.getDate() + 7); return d.toLocaleDateString("ko-KR"); })()}
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => updateQuoteStatus(req.id, quote.id, "accepted")}
                                      className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                                      견적 수락
                                    </button>
                                    <button onClick={() => updateQuoteStatus(req.id, quote.id, "client_rejected")}
                                      className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50">
                                      거절
                                    </button>
                                    {quote.status !== "client_hold" && (
                                      <button onClick={() => updateQuoteStatus(req.id, quote.id, "client_hold")}
                                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50">
                                        보류
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                              </div>)}
                            </div>
                          );})}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
              })()}
            </div>
          </div>
        )}

        {/* ═══ 미결정 프로젝트 ═══ */}
        {activeSection === "undecided" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">미결정 프로젝트</h2>
            <p className="mt-1 text-sm text-foreground/50">견적을 받았지만 아직 파트너사를 선택하지 않은 의뢰입니다.</p>
            {undecidedRequests.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-border bg-background p-12 text-center">
                <p className="text-foreground/50">미결정 프로젝트가 없습니다.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {undecidedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req) => {
                  const quotes = (req.quotes || []).filter((q) => ["quoted", "client_reviewing", "client_hold"].includes(q.status));
                  return (
                    <div key={req.id} className="rounded-xl border border-orange-200 bg-surface p-5 transition-all hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-foreground/40">{req.requestCode}</span>
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">{req.category}</span>
                          </div>
                          <h3 className="mt-1 text-base font-semibold text-foreground">{req.title}</h3>
                          <p className="mt-1 text-sm text-foreground/50">예산: {req.budget} | 견적 {quotes.length}건 대기</p>
                        </div>
                        <button onClick={() => { setQuoteStatusFilter("all"); setActiveSection("quotes"); setOpenQuoteRequestId(req.id); setTimeout(() => { document.getElementById(`quote-card-${req.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100); }}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark">
                          견적 확인
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quotes.map((q) => (
                          <span key={q.id} className="rounded-lg border border-border bg-muted px-3 py-1 text-xs text-foreground/60">
                            {q.partnerCompany} · {q.amount ? `${q.amount}원` : "금액 미정"} · {q.status === "client_hold" ? "보류" : q.status === "client_reviewing" ? "검토중" : "신규"}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ 매칭 성사 ═══ */}
        {activeSection === "completed" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">매칭 성사</h2>
            <p className="mt-1 text-sm text-foreground/50">매칭이 완료된 프로젝트입니다.</p>
            <div className="mt-4 space-y-4">
              {completedRequests.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface shadow-card p-12 text-center">
                  <p className="text-foreground/50">아직 매칭 성사된 프로젝트가 없습니다.</p>
                </div>
              ) : completedRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{req.category}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">매칭 성사</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{req.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-foreground/50">
                    <span>예산: {req.budget}</span>
                    <span>견적: {(req.quotes || []).filter((q) => q.status === "quoted").length}건</span>
                  </div>
                  {/* 파트너사 연락처 공개 */}
                  {(req.quotes || []).some((q) => q.status === "accepted") && (
                    <MatchContactPanel requestId={req.id} show="partner" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function RequestCard({ request, onWithdraw, onExtendDeadline, defaultOpen }: { request: MatchRequest; onWithdraw: (id: string) => void; onExtendDeadline: (id: string) => void; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);
  const status = statusLabels[request.status];
  const hasAnyQuoteActivity = (request.quotes || []).length > 0;
  const canWithdraw = request.status === "pending" && !hasAnyQuoteActivity;
  const deadlineDate = new Date(request.createdAt);
  deadlineDate.setDate(deadlineDate.getDate() + 7);
  const isExpired = request.status === "pending" && deadlineDate < new Date();

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card transition-shadow hover:shadow-md">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between p-5 text-left">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {(request as MatchRequest & { requestCode?: string }).requestCode && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/40">{(request as MatchRequest & { requestCode?: string }).requestCode}</span>}
            <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{request.category}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.color}`}>{status.label}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-foreground">{request.title}</h3>
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-foreground/50">
            <span>등록일: {new Date(request.createdAt).toLocaleDateString("ko-KR")}</span>
            <span>마감일: {(() => { const d = new Date(request.createdAt); d.setDate(d.getDate() + 7); return d.toLocaleDateString("ko-KR"); })()}</span>
            <span>예산: {request.budget}</span>
            <span>견적: {(request.quotes || []).filter((q) => q.status === "quoted").length}건</span>
          </div>
        </div>
        <svg className={`h-5 w-5 flex-shrink-0 text-foreground/30 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-border px-5 py-4">
          {/* 제출 내용 상세 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">제출 내용</h4>

            {/* 기본 정보 카드 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-foreground/40">등록일</p>
                <p className="mt-1 text-sm font-medium text-foreground">{new Date(request.createdAt).toLocaleDateString("ko-KR")}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-foreground/40">마감일</p>
                <p className="mt-1 text-sm font-medium text-foreground">{(() => { const d = new Date(request.createdAt); d.setDate(d.getDate() + 7); return d.toLocaleDateString("ko-KR"); })()}</p>
              </div>
            </div>

            {/* 상세 내용 */}
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {request.description.split("\n").map((line, i) => {
                  if (!line.trim()) return null;
                  const isSubItem = line.startsWith("  -");
                  if (isSubItem) {
                    return <p key={i} className="col-span-2 pl-4 text-xs text-foreground/50">{line.trim()}</p>;
                  }
                  const parts = line.split(": ");
                  if (parts.length >= 2) {
                    const label = parts[0];
                    const value = parts.slice(1).join(": ");
                    const isLong = value.length > 30 || label === "위탁업무" || label === "추가 요구사항" || label === "임상시험 목적";
                    return (
                      <div key={i} className={isLong ? "col-span-2" : ""}>
                        <p className="text-xs text-foreground/40">{label}</p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
                      </div>
                    );
                  }
                  return <p key={i} className="col-span-2 text-sm text-foreground/70">{line}</p>;
                })}
              </div>
            </div>
          </div>

          {(request.quotes || []).filter((q) => q.status === "quoted").length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-foreground">받은 견적서</h4>
              <div className="mt-2 space-y-2">
                {(request.quotes || []).filter((q) => q.status === "quoted").map((quote) => (
                  <div key={quote.id} className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between">
                      <p className="break-all text-sm font-medium text-foreground">{quote.partnerCompany}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">견적완료</span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-foreground/50">
                      <span>금액: <span className="font-medium text-foreground">{quote.amount}</span></span>
                      {quote.duration && <span>기간: <span className="font-medium text-foreground">{quote.duration}</span></span>}
                    </div>
                    {quote.memo && <p className="mt-1 text-xs text-foreground/50">{quote.memo}</p>}
                    {quote.attachmentName && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                        <span className="text-xs text-primary/70">{quote.attachmentName}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(request.quotes || []).length === 0 && request.status === "pending" && (
            <p className="mt-3 text-sm text-foreground/40">손잡다매칭에서 최적의 파트너를 검토 중입니다.</p>
          )}
          {request.status === "pending" && (
            <div className="mt-4 flex gap-2 border-t border-border pt-3">
              {canWithdraw && (
                <>
                  <button onClick={() => { window.location.href = `/request/new?edit=${request.id}`; }}
                    className="rounded-lg border border-primary/30 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5">
                    수정
                  </button>
                  <button onClick={() => onWithdraw(request.id)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50">
                    회수
                  </button>
                </>
              )}
              {isExpired && (
                <button onClick={() => onExtendDeadline(request.id)}
                  className="rounded-lg border border-amber-300 px-4 py-2 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50">
                  마감연장
                </button>
              )}
            </div>
          )}
          {request.status === "cancelled" && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-500">회수된 견적 요청입니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
