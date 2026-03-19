"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  { icon: "🧪", label: "CRO", desc: "임상시험 수탁기관" },
  { icon: "🏭", label: "CMO/CDMO", desc: "위탁생산" },
  { icon: "📋", label: "SMO", desc: "임상시험 운영서비스" },
  { icon: "📊", label: "RA/인허가", desc: "인허가 컨설팅" },
  { icon: "🛡️", label: "임상시험 보험", desc: "임상시험 보험가입" },
  { icon: "📦", label: "소모품 공급", desc: "인쇄물/연구용 키트 등" },
  { icon: "📢", label: "마케팅 대행", desc: "심포지엄/CSO 업체" },
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
    <section className="relative min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 메인 히어로 */}
        <div className="flex flex-col items-center pt-16 text-center sm:pt-24 lg:pt-32">
          <span className="inline-block rounded-full bg-primary/10 px-5 py-2 text-base font-medium text-primary">
            헬스케어 전문 매칭 플랫폼
          </span>

          <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Search less, <span className="text-primary">Connect</span> more
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-foreground/60 sm:text-xl">
            찾느라 쏟는 시간은 줄이고, 딱 맞는 파트너와 연결되세요!
          </p>
        </div>

        {/* 카테고리별 파트너 찾기 */}
        <div className="mx-auto mt-16 max-w-5xl pb-20">
          <h2 className="mb-8 text-center text-xl font-bold text-foreground">
            카테고리별 파트너 찾기
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {categories.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleCategoryClick(cat.label)}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 transition-all hover:border-primary/30 hover:shadow-lg sm:p-8"
              >
                <span className="text-5xl transition-transform group-hover:scale-110 sm:text-6xl">
                  {cat.icon}
                </span>
                <span className="text-base font-bold text-foreground sm:text-lg">
                  {cat.label}
                </span>
                <span className="text-sm text-foreground/50">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
