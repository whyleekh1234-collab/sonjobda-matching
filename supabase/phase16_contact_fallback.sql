-- 손잡다매칭 16단계: 담당자가 없을 때 연락처 대체
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 매칭 연락처는 "그 의뢰를 등록한 담당자 / 그 견적을 낸 담당자"를 보여준다.
-- 그런데 그 사람이 탈퇴하면(9단계에서 created_by·submitted_by가 null이 된다)
-- 상대방 화면에 연락처가 아예 안 뜬다. 회사에는 의뢰·견적이 남아 있고 매칭도
-- 성사됐는데 연락할 방법이 사라지는 셈이다.
--
-- 담당자가 없으면 그 회사의 담당 관리자, 그마저 없으면 남아 있는 아무 활성
-- 회원으로 대체한다. 대체된 경우 is_fallback을 true로 돌려주어 화면에서
-- "원래 담당자가 아니다"라고 알려줄 수 있게 한다.

create or replace function public.pick_contact_profile(p_preferred uuid, p_company uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    -- 1순위: 원래 담당자 (아직 남아 있으면)
    (select id from profiles where id = p_preferred and status = 'approved'),
    -- 2순위: 그 회사의 담당 관리자
    (select id from profiles
      where company_id = p_company and is_company_admin and status = 'approved'
      order by created_at limit 1),
    -- 3순위: 남아 있는 아무 활성 회원
    (select id from profiles
      where company_id = p_company and status = 'approved'
      order by created_at limit 1)
  );
$$;

drop function if exists public.get_match_contacts(uuid);
create or replace function public.get_match_contacts(p_request_id uuid)
returns table (
  side         text,
  company_name text,
  logo_path    text,
  contact_name text,
  email        text,
  phone        text,
  is_fallback  boolean   -- 원래 담당자가 아니라 대체된 연락처인가
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_company_id uuid := current_company_id();
  v_request    requests;
  v_quote      quotes;
  v_client_id  uuid;
  v_partner_id uuid;
begin
  select * into v_request from requests where id = p_request_id;
  if v_request.id is null then
    raise exception '의뢰를 찾을 수 없습니다.';
  end if;
  if v_request.status not in ('matched', 'completed') then
    raise exception '매칭이 성사된 뒤에 공개됩니다.';
  end if;

  select * into v_quote
  from quotes where request_id = p_request_id and status = 'accepted';
  if v_quote.id is null then
    raise exception '수락된 견적이 없습니다.';
  end if;

  if v_company_id is null
     or v_company_id not in (v_request.company_id, v_quote.company_id) then
    raise exception '이 매칭의 당사자가 아닙니다.';
  end if;

  v_client_id  := pick_contact_profile(v_request.created_by,  v_request.company_id);
  v_partner_id := pick_contact_profile(v_quote.submitted_by, v_quote.company_id);

  return query
    select 'client'::text, c.name, c.logo_path, p.name, u.email::text, p.phone,
           (v_request.created_by is distinct from v_client_id)
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    where p.id = v_client_id
  union all
    select 'partner'::text, c.name, c.logo_path, p.name, u.email::text, p.phone,
           (v_quote.submitted_by is distinct from v_partner_id)
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    where p.id = v_partner_id;
end;
$$;

grant execute on function public.pick_contact_profile to authenticated;
grant execute on function public.get_match_contacts   to authenticated;
