-- 32단계: 제재 사유와 상세를 나눈다
--
-- 지금은 사유 한 칸에 모든 것을 적는다. 운영자가 고른 유형("가입 정보가
-- 정확하지 않음")과 구체적인 설명("담당자명이 실명과 다릅니다")이 한
-- 문장에 섞여, 받는 쪽은 무엇이 문제인지 한눈에 알기 어렵다.
--
-- 유형은 제목으로, 설명은 본문으로 나눈다.
--
-- 통지 문구도 함께 고친다. 지금은 조치가 무엇이든 "서비스운영정책
-- 위반으로"가 붙는다. 가입 정보가 부정확한 것은 위반이라기보다 보완할
-- 일인데 위반으로 통지되면 받는 쪽이 억울하다. 조치와 사유만 적고
-- 판단은 덧붙이지 않는다.

alter table sanctions add column if not exists detail text;

comment on column sanctions.reason is '제재 사유 유형. 통지의 제목이 된다.';
comment on column sanctions.detail is '구체적인 설명. 통지의 본문이 된다. 없을 수 있다.';

-- 인자가 하나 늘면 Postgres는 다른 함수로 본다. 옛 4인자짜리를 그대로
-- 두면 둘이 남아, 어느 쪽이 불릴지 호출 모양에 따라 갈린다. 먼저 지운다.
drop function if exists public.admin_sanction(uuid, sanction_kind, text, uuid);
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
  elsif p_kind = 'suspend' then
    update profiles set status = 'suspended' where id = p_profile_id;
    v_label := '이용 정지';
  else
    v_label := null;
  end if;

  if v_label is not null then
    insert into notifications (profile_id, message, link)
    values (
      p_profile_id,
      -- 제목 한 줄, 본문, 이의 제기 안내 순서로 쌓는다. 본문이 없으면
      -- 그 줄을 비우지 않고 아예 건너뛴다.
      format('[%s] %s', v_label, trim(p_reason))
        || case when v_detail is null then '' else E'\n\n' || v_detail end
        || E'\n\n이의가 있으시면 통지일로부터 7일 이내에 고객센터(contact@sonjobdamd.com)로 알려주세요.',
      '/inquiry'
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
-- select kind, reason, detail, created_at from sanctions order by created_at desc limit 5;
