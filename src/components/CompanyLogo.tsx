"use client";

import { logoUrl } from "@/lib/data/companyLogo";

// 회사 로고. 둥근 사각형 + 흰 배경 + 여백 — 회사 로고는 가로로 긴 글자형이
// 많아서 원형에 넣으면 잘린다. 로고가 없으면 같은 크기의 흰 빈 칸으로 둬서
// 줄이 흔들리지 않게 한다.
export default function CompanyLogo({
  path, name, size = 40, className = "",
}: { path?: string | null; name: string; size?: number; className?: string }) {
  const url = logoUrl(path);
  const radius = size >= 48 ? "rounded-xl" : "rounded-lg";
  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden border border-border bg-white ${radius} ${className}`}
      title={name}
      aria-label={url ? `${name} 로고` : undefined}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${name} 로고`} className="h-full w-full object-contain" style={{ padding: Math.max(2, Math.round(size * 0.08)) }} />
      )}
    </span>
  );
}
