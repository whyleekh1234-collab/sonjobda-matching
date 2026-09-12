"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Role, PartnerCategory } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    name: string;
    company: string;
    businessNumber: string;
    phone: string;
    address?: string;
    roles: Role[];
    partnerCategories?: PartnerCategory[];
  }) => Promise<void>;
  findEmailByPhone: (name: string, phone: string) => Promise<string>;
  findEmailByEmail: (name: string, email: string) => Promise<string>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  logout: () => void;
  switchRole: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sonjobda_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.roles && parsed.activeRole) {
        setUser(parsed);
      } else {
        localStorage.removeItem("sonjobda_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const found = users.find(
      (u: User & { password: string }) => u.email === email && u.password === password
    );

    if (!found) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    if (!found.roles || !found.activeRole) {
      throw new Error("계정 정보가 올바르지 않습니다. 다시 회원가입해주세요.");
    }

    if (found.status === "pending") {
      throw new Error("관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.");
    }

    if (found.status === "suspended") {
      throw new Error("정지된 계정입니다. 관리자에게 문의해주세요.");
    }

    const userData = { ...found };
    delete (userData as { password?: string }).password;
    setUser(userData);
    localStorage.setItem("sonjobda_user", JSON.stringify(userData));
  };

  const signup = async (data: {
    email: string;
    password: string;
    name: string;
    company: string;
    businessNumber: string;
    phone: string;
    address?: string;
    roles: Role[];
    partnerCategories?: PartnerCategory[];
  }) => {
    const users = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");

    if (users.some((u: { email: string }) => u.email === data.email)) {
      throw new Error("이미 가입된 이메일입니다.");
    }

    // 회원 고유번호 생성
    const lastSeq = users.reduce((max: number, u: { memberCode?: string }) => {
      if (!u.memberCode) return max;
      const num = parseInt(u.memberCode.split("-").pop() || "0", 10);
      return num > max ? num : max;
    }, 0);
    const seq = String(lastSeq + 1).padStart(8, "0");
    const roleCode = data.roles.includes("client") && data.roles.includes("partner") ? "CP" : data.roles.includes("client") ? "C" : "P";
    const memberCode = `SJ-${roleCode}-${seq}`;

    const newUser = {
      id: crypto.randomUUID(),
      memberCode,
      email: data.email,
      password: data.password,
      name: data.name,
      company: data.company,
      businessNumber: data.businessNumber,
      phone: data.phone,
      ...(data.address?.trim() && { address: data.address.trim() }),
      roles: data.roles,
      activeRole: data.roles[0],
      ...(data.partnerCategories?.length && { partnerCategories: data.partnerCategories }),
      status: "pending" as const,
      isCompanyAdmin: !users.some((u: { businessNumber: string }) => u.businessNumber === data.businessNumber),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem("sonjobda_users", JSON.stringify(users));

    // 가입 후 바로 로그인하지 않음 - 관리자 승인 대기
  };

  const findEmailByPhone = async (name: string, phone: string) => {
    const users = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const normalizedPhone = phone.replace(/[^0-9]/g, "");
    const found = users.find(
      (u: { name: string; phone: string }) =>
        u.name === name.trim() &&
        u.phone.replace(/[^0-9]/g, "") === normalizedPhone
    );

    if (!found) {
      throw new Error(
        "일치하는 회원 정보가 없습니다. 담당자 이름과 휴대폰 번호를 확인해주세요."
      );
    }

    return found.email as string;
  };

  const findEmailByEmail = async (name: string, email: string) => {
    const users = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const found = users.find(
      (u: { name: string; email: string }) =>
        u.name === name.trim() &&
        u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!found) {
      throw new Error(
        "일치하는 회원 정보가 없습니다. 담당자 이름과 이메일을 확인해주세요."
      );
    }

    return found.email as string;
  };

  const resetPassword = async (email: string, newPassword: string) => {
    const users = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const idx = users.findIndex(
      (u: { email: string }) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (idx === -1) {
      throw new Error("일치하는 회원 정보가 없습니다.");
    }

    users[idx].password = newPassword;
    localStorage.setItem("sonjobda_users", JSON.stringify(users));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sonjobda_user");
  };

  const switchRole = () => {
    if (!user || !user.roles || user.roles.length < 2) return;
    const newRole: Role = user.activeRole === "client" ? "partner" : "client";
    const updated = { ...user, activeRole: newRole };
    setUser(updated);
    localStorage.setItem("sonjobda_user", JSON.stringify(updated));

    const users = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const idx = users.findIndex((u: { id: string }) => u.id === user.id);
    if (idx !== -1) {
      users[idx].activeRole = newRole;
      localStorage.setItem("sonjobda_users", JSON.stringify(users));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, findEmailByPhone, findEmailByEmail, resetPassword, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서 사용해야 합니다.");
  }
  return context;
}
