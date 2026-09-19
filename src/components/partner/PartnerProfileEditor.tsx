"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_PROFILE, THERAPEUTIC_AREAS, PHASES, REGIONS, CERTIFICATIONS, EXTRA_FIELDS,
  getPartnerProfile, savePartnerProfile, profileCompleteness,
  type PartnerProfile,
} from "@/lib/data/partnerProfiles";

// 마이페이지의 "회사 역량" 편집. 파트너 역할이 있는 회원이면 누구나
// 자기 회사 프로필을 고칠 수 있다(회사 공동 소유).

type Draft = Omit<PartnerProfile, "companyId">;

export default function PartnerProfileEditor({ companyId, categories }: { companyId: string; categories: string[] }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_PROFILE);
  const [saved, setSaved] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPartnerProfile(companyId)
      .then((p) => { if (!alive) return; setSaved(p); setDraft(p ?? EMPTY_PROFILE); setEditing(!p); })
      .catch(console.error)
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [companyId]);

  const toggle = (key: "therapeuticAreas" | "phases" | "regions" | "certifications", v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }));

  const setExtra = (key: string, v: string | string[]) =>
    setDraft((d) => ({ ...d, extra: { ...d.extra, [key]: v } }));

  const toggleExtra = (key: string, v: string) => {
    const cur = (draft.extra[key] as string[] | undefined) ?? [];
    setExtra(key, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };

  const save = async () => {
    setBusy(true);
    try {
      await savePartnerProfile(companyId, draft);
      const p = await getPartnerProfile(companyId);
      setSaved(p); setEditing(false);
      alert("회사 역량이 저장되었습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-border bg-background p-6 text-sm text-foreground/40">불러오는 중…</div>;

  const pct = profileCompleteness(editing ? draft : (saved ?? EMPTY_PROFILE), categories);
  const extraFields = categories.flatMap((c) => (EXTRA_FIELDS[c] ?? []).map((f) => ({ ...f, category: c })));

  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">회사 역량</h3>
          <p className="mt-1 text-xs text-foreground/50">
            의뢰사가 견적을 비교할 때 함께 보는 정보입니다. 충실할수록 선택될 가능성이 높아집니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-foreground/40">작성률</p>
            <p className={`text-lg font-bold ${pct >= 80 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-red-500"}`}>{pct}%</p>
          </div>
          {saved?.verifiedAt && !editing && (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">운영자 확인</span>
          )}
          {!editing && (
            <button type="button" onClick={() => { setDraft(saved ?? EMPTY_PROFILE); setEditing(true); }}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
              {saved ? "수정" : "작성하기"}
            </button>
          )}
        </div>
      </div>

      {/* 진행 바 */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
      </div>

      {!editing && saved ? (
        <ReadOnly p={saved} categories={categories} />
      ) : (
        <div className="mt-6 space-y-6">
          <Field label="강점 한 줄" hint="의뢰사에게 가장 먼저 보이는 문장입니다.">
            <input value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} maxLength={120}
              placeholder="예: 종양 Phase II·III 임상 15년, 수도권 대형병원 네트워크 보유"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </Field>

          <Field label="전문 질환영역">
            <Chips options={THERAPEUTIC_AREAS} selected={draft.therapeuticAreas} onToggle={(v) => toggle("therapeuticAreas", v)} />
          </Field>
          <Field label="경험 단계">
            <Chips options={PHASES} selected={draft.phases} onToggle={(v) => toggle("phases", v)} />
          </Field>
          <Field label="수행 지역">
            <Chips options={REGIONS} selected={draft.regions} onToggle={(v) => toggle("regions", v)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="직원 수">
              <input type="number" min={0} value={draft.employees ?? ""} onChange={(e) => setDraft({ ...draft, employees: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="연간 수행 과제 수">
              <input type="number" min={0} value={draft.annualProjects ?? ""} onChange={(e) => setDraft({ ...draft, annualProjects: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </Field>
          </div>

          <Field label="인증">
            <Chips options={CERTIFICATIONS} selected={draft.certifications} onToggle={(v) => toggle("certifications", v)} />
          </Field>

          {extraFields.length > 0 && (
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs font-semibold text-foreground/50">분야별 항목</p>
              <div className="mt-3 space-y-4">
                {extraFields.map((f) => (
                  <Field key={f.key} label={`${f.label}`} hint={categories.length > 1 ? f.category : undefined}>
                    {f.type === "multi" ? (
                      <Chips options={f.options ?? []} selected={(draft.extra[f.key] as string[] | undefined) ?? []} onToggle={(v) => toggleExtra(f.key, v)} />
                    ) : (
                      <input type={f.type === "number" ? "number" : "text"} min={0} placeholder={f.placeholder}
                        value={String(draft.extra[f.key] ?? "")} onChange={(e) => setExtra(f.key, e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          )}

          <Field label="대표 실적" hint="회사명·품목을 밝히기 어려우면 '국내 제약사 A, 고혈압 Phase III, 2024' 정도로 적어도 됩니다.">
            <textarea value={draft.trackRecord} onChange={(e) => setDraft({ ...draft, trackRecord: e.target.value })} rows={4} maxLength={1500}
              placeholder={"예:\n- 국내 상위 제약사, 당뇨 신약 Phase III (2023~2025), 30개 기관\n- 바이오벤처, 항암제 Phase I (2024)"}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            {saved && (
              <button type="button" onClick={() => { setDraft(saved); setEditing(false); }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-muted">취소</button>
            )}
            <button type="button" onClick={save} disabled={busy}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">{label}{hint && <span className="ml-2 text-xs font-normal text-foreground/40">{hint}</span>}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            selected.includes(o) ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground/60 hover:bg-muted"
          }`}>
          {o}
        </button>
      ))}
    </div>
  );
}

// 저장된 프로필을 읽기 전용으로. 의뢰사 쪽 카드(PartnerProfileCard)와 같은 배치.
function ReadOnly({ p, categories }: { p: PartnerProfile; categories: string[] }) {
  const extraFields = categories.flatMap((c) => EXTRA_FIELDS[c] ?? []);
  const row = (label: string, v: string | string[] | number | null | undefined) => {
    const text = Array.isArray(v) ? v.join(", ") : v === null || v === undefined || v === "" ? "" : String(v);
    if (!text) return null;
    return (
      <div key={label}>
        <p className="text-xs text-foreground/40">{label}</p>
        <p className="mt-0.5 break-keep text-sm text-foreground">{text}</p>
      </div>
    );
  };
  return (
    <div className="mt-5 space-y-4">
      {p.intro && <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm font-medium text-primary">{p.intro}</p>}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {row("전문 질환영역", p.therapeuticAreas)}
        {row("경험 단계", p.phases)}
        {row("수행 지역", p.regions)}
        {row("직원 수", p.employees !== null ? `${p.employees.toLocaleString()}명` : null)}
        {row("연간 수행 과제", p.annualProjects !== null ? `${p.annualProjects}건` : null)}
        {row("인증", p.certifications)}
        {extraFields.map((f) => row(f.label, p.extra[f.key]))}
      </div>
      {p.trackRecord && (
        <div>
          <p className="text-xs text-foreground/40">대표 실적</p>
          <p className="mt-1 whitespace-pre-line rounded-lg bg-muted p-3 text-sm text-foreground/80">{p.trackRecord}</p>
        </div>
      )}
      <p className="text-xs text-foreground/30">
        {p.updatedAt && `마지막 수정 ${new Date(p.updatedAt).toLocaleDateString("ko-KR")}`}
        {p.verifiedAt ? " · 운영자 확인됨" : " · 운영자 확인 대기"}
      </p>
    </div>
  );
}
