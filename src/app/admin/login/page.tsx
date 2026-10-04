"use client";

import Image from "next/image";
import PasswordInput from "@/components/PasswordInput";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { sendAdminCode, verifyAdminCode } from "@/lib/adminMfa";

// 관리자 로그인은 두 관문이다. 비밀번호를 통과해도 인증번호를 넣기 전에는
// /admin에 들어갈 수 없다 — proxy.ts가 통과 증명을 확인하므로, 이 화면을
// 건너뛰고 주소를 직접 쳐도 소용없다.
//
// 인증번호는 로그인 이메일이 아니라 따로 지정한 주소로 간다. 어디로 갔는지는
// 가려서 보여준다 — 공격자에게 다음 표적을 알려줄 이유가 없다.
type Step = "password" | "code";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [step, setStep] = useState<Step>("password");
  const [form, setForm] = useState({ email: "", password: "" });
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await login(form.email, form.password);
      const { to } = await sendAdminCode();
      setSentTo(to);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 메일이 늦거나 스팸함에 갔을 때. 서버가 1분 간격을 강제한다.
  const handleResend = async () => {
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const { to } = await sendAdminCode();
      setSentTo(to);
      setCode("");
      setNotice("인증번호를 다시 보냈습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "다시 보내지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await verifyAdminCode(code);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Image src="/logo-mark.png" alt="" width={48} height={48} className="mx-auto h-12 w-12" />
          <h1 className="mt-4 text-xl font-bold text-foreground">손잡다매칭</h1>
          <p className="mt-1 text-sm text-foreground/50">
            {step === "password" ? "관리자 로그인" : "2단계 인증"}
          </p>
        </div>

        <form
          onSubmit={step === "password" ? handlePassword : handleCode}
          className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {step === "password" && (
            <>
              <div className="space-y-4">
                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-foreground">
                    이메일
                  </label>
                  <input
                    type="email"
                    id="adminEmail"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }}
                    placeholder="admin@example.com"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="adminPassword" className="block text-sm font-medium text-foreground">
                    비밀번호
                  </label>
                  <PasswordInput
                    id="adminPassword"
                    value={form.password}
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
                    placeholder="비밀번호를 입력하세요"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "확인 중..." : "다음"}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <p className="text-sm leading-relaxed text-foreground/60">
                <b className="text-foreground">{sentTo}</b> 으로 인증번호를 보냈습니다.
                메일에 적힌 6자리를 입력해주세요.
              </p>
              {notice && <p className="mt-2 text-xs text-emerald-600">{notice}</p>}
              <div className="mt-4">
                <label htmlFor="otp" className="block text-sm font-medium text-foreground">
                  인증번호
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, "")); setError(""); }}
                  placeholder="000000"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.4em] outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || code.length !== 6}
                className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "확인 중..." : "확인"}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting}
                className="mt-3 w-full text-center text-xs text-foreground/50 underline hover:text-foreground disabled:opacity-50"
              >
                인증번호 다시 받기
              </button>
              <p className="mt-3 text-center text-xs text-foreground/40">
                메일이 보이지 않으면 스팸함도 확인해주세요.
              </p>
            </>
          )}

        </form>
      </div>
    </div>
  );
}
