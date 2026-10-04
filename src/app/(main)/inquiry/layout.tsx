import type { Metadata } from "next";

// 이 페이지는 클라이언트 컴포넌트라 metadata를 직접 내보낼 수 없다.
// 같은 구간의 레이아웃에서 대신 붙인다.

export const metadata: Metadata = {
  title: "문의하기",
  description:
    "손잡다매칭 서비스 이용, 매칭 절차, 제휴에 관한 문의를 남겨 주세요. 평일 09:00–18:00에 확인합니다.",
  alternates: { canonical: "/inquiry" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
