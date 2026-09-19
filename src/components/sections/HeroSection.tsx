"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  FlaskConical,
  Factory,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  Package,
  Megaphone,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

// 카테고리별 액센트: 같은 채도 레벨(쿨톤 보석색)로 조화롭게. (-50 틴트 / -600 솔리드)
type Category = {
  icon: LucideIcon;
  label: string;
  desc: string;
  tint: string; // 아이콘 기본 배경/색
  hoverFill: string; // hover 시 아이콘 솔리드 배경
  hoverBorder: string; // hover 시 카드 보더
  arrow: string; // hover 시 화살표 색
};

const categories: Category[] = [
  { icon: FlaskConical, label: "CRO", desc: "임상시험 수탁기관", tint: "bg-blue-50 text-blue-600", hoverFill: "group-hover:bg-blue-600", hoverBorder: "hover:border-blue-300/70", arrow: "group-hover:text-blue-600" },
  { icon: Factory, label: "CMO/CDMO", desc: "위탁생산", tint: "bg-indigo-50 text-indigo-600", hoverFill: "group-hover:bg-indigo-600", hoverBorder: "hover:border-indigo-300/70", arrow: "group-hover:text-indigo-600" },
  { icon: ClipboardList, label: "SMO", desc: "임상시험 운영서비스", tint: "bg-cyan-50 text-cyan-600", hoverFill: "group-hover:bg-cyan-600", hoverBorder: "hover:border-cyan-300/70", arrow: "group-hover:text-cyan-600" },
  { icon: FileCheck2, label: "RA/인허가", desc: "인허가 컨설팅", tint: "bg-violet-50 text-violet-600", hoverFill: "group-hover:bg-violet-600", hoverBorder: "hover:border-violet-300/70", arrow: "group-hover:text-violet-600" },
  { icon: ShieldCheck, label: "임상시험 보험", desc: "임상시험 보험가입", tint: "bg-teal-50 text-teal-600", hoverFill: "group-hover:bg-teal-600", hoverBorder: "hover:border-teal-300/70", arrow: "group-hover:text-teal-600" },
  { icon: Package, label: "소모품 공급", desc: "인쇄물/연구용 키트 등", tint: "bg-sky-50 text-sky-600", hoverFill: "group-hover:bg-sky-600", hoverBorder: "hover:border-sky-300/70", arrow: "group-hover:text-sky-600" },
  { icon: Megaphone, label: "마케팅 대행", desc: "심포지엄/웨비나/CSO/환자유치", tint: "bg-purple-50 text-purple-600", hoverFill: "group-hover:bg-purple-600", hoverBorder: "hover:border-purple-300/70", arrow: "group-hover:text-purple-600" },
];

export default function HeroSection() {
  const router = useRouter();
  const { user } = useAuth();

  const handleCategoryClick = (label: string) => {
    if (user) {
      // 로그인 상태: 견적요청 페이지로 이동 (카테고리 미리 선택)
      router.push(`/request/new?category=${encodeURIComponent(label)}`);
    } else {
      // 비로그인: 회원가입 페이지로 이동 (카테고리 전달)
      router.push(`/signup?category=${encodeURIComponent(label)}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#eef4ff] via-surface to-surface">
      {/* 배경: 메시 블러 오브 + 페이드 그리드 (모던 SaaS 깊이감, 성능 고려한 정적 레이어) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-[6%] h-80 w-80 rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -top-16 right-[8%] h-80 w-80 rounded-full bg-accent-indigo/20 blur-[100px]" />
        <div className="absolute top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent-cyan/15 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(75%_45%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 메인 히어로 */}
        <div className="flex flex-col items-center pt-20 text-center sm:pt-28 lg:pt-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-soft backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            헬스케어 전문 매칭 플랫폼
          </span>

          <h1 className="mt-7 text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Search less,
            <br className="sm:hidden" />{" "}
            <span className="bg-gradient-to-r from-primary via-accent-indigo to-accent-cyan bg-clip-text text-transparent">
              Connect
            </span>{" "}
            more
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground-muted sm:text-xl">
            찾느라 쏟는 시간은 줄이고, 딱 맞는 파트너와 연결되세요.
            <br className="hidden sm:block" />
            임상시험부터 바이오 의약품 개발까지, 검증된 전문 파트너를 한 곳에서.
          </p>
        </div>

        {/* 카테고리별 파트너 찾기 */}
        <div className="mx-auto mt-16 max-w-5xl pb-24 sm:mt-20">
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Categories
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              카테고리별 파트너 찾기
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => handleCategoryClick(cat.label)}
                  className={`group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-card-hover sm:p-6 ${cat.hoverBorder}`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200 group-hover:text-white ${cat.tint} ${cat.hoverFill}`}>
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-base font-bold tracking-tight text-foreground">{cat.label}</p>
                    <p className="mt-1 text-sm leading-snug text-foreground-muted">{cat.desc}</p>
                  </div>
                  <ArrowRight
                    className={`absolute right-4 top-5 h-4 w-4 text-foreground/20 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 ${cat.arrow}`}
                    strokeWidth={2}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
