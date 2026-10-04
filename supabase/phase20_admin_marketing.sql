-- 20단계: 관리자 화면에서 마케팅 수신 동의 확인
--
-- 18단계에서 동의는 받기 시작했는데 운영자가 그걸 볼 길이 없었다. 누가
-- 동의했는지 모르면 광고 메일을 보낼 수가 없고, 보내더라도 동의하지 않은
-- 사람에게 가지 않았다는 것을 증명할 수 없다. 받아만 두고 쓰지 못하는
-- 상태였다.
--
-- 동의 시각까지 함께 내준다. 분쟁이 생기면 "언제 동의받았는가"에 답해야
-- 하는데, 동의 여부만으로는 답이 안 된다.
--
-- 반환 타입이 바뀌므로 create or replace로는 안 되고 먼저 지워야 한다.

drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid, member_code text, name text, email text, phone text,
  company_id uuid, company text, business_number text, address text,
  roles text[], active_role text, partner_categories text[],
  status text, is_company_admin boolean, is_platform_admin boolean,
  verified boolean, allow_category_edit boolean, created_at timestamptz,
  marketing_consent boolean, marketing_consent_at timestamptz
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
           p.marketing_consent, p.marketing_consent_at
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, marketing_consent, marketing_consent_at
-- from profiles where marketing_consent;
