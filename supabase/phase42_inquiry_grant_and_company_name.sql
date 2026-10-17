-- 손잡다매칭 42단계: 문의 접수 막힘과 회사명이 번호로 들어가는 문제
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 가입을 하려던 분이 두 가지를 못 하고 돌아갔다. 둘 다 우리 쪽 문제다.
--
-- ── 하나: 문의 접수가 통째로 막혀 있었다 ───────────────────
--
-- "permission denied for table inquiries".
--
-- 4단계에서 접수자가 쓸 수 있는 칸을 여덟 개로 좁혀 두었다. 내용만 쓰고
-- 처리 상태와 답변은 운영자 몫이라는 뜻이었다.
--
--   grant insert (company, name, email, phone, type, title, message, profile_id)
--
-- 그 뒤 24단계에서 신고 대상을 적는 칸 둘(target_company_id,
-- target_request_id)을 추가했는데, 권한은 넓히지 않았다. 화면은 그 둘을
-- 늘 함께 보내므로(신고가 아니면 null) 모든 문의가 거절됐다.
--
-- 칸을 좁혀 두는 방식 자체는 그대로 둔다. 칸을 늘릴 때 권한을 같이
-- 늘리지 않은 것이 잘못이지, 좁힌 것이 잘못은 아니다.
revoke insert on public.inquiries from anon, authenticated;
grant insert (
  company, name, email, phone, type, title, message, profile_id,
  target_company_id, target_request_id
) on public.inquiries to anon, authenticated;

-- ── 둘: 회사명이 사업자등록번호로 저장됐다 ─────────────────
--
-- 화면은 회사명을 company_name으로 보내는데 트리거는 company를 읽고
-- 있었다. 읽히는 값이 늘 비어서, "비면 번호로 대신한다"는 뒤의 규칙이
-- 매번 걸렸다. 그래서 회사명 자리에 사업자등록번호가 들어갔다.
--
-- 두 이름을 다 본다. 예전 메타데이터로 들어온 것도 있고, 앞으로 화면이
-- 어느 쪽으로 보내든 걸리게 둔다.
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

  -- company_name이 먼저다. 화면이 보내는 이름이 그것이다.
  v_company_name := coalesce(
    nullif(trim(coalesce(v_meta->>'company_name', '')), ''),
    nullif(trim(coalesce(v_meta->>'company', '')), '')
  );

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
      -- 멤버가 없는 빈 회사를 다시 쓴다(40단계). 이름이 번호로 들어가
      -- 있던 회사라면 이번에 제대로 된 이름으로 덮인다.
      update companies
      set name     = coalesce(v_company_name, name),
          address  = coalesce(nullif(trim(coalesce(v_meta->>'address', '')), ''), address),
          org_type = v_org_type
      where id = v_company_id;
    end if;
  end if;

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

-- ── 이미 번호가 이름이 된 회사를 되돌린다 ──────────────────
-- 가입할 때 보낸 메타데이터에 회사명이 그대로 남아 있다. 거기서 가져온다.
-- 멤버가 여럿이면 가장 먼저 들어온 사람 것을 쓴다 — 회사를 만든 사람이다.
update companies c
set name = (
  select nullif(trim(coalesce(
    u.raw_user_meta_data->>'company_name',
    u.raw_user_meta_data->>'company'
  )), '')
  from profiles p
  join auth.users u on u.id = p.id
  where p.company_id = c.id
    and nullif(trim(coalesce(
      u.raw_user_meta_data->>'company_name',
      u.raw_user_meta_data->>'company'
    )), '') is not null
  order by p.created_at
  limit 1
)
where c.name = c.business_number
  and exists (
    select 1
    from profiles p
    join auth.users u on u.id = p.id
    where p.company_id = c.id
      and nullif(trim(coalesce(
        u.raw_user_meta_data->>'company_name',
        u.raw_user_meta_data->>'company'
      )), '') is not null
  );

-- ── 확인 ────────────────────────────────────────────────────
-- 아직 이름이 번호인 회사(가입 메타데이터에도 이름이 없는 경우):
--   select business_number, created_at from companies where name = business_number;
