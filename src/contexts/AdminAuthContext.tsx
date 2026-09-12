"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

// admin 레이아웃은 (main) 레이아웃과 별도 트리라 AuthProvider를 공유하지 않는다.
// 같은 Supabase 세션을 각자 다시 조회해서 profiles.is_platform_admin만 확인한다.
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", userId)
      .single();
    return data?.is_platform_admin === true;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) setIsAdmin(await checkAdmin(session.user.id));
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setIsAdmin(await checkAdmin(session.user.id));
      } else {
        setIsAdmin(false);
      }
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error("관리자 이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    const admin = await checkAdmin(data.user.id);
    if (!admin) {
      await supabase.auth.signOut();
      throw new Error("관리자 권한이 없는 계정입니다.");
    }

    setIsAdmin(true);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth는 AdminAuthProvider 내부에서 사용해야 합니다.");
  }
  return context;
}
