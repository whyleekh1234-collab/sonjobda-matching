-- 손잡다매칭 38단계: 알림을 대화 단위로 묶기
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 지금 답변은 두 군데에 생긴다. 하나는 원래 알림 안(replies jsonb)이고,
-- 다른 하나는 "답변이 왔다"고 알리려고 만드는 새 알림 행이다. 뒤엣것이
-- 없으면 운영자는 답변이 달린 줄을 모른다.
--
-- 그런데 관리자 알림 목록은 행을 그대로 늘어놓는다. 그래서 한 번 주고받은
-- 대화가 번호가 다른 두 줄로 보인다 — 제재를 보낸 줄과, 그에 대한 답변이
-- 왔다는 줄. 운영자 눈에는 서로 남인 것처럼 보인다.
--
-- 행을 없애지는 않는다. 읽음 표시와 알림 개수가 그 행에 달려 있다.
-- 대신 "어느 알림에 달린 답인지"를 적어 두고, 화면에서 묶어 보여준다.

alter table public.notifications
  add column if not exists reply_to_id uuid references public.notifications(id) on delete cascade;

comment on column public.notifications.reply_to_id is
  '이 알림이 어느 알림에 달린 답변 통지인지. 원본은 null. 화면에서 대화 단위로 묶는 데 쓴다.';

create index if not exists notifications_reply_to_idx
  on public.notifications (reply_to_id) where reply_to_id is not null;

-- ── 앞으로 만들어지는 것 ────────────────────────────────────
create or replace function public.reply_to_notification(
  p_notification_id uuid,
  p_message         text
) returns notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notif   notifications;
  v_me      profiles;
  v_company text;
  v_text    text;
  -- 답변 통지는 "원본"에 매단다. 답변 통지에 또 답변이 달리면 그 답변
  -- 통지도 같은 원본에 매달아야 대화가 한 줄로 이어진다. 통지에 통지를
  -- 매달면 묶음이 나무처럼 깊어져서 화면에서 펼 수가 없다.
  v_root    uuid;
begin
  select * into v_notif from notifications where id = p_notification_id;
  if v_notif.id is null or v_notif.profile_id <> auth.uid() then
    raise exception '내 알림이 아닙니다.';
  end if;
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '답변 내용을 입력해주세요.';
  end if;

  v_root := coalesce(v_notif.reply_to_id, v_notif.id);

  select * into v_me from profiles where id = auth.uid();
  select name into v_company from companies where id = v_me.company_id;

  update notifications set replies = replies || jsonb_build_object(
    'from',      v_me.name,
    'company',   v_company,
    'message',   p_message,
    'createdAt', now()
  )
  where id = p_notification_id
  returning * into v_notif;

  v_text := format('[답변] %s %s · %s', coalesce(v_company, ''), v_me.name, trim(p_message));

  if v_notif.from_profile_id is not null and v_notif.from_profile_id <> auth.uid() then
    -- 보낸 사람이 분명하면 그 사람에게만.
    insert into notifications (profile_id, from_profile_id, message, link, reply_to_id)
    values (v_notif.from_profile_id, auth.uid(), v_text, '/admin', v_root);
  else
    -- 보낸 사람이 없는 알림(예전 것, 시스템이 만든 것)에 달린 답은
    -- 운영자 전원에게 보낸다. 받을 사람을 모른다고 버릴 수는 없다.
    insert into notifications (profile_id, from_profile_id, message, link, reply_to_id)
    select p.id, auth.uid(), v_text, '/admin', v_root
    from profiles p
    where p.is_platform_admin and p.id <> auth.uid();
  end if;

  return v_notif;
end;
$$;
grant execute on function public.reply_to_notification to authenticated;

-- ── 이미 쌓인 것 ────────────────────────────────────────────
-- 기존 답변 통지에는 매달 곳이 적혀 있지 않다. 추측으로 잇는다.
--
-- 근거는 둘이다. 하나, 답변 통지는 message가 '[답변] '으로 시작한다.
-- 둘, 답변을 보낸 사람(from_profile_id)은 원본을 받은 사람(profile_id)이다.
-- 이 둘이 맞는 알림 중 답변 통지보다 먼저 생기고 실제로 replies가 달린
-- 가장 최근 것에 매단다.
--
-- 틀리게 이어질 수 있지만 그 피해는 "화면에서 엉뚱하게 묶여 보이는 것"이고,
-- 알림 내용이나 읽음 상태는 건드리지 않는다. 이미 이어진 것은 두고,
-- 못 찾으면 그대로 혼자 남는다.
update notifications r
set reply_to_id = p.id
from lateral (
  select n.id
  from notifications n
  where n.profile_id = r.from_profile_id
    and n.created_at < r.created_at
    and jsonb_array_length(n.replies) > 0
    and n.id <> r.id
  order by n.created_at desc
  limit 1
) p
where r.reply_to_id is null
  and r.from_profile_id is not null
  and r.message like '[답변]%';

-- ── 확인 ────────────────────────────────────────────────────
-- select notif_code, left(message, 30) as msg, reply_to_id is not null as 답변통지
--   from notifications order by created_at;
