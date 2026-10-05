-- 손잡다매칭 36단계: 메인 화면 광고
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 돈을 받고 파는 자리다. 그래서 몇 가지가 앞의 기능들과 다르다.
--
-- 첫째, 회원이 스스로 켜고 끄지 못한다. 운영자가 등록한다. 광고는
-- 계약이 먼저 있고 게재가 뒤따르는 것이라, 회원 화면에 스위치를 두면
-- 계약 없이 올라간다.
--
-- 둘째, 게재 기간이 있다. 끝나면 스스로 내려가야 한다. 운영자가 날짜를
-- 기억해서 손으로 끄는 구조는 반드시 한 번은 잊는다. 잊으면 돈을 안 받은
-- 기간에 광고가 떠 있거나, 받은 기간에 안 떠 있는다. 둘 다 사고다.
--
-- 셋째, 광고주가 아직 회원이 아닐 수 있다. 그래서 회사명을 자유 입력으로
-- 받고, 회원이면 company_id로 연결해 로고를 재활용한다.
--
-- 넷째, 광고 노출은 매칭과 완전히 분리된다. 이 표는 requests·quotes를
-- 쳐다보지 않고, 매칭 쪽 어느 함수도 이 표를 읽지 않는다. 광고를 샀다고
-- 견적 순서가 달라지면 "공정한 매칭"이라는 약속이 거짓이 된다.

-- ── 표 ──────────────────────────────────────────────────────
create table if not exists public.ads (
  id            uuid primary key default gen_random_uuid(),
  -- 자리 번호. 메인에 넉 칸을 두기로 했으므로 1~4가 기본이고, 늘리더라도
  -- 한 자리에 하나만 걸리도록 유일하게 묶는다.
  slot          smallint not null unique check (slot between 1 and 12),
  company_name  text not null,
  -- 회원이면 연결한다. 회사가 지워져도 광고는 남아야 하므로 set null.
  company_id    uuid references public.companies(id) on delete set null,
  headline      text not null,
  body          text,
  -- 회원 로고를 쓰지 않고 광고용 그림을 따로 받을 때. ad-images 버킷.
  image_path    text,
  link_url      text,
  starts_on     date not null default current_date,
  -- 비우면 기한 없음. 계약서에 종료일이 있으면 반드시 넣는다.
  ends_on       date,
  is_active     boolean not null default true,
  click_count   integer not null default 0,
  memo          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.ads is
  '메인 화면 유료 광고. 운영자만 등록한다. 매칭 로직과 분리되어 있다.';
comment on column public.ads.ends_on is
  '게재 종료일(포함). 비우면 기한 없음. 지나면 list_active_ads가 자동으로 뺀다.';
comment on column public.ads.click_count is
  '클릭 수. 익명도 올릴 수 있어 정확한 집계가 아니다 — 광고주 보고용 참고치.';

-- 기간이 지난 것을 걸러내는 조회가 전부라 이 하나로 충분하다.
create index if not exists ads_active_idx on public.ads (slot) where is_active;

alter table public.ads enable row level security;

-- 운영자만 직접 손댄다. 일반 회원과 익명은 아래 함수로만 읽는다.
drop policy if exists ads_admin_all on public.ads;
create policy ads_admin_all on public.ads
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- ── 광고용 그림 버킷 ────────────────────────────────────────
-- 메인 화면에 그대로 뜨는 그림이라 비밀이 아니다. 공개 버킷을 쓴다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-images', 'ad-images', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- 올리는 사람은 운영자뿐이다. 읽기는 공개 버킷이라 정책이 필요 없다.
drop policy if exists ad_image_admin_write on storage.objects;
create policy ad_image_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ad-images' and is_platform_admin());

drop policy if exists ad_image_admin_update on storage.objects;
create policy ad_image_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'ad-images' and is_platform_admin());

drop policy if exists ad_image_admin_delete on storage.objects;
create policy ad_image_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'ad-images' and is_platform_admin());

-- ── 메인 화면이 읽는 것 ─────────────────────────────────────
-- 로그인하지 않은 사람도 메인을 본다. ads는 RLS로 막혀 있으니 내보낼
-- 값만 골라 주는 함수를 따로 둔다. click_count와 memo는 나가지 않는다 —
-- 다른 광고주의 성과가 보이면 협상 자리에서 쓰인다.
drop function if exists public.list_active_ads();

create function public.list_active_ads()
returns table (
  id           uuid,
  slot         smallint,
  company_name text,
  headline     text,
  body         text,
  image_url    text,
  link_url     text
)
language sql security definer set search_path = public stable as $$
  select
    a.id,
    a.slot,
    a.company_name,
    a.headline,
    a.body,
    -- 광고용 그림이 있으면 그것, 없으면 회원 로고를 쓴다. 버킷이 달라
    -- 경로만으로는 어느 쪽인지 알 수 없으므로 여기서 주소까지 만들어
    -- 내보낸다. 화면 쪽에서 버킷을 따지지 않게 된다.
    case
      when a.image_path is not null then '/storage/v1/object/public/ad-images/'  || a.image_path
      when c.logo_path  is not null then '/storage/v1/object/public/company-logos/' || c.logo_path
      else null
    end,
    a.link_url
  from ads a
  left join companies c on c.id = a.company_id
  where a.is_active
    and a.starts_on <= current_date
    and (a.ends_on is null or a.ends_on >= current_date)
  order by a.slot;
$$;

grant execute on function public.list_active_ads to anon, authenticated;

-- ── 클릭 집계 ───────────────────────────────────────────────
-- 광고주는 반드시 "몇 명이 봤냐"를 묻는다. 아무것도 없으면 대답할 말이
-- 없다. 다만 익명도 호출할 수 있는 함수라 숫자를 부풀릴 수 있다. 그래서
-- 이 값은 참고치이고, 과금 근거로 쓰면 안 된다.
create or replace function public.record_ad_click(p_ad_id uuid)
returns void language sql security definer set search_path = public as $$
  update ads set click_count = click_count + 1 where id = p_ad_id and is_active;
$$;
grant execute on function public.record_ad_click to anon, authenticated;

-- ── 운영자용 ────────────────────────────────────────────────
drop function if exists public.admin_list_ads();

create function public.admin_list_ads()
returns table (
  id           uuid,
  slot         smallint,
  company_name text,
  company_id   uuid,
  headline     text,
  body         text,
  image_path   text,
  link_url     text,
  starts_on    date,
  ends_on      date,
  is_active    boolean,
  click_count  integer,
  memo         text,
  is_live      boolean
)
language plpgsql security definer set search_path = public stable as $$
begin
  perform admin_guard();
  return query
    select a.id, a.slot, a.company_name, a.company_id, a.headline, a.body,
           a.image_path, a.link_url, a.starts_on, a.ends_on, a.is_active,
           a.click_count, a.memo,
           -- 켜져 있어도 기간이 지나면 화면에는 없다. 운영자가 "켰는데 왜
           -- 안 보이지"로 헤매지 않도록 실제 노출 여부를 같이 준다.
           (a.is_active
            and a.starts_on <= current_date
            and (a.ends_on is null or a.ends_on >= current_date))
      from ads a
     order by a.slot;
end;
$$;
grant execute on function public.admin_list_ads to authenticated;

-- 등록과 수정을 하나로. p_id가 없으면 새로 만든다.
create or replace function public.admin_save_ad(
  p_slot         smallint,
  p_company_name text,
  p_headline     text,
  p_id           uuid    default null,
  p_company_id   uuid    default null,
  p_body         text    default null,
  p_image_path   text    default null,
  p_link_url     text    default null,
  p_starts_on    date    default null,
  p_ends_on      date    default null,
  p_is_active    boolean default true,
  p_memo         text    default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id   uuid;
  v_link text := nullif(trim(coalesce(p_link_url, '')), '');
begin
  perform admin_guard();

  if coalesce(trim(p_company_name), '') = '' then
    raise exception '광고주 회사명을 입력해주세요.';
  end if;
  if coalesce(trim(p_headline), '') = '' then
    raise exception '광고 한 줄 문구를 입력해주세요.';
  end if;

  -- http(s)만 받는다. javascript: 같은 주소가 들어오면 메인 화면에서
  -- 그대로 실행된다.
  if v_link is not null and v_link !~* '^https?://' then
    raise exception '링크는 http:// 또는 https:// 로 시작해야 합니다.';
  end if;

  if p_ends_on is not null and p_starts_on is not null and p_ends_on < p_starts_on then
    raise exception '종료일이 시작일보다 앞설 수 없습니다.';
  end if;

  if p_id is null then
    insert into ads (slot, company_name, company_id, headline, body, image_path,
                     link_url, starts_on, ends_on, is_active, memo)
    values (p_slot, trim(p_company_name), p_company_id, trim(p_headline),
            nullif(trim(coalesce(p_body, '')), ''), p_image_path, v_link,
            coalesce(p_starts_on, current_date), p_ends_on,
            coalesce(p_is_active, true), nullif(trim(coalesce(p_memo, '')), ''))
    returning id into v_id;
  else
    update ads set
      slot         = p_slot,
      company_name = trim(p_company_name),
      company_id   = p_company_id,
      headline     = trim(p_headline),
      body         = nullif(trim(coalesce(p_body, '')), ''),
      image_path   = p_image_path,
      link_url     = v_link,
      starts_on    = coalesce(p_starts_on, starts_on),
      ends_on      = p_ends_on,
      is_active    = coalesce(p_is_active, true),
      memo         = nullif(trim(coalesce(p_memo, '')), ''),
      updated_at   = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception '광고를 찾을 수 없습니다.';
    end if;
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception '%번 자리에는 이미 다른 광고가 있습니다. 먼저 그 광고의 자리를 바꾸거나 삭제해주세요.', p_slot;
end;
$$;
grant execute on function public.admin_save_ad to authenticated;

create or replace function public.admin_delete_ad(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  delete from ads where id = p_id;
end;
$$;
grant execute on function public.admin_delete_ad to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select * from list_active_ads();
