-- 손잡다매칭 4단계: 알림 · 공지 · 문의 · 멤버 초대
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--   schema.sql → phase2_auth.sql → phase3_requests.sql 다음이다.

-- ════════════════════════════════════════════════════════════
-- 1. 1단계에서 빠진 컬럼 보강
-- ════════════════════════════════════════════════════════════
--
-- 알림과 문의에는 주고받은 답변이 쌓인다. 답변 하나하나를 행으로 두면
-- 테이블이 둘 더 늘어나는데, 실제로는 원본과 함께만 읽히고 따로 검색할
-- 일이 없어 jsonb 배열로 담는다.

alter table notifications add column if not exists replies    jsonb not null default '[]'::jsonb;
alter table inquiries     add column if not exists replies    jsonb not null default '[]'::jsonb;
alter table inquiries     add column if not exists title      text;
alter table inquiries     add column if not exists profile_id uuid references profiles on delete set null;

create index if not exists inquiries_profile_id_idx on inquiries (profile_id);

-- ════════════════════════════════════════════════════════════
-- 2. 문의: 본인 것만 조회, 접수 시 쓸 수 있는 칸 제한
-- ════════════════════════════════════════════════════════════
--
-- 1단계에는 운영자만 읽는 정책뿐이라 회원이 자기 문의 내역을 볼 수 없었다.

create policy inquiries_read_own on inquiries
  for select to authenticated
  using (profile_id = auth.uid());

-- 남의 이름으로 문의를 넣지 못하게 한다. 비회원 문의는 profile_id가 없다.
drop policy if exists inquiries_insert_anyone on inquiries;
create policy inquiries_insert_anyone on inquiries
  for insert to anon, authenticated
  with check (profile_id is null or profile_id = auth.uid());

-- 접수자는 내용만 쓴다. 처리 상태와 답변은 운영자 몫이다.
revoke insert, update on public.inquiries from anon, authenticated;
grant insert (company, name, email, phone, type, title, message, profile_id)
  on public.inquiries to anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- 3. 알림: 읽음 표시만 본인이, 답변은 함수로
-- ════════════════════════════════════════════════════════════
--
-- 1단계 정책은 본인 알림이면 모든 컬럼을 열어줬다. 그러면 회원이 자기
-- 알림의 message를 고쳐 쓸 수 있다. 읽음 표시만 남긴다.

revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- 답변은 누가 썼는지를 서버가 붙인다. 클라이언트가 보낸 작성자 이름을
-- 믿으면 남의 이름으로 답변을 남길 수 있다.
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
begin
  select * into v_notif from notifications where id = p_notification_id;
  if v_notif.id is null or v_notif.profile_id <> auth.uid() then
    raise exception '내 알림이 아닙니다.';
  end if;
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception '답변 내용을 입력해주세요.';
  end if;

  select * into v_me from profiles where id = auth.uid();

  update notifications set replies = replies || jsonb_build_object(
    'from',      v_me.name,
    'company',   (select name from companies where id = v_me.company_id),
    'message',   p_message,
    'createdAt', now()
  )
  where id = p_notification_id
  returning * into v_notif;

  return v_notif;
end;
$$;

-- 답변 수정/삭제. 배열 인덱스로 지목한다.
create or replace function public.edit_my_notification_reply(
  p_notification_id uuid,
  p_index           int,
  p_message         text
) returns notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notif notifications;
begin
  select * into v_notif from notifications where id = p_notification_id;
  if v_notif.id is null or v_notif.profile_id <> auth.uid() then
    raise exception '내 알림이 아닙니다.';
  end if;
  if jsonb_array_length(v_notif.replies) <= p_index or p_index < 0 then
    raise exception '없는 답변입니다.';
  end if;

  update notifications
  set replies = case
    when p_message is null then
      (replies - p_index)
    else
      jsonb_set(replies, array[p_index::text, 'message'], to_jsonb(p_message))
  end
  where id = p_notification_id
  returning * into v_notif;

  return v_notif;
end;
$$;

-- 회사 정보 변경 요청. 회원이 알림을 직접 만들 수는 없으므로(권한 없음)
-- 운영자에게 가는 알림을 이 함수가 대신 만든다.
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
    insert into notifications (profile_id, message)
    values (
      v_admin,
      format('[회사정보 변경 요청] %s / %s: %s',
             (select name from companies where id = v_me.company_id),
             v_me.name, p_message)
    );
  end loop;
end;
$$;

-- ════════════════════════════════════════════════════════════
-- 4. 멤버 초대: 토큰을 실제로 강제한다
-- ════════════════════════════════════════════════════════════
--
-- 지금까지는 초대 목록에 이메일만 올라 있으면 그 주소를 아는 누구나 해당
-- 회사 소속으로 가입할 수 있었다. 더 넓게 보면, 남의 사업자등록번호를
-- 적어 넣기만 해도 그 회사에 들어갈 수 있었다.
--
-- 이제 이미 등록된 회사에 합류하려면 유효한 초대 토큰이 있어야 한다.
-- 새 회사를 만드는 첫 가입은 그대로 초대 없이 된다.

create or replace function public.create_company_invite(p_email text)
returns company_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     profiles;
  v_invite company_invites;
begin
  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if not v_me.is_company_admin then
    raise exception '회사 담당 관리자만 멤버를 초대할 수 있습니다.';
  end if;
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception '올바른 이메일을 입력해주세요.';
  end if;

  insert into company_invites (company_id, email, invited_by)
  values (v_me.company_id, lower(trim(p_email)), auth.uid())
  on conflict (company_id, email) do update set
    token       = encode(gen_random_bytes(24), 'hex'),
    invited_by  = auth.uid(),
    expires_at  = now() + interval '14 days',
    accepted_at = null
  returning * into v_invite;

  return v_invite;
end;
$$;

-- 가입 화면이 토큰으로 초대 정보를 확인한다. 로그인 전이라 anon이 부른다.
-- 토큰을 모르면 아무것도 나오지 않으므로 회사 정보가 새지 않는다.
create or replace function public.get_invite_by_token(p_token text)
returns table (email text, company_name text, business_number text, invited_by_name text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select i.email, c.name, c.business_number, p.name
  from company_invites i
  join companies c on c.id = i.company_id
  join profiles  p on p.id = i.invited_by
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > now();
$$;

-- ── 회사 담당 관리자의 멤버 관리 ────────────────────────────
--
-- is_company_admin과 status는 2단계에서 회원이 직접 못 쓰게 막았다(자기를
-- 운영자로 올리는 걸 막기 위해). 회사 담당자가 같은 회사 멤버를 다루는
-- 정당한 경우만 함수로 연다.

create or replace function public.delegate_company_admin(p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     profiles;
  v_target profiles;
begin
  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null or not v_me.is_company_admin then
    raise exception '회사 담당 관리자만 권한을 위임할 수 있습니다.';
  end if;

  select * into v_target from profiles where id = p_target;
  if v_target.id is null or v_target.company_id <> v_me.company_id then
    raise exception '같은 회사 멤버가 아닙니다.';
  end if;

  update profiles set is_company_admin = false where id = v_me.id;
  update profiles set is_company_admin = true  where id = p_target;
end;
$$;

create or replace function public.set_member_status(p_target uuid, p_status user_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     profiles;
  v_target profiles;
begin
  if p_status not in ('approved', 'suspended') then
    raise exception '허용되지 않은 상태입니다.';
  end if;

  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null or not v_me.is_company_admin then
    raise exception '회사 담당 관리자만 멤버 상태를 바꿀 수 있습니다.';
  end if;
  if p_target = v_me.id then
    raise exception '본인 상태는 바꿀 수 없습니다.';
  end if;

  select * into v_target from profiles where id = p_target;
  if v_target.id is null or v_target.company_id <> v_me.company_id then
    raise exception '같은 회사 멤버가 아닙니다.';
  end if;

  update profiles set status = p_status where id = p_target;
end;
$$;

-- 회원 탈퇴. auth.users를 지우면 profiles가 따라 지워진다(on delete cascade).
-- 클라이언트 키로는 계정 삭제 API를 부를 수 없어 함수로 연다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delegate_company_admin      to authenticated;
grant execute on function public.set_member_status           to authenticated;
grant execute on function public.delete_my_account           to authenticated;
grant execute on function public.reply_to_notification       to authenticated;
grant execute on function public.edit_my_notification_reply  to authenticated;
grant execute on function public.request_company_info_change to authenticated;
grant execute on function public.create_company_invite       to authenticated;
grant execute on function public.get_invite_by_token         to anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- 5. 가입 트리거: 기존 회사 합류에 초대 토큰 요구
-- ════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta            jsonb   := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name            text    := nullif(trim(coalesce(v_meta->>'name', '')), '');
  v_business_number text    := nullif(trim(coalesce(v_meta->>'business_number', '')), '');
  v_company_name    text    := nullif(trim(coalesce(v_meta->>'company_name', '')), '');
  v_token           text    := nullif(trim(coalesce(v_meta->>'invite_token', '')), '');
  v_roles           text[]  := '{}';
  v_categories      text[]  := '{}';
  v_active_role     text;
  v_company_id      uuid;
  v_is_new_company  boolean := false;
  v_invite          company_invites;
begin
  if v_name is null or v_business_number is null then
    return new;
  end if;

  if jsonb_typeof(v_meta->'roles') = 'array' then
    v_roles := array(select jsonb_array_elements_text(v_meta->'roles'));
  end if;
  if cardinality(v_roles) = 0 then
    v_roles := array['client'];
  end if;

  if jsonb_typeof(v_meta->'partner_categories') = 'array' then
    v_categories := array(select jsonb_array_elements_text(v_meta->'partner_categories'));
  end if;

  v_active_role := nullif(trim(coalesce(v_meta->>'active_role', '')), '');
  if v_active_role is null or not (v_active_role = any (v_roles)) then
    v_active_role := v_roles[1];
  end if;

  select id into v_company_id from companies where business_number = v_business_number;

  if v_company_id is null then
    -- 새 회사. 처음 등록한 사람이 회사 담당 관리자가 된다.
    insert into companies (business_number, name, address)
    values (
      v_business_number,
      coalesce(v_company_name, v_business_number),
      nullif(trim(coalesce(v_meta->>'address', '')), '')
    )
    returning id into v_company_id;
    v_is_new_company := true;
  else
    -- 이미 있는 회사에 합류하려면 그 회사가 이 이메일로 보낸 유효한
    -- 초대가 있어야 한다. 없으면 가입 자체가 취소된다(트리거 예외는
    -- auth.users insert까지 되돌린다).
    select * into v_invite
    from company_invites
    where token = v_token
      and company_id = v_company_id
      and lower(email) = lower(new.email)
      and accepted_at is null
      and expires_at > now();

    if v_invite.id is null then
      raise exception '이미 등록된 사업자등록번호입니다. 회사 담당자에게 초대를 요청해주세요.';
    end if;

    update company_invites set accepted_at = now() where id = v_invite.id;
  end if;

  insert into profiles (
    id, company_id, name, phone, roles, active_role, partner_categories, is_company_admin
  ) values (
    new.id,
    v_company_id,
    v_name,
    nullif(trim(coalesce(v_meta->>'phone', '')), ''),
    v_roles,
    v_active_role,
    v_categories,
    v_is_new_company
  );

  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════
-- 6. 실행 후 확인
-- ════════════════════════════════════════════════════════════
--   select routine_name from information_schema.routines
--   where routine_schema = 'public'
--     and routine_name in ('reply_to_notification','edit_my_notification_reply',
--                          'request_company_info_change','create_company_invite',
--                          'get_invite_by_token');
