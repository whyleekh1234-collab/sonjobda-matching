-- 손잡다매칭 39단계: 대화는 원본 하나에 쌓인다
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다. 38단계 다음에 돌린다.
--
-- 38단계에서 답변 통지를 원본에 매달았는데, 두 군데가 빠져 있었다.
--
-- 하나. 운영자가 답하는 함수(admin_reply_notification)는 38단계에서 손대지
-- 않았다. 그래서 운영자가 대화 안에서 답을 달면 매달 곳이 없는 알림이
-- 새로 생기고, 목록에 또 한 줄로 선다. 고치려던 그 증상이 그대로 났다.
--
-- 둘. 답변을 "누른 줄"에 쌓고 있었다. 운영자는 답변 통지(45번)를 보며
-- 답하므로 그 답은 45번 안에 들어가고, 화면은 원본(38번)의 답변 목록을
-- 그리니 운영자 자신이 쓴 답이 어디에도 보이지 않는다.
--
-- 둘 다 "원본 하나에 쌓는다"로 맞춘다. 한 대화의 기록은 한 곳에 있어야
-- 한다. 흩어 두면 화면이 어느 쪽을 그릴지 매번 골라야 하고, 고르는 순간
-- 한쪽은 안 보인다.

-- ── 회원이 답할 때 ──────────────────────────────────────────
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
  v_root    notifications;
  v_me      profiles;
  v_company text;
  v_text    text;
begin
  select * into v_notif from notifications where id = p_notification_id;
  if v_notif.id is null or v_notif.profile_id <> auth.uid() then
    raise exception '내 알림이 아닙니다.';
  end if;
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '답변 내용을 입력해주세요.';
  end if;

  -- 누른 줄이 답변 통지면 그 원본에, 아니면 자기 자신에.
  select * into v_root
  from notifications
  where id = coalesce(v_notif.reply_to_id, v_notif.id);

  select * into v_me from profiles where id = auth.uid();
  select name into v_company from companies where id = v_me.company_id;

  update notifications set replies = replies || jsonb_build_object(
    'from',      v_me.name,
    'company',   v_company,
    'message',   p_message,
    'createdAt', now()
  )
  where id = v_root.id;

  v_text := format('[답변] %s %s · %s', coalesce(v_company, ''), v_me.name, trim(p_message));

  -- 알릴 상대는 "누른 줄"을 보낸 사람이다. 원본을 보낸 사람이 아니다 —
  -- 운영자가 답한 통지에 다시 답하면 그 운영자에게 가야 한다.
  if v_notif.from_profile_id is not null and v_notif.from_profile_id <> auth.uid() then
    insert into notifications (profile_id, from_profile_id, message, link, reply_to_id)
    values (v_notif.from_profile_id, auth.uid(), v_text, '/admin', v_root.id);
  else
    -- 보낸 사람이 없는 알림(예전 것, 시스템이 만든 것)에 달린 답은
    -- 운영자 전원에게 보낸다. 받을 사람을 모른다고 버릴 수는 없다.
    insert into notifications (profile_id, from_profile_id, message, link, reply_to_id)
    select p.id, auth.uid(), v_text, '/admin', v_root.id
    from profiles p
    where p.is_platform_admin and p.id <> auth.uid();
  end if;

  select * into v_notif from notifications where id = v_root.id;
  return v_notif;
end;
$$;
grant execute on function public.reply_to_notification to authenticated;

-- ── 운영자가 답할 때 ────────────────────────────────────────
create or replace function public.admin_reply_notification(
  p_notification_id uuid, p_message text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_notif notifications;
  v_root  uuid;
begin
  perform admin_guard();
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '답변 내용을 입력해주세요.';
  end if;

  select * into v_notif from notifications where id = p_notification_id;
  if v_notif.id is null then
    raise exception '알림을 찾을 수 없습니다.';
  end if;

  v_root := coalesce(v_notif.reply_to_id, v_notif.id);

  update notifications set replies = replies || jsonb_build_object(
    'from', '관리자', 'company', '손잡다매칭',
    'message', p_message, 'createdAt', now()
  )
  where id = v_root;

  -- 상대에게 알린다. 매달 곳을 적어야 목록에서 한 줄로 묶인다 —
  -- 이것이 빠져서 운영자 답변마다 새 줄이 생겼다.
  if v_notif.from_profile_id is not null then
    insert into notifications (profile_id, from_profile_id, message, link, reply_to_id)
    values (v_notif.from_profile_id, auth.uid(),
            '[관리자 답변] ' || p_message, '/notifications', v_root);
  end if;
end;
$$;
grant execute on function public.admin_reply_notification to authenticated;

-- ── 이미 흩어진 것을 원본으로 모은다 ────────────────────────
-- 답변 통지 안에 쌓인 답들을 원본으로 옮기고, 옮긴 쪽은 비운다.
-- 시간순으로 다시 세워야 대화가 뒤섞이지 않는다.
with moved as (
  select
    c.reply_to_id as root_id,
    jsonb_agg(r.value order by (r.value->>'createdAt')) as items
  from notifications c
  cross join lateral jsonb_array_elements(c.replies) as r(value)
  where c.reply_to_id is not null
    and jsonb_array_length(c.replies) > 0
  group by c.reply_to_id
)
update notifications n
set replies = (
  select jsonb_agg(v order by (v->>'createdAt'))
  from jsonb_array_elements(n.replies || moved.items) as t(v)
)
from moved
where n.id = moved.root_id;

update notifications
set replies = '[]'::jsonb
where reply_to_id is not null
  and jsonb_array_length(replies) > 0;

-- ── 매달 곳이 없는 운영자 답변 통지를 잇는다 ────────────────
-- 38단계 백필은 '[답변]'만 봤다. 운영자 답변은 '[관리자 답변]'으로
-- 시작해서 걸리지 않았다. 보낸 사람이 운영자이고 받는 사람이 원본을
-- 받은 사람인 것을 근거로 잇는다.
update notifications r
set reply_to_id = (
  select n.id
  from notifications n
  where n.profile_id = r.profile_id
    and n.reply_to_id is null
    and n.created_at < r.created_at
    and n.id <> r.id
  order by n.created_at desc
  limit 1
)
where r.reply_to_id is null
  and r.message like '[관리자 답변]%';

-- ── 확인 ────────────────────────────────────────────────────
-- select notif_code, left(message, 32) as msg,
--        reply_to_id is not null as 답변통지, jsonb_array_length(replies) as 답변수
--   from notifications order by created_at;
