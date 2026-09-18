-- 손잡다매칭 2단계: 인증 RPC
--
-- ▶ 이 파일은 통째로 복사해서 Supabase SQL Editor에 붙여넣고 Run 하면 된다.
--   (schema.sql은 1단계에서 이미 실행됐다. 그걸 다시 돌리면 "이미 있음"
--    에러가 나므로, 2단계 추가분만 여기 따로 떼어 뒀다.)
--
-- 전부 create or replace라 여러 번 실행해도 안전하다.

-- ════════════════════════════════════════════════════════════
-- 1. 회원가입 완료 RPC
-- ════════════════════════════════════════════════════════════
--
-- companies/profiles에는 일반 회원이 쓸 수 있는 insert 정책이 없다.
-- 대신 이 함수 하나로 "회사 생성 또는 합류 + 프로필 생성"을 원자적으로
-- 처리한다. security definer라 RLS를 우회하지만, auth.uid()가 없으면
-- 즉시 거부하므로 로그인한 본인 계정에만 쓰인다.
--
-- 사업자등록번호가 이미 있으면 그 회사에 합류한다(같은 회사 다른 담당자).
-- 없으면 새로 만들고, 그 회사를 처음 등록한 사람이 회사 담당 관리자가 된다.
-- 기존 localStorage 구현의 "isCompanyAdmin: !users.some(...)" 규칙과 동일하다.

create or replace function public.complete_signup(
  p_name               text,
  p_phone              text,
  p_business_number    text,
  p_company_name       text,
  p_address            text,
  p_roles              text[],
  p_active_role        text,
  p_partner_categories text[]
) returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id    uuid;
  v_is_new_company boolean := false;
  v_profile       profiles;
begin
  if auth.uid() is null then
    raise exception '로그인 상태에서만 호출할 수 있습니다.';
  end if;

  select id into v_company_id from companies where business_number = p_business_number;

  if v_company_id is null then
    insert into companies (business_number, name, address)
    values (p_business_number, p_company_name, nullif(trim(coalesce(p_address, '')), ''))
    returning id into v_company_id;
    v_is_new_company := true;
  end if;

  insert into profiles (
    id, company_id, name, phone, roles, active_role, partner_categories, is_company_admin
  ) values (
    auth.uid(), v_company_id, p_name, p_phone, p_roles, p_active_role,
    coalesce(p_partner_categories, '{}'), v_is_new_company
  )
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.complete_signup to authenticated;

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

grant execute on function public.rpc_find_email_by_phone to anon, authenticated;
grant execute on function public.rpc_find_email_by_email to anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- 3. 정리: 실패한 가입 시도로 남은 껍데기 계정 삭제
-- ════════════════════════════════════════════════════════════
--
-- RPC가 없던 동안 회원가입을 누르면 auth.users에는 행이 생기고 profiles
-- 생성만 실패했다. 그렇게 남은 계정은 다시 가입할 때 "이미 가입된 이메일"로
-- 걸리므로 지운다. 프로필이 붙어 있는 정상 계정은 건드리지 않는다.

delete from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

-- ════════════════════════════════════════════════════════════
-- 4. 실행 후 확인
-- ════════════════════════════════════════════════════════════
-- 아래를 돌리면 방금 만든 함수 3개가 보여야 한다.
--
--   select routine_name from information_schema.routines
--   where routine_schema = 'public'
--     and routine_name in ('complete_signup',
--                          'rpc_find_email_by_phone',
--                          'rpc_find_email_by_email');
