-- 손잡다매칭 6단계: 이메일 실제 발송
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.

-- ════════════════════════════════════════════════════════════
-- 1. 인증번호 보관
-- ════════════════════════════════════════════════════════════
--
-- 인증번호는 서버만 만들고 서버만 읽는다. 브라우저가 코드를 받아볼 수
-- 있으면 본인 확인이 성립하지 않는다(메일을 못 열어도 통과하게 된다).
-- 그래서 이 테이블에는 어떤 정책도 만들지 않는다. RLS를 켜두면 anon과
-- authenticated는 아무것도 못 읽고 못 쓴다. 서버 라우트가 service_role
-- 키로만 접근한다.
--
-- 코드는 원문이 아니라 해시로 담는다. DB를 들여다봐도 코드를 알 수 없다.

create table if not exists email_verifications (
  id         uuid primary key default gen_random_uuid(),
  email      text        not null,
  purpose    text        not null,               -- find_email 등
  code_hash  text        not null,
  attempts   int         not null default 0,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verifications_lookup_idx
  on email_verifications (email, purpose, created_at desc);

alter table email_verifications enable row level security;
-- 정책 없음 = 일반 회원은 접근 불가. 의도된 것이다.

-- 만료된 기록은 남겨둘 이유가 없다. 발급할 때마다 같이 치운다.
create or replace function public.purge_expired_email_codes()
returns void language sql security definer set search_path = public as $$
  delete from email_verifications where expires_at < now() - interval '1 day';
$$;

-- ════════════════════════════════════════════════════════════
-- 2. 실행 후 확인
-- ════════════════════════════════════════════════════════════
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename = 'email_verifications';
--   → rowsecurity 가 true 여야 한다. 정책은 하나도 없는 게 맞다.
