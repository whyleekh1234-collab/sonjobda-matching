-- 19단계: 관리자 2단계 인증 (이메일 코드)
--
-- 관리자 계정은 전 회원의 개인정보와 모든 견적 금액을 본다. 비밀번호 하나가
-- 뚫리면 끝이라 운영자 계정에만 두 번째 관문을 둔다. 일반 회원은 그대로다.
--
-- 코드를 받는 주소는 로그인 이메일과 "달라야" 한다. 같으면 메일함 하나로
-- 비밀번호 재설정과 인증번호 수신이 다 되므로 2단계가 아니다. 그래서
-- 주소를 profiles에 따로 둔다 — 로그인 이메일(auth.users)을 쓰지 않는다.
--
-- 인증 통과를 증명하는 수단은 서명 쿠키가 아니라 DB 행이다. 쿠키에는 임의의
-- 토큰만 담고 실체는 여기 둔다. 서명 방식은 발급한 증명을 되돌릴 수 없지만,
-- 행으로 두면 지우는 것만으로 즉시 로그아웃시킬 수 있다. 관리자 세션은
-- 그렇게 끊을 수 있어야 한다.

-- ── 1. 코드를 받을 주소 ─────────────────────────────────────
alter table profiles add column if not exists mfa_email text;

comment on column profiles.mfa_email is
  '관리자 2단계 인증번호를 받을 주소. 로그인 이메일과 달라야 의미가 있다.';

-- ── 2. 발급한 코드 ──────────────────────────────────────────
-- 원문이 아니라 해시로 담는다. DB를 들여다봐도 코드를 알 수 없다.
create table if not exists admin_mfa_codes (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid        not null references profiles(id) on delete cascade,
  code_hash  text        not null,
  attempts   int         not null default 0,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_mfa_codes_lookup_idx
  on admin_mfa_codes (profile_id, created_at desc);

alter table admin_mfa_codes enable row level security;
-- 정책 없음 = 일반 경로로는 아무도 못 본다. 서버 라우트가 secret key로만
-- 다룬다. 의도된 것이다.

-- ── 3. 통과 증명 ────────────────────────────────────────────
create table if not exists admin_mfa_sessions (
  token      uuid primary key default gen_random_uuid(),
  profile_id uuid        not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_mfa_sessions_profile_idx
  on admin_mfa_sessions (profile_id);

alter table admin_mfa_sessions enable row level security;

-- proxy.ts가 /admin 요청마다 부른다. 토큰이 "내" 것이고 아직 살아 있는지만
-- 답한다. 행 자체는 내주지 않는다 — 알 필요가 없다.
create or replace function public.admin_mfa_session_valid(p_token uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from admin_mfa_sessions
    where token = p_token
      and profile_id = auth.uid()
      and expires_at > now()
  );
$$;

grant execute on function public.admin_mfa_session_valid to authenticated;

-- 만료된 기록은 남겨둘 이유가 없다. 코드를 새로 낼 때마다 같이 치운다.
create or replace function public.purge_expired_admin_mfa()
returns void language sql security definer set search_path = public as $$
  delete from admin_mfa_codes    where expires_at < now() - interval '1 day';
  delete from admin_mfa_sessions where expires_at < now();
$$;

-- ── 4. 운영자 주소 설정 ─────────────────────────────────────
-- 지금 운영자는 한 명이다. 늘어나면 각자 주소를 넣어야 하고, 주소가 비어
-- 있으면 로그인 자체가 막히므로 관리자 추가 시 함께 챙길 것.
update profiles
set mfa_email = 'lkhlkh83@naver.com'
where is_platform_admin and mfa_email is null;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, mfa_email from profiles where is_platform_admin;
