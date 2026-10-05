-- 29단계: 운영자 초대도 승인을 거친다
--
-- phase28은 운영자가 보낸 초대를 자동 승인으로 두었다. 운영자가 회사와
-- 분야를 정해 보낸 것이니 다시 승인하게 하면 두 번 일하는 셈이라고 봤다.
--
-- 그런데 초대를 보내는 시점에 운영자가 확인한 것은 사업자등록번호뿐이다.
-- 사업자등록증은 초대받은 사람이 가입하면서 올리므로, 그 서류를 보는 것은
-- 가입이 끝난 뒤다. 서류를 보기도 전에 쓸 수 있게 두면 승인 절차가
-- 형식만 남는다. 들어오는 문은 하나로 모은다.
--
-- auto_approve 칸은 남겨 둔다. 지우려면 트리거까지 함께 고쳐야 하고,
-- 나중에 "이미 거래 중인 회사"처럼 서류를 미리 받아 둔 경우를 위해
-- 되살릴 자리가 필요하다.

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

  -- 역할과 분야는 운영자가 정한 대로 가되, 승인은 거친다.
  insert into company_invites (company_id, email, invited_by, roles, partner_categories, auto_approve)
  values (v_company_id, v_email, auth.uid(), array['partner'], p_categories, false)
  returning company_invites.token into v_token;

  return query select v_token, v_company_id;
end;
$$;
grant execute on function public.admin_invite_partner to authenticated;

-- 이미 나가 있는 초대 중 아직 수락되지 않은 것도 같은 규칙으로 맞춘다.
update company_invites
set auto_approve = false
where accepted_at is null and auto_approve;

-- ── 확인 ────────────────────────────────────────────────────
-- select email, auto_approve, accepted_at from company_invites order by created_at desc limit 5;
