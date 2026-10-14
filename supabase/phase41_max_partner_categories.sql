-- 손잡다매칭 41단계: 가입할 때 파트너사 유형은 최대 3개
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다. 40단계 다음에 돌린다.
--
-- 여덟 개를 다 고르면 모든 의뢰가 그 회사로 간다. 받는 쪽은 맞지 않는
-- 의뢰까지 들여다봐야 하고, 의뢰사는 분야를 가리지 않는 곳에서 견적을
-- 받는다. 세 개까지만 고르게 해서 "무엇을 하는 회사인가"가 남게 한다.
--
-- 화면에서도 막지만, 가입 메타데이터를 직접 손봐 보내는 경우가 남는다.
-- 병원 역할을 서버에서 다시 고정하는 것과 같은 이유다.
--
-- 막는 대신 잘라 낸다. 여기서 예외를 던지면 트리거가 실패하면서 계정
-- 생성까지 되돌아가고, 쓰는 사람은 "회원가입에 실패했습니다"만 본다.
-- 화면을 거쳐 온 사람은 어차피 세 개를 넘길 수 없으니, 잘리는 경우는
-- 메타데이터를 손본 쪽뿐이다.
--
-- 이미 가입한 회원은 건드리지 않는다. 일곱 개씩 등록한 곳이 있는데,
-- 지금 와서 넷을 빼앗을 이유가 없다. 제약조건(check)을 걸지 않는 것도
-- 같은 까닭이다 — 걸어 두면 그 회원들이 프로필을 저장할 때마다 막힌다.
--
-- 초대로 들어오는 경우도 자른다. 운영자가 초대장에 네 개를 적어 두면
-- 그대로 들어오는데, 들어오는 문이 둘인데 규칙이 하나만 적용되면
-- 그 문으로 돌아가는 길이 생긴다.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta            jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_business_number text;
  v_company_name    text;
  v_company_id      uuid;
  v_is_new_company  boolean := false;
  v_is_first_member boolean;
  v_name            text;
  v_roles           text[] := '{}';
  v_categories      text[] := '{}';
  v_active_role     text;
  v_status          user_status := 'pending';
  v_token           text := nullif(trim(coalesce(v_meta->>'invite_token', '')), '');
  v_invite          company_invites;
  v_org_type        text;
  v_has_members     boolean;
  v_max_categories  constant int := 3;
begin
  v_business_number := regexp_replace(coalesce(v_meta->>'business_number', ''), '\D', '', 'g');
  if length(v_business_number) <> 10 then
    raise exception '사업자등록번호가 올바르지 않습니다.';
  end if;

  v_name := nullif(trim(coalesce(v_meta->>'name', '')), '');
  if v_name is null then
    raise exception '담당자 이름이 필요합니다.';
  end if;

  v_company_name := nullif(trim(coalesce(v_meta->>'company', '')), '');

  v_org_type := nullif(trim(coalesce(v_meta->>'org_type', '')), '');
  if v_org_type is null or v_org_type not in ('company', 'hospital') then
    v_org_type := 'company';
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
    -- 멤버가 한 명도 없으면 초대를 받을 곳이 없다. 그 회사는 사실상
    -- 비어 있으므로 새로 등록하는 것과 같이 다룬다(40단계).
    select exists (select 1 from profiles where company_id = v_company_id)
      into v_has_members;

    if v_has_members then
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
    else
      update companies
      set name     = coalesce(v_company_name, name),
          address  = coalesce(nullif(trim(coalesce(v_meta->>'address', '')), ''), address),
          org_type = v_org_type
      where id = v_company_id;
    end if;
  end if;

  -- 세 개를 넘으면 앞에서부터 세 개만 남긴다. 초대로 받은 값도 여기를
  -- 지나므로 문이 둘이어도 규칙은 하나다.
  if cardinality(v_categories) > v_max_categories then
    v_categories := v_categories[1:v_max_categories];
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
    v_roles, v_active_role, v_categories, v_is_first_member,
    v_status,
    coalesce((v_meta->>'marketing_consent')::boolean, false),
    case when coalesce((v_meta->>'marketing_consent')::boolean, false) then now() end
  );

  return new;
end;
$$;

-- ── 확인 ────────────────────────────────────────────────────
-- 지금 세 개를 넘겨 가진 회원(가입 전부터 있던 사람들):
--   select name, partner_categories
--     from profiles
--    where cardinality(partner_categories) > 3;
