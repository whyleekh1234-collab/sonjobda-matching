"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { listMyInquiries, createInquiry, type InquiryWithExtras } from "@/lib/data/notices";
import { toast } from "@/components/ui/Toast";

const inquiryTypes = [
  { value: "general", label: "일반 문의" },
  { value: "quote", label: "견적 관련 문의" },
  { value: "account", label: "계정/회원 문의" },
  { value: "technical", label: "기술/시스템 문의" },
  { value: "partnership", label: "제휴/파트너십 문의" },
  { value: "complaint", label: "불만/개선 요청" },
  { value: "report", label: "문제 회원 신고" },
  { value: "other", label: "기타" },
];

function InquiryPageInner() {
  const { user, isLoading } = useAuth();
  // 의뢰·견적 화면의 "신고" 버튼이 ?type=report&ref=RQ-0001 형태로 보낸다.
  // 신고는 대상이 특정되지 않으면 조사할 수가 없어서, 어느 건에 대한
  // 신고인지를 링크가 실어 나르고 제목에 미리 박아둔다.
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [form, setForm] = useState({ type: "", title: "", message: "" });
  const [myInquiries, setMyInquiries] = useState<InquiryWithExtras[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      setMyInquiries(await listMyInquiries());
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const type = params.get("type");
    const ref = params.get("ref");
    if (!type && !ref) return;
    setForm((prev) => ({
      ...prev,
      ...(type && { type }),
      // 사용자가 이미 뭔가 적고 있었다면 덮지 않는다.
      ...(ref && !prev.title && { title: `[${ref}] ` }),
    }));
    setActiveTab("new");
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    if (!form.type) { toast("문의 유형을 선택해주세요."); return; }
    if (!form.title.trim()) { toast("제목을 입력해주세요."); return; }
    if (!form.message.trim()) { toast("문의 내용을 입력해주세요."); return; }

    setIsSubmitting(true);
    try {
      await createInquiry({
        company: user.company,
        name: user.name,
        email: user.email,
        phone: user.phone,
        type: form.type,
        title: form.title,
        message: form.message,
        profileId: user.id,
        // 신고 링크가 대상을 실어 보낸다. 일반 문의면 비어 있다.
        ...(params.get("company") && { targetCompanyId: params.get("company")! }),
        ...(params.get("request") && { targetRequestId: params.get("request")! }),
      });
      setForm({ type: "", title: "", message: "" });
      await reload();
      toast("문의가 접수되었습니다.");
      setActiveTab("history");
    } catch (err) {
      toast(err instanceof Error ? err.message : "접수하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-foreground/50">불러오는 중...</div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-muted py-20">
        <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">문의하기</h1>
          <p className="mt-4 break-keep text-sm leading-relaxed text-foreground/70">
            문의는 회원만 남길 수 있습니다. 답변을 보내드리고 진행 상황을 확인하시려면
            로그인이 필요합니다.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Link href="/login?next=/inquiry"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
              로그인
            </Link>
            <Link href="/signup"
              className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface-subtle">
              회원가입
            </Link>
          </div>
          <p className="mt-8 break-keep text-sm text-foreground/60">
            가입 전 문의나 광고 문의는{" "}
            <a href="mailto:contact@sonjobdamd.com" className="font-semibold text-primary hover:underline">
              contact@sonjobdamd.com
            </a>
            {" "}으로 보내주세요.
          </p>
          <p className="mt-3 text-sm text-foreground/60">
            궁금한 점은{" "}
            <Link href="/faq" className="font-semibold text-primary hover:underline">자주 묻는 질문</Link>
            에서 먼저 찾아보실 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">문의하기</h1>
        <p className="mt-1 text-sm text-foreground/50">궁금한 점이나 개선사항을 문의해주세요.</p>

        {/* 탭 */}
        <div className="mt-6 flex gap-2 border-b border-border">
          <button onClick={() => setActiveTab("new")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "new" ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"}`}>
            새 문의 작성
          </button>
          <button onClick={() => { setActiveTab("history"); reload(); }}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "history" ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"}`}>
            문의 내역 {myInquiries.length > 0 && <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">{myInquiries.length}</span>}
          </button>
        </div>

        {/* 새 문의 작성 */}
        {activeTab === "new" && (
          <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-border bg-white p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">문의 유형 *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="">선택해주세요</option>
                  {inquiryTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">제목 *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="문의 제목을 입력하세요" maxLength={50}
                  className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">문의 내용 *</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5} placeholder="문의 내용을 상세히 작성해주세요."
                  className="mt-1 w-full resize-none rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-foreground/60">
                <p>문의자: {user.company} {user.name} ({user.email})</p>
              </div>
            </div>
            <button type="submit"
              className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
              문의 접수
            </button>
          </form>
        )}

        {/* 문의 내역 */}
        {activeTab === "history" && (
          <div className="mt-6">
            {myInquiries.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-12 text-center">
                <p className="text-foreground/50">문의 내역이 없습니다.</p>
                <button onClick={() => setActiveTab("new")} className="mt-2 text-sm font-semibold text-primary hover:underline">문의하기</button>
              </div>
            ) : (
              <div className="space-y-3">
                {myInquiries.map((inq) => {
                  const isOpen = expandedId === inq.id;
                  const typeLabel = inquiryTypes.find((t) => t.value === inq.type)?.label || inq.type;
                  return (
                    <div key={inq.id} className="rounded-xl border border-border bg-white transition-shadow hover:shadow-md">
                      <button onClick={() => setExpandedId(isOpen ? null : inq.id)}
                        className="flex w-full items-center justify-between p-5 text-left">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{typeLabel}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-yellow-100 text-yellow-700" : inq.status === "replied" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                              {inq.status === "new" ? "접수됨" : inq.status === "replied" ? "답변완료" : "종료"}
                            </span>
                          </div>
                          <h3 className="mt-2 text-base font-semibold text-foreground">{inq.title || inq.message.slice(0, 30)}</h3>
                          <p className="mt-1 text-xs text-foreground/60">{new Date(inq.createdAt).toLocaleString("ko-KR")}</p>
                        </div>
                        <svg className={`h-5 w-5 flex-shrink-0 text-foreground/50 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border px-5 py-4 space-y-3">
                          <div className="rounded-lg bg-muted/30 p-4">
                            <p className="whitespace-pre-wrap text-sm text-foreground/70">{inq.message}</p>
                          </div>
                          {/* 답변 */}
                          {inq.replies && inq.replies.length > 0 && (
                            <div className="space-y-2">
                              {inq.replies.map((reply, ri) => (
                                <div key={ri} className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                  <p className="text-xs text-primary/60">{reply.from} · {new Date(reply.createdAt).toLocaleString("ko-KR")}</p>
                                  <p className="mt-1 text-sm text-foreground/70">{reply.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {inq.status === "new" && (
                            <p className="text-xs text-foreground/60">관리자 확인 후 답변드리겠습니다.</p>
                          )}
                        </div>
                      )}
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

// useSearchParams는 Suspense 경계 안에서만 쓸 수 있다.
export default function InquiryPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-foreground/50">불러오는 중...</div>}>
      <InquiryPageInner />
    </Suspense>
  );
}
