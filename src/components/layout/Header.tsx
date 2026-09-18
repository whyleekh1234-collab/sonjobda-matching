"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Workflow } from "lucide-react";
import { listMyNotifications, listNotices, listReadNoticeIds } from "@/lib/data/notices";

const navItems = [
  { label: "서비스 소개", href: "/#services" },
  { label: "매칭 프로세스", href: "/#process" },
  { label: "파트너사", href: "/#partners" },
  { label: "문의하기", href: "/#contact" },
];

const roleLabels = {
  client: { label: "의뢰사", color: "bg-blue-100 text-blue-700", switchTo: "파트너사로 전환" },
  partner: { label: "파트너사", color: "bg-emerald-100 text-emerald-700", switchTo: "의뢰사로 전환" },
};

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
    // 예전에는 localStorage라 3초마다 훑어도 공짜였다. 이제는 매번 서버를
    // 부르므로 간격을 늘린다. 화면으로 돌아올 때도 어차피 다시 센다.
    const interval = setInterval(calcUnread, 60000);
    return () => {
      alive = false;
      window.removeEventListener("focus", calcUnread);
      clearInterval(interval);
    };
  }, [user]);

  const canSwitch = user && user.roles && user.roles.length >= 2;

  const handleSwitchRole = () => {
    if (!canSwitch) return;
    switchRole();
    const newRole = user?.activeRole === "client" ? "partner" : "client";
    if (window.location.pathname.startsWith("/dashboard")) {
      router.push(`/dashboard/${newRole}`);
    }
  };

  return (
    <>
      {/* 로그인 시 최상단 역할 바 */}
      {user && (
        <div className="fixed top-0 z-50 w-full bg-foreground text-white">
          <div className="mx-auto flex h-11 max-w-7xl items-center justify-between overflow-x-auto px-4 text-xs sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${roleLabels[user.activeRole].color}`}>
                {roleLabels[user.activeRole].label}
              </span>
              <Link href="/mypage" className="whitespace-nowrap text-white/70 transition-colors hover:text-white">
                <span className="font-medium text-white">{user.company}</span> {user.name}님
              </Link>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              {canSwitch && (
                <button
                  onClick={handleSwitchRole}
                  className="flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  {roleLabels[user.activeRole].switchTo}
                </button>
              )}
              <button
                onClick={logout}
                className="text-white/60 transition-colors hover:text-white"
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light text-white shadow-soft">
              <Workflow className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary">손잡다</span>
              <span className="text-foreground">매칭</span>
            </span>
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
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleLabels[user.activeRole].color}`}>
                        {roleLabels[user.activeRole].label}
                      </span>
                      <span className="text-sm text-foreground/70">
                        {user.company} {user.name}님
                      </span>
                    </div>
                    {canSwitch && (
                      <button
                        onClick={() => {
                          handleSwitchRole();
                          setIsMenuOpen(false);
                        }}
                        className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          {roleLabels[user.activeRole].switchTo}
                        </span>
                      </button>
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
