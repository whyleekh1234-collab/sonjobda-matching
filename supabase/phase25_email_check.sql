-- 25단계: 이메일 중복 확인
--
-- 지금은 가입 버튼을 누른 뒤에야 중복을 안다. 그마저도 Supabase가 이메일
-- 존재 여부를 숨기려고 에러 없이 가짜 사용자를 돌려주는 설정이 있어,
-- "가입됐다"고 안내하고는 실제로는 안 되는 경우가 생긴다.
--
-- 이 함수는 anon·authenticated에게 주지 않는다. 그대로 열면 누구나 특정
-- 이메일의 가입 여부를 캐낼 수 있는 통로가 된다. 서버 라우트가 secret
-- key로만 부르고, 거기서 호출 빈도를 제한한다.

create or replace function public.email_taken(p_email text)
returns boolean
language sql security definer set search_path = public, auth, pg_temp stable as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(trim(p_email))
  );
$$;

revoke execute on function public.email_taken from anon, authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select public.email_taken('contact@sonjobdamd.com');  -- true
