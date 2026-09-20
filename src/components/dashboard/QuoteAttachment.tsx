"use client";

import { useState } from "react";
import { getAttachmentUrl } from "@/lib/data/requests";

// 견적서 첨부 열기 버튼.
//
// 첨부는 비공개 버킷에 있어서 저장 경로를 그대로 링크에 넣으면 열리지 않는다.
// 누를 때마다 10분짜리 서명 URL을 새로 받아 새 탭으로 연다. 누가 열 수 있는지는
// Storage 정책이 정한다 — 올린 파트너사, 그 의뢰의 의뢰사, 운영자.
export default function QuoteAttachment({
  path, name, variant = "box",
}: { path?: string | null; name?: string | null; variant?: "box" | "inline" }) {
  const [busy, setBusy] = useState(false);
  if (!name) return null;

  const open = async () => {
    if (!path) { alert("첨부 파일 정보를 찾을 수 없습니다."); return; }
    setBusy(true);
    try {
      const url = await getAttachmentUrl(path);
      if (!url) { alert("첨부 파일을 열 수 없습니다. 권한이 없거나 파일이 삭제되었을 수 있습니다."); return; }
      window.open(url, "_blank", "noopener");
    } catch (e) {
      alert(e instanceof Error ? e.message : "첨부 파일을 열지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const icon = (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );

  if (variant === "inline") {
    return (
      <button type="button" onClick={open} disabled={busy}
        className="inline-flex items-center gap-1.5 text-primary/80 hover:text-primary hover:underline disabled:opacity-50">
        {icon}<span className="text-sm break-all">{busy ? "여는 중…" : name}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={open} disabled={busy}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50">
      <span className="text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-primary">{busy ? "여는 중…" : "견적서 열기"}</span>
        <span className="block break-all text-xs text-foreground/40">{name}</span>
      </span>
    </button>
  );
}
