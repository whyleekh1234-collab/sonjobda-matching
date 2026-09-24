-- 손잡다매칭 15단계: 매칭 성사 알림
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 지금까지 의뢰사가 견적을 수락해도 파트너사에게 아무 알림이 가지 않았다.
-- 파트너사는 자기 대시보드에 들어와야 수주 사실을 알 수 있었고, 며칠 뒤에나
-- 확인하는 일이 생긴다. 수락과 같은 트랜잭션에서 알림을 남긴다.
--
--   - 수락된 파트너사 소속 회원 전원  → "견적이 수락되었습니다"
--   - 선정되지 않은 파트너사 회원 전원 → "다른 파트너사가 선정되었습니다"
--   - 의뢰사 본인은 자기가 누른 행동이라 알림을 남기지 않는다.
--
-- 알림은 회사 단위로 보낸다. 견적을 낸 담당자가 자리에 없어도 같은 회사
-- 동료가 본다.

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
  v_client     text;
  v_member     uuid;
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

  -- ── 알림 ────────────────────────────────────────────────
  -- 의뢰사명은 매칭된 상대에게만 열린다. 선정되지 않은 파트너사에게는
  -- 회사명을 쓰지 않는다(매칭 전과 같은 수준으로 가린다).
  select name into v_client from companies where id = v_request.company_id;

  -- 수락된 파트너사
  for v_member in
    select p.id from profiles p
    where p.company_id = v_quote.company_id and p.status = 'approved'
  loop
    insert into notifications (profile_id, message, link)
    values (
      v_member,
      format('[매칭 성사] "%s" 견적이 수락되었습니다. 의뢰사 %s의 담당자 연락처가 공개되었습니다. (매칭번호 %s)',
             v_request.title, v_client, v_request.match_code),
      '/dashboard/partner'
    );
  end loop;

  -- 선정되지 않은 파트너사
  for v_member in
    select distinct p.id
    from quotes q
    join profiles p on p.company_id = q.company_id
    where q.request_id = v_request.id
      and q.id <> p_quote_id
      and q.status = 'not_selected'
      and p.status = 'approved'
  loop
    insert into notifications (profile_id, message, link)
    values (
      v_member,
      format('[매칭 결과] "%s" 의뢰는 다른 파트너사가 선정되었습니다. 참여해 주셔서 감사합니다.',
             v_request.title),
      '/dashboard/partner'
    );
  end loop;

  return v_request;
end;
$$;

grant execute on function public.accept_quote to authenticated;

-- ── 실행 후 확인 ─────────────────────────────────────────────
-- 견적을 수락한 뒤 파트너사 계정으로 /notifications 에서 알림이 보이면 된다.
