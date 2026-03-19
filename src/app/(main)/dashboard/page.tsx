"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push(`/dashboard/${user.activeRole === "client" ? "client" : "partner"}`);
    } else {
      router.push("/login");
    }
  }, [user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-foreground/50">이동 중...</div>
    </div>
  );
}
