"use client";

import { useEffect, useState } from "react";

// 화면 안에 그리는 확인 창.
//
// 지금까지 confirm()을 썼다. 브라우저가 그리는 창이라 자리를 정할 수
// 없고, 크롬은 화면 맨 위에 붙인다. 목록 아래쪽 버튼을 눌렀는데 창은
// 저 위에 뜨니 눈이 따라가지 못한다. 주소("www.sonjobdamd.com의 메시지")가
// 제목 자리를 차지하는 것도 거슬린다.
//
// confirm은 값을 돌려주고 화면을 멈춰 세운다. 그 두 가지를 흉내 내야
// 쓰던 자리를 그대로 바꿔 끼울 수 있어, 약속(Promise)을 돌려주고 답이
// 올 때까지 기다리게 했다.
//
//   if (!(await confirmDialog("지우시겠습니까?"))) return;
//
// 되돌릴 수 없는 일에는 danger를 준다. 색이 달라지고 기본 단추가
// "취소" 쪽에 놓여, 눌러 넘기다 지우는 일이 줄어든다.

type Req = {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
};

let listener: ((r: Req | null) => void) | null = null;
let queue: Req[] = [];

function next() {
  listener?.(queue[0] ?? null);
}

export function confirmDialog(
  message: string,
  options?: { confirmLabel?: string; cancelLabel?: string; danger?: boolean }
): Promise<boolean> {
  return new Promise((resolve) => {
    queue.push({
      message: String(message ?? ""),
      confirmLabel: options?.confirmLabel ?? "확인",
      cancelLabel: options?.cancelLabel ?? "취소",
      danger: options?.danger ?? false,
      resolve,
    });
    next();
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<Req | null>(null);

  useEffect(() => {
    listener = setReq;
    next();
    return () => { listener = null; };
  }, []);

  useEffect(() => {
    if (!req) return;
    // 창이 떠 있는 동안 Esc는 취소, Enter는 기본 단추와 같게 둔다.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answer(false);
      if (e.key === "Enter" && !req.danger) answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const answer = (ok: boolean) => {
    const cur = queue.shift();
    cur?.resolve(ok);
    next();
  };

  if (!req) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4"
      onClick={() => answer(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* confirm에 쓰던 문구에는 줄바꿈이 들어 있다. 그대로 살린다. */}
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{req.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => answer(false)}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            {req.cancelLabel}
          </button>
          <button
            type="button"
            autoFocus={!req.danger}
            onClick={() => answer(true)}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              req.danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-dark"
            }`}
          >
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
