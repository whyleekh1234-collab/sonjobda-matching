import type { Metadata } from "next";
import Link from "next/link";
import OpenCountsInline from "@/components/sections/OpenCountsInline";

// 파트너사 모집 안내.
//
// 여기까지 오는 사람은 대개 초대 메일이나 링크를 받고 온다. 전까지는
// 그 링크가 바로 가입 화면으로 떨어졌다 — 왜 등록해야 하는지 말하는
// 자리가 없었다.
//
// 파는 것이 아니라 설명하는 자리다. 등록에 돈이 들지 않으므로 설득할
// 것도 많지 않다. 대신 "등록해 두면 무슨 일이 일어나는가"와 "내 정보가
// 어디까지 보이는가" 둘만 분명하면 된다. 공급사가 이런 곳에 이름을 올릴
// 때 실제로 걱정하는 것이 그 둘이다.
//
// 지금 올라와 있는 의뢰 건수를 같이 띄운다. 말보다 그 숫자가 빠르다.
// 의뢰가 없으면 그 상자는 스스로 사라진다.

export const metadata: Metadata = {
  title: "파트너사 등록 안내",
  description:
    "손잡다매칭에 파트너사로 등록하면 선택한 분야의 의뢰가 올라올 때 알림을 받고 견적을 제출할 수 있습니다. 등록 요건과 절차, 공개되는 정보의 범위를 안내합니다.",
  alternates: { canonical: "/partner" },
};

const STEPS = [
  {
    title: "등록",
    body: "회사 정보와 사업자등록증을 올리고, 견적을 내실 분야를 고릅니다. 사업자등록번호는 국세청 조회로 확인합니다.",
  },
  {
    title: "승인",
    body: "제출하신 서류를 확인한 뒤 승인합니다. 승인 전에는 의뢰를 열람할 수 없습니다.",
  },
  {
    title: "의뢰 알림",
    body: "등록하신 분야에 의뢰가 올라오면 알림과 메일로 알려드립니다. 매일 들어와 확인하실 필요가 없습니다.",
  },
  {
    title: "견적 제출",
    body: "금액·기간·업무범위를 적고 견적서를 첨부합니다. 한 회사당 한 의뢰에 하나씩 제출합니다.",
  },
  {
    title: "1차 선정",
    body: "의뢰사가 후보를 추리면 알려드립니다. 이 단계에서 조건을 보완해 다시 제출하실 수 있습니다.",
  },
  {
    title: "최종 매칭",
    body: "선정되면 의뢰사의 회사명과 담당자 연락처가 공개됩니다. 이후 계약과 진행은 양사가 직접 하십니다.",
  },
];

const VISIBILITY = [
  {
    q: "의뢰사에게 무엇이 보입니까",
    a: "회사명과 제출하신 견적 내용이 보입니다. 견적서 파일도 의뢰사가 열람합니다.",
  },
  {
    q: "다른 파트너사에게 무엇이 보입니까",
    a: "아무것도 보이지 않습니다. 같은 의뢰에 누가 견적을 냈는지, 금액이 얼마인지 서로 알 수 없습니다.",
  },
  {
    q: "의뢰사가 누구인지 언제 알 수 있습니까",
    a: "최종 매칭이 성사된 뒤입니다. 그 전까지는 회사명도 연락처도 공개되지 않습니다. 업종과 기관 유형만 보입니다.",
  },
  {
    q: "사업자등록증은 누가 봅니까",
    a: "손잡다매칭 운영자만 봅니다. 다른 회원에게는 공개되지 않으며, 회사의 마지막 멤버가 탈퇴할 때 파기합니다.",
  },
];

export default function PartnerGuidePage() {
  return (
    <main className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">파트너사 등록 안내</h1>
        <p className="mt-4 text-base leading-7 text-foreground/70">
          손잡다매칭은 제약·바이오·의료기기 분야의 의뢰사와 수탁사를 잇는 중개 플랫폼입니다.
          파트너사로 등록하시면 고르신 분야에 의뢰가 올라올 때 알려드리고, 견적을 제출하실 수
          있습니다. <strong className="font-semibold text-foreground">등록과 견적 제출에는 비용이 들지 않습니다.</strong>
        </p>

        <OpenCountsInline />

        {/* ── 분야 ───────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">등록할 수 있는 분야</h2>
          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              ["CRO", "임상시험 수탁"],
              ["CMO/CDMO", "위탁생산·위탁개발생산"],
              ["SMO", "임상시험 실시기관 관리"],
              ["RA/인허가", "규제기관 승인 수탁"],
              ["기업보험", "책임·생산물·임상시험 보험"],
              ["소모품 공급", "인쇄물·연구용 키트 등"],
              ["원료·첨가제 공급", "원료의약품·부형제 등"],
              ["마케팅 대행", "심포지엄·웨비나·CSO 등"],
            ].map(([name, desc]) => (
              <li key={name} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{name}</p>
                <p className="mt-0.5 text-xs text-foreground/60">{desc}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-foreground/60">
            여러 분야를 함께 등록하실 수 있습니다. 다만 등록하신 분야의 의뢰는 직접 올리실 수
            없습니다 &mdash; 파트너사가 의뢰사인 척 경쟁사의 견적을 보는 것을 막기 위한 제한입니다
            (서비스운영정책 제3조 ⑤).
          </p>
        </section>

        {/* ── 절차 ───────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">등록부터 매칭까지</h2>
          <ol className="mt-5 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="mt-1 text-sm leading-6 text-foreground/70">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── 공개 범위 ──────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">무엇이 공개됩니까</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/60">
            공급사가 이런 곳에 이름을 올릴 때 가장 많이 묻는 것들입니다.
          </p>
          <dl className="mt-5 space-y-5">
            {VISIBILITY.map((v) => (
              <div key={v.q} className="border-l-2 border-border pl-4">
                <dt className="text-sm font-semibold text-foreground">{v.q}</dt>
                <dd className="mt-1 text-sm leading-6 text-foreground/70">{v.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── 준비물 ─────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-tight text-foreground">등록에 필요한 것</h2>
          <ul className="mt-5 space-y-2 text-sm leading-6 text-foreground/70">
            <li>· 사업자등록번호 (국세청 조회로 확인합니다)</li>
            <li>· 사업자등록증 사본 (PDF·PNG·JPG, 5MB 이하)</li>
            <li>· 담당자 이름과 연락처</li>
            <li>· 견적을 내실 분야</li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-foreground/60">
            회사의 다른 담당자는 등록을 마치신 뒤 초대하실 수 있습니다. 같은 사업자등록번호로
            가입한 분들은 하나의 회사로 묶이고, 의뢰와 견적 이력을 함께 보게 됩니다.
          </p>
        </section>

        {/* ── CTA ────────────────────────────────────────── */}
        <section className="mt-14 rounded-2xl border border-border bg-surface p-7">
          <h2 className="text-lg font-bold tracking-tight text-foreground">파트너사 등록</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/70">
            아래에서 바로 등록하실 수 있습니다. 궁금한 점은 문의 화면으로 보내주시면 확인하고
            답변드리겠습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              파트너사로 등록하기
            </Link>
            <Link
              href="/inquiry"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:border-foreground/30"
            >
              문의하기
            </Link>
          </div>
        </section>

        {/* 광고는 등록 다음 이야기다. 먼저 꺼내면 공짜 제안이 영업으로
            읽히고, 공급이 없으면 광고 자리의 값어치도 없다. */}
        <p className="mt-8 text-sm leading-6 text-foreground/50">
          메인 화면에는 광고 자리도 따로 있습니다. 등록을 마치신 뒤 더 눈에 띄고 싶으시다면{" "}
          <Link href="/advertise" className="font-medium text-foreground/70 underline underline-offset-2 hover:text-primary">
            광고 안내
          </Link>
          를 봐주세요.
        </p>
      </div>
    </main>
  );
}
