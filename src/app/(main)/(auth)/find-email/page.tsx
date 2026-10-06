"use client";

import { useState } from "react";
import Link from "next/link";
export default function FindEmailPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/find-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "phone", name, phone, ...payload }),
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
      setError(err instanceof Error ? err.message : "인증번호를 보내지 못했습니다.");
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
            <span className="text-2xl font-bold text-foreground">손잡다매칭</span>
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
                    {/* 번호는 본인을 찾는 열쇠일 뿐, 인증번호는 문자가 아니라
                        메일로 간다. 이 줄이 없으면 사용자가 오지 않을 문자를
                        기다린다. 문자 발송은 붙여 둔 적이 없다.

                        하이픈 얘기도 같이 한다. 숫자만 남겨 비교하므로 넣든
                        말든 같은데, 보기에는 010-1234-5678이어야 할 것처럼
                        읽힌다. */}
                    <p className="mt-1.5 break-keep text-xs leading-relaxed text-foreground/55">
                      하이픈(-)은 넣으셔도, 안 넣으셔도 됩니다.
                      <br />
                      이 번호로는 문자가 가지 않습니다. 본인 확인에만 쓰고,
                      인증번호는 가입하신 이메일로 보내드립니다.
                    </p>
                  </div>

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
                  {isBusy ? "확인 중..." : "인증번호 메일 받기"}
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
