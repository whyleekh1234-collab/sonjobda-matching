"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// 오른쪽 아래 떠 있는 상담 챗봇. 대화는 이 컴포넌트 안에만 있다 —
// 페이지를 옮겨도 (main) 레이아웃이 유지되는 동안은 남고, 새로고침하면 사라진다.

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "안녕하세요, 손잡다매칭 상담 도우미입니다. 회원가입, 의뢰 등록, 견적, 매칭 절차 등 궁금한 점을 물어보세요.",
};

const SUGGESTIONS = [
  "회원가입은 어떻게 하나요?",
  "견적은 언제까지 수정할 수 있나요?",
  "상대 회사 연락처는 언제 공개되나요?",
  "수수료가 있나요?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      // 인사말은 서버에 보내지 않는다. 실제 대화만.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: res.ok ? data.reply : data.message }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "연결에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* 열기 버튼 */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="상담 챗봇 열기"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-lg transition-colors hover:bg-primary-dark sm:h-14 sm:w-auto sm:justify-start sm:pl-4 sm:pr-5"
        >
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-3.5-.63L3 21l1.63-4.07A7.5 7.5 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="hidden sm:inline">상담</span>
        </button>
      )}

      {/* 채팅 창 */}
      {open && (
        <div
          role="dialog"
          aria-label="상담 챗봇"
          className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col overflow-hidden border-border bg-background shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:z-40 sm:h-[min(600px,calc(100vh-40px))] sm:w-[min(380px,calc(100vw-40px))] sm:rounded-2xl sm:border"
        >
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">손잡다매칭 상담</p>
              <p className="text-[11px] opacity-80">AI 도우미 · 답변이 부족하면 문의하기로 연결해 드려요</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="rounded-lg p-1 hover:bg-white/15">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap break-keep rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-muted text-foreground"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-foreground/50">답변을 준비하고 있어요…</div>
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/70 hover:border-primary hover:text-primary">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="궁금한 점을 입력하세요"
                className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button type="submit" disabled={busy || !input.trim()}
                className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40">
                전송
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-foreground/40">
              사람에게 문의하려면 <Link href="/inquiry" className="underline hover:text-primary">문의하기</Link>
            </p>
          </form>
        </div>
      )}
    </>
  );
}
