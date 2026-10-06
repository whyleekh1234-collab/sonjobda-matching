"use client";

import { useEffect, useRef, useState } from "react";

// 화면 안에 그리는 입력 창.
//
// 확인 창(Confirm.tsx)과 같은 이유로 만든다. prompt()는 브라우저가 그려서
// 자리를 정할 수 없고, 크롬은 화면 맨 위에 붙인다. 목록 아래쪽 버튼을
// 눌렀는데 창은 저 위에 뜨니 눈이 따라가지 못하고, 주소
// ("www.sonjobdamd.com의 메시지")가 제목 자리를 차지한다.
//
// prompt는 값을 돌려주고 화면을 멈춰 세운다. 그 둘을 흉내 내야 쓰던 자리를
// 그대로 바꿔 끼울 수 있어, 약속(Promise)을 돌려준다. 취소하면 prompt와
// 같게 null이다 — 빈 문자열과 구분돼야 "안 쓰고 닫았다"를 알 수 있다.
//
//   const why = await promptDialog("사유를 적어주세요");
//   if (why === null) return;
//
// 여러 줄을 받아야 하면 multiline을 준다. 사유처럼 길어질 수 있는 것은
// 한 줄 칸에 밀어 넣으면 쓴 사람이 자기 글을 못 읽는다.

type Req = {
  message: string;
  defaultValue: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  multiline: boolean;
  required: boolean;
  maxLength?: number;
  resolve: (value: string | null) => void;
};

let listener: ((r: Req | null) => void) | null = null;
const queue: Req[] = [];

function next() {
  listener?.(queue[0] ?? null);
}

export function promptDialog(
  message: string,
  options?: {
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    multiline?: boolean;
    /** 비워 두면 확인을 누를 수 없다. 사유처럼 반드시 받아야 하는 것에 쓴다. */
    required?: boolean;
    maxLength?: number;
  },
): Promise<string | null> {
  return new Promise((resolve) => {
    queue.push({
      message: String(message ?? ""),
      defaultValue: options?.defaultValue ?? "",
      placeholder: options?.placeholder ?? "",
      confirmLabel: options?.confirmLabel ?? "확인",
      cancelLabel: options?.cancelLabel ?? "취소",
      multiline: options?.multiline ?? false,
      required: options?.required ?? false,
      maxLength: options?.maxLength,
      resolve,
    });
    next();
  });
}

export function PromptHost() {
  const [req, setReq] = useState<Req | null>(null);
  const [value, setValue] = useState("");
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    listener = setReq;
    next();
    return () => { listener = null; };
  }, []);

  useEffect(() => {
    if (!req) return;
    setValue(req.defaultValue);
    // 열리자마자 적을 수 있어야 한다. 기본값이 있으면 전부 선택해 둬서
    // 바로 덮어쓸 수 있게 한다 — prompt가 그렇게 동작했다.
    const t = setTimeout(() => {
      fieldRef.current?.focus();
      if (req.defaultValue) fieldRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [req]);

  const answer = (v: string | null) => {
    const cur = queue.shift();
    cur?.resolve(v);
    setValue("");
    next();
  };

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;

  const blocked = req.required && value.trim() === "";

  const submit = () => {
    if (blocked) return;
    answer(value);
  };

  const field =
    "mt-4 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4"
      onClick={() => answer(null)}
      role="dialog"
      aria-modal="true"
    >
      <form
        className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{req.message}</p>

        {req.multiline ? (
          <textarea
            ref={(el) => { fieldRef.current = el; }}
            value={value}
            rows={4}
            maxLength={req.maxLength}
            placeholder={req.placeholder}
            onChange={(e) => setValue(e.target.value)}
            // 여러 줄 칸에서 Enter는 줄바꿈이어야 한다. 보내는 것은 Ctrl+Enter.
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
            }}
            className={`${field} resize-none`}
          />
        ) : (
          <input
            ref={(el) => { fieldRef.current = el; }}
            type="text"
            value={value}
            maxLength={req.maxLength}
            placeholder={req.placeholder}
            onChange={(e) => setValue(e.target.value)}
            className={field}
          />
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => answer(null)}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            {req.cancelLabel}
          </button>
          <button
            type="submit"
            disabled={blocked}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {req.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
