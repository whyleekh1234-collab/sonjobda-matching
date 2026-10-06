import type { Metadata } from "next";
import Link from "next/link";

// 광고 안내와 게재 기준.
//
// 제약·바이오는 광고에 걸린 법이 많다. 그걸 모르는 광고주가 소재를 보내고
// 우리가 그냥 올리면, 책임은 광고주에게 있다고 적어 둔들 우리 화면에
// 실린 것은 사실이다. 그래서 받기 전에 먼저 적어 둔다.
//
// 특히 의료광고가 걸린다. 의료법 시행령이 심의 대상 매체에 "통신판매중개업자가
// 운영하는 인터넷 매체"를 넣어 두었는데, 우리가 약관과 푸터에서 스스로를
// 통신판매중개자라고 밝히고 있으므로 그대로 해당된다.
//
// 가격은 적지 않는다. 숫자를 바꿀 때마다 이 화면을 같이 고쳐야 하고,
// 한 번 적힌 금액은 협상 자리에서 먼저 꺼내진다.

export const metadata: Metadata = {
  title: "광고 안내",
  description:
    "손잡다매칭 메인 화면 광고의 게재 기준과 소재 규격입니다. 제약·바이오 분야 광고에 적용되는 법령 제한을 함께 안내합니다.",
  alternates: { canonical: "/advertise" },
};

const CONTACT = "contact@sonjobdamd.com";

// 법으로 막히거나 사전심의를 거쳐야 하는 것들. 근거 법령을 같이 적는다 —
// "저희 방침입니다"로만 말하면 왜 안 되는지 설득이 안 되고, 광고주가
// 심의를 받아 오면 되는 건인지 아예 안 되는 건인지도 구분되지 않는다.
const LEGAL = [
  {
    what: "전문의약품",
    rule: "약사법 제68조",
    detail:
      "제품명이나 효능·효과를 적는 것은 게재할 수 없습니다. 이 화면은 로그인하지 않아도 보이므로 불특정 다수에게 도달하는 매체이고, 법원은 그런 경우를 대중광고로 봅니다. 회사 소개와 사업 분야를 알리는 것은 가능합니다.",
    allowed: false,
  },
  {
    what: "의료기관(병원·의원) 광고",
    rule: "의료법 제57조",
    detail:
      "의료광고 사전심의를 받은 소재만 게재할 수 있습니다. 의료법 시행령이 심의 대상 매체에 통신판매중개업자가 운영하는 인터넷 매체를 포함하고 있고, 손잡다매칭이 여기에 해당합니다. 심의필 번호를 함께 보내주세요.",
    allowed: "심의",
  },
  {
    what: "의료기기",
    rule: "의료기기법 제24조",
    detail:
      "광고 사전심의를 받은 소재만 게재할 수 있습니다. 심의받지 않은 제품 광고, 심의받은 내용과 다른 표현은 게재할 수 없습니다.",
    allowed: "심의",
  },
  {
    what: "건강기능식품의 기능성 표시",
    rule: "건강기능식품에 관한 법률 제18조",
    detail:
      "기능성을 표시·광고하려면 사전심의를 거쳐야 합니다. 질병의 예방이나 치료에 효과가 있다는 표현은 심의 여부와 관계없이 게재할 수 없습니다.",
    allowed: "심의",
  },
  {
    what: "객관적 근거 없는 최상급 표현",
    rule: "표시·광고의 공정화에 관한 법률 제3조",
    detail:
      "「국내 1위」, 「최고」, 「유일」 같은 표현은 그렇게 말할 수 있는 자료를 함께 주셔야 합니다. 자료가 없으면 부당한 표시·광고가 됩니다.",
    allowed: false,
  },
];

const HOUSE = [
  [
    "다른 파트너사를 깎아내리는 내용",
    "같은 분야의 다른 회원과 견주어 낮추는 표현은 받지 않습니다. 이 자리는 서로 견적으로 경쟁하는 곳이지, 광고로 다투는 곳이 아닙니다.",
  ],
  [
    "매칭에서 유리해진다는 뜻으로 읽힐 내용",
    "「공식 파트너」, 「추천 업체」처럼 손잡다매칭이 보증한다는 뜻이 되는 표현은 쓸 수 없습니다. 사실이 아니고, 광고를 산 곳이 매칭에서 유리하다고 믿게 만듭니다.",
  ],
  [
    "동영상과 움직이는 그림",
    "그림 파일만 올릴 수 있습니다. 움직이는 광고는 의뢰를 올리러 온 분의 주의를 가져가므로 받지 않습니다.",
  ],
  [
    "개인을 상대로 한 금융·투자 권유",
    "이곳은 기업 간 거래를 위한 자리입니다. 개인 대상 대출·투자 권유는 게재할 수 없습니다.",
  ],
  [
    "사실과 다른 실적·인증",
    "확인되지 않는 수치나 보유하지 않은 인증을 적을 수 없습니다. 확인을 요청드릴 수 있습니다.",
  ],
];

const SPEC = [
  ["이미지", "가로형 352 × 88px 권장 (4:1), 2MB 이내, PNG · JPG · SVG"],
  ["한 줄 문구", "60자 이내. 카드에 나가는 유일한 문장입니다."],
  ["연결할 주소", "http:// 또는 https:// 로 시작하는 주소"],
  ["게재 기간", "시작일과 종료일을 정해 운영합니다. 종료일이 지나면 자동으로 내려갑니다."],
];

export default function AdvertisePage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">광고 안내</h1>
        <p className="mt-3 break-keep text-[15px] leading-relaxed text-foreground/70">
          손잡다매칭 메인 화면에 기업 광고를 게재하실 수 있습니다. 제약·바이오 분야 의뢰사와
          파트너사가 보는 자리입니다.
        </p>

        {/* 광고주가 가장 먼저 궁금해할 것을 맨 위에 둔다. 아래까지 읽고
            "그런데 매칭에 영향은 없나"를 묻게 두지 않는다. */}
        <div className="mt-8 rounded-2xl border border-border bg-surface-subtle p-6">
          <p className="break-keep text-sm leading-relaxed text-foreground/75">
            광고 게재는 <b className="font-semibold text-foreground">견적 비교 순서나 매칭 결과에 영향을 주지 않습니다.</b>{" "}
            광고와 매칭은 분리되어 있으며, 광고를 게재했다고 해서 의뢰가 더 가거나 견적이 위에
            놓이지 않습니다. 게재된 광고에는 「광고」 표시가 항상 붙으며, 이 표시는 끌 수 없습니다.
          </p>
        </div>

        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">법령에 따른 제한</h2>
          <p className="mt-2 break-keep text-sm leading-relaxed text-foreground/60">
            제약·바이오 분야는 광고에 걸린 법이 많습니다. 아래는 저희 방침이 아니라 법령에 따른
            것이라, 합의로 넘어갈 수 없습니다.
          </p>
          <div className="mt-5 space-y-3">
            {LEGAL.map((item) => (
              <div key={item.what} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-keep text-[15px] font-semibold text-foreground">{item.what}</h3>
                  {item.allowed === "심의" ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                      사전심의 필요
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">
                      게재 불가
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-foreground/45">{item.rule}</span>
                </div>
                <p className="mt-2 break-keep text-sm leading-relaxed text-foreground/70">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">받지 않는 광고</h2>
          <p className="mt-2 break-keep text-sm leading-relaxed text-foreground/60">
            법에 걸리지는 않지만 이 자리의 성격과 맞지 않는 것들입니다.
          </p>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {HOUSE.map(([h, p]) => (
              <div key={h} className="py-4">
                <h3 className="break-keep text-[15px] font-semibold text-foreground">{h}</h3>
                <p className="mt-1.5 break-keep text-sm leading-relaxed text-foreground/70">{p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">소재 규격</h2>
          <dl className="mt-5 divide-y divide-border border-y border-border">
            {SPEC.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                <dt className="w-32 flex-shrink-0 text-sm font-semibold text-foreground">{k}</dt>
                <dd className="break-keep text-sm leading-relaxed text-foreground/70">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">게재 절차와 책임</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/70">
            <li className="break-keep">
              · 보내주신 소재는 운영자가 위 기준에 맞는지 확인한 뒤 게재합니다. 기준에 맞지 않으면
              게재를 거절하거나 수정을 요청드립니다.
            </li>
            <li className="break-keep">
              · 게재 후에도 기준에 어긋나는 것이 확인되면 게재를 중단할 수 있습니다. 이 경우 남은
              기간에 해당하는 금액을 돌려드립니다.
            </li>
            <li className="break-keep">
              · 광고 내용의 사실 여부와 그에 따른 법적 책임은 광고주에게 있습니다. 손잡다매칭은
              광고 내용을 보증하지 않으며, 광고주와 이용자 사이에 생긴 분쟁의 당사자가 아닙니다.
            </li>
            <li className="break-keep">
              · 사전심의가 필요한 소재는 심의필 번호를 함께 보내주세요. 확인되지 않으면 게재할 수
              없습니다.
            </li>
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-border bg-surface p-7">
          <h2 className="text-lg font-bold tracking-tight text-foreground">광고 문의</h2>
          <p className="mt-2 break-keep text-sm leading-relaxed text-foreground/70">
            회사명, 담당자, 연락처와 함께 보내주시면 게재 자리와 조건을 안내해 드립니다.
            소재가 준비되지 않으셨어도 괜찮습니다.
          </p>
          <a
            href={`mailto:${CONTACT}?subject=${encodeURIComponent("[광고 문의] 손잡다매칭 메인 화면 광고")}&body=${encodeURIComponent("회사명:\n담당자:\n연락처:\n희망 게재 기간:\n문의 내용:\n")}`}
            className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            {CONTACT} 으로 문의하기
          </a>
          <p className="mt-5 text-sm text-foreground/60">
            서비스에 대한 다른 궁금증은{" "}
            <Link href="/faq" className="font-semibold text-primary hover:underline">
              자주 묻는 질문
            </Link>
            을 보세요.
          </p>
        </section>
      </div>
    </div>
  );
}
