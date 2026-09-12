"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Step = "verify" | "reset" | "done";

export default function ResetPasswordPage() {
  const { findEmailByPhone, resetPassword } = useAuth();

  const [step, setStep] = useState<Step>("verify");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  // 인증번호 발송: 일치하는 회원이 있을 때만 발송
  const handleSendCode = async () => {
    setError("");
    setIsBusy(true);
    try {
      const email = await findEmailByPhone(name, phone);
      const generated = String(Math.floor(100000 + Math.random() * 900000));
      setSentCode(generated);
      setTargetEmail(email);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 발송에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  };

  // 인증번호 확인 → 비밀번호 입력 단계로
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!sentCode) return;
    if (code.trim() !== sentCode) {
      setError("인증번호가 일치하지 않습니다.");
      return;
    }
    setStep("reset");
  };

  // 새 비밀번호 설정
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    const types = [/[a-zA-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(password)).length;
    if (types < 2) {
      setError("비밀번호는 영문, 숫자, 특수문자 중 2종 이상 조합해주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!targetEmail) return;

    setIsBusy(true);
    try {
      await resetPassword(targetEmail, password);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호 재설정에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">비밀번호 재설정</h1>
          <p className="mt-2 text-sm text-foreground/60">
            본인 인증 후 새 비밀번호를 설정할 수 있습니다.
          </p>
        </div>

        {step === "done" ? (
          /* 완료 */
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-foreground/60">비밀번호가 변경되었습니다.</p>
            <p className="mt-2 text-sm text-foreground/60">새 비밀번호로 로그인해주세요.</p>
            <Link
              href="/login"
              className="mt-6 inline-block w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : step === "reset" ? (
          /* 새 비밀번호 입력 */
          <form
            onSubmit={handleReset}
            className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8"
          >
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  maxLength={12}
                  placeholder="8~12자, 영문/숫자/특수문자 중 2종 이상"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-foreground">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  id="passwordConfirm"
                  required
                  value={passwordConfirm}
                  onChange={(e) => {
                    setPasswordConfirm(e.target.value);
                    setError("");
                  }}
                  maxLength={12}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        ) : (
          /* 본인 인증 */
          <form
            onSubmit={handleVerify}
            className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8"
          >
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            {sentCode && (
              <div className="mb-4 rounded-lg bg-primary/5 px-4 py-3 text-sm text-foreground/70">
                인증번호가 발송되었습니다. 아래에 입력해주세요.
                <span className="ml-1 text-foreground/40">(데모용 코드: {sentCode})</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  담당자 이름
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  disabled={!!sentCode}
                  placeholder="홍길동"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted disabled:text-foreground/50"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                  휴대폰 번호
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  disabled={!!sentCode}
                  placeholder="010-1234-5678"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted disabled:text-foreground/50"
                />
              </div>
              {sentCode && (
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-foreground">
                    인증번호
                  </label>
                  <input
                    type="text"
                    id="code"
                    inputMode="numeric"
                    required
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setError("");
                    }}
                    placeholder="6자리 숫자"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {!sentCode ? (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isBusy}
                className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "확인 중..." : "인증번호 발송"}
              </button>
            ) : (
              <button
                type="submit"
                className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                인증 확인
              </button>
            )}
          </form>
        )}

        {/* 하단 링크 */}
        <p className="mt-6 text-center text-sm text-foreground/60">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
          {" · "}
          <Link href="/find-email" className="font-semibold text-primary hover:underline">
            이메일 찾기
          </Link>
        </p>
      </div>
    </div>
  );
}
