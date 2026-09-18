-- 손잡다매칭: 회사 정보 변경 요청
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 지금까지는 회원사가 "이렇게 바꿔주세요"라고 자유 텍스트를 알림으로 보내는
-- 게 전부였다. 관리자는 그 알림을 읽어도 회사명이나 주소를 실제로 고칠
-- 방법이 없었고(회사 정보는 회원이 못 쓰게 잠겨 있다), 무엇을 요청했고
-- 어떻게 처리됐는지 남지도 않았다.
--
-- 요청을 행으로 남기고, 승인하면 그 값이 그대로 반영되게 한다.

create type change_request_status as enum ('pending', 'approved', 'rejected');

create table if not exists company_change_requests (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies on delete cascade,
  requested_by uuid not null references profiles  on delete cascade,

  -- 요청 시점의 값. 나중에 회사 정보가 또 바뀌어도 "무엇을 무엇으로
  -- 바꾸려 했는지"가 남는다.
  before_data  jsonb not null default '{}'::jsonb,
  after_data   jsonb not null default '{}'::jsonb,
  reason       text,

  status       change_request_status not null default 'pending',
  reviewed_by  uuid references profiles on delete set null,
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz not null default now()
);

create index if not exists company_change_requests_company_idx
  on company_change_requests (company_id, created_at desc);
create index if not exists company_change_requests_status_idx
  on company_change_requests (status, created_at desc);

alter table company_change_requests enable row level security;

-- 회원사는 자기 회사 요청만 본다. 운영자는 전부 본다.
create policy ccr_read_own_company on company_change_requests
  for select to authenticated
  using (company_id = current_company_id());

create policy ccr_read_admin on company_change_requests
  for select to authenticated
  using (is_platform_admin());

-- 쓰기는 전부 아래 함수를 거친다.
revoke insert, update, delete on public.company_change_requests from authenticated;

-- ════════════════════════════════════════════════════════════
-- 요청 (회사 담당 관리자)
-- ════════════════════════════════════════════════════════════

create or replace function public.submit_company_change_request(
  p_name            text default null,
  p_business_number text default null,
  p_address         text default null,
  p_reason          text default null
) returns company_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      profiles;
  v_company companies;
  v_after   jsonb := '{}'::jsonb;
  v_row     company_change_requests;
begin
  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if not v_me.is_company_admin then
    raise exception '회사 담당 관리자만 회사 정보 변경을 요청할 수 있습니다.';
  end if;

  select * into v_company from companies where id = v_me.company_id;

  -- 실제로 달라지는 항목만 담는다. 바꾸지 않을 칸을 빈 값으로 보내도
  -- 그 값이 지워지지 않게 한다.
  if p_name is not null and trim(p_name) <> '' and trim(p_name) <> v_company.name then
    v_after := v_after || jsonb_build_object('name', trim(p_name));
  end if;
  if p_business_number is not null and trim(p_business_number) <> ''
     and trim(p_business_number) <> v_company.business_number then
    v_after := v_after || jsonb_build_object('business_number', trim(p_business_number));
  end if;
  if p_address is not null and trim(p_address) <> ''
     and trim(p_address) is distinct from v_company.address then
    v_after := v_after || jsonb_build_object('address', trim(p_address));
  end if;

  if v_after = '{}'::jsonb then
    raise exception '변경할 내용이 없습니다.';
  end if;

  -- 처리되지 않은 요청이 쌓이지 않게 한 회사당 하나만 대기시킨다.
  if exists (
    select 1 from company_change_requests
    where company_id = v_me.company_id and status = 'pending'
  ) then
    raise exception '이미 처리 대기 중인 변경 요청이 있습니다.';
  end if;

  insert into company_change_requests (
    company_id, requested_by, before_data, after_data, reason
  ) values (
    v_me.company_id, auth.uid(),
    jsonb_build_object(
      'name', v_company.name,
      'business_number', v_company.business_number,
      'address', v_company.address
    ),
    v_after,
    nullif(trim(coalesce(p_reason, '')), '')
  )
  returning * into v_row;

  -- 운영자에게 알린다.
  insert into notifications (profile_id, from_profile_id, message)
  select p.id, auth.uid(),
         format('[회사정보 변경 요청] %s / %s 님이 변경을 요청했습니다.',
                v_company.name, v_me.name)
  from profiles p where p.is_platform_admin;

  return v_row;
end;
$$;

-- ════════════════════════════════════════════════════════════
-- 처리 (운영자)
-- ════════════════════════════════════════════════════════════

create or replace function public.admin_review_change_request(
  p_id      uuid,
  p_approve boolean,
  p_note    text default null
) returns company_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     company_change_requests;
  v_company companies;
begin
  perform admin_guard();

  select * into v_row from company_change_requests where id = p_id;
  if v_row.id is null then
    raise exception '변경 요청을 찾을 수 없습니다.';
  end if;
  if v_row.status <> 'pending' then
    raise exception '이미 처리된 요청입니다.';
  end if;

  if p_approve then
    -- 요청에 담긴 항목만 반영한다. 없는 항목은 기존 값을 유지한다.
    update companies set
      name            = coalesce(v_row.after_data->>'name', name),
      business_number = coalesce(v_row.after_data->>'business_number', business_number),
      address         = coalesce(v_row.after_data->>'address', address),
      -- 사업자등록번호가 바뀌면 국세청 검증을 다시 받아야 한다.
      verified_at     = case when v_row.after_data ? 'business_number'
                             then null else verified_at end
    where id = v_row.company_id
    returning * into v_company;
  end if;

  update company_change_requests set
    status      = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_id
  returning * into v_row;

  -- 요청한 사람에게 결과를 알린다.
  insert into notifications (profile_id, from_profile_id, message)
  values (
    v_row.requested_by, auth.uid(),
    case when p_approve
      then '[회사정보 변경] 요청하신 회사 정보 변경이 반영되었습니다.'
      else '[회사정보 변경] 요청하신 회사 정보 변경이 반려되었습니다.'
         || coalesce(' 사유: ' || v_row.review_note, '')
    end
  );

  return v_row;
end;
$$;

grant execute on function public.submit_company_change_request to authenticated;
grant execute on function public.admin_review_change_request    to authenticated;

-- ════════════════════════════════════════════════════════════
-- 실행 후 확인
-- ════════════════════════════════════════════════════════════
--   select routine_name from information_schema.routines
--   where routine_schema = 'public'
--     and routine_name in ('submit_company_change_request',
--                          'admin_review_change_request');
