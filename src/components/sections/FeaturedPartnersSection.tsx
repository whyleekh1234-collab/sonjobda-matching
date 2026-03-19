const partners = [
  {
    name: "메디리서치",
    category: "CRO",
    badge: "검증완료",
    desc: "Phase I~III 임상시험 전문, GCP 인증 보유",
    tags: ["종양학", "희귀질환", "Phase III"],
    projects: 120,
    rating: 4.9,
  },
  {
    name: "바이오텍솔루션",
    category: "CMO",
    badge: "인기",
    desc: "바이오시밀러 및 항체의약품 위탁생산",
    tags: ["항체의약품", "GMP", "스케일업"],
    projects: 85,
    rating: 4.8,
  },
  {
    name: "한국분석연구소",
    category: "분석기관",
    badge: "검증완료",
    desc: "KGMP/GLP 인증 분석 전문기관",
    tags: ["안정성시험", "생동성", "분석법개발"],
    projects: 200,
    rating: 4.9,
  },
  {
    name: "레귤라토리파트너스",
    category: "RA/인허가",
    badge: "추천",
    desc: "국내외 의약품 인허가 컨설팅 전문",
    tags: ["FDA", "MFDS", "CTD 작성"],
    projects: 65,
    rating: 4.7,
  },
  {
    name: "프리클리닉CRO",
    category: "비임상",
    badge: "검증완료",
    desc: "GLP 비임상시험 및 독성시험 전문",
    tags: ["독성시험", "약동학", "GLP"],
    projects: 90,
    rating: 4.8,
  },
  {
    name: "셀바이오로직스",
    category: "CDMO",
    badge: "인기",
    desc: "세포·유전자 치료제 위탁개발생산",
    tags: ["CGT", "세포치료제", "공정개발"],
    projects: 45,
    rating: 4.9,
  },
];

const badgeColors: Record<string, string> = {
  검증완료: "bg-green-100 text-green-700",
  인기: "bg-orange-100 text-orange-700",
  추천: "bg-blue-100 text-blue-700",
};

export default function FeaturedPartnersSection() {
  return (
    <section id="partners" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Featured Partners
            </span>
            <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
              인기 파트너사
            </h2>
            <p className="mt-2 text-base text-foreground/60">
              가장 많이 매칭된 검증된 파트너사를 만나보세요.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
          >
            전체 보기
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 파트너 카드 그리드 */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="group cursor-pointer rounded-2xl border border-border bg-white p-6 transition-all hover:border-primary/20 hover:shadow-lg"
            >
              {/* 상단: 카테고리 + 뱃지 */}
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground/60">
                  {partner.category}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[partner.badge]}`}
                >
                  {partner.badge}
                </span>
              </div>

              {/* 회사명 */}
              <h3 className="mt-4 text-lg font-bold text-foreground group-hover:text-primary">
                {partner.name}
              </h3>

              {/* 설명 */}
              <p className="mt-1 text-sm leading-relaxed text-foreground/60">
                {partner.desc}
              </p>

              {/* 태그 */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {partner.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-primary/5 px-2 py-0.5 text-xs text-primary/80"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* 하단: 프로젝트 수, 평점 */}
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-1 text-sm text-foreground/50">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  프로젝트 {partner.projects}건
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {partner.rating}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
