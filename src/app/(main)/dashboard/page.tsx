"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// /dashboard는 역할에 따라 갈라지는 분기점일 뿐이다.
// 세션을 아직 읽는 중(isLoading)에는 판단하지 않는다 — 로그인 직후 여기로
// 왔다가 user가 잠깐 null인 사이에 /login으로 튕기던 버그가 있었다.
export default function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(`/dashboard/${user.activeRole === "client" ? "client" : "partner"}`);
    } else {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-foreground/50">이동 중...</div>
    </div>
  );
}
