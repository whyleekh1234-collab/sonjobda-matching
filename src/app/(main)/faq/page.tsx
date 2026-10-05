import type { Metadata } from "next";
import Link from "next/link";

// 자주 묻는 질문.
//
// 답은 전부 운영정책(/policy)과 실제 동작에서 가져왔다. 여기서만 다르게
// 적으면 그게 분쟁의 근거가 된다 — 규칙을 바꾸면 정책과 이 문서를 같이
// 고친다.
//
// 펼침은 <details>로 한다. 자바스크립트 없이 열리고, 닫힌 답도 HTML에
// 그대로 들어 있어 검색엔진이 읽는다. 아래 JSON-LD와 짝이 맞아야 하므로
// 한 곳(FAQ 배열)에서 둘 다 만든다.

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description:
    "손잡다매칭 가입·승인, 의뢰와 견적, 연락처 공개 시점, 비용과 광고에 대해 자주 묻는 질문을 모았습니다.",
  alternates: { canonical: "/faq" },
};

type QA = { q: string; a: string };
type Group = { heading: string; items: QA[] };

const GROUPS: Group[] = [
  {
    heading: "가입 · 승인",
    items: [
      {
        q: "누구나 가입할 수 있나요?",
        a: "사업자등록번호를 가진 법인 또는 개인사업자만 가입할 수 있습니다. 가입 시 입력한 번호는 국세청 조회로 등록 여부와 사업 상태를 확인하며, 등록되지 않았거나 휴업·폐업 상태인 번호로는 가입할 수 없습니다. 사업자등록번호가 없는 개인은 이용할 수 없습니다.",
      },
      {
        q: "가입하면 바로 이용할 수 있나요?",
        a: "운영자 승인을 거친 뒤에 이용할 수 있습니다. 회사를 처음 등록하는 분은 사업자등록증 사본을 제출해야 합니다. 사업자등록번호는 거래 과정에서 널리 알려지는 정보라, 번호만으로는 신청하신 분이 그 회사에 속한 사람인지 확인할 수 없기 때문입니다.",
      },
      {
        q: "병원이나 연구기관도 가입할 수 있나요?",
        a: "가입할 수 있습니다. 다만 의뢰사로만 가입되며 파트너사로는 활동할 수 없습니다. 사업자등록증 대신 고유번호증으로도 가입할 수 있습니다.",
      },
      {
        q: "같은 회사 동료는 어떻게 합류하나요?",
        a: "회사 담당 관리자가 초대 링크를 발급합니다. 초대 링크는 지정된 이메일 주소로만 쓸 수 있고, 발급 후 14일이 지나거나 한 번 사용되면 만료됩니다. 초대 없이 다른 회사의 사업자등록번호로는 가입할 수 없습니다.",
      },
      {
        q: "의뢰사와 파트너사를 둘 다 할 수 있나요?",
        a: "할 수 있습니다. 다만 이해상충을 막기 위해, 파트너사로 등록한 분야와 같은 분야의 의뢰는 등록할 수 없습니다. 예를 들어 CRO 파트너사로 등록한 회사는 CRO 의뢰를 올릴 수 없고 다른 분야 의뢰만 올릴 수 있습니다. 이 제한은 회사 단위로 적용됩니다.",
      },
      {
        q: "회사명이나 주소가 바뀌었습니다.",
        a: "회사 정보는 회원이 직접 바꿀 수 없습니다. 담당 관리자가 변경을 요청하면 검토를 거쳐 반영됩니다. 사업자등록번호가 바뀌는 경우에는 국세청 조회를 다시 받아야 합니다.",
      },
    ],
  },
  {
    heading: "의뢰사 — 의뢰와 견적 비교",
    items: [
      {
        q: "의뢰를 올리면 누가 보게 되나요?",
        a: "해당 분야로 등록한 파트너사에게만 공개됩니다. 매칭이 성사되기 전까지는 파트너사에게 의뢰사의 회사명도 공개되지 않습니다.",
      },
      {
        q: "견적은 몇 곳에서 받을 수 있나요?",
        a: "받을 수 있는 견적 수에 제한은 없습니다. 다만 한 회사는 한 의뢰에 하나의 견적만 제출할 수 있습니다.",
      },
      {
        q: "1차 선정은 무엇인가요?",
        a: "받은 견적 중 최대 세 곳까지 후보로 추리는 단계입니다. 이 단계에서도 서로의 회사명·담당자·연락처는 공개되지 않습니다. 1차 선정된 파트너사는 조건을 보완해 견적을 다시 낼 수 있고, 의뢰사는 1차 선정을 언제든 해제할 수 있습니다. 1차 선정을 거치지 않고 바로 확정할 수도 있습니다.",
      },
      {
        q: "올린 의뢰를 취소할 수 있나요?",
        a: "매칭이 성사되기 전까지는 수정하거나 회수할 수 있습니다. 회수하면 파트너사에게 더 이상 보이지 않고 이미 제출된 견적도 효력을 잃습니다. 회수는 되돌릴 수 없습니다.",
      },
      {
        q: "마감일을 미룰 수 있나요?",
        a: "미룰 수 있습니다. 다만 이미 매칭이 성사되었거나 회수한 의뢰는 연장할 수 없습니다.",
      },
      {
        q: "최종 확정을 취소할 수 있나요?",
        a: "최종 매칭 확정은 되돌릴 수 없습니다. 확정과 동시에 같은 의뢰의 다른 견적은 미결정으로 처리되고 의뢰가 마감되므로, 확정 전에 충분히 검토해 주세요.",
      },
    ],
  },
  {
    heading: "파트너사 — 의뢰 받기와 견적",
    items: [
      {
        q: "의뢰는 어떻게 받나요?",
        a: "등록한 분야에 맞는 의뢰가 자동으로 도착합니다. 따로 찾아다니지 않으셔도 됩니다.",
      },
      {
        q: "제출한 견적을 고칠 수 있나요?",
        a: "의뢰사가 견적을 열어보기 전까지는 수정하거나 회수할 수 있습니다. 열어본 뒤에는 고칠 수 없습니다. 다만 1차 선정 대상이 되면 조건을 보완하기 위해 다시 수정할 수 있습니다.",
      },
      {
        q: "다른 파트너사가 낸 견적을 볼 수 있나요?",
        a: "볼 수 없습니다. 제출된 견적은 그 의뢰를 올린 의뢰사만 전부 열람할 수 있습니다.",
      },
      {
        q: "견적서에 파일을 첨부할 수 있나요?",
        a: "5MB 이하의 문서 파일(PDF, 워드, 엑셀, 파워포인트, 한글, 텍스트, CSV, ZIP)을 올릴 수 있습니다. 그 밖의 형식은 시스템이 막습니다.",
      },
      {
        q: "기업보험 분야는 왜 선택할 수 없나요?",
        a: "기업보험은 초대받은 곳만 활동할 수 있도록 닫아 두었습니다. 활동을 원하시면 문의해 주세요.",
      },
    ],
  },
  {
    heading: "연락처와 정보 보호",
    items: [
      {
        q: "상대방 연락처는 언제 공개되나요?",
        a: "최종 매칭이 확정된 뒤, 그 두 곳 사이에서만 공개됩니다. 1차 선정 단계까지는 양쪽 모두 상대방의 담당자명·이메일·연락처를 볼 수 없습니다. 수락되지 않은 파트너사에게는 공개되지 않습니다. 이는 안내가 아니라 시스템이 막고 있는 것으로, 운영자도 임의로 열어줄 수 없습니다.",
      },
      {
        q: "왜 매칭 전에는 연락처를 알려주지 않나요?",
        a: "플랫폼 밖에서 개별적으로 연락해 거래하는 것을 막기 위해서입니다. 연락처가 먼저 오가면 견적 비교가 공정하게 이뤄지기 어렵습니다.",
      },
      {
        q: "제출한 사업자등록증은 누가 보나요?",
        a: "사업자 확인 목적으로만 쓰이며 운영자만 열람할 수 있습니다. 다른 회원에게는 보이지 않고, 회원 탈퇴 시 파기합니다.",
      },
      {
        q: "비밀번호를 운영자가 볼 수 있나요?",
        a: "볼 수 없습니다. 비밀번호는 되돌릴 수 없는 방식으로 암호화해 보관하므로 운영자도 원래 값을 알 수 없습니다. 잊으셨다면 재설정을 이용해 주세요.",
      },
    ],
  },
  {
    heading: "비용과 광고",
    items: [
      {
        q: "이용료나 수수료가 있나요?",
        a: "가입비, 이용료, 매칭 수수료를 받지 않습니다. 손잡다메디칼은 통신판매중개자로서 매칭 서비스만 제공합니다. 추후 요금 정책이 바뀔 수 있으며, 변경 시 서비스 내 공지로 미리 알려드립니다.",
      },
      {
        q: "매칭 후 계약과 대금은 어떻게 되나요?",
        a: "매칭 이후의 계약과 대금은 의뢰사와 파트너사가 직접 진행합니다. 회사는 거래의 당사자가 아니며, 거래 내용에 대한 책임은 양 당사자에게 있습니다.",
      },
      {
        q: "메인 화면에 보이는 기업 광고는 무엇인가요?",
        a: "기업이 비용을 지불하고 게재하는 광고입니다. 광고 게재는 견적 비교 순서나 매칭 결과에 전혀 영향을 주지 않습니다. 광고와 매칭은 분리되어 있으며, 광고를 샀다고 해서 의뢰가 더 가거나 견적이 위에 놓이지 않습니다.",
      },
      {
        q: "광고를 올리고 싶습니다.",
        a: "contact@sonjobdamd.com 으로 회사명·담당자·연락처와 함께 보내주세요. 게재 자리와 조건을 안내해 드립니다.",
      },
    ],
  },
];

// 검색 결과에 질문과 답이 함께 나오도록 알려 준다. 화면에 보이는 것과
// 다른 내용을 적으면 구조화 데이터 위반이라, 위 배열을 그대로 쓴다.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: GROUPS.flatMap((g) =>
    g.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  ),
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">자주 묻는 질문</h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-foreground/60">
          여기에 없는 내용은{" "}
          <Link href="/inquiry" className="font-semibold text-primary hover:underline">
            문의하기
          </Link>
          로 남겨주시면 답변해 드립니다. 자세한 규칙은{" "}
          <Link href="/policy" className="font-semibold text-primary hover:underline">
            서비스 운영정책
          </Link>
          에 있습니다.
        </p>

        <div className="mt-12 space-y-12">
          {GROUPS.map((group) => (
            <section key={group.heading}>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{group.heading}</h2>
              <div className="mt-4 divide-y divide-border border-y border-border">
                {group.items.map((item) => (
                  <details key={item.q} className="group">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-left">
                      <span className="break-keep text-[15px] font-medium text-foreground">
                        {item.q}
                      </span>
                      {/* 더하기에서 빼기로 바뀐다. 화살표보다 열림·닫힘이 또렷하다. */}
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-foreground/40 transition-transform group-open:rotate-45"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </span>
                    </summary>
                    <p className="-mt-1 break-keep pb-5 pr-9 text-sm leading-relaxed text-foreground/70">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
