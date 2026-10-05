import type { Metadata } from "next";
import Link from "next/link";
import FaqList from "@/components/faq/FaqList";
import { GROUPS } from "@/lib/faq";

// 자주 묻는 질문.
//
// 내용은 src/lib/faq.ts에 있다. 검색하는 화면(클라이언트)과 아래 구조화
// 데이터(서버)가 같은 자료를 봐야 어긋나지 않는다.

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description:
    "손잡다매칭 가입·승인, 의뢰와 견적, 연락처 공개 시점, 비용과 광고에 대해 자주 묻는 질문을 모았습니다.",
  alternates: { canonical: "/faq" },
};

// 검색 결과에 질문과 답이 함께 나오도록 알려 준다. 화면에 보이는 것과
// 다른 내용을 적으면 구조화 데이터 위반이라, 같은 배열을 그대로 쓴다.
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

        <FaqList />
      </div>
    </div>
  );
}
