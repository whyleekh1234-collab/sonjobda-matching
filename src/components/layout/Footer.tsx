import Link from "next/link";

const linkColumns = [
  {
    heading: "서비스",
    links: [
      { label: "서비스 소개", href: "/#services" },
      { label: "매칭 프로세스", href: "/#process" },
      { label: "파트너사", href: "/#partners" },
    ],
  },
  {
    heading: "회원",
    links: [
      { label: "로그인", href: "/login" },
      { label: "회원가입", href: "/signup" },
      { label: "이메일 찾기", href: "/find-email" },
    ],
  },
  {
    heading: "고객지원",
    links: [
      { label: "문의하기", href: "/inquiry" },
      { label: "공지 · 알림", href: "/notifications" },
      { label: "대시보드", href: "/dashboard" },
    ],
  },
];

const legalLinks = [
  // 개인정보처리방침은 다른 항목보다 눈에 띄게 두는 것이 국내 관례다.
  { label: "개인정보처리방침", href: "/privacy", emphasis: true },
  { label: "이용약관", href: "/terms" },
  { label: "정보보호정책", href: "/security" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 상단: 브랜드 + 링크 컬럼 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-1.5">
              <span className="text-lg font-bold text-primary">손잡다</span>
              <span className="text-lg font-bold text-foreground">매칭</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-foreground/60">
              임상시험 및 바이오 업무의 의뢰사와 파트너사를 연결하는 전문 매칭 플랫폼
            </p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                Contact
              </p>
              <a
                href="mailto:contact@sonjobdamd.com"
                className="mt-1.5 inline-block text-sm text-foreground/70 transition-colors hover:text-primary"
              >
                contact@sonjobdamd.com
              </a>
              <p className="mt-1 text-xs text-foreground/40">
                평일 09:00 – 18:00 (주말 · 공휴일 휴무)
              </p>
            </div>
          </div>

          {linkColumns.map((col) => (
            <div key={col.heading} className="md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/60 transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 마지막 컬럼: 특허 배지 (기존 유지) */}
          <div className="col-span-2 md:col-span-1 md:justify-self-end">
            <span className="inline-block whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/50">
              특허 출원 중
            </span>
          </div>
        </div>

        {/* 중단: 사업자 정보. 한 줄로 이어 쓰는 국내 관례를 따른다. */}
        <div className="border-t border-border py-6">
          <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-foreground/50">
            <div className="flex gap-1.5">
              <dt className="sr-only">상호</dt>
              <dd className="font-medium text-foreground/70">(주) 손잡다메디칼</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>대표</dt>
              <dd className="text-foreground/70">이은정</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>사업자등록번호</dt>
              <dd className="text-foreground/70">501-87-03457</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>주소</dt>
              <dd className="text-foreground/70">
                경기도 남양주시 별내3로 322, 4층 403호 (별내동, 스카이프라자)
              </dd>
            </div>
          </dl>
        </div>

        {/* 하단: 저작권 + 약관 */}
        <div className="flex flex-col gap-3 border-t border-border py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground/40">
            &copy; {new Date().getFullYear()} 손잡다메디칼. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {legalLinks.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`transition-colors hover:text-primary ${
                    item.emphasis ? "font-semibold text-foreground/70" : "text-foreground/40"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="text-foreground/40">이메일 무단수집거부</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
