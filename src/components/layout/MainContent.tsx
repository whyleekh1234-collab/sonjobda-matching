"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // 좁은 화면에선 오른쪽 아래 상담 버튼이 본문 마지막 줄을 가린다.
  // 그만큼 아래 여백을 준다(PC는 버튼이 본문 밖이라 필요 없다).
  return (
    <main className={`${user ? "pt-[108px]" : "pt-16"} pb-20 sm:pb-0`}>{children}</main>
  );
}
