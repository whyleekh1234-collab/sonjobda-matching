-- 손잡다매칭 17단계: 1차 선정 (여러 곳) → 최종 매칭 (한 곳)
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 지금까지는 "견적 수락" 한 번에 매칭이 확정되고 연락처가 열렸다. 그래서
-- 의뢰사가 여러 곳을 놓고 조건을 조율할 방법이 없었다. 단계를 하나 넣는다.
--
--   1차 선정 (여러 곳, 최대 3곳)  ─ 연락처는 열리지 않는다
--      · 파트너사에 알림이 가고, 그 파트너는 견적을 다시 고칠 수 있다
--      · 의뢰사는 언제든 선정을 해제할 수 있다
--   최종 매칭 (한 곳)             ─ 이때만 연락처가 열린다
--
-- 연락처를 미리 열면 플랫폼 밖에서 직접 거래해버려 매칭이 기록되지 않는다.
-- 그래서 1차 선정 단계에서는 끝까지 서로를 모른 채 조건만 주고받는다.
--
-- 상태(enum)를 늘리지 않고 별도 컬럼을 쓴다. 상태로 만들면 파트너가 견적을
-- 수정할 때 status가 덮여 1차 선정이 풀려버린다.

alter table quotes add column if not exists shortlisted_at timestamptz;

comment on column quotes.shortlisted_at is
  '의뢰사가 1차 선정한 시각. null이면 선정 안 됨. 연락처는 여전히 비공개이고, 최종 매칭(accept_quote) 때만 열린다.';

-- ── 의뢰사: 1차 선정 / 해제 ─────────────────────────────────
create or replace function public.shortlist_quote(p_quote_id uuid, p_on boolean)
returns quotes
language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid := current_company_id();
  v_quote      quotes;
  v_request    requests;
  v_count      int;
  v_member     uuid;
begin
  select q.* into v_quote
  from quotes q join requests r on r.id = q.request_id
  where q.id = p_quote_id and r.company_id = v_company_id;

  if v_quote.id is null then
    raise exception '내 의뢰에 달린 견적이 아닙니다.';
  end if;

  select * into v_request from requests where id = v_quote.request_id;
  if v_request.status <> 'pending' then
    raise exception '이미 마감된 의뢰입니다.';
  end if;

  if p_on then
    if v_quote.shortlisted_at is not null then
      return v_quote;   -- 이미 선정됨. 조용히 넘어간다.
    end if;

    select count(*) into v_count
    from quotes where request_id = v_quote.request_id and shortlisted_at is not null;
    if v_count >= 3 then
      raise exception '1차 선정은 최대 3곳까지 가능합니다. 다른 곳을 해제한 뒤 선택해주세요.';
    end if;

    update quotes set shortlisted_at = now()
    where id = p_quote_id returning * into v_quote;

    -- 선정된 파트너사에 알린다. 의뢰사가 누구인지는 아직 밝히지 않는다.
    for v_member in
      select p.id from profiles p
      where p.company_id = v_quote.company_id and p.status = 'approved'
    loop
      insert into notifications (profile_id, message, link)
      values (
        v_member,
        format('[1차 선정] "%s" 의뢰의 1차 선정 대상이 되었습니다. 조건을 보완해 다시 제출하실 수 있습니다. 최종 선정 시 의뢰사 연락처가 공개됩니다.',
               v_request.title),
        '/dashboard/partner'
      );
    end loop;
  else
    update quotes set shortlisted_at = null
    where id = p_quote_id returning * into v_quote;
  end if;

  return v_quote;
end;
$$;

grant execute on function public.shortlist_quote to authenticated;

-- ── 파트너: 1차 선정된 견적은 다시 고칠 수 있다 ──────────────
-- 원래는 의뢰사가 열람한 뒤에는 잠겼다. 1차 선정은 "조건을 다시 내보라"는
-- 신호이므로 그때는 잠금을 푼다.
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
language plpgsql security definer set search_path = public
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

  select * into v_quote
  from quotes where request_id = p_request_id and company_id = v_company_id;

  -- 의뢰사가 확인한 뒤에는 손댈 수 없다. 단, 1차 선정된 견적은 예외다.
  if v_quote.id is not null
     and v_quote.shortlisted_at is null
     and v_quote.status in ('client_reviewing', 'accepted', 'client_rejected',
                            'client_hold', 'not_selected') then
    raise exception '의뢰사가 확인한 견적은 수정할 수 없습니다.';
  end if;
  if v_quote.id is not null and v_quote.status = 'accepted' then
    raise exception '이미 최종 선정된 견적은 수정할 수 없습니다.';
  end if;

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
    attachment_path = coalesce(excluded.attachment_path, quotes.attachment_path),
    attachment_name = coalesce(excluded.attachment_name, quotes.attachment_name),
    status          = excluded.status
  returning * into v_quote;

  return v_quote;
end;
$$;

grant execute on function public.upsert_my_quote to authenticated;

-- ── 확인 ─────────────────────────────────────────────────────
-- select quote_code, status, shortlisted_at from quotes order by created_at desc limit 5;
