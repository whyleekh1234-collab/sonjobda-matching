"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminListAds, adminSaveAd, adminDeleteAd, uploadAdImage,
  AD_SLOTS, type AdminAd, type AdInput,
} from "@/lib/data/ads";
import { supabaseUrl } from "@/lib/supabase/env";
import { toast } from "@/components/ui/Toast";
import { confirmDialog } from "@/components/ui/Confirm";

// 메인 화면 광고 관리(36단계).
//
// 자리마다 하나씩, 넉 칸을 한눈에 놓고 고친다. 목록과 등록 폼을 따로
// 두면 "지금 몇 칸이 팔렸나"를 세어 봐야 하는데, 그게 이 화면에서 가장
// 자주 보게 될 숫자다.
//
// 「광고」 표시를 끄는 스위치는 없다. 대가를 받은 노출을 광고가 아닌
// 것처럼 보이게 하는 것은 표시광고법 위반이라, 운영자도 못 끄게 둔다.

type Draft = {
  companyName: string;
  headline: string;
  body: string;
  linkUrl: string;
  startsOn: string;
  endsOn: string;
  isActive: boolean;
  memo: string;
  imagePath: string | null;
  detailBody: string;
  detailImages: string[];
  ctaLabel: string;
};

const EMPTY: Draft = {
  companyName: "", headline: "", body: "", linkUrl: "",
  startsOn: "", endsOn: "", isActive: true, memo: "", imagePath: null,
  detailBody: "", detailImages: [], ctaLabel: "",
};

function toDraft(ad: AdminAd): Draft {
  return {
    companyName: ad.companyName,
    headline: ad.headline,
    body: ad.body ?? "",
    linkUrl: ad.linkUrl ?? "",
    startsOn: ad.startsOn ?? "",
    endsOn: ad.endsOn ?? "",
    isActive: ad.isActive,
    memo: ad.memo ?? "",
    imagePath: ad.imagePath,
    detailBody: ad.detailBody ?? "",
    detailImages: ad.detailImages ?? [],
    ctaLabel: ad.ctaLabel ?? "",
  };
}

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const label = "text-xs font-medium text-foreground/60";

export default function AdsPanel() {
  const [ads, setAds] = useState<AdminAd[] | null>(null);
  // 지금 펼쳐 놓고 고치는 자리 번호. 하나만 펼친다 — 넉 칸을 다 펼치면
  // 어느 칸을 고치고 있었는지 잃는다.
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const detailRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      setAds(await adminListAds());
    } catch (err) {
      toast(err instanceof Error ? err.message : "광고를 불러오지 못했습니다.", "error");
      setAds([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (slot: number, ad: AdminAd | null) => {
    setEditing(slot);
    setDraft(ad ? toDraft(ad) : EMPTY);
  };

  const close = () => { setEditing(null); setDraft(EMPTY); };

  const save = async (slot: number, existing: AdminAd | null) => {
    if (!draft.companyName.trim()) { toast("광고주 회사명을 입력해주세요."); return; }
    if (!draft.headline.trim()) { toast("광고 한 줄 문구를 입력해주세요."); return; }
    setBusy(true);
    try {
      const payload: AdInput = {
        id: existing?.id ?? null,
        slot,
        companyName: draft.companyName.trim(),
        headline: draft.headline.trim(),
        body: draft.body.trim() || null,
        linkUrl: draft.linkUrl.trim() || null,
        startsOn: draft.startsOn || null,
        endsOn: draft.endsOn || null,
        isActive: draft.isActive,
        memo: draft.memo.trim() || null,
        imagePath: draft.imagePath,
        detailBody: draft.detailBody.trim() || null,
        detailImages: draft.detailImages,
        ctaLabel: draft.ctaLabel.trim() || null,
      };
      await adminSaveAd(payload);
      toast(`${slot}번 자리를 저장했습니다.`);
      close();
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "저장하지 못했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ad: AdminAd) => {
    const ok = await confirmDialog(
      `${ad.slot}번 자리의 「${ad.companyName}」 광고를 지웁니다. 클릭 수 기록도 함께 사라집니다.`,
      { confirmLabel: "삭제", danger: true },
    );
    if (!ok) return;
    try {
      await adminDeleteAd(ad.id);
      toast("광고를 지웠습니다.");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "지우지 못했습니다.", "error");
    }
  };

  // 게재를 멈추거나 다시 시작한다. 지우는 것과 다르다 — 클릭 수가 남는다.
  const toggle = async (ad: AdminAd) => {
    try {
      await adminSaveAd({
        id: ad.id, slot: ad.slot, companyName: ad.companyName, headline: ad.headline,
        body: ad.body, linkUrl: ad.linkUrl, startsOn: ad.startsOn, endsOn: ad.endsOn,
        memo: ad.memo, imagePath: ad.imagePath, isActive: !ad.isActive,
        // 같이 보내지 않으면 저장 함수가 빈 값으로 덮어써서 상세 화면이
        // 통째로 날아간다.
        detailBody: ad.detailBody, detailImages: ad.detailImages, ctaLabel: ad.ctaLabel,
      });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "바꾸지 못했습니다.", "error");
    }
  };

  const pickImage = async (slot: number, file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadAdImage(slot, file);
      setDraft((d) => ({ ...d, imagePath: path }));
      toast("그림을 올렸습니다. 아래 저장을 눌러주세요.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "올리지 못했습니다.", "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // 상세 화면용 그림. 여러 장을 한 번에 받는다.
  const pickDetailImages = async (slot: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) paths.push(await uploadAdImage(slot, f));
      setDraft((d) => ({ ...d, detailImages: [...d.detailImages, ...paths] }));
      toast(`${paths.length}장을 올렸습니다. 아래 저장을 눌러주세요.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "올리지 못했습니다.", "error");
    } finally {
      setBusy(false);
      if (detailRef.current) detailRef.current.value = "";
    }
  };

  if (ads === null) {
    return <p className="mt-8 text-sm text-foreground/50">불러오는 중…</p>;
  }

  const slotCount = Math.max(AD_SLOTS, ...ads.map((a) => a.slot));
  const slots = Array.from({ length: slotCount }, (_, i) => ads.find((a) => a.slot === i + 1) ?? null);
  const live = ads.filter((a) => a.isLive).length;

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h3 className="text-base font-bold text-foreground">
            메인 화면 광고{" "}
            <span className="ml-1 text-sm font-normal text-foreground/60">
              {slotCount}칸 중 {live}칸 게재 중
            </span>
          </h3>
          <a href="/#ads" target="_blank" rel="noopener" className="text-xs font-medium text-primary hover:underline">
            메인 화면에서 보기
          </a>
        </div>
        <p className="mt-3 break-keep text-[13px] leading-relaxed text-foreground/60">
          비어 있는 칸은 메인 화면에 「이 자리에 광고를 올려보세요 · 2주 무료」로 나가고,
          문의는 contact@sonjobdamd.com으로 들어옵니다. 게재한 광고에는 「광고」 표시가
          항상 붙습니다 — 대가를 받은 노출을 광고가 아닌 것처럼 보이게 하는 것은
          표시광고법 위반이라 끌 수 없게 두었습니다.
        </p>

        {/* 광고주에게 그대로 전달할 수 있게 한 자리에 모아 둔다. 매번
            "사이즈가 뭐죠"를 되묻게 되는 항목들이다. */}
        <div className="mt-4 rounded-xl bg-surface-subtle p-4">
          <p className="text-xs font-semibold text-foreground/70">광고주에게 받을 것</p>
          <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-foreground/60">
            <li>· 로고 — 가로형 352×88px 권장, PNG·JPG·SVG, 2MB 이내</li>
            <li>· 한 줄 문구 60자 이내 · 설명 120자 이내</li>
            <li>· 연결할 주소 (http:// 또는 https://)</li>
            <li>· 게재 시작일·종료일</li>
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground/60">
            <b className="font-semibold text-foreground/75">동영상은 올릴 수 없습니다.</b>{" "}
            그림 파일만 받도록 막아 두었습니다. 움직이는 그림(애니메이션 GIF·WebP)도
            올리지 마세요 — 파일 형식만으로는 완전히 걸러지지 않으니, 저장 전에 왼쪽
            미리보기로 움직이지 않는지 확인해주세요.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {slots.map((ad, i) => {
          const slot = i + 1;
          const isEditing = editing === slot;

          return (
            <div key={slot} className="rounded-2xl border border-border bg-background p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-xs font-bold text-foreground/60">
                    {slot}
                  </span>

                  {ad ? (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{ad.companyName}</p>
                        {ad.isLive ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">게재 중</span>
                        ) : ad.isActive ? (
                          // 켜져 있는데도 안 보이는 경우 — 기간 밖이다. 이유를 적어 준다.
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            기간 밖
                          </span>
                        ) : (
                          <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-semibold text-foreground/55">중지</span>
                        )}
                      </div>
                      <p className="mt-1.5 break-keep text-sm text-foreground/75">{ad.headline}</p>
                      <p className="mt-2 text-xs text-foreground/50">
                        {ad.startsOn ?? "—"} ~ {ad.endsOn ?? "기한 없음"} · 클릭 {ad.clickCount}회
                        {" · "}
                        {/* 눌렀을 때 어디로 가는지. 운영자가 가장 자주
                            헷갈리는 지점이라 줄마다 적어 둔다. */}
                        {ad.detailBody || ad.detailImages.length > 0
                          ? "누르면 우리 사이트 상세 화면"
                          : ad.linkUrl
                            ? "누르면 광고주 사이트"
                            : "누를 수 없음"}
                      </p>
                      {ad.memo && <p className="mt-1 text-xs text-foreground/50">메모: {ad.memo}</p>}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground/60">비어 있음</p>
                      <p className="mt-1 text-xs text-foreground/50">
                        메인에 「이 자리에 광고를 올려보세요 · 2주 무료」로 나갑니다.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  {ad && (
                    <button type="button" onClick={() => toggle(ad)}
                      className="rounded px-2 py-1 text-xs font-medium text-foreground/60 hover:bg-surface-subtle">
                      {ad.isActive ? "게재 중지" : "게재 시작"}
                    </button>
                  )}
                  <button type="button" onClick={() => (isEditing ? close() : open(slot, ad))}
                    className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5">
                    {isEditing ? "접기" : ad ? "수정" : "광고 등록"}
                  </button>
                  {ad && (
                    <button type="button" onClick={() => remove(ad)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">
                      삭제
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-5 space-y-4 border-t border-border pt-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={label}>광고주 회사명 *</label>
                      <input className={`${input} mt-1`} value={draft.companyName} maxLength={60}
                        onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                        placeholder="예: 에비드넷" />
                    </div>
                    <div>
                      <label className={label}>링크 (클릭하면 열릴 주소)</label>
                      <input className={`${input} mt-1`} value={draft.linkUrl}
                        onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                        placeholder="https://" />
                    </div>
                  </div>

                  <div>
                    <label className={label}>한 줄 문구 *</label>
                    <input className={`${input} mt-1`} value={draft.headline} maxLength={60}
                      onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                      placeholder="카드에서 가장 크게 보이는 줄 (60자 이내)" />
                  </div>

                  <div>
                    <label className={label}>설명</label>
                    <textarea className={`${input} mt-1 resize-none`} rows={2} value={draft.body} maxLength={120}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      placeholder="두 줄 정도. 카드가 작아서 넘치면 잘립니다. (120자 이내)" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className={label}>게재 시작일</label>
                      <input type="date" className={`${input} mt-1`} value={draft.startsOn}
                        onChange={(e) => setDraft({ ...draft, startsOn: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>게재 종료일</label>
                      <input type="date" className={`${input} mt-1`} value={draft.endsOn}
                        onChange={(e) => setDraft({ ...draft, endsOn: e.target.value })} />
                      <p className="mt-1 text-[11px] text-foreground/50">비우면 기한 없이 계속 게재됩니다.</p>
                    </div>
                    <div>
                      <label className={label}>로고 · 그림</label>
                      <div className="mt-1 flex items-center gap-2">
                        {draft.imagePath && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`${supabaseUrl()}/storage/v1/object/public/ad-images/${draft.imagePath}`}
                            alt="광고 그림" className="h-9 w-16 rounded border border-border bg-white object-contain" />
                        )}
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={(e) => pickImage(slot, e.target.files?.[0])}
                          className="w-full text-xs text-foreground/60" />
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-foreground/50">
                        가로형 <b className="font-semibold">352×88px</b> 권장 (화면 표시 176×44px).
                        PNG·JPG·SVG, 2MB 이내. 없으면 회사명이 글자로 나갑니다.
                      </p>
                    </div>
                  </div>

                  {/* ── 상세 화면 ── */}
                  <div className="rounded-xl border border-border bg-surface-subtle p-4">
                    <p className="text-xs font-semibold text-foreground/70">
                      우리 사이트 상세 화면 (선택)
                    </p>
                    <p className="mt-1.5 break-keep text-[12px] leading-relaxed text-foreground/55">
                      아래를 채우면 카드를 눌렀을 때 광고주 사이트가 아니라 우리 사이트의
                      광고 화면(/ads/…)이 열리고, 그 화면 맨 아래 버튼이 광고주 사이트로
                      보냅니다. 비워 두면 카드에서 바로 광고주 사이트로 나갑니다.
                      <br />
                      <b className="font-semibold text-foreground/70">HTML을 받으셨으면 글과 그림만 옮겨 담으세요.</b>{" "}
                      받은 HTML을 그대로 넣어도 태그가 글자 그대로 보일 뿐입니다 — 광고주 쪽
                      스크립트가 우리 사이트 권한으로 돌지 못하게 일부러 막아 둔 것입니다.
                    </p>

                    <div className="mt-3">
                      <label className={label}>본문</label>
                      <textarea className={`${input} mt-1`} rows={6} value={draft.detailBody} maxLength={4000}
                        onChange={(e) => setDraft({ ...draft, detailBody: e.target.value })}
                        placeholder={"광고주가 보낸 소개 글을 붙여넣으세요." + String.fromCharCode(10) + "줄바꿈은 그대로 살아납니다."} />
                    </div>

                    <div className="mt-3">
                      <label className={label}>상세 화면 그림 (여러 장 가능, 가로 폭 전체로 나갑니다)</label>
                      {draft.detailImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {draft.detailImages.map((path) => (
                            <span key={path} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`${supabaseUrl()}/storage/v1/object/public/ad-images/${path}`}
                                alt="상세 그림" className="h-16 w-24 rounded border border-border bg-white object-contain" />
                              <button type="button"
                                onClick={() => setDraft({ ...draft, detailImages: draft.detailImages.filter((x) => x !== path) })}
                                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-[11px] font-bold text-white">
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <input ref={detailRef} type="file" multiple
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => pickDetailImages(slot, e.target.files)}
                        className="mt-2 w-full text-xs text-foreground/60" />
                      <p className="mt-1 text-[11px] text-foreground/50">
                        가로 1200px 이상 권장. 한 장당 2MB 이내.
                      </p>
                    </div>

                    <div className="mt-3">
                      <label className={label}>상세 화면 버튼 글자</label>
                      <input className={`${input} mt-1`} value={draft.ctaLabel} maxLength={20}
                        onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                        placeholder="비우면 「홈페이지 바로가기」" />
                    </div>
                  </div>

                  <div>
                    <label className={label}>운영 메모 (회원에게 보이지 않음)</label>
                    <input className={`${input} mt-1`} value={draft.memo} maxLength={200}
                      onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                      placeholder="계약 조건, 담당자, 입금 여부 등" />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-foreground/75">
                    <input type="checkbox" checked={draft.isActive}
                      onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                    지금 게재 (끄면 기간 안이라도 메인에 안 나갑니다)
                  </label>

                  <div className="flex items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => save(slot, ad)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50">
                      {busy ? "저장 중…" : "저장"}
                    </button>
                    <button type="button" onClick={close}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-surface-subtle">
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
