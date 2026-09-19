-- 손잡다매칭 10단계: 운영자가 회원·회사 정보를 직접 수정
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 지금까지 운영자는 상태(승인/정지)와 검증 표시만 바꿀 수 있었다.
-- 이름·연락처·회사명·사업자번호·주소는 회원이 변경 요청을 올리고
-- 운영자가 승인하는 경로뿐이었다. 전화로 정정 요청이 오거나 오타를
-- 발견했을 때 운영자가 바로 고칠 수 있어야 한다.

-- 회원 개인 정보. null로 넘긴 항목은 건드리지 않는다.
create or replace function public.admin_update_profile(
  p_target             uuid,
  p_name               text   default null,
  p_phone              text   default null,
  p_roles              text[] default null,
  p_partner_categories text[] default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_roles text[];
begin
  perform admin_guard();

  select coalesce(p_roles, roles) into v_roles from profiles where id = p_target;
  if v_roles is null then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  update profiles set
    name               = coalesce(nullif(trim(p_name), ''), name),
    phone              = coalesce(p_phone, phone),
    roles              = v_roles,
    -- 역할이 바뀌어 현재 활성 역할이 빠지면 첫 번째 역할로 옮긴다
    active_role        = case when active_role = any (v_roles) then active_role else v_roles[1] end,
    partner_categories = coalesce(p_partner_categories, partner_categories)
  where id = p_target;
end;
$$;

-- 회사 정보. 사업자번호가 바뀌면 국세청 검증을 다시 받아야 하므로
-- verified_at을 비운다(변경 요청 승인 때와 같은 규칙).
create or replace function public.admin_update_company(
  p_company_id      uuid,
  p_name            text default null,
  p_business_number text default null,
  p_address         text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old companies;
begin
  perform admin_guard();

  select * into v_old from companies where id = p_company_id;
  if v_old.id is null then
    raise exception '회사를 찾을 수 없습니다.';
  end if;

  if p_business_number is not null and p_business_number <> v_old.business_number
     and exists (select 1 from companies where business_number = p_business_number) then
    raise exception '이미 다른 회사가 쓰고 있는 사업자등록번호입니다.';
  end if;

  update companies set
    name            = coalesce(nullif(trim(p_name), ''), name),
    business_number = coalesce(nullif(trim(p_business_number), ''), business_number),
    address         = coalesce(p_address, address),
    verified_at     = case when p_business_number is not null
                            and p_business_number <> v_old.business_number
                           then null else verified_at end
  where id = p_company_id;
end;
$$;

revoke all on function public.admin_update_profile from public;
revoke all on function public.admin_update_company from public;
grant execute on function public.admin_update_profile to authenticated;
grant execute on function public.admin_update_company to authenticated;

-- 회원 목록에 company_id가 없어 화면에서 회사를 짚을 수 없었다. 추가한다.
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid, member_code text, name text, email text, phone text,
  company_id uuid, company text, business_number text, address text,
  roles text[], active_role text, partner_categories text[],
  status text, is_company_admin boolean, is_platform_admin boolean,
  verified boolean, allow_category_edit boolean, created_at timestamptz
)
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform admin_guard();
  return query
    select p.id, p.member_code, p.name, u.email::text, p.phone,
           c.id, c.name, c.business_number, c.address,
           p.roles, p.active_role, p.partner_categories,
           p.status::text, p.is_company_admin, p.is_platform_admin,
           p.verified, p.allow_category_edit, p.created_at
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;
grant execute on function public.admin_list_users to authenticated;
