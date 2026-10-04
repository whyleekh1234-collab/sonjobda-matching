import type { Metadata } from "next";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ProcessSection from "@/components/sections/ProcessSection";
import CTASection from "@/components/sections/CTASection";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// 검색엔진에 사업자 정보를 기계가 읽는 형식으로 한 번 더 알려 준다.
// 화면에 보이는 내용과 같은 사실만 적는다 — 다른 것을 적으면 구조화
// 데이터 위반으로 오히려 불이익을 받는다.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "주식회사 손잡다메디칼",
  alternateName: "손잡다매칭",
  url: "https://www.sonjobdamd.com",
  logo: "https://www.sonjobdamd.com/logo-mark.png",
  email: "contact@sonjobdamd.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "별내3로 322, 4층 403호",
    addressLocality: "남양주시",
    addressRegion: "경기도",
    addressCountry: "KR",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "손잡다매칭",
  url: "https://www.sonjobdamd.com",
  inLanguage: "ko-KR",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HeroSection />
      <ServicesSection />
      <ProcessSection />
      <CTASection />
    </>
  );
}
