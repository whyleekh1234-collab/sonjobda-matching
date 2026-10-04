import type { Metadata } from "next";

// 이 페이지는 클라이언트 컴포넌트라 metadata를 직접 내보낼 수 없다.
// 같은 구간의 레이아웃에서 대신 붙인다.

export const metadata: Metadata = {
  title: "로그인",
  description:
    "손잡다매칭 회원 로그인.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
