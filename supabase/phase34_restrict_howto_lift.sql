-- 34단계: 제한 통지에 "풀리는 방법"을 적는다
--
-- 지금 통지는 무엇이 문제인지는 알려주지만, 고친 뒤에 어떻게 해야 하는지는
-- 말하지 않는다. 받는 쪽은 등록증을 다시 올려놓고도 운영자가 알아서 볼
-- 때까지 기다린다. 운영자는 올라온 줄 모르고, 제한은 그대로 남는다.
--
-- 답변 기능이 있고(phase33) 그 답이 운영자에게 가므로, 그 길을 안내한다.
--
-- 이용 제한에만 넣는다. 경고는 풀 것이 없고, 정지는 답변으로 풀리는
-- 조치가 아니다 — 누적 3회에 이른 상태라 이의 제기 절차를 거쳐야 한다.

create or replace function public.admin_sanction(
  p_profile_id uuid,
  p_kind       sanction_kind,
  p_reason     text,
  p_inquiry_id uuid default null,
  p_detail     text default null
)
returns table (sanction_count int, member_status text)
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_name    text;
  v_count   int;
  v_status  text;
  v_label   text;
  v_detail  text := nullif(trim(coalesce(p_detail, '')), '');
  v_howto   text := '';
begin
  perform admin_guard();

  if coalesce(trim(p_reason), '') = '' then
    raise exception '사유를 선택해주세요.';
  end if;

  select company_id, name into v_company, v_name
  from profiles where id = p_profile_id;
  if v_company is null then
    raise exception '해당 회원을 찾을 수 없습니다.';
  end if;

  insert into sanctions (profile_id, company_id, kind, reason, detail, inquiry_id, decided_by)
  values (p_profile_id, v_company, p_kind, trim(p_reason), v_detail, p_inquiry_id, auth.uid());

  if p_kind = 'warning' then
    v_label := '경고';
  elsif p_kind = 'restrict' then
    update profiles set status = 'restricted' where id = p_profile_id;
    v_label := '이용 제한';
    v_howto := E'\n\n조치를 마치신 뒤 이 알림에 답변을 남겨주시면, 확인 후 제한을 해제해 드립니다.';
  elsif p_kind = 'suspend' then
    update profiles set status = 'suspended' where id = p_profile_id;
    v_label := '이용 정지';
  else
    v_label := null;
  end if;

  if v_label is not null then
    insert into notifications (profile_id, from_profile_id, message, link)
    values (
      p_profile_id,
      -- 보낸 사람을 남긴다. 회원이 답변하면 그 사람에게 알림이 간다(phase33).
      auth.uid(),
      format('[%s] %s', v_label, trim(p_reason))
        || case when v_detail is null then '' else E'\n\n' || v_detail end
        || v_howto
        || E'\n\n이의가 있으시면 통지일로부터 7일 이내에 고객센터(contact@sonjobdamd.com)로 알려주세요.',
      '/notifications'
    );
  end if;

  select count(*) into v_count
  from sanctions where profile_id = p_profile_id and kind <> 'dismiss';

  select status::text into v_status from profiles where id = p_profile_id;

  return query select v_count, v_status;
end;
$$;
grant execute on function public.admin_sanction to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select message from notifications order by created_at desc limit 3;
