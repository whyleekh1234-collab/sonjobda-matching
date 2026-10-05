"use client";

import { useEffect, useState } from "react";

// 화면 안에 직접 그리는 알림.
//
// 지금까지 alert()를 썼다. 브라우저가 그리는 창이라 위치를 정할 수 없고,
// 크롬은 화면 맨 위에 붙인다. 아래쪽 버튼을 눌렀는데 알림은 저 위에 뜨니
// 눈이 따라가지 못한다. 게다가 alert는 화면을 멈춰 세워, 누를 때마다
// 확인을 한 번씩 더 눌러야 한다.
//
// 그래서 아래쪽 가운데에 잠깐 떴다 사라지는 알림으로 바꿨다. 글을 읽을
// 시간은 길이에 따라 늘린다 — 긴 문장을 4초에 읽으라고 할 수는 없다.
//
// toast()는 React 밖에서도 부를 수 있다. alert를 쓰던 자리를 그대로
// 바꿔 끼우려면 어디서든 불려야 한다.

export type ToastKind = "info" | "error";

type Toast = { id: number; message: string; kind: ToastKind };

let nextId = 1;
let listeners: ((t: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function emit() {
  listeners.forEach((l) => l(toasts));
}

function remove(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** 화면 아래에 알림을 띄운다. alert()를 대신한다. */
export function toast(message: string, kind: ToastKind = "info") {
  const text = String(message ?? "").trim();
  if (!text) return;
  const id = nextId++;
  toasts = [...toasts, { id, message: text, kind }];
  emit();
  // 읽는 데 걸리는 시간만큼 둔다. 짧으면 4초, 길면 최대 10초.
  const ms = Math.min(10000, Math.max(4000, text.length * 90));
  setTimeout(() => remove(id), ms);
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const l = (t: Toast[]) => setItems([...t]);
    listeners.push(l);
    setItems([...toasts]);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[200] flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      aria-live="polite"
    >
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => remove(t.id)}
          className={`pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-left text-sm font-medium shadow-lg ring-1 transition-all ${
            t.kind === "error"
              ? "bg-red-600 text-white ring-red-700/40"
              : "bg-foreground text-white ring-black/10"
          }`}
        >
          {/* alert에 쓰던 문구에는 줄바꿈이 들어 있다. 그대로 살린다. */}
          <span className="block whitespace-pre-line leading-relaxed">{t.message}</span>
        </button>
      ))}
    </div>
  );
}
