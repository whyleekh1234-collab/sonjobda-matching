-- 47단계: 의뢰가 올라오면 그 분야 파트너사에게 알린다
--
-- 지금은 아무 일도 일어나지 않는다. 앱 안 알림조차 없다. 파트너사는
-- 직접 로그인해서 「받은 의뢰」를 열어봐야만 새 의뢰가 있는 줄 안다.
--
-- 그래서 이런 일이 생긴다. 마케팅 대행 의뢰 세 건이 28일째 견적 0건인데,
-- 그 분야 파트너사는 한 곳뿐이다. 안 낸 것인지 모르는 것인지 알 길이
-- 없다 — 알릴 방법 자체가 없었으니 후자일 가능성이 크다.
--
-- 매칭 플랫폼에서 "일이 들어왔다"를 알리지 않는 것은, 전화가 와도 벨이
-- 울리지 않는 것과 같다.
--
-- 메일은 여기서 못 보낸다(함수 안에서 네트워크를 쓸 수 없다). 앱 안
-- 알림만 여기서 만들고, 메일은 /api/notify/request가 맡는다. 둘을 나눠
-- 두면 메일이 실패해도 알림은 남는다.

create or replace function public.notify_partners_of_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 승인된 회원에게만 보낸다. 승인 전에는 견적을 낼 수 없으므로
  -- 알려 봐야 열고 돌아설 뿐이다.
  --
  -- 의뢰를 올린 회사는 뺀다. 한 회사가 의뢰사이면서 다른 분야의
  -- 파트너사일 수 있는데, 제 의뢰를 제가 받는 알림은 쓸모가 없다.
  --
  -- 의뢰사 회사명은 적지 않는다. 최종 매칭 전까지 공개되지 않는
  -- 정보다 — 알림이 그 구멍이 되면 안 된다.
  insert into notifications (profile_id, message, link)
  select p.id,
         '새 의뢰가 올라왔습니다 — [' || new.category || '] ' || new.title,
         '/dashboard/partner'
  from profiles p
  where p.status = 'approved'
    and p.company_id <> new.company_id
    and new.category = any (p.partner_categories);

  return new;
end;
$$;

-- 트리거로만 돈다. 아무나 직접 부를 수 있으면 남에게 알림을 꽂을 수
-- 있다. 함수는 기본으로 PUBLIC에 실행 권한이 붙으므로 public까지 뗀다.
revoke execute on function public.notify_partners_of_request() from public, anon, authenticated;

drop trigger if exists requests_notify_partners on public.requests;
create trigger requests_notify_partners
  after insert on public.requests
  for each row execute function public.notify_partners_of_request();

-- ── 확인 ────────────────────────────────────────────────────
-- 적용한 뒤 실제로 의뢰를 하나 넣어 봐야 한다. "Success"는 함수가 돈다는
-- 뜻이 아니다(43단계).
--
-- 분야별로 알림을 받을 사람이 몇 명인지:
--
--   select unnest(p.partner_categories) as 분야, count(*) as 인원
--     from profiles p
--    where p.status = 'approved'
--    group by 1 order by 2 desc;
--
-- 트리거가 붙었는지:
--
--   select tgname from pg_trigger
--    where tgrelid = 'public.requests'::regclass and not tgisinternal;
