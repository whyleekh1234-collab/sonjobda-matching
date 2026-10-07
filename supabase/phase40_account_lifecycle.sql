-- 손잡다매칭 40단계: 탈퇴와 재가입을 바로잡는다
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 가입부터 탈퇴까지 훑다가 세 가지를 찾았다.
--
-- 하나(심각). 회사의 마지막 멤버가 탈퇴하면 그 사업자등록번호로 다시
-- 가입할 수 없었다. 회사 행은 남고 멤버만 0명이 되는데, handle_new_user는
-- "회사가 이미 있나"만 보고 "멤버가 남아 있나"를 보지 않아서 초대를
-- 요구했다. 그런데 초대해 줄 담당자가 없다. 안내 문구가 "회사 담당자에게
-- 초대를 요청해주세요"였으니, 할 수 없는 일을 하라고 말하고 있었다.
--
-- 둘. 담당 관리자가 탈퇴하면 승계가 없었다. 남은 멤버는 초대도, 회사정보
-- 변경 요청도 못 한다. 운영자가 고쳐줄 수는 있지만, 고쳐 달라고 말할
-- 길부터 막혀 있다.
--
-- 셋. 운영정책과 개인정보처리방침은 "사업자등록증 사본은 회원 탈퇴 시
-- 파기한다"고 적어 두었는데, 실제로는 계정만 지우고 회사에 달린 파일은
-- 그대로 두었다. 문서와 동작이 어긋나면 문서 쪽이 거짓이 된다.
--
-- 의뢰와 견적은 지우지 않는다. 전자상거래법이 계약·거래 기록을 5년
-- 보존하도록 요구하고, 그 기록은 상대 회사의 것이기도 하다. 회사 행도
-- 남긴다 — 지우면 그 기록이 어느 회사 것인지 알 수 없게 된다.

-- ── 하나: 멤버가 없는 회사에는 초대 없이 들어간다 ───────────
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
    -- 비어 있으므로 새로 등록하는 것과 같이 다룬다. 사업자등록번호는
    -- 거래 과정에서 공개되는 정보라, 처음 등록하는 사람이 담당자가 되는
    -- 지금의 규칙과 위험이 다르지 않다.
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
      -- 빈 회사를 다시 쓴다. 적어 온 회사명과 주소로 갱신하고, 유형도
      -- 새로 온 사람 기준으로 맞춘다.
      update companies
      set name     = coalesce(v_company_name, name),
          address  = coalesce(nullif(trim(coalesce(v_meta->>'address', '')), ''), address),
          org_type = v_org_type
      where id = v_company_id;
    end if;
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

-- ── 둘·셋: 탈퇴할 때 뒷정리 ─────────────────────────────────
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_me        profiles;
  v_heir      uuid;
  v_remaining int;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null then
    -- 프로필이 없어도 계정은 지울 수 있어야 한다. 중간에 끊긴 가입이 있다.
    delete from auth.users where id = auth.uid();
    return;
  end if;

  select count(*) into v_remaining
  from profiles where company_id = v_me.company_id and id <> v_me.id;

  if v_remaining > 0 then
    -- 담당 관리자가 나가면 남은 사람 중 가장 먼저 들어온 이에게 넘긴다.
    -- 비워 두면 그 회사는 멤버 초대도, 회사정보 변경 요청도 못 하게 되고,
    -- 고쳐 달라고 말할 길부터 막힌다.
    if v_me.is_company_admin then
      select id into v_heir
      from profiles
      where company_id = v_me.company_id and id <> v_me.id
      order by created_at
      limit 1;

      update profiles set is_company_admin = true where id = v_heir;
    end if;
  else
    -- 마지막 한 사람이다. 회사에 달린 서류를 파기한다.
    --
    -- 운영정책 제1조 ②와 개인정보처리방침이 "회원 탈퇴 시 파기한다"고
    -- 밝힌 것들이다. 보존 의무가 있는 것은 의뢰·견적이지 이 서류가 아니다.
    --
    -- 회사 행 자체는 남긴다. 지우면 남은 거래 기록이 어느 회사 것인지
    -- 알 수 없게 된다. 이름과 사업자등록번호만 남고 서류는 사라진다.
    delete from storage.objects
    where bucket_id in ('business-licenses', 'company-logos', 'company-profiles')
      and (storage.foldername(name))[1] = v_me.company_id::text;

    update companies
    set license_path            = null,
        license_name            = null,
        license_uploaded_at     = null,
        logo_path               = null,
        profile_doc_path        = null,
        profile_doc_name        = null,
        profile_doc_uploaded_at = null
    where id = v_me.company_id;

    -- 역량 소개도 사람이 적은 글이라 함께 지운다.
    delete from partner_profiles where company_id = v_me.company_id;
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;
grant execute on function public.delete_my_account to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- 멤버가 없는 회사가 있는지:
--   select c.name, c.business_number
--     from companies c
--    where not exists (select 1 from profiles p where p.company_id = c.id);
--
-- 담당 관리자가 없는 회사가 있는지:
--   select c.name
--     from companies c
--    where exists (select 1 from profiles p where p.company_id = c.id)
--      and not exists (select 1 from profiles p
--                       where p.company_id = c.id and p.is_company_admin);
