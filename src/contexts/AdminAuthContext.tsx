"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  login: (id: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const ADMIN_CREDENTIALS = {
  id: "admin",
  password: "sonjobda2024!",
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sonjobda_admin");
    if (stored === "true") {
      setIsAdmin(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (id: string, password: string) => {
    if (id === ADMIN_CREDENTIALS.id && password === ADMIN_CREDENTIALS.password) {
      setIsAdmin(true);
      localStorage.setItem("sonjobda_admin", "true");
    } else {
      throw new Error("관리자 아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem("sonjobda_admin");
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
