import type { Metadata } from "next";

// 이 페이지는 클라이언트 컴포넌트라 metadata를 직접 내보낼 수 없다.
// 같은 구간의 레이아웃에서 대신 붙인다.

export const metadata: Metadata = {
  title: "회원가입",
  description:
    "제약·바이오 의뢰사와 파트너사를 연결하는 손잡다매칭에 가입하세요. 사업자등록증 확인과 국세청 조회를 거친 기업만 활동합니다.",
  alternates: { canonical: "/signup" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
