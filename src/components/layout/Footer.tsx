import Link from "next/link";

const linkColumns = [
  {
    heading: "고객지원",
    links: [
      { label: "문의하기", href: "/inquiry" },
      { label: "공지 · 알림", href: "/notifications" },
      { label: "대시보드", href: "/dashboard" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-12">
          {/* 브랜드 · 회사 정보 */}
          <div className="col-span-2 md:col-span-5">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">손잡다</span>
              <span className="text-lg font-bold text-foreground">매칭</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
              임상시험 및 바이오 업무의 의뢰사와
              <br />
              파트너사를 연결하는 전문 매칭 플랫폼
            </p>
            <ul className="mt-5 space-y-1.5 text-sm text-foreground/60">
              <li>(주) 손잡다메디칼</li>
              <li>대표자 : 이은정</li>
              <li>사업자등록번호 : 501-87-03457</li>
              <li>
                경기도 남양주시 별내3로 322,
                <br />4층 403호 (별내동, 스카이프라자)
              </li>
            </ul>
            <span className="mt-4 inline-block rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground/50">
              특허 출원 중 (출원번호 10-2026-0000000)
            </span>
          </div>

          {/* 링크 컬럼 */}
          {linkColumns.map((col) => (
            <div key={col.heading} className="md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-foreground/60 transition-colors hover:text-primary"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-foreground/40">
            &copy; {new Date().getFullYear()} (주) 손잡다메디칼. All rights
            reserved.
          </p>
          <ul className="flex items-center gap-4 text-xs text-foreground/40">
            <li>
              <Link
                href="/privacy"
                className="transition-colors hover:text-primary"
              >
                개인정보 처리방침
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="transition-colors hover:text-primary"
              >
                이용약관
              </Link>
            </li>
            <li>
              <Link
                href="/security"
                className="transition-colors hover:text-primary"
              >
                정보보호정책
              </Link>
            </li>
            <li>
              <Link
                href="/inquiry"
                className="transition-colors hover:text-primary"
              >
                이메일 무단수집거부
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
