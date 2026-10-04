-- 22단계: 사업자등록증 첨부 (필수)
--
-- 사업자등록번호는 세금계산서·홈페이지에 적혀 있어 사실상 공개 정보다.
-- 그 회사 사람이 아니어도 번호만 알면 먼저 가입해 회사를 선점할 수 있고,
-- 그러면 진짜 직원들은 선점한 사람의 초대를 받아야만 들어오게 된다.
--
-- 그래서 역할을 셋으로 나눈다.
--   국세청 조회  → 번호가 실존하고 휴·폐업이 아닌가
--   등록증 첨부  → 그 회사 서류를 가진 사람인가   ← 여기
--   운영자 승인  → 사람이 눈으로 최종 확인
--
-- 회사를 처음 등록할 때만 받는다. 초대 링크로 합류하는 멤버는 회사가 이미
-- 검증됐으므로 묻지 않는다 — 같은 서류를 사람 수만큼 쌓을 이유가 없다.
--
-- 로고와 달리 비공개 버킷을 쓴다. 등록증에는 대표자 성명과 주소가 들어
-- 있고, 개인사업자는 그게 개인정보다. 운영자만 서명 링크로 연다.
-- 보유 기간은 회원 탈퇴 시까지다(개인정보처리방침에 명시).

alter table companies add column if not exists license_path text;
alter table companies add column if not exists license_name text;
alter table companies add column if not exists license_uploaded_at timestamptz;

comment on column companies.license_path is
  '사업자등록증 저장 경로(비공개 버킷). 운영자만 서명 링크로 열람한다.';
comment on column companies.license_name is
  '올린 사람이 보던 원래 파일명. 저장 경로는 한글을 쓸 수 없어 따로 담는다.';

-- ── 버킷 ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-licenses', 'business-licenses', false, 5242880,
        array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg'];

-- 자기 회사 폴더에만 올린다. 읽기 정책은 두지 않는다 — 회원이 제 등록증을
-- 다시 볼 일은 없고, 운영자는 서버에서 secret key로 연다. 권한을 안 여는
-- 것이 가장 단순한 방어다.
drop policy if exists business_license_write_own on storage.objects;
create policy business_license_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-licenses'
              and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists business_license_update_own on storage.objects;
create policy business_license_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'business-licenses'
         and (storage.foldername(name))[1] = current_company_id()::text);

-- ── 경로 기록 ───────────────────────────────────────────────
-- companies는 회원이 직접 못 고치는 테이블이라(회사 정보 변경 요청 절차)
-- 로고와 같은 방식으로 함수를 둔다.
create or replace function public.set_my_company_license(p_path text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_company_id() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_path is null or split_part(p_path, '/', 1) <> current_company_id()::text then
    raise exception '다른 회사의 경로입니다.';
  end if;
  update companies
  set license_path = p_path,
      license_name = p_name,
      license_uploaded_at = now()
  where id = current_company_id();
end;
$$;
grant execute on function public.set_my_company_license to authenticated;

-- ── 운영자 목록에 등록증 정보 ───────────────────────────────
-- 승인 판단에 쓰는 서류라 회원 상세에서 바로 열 수 있어야 한다.
-- 반환 타입이 바뀌므로 먼저 지운다.
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid, member_code text, name text, email text, phone text,
  company_id uuid, company text, business_number text, address text,
  roles text[], active_role text, partner_categories text[],
  status text, is_company_admin boolean, is_platform_admin boolean,
  verified boolean, allow_category_edit boolean, created_at timestamptz,
  marketing_consent boolean, marketing_consent_at timestamptz,
  mfa_email text, license_path text, license_name text
)
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform admin_guard();
  return query
    select p.id, p.member_code, p.name, u.email::text, p.phone,
           c.id, c.name, c.business_number, c.address,
           p.roles, p.active_role, p.partner_categories,
           p.status::text, p.is_company_admin, p.is_platform_admin,
           p.verified, p.allow_category_edit, p.created_at,
           p.marketing_consent, p.marketing_consent_at,
           p.mfa_email, c.license_path, c.license_name
    from profiles p
    join companies c on c.id = p.company_id
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- select name, business_number, license_name, license_uploaded_at from companies;
