"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getAdDetail, type AdDetail } from "@/lib/data/ads";

// 광고 상세 화면(37단계).
//
// 광고주가 자기 사이트 대신 우리 쪽 화면을 쓸 때 열리는 자리다. 메인의
// 카드는 상세 내용이 있으면 여기로, 없으면 광고주 사이트로 바로 걸린다.
//
// 광고주가 준 HTML을 그대로 띄우지 않는다. 그 안의 <script>가
// sonjobdamd.com 권한으로 돌아가면 로그인한 의뢰사의 세션을 읽고 견적과
// 연락처를 가져갈 수 있다. 본문은 평문이라 React가 글자 그대로 그린다 —
// <b>를 적으면 굵어지는 게 아니라 "<b>"가 보인다. 그게 맞다.
//
// 검색엔진에는 올리지 않는다(아래 noindex). 광고 한 장짜리 얇은 화면이
// 우리 사이트 이름으로 검색 결과에 깔리면 사이트 전체 평가가 내려간다.

export default function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ad, setAd] = useState<AdDetail | null | "loading" | "gone">("loading");

  useEffect(() => {
    getAdDetail(id)
      .then((d) => setAd(d ?? "gone"))
      .catch(() => setAd("gone"));
  }, [id]);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  if (ad === "loading") {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-foreground/50">불러오는 중…</div>;
  }

  // 게재가 끝났거나 없는 주소. 광고주가 돌린 링크가 기간 뒤에도 살아
  // 있으면 안 되므로, 없는 척이 아니라 끝났다고 말해 준다.
  if (ad === "gone" || ad === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-foreground">게재가 끝난 광고입니다</h1>
        <p className="mt-3 text-sm text-foreground/60">주소가 맞는지 확인해주세요.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
          손잡다매칭 홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {/* 「광고」 표시는 메인 카드에만 붙이면 부족하다. 링크를 타고 이
          화면에 바로 들어온 사람은 카드를 본 적이 없다. */}
      <div className="flex items-center gap-2">
        <span className="rounded bg-foreground/[0.07] px-1.5 py-0.5 text-[11px] font-semibold tracking-tight text-foreground/70">
          광고
        </span>
        <span className="text-xs text-foreground/50">{ad.companyName}이(가) 제공한 내용입니다.</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {ad.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt={`${ad.companyName} 로고`} className="h-12 max-w-[220px] object-contain object-left" />
        )}
        <p className="text-base font-bold text-foreground">{ad.companyName}</p>
      </div>

      <h1 className="mt-5 break-keep text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl">
        {ad.headline}
      </h1>

      {ad.body && (
        <p className="mt-4 break-keep text-base leading-relaxed text-foreground/70">{ad.body}</p>
      )}

      {ad.detailBody && (
        <div className="mt-8 whitespace-pre-wrap break-keep text-[15px] leading-[1.9] text-foreground/80">
          {ad.detailBody}
        </div>
      )}

      {ad.detailUrls.length > 0 && (
        <div className="mt-8 space-y-4">
          {ad.detailUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={`${ad.companyName} 광고 이미지 ${i + 1}`}
              className="w-full rounded-xl border border-border" />
          ))}
        </div>
      )}

      {ad.linkUrl && (
        <div className="mt-10">
          <a
            href={ad.linkUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            {ad.ctaLabel || "홈페이지 바로가기"}
          </a>
        </div>
      )}

      {/* 광고와 매칭을 섞지 않는다는 말을, 광고를 다 읽은 자리에서 한 번 더
          한다. 이 화면만 보고 "손잡다매칭이 추천한 곳"으로 읽히면 곤란하다. */}
      <div className="mt-12 rounded-xl border border-border bg-surface-subtle p-5">
        <p className="break-keep text-[13px] leading-relaxed text-foreground/60">
          이 화면은 {ad.companyName}이(가) 비용을 지불하고 게재한 광고입니다. 손잡다매칭이
          추천하거나 보증하는 것이 아니며, 광고 게재는 견적 비교 순서나 매칭 결과에 영향을
          주지 않습니다. 광고 내용에 대한 책임은 광고주에게 있습니다.
        </p>
        <Link href="/" className="mt-3 inline-block text-[13px] font-semibold text-primary hover:underline">
          손잡다매칭 홈으로
        </Link>
      </div>
    </div>
  );
}
