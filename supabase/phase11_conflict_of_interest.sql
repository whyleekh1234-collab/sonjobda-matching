-- 손잡다매칭 11단계: 이해상충 방지 — 자기 파트너 분야의 의뢰는 못 올린다
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- CRO가 의뢰사로 "가짜 CRO 의뢰"를 올리면 경쟁 CRO들의 견적가를 전부
-- 볼 수 있다. 겸업 자체는 정당한 경우가 많아(CRO가 SMO 외주) 막지 않고,
-- "파트너사로 등록한 분야와 같은 분야의 의뢰"만 막는다. 분야는 회사
-- 단위다 — 같은 회사 멤버 중 누구든 그 분야 파트너로 등록돼 있으면
-- 회사 전체가 그 분야 의뢰를 올릴 수 없다. 서비스운영정책 제3조 ⑤.

-- 회사의 파트너 분야 합집합. 멤버별로 다르게 등록돼 있어도 회사 기준.
create or replace function public.company_partner_categories(p_company_id uuid)
returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct c), '{}'::text[])
  from profiles p, unnest(p.partner_categories) as c
  where p.company_id = p_company_id
    and 'partner' = any (p.roles);
$$;

create or replace function public.block_conflicting_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category = any (company_partner_categories(new.company_id)) then
    raise exception '귀사가 파트너사로 등록한 분야(%)의 의뢰는 등록할 수 없습니다. 이해상충 방지를 위한 조치입니다. (서비스운영정책 제3조)', new.category;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_conflict_of_interest on requests;
create trigger requests_conflict_of_interest
  before insert or update of category, company_id on requests
  for each row execute function public.block_conflicting_request();

-- 반대 방향도 막는다: 이미 그 분야 의뢰가 열려 있는 회사가 나중에
-- 그 분야 파트너로 등록하는 경우. 마이페이지에서 회사유형을 바꾸거나
-- 운영자가 바꿀 때 걸린다.
create or replace function public.block_conflicting_partner_category()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cat text; v_added text[];
begin
  if not ('partner' = any (new.roles)) then
    return new;
  end if;
  -- 이번에 새로 추가되는 분야만 본다. 이미 갖고 있던 분야는 (규칙 이전
  -- 데이터든 뭐든) 그대로 둔다 — 안 그러면 이름만 고쳐도 저장이 막힌다.
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(c), '{}') into v_added
    from unnest(new.partner_categories) c
    where not (c = any (coalesce(old.partner_categories, '{}')));
  else
    v_added := new.partner_categories;
  end if;
  if cardinality(v_added) = 0 then
    return new;
  end if;

  select r.category into v_cat
  from requests r
  where r.company_id = new.company_id
    and r.status = 'pending'
    and r.category = any (v_added)
  limit 1;
  if v_cat is not null then
    raise exception '귀사가 현재 의뢰를 진행 중인 분야(%)는 파트너 분야로 등록할 수 없습니다. 해당 의뢰를 회수하거나 마감한 뒤 다시 시도해 주세요.', v_cat;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_conflict_of_interest on profiles;
create trigger profiles_conflict_of_interest
  before insert or update of partner_categories, roles on profiles
  for each row execute function public.block_conflicting_partner_category();

grant execute on function public.company_partner_categories to authenticated;

-- ── 확인 ─────────────────────────────────────────────────────
--   select tgname from pg_trigger
--   where tgname in ('requests_conflict_of_interest', 'profiles_conflict_of_interest');
