-- 손잡다매칭 12단계: 파트너사 프로필 (회사 역량)
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 지금까지 파트너사에 대해 아는 건 회사명과 분야뿐이었다. 의뢰사가
-- 견적을 고를 때 볼 정보가 없고, 나중에 AI 추천을 붙이려 해도 재료가
-- 없다. 회사 단위로 역량 프로필을 받는다. 분야마다 물어볼 게 달라서
-- 공통 항목은 컬럼으로, 분야별 항목은 jsonb(extra)로 둔다.

create table if not exists partner_profiles (
  company_id        uuid primary key references companies on delete cascade,
  intro             text,                      -- 강점 한 줄
  therapeutic_areas text[] not null default '{}', -- 종양, 심혈관 …
  phases            text[] not null default '{}', -- Phase I~IV, IIT, RWE …
  regions           text[] not null default '{}', -- 국내, 아시아, 미국/EU …
  employees         int,
  annual_projects   int,                       -- 연간 수행 과제 수
  certifications    text[] not null default '{}', -- KGCP, GMP, ISO …
  track_record      text,                      -- 대표 실적 (자유 기술)
  extra             jsonb not null default '{}'::jsonb, -- 분야별 추가 항목
  updated_by        uuid references profiles (id) on delete set null,
  updated_at        timestamptz not null default now(),
  verified_at       timestamptz                -- 운영자 확인
);

alter table partner_profiles enable row level security;

-- 승인된 회원은 누구나 읽는다. 의뢰사가 견적 고를 때 봐야 하는 정보다.
drop policy if exists partner_profiles_read on partner_profiles;
create policy partner_profiles_read on partner_profiles
  for select to authenticated using (is_approved() or is_platform_admin());

-- 쓰기는 자기 회사만. verified_at은 운영자만 만질 수 있게 컬럼 권한으로 잠근다.
drop policy if exists partner_profiles_write_own on partner_profiles;
create policy partner_profiles_write_own on partner_profiles
  for all to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

drop policy if exists partner_profiles_admin on partner_profiles;
create policy partner_profiles_admin on partner_profiles
  for all to authenticated using (is_platform_admin()) with check (is_platform_admin());

revoke all on partner_profiles from authenticated;
grant select on partner_profiles to authenticated;
grant insert (company_id, intro, therapeutic_areas, phases, regions, employees,
              annual_projects, certifications, track_record, extra, updated_by)
  on partner_profiles to authenticated;
grant update (intro, therapeutic_areas, phases, regions, employees,
              annual_projects, certifications, track_record, extra, updated_by, updated_at)
  on partner_profiles to authenticated;

-- 운영자 확인 표시
create or replace function public.admin_verify_partner_profile(p_company_id uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  update partner_profiles
  set verified_at = case when p_verified then now() else null end
  where company_id = p_company_id;
end;
$$;
grant execute on function public.admin_verify_partner_profile to authenticated;

-- 수정 시각 자동 갱신
create or replace function public.touch_partner_profile()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;
  -- 내용이 바뀐 경우에만 수정 기록을 남기고, 운영자 확인은 다시 받게 한다.
  -- (운영자가 verified_at만 바꾸는 건 내용 변경이 아니다.)
  if row(new.intro, new.therapeutic_areas, new.phases, new.regions,
         new.employees, new.annual_projects, new.certifications, new.track_record, new.extra)
     is distinct from
     row(old.intro, old.therapeutic_areas, old.phases, old.regions,
         old.employees, old.annual_projects, old.certifications, old.track_record, old.extra) then
    new.updated_at := now();
    new.updated_by := auth.uid();
    new.verified_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists partner_profiles_touch on partner_profiles;
create trigger partner_profiles_touch
  before insert or update on partner_profiles
  for each row execute function public.touch_partner_profile();
