-- 손잡다매칭 13단계: 회사 로고 (선택)
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 회원가입 때, 또는 나중에 마이페이지에서 회사 로고를 올릴 수 있다.
-- 로고는 비밀이 아니라(카드·헤더에 그대로 노출) 공개 버킷을 쓴다.
-- 경로는 <회사id>/logo.<ext> 하나로 고정해서 바꾸면 덮어쓴다.

alter table companies add column if not exists logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- 자기 회사 폴더에만 올리고 바꾸고 지운다. 읽기는 공개 버킷이라 정책이 필요 없다.
drop policy if exists company_logo_write_own on storage.objects;
create policy company_logo_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-logos'
              and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists company_logo_update_own on storage.objects;
create policy company_logo_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'company-logos'
         and (storage.foldername(name))[1] = current_company_id()::text);

drop policy if exists company_logo_delete_own on storage.objects;
create policy company_logo_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-logos'
         and (storage.foldername(name))[1] = current_company_id()::text);

-- companies는 회원이 직접 못 고치는 테이블이다(회사 정보 변경 요청 절차).
-- 로고만 예외로, 자기 회사 것만 바꾸는 함수를 둔다. null이면 지운다.
create or replace function public.set_my_company_logo(p_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_company_id() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> current_company_id()::text then
    raise exception '다른 회사의 로고 경로입니다.';
  end if;
  update companies set logo_path = p_path where id = current_company_id();
end;
$$;
grant execute on function public.set_my_company_logo to authenticated;
