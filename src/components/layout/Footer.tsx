import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* 회사 정보 */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">손잡다</span>
              <span className="text-lg font-bold text-foreground">매칭</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
              임상시험 및 바이오 업무의 의뢰사와
              <br />
              파트너사를 연결하는 전문 매칭 플랫폼
            </p>
          </div>

          {/* 바로가기 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">바로가기</h3>
            <ul className="mt-3 space-y-2">
              {[
                { label: "서비스 소개", href: "#services" },
                { label: "매칭 프로세스", href: "#process" },
                { label: "파트너사", href: "#partners" },
                { label: "문의하기", href: "#contact" },
              ].map((item) => (
                <li key={item.href}>
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

          {/* 연락처 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">연락처</h3>
            <ul className="mt-3 space-y-2 text-sm text-foreground/60">
              <li>(주) 손잡다메디칼</li>
              <li>sonjobdamd.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-xs text-foreground/40">
            &copy; {new Date().getFullYear()} (주) 손잡다메디칼. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
