"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    // 역할에 맞는 대시보드로 리다이렉트
    if (user) {
      const currentPath = window.location.pathname;
      if (currentPath === "/dashboard") {
        router.push(`/dashboard/${user.activeRole === "client" ? "client" : "partner"}`);
      }
      // 의뢰사가 파트너 대시보드 접근 시도 시 리다이렉트
      if (user.activeRole === "client" && currentPath.startsWith("/dashboard/partner")) {
        router.push("/dashboard/client");
      }
      if (user.activeRole === "partner" && currentPath.startsWith("/dashboard/client")) {
        router.push("/dashboard/partner");
      }
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-foreground/50">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
