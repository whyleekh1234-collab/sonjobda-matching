import type { Metadata } from "next";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import ProcessSection from "@/components/sections/ProcessSection";
import AdsSection from "@/components/sections/AdsSection";
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
  telephone: "+82-10-8064-6954",
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
      {/* 광고 자리. 넉 칸 중 빈 칸은 "이 자리를 팝니다"라는 알림이라
          비어 있어도 구역이 사라지지 않는다.

          프로세스 위에 둔다. 아래에서는 눈에 띄지 않았다. 다만 바로 위의
          서비스 소개와 배경색이 같아서, 위아래 실선으로 구역을 끊어
          주지 않으면 서비스 소개의 꼬리처럼 읽힌다. */}
      <AdsSection />
      <ProcessSection />
      <CTASection />
    </>
  );
}
