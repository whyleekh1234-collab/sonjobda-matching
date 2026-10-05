-- 28단계: 운영자가 파트너사를 초대한다
--
-- 기업보험처럼 스스로 가입하지 못하게 닫아 둔 분야가 있다. 닫아 두기만
-- 하면 그 자리는 영영 빈다. 운영자가 넣어 주는 길이 있어야 한다.
--
-- "운영자가 아이디와 비밀번호를 만들어 건넨다"로는 하지 않는다. 운영자가
-- 남의 비밀번호를 알게 되고, 사업자등록증도 남지 않는다. 대신 이미 있는
-- 초대 구조를 쓴다 — 운영자는 회사와 분야만 정해 초대를 보내고, 비밀번호는
-- 받는 사람이 정하고 등록증도 그 사람이 올린다.
--
-- 바뀌는 것은 셋이다.
--   1. 초대가 역할·분야·자동승인 여부를 함께 지고 간다
--   2. 초대 조회가 그 값과 "등록증이 아직 없는 회사인지"를 알려 준다
--   3. 가입 트리거가 초대에 적힌 역할·분야를 그대로 쓴다

-- ── 1. 초대가 지고 갈 정보 ──────────────────────────────────
alter table company_invites add column if not exists roles              text[];
alter table company_invites add column if not exists partner_categories text[];
alter table company_invites add column if not exists auto_approve       boolean not null default false;

comment on column company_invites.roles is
  '운영자가 정해 보내는 역할. null이면 가입 화면에서 고른 값을 쓴다(동료 초대).';
comment on column company_invites.auto_approve is
  '운영자가 신원을 이미 확인하고 보낸 초대. 받는 사람은 승인 대기 없이 바로 쓴다.';

-- ── 2. 초대 조회 ────────────────────────────────────────────
-- 반환 타입이 바뀌므로 먼저 지운다. 바꾸는 동안 초대 링크로 들어온
-- 사람에게는 회사명이 잠깐 비어 보인다.
drop function if exists public.get_invite_by_token(text);

create function public.get_invite_by_token(p_token text)
returns table (
  email            text,
  company_name     text,
  business_number  text,
  invited_by_name  text,
  roles            text[],
  categories       text[],
  needs_license    boolean
)
language sql security definer set search_path = public, pg_temp stable as $$
  select i.email,
         c.name,
         c.business_number,
         p.name,
         i.roles,
         i.partner_categories,
         -- 운영자가 만든 회사에는 아직 등록증이 없다. 그 경우에는 초대받은
         -- 사람이 가입하면서 올려야 한다. 동료 초대라면 회사가 이미 냈다.
         c.license_path is null
  from company_invites i
  join companies c on c.id = i.company_id
  join profiles  p on p.id = i.invited_by
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > now();
$$;
grant execute on function public.get_invite_by_token to anon, authenticated;

-- ── 3. 운영자의 파트너사 초대 ───────────────────────────────
create or replace function public.admin_invite_partner(
  p_company_name    text,
  p_business_number text,
  p_email           text,
  p_categories      text[]
)
returns table (invite_token text, new_company_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
  v_token      text;
  v_digits     text := regexp_replace(coalesce(p_business_number, ''), '[^0-9]', '', 'g');
  v_biz        text;
  v_email      text := lower(trim(coalesce(p_email, '')));
begin
  if not is_platform_admin() then
    raise exception '운영자만 할 수 있습니다.';
  end if;

  if coalesce(trim(p_company_name), '') = '' then
    raise exception '회사명을 입력해주세요.';
  end if;
  if char_length(v_digits) <> 10 then
    raise exception '사업자등록번호 10자리를 정확히 입력해주세요.';
  end if;
  if v_email = '' or v_email not like '%@%' then
    raise exception '담당자 이메일을 정확히 입력해주세요.';
  end if;
  if coalesce(array_length(p_categories, 1), 0) = 0 then
    raise exception '분야를 하나 이상 선택해주세요.';
  end if;

  -- 저장 형식은 기존 회원가입과 같은 000-00-00000로 맞춘다. 형식이
  -- 어긋나면 같은 사업자가 둘로 들어온다.
  v_biz := substr(v_digits, 1, 3) || '-' || substr(v_digits, 4, 2) || '-' || substr(v_digits, 6, 5);

  if exists (select 1 from companies where business_number = v_biz) then
    raise exception '이미 등록된 사업자등록번호입니다.';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception '이미 가입된 이메일입니다. 다른 주소로 초대해주세요.';
  end if;

  insert into companies (business_number, name)
  values (v_biz, trim(p_company_name))
  returning id into v_company_id;

  insert into company_invites (company_id, email, invited_by, roles, partner_categories, auto_approve)
  values (v_company_id, v_email, auth.uid(), array['partner'], p_categories, true)
  returning company_invites.token into v_token;

  return query select v_token, v_company_id;
end;
$$;
grant execute on function public.admin_invite_partner to authenticated;

-- ── 4. 가입 트리거 ──────────────────────────────────────────
-- phase18의 함수를 이어받아 세 가지를 더한다.
--   · 초대에 적힌 역할·분야를 그대로 쓴다(가입 화면에서 바꿀 수 없다)
--   · 회사의 첫 사람은 회사 담당 관리자가 된다 — 운영자가 만든 빈 회사도
--     누군가는 멤버를 초대할 수 있어야 한다
--   · 운영자가 보낸 초대는 승인 대기를 건너뛴다
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

  if jsonb_typeof(v_meta->'partner_categories') = 'array' then
    v_categories := array(select jsonb_array_elements_text(v_meta->'partner_categories'));
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

    -- 운영자가 역할과 분야를 정해 보낸 초대라면 그 값이 이긴다. 가입
    -- 화면에서 다른 분야를 골라 보내더라도 여기서 덮어쓴다 — 닫아 둔
    -- 분야를 초대장으로만 열어 주는 것이 이 구조의 목적이다.
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

  -- 회사를 새로 만든 사람, 또는 아직 아무도 없는 회사에 처음 들어온 사람.
  v_is_first_member := v_is_new_company
    or not exists (select 1 from profiles where company_id = v_company_id);

  insert into profiles (
    id, company_id, name, phone, roles, active_role, partner_categories, is_company_admin,
    status, marketing_consent, marketing_consent_at
  ) values (
    new.id,
    v_company_id,
    v_name,
    nullif(trim(coalesce(v_meta->>'phone', '')), ''),
    v_roles,
    v_active_role,
    v_categories,
    v_is_first_member,
    v_status,
    v_marketing,
    case when v_marketing then now() else null end
  );

  return new;
end;
$$;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, business_number, license_path from companies order by created_at desc limit 5;
-- select email, roles, partner_categories, auto_approve, expires_at from company_invites order by created_at desc limit 5;
