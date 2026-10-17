-- 손잡다매칭 43단계: 조용히 실패한 일을 운영자가 알게 한다
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 문의 접수가 한 달 동안 막혀 있었다(42단계). 그동안 우리가 안 방법은
-- 하나뿐이었다 — 가입하려던 분이 전화로 알려줬다. 그 전까지 접수된 줄
-- 알았던 문의가 전부 사라지고 있었고, 화면도 로그도 아무 말을 하지
-- 않았다.
--
-- 고친 것은 권한이지만, 모르고 지난 한 달을 만든 것은 권한이 아니다.
-- 실패가 사용자 화면에서 끝나고 우리 쪽으로 오지 않았다는 점이다.
--
-- ── 왜 함수로만 적는가 ──────────────────────────────────────
--
-- 이 테이블에는 insert 권한을 주지 않는다. 적는 길은 security definer
-- 함수 하나뿐이다.
--
-- 42단계의 사고는 "칸 단위 권한이 어긋나 쓰기가 거절된" 일이었다. 알림
-- 장치를 똑같이 테이블 권한에 얹어 두면, 같은 종류의 실수가 났을 때
-- 알림까지 같이 막힌다. 경보가 화재와 같은 이유로 꺼지면 경보가 아니다.
--
-- security definer 함수는 함수 주인의 권한으로 돈다. RLS도 칸 권한도
-- 거치지 않는다. 그래서 이 길은 우리가 테이블 권한을 어떻게 건드려도
-- 살아 있다.

-- ── 1. 테이블 ───────────────────────────────────────────────
create table if not exists public.failures (
  id            uuid primary key default gen_random_uuid(),
  -- 처음 일어난 때와 가장 최근. 둘 다 있어야 "언제부터 지금까지"가 보인다.
  at            timestamptz not null default now(),
  last_at       timestamptz not null default now(),
  -- 같은 실패가 되풀이되면 줄을 늘리지 않고 센다. 한 사람이 다섯 번
  -- 눌렀다고 다섯 줄이 되면 종류가 몇 가지인지 안 보인다.
  hits          int not null default 1,
  place         text not null,   -- '문의 접수', '견적 요청 제출' …
  message       text not null,   -- 원문 그대로. 진단할 사람은 이것을 본다.
  profile_id    uuid references public.profiles(id) on delete set null,
  path          text,
  agent         text,
  email_sent_at timestamptz,
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles(id) on delete set null
);

create index if not exists failures_open_idx
  on public.failures (last_at desc) where resolved_at is null;

-- 아무도 직접 읽거나 쓰지 못한다. 정책을 하나도 두지 않은 채 RLS를 켜면
-- 그렇게 된다. 오가는 길은 아래 함수뿐이다.
alter table public.failures enable row level security;
revoke all on public.failures from anon, authenticated;

-- ── 2. 적는다 ───────────────────────────────────────────────
create or replace function public.log_failure(
  p_place   text,
  p_message text,
  p_path    text default null,
  p_agent   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_place   text := left(coalesce(nullif(trim(p_place), ''), '알 수 없는 곳'), 80);
  v_message text := left(coalesce(nullif(trim(p_message), ''), '(내용 없음)'), 1000);
  v_me      uuid := auth.uid();
  v_id      uuid;
begin
  -- 아무나 부를 수 있는 함수다. 내용도 부르는 쪽이 정한다. 그래서 들어오는
  -- 양에 천장을 둔다 — 이 자리를 두드려 표를 불릴 수 있으면 정작 봐야 할
  -- 실패가 그 아래 묻힌다. 한 시간에 200줄은 정상 운영에서 닿지 않는 수다.
  if (select count(*) from failures where at > now() - interval '1 hour') >= 200 then
    return null;
  end if;

  -- 이미 올라간 종류면 횟수만 올린다.
  --
  -- 처리했다고 표시한 줄은 건드리지 않는다. 고쳤다고 본 일이 또 났다면
  -- 그것은 새 소식이고, 새 줄로 올라가 메일도 다시 가야 한다.
  select id into v_id
  from failures
  where resolved_at is null
    and place = v_place
    and message = v_message
    and profile_id is not distinct from v_me
  order by last_at desc
  limit 1;

  if v_id is not null then
    update failures set hits = hits + 1, last_at = now() where id = v_id;
    -- null을 준다. 부르는 쪽은 이것을 보고 메일을 보내지 않는다.
    return null;
  end if;

  insert into failures (place, message, profile_id, path, agent)
  values (v_place, v_message, v_me,
          left(nullif(trim(coalesce(p_path, '')), ''), 200),
          left(nullif(trim(coalesce(p_agent, '')), ''), 200))
  returning id into v_id;

  return v_id;
end;
$$;

-- 로그인 전에도 실패한다. 비회원 문의, 가입, 비밀번호 재설정이 그렇다.
grant execute on function public.log_failure(text, text, text, text) to anon, authenticated;

-- ── 3. 운영자가 본다 ───────────────────────────────────────
create or replace function public.admin_list_failures()
returns table (
  id uuid, at timestamptz, last_at timestamptz, hits int,
  place text, message text, path text,
  member_code text, member_name text, company text,
  resolved_at timestamptz, resolved_by_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform admin_guard();
  return query
    select f.id, f.at, f.last_at, f.hits,
           f.place, f.message, f.path,
           p.member_code, p.name, c.name,
           f.resolved_at, d.name
    from failures f
    left join profiles p on p.id = f.profile_id
    left join companies c on c.id = p.company_id
    left join profiles d on d.id = f.resolved_by
    where f.at > now() - interval '90 days'
    -- 안 본 것이 위로. 그 안에서는 최근 순.
    order by (f.resolved_at is null) desc, f.last_at desc
    limit 500;
end;
$$;

grant execute on function public.admin_list_failures() to authenticated;

-- 처리했다고 표시한다. 되돌릴 수도 있어야 한다 — 잘못 눌러 영영 묻히면
-- 안 되고, 고친 줄 알았다가 아니었던 경우도 있다.
create or replace function public.admin_resolve_failure(
  p_id       uuid,
  p_resolved boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform admin_guard();
  update failures
  set resolved_at = case when p_resolved then now() end,
      resolved_by = case when p_resolved then auth.uid() end
  where id = p_id;
end;
$$;

grant execute on function public.admin_resolve_failure(uuid, boolean) to authenticated;

-- ── 4. 메일을 한 번만 보내게 ───────────────────────────────
-- 서버 라우트가 부른다. 클라이언트가 보낸 내용은 하나도 믿지 않고 id만
-- 받아 여기서 다시 읽는다.
--
-- 같은 자리에서 난 실패는 하루에 한 통이다. 한 자리가 망가지면 누르는
-- 사람마다 메일이 가고, 그러면 메일함이 막혀 다음에 다른 곳이 망가졌을 때
-- 그 한 통을 못 본다.
create or replace function public.claim_failure_email(p_id uuid)
returns table (place text, message text, path text, who text, hits int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_place text;
begin
  select f.place into v_place
  from failures f
  where f.id = p_id and f.email_sent_at is null;

  if v_place is null then
    return;   -- 없는 줄이거나 이미 보냈다.
  end if;

  -- f2로 별명을 붙인다. 별명 없이 place라고 쓰면 반환 칸 이름(returns
  -- table의 place)과 겹쳐 42702로 터진다. plpgsql은 본문을 만들 때
  -- 검사하지 않고 그 문장이 처음 돌 때 비로소 걸리므로, 적용 직후에는
  -- "Success"만 보이고 실제로 실패가 한 번 나야 드러난다(44단계).
  if exists (
    select 1 from failures f2
    where f2.place = v_place
      and f2.email_sent_at is not null
      and f2.email_sent_at > now() - interval '24 hours'
  ) then
    -- 하루 안에 같은 자리로 이미 보냈다. 보낸 것으로 찍어 두고 넘긴다 —
    -- 찍지 않으면 다음 실패마다 이 판단을 다시 하게 된다.
    update failures f3 set email_sent_at = now() where f3.id = p_id;
    return;
  end if;

  update failures f4 set email_sent_at = now() where f4.id = p_id;

  return query
    select f.place, f.message, f.path,
           coalesce(p.name || ' · ' || c.name, '비회원'),
           f.hits
    from failures f
    left join profiles p on p.id = f.profile_id
    left join companies c on c.id = p.company_id
    where f.id = p_id;
end;
$$;

-- 서비스 키로만 부른다. 일반 권한으로는 못 부르게 둔다 — 이 함수는
-- "보낸 것으로 찍는" 일을 하므로, 아무나 부르면 메일을 미리 소진시켜
-- 경보를 끌 수 있다.
--
-- public까지 같이 거둔다. 함수는 만들 때 PUBLIC에 execute가 열리므로,
-- anon·authenticated만 거둬도 PUBLIC을 타고 그대로 부를 수 있다.
revoke execute on function public.claim_failure_email(uuid) from public, anon, authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- 아직 처리하지 않은 실패:
--   select place, hits, last_at, left(message, 80) from failures
--   where resolved_at is null order by last_at desc;
