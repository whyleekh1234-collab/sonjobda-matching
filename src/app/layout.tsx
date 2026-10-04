import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

// 홈 화면에 추가했을 때 주소창 없이 앱처럼 뜨게 한다(PWA).
// 아이콘·이름은 public/manifest.webmanifest에 있다.
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  // 확대는 막지 않는다 — 시력이 약한 사용자가 키워 볼 수 있어야 한다.
  maximumScale: 5,
};

export const metadata: Metadata = {
  // 상대 경로(OG 이미지 등)가 어느 주소를 기준으로 풀리는지 알려 준다.
  // 없으면 Next가 배포 호스트를 추측하는데, 미리보기 배포 주소가 섞여
  // 들어가 카카오톡·슬랙 링크 미리보기가 엉뚱한 주소를 가리킨다.
  metadataBase: new URL("https://www.sonjobdamd.com"),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "손잡다매칭" },
  // 하위 페이지는 제 이름만 적으면 뒤에 서비스명이 붙는다. 검색 결과에
  // 제목이 모두 똑같이 나오는 것을 막으면서, 어느 사이트인지도 남긴다.
  title: {
    default: "손잡다매칭 | 제약·바이오 전문 매칭 플랫폼",
    template: "%s | 손잡다매칭",
  },
  description:
    "임상시험 수탁(CRO)·위탁생산(CMO)·인허가 컨설팅부터 원료 공급까지, 제약·바이오 업무의 의뢰사와 파트너사를 연결하는 전문 매칭 플랫폼입니다.",
  // 같은 문서가 여러 주소로 보이지 않도록 기준 주소를 밝힌다.
  alternates: { canonical: "/" },
  keywords: [
    "임상시험",
    "바이오",
    "CRO",
    "CMO",
    "매칭",
    "의뢰사",
    "파트너사",
    "손잡다메디칼",
  ],
  openGraph: {
    // 오픈그래프는 제목을 따로 들고 있다. 위의 title을 고쳐도 여기가
    // 옛 문구면 카카오톡·슬랙 미리보기에만 옛 제목이 남는다.
    title: "손잡다매칭 | 제약·바이오 전문 매칭 플랫폼",
    description:
      "검증된 기업만 참여하는 비공개 매칭. 임상시험 수탁부터 원료 공급까지, 제약·바이오 업무의 의뢰사와 파트너사를 연결합니다.",
    url: "https://www.sonjobdamd.com",
    siteName: "손잡다매칭",
    locale: "ko_KR",
    type: "website",
    // 카카오톡·슬랙에 주소를 붙였을 때 뜨는 그림. 없으면 글자만 나와서
    // 링크가 뭔지 알아보기 어렵다. public/og.png는 로고·분야를 담은
    // 1200x630 이미지다(권장 비율 1.91:1).
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "손잡다매칭 — 제약·바이오 의뢰사와 파트너사를 연결합니다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "손잡다매칭 | 제약·바이오 전문 매칭 플랫폼",
    description:
      "검증된 기업만 참여하는 비공개 매칭. 견적을 비교하고 전문 파트너를 찾으세요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
