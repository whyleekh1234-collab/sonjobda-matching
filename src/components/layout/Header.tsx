"use client";

import { useState, useEffect } from "react";
import CompanyLogo from "@/components/CompanyLogo";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { listMyNotifications, listNotices, listReadNoticeIds } from "@/lib/data/notices";

const navItems = [
  { label: "서비스 소개", href: "/#services" },
  { label: "매칭 프로세스", href: "/#process" },
  { label: "파트너사", href: "/#partners" },
  { label: "문의하기", href: "/#contact" },
];

const roleLabels = {
  client: { label: "의뢰사", color: "bg-blue-100 text-blue-700" },
  partner: { label: "파트너사", color: "bg-emerald-100 text-emerald-700" },
};

// 알림 페이지가 읽음 처리한 뒤 헤더 배지를 바로 다시 세게 하는 신호.
export const UNREAD_CHANGED_EVENT = "sonjobda:unread-changed";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout, switchRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const calcUnread = async () => {
      try {
        const [notifs, notices, readIds] = await Promise.all([
          listMyNotifications(),
          listNotices(),
          listReadNoticeIds(),
        ]);
        if (!alive) return;
        setUnreadCount(
          notifs.filter((n) => !n.read).length +
            notices.filter((n) => !readIds.includes(n.id)).length
        );
      } catch {
        // 배지는 부가 정보다. 실패해도 헤더는 그대로 뜬다.
      }
    };

    calcUnread();
    window.addEventListener("focus", calcUnread);
    window.addEventListener(UNREAD_CHANGED_EVENT, calcUnread);
    // 예전에는 localStorage라 3초마다 훑어도 공짜였다. 이제는 매번 서버를
    // 부르므로 간격을 늘린다. 화면으로 돌아올 때도 어차피 다시 센다.
    const interval = setInterval(calcUnread, 60000);
    return () => {
      alive = false;
      window.removeEventListener("focus", calcUnread);
      window.removeEventListener(UNREAD_CHANGED_EVENT, calcUnread);
      clearInterval(interval);
    };
  }, [user]);

  const canSwitch = user && user.roles && user.roles.length >= 2;

  // 토글에서 지금 역할을 다시 눌러도 아무 일도 없어야 한다.
  const handleSwitchTo = (role: "client" | "partner") => {
    if (!canSwitch || user?.activeRole === role) return;
    switchRole();
    if (window.location.pathname.startsWith("/dashboard")) {
      router.push(`/dashboard/${role}`);
    }
  };

  return (
    <>
      {/* 로그인 시 최상단 역할 바 */}
      {user && (
        <div className="fixed top-0 z-50 w-full bg-foreground text-white">
          <div className="mx-auto flex h-12 max-w-7xl items-center justify-between overflow-x-auto px-4 text-sm sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              {/* 넓은 화면에는 오른쪽에 역할 토글이 있어 같은 것을 두 번
                  보여주게 된다. 토글이 숨는 좁은 폭에서만 띄운다 —
                  거기서는 이 배지가 지금 역할을 알려주는 유일한 표시다. */}
              <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold sm:hidden ${roleLabels[user.activeRole].color}`}>
                {roleLabels[user.activeRole].label}
              </span>
              <Link href="/mypage" className="whitespace-nowrap text-white/85 transition-colors hover:text-white">
                <CompanyLogo path={user.companyLogo} name={user.company} size={22} className="mr-1.5 align-middle" />
                <span className="font-medium text-white">{user.company}</span>
                <span className="hidden sm:inline"> · {user.name}님</span>
              </Link>
            </div>
            {/* 좁은 화면에선 숨긴다 — 같은 기능이 햄버거 메뉴 안에 있다. */}
            <div className="hidden flex-shrink-0 items-center gap-3 sm:flex">
              {/* 두 역할을 나란히 놓고 지금 역할에 표시가 머문다. "무엇으로
                  바꾼다"가 아니라 "지금 무엇이다"가 바로 보인다. 표시는
                  뒤에 깔고 자리만 옮기므로 글자가 흔들리지 않는다. */}
              {canSwitch && (
                <div
                  role="group"
                  aria-label="활동 역할 전환"
                  className="relative flex flex-shrink-0 items-center rounded-full bg-white/15 p-0.5"
                >
                  <span
                    aria-hidden
                    className={`absolute inset-y-0.5 left-0.5 w-[4.75rem] rounded-full bg-white transition-transform duration-200 ease-out ${
                      user.activeRole === "partner" ? "translate-x-[4.75rem]" : "translate-x-0"
                    }`}
                  />
                  {(["client", "partner"] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleSwitchTo(role)}
                      aria-pressed={user.activeRole === role}
                      className={`relative z-10 w-[4.75rem] rounded-full py-1 text-xs font-semibold transition-colors ${
                        user.activeRole === role
                          ? "text-foreground"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {roleLabels[role].label}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={logout}
                className="text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 헤더 */}
      <header
        className={`fixed z-50 w-full border-b border-border/70 bg-surface/80 backdrop-blur-md ${
          user ? "top-11" : "top-0"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            {/* 로고는 라운드 사각형 안에 여백까지 포함된 그림이라, 배경이나
                테두리를 덧씌우지 않는다. 겹치면 모서리가 두 겹으로 보인다. */}
            <Image src="/logo-mark.png" alt="" width={32} height={32} priority className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-foreground">손잡다매칭</span>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden items-center gap-8 md:flex">
            {user ? (
              <>
                <Link href="/notifications" className="relative text-sm font-medium text-foreground/70 transition-colors hover:text-primary">
                  알림/공지
                  {unreadCount > 0 && (
                    <span className="absolute -right-4 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/mypage" className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary">마이페이지</Link>
                <Link href="/inquiry" className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary">문의하기</Link>
                <Link
                  href={user.activeRole === "partner" ? "/dashboard/partner" : "/dashboard/client"}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-primary-dark hover:shadow-card-hover"
                >
                  {user.activeRole === "partner" ? "받은의뢰관리" : "견적요청관리"}
                </Link>
              </>

            ) : (
              <>
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-primary-dark hover:shadow-card-hover"
                  >
                    회원가입
                  </Link>
                </div>
              </>
            )}
          </nav>

          {/* 모바일 햄버거 버튼 */}
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="메뉴 열기"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="border-t border-border bg-background md:hidden">
            <nav className="flex flex-col px-4 py-4">
              {user ? (
                <>
                  <Link href="/notifications" className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-primary" onClick={() => setIsMenuOpen(false)}>
                    알림/공지 {unreadCount > 0 && <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{unreadCount}</span>}
                  </Link>
                  <Link href={user.activeRole === "partner" ? "/dashboard/partner" : "/dashboard/client"} className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-primary" onClick={() => setIsMenuOpen(false)}>
                    {user.activeRole === "partner" ? "받은의뢰관리" : "견적요청관리"}
                  </Link>
                  <Link href="/mypage" className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-primary" onClick={() => setIsMenuOpen(false)}>마이페이지</Link>
                  <Link href="/inquiry" className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-primary" onClick={() => setIsMenuOpen(false)}>문의하기</Link>
                </>
              ) : (
                navItems.map((item) => (
                  <a key={item.href} href={item.href} className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-primary" onClick={() => setIsMenuOpen(false)}>{item.label}</a>
                ))
              )}

              <div className="mt-3 border-t border-border pt-3">
                {user ? (
                  <>
                    {/* 역할 배지는 두지 않는다. 바로 아래 토글이 같은 것을
                        더 또렷하게 보여준다. */}
                    <div className="px-3 py-2">
                      <span className="text-sm text-foreground/70">
                        {user.company} {user.name}님
                      </span>
                    </div>
                    {/* 좁은 화면에서도 같은 모양을 쓴다. 폭만 꽉 채운다. */}
                    {canSwitch && (
                      <div
                        role="group"
                        aria-label="활동 역할 전환"
                        className="relative mx-3 my-1 flex items-center rounded-full bg-muted p-0.5"
                      >
                        <span
                          aria-hidden
                          className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                            user.activeRole === "partner" ? "translate-x-full" : "translate-x-0"
                          }`}
                        />
                        {(["client", "partner"] as const).map((role) => (
                          <button
                            key={role}
                            onClick={() => {
                              handleSwitchTo(role);
                              setIsMenuOpen(false);
                            }}
                            aria-pressed={user.activeRole === role}
                            className={`relative z-10 flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                              user.activeRole === role
                                ? "text-foreground"
                                : "text-foreground/50"
                            }`}
                          >
                            {roleLabels[role].label}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block rounded-lg px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      로그인
                    </Link>
                    <Link
                      href="/signup"
                      className="mt-2 block rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      회원가입
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
