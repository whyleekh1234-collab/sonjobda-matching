"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Step = "verify" | "sent";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export default function ResetPasswordPage() {
  const { requestPasswordReset, findEmailByPhone } = useAuth();

  const [step, setStep] = useState<Step>("verify");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  // 이름 + 전화번호로 본인 확인 후, 그 계정 이메일로 실제 재설정 링크를 보낸다.
  // 링크를 눌러 도착한 페이지(/reset-password/confirm)에서 새 비밀번호를 정한다.
  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      const email = await findEmailByPhone(name, phone);
      await requestPasswordReset(name, phone);
      setSentTo(email);
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "재설정 메일 발송에 실패했습니다.");
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
            본인 인증 후 이메일로 재설정 링크를 보내드립니다.
          </p>
        </div>

        {step === "sent" ? (
          /* 발송 완료 */
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-foreground/60">재설정 링크를 이메일로 보냈습니다.</p>
            {sentTo && (
              <p className="mt-2 text-sm font-semibold text-foreground">{maskEmail(sentTo)}</p>
            )}
            <p className="mt-3 text-xs text-foreground/40">
              메일이 보이지 않으면 스팸함도 확인해주세요. 링크는 발송 후 일정 시간이 지나면 만료됩니다.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : (
          /* 본인 인증 */
          <form
            onSubmit={handleSendResetLink}
            className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8"
          >
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
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
                  placeholder="홍길동"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
                  placeholder="010-1234-5678"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? "확인 중..." : "재설정 링크 받기"}
            </button>
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
