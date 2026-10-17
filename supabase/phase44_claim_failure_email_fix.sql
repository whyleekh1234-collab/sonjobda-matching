-- 손잡다매칭 44단계: 실패 알림 메일이 아예 안 가던 것을 고친다
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다. 43단계 다음에 돌린다.
--
-- 43단계의 claim_failure_email이 호출마다 터졌다.
--
--   42702: column reference "place" is ambiguous
--   It could refer to either a PL/pgSQL variable or a table column.
--
-- returns table (place text, ...)로 적은 이름은 함수 안에서 변수가 된다.
-- 그 안에서 failures 테이블을 테이블 이름 없이 참조하면 Postgres는 같은
-- 이름의 변수와 칸 중 무엇인지 고르지 못한다.
--
--   where place = v_place          ← 이 place가 변수인지 칸인지 모른다
--
-- 아래 두 군데만 다르다. 테이블에 별명을 붙여 칸임을 분명히 한다.
--
-- ── 왜 배포 직후에 못 걸렀나 ───────────────────────────────
--
-- plpgsql은 함수 본문을 만들 때 검사하지 않는다. 문장마다 처음 실행될 때
-- 계획을 세우고, 그때 비로소 이런 모호함이 드러난다. 그래서 SQL을 적용한
-- 직후에는 "Success"만 보이고, 실제로 실패가 한 번 나야 메일 쪽이
-- 터진다 — 알림 장치가 조용히 죽어 있는 꼴이다.
--
-- 그래서 적용하고 끝내지 않고 부르는 것까지 확인했다. 이 한 가지는 더
-- 그래야 했다. 이것이 못 울리면 다른 모든 것을 못 울린다.
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

  -- 같은 자리에서 난 실패는 하루에 한 통이다. 한 자리가 망가지면 누르는
  -- 사람마다 메일이 가고, 그러면 메일함이 막혀 다음에 다른 곳이 망가졌을
  -- 때 그 한 통을 못 본다.
  --
  -- f2로 별명을 붙인다. 별명 없이 place라고 쓰면 반환 칸 이름과 겹친다.
  if exists (
    select 1 from failures f2
    where f2.place = v_place
      and f2.email_sent_at is not null
      and f2.email_sent_at > now() - interval '24 hours'
  ) then
    -- 보낸 것으로 찍어 두고 넘긴다 — 찍지 않으면 다음 실패마다 이 판단을
    -- 다시 하게 된다.
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

-- 함수는 만들 때 PUBLIC에 execute가 열린다. create or replace로 다시
-- 만들었으니 다시 거둔다 — 이 함수는 "보낸 것으로 찍는" 일을 하므로,
-- 아무나 부르면 메일을 미리 소진시켜 경보를 끌 수 있다.
revoke execute on function public.claim_failure_email(uuid) from public, anon, authenticated;
