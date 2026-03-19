"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [form, setForm] = useState({ id: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await login(form.id, form.password);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-lg font-bold">
            손
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">손잡다매칭</h1>
          <p className="mt-1 text-sm text-foreground/50">관리자 로그인</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="adminId" className="block text-sm font-medium text-foreground">
                관리자 ID
              </label>
              <input
                type="text"
                id="adminId"
                value={form.id}
                onChange={(e) => { setForm({ ...form, id: e.target.value }); setError(""); }}
                placeholder="아이디를 입력하세요"
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-foreground">
                비밀번호
              </label>
              <input
                type="password"
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
            {isSubmitting ? "로그인 중..." : "관리자 로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
