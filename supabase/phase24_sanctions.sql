-- 24단계: 신고 처리와 제재 이력
--
-- 운영정책 제6조 ③은 이렇게 약속하고 있다.
--
--   "이용 제한이 누적 3회 이상인 회원 또는 회사에 대하여 회사는 회원
--    자격을 영구히 박탈(강제 탈퇴)할 수 있다."
--
-- 그런데 셀 방법이 없었다. profiles.status에 현재 상태(활성/제한/정지)
-- 하나만 있고, 언제 왜 몇 번 제재했는지가 전혀 남지 않는다. 정책이
-- 약속한 것을 시스템이 못 하는 상태였다.
--
-- 같은 이유로 제6조 ②의 "제한 사유와 기간을 통지한다"도 지킬 수 없었다.
-- 사유를 적는 자리가 없었기 때문이다.
--
-- 신고는 inquiries에 type='report'로 들어온다. 거기에 대상과 처리 결과를
-- 붙여, 신고 → 조사 → 제재 또는 기각이 한 줄로 이어지게 한다.

-- ── 1. 신고 대상 ────────────────────────────────────────────
-- 지금은 제목에 "[RQ-00000001]"만 들어가서, 어느 회원을 신고한 것인지
-- 시스템이 모른다. 운영자가 번호를 보고 사람 손으로 찾아야 했다.
alter table inquiries add column if not exists target_company_id uuid references companies(id) on delete set null;
alter table inquiries add column if not exists target_request_id uuid references requests(id) on delete set null;
alter table inquiries add column if not exists resolution text;        -- 처리 결과 요약
alter table inquiries add column if not exists resolved_at timestamptz;

comment on column inquiries.target_company_id is
  '신고 대상 회사. 신고(type=report)에만 쓴다.';
comment on column inquiries.resolution is
  '처리 결과. 제재했으면 그 내용, 근거가 없으면 기각 사유.';

-- ── 2. 제재 이력 ────────────────────────────────────────────
create type sanction_kind as enum ('warning', 'restrict', 'suspend', 'dismiss');

comment on type sanction_kind is
  'warning=경고, restrict=일시 제한, suspend=이용 정지, dismiss=기각(제재 없음)';

create table if not exists sanctions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid        not null references profiles(id) on delete cascade,
  company_id  uuid        not null references companies(id) on delete cascade,
  kind        sanction_kind not null,
  reason      text        not null,
  -- 어느 신고에서 비롯됐는가. 직권 제재면 비어 있다.
  inquiry_id  uuid        references inquiries(id) on delete set null,
  -- 누가 했는가. 운영자가 탈퇴해도 이력은 남아야 하므로 set null.
  decided_by  uuid        references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists sanctions_profile_idx on sanctions (profile_id, created_at desc);
create index if not exists sanctions_company_idx on sanctions (company_id, created_at desc);

alter table sanctions enable row level security;

-- 운영자만 본다. 제재 사유에는 조사 내용이 들어가므로 당사자에게도
-- 그대로 열어주지 않는다 — 통지는 알림·메일로 따로 나간다.
drop policy if exists sanctions_admin_all on sanctions;
create policy sanctions_admin_all on sanctions
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- ── 3. 제재 집행 ────────────────────────────────────────────
-- 이력을 남기고, 회원 상태를 바꾸고, 당사자에게 알리는 것을 한 번에 한다.
-- 셋이 따로 놀면 "상태는 정지인데 이력이 없는" 회원이 생긴다.
create or replace function public.admin_sanction(
  p_profile_id uuid,
  p_kind       sanction_kind,
  p_reason     text,
  p_inquiry_id uuid default null
)
returns table (sanction_count int, member_status text)
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_name    text;
  v_count   int;
  v_status  text;
  v_label   text;
begin
  perform admin_guard();

  if coalesce(trim(p_reason), '') = '' then
    raise exception '사유를 입력해주세요.';
  end if;

  select company_id, name into v_company, v_name
  from profiles where id = p_profile_id;
  if v_company is null then
    raise exception '해당 회원을 찾을 수 없습니다.';
  end if;

  insert into sanctions (profile_id, company_id, kind, reason, inquiry_id, decided_by)
  values (p_profile_id, v_company, p_kind, trim(p_reason), p_inquiry_id, auth.uid());

  -- 기각은 제재가 아니다. 이력에는 남기되 상태는 건드리지 않는다 —
  -- 같은 사람이 반복해서 신고당했다는 사실 자체가 나중에 판단 재료가 된다.
  if p_kind = 'warning' then
    v_label := '경고';
  elsif p_kind = 'restrict' then
    update profiles set status = 'restricted' where id = p_profile_id;
    v_label := '이용 제한';
  elsif p_kind = 'suspend' then
    update profiles set status = 'suspended' where id = p_profile_id;
    v_label := '이용 정지';
  else
    v_label := null;
  end if;

  if v_label is not null then
    insert into notifications (profile_id, message, link)
    values (
      p_profile_id,
      format('[%s] 서비스운영정책 위반으로 %s 조치되었습니다. 사유: %s · 이의가 있으시면 7일 이내에 고객센터로 알려주세요.',
             v_label, v_label, trim(p_reason)),
      '/inquiry'
    );
  end if;

  -- 기각을 뺀 실제 제재 횟수. 정책 제6조 ③의 "누적 3회"가 이 값이다.
  select count(*) into v_count
  from sanctions where profile_id = p_profile_id and kind <> 'dismiss';

  select status::text into v_status from profiles where id = p_profile_id;
  return query select v_count, v_status;
end;
$$;

grant execute on function public.admin_sanction to authenticated;

-- ── 4. 회원별 제재 이력 ─────────────────────────────────────
create or replace function public.admin_list_sanctions(p_profile_id uuid)
returns table (
  id uuid, kind text, reason text, created_at timestamptz,
  decided_by_name text, inquiry_id uuid
)
language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  return query
    select s.id, s.kind::text, s.reason, s.created_at, d.name, s.inquiry_id
    from sanctions s
    left join profiles d on d.id = s.decided_by
    where s.profile_id = p_profile_id
    order by s.created_at desc;
end;
$$;

grant execute on function public.admin_list_sanctions to authenticated;

-- ── 5. 회원 목록에 누적 제재 횟수 ───────────────────────────
-- 승인·제재를 판단할 때 "이 사람 몇 번째인가"가 바로 보여야 한다.
-- 반환 타입이 바뀌므로 먼저 지운다.
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid, member_code text, name text, email text, phone text,
  company_id uuid, company text, business_number text, address text,
  roles text[], active_role text, partner_categories text[],
  status text, is_company_admin boolean, is_platform_admin boolean,
  verified boolean, allow_category_edit boolean, created_at timestamptz,
  marketing_consent boolean, marketing_consent_at timestamptz,
  mfa_email text, license_path text, license_name text,
  sanction_count int
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
           p.mfa_email, c.license_path, c.license_name,
           (select count(*)::int from sanctions s
            where s.profile_id = p.id and s.kind <> 'dismiss')
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users to authenticated;

-- ── 6. 신고 처리 종결 ───────────────────────────────────────
create or replace function public.admin_resolve_inquiry(p_inquiry_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  update inquiries
  set resolution = nullif(trim(p_resolution), ''),
      resolved_at = now(),
      status = 'closed'
  where id = p_inquiry_id;
end;
$$;

grant execute on function public.admin_resolve_inquiry to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select p.name, count(*) filter (where s.kind <> 'dismiss') as 제재횟수
-- from profiles p left join sanctions s on s.profile_id = p.id group by p.name;
