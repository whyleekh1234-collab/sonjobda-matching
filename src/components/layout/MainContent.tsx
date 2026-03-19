"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <main className={user ? "pt-[108px]" : "pt-16"}>{children}</main>;
}
