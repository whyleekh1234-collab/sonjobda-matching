-- 31단계: 사업자등록증 / 고유번호증
--
-- 국립대병원·재단·산학협력단은 사업자등록번호가 아니라 고유번호를 쓴다.
-- 번호 생김새는 같지만(10자리) 국세청 사업자등록 상태조회의 대상이
-- 아니라서, 조회하면 "등록되지 않은 사업자"로 돌아온다.
--
-- phase30에서는 "병원이면 조회 실패해도 받는다"로 두려 했다. 그러면
-- 운영자가 화면만 보고는 조회를 못 한 것인지 실제로 없는 번호인지
-- 구분할 수 없다.
--
-- 그래서 가입하는 쪽이 어떤 증을 가졌는지 먼저 고른다. 고른 값에 따라
-- 번호 이름이 바뀌고, 조회할지 말지가 갈리고, 첨부할 서류 이름이 바뀐다.
-- 운영자는 "고유번호증을 낸 기관"임을 알고 그 서류를 본다.

alter table companies add column if not exists reg_doc_type text not null default 'business';

alter table companies drop constraint if exists companies_reg_doc_type_valid;
alter table companies add constraint companies_reg_doc_type_valid
  check (reg_doc_type in ('business', 'unique'));

comment on column companies.reg_doc_type is
  '사업자 등록 형태. business=사업자등록증, unique=고유번호증(국세청 조회 대상 아님).';

-- 가입 트리거에 한 줄을 더한다. phase30의 내용은 그대로 둔다.
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
  v_org_type        text    := case when v_meta->>'org_type' = 'hospital' then 'hospital' else 'company' end;
  -- 고유번호증은 병원·기관만 고를 수 있다. 일반 기업이 보내면 무시한다.
  v_reg_doc         text    := case
                                 when v_org_type = 'hospital' and v_meta->>'reg_doc_type' = 'unique' then 'unique'
                                 else 'business'
                               end;
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
    insert into companies (business_number, name, address, org_type, reg_doc_type)
    values (
      v_business_number,
      coalesce(v_company_name, v_business_number),
      nullif(trim(coalesce(v_meta->>'address', '')), ''),
      v_org_type,
      v_reg_doc
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
-- select name, org_type, reg_doc_type, business_number from companies order by created_at desc limit 5;
