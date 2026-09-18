-- 손잡다매칭 3단계: 의뢰와 견적
--
-- ▶ 이 파일은 통째로 실행하면 된다. 여러 번 돌려도 안전하다.
--   앞서 schema.sql(1단계), phase2_auth.sql(2단계)이 실행된 상태를 전제한다.

-- ════════════════════════════════════════════════════════════
-- 1. 1단계에서 빠진 컬럼 보강
-- ════════════════════════════════════════════════════════════
--
-- 견적서에는 카테고리마다 다른 항목이 붙는다(대상자 수, 실시기관 수,
-- 예상 CRA 인원, EDC 브랜드 등). 의뢰의 form_data와 같은 이유로 jsonb에
-- 통째로 담는다. 목록·정렬에 쓰는 amount/duration/status만 컬럼이다.

alter table quotes add column if not exists details         jsonb not null default '{}'::jsonb;
alter table quotes add column if not exists attachment_name text;

-- ════════════════════════════════════════════════════════════
-- 2. 의뢰 수정 권한을 컬럼 단위로 제한
-- ════════════════════════════════════════════════════════════
--
-- requests_update_own_company 정책은 자기 회사 의뢰면 모든 컬럼을 열어준다.
-- 그러면 의뢰사가 status를 직접 'matched'로 바꾸거나 request_code를 조작할
-- 수 있다. 내용 수정에 필요한 컬럼만 남긴다.
-- 상태 변경은 아래 회수/수락 함수를 통해서만 한다.

revoke update on public.requests from authenticated;

grant update (title, category, description, budget, deadline, form_data)
  on public.requests to authenticated;

-- ════════════════════════════════════════════════════════════
-- 3. 견적 수정은 전부 함수를 통해서만
-- ════════════════════════════════════════════════════════════
--
-- quotes_update_own 정책은 "내 회사 견적" 또는 "내 회사 의뢰에 달린 견적"을
-- 열어준다. 후자 때문에 의뢰사가 파트너사의 견적 금액을 고칠 수 있다.
-- RLS로는 이 둘을 구분할 수 없고(둘 다 authenticated), 컬럼 권한으로도
-- 구분할 수 없다. 그래서 직접 수정을 막고 함수만 남긴다.

revoke insert, update on public.quotes from authenticated;

-- ── 파트너사: 자기 회사 견적 작성/수정 ──────────────────────
--
-- 한 회사당 한 의뢰에 견적 하나다(quotes의 unique 제약). 이미 있으면
-- 덮어쓴다. 임시저장(reviewing), 제출(quoted), 보류(hold), 거절(rejected)이
-- 전부 "상태만 다른 같은 쓰기"라 함수 하나로 처리한다.

create or replace function public.upsert_my_quote(
  p_request_id uuid,
  p_status     quote_status,
  p_amount     numeric        default null,
  p_duration   text           default null,
  p_memo       text           default null,
  p_timeline   jsonb          default null,
  p_details    jsonb          default '{}'::jsonb,
  p_attachment_path text      default null,
  p_attachment_name text      default null
) returns quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := current_company_id();
  v_request    requests;
  v_quote      quotes;
begin
  if auth.uid() is null or v_company_id is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if not is_approved() then
    raise exception '승인된 회원만 견적을 제출할 수 있습니다.';
  end if;

  select * into v_request from requests where id = p_request_id;
  if v_request.id is null then
    raise exception '의뢰를 찾을 수 없습니다.';
  end if;
  if v_request.company_id = v_company_id then
    raise exception '자기 회사가 등록한 의뢰에는 견적을 낼 수 없습니다.';
  end if;
  if v_request.status <> 'pending' then
    raise exception '마감된 의뢰에는 견적을 제출할 수 없습니다.';
  end if;
  if not (v_request.category = any (my_partner_categories())) then
    raise exception '회사유형에 해당하지 않는 의뢰입니다.';
  end if;

  -- 의뢰사가 이미 확인한 뒤에는 파트너사가 손댈 수 없다.
  select * into v_quote
  from quotes where request_id = p_request_id and company_id = v_company_id;

  if v_quote.id is not null
     and v_quote.status in ('client_reviewing', 'accepted', 'client_rejected',
                            'client_hold', 'not_selected') then
    raise exception '의뢰사가 확인한 견적은 수정할 수 없습니다.';
  end if;

  -- 의뢰사는 파트너사의 profiles를 읽을 수 없다(다른 회사라 RLS가 막는다).
  -- 그런데 견적 비교 화면에는 그 회사가 무슨 일을 하는지 보여줘야 한다.
  -- 제출 시점의 회사유형을 견적에 같이 남겨 둔다.
  insert into quotes (
    request_id, company_id, submitted_by, amount, duration, memo,
    timeline, details, attachment_path, attachment_name, status
  ) values (
    p_request_id, v_company_id, auth.uid(), p_amount, p_duration, p_memo,
    p_timeline,
    coalesce(p_details, '{}'::jsonb)
      || jsonb_build_object('partnerCategories', to_jsonb(my_partner_categories())),
    p_attachment_path, p_attachment_name, p_status
  )
  on conflict (request_id, company_id) do update set
    submitted_by    = auth.uid(),
    amount          = excluded.amount,
    duration        = excluded.duration,
    memo            = excluded.memo,
    timeline        = excluded.timeline,
    details         = excluded.details,
    -- 첨부는 이번에 새로 올린 게 없으면 기존 것을 유지한다
    attachment_path = coalesce(excluded.attachment_path, quotes.attachment_path),
    attachment_name = coalesce(excluded.attachment_name, quotes.attachment_name),
    status          = excluded.status
  returning * into v_quote;

  return v_quote;
end;
$$;

-- ── 파트너사: 제출한 견적 회수 ──────────────────────────────
--
-- 의뢰사가 아직 열어보지 않았을 때만 거둬들일 수 있다. 확인한 뒤에는
-- 회수도 수정도 막힌다(화면에도 그렇게 고지돼 있다).

create or replace function public.withdraw_my_quote(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote quotes;
begin
  select * into v_quote
  from quotes
  where request_id = p_request_id and company_id = current_company_id();

  if v_quote.id is null then
    raise exception '회수할 견적이 없습니다.';
  end if;
  if v_quote.status <> 'quoted' then
    raise exception '의뢰사가 확인한 견적은 회수할 수 없습니다.';
  end if;

  delete from quotes where id = v_quote.id;
end;
$$;

-- ── 의뢰사: 받은 견적의 상태 변경 ───────────────────────────
--
-- 의뢰사는 상태만 바꿀 수 있고, 그것도 의뢰사용 상태로만 바꿀 수 있다.
-- 금액이나 내용은 건드릴 수 없다.

create or replace function public.set_quote_status_as_client(
  p_quote_id uuid,
  p_status   quote_status
) returns quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := current_company_id();
  v_quote      quotes;
begin
  if p_status not in ('client_reviewing', 'client_hold', 'client_rejected') then
    raise exception '허용되지 않은 상태입니다. 견적 수락은 accept_quote를 쓴다.';
  end if;

  select q.* into v_quote
  from quotes q
  join requests r on r.id = q.request_id
  where q.id = p_quote_id and r.company_id = v_company_id;

  if v_quote.id is null then
    raise exception '내 의뢰에 달린 견적이 아닙니다.';
  end if;

  update quotes set status = p_status where id = p_quote_id returning * into v_quote;
  return v_quote;
end;
$$;

-- ── 의뢰사: 견적 수락 (매칭 성사) ───────────────────────────
--
-- 여러 행을 한 번에 바꾼다. 중간에 끊기면 "수락됐는데 의뢰는 아직 열려
-- 있는" 상태가 되므로 한 트랜잭션으로 처리한다.
--   · 고른 견적 → accepted
--   · 나머지 살아 있는 견적 → not_selected
--   · 의뢰 → matched, 매칭 관리번호 부여

create or replace function public.accept_quote(p_quote_id uuid)
returns requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := current_company_id();
  v_quote      quotes;
  v_request    requests;
begin
  select q.* into v_quote
  from quotes q
  join requests r on r.id = q.request_id
  where q.id = p_quote_id and r.company_id = v_company_id;

  if v_quote.id is null then
    raise exception '내 의뢰에 달린 견적이 아닙니다.';
  end if;

  select * into v_request from requests where id = v_quote.request_id;
  if v_request.status <> 'pending' then
    raise exception '이미 마감된 의뢰입니다.';
  end if;

  update quotes set status = 'accepted' where id = p_quote_id;

  update quotes set status = 'not_selected'
  where request_id = v_quote.request_id
    and id <> p_quote_id
    and status in ('quoted', 'client_reviewing', 'client_hold');

  update requests set
    status     = 'matched',
    match_code = coalesce(
      match_code,
      'MT-' || lpad(nextval('match_code_seq')::text, 8, '0')
    )
  where id = v_quote.request_id
  returning * into v_request;

  return v_request;
end;
$$;

-- ── 의뢰사: 의뢰 회수 ───────────────────────────────────────

create or replace function public.withdraw_request(p_request_id uuid)
returns requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests;
begin
  select * into v_request
  from requests where id = p_request_id and company_id = current_company_id();

  if v_request.id is null then
    raise exception '내 회사 의뢰가 아닙니다.';
  end if;
  if v_request.status <> 'pending' then
    raise exception '이미 마감된 의뢰는 회수할 수 없습니다.';
  end if;

  update requests set status = 'cancelled'
  where id = p_request_id returning * into v_request;

  return v_request;
end;
$$;

-- ── 의뢰사: 마감일 연장 ─────────────────────────────────────
-- deadline 컬럼은 위 grant에 들어 있어 직접 수정할 수도 있지만, 연장은
-- "오늘 기준 N일"이라는 규칙이 있어 함수로 둔다.

create or replace function public.extend_request_deadline(
  p_request_id uuid,
  p_days       int default 5
) returns requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests;
begin
  select * into v_request
  from requests where id = p_request_id and company_id = current_company_id();

  if v_request.id is null then
    raise exception '내 회사 의뢰가 아닙니다.';
  end if;
  if v_request.status <> 'pending' then
    raise exception '마감된 의뢰는 연장할 수 없습니다.';
  end if;

  update requests set deadline = (current_date + p_days)
  where id = p_request_id returning * into v_request;

  return v_request;
end;
$$;

-- ── 매칭 성사 후 상대방 연락처 공개 ─────────────────────────
--
-- 회원가입 화면에 "매칭 성사 시 상대 업체에 회사명, 담당자명, 이메일,
-- 연락처가 공개됩니다"라고 고지해 둔 바로 그 동작이다. 성사 전에는 서로의
-- profiles를 읽을 수 없고(다른 회사), 성사 후에도 이 함수를 통해서만
-- 열린다. 당사자가 아니면 거부한다.

create or replace function public.get_match_contacts(p_request_id uuid)
returns table (
  side         text,
  company_name text,
  contact_name text,
  email        text,
  phone        text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_company_id uuid := current_company_id();
  v_request    requests;
  v_quote      quotes;
begin
  select * into v_request from requests where id = p_request_id;
  if v_request.id is null then
    raise exception '의뢰를 찾을 수 없습니다.';
  end if;
  if v_request.status not in ('matched', 'completed') then
    raise exception '매칭이 성사된 뒤에 공개됩니다.';
  end if;

  select * into v_quote
  from quotes where request_id = p_request_id and status = 'accepted';
  if v_quote.id is null then
    raise exception '수락된 견적이 없습니다.';
  end if;

  if v_company_id is null
     or v_company_id not in (v_request.company_id, v_quote.company_id) then
    raise exception '이 매칭의 당사자가 아닙니다.';
  end if;

  return query
    select 'client'::text, c.name, p.name, u.email::text, p.phone
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    where p.id = v_request.created_by
  union all
    select 'partner'::text, c.name, p.name, u.email::text, p.phone
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    where p.id = v_quote.submitted_by;
end;
$$;

grant execute on function public.get_match_contacts            to authenticated;
grant execute on function public.upsert_my_quote              to authenticated;
grant execute on function public.withdraw_my_quote            to authenticated;
grant execute on function public.set_quote_status_as_client   to authenticated;
grant execute on function public.accept_quote                 to authenticated;
grant execute on function public.withdraw_request             to authenticated;
grant execute on function public.extend_request_deadline      to authenticated;

-- ════════════════════════════════════════════════════════════
-- 4. 정책끼리 서로를 부르는 무한 재귀 끊기
-- ════════════════════════════════════════════════════════════
--
-- 1단계 정책은 requests와 quotes가 서로를 조회한다.
--   requests 읽기 → "내 회사가 견적 낸 의뢰인가?" → quotes 조회
--   quotes 읽기  → "이 의뢰가 내 회사 것인가?"   → requests 조회
-- 둘이 물고 물려서 42P17(infinite recursion)로 죽는다. 2단계에서
-- profiles에 대해 막아둔 것과 같은 문제가 이번엔 두 테이블 사이에서 났다.
--
-- 해결도 같다. 교차 조회를 security definer 함수로 빼면 그 안에서는 RLS가
-- 돌지 않아 고리가 끊긴다.

create or replace function public.request_owner_company(p_request_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from requests where id = p_request_id;
$$;

create or replace function public.my_company_quoted(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from quotes
    where request_id = p_request_id and company_id = current_company_id()
  );
$$;

grant execute on function public.request_owner_company to authenticated;
grant execute on function public.my_company_quoted     to authenticated;

-- 파트너사가 견적을 낸 의뢰는 마감 후에도 계속 보인다
drop policy if exists requests_read_quoted on requests;
create policy requests_read_quoted on requests
  for select to authenticated
  using (my_company_quoted(id));

-- 견적은 제출한 파트너사와 그 의뢰의 의뢰사만 본다
drop policy if exists quotes_read_own_or_client on quotes;
create policy quotes_read_own_or_client on quotes
  for select to authenticated
  using (
    company_id = current_company_id()
    or request_owner_company(request_id) = current_company_id()
  );

-- 아래 둘은 insert/update 권한을 회수해 실제로는 도달하지 않지만,
-- 남겨두면 나중에 권한을 되돌릴 때 같은 재귀가 되살아난다.
drop policy if exists quotes_insert_partner on quotes;
drop policy if exists quotes_update_own on quotes;

-- ════════════════════════════════════════════════════════════
-- 5. 실행 후 확인
-- ════════════════════════════════════════════════════════════
--   select routine_name from information_schema.routines
--   where routine_schema = 'public'
--     and routine_name in ('upsert_my_quote','set_quote_status_as_client',
--                          'accept_quote','withdraw_request',
--                          'extend_request_deadline');
--
-- 의뢰/견적에 authenticated가 직접 쓸 수 있는 컬럼 확인:
--   select table_name, column_name, privilege_type
--   from information_schema.column_privileges
--   where grantee = 'authenticated' and table_name in ('requests','quotes')
--   order by table_name, column_name;
