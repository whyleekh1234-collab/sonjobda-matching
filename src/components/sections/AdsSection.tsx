"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listActiveAds, recordAdClick, AD_SLOTS, type ActiveAd } from "@/lib/data/ads";

// 메인 화면 광고. 돈을 받고 파는 자리다(36단계).
//
// 앞의 구역들과 다른 점이 셋 있다.
//
// 하나, 비어 있어도 구역이 사라지지 않는다. 다른 구역은 내용이 없으면
// 숨기는 게 낫지만, 여기서는 빈 칸 자체가 "이 자리를 팝니다"라는 알림이다.
// 광고주가 될 사람이 보고 문의하게 하려고 둔 자리다.
//
// 둘, 「광고」 표시를 뗄 수 없게 붙여 둔다. 대가를 받은 노출을 광고가
// 아닌 것처럼 보이게 하면 표시광고법상 기만적 표시다. 운영자 화면에도
// 이 표시를 끄는 스위치는 없다.
//
// 셋, 바깥으로 나가는 링크에 rel="sponsored nofollow"를 붙인다. 돈을 받은
// 링크를 그냥 두면 검색엔진이 링크를 사고판 것으로 보고 우리 사이트까지
// 깎는다. sponsored가 바로 이 경우를 위한 표시다.

const CONTACT = "contact@sonjobdamd.com";
const INQUIRY_HREF =
  `mailto:${CONTACT}` +
  `?subject=${encodeURIComponent("[광고 문의] 손잡다매칭 메인 화면 광고")}` +
  `&body=${encodeURIComponent(
    "회사명:\n담당자:\n연락처:\n희망 게재 기간:\n문의 내용:\n",
  )}`;

function AdBadge() {
  return (
    <span className="rounded bg-foreground/[0.07] px-1.5 py-0.5 text-[11px] font-semibold tracking-tight text-foreground/70">
      광고
    </span>
  );
}

function FilledCard({ ad }: { ad: ActiveAd }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        {/* 그림이 없는 광고도 있다. 그 자리를 비워 두면 줄이 흔들리므로
            회사명을 크게 앉힌다. */}
        {ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          // 넉 줄로 설 때 칸이 292px까지 좁아진다. 그 안쪽(252px)의 70%,
          // 높이 44px이 로고가 쓸 수 있는 전부다. 더 키우면 한 줄 문구가
          // 밀려나고, 광고 카드에서 가장 중요한 건 문구다.
          <img
            src={ad.imageUrl}
            alt={`${ad.companyName} 로고`}
            className="h-11 max-w-[70%] object-contain object-left"
          />
        ) : (
          <span className="truncate text-sm font-bold text-foreground">{ad.companyName}</span>
        )}
        <AdBadge />
      </div>

      <p className="mt-4 break-keep text-[15px] font-semibold leading-snug text-foreground">
        {ad.headline}
      </p>

      {ad.body && (
        <p className="mt-2 break-keep text-[13px] leading-relaxed text-foreground/65">{ad.body}</p>
      )}

      {/* 그림을 썼다면 회사명이 아직 안 나왔다. 광고주가 누구인지는
          반드시 드러나야 한다 — 누가 돈을 냈는지 모르는 광고는 광고 표시를
          해도 의미가 없다. */}
      {ad.imageUrl && (
        <p className="mt-auto pt-4 text-xs font-medium text-foreground/50">{ad.companyName}</p>
      )}
    </>
  );

  const shell =
    "flex min-h-[172px] flex-col rounded-2xl border border-border bg-surface p-5 text-left transition-shadow";

  // 상세 화면을 받아 둔 광고는 우리 쪽 화면으로, 아니면 광고주 사이트로.
  // 광고주가 무엇을 주느냐로 갈린다 — 운영자가 따로 고를 것이 없다.
  if (ad.hasDetail) {
    return (
      <Link href={`/ads/${ad.id}`} onClick={() => recordAdClick(ad.id)} className={`${shell} hover:shadow-card`}>
        {inner}
      </Link>
    );
  }

  if (!ad.linkUrl) {
    return <div className={shell}>{inner}</div>;
  }

  return (
    <a
      href={ad.linkUrl}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      onClick={() => recordAdClick(ad.id)}
      className={`${shell} hover:shadow-card`}
    >
      {inner}
    </a>
  );
}

// 빈 칸. 좁은 화면에서는 첫 칸만 보인다 — 같은 문구를 네 번 세로로
// 쌓으면 700px짜리 같은 말 반복이 되고, 파는 자리가 아니라 빈 사이트처럼
// 읽힌다. 한 번만 제대로 말하는 편이 광고주를 더 부른다.
function EmptyCard({ first }: { first: boolean }) {
  return (
    <a
      href={INQUIRY_HREF}
      className={`${first ? "flex" : "hidden sm:flex"} min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-subtle p-5 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03] sm:min-h-[172px]`}
    >
      <span className="text-sm font-semibold text-foreground/70">이 자리에 광고를 올려보세요</span>
      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        2주 무료
      </span>
      <span className="text-xs text-foreground/50">광고 문의하기</span>
    </a>
  );
}

export default function AdsSection() {
  const [ads, setAds] = useState<ActiveAd[] | null>(null);

  useEffect(() => {
    listActiveAds()
      .then(setAds)
      .catch(() => setAds([]));
  }, []);

  // 불러오기가 끝나기 전에는 빈 칸을 그리지 않는다. 광고가 있는데도
  // "이 자리에 광고를 올려보세요"가 한 번 번쩍이면 우스워진다.
  const slots = ads === null ? [] : Array.from({ length: Math.max(AD_SLOTS, ads.length) }, (_, i) =>
    ads.find((a) => a.slot === i + 1) ?? null,
  );

  return (
    <section id="ads" className="border-y border-border bg-surface py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            파트너사 광고
          </h2>
          {/* 이 한 줄이 이 구역에서 가장 중요하다. 광고를 샀다고 매칭에서
              유리해지지 않는다는 약속을, 광고 바로 옆에서 한다. */}
          <p className="break-keep text-[13px] text-foreground/55">
            광고 노출은 견적 비교 순서나 매칭 결과에 영향을 주지 않습니다.
          </p>
        </div>

        <div className="mt-6 grid min-h-[172px] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {slots.map((ad, i) =>
            ad ? (
              <FilledCard key={ad.id} ad={ad} />
            ) : (
              <EmptyCard key={`empty-${i}`} first={slots.findIndex((x) => x === null) === i} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
