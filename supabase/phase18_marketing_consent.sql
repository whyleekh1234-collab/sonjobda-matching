-- 18단계: 마케팅 정보 수신 동의
--
-- 정보통신망법 제50조는 광고성 정보를 보내기 전에 수신자의 사전 동의를
-- 받도록 하고, 그 동의는 다른 약관 동의와 묶지 못하게 한다. 그래서 이
-- 항목은 선택이고, 체크하지 않아도 가입은 정상으로 진행된다.
--
-- 동의가 필요한 것은 광고·프로모션성 메일뿐이다. 승인 완료, 견적 도착,
-- 1차 선정, 매칭 성사 같은 안내 메일은 거래 이행에 필요한 것이라 동의와
-- 무관하게 나간다. 발송 코드에서 이 둘을 헷갈리지 않도록 주의할 것.
--
-- 동의한 시각을 함께 남긴다. 분쟁이 생기면 "언제 동의받았는가"를
-- 증명해야 하는데, 플래그만으로는 답할 수 없다. 철회하면 시각을 지운다.

-- ── 1. 컬럼 ─────────────────────────────────────────────────
alter table profiles add column if not exists marketing_consent boolean not null default false;
alter table profiles add column if not exists marketing_consent_at timestamptz;

comment on column profiles.marketing_consent is
  '광고성 정보 수신 동의 여부(선택). 거래 안내 메일은 이 값과 무관하게 발송한다.';
comment on column profiles.marketing_consent_at is
  '동의한 시각. 철회하면 null로 되돌린다.';

-- ── 2. 가입 트리거: 동의값을 함께 저장 ──────────────────────
-- phase4의 정의에 동의 처리만 얹은 것이다. 나머지 동작은 그대로다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
  v_invite          company_invites;
  -- 마케팅 수신 동의. 선택 항목이라 값이 없으면 false로 본다.
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

  v_active_role := nullif(trim(coalesce(v_meta->>'active_role', '')), '');
  if v_active_role is null or not (v_active_role = any (v_roles)) then
    v_active_role := v_roles[1];
  end if;

  select id into v_company_id from companies where business_number = v_business_number;

  if v_company_id is null then
    -- 새 회사. 처음 등록한 사람이 회사 담당 관리자가 된다.
    insert into companies (business_number, name, address)
    values (
      v_business_number,
      coalesce(v_company_name, v_business_number),
      nullif(trim(coalesce(v_meta->>'address', '')), '')
    )
    returning id into v_company_id;
    v_is_new_company := true;
  else
    -- 이미 있는 회사에 합류하려면 그 회사가 이 이메일로 보낸 유효한
    -- 초대가 있어야 한다. 없으면 가입 자체가 취소된다(트리거 예외는
    -- auth.users insert까지 되돌린다).
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

    update company_invites set accepted_at = now() where id = v_invite.id;
  end if;

  insert into profiles (
    id, company_id, name, phone, roles, active_role, partner_categories, is_company_admin,
    marketing_consent, marketing_consent_at
  ) values (
    new.id,
    v_company_id,
    v_name,
    nullif(trim(coalesce(v_meta->>'phone', '')), ''),
    v_roles,
    v_active_role,
    v_categories,
    v_is_new_company,
    v_marketing,
    case when v_marketing then now() else null end
  );

  return new;
end;
$$;

-- ── 3. 동의 변경 ────────────────────────────────────────────
-- 본인만 자기 동의를 바꾼다. 마이페이지에서 언제든 철회할 수 있어야
-- 하는데(정보통신망법 제50조 제8항), RLS는 행 단위라 "이 컬럼만"을
-- 표현하지 못한다. 그래서 update 권한을 열어주는 대신 이 함수로만
-- 바꾸게 한다. 직접 update로 열어두면 승인 상태나 권한 컬럼까지
-- 같이 손댈 수 있는 길이 생긴다.
create or replace function public.set_marketing_consent(p_on boolean)
returns profiles
language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update profiles
  set marketing_consent = p_on,
      -- 이미 동의한 상태에서 또 동의를 누르면 처음 동의한 시각을 지킨다.
      marketing_consent_at = case
        when p_on then coalesce(marketing_consent_at, now())
        else null
      end
  where id = auth.uid()
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.set_marketing_consent to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, marketing_consent, marketing_consent_at from profiles limit 5;
