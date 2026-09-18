-- 손잡다매칭 2단계: 인증
--
-- ▶ 이 파일은 통째로 실행하면 된다. 전부 create or replace / drop if exists라
--   여러 번 돌려도 안전하다.
--   (schema.sql은 1단계에서 이미 실행됐다. 그건 다시 돌리지 않는다.)

-- ════════════════════════════════════════════════════════════
-- 1. 회원가입 시 회사 + 프로필 생성 (트리거)
-- ════════════════════════════════════════════════════════════
--
-- 왜 클라이언트에서 RPC를 부르지 않고 트리거인가:
--   Supabase의 "Confirm email"이 켜져 있으면 회원가입 직후 세션이 없다.
--   세션이 없으면 로그인이 필요한 RPC를 부를 수 없어서, 그 설정 하나에
--   회원가입 전체가 좌우된다. 트리거는 auth.users에 행이 꽂히는 바로 그
--   트랜잭션 안에서 돌기 때문에 설정과 무관하게 항상 동작한다.
--   덤으로 계정과 프로필이 같은 트랜잭션이라, 한쪽만 생기고 마는 껍데기
--   계정이 원천적으로 안 생긴다.
--
-- 사업자등록번호가 이미 있으면 그 회사에 합류한다(같은 회사 다른 담당자).
-- 없으면 새로 만들고, 그 회사를 처음 등록한 사람이 회사 담당 관리자가 된다.
-- 기존 localStorage 구현의 "isCompanyAdmin: !users.some(...)" 규칙과 동일하다.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta            jsonb   := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name            text    := nullif(trim(coalesce(v_meta->>'name', '')), '');
  v_business_number text    := nullif(trim(coalesce(v_meta->>'business_number', '')), '');
  v_company_name    text    := nullif(trim(coalesce(v_meta->>'company_name', '')), '');
  v_roles           text[]  := '{}';
  v_categories      text[]  := '{}';
  v_active_role     text;
  v_company_id      uuid;
  v_is_new_company  boolean := false;
begin
  -- 가입 폼을 거치지 않은 계정(대시보드에서 직접 생성 등)은 프로필을 만들지
  -- 않고 넘긴다. 필수 정보가 없어서 만들 수도 없다.
  if v_name is null or v_business_number is null then
    return new;
  end if;

  if jsonb_typeof(v_meta->'roles') = 'array' then
    v_roles := array(select jsonb_array_elements_text(v_meta->'roles'));
  end if;
  if cardinality(v_roles) = 0 then
    v_roles := array['client'];
  end if;

  if jsonb_typeof(v_meta->'partner_categories') = 'array' then
    v_categories := array(select jsonb_array_elements_text(v_meta->'partner_categories'));
  end if;

  v_active_role := nullif(trim(coalesce(v_meta->>'active_role', '')), '');
  if v_active_role is null or not (v_active_role = any (v_roles)) then
    v_active_role := v_roles[1];
  end if;

  select id into v_company_id from companies where business_number = v_business_number;

  if v_company_id is null then
    insert into companies (business_number, name, address)
    values (
      v_business_number,
      coalesce(v_company_name, v_business_number),
      nullif(trim(coalesce(v_meta->>'address', '')), '')
    )
    returning id into v_company_id;
    v_is_new_company := true;
  end if;

  -- status와 is_platform_admin은 메타데이터에서 절대 읽지 않는다.
  -- 메타데이터는 가입자가 직접 보내는 값이라, 읽는 순간 권한 상승 통로가 된다.
  -- 승인 상태는 항상 기본값 pending에서 시작하고, 운영자 지정은 SQL로만 한다.
  insert into profiles (
    id, company_id, name, phone, roles, active_role, partner_categories, is_company_admin
  ) values (
    new.id,
    v_company_id,
    v_name,
    nullif(trim(coalesce(v_meta->>'phone', '')), ''),
    v_roles,
    v_active_role,
    v_categories,
    v_is_new_company
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- 2. 이메일 찾기 RPC
-- ════════════════════════════════════════════════════════════
--
-- "이메일을 잊어버린" 사람이 자기 이메일을 찾는 기능이라, 정의상 로그인
-- 전 상태(anon)에서 동작해야 한다. security definer로 auth.users.email을
-- 조회하지만, 이름 + 전화번호(또는 이름 + 이메일)가 모두 일치해야만 반환한다.
--
-- 주의: 이 함수는 데모 단계의 보호 수준이다. 실제 운영에서는 시도 횟수
-- 제한(rate limit)을 앞단에 둬야 한다. 이메일 실제 발송은 6단계에서 한다.

create or replace function public.rpc_find_email_by_phone(p_name text, p_phone text)
returns text
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select u.email::text
  from profiles p
  join auth.users u on u.id = p.id
  where p.name = trim(p_name)
    and regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  limit 1;
$$;

create or replace function public.rpc_find_email_by_email(p_name text, p_email text)
returns text
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select u.email::text
  from profiles p
  join auth.users u on u.id = p.id
  where p.name = trim(p_name)
    and lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.rpc_find_email_by_phone  to anon, authenticated;
grant execute on function public.rpc_find_email_by_email  to anon, authenticated;

-- 이전 설계의 잔재. 지금은 위 트리거가 그 일을 한다.
drop function if exists public.complete_signup(
  text, text, text, text, text, text[], text, text[]
);

-- ════════════════════════════════════════════════════════════
-- 3. 정리: 프로필 없이 남은 껍데기 계정 삭제
-- ════════════════════════════════════════════════════════════
--
-- 트리거가 없던 동안 회원가입을 누르면 auth.users에만 행이 생기고 프로필은
-- 안 만들어졌다. 그렇게 남은 계정은 같은 이메일로 다시 가입할 때 "이미
-- 가입된 이메일"로 걸리므로 지운다. 앞으로는 트리거가 같은 트랜잭션에서
-- 처리하므로 이런 계정 자체가 생기지 않는다.

delete from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

-- ════════════════════════════════════════════════════════════
-- 4. 실행 후 확인
-- ════════════════════════════════════════════════════════════
--   select tgname from pg_trigger where tgname = 'on_auth_user_created';
--
--   select routine_name from information_schema.routines
--   where routine_schema = 'public'
--     and routine_name in ('handle_new_user',
--                          'rpc_find_email_by_phone',
--                          'rpc_find_email_by_email');
--
-- 첫 계정을 만든 뒤, 본인을 승인 + 운영자로 지정한다(<이메일> 교체):
--
--   update profiles set status = 'approved', is_platform_admin = true
--   where id = (select id from auth.users where email = '<이메일>');
