"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_PROFILE, CERTIFICATIONS, EXTRA_FIELDS,
  getPartnerProfile, savePartnerProfile, profileCompleteness, categoryCompleteness,
  type PartnerProfile, type ExtraField,
} from "@/lib/data/partnerProfiles";

// 마이페이지의 "회사 역량". 카드 한 장(회사 소개) + 회사유형마다 카드 한 장.
// 파트너 역할이 있는 회원이면 누구나 자기 회사 프로필을 고칠 수 있다.

type Draft = Omit<PartnerProfile, "companyId">;
type ArrayCol = "therapeuticAreas" | "phases" | "regions" | "certifications";

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

  const toggleCol = (key: ArrayCol, v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }));
  const setExtra = (key: string, v: string | string[]) =>
    setDraft((d) => ({ ...d, extra: { ...d.extra, [key]: v } }));
  const toggleExtra = (key: string, v: string) => {
    const cur = (draft.extra[key] as string[] | undefined) ?? [];
    setExtra(key, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };

  // 분야 카드의 항목 하나를 그린다. column이 있으면 컬럼 값, 없으면 extra 값.
  const renderField = (f: ExtraField) => {
    const value = f.column ? draft[f.column] : draft.extra[f.key];
    if (f.type === "multi") {
      const selected = (value as string[] | undefined) ?? [];
      return <Chips options={f.options ?? []} selected={selected}
        onToggle={(v) => (f.column ? toggleCol(f.column, v) : toggleExtra(f.key, v))} />;
    }
    return (
      <input type={f.type === "number" ? "number" : "text"} min={0} placeholder={f.placeholder}
        value={String(value ?? "")} onChange={(e) => setExtra(f.key, e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
    );
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

  const current = editing ? draft : (saved ?? EMPTY_PROFILE);
  const pct = profileCompleteness(current, categories);
  const tone = (n: number) => (n >= 80 ? "text-green-600" : n >= 40 ? "text-amber-600" : "text-red-500");
  const bar = (n: number) => (n >= 80 ? "bg-green-500" : n >= 40 ? "bg-amber-500" : "bg-red-400");
  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-4">
      {/* 머리: 제목 + 전체 작성률 + 수정/저장 */}
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
              <p className="text-xs text-foreground/40">전체 작성률</p>
              <p className={`text-lg font-bold ${tone(pct)}`}>{pct}%</p>
            </div>
            {saved?.verifiedAt && !editing && (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">운영자 확인</span>
            )}
            {!editing ? (
              <button type="button" onClick={() => { setDraft(saved ?? EMPTY_PROFILE); setEditing(true); }}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
                {saved ? "수정" : "작성하기"}
              </button>
            ) : (
              <div className="flex gap-2">
                {saved && (
                  <button type="button" onClick={() => { setDraft(saved); setEditing(false); }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-muted">취소</button>
                )}
                <button type="button" onClick={save} disabled={busy}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
                  {busy ? "저장 중…" : "저장"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full transition-all ${bar(pct)}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 카드 1: 회사 소개 (공통) */}
      <Card title="회사 소개" sub="모든 분야에 공통으로 보이는 정보">
        {editing ? (
          <div className="space-y-5">
            <Field label="강점 한 줄" hint="의뢰사에게 가장 먼저 보이는 문장입니다.">
              <input value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} maxLength={120}
                placeholder="예: 종양 Phase II·III 임상 15년, 수도권 대형병원 네트워크 보유" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="직원 수">
                <input type="number" min={0} value={draft.employees ?? ""} onChange={(e) => setDraft({ ...draft, employees: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="연간 수행 과제 수">
                <input type="number" min={0} value={draft.annualProjects ?? ""} onChange={(e) => setDraft({ ...draft, annualProjects: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
              </Field>
            </div>
            <Field label="보유 인증">
              <Chips options={CERTIFICATIONS} selected={draft.certifications} onToggle={(v) => toggleCol("certifications", v)} />
            </Field>
            <Field label="대표 실적" hint="회사명·품목을 밝히기 어려우면 '국내 제약사 A, 고혈압 Phase III, 2024' 정도로 적어도 됩니다.">
              <textarea value={draft.trackRecord} onChange={(e) => setDraft({ ...draft, trackRecord: e.target.value })} rows={4} maxLength={1500}
                placeholder={"예:\n- 국내 상위 제약사, 당뇨 신약 Phase III (2023~2025), 30개 기관\n- 바이오벤처, 항암제 Phase I (2024)"}
                className={`${inputCls} resize-none`} />
            </Field>
          </div>
        ) : (
          <ReadRows rows={[
            ["강점", current.intro],
            ["직원 수", current.employees !== null ? `${current.employees.toLocaleString()}명` : ""],
            ["연간 수행 과제", current.annualProjects !== null ? `${current.annualProjects}건` : ""],
            ["보유 인증", current.certifications.join(", ")],
          ]} longText={["대표 실적", current.trackRecord]} />
        )}
      </Card>

      {/* 카드 2~: 회사유형마다 하나 */}
      {categories.map((cat) => {
        const fields = EXTRA_FIELDS[cat] ?? [];
        const cpct = categoryCompleteness(current, cat);
        return (
          <Card key={cat} title={`${cat} 역량`} sub={`${cat} 의뢰를 받을 때 의뢰사가 보는 항목`}
            badge={<span className={`text-sm font-bold ${tone(cpct)}`}>{cpct}%</span>}>
            {fields.length === 0 ? (
              <p className="text-sm text-foreground/40">이 분야는 추가로 물어보는 항목이 없습니다.</p>
            ) : editing ? (
              <div className="space-y-5">
                {fields.map((f) => <Field key={f.key} label={f.label}>{renderField(f)}</Field>)}
              </div>
            ) : (
              <ReadRows rows={fields.map((f) => {
                const v = f.column ? current[f.column] : current.extra[f.key];
                return [f.label, Array.isArray(v) ? v.join(", ") : String(v ?? "")] as [string, string];
              })} />
            )}
          </Card>
        );
      })}

      {!editing && saved && (
        <p className="px-1 text-xs text-foreground/30">
          {saved.updatedAt && `마지막 수정 ${new Date(saved.updatedAt).toLocaleDateString("ko-KR")}`}
          {saved.verifiedAt ? " · 운영자 확인됨" : " · 운영자 확인 대기"}
        </p>
      )}
    </div>
  );
}

function Card({ title, sub, badge, children }: { title: string; sub?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {sub && <p className="mt-0.5 text-xs text-foreground/40">{sub}</p>}
        </div>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
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

function ReadRows({ rows, longText }: { rows: [string, string][]; longText?: [string, string] }) {
  const filled = rows.filter(([, v]) => v);
  if (filled.length === 0 && !(longText && longText[1])) {
    return <p className="text-sm text-foreground/40">아직 작성하지 않았습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {filled.map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-foreground/40">{k}</p>
            <p className="mt-0.5 break-keep text-sm text-foreground">{v}</p>
          </div>
        ))}
      </div>
      {longText && longText[1] && (
        <div>
          <p className="text-xs text-foreground/40">{longText[0]}</p>
          <p className="mt-1 whitespace-pre-line rounded-lg bg-muted p-3 text-sm text-foreground/80">{longText[1]}</p>
        </div>
      )}
    </div>
  );
}
