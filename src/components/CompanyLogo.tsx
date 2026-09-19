"use client";

import { logoUrl } from "@/lib/data/companyLogo";

// 회사 로고 아바타. 로고가 없으면 회사명 첫 글자로 대신한다.
// 견적 카드, 상단 바, 마이페이지가 모두 이걸 쓴다.
export default function CompanyLogo({
  path, name, size = 40, className = "",
}: { path?: string | null; name: string; size?: number; className?: string }) {
  const url = logoUrl(path);
  const style = { width: size, height: size };
  if (url) {
    return (
      <span style={style} className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`${name} 로고`} className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span style={style} className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground/60 ${className}`}>
      <span style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}>{name.trim().charAt(0) || "?"}</span>
    </span>
  );
}
