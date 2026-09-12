// 환경변수가 비어 있으면 Supabase 호출이 "Invalid API key" 같은 엉뚱한 메시지로
// 실패한다. 원인을 바로 알 수 있게 여기서 먼저 걸러낸다.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} 환경변수가 없습니다. .env.local.example을 참고해 .env.local에 값을 넣고 개발 서버를 다시 시작하세요.`
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabasePublishableKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
