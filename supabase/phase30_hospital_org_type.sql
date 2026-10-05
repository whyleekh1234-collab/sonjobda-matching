-- 30단계: 병원·기관 회원 유형
--
-- 병원은 "무엇을 하는가"가 아니라 "무엇인가"다. roles는 일을 맡기는지
-- 받는지를 담는 축이라 거기에 hospital을 넣으면 회원번호 접두사, active_role
-- 제약, 이해상충 규칙, 의뢰 공개 범위가 모두 모르는 값을 만나게 된다.
--
-- 그래서 회사의 종류로 둔다. 가입 화면에서는 의뢰사·파트너사와 나란히
-- 세 번째 칸으로 보이지만, 고르면 roles는 {client} 하나다. 병원은 일을
-- 맡기는 쪽으로만 들어온다.
--
-- 파트너사에게 "병원이 올린 의뢰"임을 보여주려면 한 가지가 걸린다.
-- phase14가 companies 행 자체를 가리고 있어, 조인해도 null로 온다.
-- 그래서 종류만 의뢰 행에 실어 보낸다 — 이름은 여전히 가려지고 종류만
-- 건너간다.

-- ── 1. 회사의 종류 ──────────────────────────────────────────
alter table companies add column if not exists org_type text not null default 'company';

alter table companies drop constraint if exists companies_org_type_valid;
alter table companies add constraint companies_org_type_valid
  check (org_type in ('company', 'hospital'));

comment on column companies.org_type is
  '기관 종류. company=일반 기업, hospital=병원·기관. 병원은 의뢰사로만 가입한다.';

-- ── 2. 의뢰에 실어 보내는 종류 ──────────────────────────────
alter table requests add column if not exists client_org_type text not null default 'company';

comment on column requests.client_org_type is
  '이 의뢰를 올린 회사의 종류. companies가 RLS로 가려져 조인이 안 되므로 여기 복사해 둔다.';

-- 의뢰가 생길 때 회사에서 가져온다.
create or replace function public.set_request_client_org_type()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select org_type into new.client_org_type from companies where id = new.company_id;
  new.client_org_type := coalesce(new.client_org_type, 'company');
  return new;
end;
$$;

drop trigger if exists requests_set_org_type on requests;
create trigger requests_set_org_type
  before insert on requests
  for each row execute function public.set_request_client_org_type();

-- 회사의 종류가 바뀌면 그 회사의 의뢰도 따라간다. 복사해 둔 값이
-- 어긋나면 파트너사가 잘못된 표시를 보게 된다.
create or replace function public.sync_requests_org_type()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_type is distinct from old.org_type then
    update requests set client_org_type = new.org_type where company_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_sync_org_type on companies;
create trigger companies_sync_org_type
  after update of org_type on companies
  for each row execute function public.sync_requests_org_type();

-- 이미 쌓인 의뢰를 지금 값으로 맞춘다.
update requests r
set client_org_type = c.org_type
from companies c
where c.id = r.company_id and r.client_org_type is distinct from c.org_type;

-- ── 3. 가입 트리거 ──────────────────────────────────────────
-- phase28·29의 내용을 그대로 두고 org_type만 더한다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meta            jsonb   := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name            text    := nullif(trim(coalesce(v_meta->>'name', '')), '');
  v_business_number text    := nullif(trim(coalesce(v_meta->>'business_number', '')), '');
  v_company_name    text    := nullif(trim(coalesce(v_meta->>'company_name', '')), '');
  v_token           text    := nullif(trim(coalesce(v_meta->>'invite_token', '')), '');
  -- 병원으로 가입하면 회사 종류가 함께 온다. 모르는 값은 일반 기업으로 본다.
  v_org_type        text    := case when v_meta->>'org_type' = 'hospital' then 'hospital' else 'company' end;
  v_roles           text[]  := '{}';
  v_categories      text[]  := '{}';
  v_active_role     text;
  v_company_id      uuid;
  v_is_new_company  boolean := false;
  v_is_first_member boolean;
  v_status          user_status := 'pending';
  v_invite          company_invites;
  v_marketing       boolean := coalesce((v_meta->>'marketing_consent')::boolean, false);
begin
  if v_name is null or v_business_number is null then
    return new;
  end if;

  if jsonb_typeof(v_meta->'roles') = 'array' then
    v_roles := array(select jsonb_array_elements_text(v_meta->'roles'));
  end if;
  if cardinality(v_roles) = 0 then
    v_roles := array['client'];
  end if;

  -- 병원은 일을 맡기는 쪽으로만 들어온다. 화면에서도 막지만, 메타데이터를
  -- 직접 손봐 보내는 경우가 남는다.
  if v_org_type = 'hospital' then
    v_roles := array['client'];
  end if;

  if jsonb_typeof(v_meta->'partner_categories') = 'array' then
    v_categories := array(select jsonb_array_elements_text(v_meta->'partner_categories'));
  end if;
  if v_org_type = 'hospital' then
    v_categories := '{}';
  end if;

  select id into v_company_id from companies where business_number = v_business_number;

  if v_company_id is null then
    insert into companies (business_number, name, address, org_type)
    values (
      v_business_number,
      coalesce(v_company_name, v_business_number),
      nullif(trim(coalesce(v_meta->>'address', '')), ''),
      v_org_type
    )
    returning id into v_company_id;
    v_is_new_company := true;
  else
    select * into v_invite
    from company_invites
    where token = v_token
      and company_id = v_company_id
      and lower(email) = lower(new.email)
      and accepted_at is null
      and expires_at > now();

    if v_invite.id is null then
      raise exception '이미 등록된 사업자등록번호입니다. 회사 담당자에게 초대를 요청해주세요.';
    end if;

    if v_invite.roles is not null and cardinality(v_invite.roles) > 0 then
      v_roles := v_invite.roles;
      v_categories := coalesce(v_invite.partner_categories, '{}');
    end if;

    if v_invite.auto_approve then
      v_status := 'approved';
    end if;

    update company_invites set accepted_at = now() where id = v_invite.id;
  end if;

  v_active_role := nullif(trim(coalesce(v_meta->>'active_role', '')), '');
  if v_active_role is null or not (v_active_role = any (v_roles)) then
    v_active_role := v_roles[1];
  end if;

  v_is_first_member := v_is_new_company
    or not exists (select 1 from profiles where company_id = v_company_id);

  insert into profiles (
    id, company_id, name, phone, roles, active_role, partner_categories, is_company_admin,
    status, marketing_consent, marketing_consent_at
  ) values (
    new.id, v_company_id, v_name,
    nullif(trim(coalesce(v_meta->>'phone', '')), ''),
    v_roles, v_active_role, v_categories, v_is_first_member, v_status,
    v_marketing,
    case when v_marketing then now() else null end
  );

  return new;
end;
$$;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, org_type, business_number from companies order by created_at desc limit 5;
-- select title, client_org_type from requests order by created_at desc limit 5;
