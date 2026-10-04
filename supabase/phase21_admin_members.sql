-- 21단계: 운영자 추가·해제
--
-- 운영자 계정을 여럿이 나눠 쓰면 안 된다. 세 가지가 걸린다.
--
--   1. 2단계 인증 통과 증명은 계정당 하나다. 둘이 번갈아 로그인하면
--      서로를 로그아웃시킨다.
--   2. 인증번호가 한 메일함으로만 간다.
--   3. 회원을 제한·정지·삭제한 게 누구인지 남지 않는다. 개인정보보호법
--      제29조는 취급자별 접속기록을 요구하는데 계정을 공유하면 만족할 수 없다.
--
-- 그래서 사람마다 계정을 따로 두고, 여기서 권한을 준다.

-- ── 1. 운영자 목록에 인증번호 주소를 함께 내준다 ────────────
-- 운영자를 추가하는 화면에서 "이 사람은 어디로 인증번호를 받는가"를
-- 보여줘야 한다. 반환 타입이 바뀌므로 먼저 지운다.
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid, member_code text, name text, email text, phone text,
  company_id uuid, company text, business_number text, address text,
  roles text[], active_role text, partner_categories text[],
  status text, is_company_admin boolean, is_platform_admin boolean,
  verified boolean, allow_category_edit boolean, created_at timestamptz,
  marketing_consent boolean, marketing_consent_at timestamptz,
  mfa_email text
)
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform admin_guard();
  return query
    select p.id, p.member_code, p.name, u.email::text, p.phone,
           c.id, c.name, c.business_number, c.address,
           p.roles, p.active_role, p.partner_categories,
           p.status::text, p.is_company_admin, p.is_platform_admin,
           p.verified, p.allow_category_edit, p.created_at,
           p.marketing_consent, p.marketing_consent_at,
           p.mfa_email
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users to authenticated;

-- ── 2. 권한 주고 뺏기 ───────────────────────────────────────
create or replace function public.admin_set_platform_admin(
  p_profile_id uuid,
  p_on         boolean,
  p_mfa_email  text default null
)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_login_email text;
  v_status      text;
  v_mfa         text := lower(trim(coalesce(p_mfa_email, '')));
  v_count       int;
begin
  perform admin_guard();

  select u.email::text, p.status::text into v_login_email, v_status
  from profiles p join auth.users u on u.id = p.id
  where p.id = p_profile_id;

  if v_login_email is null then
    raise exception '해당 회원을 찾을 수 없습니다.';
  end if;

  if p_on then
    -- 승인되지 않은 회원에게 운영자 권한을 주면, 로그인은 막혀 있는데
    -- 권한만 있는 이상한 상태가 된다.
    if v_status <> 'approved' then
      raise exception '승인된 회원만 운영자로 지정할 수 있습니다.';
    end if;
    if v_mfa = '' then
      raise exception '인증번호를 받을 주소를 입력해주세요.';
    end if;
    -- 로그인 이메일과 같으면 2단계 인증이 아니다. 그 메일함 하나만
    -- 뚫려도 비밀번호 재설정과 인증번호 수신이 함께 된다.
    if v_mfa = lower(v_login_email) then
      raise exception '인증번호 주소는 로그인 이메일과 달라야 합니다.';
    end if;

    update profiles
    set is_platform_admin = true, mfa_email = v_mfa
    where id = p_profile_id;
  else
    -- 스스로 권한을 내려놓으면 그 즉시 관리자 화면에서 쫓겨나고,
    -- 되돌릴 방법도 없다.
    if p_profile_id = auth.uid() then
      raise exception '자기 자신의 운영자 권한은 해제할 수 없습니다.';
    end if;
    select count(*) into v_count from profiles where is_platform_admin;
    if v_count <= 1 then
      raise exception '마지막 운영자는 해제할 수 없습니다.';
    end if;

    update profiles
    set is_platform_admin = false, mfa_email = null
    where id = p_profile_id;

    -- 권한을 뺐으면 살아 있는 세션도 끊는다. 다음 요청부터 막힌다.
    delete from admin_mfa_sessions where profile_id = p_profile_id;
  end if;
end;
$$;

grant execute on function public.admin_set_platform_admin to authenticated;

-- ── 3. 인증번호 주소만 바꾸기 ───────────────────────────────
create or replace function public.admin_set_mfa_email(p_profile_id uuid, p_mfa_email text)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_login_email text;
  v_mfa text := lower(trim(coalesce(p_mfa_email, '')));
begin
  perform admin_guard();
  if v_mfa = '' then
    raise exception '인증번호를 받을 주소를 입력해주세요.';
  end if;

  select u.email::text into v_login_email
  from auth.users u where u.id = p_profile_id;

  if v_mfa = lower(coalesce(v_login_email, '')) then
    raise exception '인증번호 주소는 로그인 이메일과 달라야 합니다.';
  end if;

  update profiles set mfa_email = v_mfa
  where id = p_profile_id and is_platform_admin;
end;
$$;

grant execute on function public.admin_set_mfa_email to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, member_code, mfa_email from profiles where is_platform_admin;
