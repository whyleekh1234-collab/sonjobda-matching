import Image from "next/image";
import Link from "next/link";
import EmailCollectionNotice from "./EmailCollectionNotice";

// 전자상거래법 제10조가 표시를 요구하는 값들. 실제 값을 받으면 여기
// 한 곳만 바꾸면 화면 전체에 반영된다.
//
// 통신판매업 신고번호는 지금 표시하지 않는다. 아직 수수료를 받지 않아
// 신고를 하지 않았고, 번호가 없는데 "입력 예정"을 띄워 두면 신고를 한
// 것처럼 보일 여지가 있다. 신고 의무는 수수료 유무가 아니라 중개 행위와
// 거래 횟수로 갈리므로(시행령상 직전연도 50회 미만이면 면제), 거래가
// 쌓이면 다시 확인해야 한다. 번호를 받으면 아래 상수를 되살리고 푸터
// 사업자정보에 한 줄 넣으면 된다.
//
//   const MAIL_ORDER_REG_NO = "2026-경기남양주-0000";

// 전화번호는 전자상거래법 제10조의 필수 표시사항이고 이메일로 대신할 수
// 없다. 한동안 번호가 없어 비워 두었다가 2026-10-06에 받아 넣었다.
const CONTACT_PHONE = "070-8064-6954";
//
// 개인정보 보호책임자는 개인정보 보호법 제31조가 공개를 요구한다. 푸터에
// 함께 적는 것이 관례지만, 공개 의무는 처리방침으로 충족된다 — 이 사이트는
// /privacy 제12조에 이름과 연락처를 적어 두었다.
//
//   const PRIVACY_OFFICER = "이은정";

// 특허 출원번호. 형식: 10-2026-0012345
//
// 등록 전에는 "특허 제○○○호"로 쓸 수 없다. 특허법 제224조가 허위표시를
// 금지하고 있고, 출원번호를 등록번호처럼 적는 것이 전형적인 위반이다.
// 그래서 "특허출원"이라는 말을 번호 앞에 붙여 둔다. 등록이 끝나면 등록
// 번호로 바꾸면서 이 문구도 "특허 제○○○호"로 고친다.
const PATENT_APP_NO = "10-2026-0186274";

const linkColumns = [
  {
    heading: "서비스",
    links: [
      { label: "서비스 소개", href: "/#services" },
      { label: "매칭 프로세스", href: "/#process" },
      { label: "자주 묻는 질문", href: "/faq" },
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
      { label: "광고 안내", href: "/advertise" },
      { label: "공지 · 알림", href: "/notifications" },
      { label: "대시보드", href: "/dashboard" },
    ],
  },
];

const legalLinks = [
  // 개인정보처리방침은 다른 항목보다 눈에 띄게 두는 것이 국내 관례다.
  { label: "개인정보처리방침", href: "/privacy", emphasis: true },
  { label: "이용약관", href: "/terms" },
  { label: "서비스운영정책", href: "/policy" },
  { label: "정보보호정책", href: "/security" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 상단: 브랜드 + 링크 컬럼 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            {/* 특허 배지는 브랜드 바로 옆에 둔다. 오른쪽 끝에 떨어뜨려 두면
                어느 컬럼에 딸린 것인지 읽히지 않는다. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link href="/" className="inline-flex items-center gap-2">
                <Image src="/logo-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
                <span className="text-lg font-bold text-foreground">손잡다매칭</span>
              </Link>
              <span className="inline-block whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/50">
                {PATENT_APP_NO ? `특허출원 ${PATENT_APP_NO}` : "특허 출원 중"}
              </span>
            </div>
            {/* "연결하는"에서 끊는다. 폭에 맡기면 창 크기에 따라 "전문"만
                아래로 떨어지는 등 끊기는 자리가 그때그때 달라진다. */}
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-foreground/70">
              제약·바이오 업무의 의뢰사와 파트너사를 연결하는
              <br />
              전문 매칭 플랫폼
            </p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                Contact
              </p>
              <a
                href="mailto:contact@sonjobdamd.com"
                className="mt-1.5 inline-block text-sm text-foreground/70 transition-colors hover:text-primary"
              >
                contact@sonjobdamd.com
              </a>
              <a
                href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
                className="mt-1 block text-sm text-foreground/70 transition-colors hover:text-primary"
              >
                {CONTACT_PHONE}
              </a>
              <p className="mt-1 text-xs text-foreground/75">
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

        </div>

        {/* 중단: 사업자 정보. 한 줄로 이어 쓰는 국내 관례를 따른다. */}
        <div className="border-t border-border py-6">
          <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-foreground/50">
            <div className="flex gap-1.5">
              <dt className="sr-only">상호</dt>
              <dd className="font-medium text-foreground/70">(주) 손잡다메디칼</dd>
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
            <div className="flex gap-1.5">
              <dt>대표전화</dt>
              <dd className="text-foreground/70">{CONTACT_PHONE}</dd>
            </div>
          </dl>

        </div>

        {/* 하단: 저작권 + 약관 */}
        <div className="flex flex-col gap-3 border-t border-border py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground/60">
            &copy; {new Date().getFullYear()} 손잡다메디칼. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {legalLinks.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`transition-colors hover:text-primary ${
                    item.emphasis ? "font-semibold text-foreground/70" : "text-foreground/60"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <EmailCollectionNotice />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
