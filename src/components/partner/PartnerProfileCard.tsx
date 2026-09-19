"use client";

import { useState } from "react";
import { EXTRA_FIELDS, type PartnerProfile } from "@/lib/data/partnerProfiles";

// 의뢰사가 견적을 비교할 때 보는 파트너사 역량 요약. 접힌 상태에서는
// 강점 한 줄 + 핵심 태그, 펼치면 전부. 회사명·연락처는 여기 없다 —
// 매칭 전 비공개 원칙은 그대로다.

export default function PartnerProfileCard({
  profile, categories,
}: { profile: PartnerProfile | null | undefined; categories: string[] }) {
  const [open, setOpen] = useState(false);

  if (!profile) {
    return (
      <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-foreground/40">
        이 파트너사는 아직 회사 역량을 등록하지 않았습니다.
      </p>
    );
  }

  const tags = [...profile.therapeuticAreas.slice(0, 3), ...profile.phases.slice(0, 3), ...profile.certifications.slice(0, 2)];
  const extraFields = categories.flatMap((c) => EXTRA_FIELDS[c] ?? []);

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {profile.intro && <p className="break-keep text-sm font-medium text-foreground">{profile.intro}</p>}
          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.map((t) => <span key={t} className="rounded-full bg-background px-2 py-0.5 text-[11px] text-foreground/60">{t}</span>)}
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {profile.verifiedAt && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">확인됨</span>}
          <button type="button" onClick={() => setOpen(!open)} className="text-xs font-medium text-primary hover:underline">
            {open ? "접기" : "역량 보기"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            {[
              ["전문 질환영역", profile.therapeuticAreas.join(", ")],
              ["경험 단계", profile.phases.join(", ")],
              ["수행 지역", profile.regions.join(", ")],
              ["직원 수", profile.employees !== null ? `${profile.employees.toLocaleString()}명` : ""],
              ["연간 수행 과제", profile.annualProjects !== null ? `${profile.annualProjects}건` : ""],
              ["인증", profile.certifications.join(", ")],
              ...extraFields.map((f) => {
                const v = profile.extra[f.key];
                return [f.label, Array.isArray(v) ? v.join(", ") : String(v ?? "")] as [string, string];
              }),
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-foreground/40">{k}</dt>
                <dd className="mt-0.5 break-keep text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          {profile.trackRecord && (
            <div>
              <p className="text-xs text-foreground/40">대표 실적</p>
              <p className="mt-1 whitespace-pre-line text-xs text-foreground/80">{profile.trackRecord}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
