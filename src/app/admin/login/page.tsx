"use client";

import PasswordInput from "@/components/PasswordInput";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { nextMfaStep, startEnroll, verifyCode, type EnrollInfo } from "@/lib/adminMfa";

// 관리자 로그인은 두 관문이다. 비밀번호를 통과해도 OTP를 넣기 전에는
// /admin에 들어갈 수 없다 — proxy.ts가 세션의 보증 수준(aal2)을 보고
// 막으므로, 이 화면을 건너뛰고 주소를 직접 쳐도 소용없다.
//
// 등록된 인증 수단이 없는 계정은 여기서 바로 등록하게 한다. 등록 화면을
// 따로 두면 "아직 등록 안 한 관리자"라는 어중간한 상태가 생기고, 그 상태를
// 누가 언제 정리하는지가 또 문제가 된다.
type Step = "password" | "enroll" | "verify";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [step, setStep] = useState<Step>("password");
  const [form, setForm] = useState({ email: "", password: "" });
  const [code, setCode] = useState("");
  const [enroll, setEnroll] = useState<EnrollInfo | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await login(form.email, form.password);
      const next = await nextMfaStep();
      if (next === "done") {
        router.push("/admin");
        return;
      }
      if (next === "enroll") setEnroll(await startEnroll());
      setStep(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await verifyCode(code, enroll?.factorId);
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            손
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">손잡다매칭</h1>
          <p className="mt-1 text-sm text-foreground/50">
            {step === "password" ? "관리자 로그인" : step === "enroll" ? "2단계 인증 등록" : "2단계 인증"}
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

          {step === "enroll" && enroll && (
            <>
              <p className="text-sm leading-relaxed text-foreground/60">
                이 계정에는 아직 2단계 인증이 등록되지 않았습니다. 인증 앱(Google
                Authenticator, Authy 등)으로 아래 QR을 찍고, 앱에 뜨는 6자리를 입력해주세요.
              </p>
              <div className="mt-4 flex justify-center rounded-xl border border-border bg-white p-4">
                {/* Supabase가 SVG data URL로 내려준다 — next/image는 못 다룬다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enroll.qrCode} alt="2단계 인증 QR 코드" className="h-44 w-44" />
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-foreground/50 hover:text-foreground">
                  QR을 찍을 수 없나요?
                </summary>
                <p className="mt-2 text-xs text-foreground/50">앱에 아래 키를 직접 입력하세요.</p>
                <code className="mt-1 block break-all rounded-lg bg-muted px-3 py-2 text-xs text-foreground/70">
                  {enroll.secret}
                </code>
              </details>
            </>
          )}

          {(step === "enroll" || step === "verify") && (
            <>
              {step === "verify" && (
                <p className="text-sm leading-relaxed text-foreground/60">
                  인증 앱에 표시된 6자리 숫자를 입력해주세요.
                </p>
              )}
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
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="000000"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.4em] outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || code.length !== 6}
                className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "확인 중..." : step === "enroll" ? "등록하고 로그인" : "확인"}
              </button>
              <p className="mt-3 text-center text-xs text-foreground/40">
                인증 앱을 잃어버렸다면 다른 관리자에게 등록 해제를 요청하세요.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
