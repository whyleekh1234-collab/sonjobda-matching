-- 손잡다매칭 37단계: 광고 상세 화면
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다. 36단계 다음에 돌린다.
--
-- 광고주마다 사정이 다르다. 자기 사이트가 잘 돼 있으면 거기로 보내는 게
-- 낫고, 사이트가 없거나 이 광고용 내용만 따로 있는 곳은 우리 쪽 화면이
-- 필요하다. 그래서 둘 다 둔다.
--
-- 스위치는 따로 두지 않는다. 상세 내용을 받아 넣으면 우리 사이트에
-- 화면이 생기고(/ads/<id>), 링크만 있으면 바로 그쪽으로 나간다. 광고주가
-- 무엇을 주느냐로 저절로 갈린다. 스위치를 따로 두면 "상세를 적어 놓고
-- 스위치는 안 켠" 상태가 생기고, 그건 운영자가 알아챌 방법이 없다.
--
-- 광고주가 준 HTML을 그대로 띄우지 않는다. 그 안의 <script>가
-- sonjobdamd.com 권한으로 돌아가면 로그인한 의뢰사의 세션을 읽고 견적과
-- 연락처를 가져갈 수 있다. 글과 그림만 받아서 우리가 그린다. 그래서
-- detail_body는 평문이고, 화면에서도 줄바꿈만 살려 그린다.

alter table public.ads add column if not exists detail_body   text;
alter table public.ads add column if not exists detail_images text[] not null default '{}';
alter table public.ads add column if not exists cta_label     text;

comment on column public.ads.detail_body is
  '상세 화면 본문. 평문이다 — HTML을 넣어도 글자 그대로 나온다(의도된 것).';
comment on column public.ads.detail_images is
  '상세 화면 그림들. ad-images 버킷 경로. 비어 있고 본문도 없으면 상세 화면을 만들지 않는다.';
comment on column public.ads.cta_label is
  '상세 화면 버튼 글자. 비우면 "홈페이지 바로가기".';

-- ── 메인 화면이 읽는 것 ─────────────────────────────────────
-- 상세 화면이 있는지를 같이 내보낸다. 카드가 어디로 걸릴지를 그것으로
-- 정한다.
drop function if exists public.list_active_ads();

create function public.list_active_ads()
returns table (
  id           uuid,
  slot         smallint,
  company_name text,
  headline     text,
  body         text,
  image_url    text,
  link_url     text,
  has_detail   boolean
)
language sql security definer set search_path = public stable as $$
  select
    a.id,
    a.slot,
    a.company_name,
    a.headline,
    a.body,
    case
      when a.image_path is not null then '/storage/v1/object/public/ad-images/'  || a.image_path
      when c.logo_path  is not null then '/storage/v1/object/public/company-logos/' || c.logo_path
      else null
    end,
    a.link_url,
    (coalesce(trim(a.detail_body), '') <> '' or coalesce(array_length(a.detail_images, 1), 0) > 0)
  from ads a
  left join companies c on c.id = a.company_id
  where a.is_active
    and a.starts_on <= current_date
    and (a.ends_on is null or a.ends_on >= current_date)
  order by a.slot;
$$;

grant execute on function public.list_active_ads to anon, authenticated;

-- ── 상세 화면이 읽는 것 ─────────────────────────────────────
-- 게재 중인 광고만 연다. 기간이 끝난 광고의 주소를 들고 있어도 열리면,
-- 돈을 안 받은 기간에 광고가 살아 있는 셈이다.
create or replace function public.get_ad_detail(p_id uuid)
returns table (
  company_name text,
  headline     text,
  body         text,
  detail_body  text,
  image_url    text,
  detail_urls  text[],
  link_url     text,
  cta_label    text
)
language sql security definer set search_path = public stable as $$
  select
    a.company_name,
    a.headline,
    a.body,
    a.detail_body,
    case
      when a.image_path is not null then '/storage/v1/object/public/ad-images/'  || a.image_path
      when c.logo_path  is not null then '/storage/v1/object/public/company-logos/' || c.logo_path
      else null
    end,
    (select coalesce(array_agg('/storage/v1/object/public/ad-images/' || p order by i), '{}')
       from unnest(a.detail_images) with ordinality as t(p, i)),
    a.link_url,
    a.cta_label
  from ads a
  left join companies c on c.id = a.company_id
  where a.id = p_id
    and a.is_active
    and a.starts_on <= current_date
    and (a.ends_on is null or a.ends_on >= current_date);
$$;

grant execute on function public.get_ad_detail to anon, authenticated;

-- ── 운영자용 ────────────────────────────────────────────────
drop function if exists public.admin_list_ads();

create function public.admin_list_ads()
returns table (
  id            uuid,
  slot          smallint,
  company_name  text,
  company_id    uuid,
  headline      text,
  body          text,
  image_path    text,
  link_url      text,
  starts_on     date,
  ends_on       date,
  is_active     boolean,
  click_count   integer,
  memo          text,
  is_live       boolean,
  detail_body   text,
  detail_images text[],
  cta_label     text
)
language plpgsql security definer set search_path = public stable as $$
begin
  perform admin_guard();
  return query
    select a.id, a.slot, a.company_name, a.company_id, a.headline, a.body,
           a.image_path, a.link_url, a.starts_on, a.ends_on, a.is_active,
           a.click_count, a.memo,
           (a.is_active
            and a.starts_on <= current_date
            and (a.ends_on is null or a.ends_on >= current_date)),
           a.detail_body, a.detail_images, a.cta_label
      from ads a
     order by a.slot;
end;
$$;
grant execute on function public.admin_list_ads to authenticated;

-- 인자가 늘면 create or replace는 고치는 게 아니라 하나를 더 만든다.
-- 옛 서명을 먼저 지운다.
drop function if exists public.admin_save_ad(
  smallint, text, text, uuid, uuid, text, text, text, date, date, boolean, text);

create function public.admin_save_ad(
  p_slot          smallint,
  p_company_name  text,
  p_headline      text,
  p_id            uuid    default null,
  p_company_id    uuid    default null,
  p_body          text    default null,
  p_image_path    text    default null,
  p_link_url      text    default null,
  p_starts_on     date    default null,
  p_ends_on       date    default null,
  p_is_active     boolean default true,
  p_memo          text    default null,
  p_detail_body   text    default null,
  p_detail_images text[]  default null,
  p_cta_label     text    default null
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

  if v_link is not null and v_link !~* '^https?://' then
    raise exception '링크는 http:// 또는 https:// 로 시작해야 합니다.';
  end if;

  if p_ends_on is not null and p_starts_on is not null and p_ends_on < p_starts_on then
    raise exception '종료일이 시작일보다 앞설 수 없습니다.';
  end if;

  -- 상세도 없고 링크도 없으면 눌러도 아무 일이 없는 카드가 된다.
  -- 광고주가 돈을 내고 산 자리가 막다른 길이 되는 것이라 막는다.
  if v_link is null
     and coalesce(trim(p_detail_body), '') = ''
     and coalesce(array_length(p_detail_images, 1), 0) = 0 then
    raise exception '링크나 상세 내용 중 하나는 있어야 합니다. 둘 다 없으면 눌러도 아무 데도 가지 않습니다.';
  end if;

  if p_id is null then
    insert into ads (slot, company_name, company_id, headline, body, image_path,
                     link_url, starts_on, ends_on, is_active, memo,
                     detail_body, detail_images, cta_label)
    values (p_slot, trim(p_company_name), p_company_id, trim(p_headline),
            nullif(trim(coalesce(p_body, '')), ''), p_image_path, v_link,
            coalesce(p_starts_on, current_date), p_ends_on,
            coalesce(p_is_active, true), nullif(trim(coalesce(p_memo, '')), ''),
            nullif(trim(coalesce(p_detail_body, '')), ''),
            coalesce(p_detail_images, '{}'),
            nullif(trim(coalesce(p_cta_label, '')), ''))
    returning id into v_id;
  else
    update ads set
      slot          = p_slot,
      company_name  = trim(p_company_name),
      company_id    = p_company_id,
      headline      = trim(p_headline),
      body          = nullif(trim(coalesce(p_body, '')), ''),
      image_path    = p_image_path,
      link_url      = v_link,
      starts_on     = coalesce(p_starts_on, starts_on),
      ends_on       = p_ends_on,
      is_active     = coalesce(p_is_active, true),
      memo          = nullif(trim(coalesce(p_memo, '')), ''),
      detail_body   = nullif(trim(coalesce(p_detail_body, '')), ''),
      detail_images = coalesce(p_detail_images, '{}'),
      cta_label     = nullif(trim(coalesce(p_cta_label, '')), ''),
      updated_at    = now()
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

-- ── 확인 ────────────────────────────────────────────────────
-- select slot, company_name, has_detail from list_active_ads();
