import type { Metadata } from "next";

// 이 페이지는 클라이언트 컴포넌트라 metadata를 직접 내보낼 수 없다.
// 같은 구간의 레이아웃에서 대신 붙인다.

export const metadata: Metadata = {
  title: "이메일 찾기",
  description:
    "가입에 사용한 이메일 주소를 확인합니다.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
