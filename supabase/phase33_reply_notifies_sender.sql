-- 33단계: 회원이 답변하면 보낸 운영자에게 알린다
--
-- 운영자가 답하면 회원에게 알림이 간다(phase5의 admin_reply_notification).
-- 그런데 반대 방향이 빠져 있었다. 회원이 답변을 달아도 그 글이 알림 행의
-- replies에 덧붙을 뿐, 운영자에게는 아무 표시가 없다.
--
-- 서류를 보완해 달라고 통지해 놓고 "수정하였습니다"라는 답을 못 보면,
-- 회원은 기다리고 운영자는 모른 채 제한이 유지된다. 통지를 보낸 쪽이
-- 답을 받았다는 사실을 알아야 그 일이 끝난다.
--
-- 알림이 누구에게서 왔는지는 from_profile_id에 들어 있다. 운영자가 보낸
-- 알림에만 그 값이 있으므로, 없으면(시스템이 만든 알림) 보내지 않는다.

create or replace function public.reply_to_notification(
  p_notification_id uuid,
  p_message         text
) returns notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notif notifications;
  v_me    profiles;
  v_company text;
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

  -- 보낸 사람에게 알린다. 자기 자신에게는 보내지 않는다.
  if v_notif.from_profile_id is not null and v_notif.from_profile_id <> auth.uid() then
    insert into notifications (profile_id, from_profile_id, message, link)
    values (
      v_notif.from_profile_id,
      auth.uid(),
      format('[답변] %s %s · %s', coalesce(v_company, ''), v_me.name, trim(p_message)),
      '/admin'
    );
  end if;

  return v_notif;
end;
$$;
grant execute on function public.reply_to_notification to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select message, profile_id, from_profile_id, created_at
-- from notifications order by created_at desc limit 5;
