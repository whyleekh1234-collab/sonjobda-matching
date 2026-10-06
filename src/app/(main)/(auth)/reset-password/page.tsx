"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

// 비밀번호 재설정 요청.
//
// 전에는 담당자 이름과 휴대폰 번호로 본인을 확인한 뒤 그 계정의 이메일로
// 링크를 보냈다. 보내는 곳은 메일인데 묻는 것은 전화번호라 앞뒤가 맞지
// 않았고, 이름·전화번호로 계정을 찾는 일은 이미 이메일 찾기(/find-email)가
// 한다. 같은 일을 두 화면이 서로 다른 말로 하고 있었다.
//
// 지금은 가입할 때 쓴 이메일만 받는다. 링크가 그 주소로 가므로, 그 주소에
// 닿을 수 있는 사람만 비밀번호를 바꿀 수 있다. 그게 이 절차의 전부다.
//
// 보낸 뒤에는 그 주소로 계정이 있든 없든 같은 말을 한다. 다르게 말하면
// 주소를 하나씩 넣어 보며 "이 회사 사람이 가입했는지"를 알아낼 수 있다.

export default function ResetPasswordPage() {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "재설정 메일 발송에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">비밀번호 재설정</h1>
          <p className="mt-2 text-sm text-foreground/60">
            가입하실 때 쓰신 이메일로 재설정 링크를 보내드립니다.
          </p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-foreground/60">재설정 링크를 보냈습니다.</p>
            <p className="mt-2 break-all text-sm font-semibold text-foreground">{email.trim()}</p>
            <p className="mt-3 break-keep text-xs leading-relaxed text-foreground/60">
              메일이 보이지 않으면 스팸함도 확인해주세요. 링크는 일정 시간이 지나면 만료됩니다.
              {/* 계정이 없어도 같은 말을 한다. 그래서 "안 왔다"는 경우를 위해
                  가입 여부를 의심해 볼 길을 같이 적어 둔다. */}
              {" "}메일이 오지 않으면 그 주소로 가입된 계정이 없을 수 있습니다.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8"
          >
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              이메일
            </label>
            <input
              type="email"
              id="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="name@company.com"
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={isBusy}
              className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? "보내는 중..." : "재설정 링크 받기"}
            </button>

            <p className="mt-4 text-center text-xs text-foreground/60">
              어떤 주소로 가입했는지 기억나지 않으시면{" "}
              <Link href="/find-email" className="font-semibold text-primary hover:underline">
                이메일 찾기
              </Link>
              를 이용해주세요.
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground/60">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
          {" · "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
