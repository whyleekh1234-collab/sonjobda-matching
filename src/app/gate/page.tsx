import type { Metadata } from "next";

// 비공개 운영 중 접속 코드 화면. (main) 레이아웃 바깥에 두어 헤더·푸터가
// 붙지 않고, 서비스가 무엇인지도 드러내지 않는다.

export const metadata: Metadata = {
  title: "접속 확인",
  robots: { index: false, follow: false },
};

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <form
        method="POST"
        action="/api/gate"
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-foreground">접속 코드</h1>
        <p className="mt-1 text-sm text-foreground/50">
          비공개 운영 중입니다. 전달받은 코드를 입력해 주세요.
        </p>

        <input type="hidden" name="next" value={next ?? "/"} />
        <input
          type="password"
          name="code"
          autoFocus
          autoComplete="off"
          required
          className="mt-5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
        {error && (
          <p className="mt-2 text-xs text-red-600">코드가 맞지 않습니다.</p>
        )}

        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          들어가기
        </button>
      </form>
    </main>
  );
}
