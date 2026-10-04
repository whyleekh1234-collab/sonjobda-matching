-- 26단계: 회사소개서 첨부
--
-- 파트너 역량을 체크박스 몇 개로만 받고 있었다. 레퍼런스도 수행 사례도
-- 조직도도 담을 수 없어, 작성 부담만 있고 보여줄 것은 적었다.
--
-- 그렇다고 구조화된 항목을 버리면 의뢰사가 견적 서너 개를 숫자로 비교할
-- 수가 없다. 소개서 다섯 개를 열어 읽지는 않는다. AI 파트너 추천도 그
-- 숫자를 입력으로 쓴다.
--
-- 그래서 역할을 나눈다.
--   한 줄 소개      → 카드의 첫인상
--   핵심 지표 2~4개 → 숫자로 비교하는 것
--   회사소개서      → 깊이. 레퍼런스·사례·조직
--
-- 누가 볼 수 있는가가 까다롭다. 아무나 열면 파트너사의 영업 자료가
-- 그대로 새고, 매칭 뒤에만 열면 의뢰사가 판단할 때 쓸 수가 없다.
-- "나에게 견적을 낸 회사의 소개서"까지만 연다.

alter table companies add column if not exists profile_doc_path text;
alter table companies add column if not exists profile_doc_name text;
alter table companies add column if not exists profile_doc_uploaded_at timestamptz;

comment on column companies.profile_doc_path is
  '회사소개서 저장 경로(비공개 버킷). 견적을 받은 의뢰사와 운영자만 열람한다.';

-- ── 버킷 ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-profiles', 'company-profiles', false, 20971520,
        array['application/pdf',
              'application/vnd.ms-powerpoint',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update
  set public = false,
      file_size_limit = 20971520,
      allowed_mime_types = array['application/pdf',
                                 'application/vnd.ms-powerpoint',
                                 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

-- 자기 회사 폴더에만 올린다. 읽기 정책은 두지 않는다 — 열람은 서버가
-- 자격을 따져 서명 링크로만 내준다.
drop policy if exists company_profile_write_own on storage.objects;
create policy company_profile_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-profiles'
              and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists company_profile_update_own on storage.objects;
create policy company_profile_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'company-profiles'
         and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists company_profile_delete_own on storage.objects;
create policy company_profile_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-profiles'
         and (storage.foldername(name))[1] = current_company_id()::text);

-- ── 경로 기록 ───────────────────────────────────────────────
-- companies는 회원이 직접 못 고치는 테이블이라 로고·등록증과 같은 방식.
create or replace function public.set_my_company_profile_doc(p_path text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_company_id() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  -- null이면 첨부를 지운다.
  if p_path is null then
    update companies
    set profile_doc_path = null, profile_doc_name = null, profile_doc_uploaded_at = null
    where id = current_company_id();
    return;
  end if;
  if split_part(p_path, '/', 1) <> current_company_id()::text then
    raise exception '다른 회사의 경로입니다.';
  end if;
  update companies
  set profile_doc_path = p_path,
      profile_doc_name = p_name,
      profile_doc_uploaded_at = now()
  where id = current_company_id();
end;
$$;
grant execute on function public.set_my_company_profile_doc to authenticated;

-- ── 열람 자격 ───────────────────────────────────────────────
-- 운영자이거나, 내 회사가 올린 의뢰에 그 회사가 견적을 낸 경우에만 연다.
-- 매칭 성사까지 기다리면 정작 판단할 때 못 보고, 아무에게나 열면 파트너사의
-- 영업 자료가 그대로 샌다.
create or replace function public.can_view_profile_doc(p_company_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select is_platform_admin()
      or exists (
        select 1
        from quotes q
        join requests r on r.id = q.request_id
        where q.company_id = p_company_id
          and r.company_id = current_company_id()
      );
$$;
grant execute on function public.can_view_profile_doc to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, profile_doc_name, profile_doc_uploaded_at from companies;
