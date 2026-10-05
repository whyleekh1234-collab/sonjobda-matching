import type { Metadata } from "next";

// 이 페이지는 클라이언트 컴포넌트라 metadata를 직접 내보낼 수 없다.
// 로그인한 회원에게만 뜻이 있는 화면이라 색인에서 뺀다.

export const metadata: Metadata = {
  title: "알림 · 공지",
  description: "내 알림과 공지사항을 확인합니다.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
