"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

// 관리자 화면의 자리 비움 감시.
//
// 관리자 화면에는 전 회원의 이름·연락처·사업자등록증이 떠 있다. 자리를
// 비운 사이 화면이 그대로 열려 있으면 그것을 지나가는 사람이 본다.
//
// 일정 시간"마다" 묻지 않고 "그만큼 아무 조작이 없으면" 묻는다. 일하는
// 중에 주기적으로 끼어들면 연장 버튼을 습관적으로 누르게 되고, 그러면
// 묻는 의미가 없어진다. 손을 놓은 시간만 센다.
//
// 묻고 1분을 더 기다린다. 그 안에 아무 답이 없으면 자리에 없다고 보고
// 끊는다. 끊을 때는 2단계 인증 증명까지 함께 지운다 — 세션만 끊으면
// 다시 들어올 때 인증번호를 묻지 않는다.
//
// ※ 2026-10-06, 개발 기간 동안 20분 → 120분으로 늘렸다.
//   20분이면 코드를 고치다 돌아올 때마다 끊겨, 하루에도 몇 번씩 인증번호를
//   다시 받아야 했다. 관리자 세션 자체는 8시간짜리라 끊긴 쪽은 늘 이것이었다.
//   개발이 끝나면 20분으로 되돌린다 — 이 화면에는 회원의 연락처와
//   사업자등록증이 떠 있고, 그걸 지키자고 둔 장치다.
//   NEXT_PUBLIC_ADMIN_IDLE_MIN으로 덮어쓸 수 있다(빌드 시점에 박힌다).

const DEFAULT_IDLE_MIN = 120;
const IDLE_MIN = Number(process.env.NEXT_PUBLIC_ADMIN_IDLE_MIN) || DEFAULT_IDLE_MIN;
const IDLE_MS = IDLE_MIN * 60 * 1000;
const GRACE_SEC = 60;            // 물어보고 기다리는 1분

export default function AdminIdleGuard() {
  const { isAdmin, logout } = useAdminAuth();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [left, setLeft] = useState(GRACE_SEC);
  // asking을 이벤트 처리기 안에서 읽으면 등록 당시 값에 묶인다. ref로 본다.
  const askingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endSession = useCallback(async () => {
    askingRef.current = false;
    setAsking(false);
    try {
      await fetch("/api/admin/mfa/logout", { method: "POST" });
    } catch {
      // 증명을 못 지워도 세션은 끊는다. 둘 다 못 하는 것보다 낫다.
    }
    await logout();
    router.replace("/admin/login?timeout=1");
  }, [logout, router]);

  const restart = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      askingRef.current = true;
      setLeft(GRACE_SEC);
      setAsking(true);
    }, IDLE_MS);
  }, []);

  // 조작이 있으면 처음부터 다시 센다. 묻고 있는 동안의 움직임은 세지
  // 않는다 — 지나가다 마우스를 건드린 것을 "자리에 있다"로 읽으면
  // 끊기지 않는다.
  useEffect(() => {
    if (!isAdmin) return;
    const bump = () => { if (!askingRef.current) restart(); };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "focus"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    restart();
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isAdmin, restart]);

  // 남은 시간 세기
  useEffect(() => {
    if (!asking) return;
    const t = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          clearInterval(t);
          void endSession();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [asking, endSession]);

  if (!isAdmin || !asking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-foreground">아직 보고 계신가요?</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/60">
          {IDLE_MIN}분 동안 아무 조작이 없었습니다. 관리자 화면에는 회원의 연락처와
          사업자등록증이 떠 있어, 자리를 비운 채로 두지 않습니다.
        </p>
        <p className="mt-4 text-sm text-foreground">
          <span className="font-mono text-2xl font-bold tabular-nums text-primary">{left}</span>
          <span className="ml-1.5 text-foreground/60">초 뒤 자동으로 로그아웃됩니다.</span>
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => { askingRef.current = false; setAsking(false); restart(); }}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            계속 사용하기
          </button>
          <button
            onClick={() => void endSession()}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
