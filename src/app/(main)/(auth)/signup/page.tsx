"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Handshake } from "lucide-react";
import { getInviteByToken } from "@/lib/data/notices";
import type { PartnerCategory } from "@/types/auth";

const partnerCategories: PartnerCategory[] = [
  "CRO",
  "CMO/CDMO",
  "SMO",
  "RA/인허가",
  "임상시험 보험",
  "소모품 공급",
  "마케팅 대행",
];

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    company: "",
    businessNumber: "",
    phone: "",
    address: "",
    roles: [] as ("client" | "partner")[],
    partnerCategories: [] as PartnerCategory[],
    agreeTerms: false,
    agreePrivacy: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ company: string; businessNumber: string; invitedBy: string } | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // 쿼리 파라미터로 전달된 카테고리 미리 선택 / 초대 링크 처리
  useEffect(() => {
    const category = searchParams.get("category");
    if (category && partnerCategories.includes(category as PartnerCategory)) {
      setForm((prev) => ({
        ...prev,
        roles: prev.roles.includes("client") ? [...prev.roles, "partner"] : ["client", "partner"],
        partnerCategories: [category as PartnerCategory],
      }));
    }
    // 초대 링크에는 토큰이 들어 있다. 토큰으로만 회사 정보를 확인할 수
    // 있어서, 남의 이메일을 안다고 그 회사에 들어갈 수 없다.
    const token = searchParams.get("invite");
    if (token) {
      setInviteToken(token);
      getInviteByToken(token).then((invite) => {
        if (!invite) {
          setInviteToken(null);
          setError("초대 링크가 유효하지 않거나 만료되었습니다.");
          return;
        }
        setInviteInfo({
          company: invite.companyName,
          businessNumber: invite.businessNumber,
          invitedBy: invite.invitedByName,
        });
        setForm((prev) => ({
          ...prev,
          email: invite.email,
          company: invite.companyName,
          businessNumber: invite.businessNumber,
        }));
      });
    }
  }, [searchParams]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox"
      ? target.checked
      : target.value;
    setForm({ ...form, [target.name]: value });
    setError("");
  };

  const toggleRole = (role: "client" | "partner") => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
    setError("");
  };

  const formatBusinessNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, businessNumber: formatBusinessNumber(e.target.value) });
    setError("");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone: formatPhone(e.target.value) });
    setError("");
  };

  // 기업주소 검색 (카카오/다음 우편번호 서비스)
  const openAddressSearch = () => {
    type DaumPostcode = {
      Postcode: new (opts: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string; address: string }) => void;
      }) => { open: () => void };
    };
    const w = window as unknown as { daum?: DaumPostcode };
    const run = () => {
      if (!w.daum) return;
      new w.daum.Postcode({
        oncomplete: (data) => {
          setForm((prev) => ({ ...prev, address: data.roadAddress || data.address || data.jibunAddress }));
          setError("");
        },
      }).open();
    };
    if (w.daum?.Postcode) { run(); return; }
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = run;
    document.body.appendChild(script);
  };

  const validate = (): string | null => {
    if (form.roles.length === 0) return "회원 유형을 하나 이상 선택해주세요.";
    if (form.roles.includes("partner") && form.partnerCategories.length === 0) return "회사유형을 하나 이상 선택해주세요.";
    // 이메일
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "올바른 이메일 형식을 입력해주세요.";
    // 비밀번호: 8자 이상 + 영문/숫자/특수문자 중 2종 이상
    if (form.password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
    const types = [/[a-zA-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(form.password)).length;
    if (types < 2) return "비밀번호는 영문, 숫자, 특수문자 중 2종 이상 조합해주세요.";
    if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않습니다.";
    // 담당자명: 2자 이상, 한글/영문만
    if (form.name.trim().length < 2) return "담당자명은 2자 이상 입력해주세요.";
    if (!/^[가-힣a-zA-Z\s]+$/.test(form.name.trim())) return "담당자명은 한글 또는 영문만 입력 가능합니다.";
    // 회사명: 2자 이상
    if (form.company.trim().length < 2) return "회사명은 2자 이상 입력해주세요.";
    // 사업자등록번호
    if (form.businessNumber.replace(/\D/g, "").length !== 10) return "사업자등록번호 10자리를 입력해주세요.";
    // 연락처
    const phoneDigits = form.phone.replace(/\D/g, "").length;
    if (phoneDigits < 10 || phoneDigits > 11) return "연락처를 정확히 입력해주세요.";
    if (!form.agreeTerms) return "이용약관에 동의해주세요.";
    if (!form.agreePrivacy) return "개인정보처리방침에 동의해주세요.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      // 국세청에 등록된 번호인지, 폐업/휴업은 아닌지 확인한다.
      // 초대로 들어온 경우는 이미 등록된 회사라 다시 묻지 않는다.
      if (!inviteInfo) {
        const res = await fetch("/api/business-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessNumber: form.businessNumber }),
        });
        const check = await res.json();
        if (check.valid === false) {
          setError(check.message ?? "사업자등록번호를 확인해주세요.");
          setIsSubmitting(false);
          return;
        }
      }

      const { needsEmailConfirmation } = await signup({
        email: form.email,
        password: form.password,
        name: form.name,
        company: form.company,
        businessNumber: form.businessNumber,
        phone: form.phone,
        address: form.address,
        roles: form.roles,
        ...(inviteToken && { inviteToken }),
        ...(form.partnerCategories.length > 0 && { partnerCategories: form.partnerCategories }),
      });
      alert(
        needsEmailConfirmation
          ? "회원가입이 접수되었습니다.\n\n1. 방금 보낸 메일의 링크를 눌러 이메일을 인증해주세요.\n2. 관리자 승인 후 로그인할 수 있습니다."
          : "회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다."
      );
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-24">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">회원가입</h1>
          <p className="mt-2 text-sm text-foreground/60">
            손잡다매칭에 가입하고 최적의 파트너를 만나보세요.
          </p>
        </div>

        {/* 회원가입 폼 */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 회원 유형 선택 (복수 선택 가능) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground">
              회원 유형 * <span className="text-xs font-normal text-foreground/40">(복수 선택 가능)</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleRole("client")}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  form.roles.includes("client")
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground/60 hover:border-foreground/30"
                }`}
              >
                <Building2 className="mx-auto h-6 w-6" strokeWidth={1.75} />
                <span className="mt-1.5 block">의뢰사</span>
                <span className="mt-1 block text-xs font-normal text-foreground/40">파트너를 찾고 있어요</span>
              </button>
              <button
                type="button"
                onClick={() => toggleRole("partner")}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  form.roles.includes("partner")
                    ? "border-secondary bg-secondary/5 text-secondary"
                    : "border-border text-foreground/60 hover:border-foreground/30"
                }`}
              >
                <Handshake className="mx-auto h-6 w-6" strokeWidth={1.75} />
                <span className="mt-1.5 block">파트너사</span>
                <span className="mt-1 block text-xs font-normal text-foreground/40">프로젝트를 수주하고 싶어요</span>
              </button>
            </div>
            {form.roles.includes("partner") && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground">
                  회사유형 * <span className="text-xs font-normal text-foreground/40">(복수 선택 가능)</span>
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {partnerCategories.map((cat) => {
                    const isBlocked = cat === "임상시험 보험";
                    return (
                    <button
                      key={cat}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => {
                        if (isBlocked) return;
                        setForm((prev) => ({
                          ...prev,
                          partnerCategories: prev.partnerCategories.includes(cat)
                            ? prev.partnerCategories.filter((c) => c !== cat)
                            : [...prev.partnerCategories, cat],
                        }));
                        setError("");
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        isBlocked
                          ? "border-border bg-foreground/5 text-foreground/30 cursor-not-allowed"
                          : form.partnerCategories.includes(cat)
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border text-foreground/60 hover:border-foreground/30"
                      }`}
                    >
                      {cat}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
            {form.roles.length === 2 && (
              <p className="mt-2 text-xs text-primary">
                의뢰사 + 파트너사 모두 선택되었습니다. 로그인 후 자유롭게 전환할 수 있어요.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                이메일 *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                readOnly={!!inviteInfo}
                placeholder="example@company.com"
                className={`mt-1 w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${inviteInfo ? "bg-muted text-foreground/60" : "bg-background"}`}
              />
              {inviteInfo && (
                <p className="mt-1 text-xs text-primary">{inviteInfo.invitedBy}님이 {inviteInfo.company}으로 초대했습니다. 회사명과 사업자등록번호가 자동 입력되었습니다.</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                비밀번호 *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                maxLength={12}
                placeholder="8~12자, 영문/숫자/특수문자 중 2종 이상"
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-foreground/40">영문, 숫자, 특수문자 중 2종 이상 조합</p>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-foreground">
                비밀번호 확인 *
              </label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                required
                value={form.passwordConfirm}
                onChange={handleChange}
                maxLength={12}
                placeholder="비밀번호를 다시 입력하세요"
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            {/* 이름 / 회사명 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  담당자명 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  maxLength={6}
                  placeholder="홍길동"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground">
                  회사명 *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  required
                  value={form.company}
                  onChange={handleChange}
                  readOnly={!!inviteInfo}
                  maxLength={20}
                  placeholder="(주) 회사명"
                  className={`mt-1 w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${inviteInfo ? "bg-muted text-foreground/60" : "bg-background"}`}
                />
              </div>
            </div>

            {/* 사업자등록번호 */}
            <div>
              <label htmlFor="businessNumber" className="block text-sm font-medium text-foreground">
                사업자등록번호 *
              </label>
              <input
                type="text"
                id="businessNumber"
                name="businessNumber"
                required
                value={form.businessNumber}
                onChange={handleBusinessNumberChange}
                readOnly={!!inviteInfo}
                placeholder="000-00-00000"
                maxLength={12}
                className={`mt-1 w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${inviteInfo ? "bg-muted text-foreground/60" : "bg-background"}`}
              />
            </div>

            {/* 연락처 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                연락처 *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={form.phone}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
                maxLength={13}
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* 기업주소 (선택) */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-foreground">
                기업주소 <span className="text-xs font-normal text-foreground/40">(선택)</span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="주소 검색을 눌러 주소를 입력하세요"
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={openAddressSearch}
                  className="flex-shrink-0 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
                >
                  주소 검색
                </button>
              </div>
              <p className="mt-1 text-xs text-foreground/40">주소 검색 후 건물명·층·호수 등 상세주소를 이어서 입력할 수 있습니다.</p>
            </div>
          </div>

          {/* 약관 동의 */}
          <div className="mt-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={form.agreeTerms}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground/70">
                <a href="/terms" target="_blank" className="text-primary underline cursor-pointer hover:text-primary-dark">이용약관</a>에
                동의합니다. (필수)
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreePrivacy"
                checked={form.agreePrivacy}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground/70">
                <a href="/privacy" target="_blank" className="text-primary underline cursor-pointer hover:text-primary-dark">개인정보처리방침</a>에
                동의합니다. (필수)
              </span>
            </label>
            <p className="ml-7 text-xs text-amber-600">
              ※ 매칭 성사 시 상대 업체에 회사명, 담당자명, 이메일, 연락처가 공개됩니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "가입 처리 중..." : "회원가입"}
          </button>
        </form>

        {/* 로그인 링크 */}
        <p className="mt-6 text-center text-sm text-foreground/60">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
