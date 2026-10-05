-- 35단계: 답변이 운영자에게 반드시 닿게 한다
--
-- phase33이 "회원이 답하면 보낸 사람에게 알린다"를 넣었다. 그런데 보낸
-- 사람이 누구인지는 from_profile_id에 들어 있고, 지금까지 쌓인 알림은
-- 그 칸이 전부 비어 있다. 알림 발송(admin_send_notification)이 그 값을
-- 넣지 않았기 때문이다.
--
-- 그래서 답변이 와도 알릴 곳을 몰라 아무 일도 일어나지 않았다. 통지를
-- 보내 놓고 답을 못 보면 회원은 기다리고 제한은 그대로 남는다.
--
-- 두 군데를 고친다.
--   1. 알림 발송이 보낸 사람을 남긴다
--   2. 보낸 사람이 없는 알림에 답이 달리면 운영자 전원에게 알린다
--
-- 2가 필요한 이유는, 이미 쌓인 알림과 시스템이 만든 알림(매칭 성사,
-- 회사정보 변경 요청)에는 보낸 사람이 없기 때문이다. 거기 달린 답을
-- 버릴 수는 없다. 운영자가 여럿이면 모두에게 가지만, 알림은 지나치는
-- 것보다 겹치는 편이 낫다.

-- ── 1. 알림 발송이 보낸 사람을 남긴다 ──────────────────────
-- 반환 타입은 원래대로 notifications 행이다. 바꾸면 Postgres가 거부하고,
-- 지웠다 다시 만들면 그 사이 알림 발송이 멈춘다.
create or replace function public.admin_send_notification(
  p_profile_id uuid, p_message text
) returns notifications
language plpgsql security definer set search_path = public as $$
declare v_notif notifications;
begin
  perform admin_guard();

  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '알림 내용을 입력해주세요.';
  end if;

  if not exists (select 1 from profiles where id = p_profile_id) then
    raise exception '받는 회원을 찾을 수 없습니다.';
  end if;

  -- 보낸 사람을 남긴다. 회원이 답하면 이 사람에게 알림이 간다(phase33).
  insert into notifications (profile_id, from_profile_id, message, link)
  values (p_profile_id, auth.uid(), p_message, '/notifications')
  returning * into v_notif;

  return v_notif;
end;
$$;
grant execute on function public.admin_send_notification to authenticated;

-- ── 2. 보낸 사람이 없으면 운영자 전원에게 ──────────────────
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
begin
  select * into v_notif from notifications where id = p_notification_id;
  if v_notif.id is null or v_notif.profile_id <> auth.uid() then
    raise exception '내 알림이 아닙니다.';
  end if;
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '답변 내용을 입력해주세요.';
  end if;

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
    insert into notifications (profile_id, from_profile_id, message, link)
    values (v_notif.from_profile_id, auth.uid(), v_text, '/admin');
  else
    -- 보낸 사람이 없는 알림(예전 것, 시스템이 만든 것)에 달린 답은
    -- 운영자 전원에게 보낸다. 받을 사람을 모른다고 버릴 수는 없다.
    insert into notifications (profile_id, from_profile_id, message, link)
    select p.id, auth.uid(), v_text, '/admin'
    from profiles p
    where p.is_platform_admin and p.id <> auth.uid();
  end if;

  return v_notif;
end;
$$;
grant execute on function public.reply_to_notification to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select profile_id, from_profile_id, left(message, 40) from notifications
-- order by created_at desc limit 5;
