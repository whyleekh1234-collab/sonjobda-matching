"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CTASection() {
  const [stats, setStats] = useState({ partners: 0, projects: 0 });

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const partners = users.filter((u: { roles?: string[] }) => u.roles?.includes("partner")).length;
    const requests = JSON.parse(localStorage.getItem("sonjobda_requests") || "[]");
    const completed = requests.filter((r: { status: string }) => r.status === "matched" || r.status === "completed").length;
    setStats({ partners, projects: completed });
  }, []);

  return (
    <section className="bg-gradient-to-r from-primary to-blue-700 py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          지금 바로 시작하세요
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
          의뢰사라면 최적의 파트너를, 파트너사라면 새로운 프로젝트를 만나보세요.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="group flex w-full max-w-xs items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-lg transition-all hover:shadow-xl sm:w-auto sm:min-w-[280px]"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🏢
            </span>
            <div>
              <p className="text-base font-bold text-foreground">의뢰사로 가입</p>
              <p className="text-sm text-foreground/60">파트너를 찾고 있어요</p>
            </div>
            <svg
              className="ml-auto h-5 w-5 text-foreground/30 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/signup"
            className="group flex w-full max-w-xs items-center gap-4 rounded-2xl border-2 border-white/30 bg-white/10 p-5 text-left backdrop-blur transition-all hover:bg-white/20 sm:w-auto sm:min-w-[280px]"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl">
              🤝
            </span>
            <div>
              <p className="text-base font-bold text-white">파트너사로 가입</p>
              <p className="text-sm text-white/70">프로젝트를 수주하고 싶어요</p>
            </div>
            <svg
              className="ml-auto h-5 w-5 text-white/50 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
