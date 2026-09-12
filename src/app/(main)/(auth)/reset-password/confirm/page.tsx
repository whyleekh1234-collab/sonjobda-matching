"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "waiting" | "ready" | "invalid" | "done";

// 이메일의 재설정 링크를 누르면 여기로 온다. Supabase JS SDK가 URL의 복구
// 토큰을 자동으로 읽어 세션을 만들고 PASSWORD_RECOVERY 이벤트를 쏜다.
// 그 이벤트가 오기 전까지는 유효한 링크로 온 건지 알 수 없어 "waiting"으로
// 대기하다가, 일정 시간 안에 안 오면 잘못된/만료된 링크로 간주한다.
export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<Status>("waiting");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "waiting" ? "invalid" : current));
    }, 4000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsBusy(false);

    if (updateError) {
      setError("비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.");
      return;
    }

    await supabase.auth.signOut();
    setStatus("done");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">새 비밀번호 설정</h1>
        </div>

        {status === "waiting" && (
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-foreground/60">링크를 확인하는 중입니다...</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-foreground/60">
              링크가 유효하지 않거나 만료되었습니다. 다시 요청해주세요.
            </p>
            <Link
              href="/reset-password"
              className="mt-6 inline-block w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              다시 요청하기
            </Link>
          </div>
        )}

        {status === "done" && (
          <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-foreground/60">비밀번호가 변경되었습니다.</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-6 inline-block w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              로그인하러 가기
            </button>
          </div>
        )}

        {status === "ready" && (
          <form
            onSubmit={handleSubmit}
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
        )}
      </div>
    </div>
  );
}
