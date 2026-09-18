-- 손잡다매칭: 회원 삭제가 막히던 문제
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 1단계 스키마에서 requests.created_by와 quotes.submitted_by를
-- on delete restrict로 걸었다. 그 바람에 의뢰나 견적을 한 번이라도 낸
-- 회원은 삭제할 수 없다. 회원 탈퇴도, 관리자의 회원 삭제도 실제
-- 사용자에게는 항상 실패한다.
--
--   ERROR: update or delete on table "profiles" violates foreign key
--   constraint "quotes_submitted_by_fkey" on table "quotes"
--
-- 의뢰와 견적의 주인은 회사다. 담당자가 퇴사해도 회사의 의뢰와 견적은
-- 남아야 한다. 작성자 연결만 끊고 행은 유지한다.

alter table requests alter column created_by   drop not null;
alter table quotes   alter column submitted_by drop not null;

alter table requests drop constraint if exists requests_created_by_fkey;
alter table requests add  constraint requests_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table quotes drop constraint if exists quotes_submitted_by_fkey;
alter table quotes add  constraint quotes_submitted_by_fkey
  foreign key (submitted_by) references profiles (id) on delete set null;

-- 변경 요청도 같은 이유로 막힌다. 요청자가 없어져도 이력은 남겨야 한다.
alter table company_change_requests alter column requested_by drop not null;
alter table company_change_requests drop constraint if exists company_change_requests_requested_by_fkey;
alter table company_change_requests add  constraint company_change_requests_requested_by_fkey
  foreign key (requested_by) references profiles (id) on delete set null;

-- ════════════════════════════════════════════════════════════
-- 운영자는 회원이 아니다
-- ════════════════════════════════════════════════════════════
--
-- 운영자도 회원가입 트리거를 타서 SJ-C- 같은 회원번호를 받는다. 직원에게
-- 의뢰사 회원번호가 붙어 있으면 어디서 보든 헷갈린다. 운영자로 지정되는
-- 순간 번호를 SJ-ADMIN-으로 바꾼다. 관리자 화면의 회원 목록·통계에서도
-- 운영자는 뺀다(화면 쪽에서 처리).

create sequence if not exists admin_code_seq start 1;

create or replace function public.relabel_platform_admin()
returns trigger language plpgsql as $$
begin
  if new.is_platform_admin and not coalesce(old.is_platform_admin, false) then
    new.member_code := 'SJ-ADMIN-' || lpad(nextval('admin_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_relabel_admin on profiles;
create trigger profiles_relabel_admin
  before update of is_platform_admin on profiles
  for each row execute function public.relabel_platform_admin();

-- 이미 운영자인 계정도 바꿔준다.
update profiles
set member_code = 'SJ-ADMIN-' || lpad(nextval('admin_code_seq')::text, 4, '0')
where is_platform_admin and member_code not like 'SJ-ADMIN-%';

-- ════════════════════════════════════════════════════════════
-- 실행 후 확인
-- ════════════════════════════════════════════════════════════
-- 아래 세 줄이 전부 'SET NULL'이어야 한다.
--
--   select tc.table_name, tc.constraint_name, rc.delete_rule
--   from information_schema.table_constraints tc
--   join information_schema.referential_constraints rc
--     on rc.constraint_name = tc.constraint_name
--   where tc.constraint_name in ('requests_created_by_fkey',
--                                'quotes_submitted_by_fkey',
--                                'company_change_requests_requested_by_fkey');
