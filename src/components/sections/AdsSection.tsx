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
  // 크몽처럼 그림이 위에 깔리고 글이 아래로 붙는다. 로고를 구석에 작게
  // 박아 두면 광고주가 규격에 맞춰 로고를 보내와도 살지 않는다.
  const inner = (
    <>
      {/* 규격(352×88)과 같은 4:1 상자다. 높이를 고정하면 규격대로 보낸
          그림이 상자보다 작게 들어가 글씨가 안 읽힌다. 비율을 맞춰 두면
          폭에 꽉 차고, 화면이 넓어질수록 같이 커진다. 비율이 다른 로고는
          object-contain이 가운데로 맞춰 준다. */}
      <div className="relative flex aspect-[4/1] w-full items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white">
        {ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.imageUrl}
            alt={`${ad.companyName} 로고`}
            className="h-full w-full object-contain"
          />
        ) : (
          // 로고가 없는 광고도 있다. 자리를 비워 두면 줄이 흔들리므로
          // 회사명을 대신 앉힌다.
          <span className="truncate text-base font-bold text-foreground">{ad.companyName}</span>
        )}
        <span className="absolute right-1.5 top-1.5">
          <AdBadge />
        </span>
      </div>

      {/* 설명 문단은 두지 않는다. 카드가 200px인데 거기에 두 줄을 더
          넣으면 정작 한 줄 문구가 묻힌다. 할 말이 더 있으면 상세 화면에
          적는다. */}
      <p className="mt-3.5 break-keep text-[15px] font-semibold leading-snug text-foreground">
        {ad.headline}
      </p>
    </>
  );

  const shell =
    "flex min-h-[160px] flex-col rounded-2xl border border-border bg-surface p-3.5 text-left transition-shadow";

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
      className={`${first ? "flex" : "hidden sm:flex"} min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-subtle p-5 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03] sm:min-h-[160px]`}
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
        {/* 제목에 "광고"를 넣지 않는다. 크몽도 구역 제목은 손님에게 말을
            거는 투로 쓰고, 광고라는 사실은 카드마다 딱지로 밝힌다. 다만
            크몽의 "검증한"류는 쓸 수 없다 — 돈을 받은 자리를 우리가
            검증했다고 말하는 순간 그게 문제가 된다. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="break-keep text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            어떤 기업이 있는지 둘러보세요
          </h2>
          {/* 이 한 줄이 이 구역에서 가장 중요하다. 광고를 샀다고 매칭에서
              유리해지지 않는다는 약속을, 광고 바로 옆에서 한다. */}
          <p className="break-keep text-[13px] text-foreground/55">
            각 기업이 직접 올린 광고입니다. 견적 비교 순서나 매칭 결과에는 영향을 주지 않습니다.
          </p>
        </div>

        <div className="mt-6 grid min-h-[160px] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
