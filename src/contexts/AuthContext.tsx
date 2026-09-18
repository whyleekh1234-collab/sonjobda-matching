"use client";

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { User, Role, PartnerCategory, UserStatus } from "@/types/auth";

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
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  findEmailByPhone: (name: string, phone: string) => Promise<string>;
  findEmailByEmail: (name: string, email: string) => Promise<string>;
  // 이름 + 전화번호로 본인을 확인한 뒤, 그 계정 이메일로 Supabase가 실제
  // 재설정 링크를 발송한다. 링크를 눌러 도착하는 곳은 /reset-password/confirm.
  requestPasswordReset: (name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// profiles + companies + auth 이메일을 화면이 지금까지 써 온 평평한 User
// 모양으로 합친다. 18개 파일이 이 모양을 그대로 쓰고 있어서, 데이터 출처만
// localStorage에서 Supabase로 바꾸고 내보내는 모양은 유지한다.
type ProfileRow = {
  id: string;
  member_code: string;
  name: string;
  phone: string | null;
  roles: Role[];
  active_role: Role;
  partner_categories: PartnerCategory[] | null;
  status: UserStatus;
  is_company_admin: boolean;
  created_at: string;
  companies: {
    name: string;
    business_number: string;
    address: string | null;
  } | null;
};

function toUser(profile: ProfileRow, email: string): User {
  return {
    id: profile.id,
    memberCode: profile.member_code,
    email,
    name: profile.name,
    company: profile.companies?.name ?? "",
    businessNumber: profile.companies?.business_number ?? "",
    roles: profile.roles,
    activeRole: profile.active_role,
    ...(profile.partner_categories?.length && { partnerCategories: profile.partner_categories }),
    ...(profile.phone && { phone: profile.phone }),
    ...(profile.companies?.address && { address: profile.companies.address }),
    status: profile.status,
    isCompanyAdmin: profile.is_company_admin,
    createdAt: profile.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // signup()이 자체적으로 signOut을 호출할 때, 그사이 onAuthStateChange가
  // 끼어들어 잠깐 로그인된 것처럼 user를 세팅했다가 다시 지우는 깜빡임을 막는다.
  const suppressAuthEvent = useRef(false);

  const loadProfile = async (session: Session): Promise<User | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, member_code, name, phone, roles, active_role, partner_categories, status, is_company_admin, created_at, companies(name, business_number, address)"
      )
      .eq("id", session.user.id)
      .single();

    if (error || !data) return null;
    return toUser(data as unknown as ProfileRow, session.user.email ?? "");
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) setUser(await loadProfile(session));
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (suppressAuthEvent.current) return;
      if (session) {
        setUser(await loadProfile(session));
      } else {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Confirm email이 켜진 상태에서 인증 전에 로그인하면 여기로 온다.
      // 비밀번호 오류로 뭉뚱그리면 사용자가 원인을 못 찾는다.
      if (/email not confirmed/i.test(error.message)) {
        throw new Error("이메일 인증이 필요합니다. 가입 시 받은 메일의 링크를 눌러주세요.");
      }
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    const profile = await loadProfile(data.session);
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error("계정 정보가 올바르지 않습니다. 관리자에게 문의해주세요.");
    }

    if (profile.status === "pending") {
      await supabase.auth.signOut();
      throw new Error("관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.");
    }

    if (profile.status === "suspended") {
      await supabase.auth.signOut();
      throw new Error("정지된 계정입니다. 관리자에게 문의해주세요.");
    }

    setUser(profile);
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
    // 폼 값을 계정 메타데이터로 넘긴다. 회사와 프로필 생성은 auth.users의
    // on_auth_user_created 트리거가 같은 트랜잭션 안에서 처리한다.
    // 이렇게 해야 Confirm email 설정(가입 직후 세션 유무)과 무관하게 동작하고,
    // 계정만 생기고 프로필은 없는 껍데기가 남지 않는다.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: data.phone,
          business_number: data.businessNumber,
          company_name: data.company,
          address: data.address ?? "",
          roles: data.roles,
          active_role: data.roles[0],
          partner_categories: data.partnerCategories ?? [],
        },
      },
    });

    if (signUpError) {
      if (/already\s*(been\s*)?registered/i.test(signUpError.message)) {
        throw new Error("이미 가입된 이메일입니다.");
      }
      throw new Error("회원가입에 실패했습니다. 입력값을 확인하고 다시 시도해주세요.");
    }

    // Confirm email이 꺼져 있으면 가입 직후 로그인 상태가 된다. 승인 전까지는
    // 로그인 상태가 아니어야 하므로 바로 끊는다. suppress 플래그로 그사이
    // onAuthStateChange가 화면에 잠깐 로그인된 모습을 비추는 걸 막는다.
    if (signUpData.session) {
      suppressAuthEvent.current = true;
      await supabase.auth.signOut();
      suppressAuthEvent.current = false;
    }

    return { needsEmailConfirmation: !signUpData.session };
  };

  const findEmailByPhone = async (name: string, phone: string) => {
    const { data, error } = await supabase.rpc("rpc_find_email_by_phone", {
      p_name: name,
      p_phone: phone,
    });

    if (error || !data) {
      throw new Error("일치하는 회원 정보가 없습니다. 담당자 이름과 휴대폰 번호를 확인해주세요.");
    }
    return data as string;
  };

  const findEmailByEmail = async (name: string, email: string) => {
    const { data, error } = await supabase.rpc("rpc_find_email_by_email", {
      p_name: name,
      p_email: email,
    });

    if (error || !data) {
      throw new Error("일치하는 회원 정보가 없습니다. 담당자 이름과 이메일을 확인해주세요.");
    }
    return data as string;
  };

  const requestPasswordReset = async (name: string, phone: string) => {
    const email = await findEmailByPhone(name, phone);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    });
    if (error) {
      throw new Error("재설정 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const switchRole = async () => {
    if (!user || !user.roles || user.roles.length < 2) return;
    const newRole: Role = user.activeRole === "client" ? "partner" : "client";

    const { error } = await supabase
      .from("profiles")
      .update({ active_role: newRole })
      .eq("id", user.id);

    if (error) return;
    setUser({ ...user, activeRole: newRole });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        findEmailByPhone,
        findEmailByEmail,
        requestPasswordReset,
        logout,
        switchRole,
      }}
    >
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
