"use client";

import Link from "next/link";
import { Building2, Handshake, ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark py-24 sm:py-28">
      {/* 배경: 미묘한 글로우 + 그리드 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(255,255,255,0.16),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(70%_60%_at_50%_50%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          지금 바로 시작하세요
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
          의뢰사라면 최적의 파트너를, 파트너사라면 새로운 프로젝트를 만나보세요.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* 의뢰사로 가입 */}
          <Link
            href="/signup"
            className="group flex w-full max-w-xs items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-card-hover sm:w-auto sm:min-w-[280px]"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-base font-bold text-foreground">의뢰사로 가입</p>
              <p className="text-sm text-foreground-muted">파트너를 찾고 있어요</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-foreground/30 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </Link>

          {/* 파트너사로 가입 */}
          <Link
            href="/signup"
            className="group flex w-full max-w-xs items-center gap-4 rounded-2xl border border-white/25 bg-white/10 p-5 text-left backdrop-blur transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-white/15 sm:w-auto sm:min-w-[280px]"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
              <Handshake className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-base font-bold text-white">파트너사로 가입</p>
              <p className="text-sm text-white/70">프로젝트를 수주하고 싶어요</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-white/50 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
