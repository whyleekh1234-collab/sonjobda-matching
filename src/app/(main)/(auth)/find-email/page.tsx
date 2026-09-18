"use client";

import { useState } from "react";
import Link from "next/link";
type Method = "phone" | "email";

export default function FindEmailPage() {
  const [method, setMethod] = useState<Method>("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // 탭 전환 시 진행 상태 초기화 (이름은 공통이라 유지)
  const switchMethod = (next: Method) => {
    if (next === method) return;
    setMethod(next);
    setPhone("");
    setEmail("");
    setCode("");
    setCodeSent(false);
    setDevCode(null);
    setError("");
  };

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/find-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, name, phone, email, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "요청에 실패했습니다.");
    return data as { sent?: boolean; verified?: boolean; devCode?: string; maskedEmail?: string; reason?: string };
  };

  // 인증번호 발송. 코드는 서버가 만들고 메일로만 나간다.
  const handleSendCode = async () => {
    setError("");
    setIsBusy(true);
    try {
      const data = await call({ action: "send" });
      setCodeSent(true);
      setCode("");
      // 메일 발송이 아직 연결되지 않은 개발 환경에서만 코드가 내려온다.
      setDevCode(data.devCode ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증번호 발송에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  };

  // 인증번호 확인도 서버가 한다. 맞아야만 마스킹된 이메일이 내려온다.
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      const data = await call({ action: "verify", code });
      if (data.verified && data.maskedEmail) setResult(data.maskedEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">손잡다</span>
            <span className="text-2xl font-bold text-foreground">매칭</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-foreground">이메일 찾기</h1>
          <p className="mt-2 text-sm text-foreground/60">
            가입 시 등록한 정보로 본인 인증 후 이메일을 찾아드립니다.
          </p>
        </div>

        {result ? (
          /* 결과 */
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-foreground/60">
              회원님의 가입 이메일은 다음과 같습니다.
            </p>
            {/* 서버가 이미 가려서 내려준다. 브라우저는 전체 주소를 받지 않는다. */}
            <p className="mt-3 text-lg font-semibold text-foreground">{result}</p>
            <Link
              href="/login"
              className="mt-6 inline-block w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
            {/* 인증 방법 탭 */}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => switchMethod("phone")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  method === "phone"
                    ? "bg-background text-primary shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                전화번호 인증
              </button>
              <button
                type="button"
                onClick={() => switchMethod("email")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  method === "email"
                    ? "bg-background text-primary shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                이메일 인증
              </button>
            </div>

            <form onSubmit={handleVerify} className="mt-6">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {codeSent && (
                <div className="mb-4 rounded-lg bg-primary/5 px-4 py-3 text-sm text-foreground/70">
                  인증번호를 메일로 보냈습니다. 아래에 입력해주세요.
                  {devCode && (
                    <span className="ml-1 text-amber-600">
                      (메일 발송 미연결 — 개발용 코드: {devCode})
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* 공통: 담당자 이름 */}
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
                    disabled={codeSent}
                    placeholder="홍길동"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted disabled:text-foreground/50"
                  />
                </div>

                {/* 방법별 입력 */}
                {method === "phone" ? (
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
                      disabled={codeSent}
                      placeholder="010-1234-5678"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted disabled:text-foreground/50"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                      이메일
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      disabled={codeSent}
                      placeholder="example@company.com"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted disabled:text-foreground/50"
                    />
                  </div>
                )}

                {/* 인증번호 입력 (발송 후 노출) */}
                {codeSent && (
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

              {!codeSent ? (
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
                  인증하고 이메일 찾기
                </button>
              )}
            </form>
          </div>
        )}

        {/* 하단 링크 */}
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
