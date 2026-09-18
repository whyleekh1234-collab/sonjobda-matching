-- 손잡다매칭 5단계: 관리자 화면
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 왜 service_role 키와 서버 라우트를 쓰지 않는가:
--   1단계 스키마에 이미 is_platform_admin() 정책이 깔려 있어 운영자는
--   지금도 모든 회사의 데이터를 읽을 수 있다. 막힌 건 쓰기뿐인데, 그건
--   2~4단계에서 컬럼 단위로 잠갔기 때문이다.
--   서버 라우트로 가도 그 안에서 "이 사람이 운영자인가"를 똑같이 확인해야
--   한다. 확인하는 위치만 달라지고 전권 키를 하나 더 관리하게 된다.
--   같은 보안 수준이면 키가 없는 쪽이 낫다.

-- ════════════════════════════════════════════════════════════
-- 1. 화면이 쓰는데 스키마에 없던 컬럼
-- ════════════════════════════════════════════════════════════

alter table profiles add column if not exists verified           boolean not null default false;
alter table profiles add column if not exists allow_category_edit boolean not null default false;

-- 알림 고유번호(NF-). 다른 번호들과 마찬가지로 시퀀스가 붙인다.
create sequence if not exists notif_code_seq start 1;
alter table notifications add column if not exists notif_code text
  default 'NF-' || lpad(nextval('notif_code_seq')::text, 8, '0');

-- ════════════════════════════════════════════════════════════
-- 2. 운영자 확인을 거치는 쓰기 함수들
-- ════════════════════════════════════════════════════════════

create or replace function public.admin_guard()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception '운영자 권한이 필요합니다.';
  end if;
end;
$$;

-- 회원 목록. 이메일은 auth.users에 있어 일반 조회로는 못 읽는다.
create or replace function public.admin_list_users()
returns table (
  id uuid, member_code text, name text, email text, phone text,
  company text, business_number text, address text,
  roles text[], active_role text, partner_categories text[],
  status text, is_company_admin boolean, is_platform_admin boolean,
  verified boolean, allow_category_edit boolean, created_at timestamptz
)
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform admin_guard();
  return query
    select p.id, p.member_code, p.name, u.email::text, p.phone,
           c.name, c.business_number, c.address,
           p.roles, p.active_role, p.partner_categories,
           p.status::text, p.is_company_admin, p.is_platform_admin,
           p.verified, p.allow_category_edit, p.created_at
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

-- 회원 정보 변경. null로 넘긴 항목은 건드리지 않는다.
create or replace function public.admin_update_user(
  p_target              uuid,
  p_status              user_status default null,
  p_verified            boolean     default null,
  p_allow_category_edit boolean     default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  update profiles set
    status              = coalesce(p_status, status),
    verified            = coalesce(p_verified, verified),
    allow_category_edit = coalesce(p_allow_category_edit, allow_category_edit)
  where id = p_target;
end;
$$;

-- 회원 삭제. auth.users를 지우면 profiles가 따라 지워진다.
create or replace function public.admin_delete_user(p_target uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  perform admin_guard();
  if p_target = auth.uid() then
    raise exception '본인 계정은 여기서 지울 수 없습니다.';
  end if;
  delete from auth.users where id = p_target;
end;
$$;

-- 문의 답변. 작성자는 서버가 붙인다.
create or replace function public.admin_reply_inquiry(p_inquiry_id uuid, p_message text)
returns inquiries
language plpgsql security definer set search_path = public as $$
declare v_inq inquiries;
begin
  perform admin_guard();
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '답변 내용을 입력해주세요.';
  end if;

  update inquiries set
    replies = replies || jsonb_build_object(
      'from', '관리자', 'message', p_message, 'createdAt', now()
    ),
    status     = 'replied',
    replied_at = now()
  where id = p_inquiry_id
  returning * into v_inq;

  if v_inq.id is null then
    raise exception '문의를 찾을 수 없습니다.';
  end if;
  return v_inq;
end;
$$;

-- 답변 수정/삭제. p_message가 null이면 삭제한다.
create or replace function public.admin_edit_inquiry_reply(
  p_inquiry_id uuid, p_index int, p_message text
) returns inquiries
language plpgsql security definer set search_path = public as $$
declare v_inq inquiries;
begin
  perform admin_guard();
  select * into v_inq from inquiries where id = p_inquiry_id;
  if v_inq.id is null then
    raise exception '문의를 찾을 수 없습니다.';
  end if;
  if jsonb_array_length(v_inq.replies) <= p_index or p_index < 0 then
    raise exception '없는 답변입니다.';
  end if;

  update inquiries set
    replies = case
      when p_message is null then replies - p_index
      else jsonb_set(replies, array[p_index::text, 'message'], to_jsonb(p_message))
    end
  where id = p_inquiry_id
  returning * into v_inq;

  -- 답변이 하나도 안 남으면 처리 상태를 되돌린다
  if jsonb_array_length(v_inq.replies) = 0 and v_inq.status = 'replied' then
    update inquiries set status = 'read' where id = p_inquiry_id returning * into v_inq;
  end if;

  return v_inq;
end;
$$;

create or replace function public.admin_set_inquiry_status(
  p_inquiry_id uuid, p_status inquiry_status
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  update inquiries set status = p_status where id = p_inquiry_id;
end;
$$;

-- 알림 발송. notifications는 테이블 권한이 살아 있고 운영자 정책도 있어
-- 직접 insert해도 되지만, 번호 부여와 대상 확인을 한곳에 모은다.
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

  insert into notifications (profile_id, message)
  values (p_profile_id, p_message)
  returning * into v_notif;
  return v_notif;
end;
$$;

-- ── 알림에 보낸 사람 기록 ───────────────────────────────────
--
-- 관리자 화면은 "누가 보낸 알림인가"를 메시지 본문에서 정규식으로 뽑아
-- 쓰고 있었다. 문구가 조금만 바뀌어도 깨지고, 답장을 어디로 보낼지도
-- 그 추측에 의존한다. 보낸 사람을 컬럼으로 둔다.

alter table notifications add column if not exists from_profile_id uuid
  references profiles on delete set null;

-- 회사 정보 변경 요청이 보낸 사람을 남기도록 다시 만든다.
create or replace function public.request_company_info_change(p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    profiles;
  v_admin uuid;
begin
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '변경 요구사항을 입력해주세요.';
  end if;

  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  for v_admin in select id from profiles where is_platform_admin loop
    insert into notifications (profile_id, from_profile_id, message)
    values (
      v_admin, v_me.id,
      format('[회사정보 변경 요청] %s / %s: %s',
             (select name from companies where id = v_me.company_id),
             v_me.name, p_message)
    );
  end loop;
end;
$$;

-- 운영자가 받은 알림에 답장한다. 원본에 답변을 남기고, 보낸 사람에게
-- 새 알림을 보낸다. 보낸 사람을 모르면 원본에만 남긴다.
create or replace function public.admin_reply_notification(
  p_notification_id uuid, p_message text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_notif notifications;
begin
  perform admin_guard();
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '답변 내용을 입력해주세요.';
  end if;

  update notifications set replies = replies || jsonb_build_object(
    'from', '관리자', 'company', '손잡다매칭',
    'message', p_message, 'createdAt', now()
  )
  where id = p_notification_id
  returning * into v_notif;

  if v_notif.id is null then
    raise exception '알림을 찾을 수 없습니다.';
  end if;

  if v_notif.from_profile_id is not null then
    insert into notifications (profile_id, from_profile_id, message)
    values (v_notif.from_profile_id, auth.uid(), '[관리자 답변] ' || p_message);
  end if;
end;
$$;

-- 회사 담당 관리자 지정. 같은 회사의 기존 담당자는 자동 해제된다.
create or replace function public.admin_set_company_admin(p_target uuid, p_value boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  perform admin_guard();
  select company_id into v_company from profiles where id = p_target;
  if v_company is null then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  if p_value then
    update profiles set is_company_admin = false where company_id = v_company;
  end if;
  update profiles set is_company_admin = p_value where id = p_target;
end;
$$;

grant execute on function public.admin_reply_notification  to authenticated;
grant execute on function public.admin_set_company_admin   to authenticated;
grant execute on function public.admin_list_users          to authenticated;
grant execute on function public.admin_update_user         to authenticated;
grant execute on function public.admin_delete_user         to authenticated;
grant execute on function public.admin_reply_inquiry       to authenticated;
grant execute on function public.admin_edit_inquiry_reply  to authenticated;
grant execute on function public.admin_set_inquiry_status  to authenticated;
grant execute on function public.admin_send_notification   to authenticated;

-- ════════════════════════════════════════════════════════════
-- 3. 운영자가 모든 알림을 읽을 수 있게
-- ════════════════════════════════════════════════════════════
-- notifications_admin_all 정책이 이미 있으므로 조회는 열려 있다.
-- 다만 회원이 남긴 답변을 운영자가 보려면 replies도 같이 읽혀야 하는데
-- 그건 같은 행이라 추가 작업이 없다.

-- ════════════════════════════════════════════════════════════
-- 4. 실행 후 확인
-- ════════════════════════════════════════════════════════════
--   select routine_name from information_schema.routines
--   where routine_schema = 'public' and routine_name like 'admin_%';
