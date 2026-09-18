import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "손잡다매칭 | 임상시험 & 바이오 매칭 플랫폼",
  description:
    "임상시험 및 바이오 업무의 의뢰사와 파트너사를 연결하는 전문 매칭 플랫폼입니다.",
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
    title: "손잡다매칭 | 임상시험 & 바이오 매칭 플랫폼",
    description:
      "임상시험 및 바이오 업무의 의뢰사와 파트너사를 연결하는 전문 매칭 플랫폼입니다.",
    url: "https://sonjobdamd.com",
    siteName: "손잡다매칭",
    locale: "ko_KR",
    type: "website",
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
