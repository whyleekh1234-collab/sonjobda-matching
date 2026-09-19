-- 손잡다매칭 11단계: 회원 유형은 하나만 (이해상충 방지)
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 서비스운영정책 제1조 ④: 한 회사는 의뢰사 또는 파트너사 중 하나다.
-- 가입 화면에서도 하나만 고르게 했지만, 화면은 우회할 수 있으니 DB가
-- 최종 문지기다. 가입(profiles insert) 시점에만 막는다 — 운영자가 개별
-- 심사 후 admin_update_profile로 두 역할을 주는 길은 남겨 둔다.
--
-- 같은 회사에 합류하는 멤버는 회사의 유형을 그대로 따른다. 회사가
-- 의뢰사인데 새 멤버가 파트너사로 들어오면 결국 겸업이 된다.

create or replace function public.enforce_single_role_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_company_roles text[];
begin
  -- 이미 멤버가 있는 회사면 그 회사의 유형을 물려받는다.
  select roles into v_company_roles
  from profiles where company_id = new.company_id and id <> new.id
  order by created_at limit 1;

  if v_company_roles is not null then
    new.roles := v_company_roles;
    new.active_role := v_company_roles[1];
    if not ('partner' = any (v_company_roles)) then
      new.partner_categories := '{}';
    end if;
    return new;
  end if;

  if cardinality(new.roles) > 1 then
    raise exception '이해상충 방지를 위해 의뢰사와 파트너사를 동시에 선택할 수 없습니다. (서비스운영정책 제1조)';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_single_role on profiles;
create trigger profiles_single_role
  before insert on profiles
  for each row execute function public.enforce_single_role_on_signup();

-- 운영자가 역할을 바꿀 때: 두 역할을 주는 건 개별 심사 후에만 하는
-- 예외 조치라 confirm 없이도 되지만, 회사 안에서 멤버끼리 역할이
-- 어긋나면 안 되므로 같은 회사 멤버 전체에 같이 적용한다.
create or replace function public.admin_update_profile(
  p_target             uuid,
  p_name               text   default null,
  p_phone              text   default null,
  p_roles              text[] default null,
  p_partner_categories text[] default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_roles text[]; v_company uuid;
begin
  perform admin_guard();

  select coalesce(p_roles, roles), company_id into v_roles, v_company
  from profiles where id = p_target;
  if v_roles is null then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  update profiles set
    name               = coalesce(nullif(trim(p_name), ''), name),
    phone              = coalesce(p_phone, phone),
    partner_categories = coalesce(p_partner_categories, partner_categories)
  where id = p_target;

  if p_roles is not null then
    update profiles set
      roles       = v_roles,
      active_role = case when active_role = any (v_roles) then active_role else v_roles[1] end,
      partner_categories = case when 'partner' = any (v_roles) then partner_categories else '{}' end
    where company_id = v_company;
  end if;
end;
$$;
