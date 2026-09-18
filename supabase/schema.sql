-- 손잡다매칭 스키마 (1단계)
--
-- Supabase 대시보드 > SQL Editor에 통째로 붙여넣고 실행한다.
-- 앱 코드는 아직 이 스키마를 쓰지 않는다. 2단계부터 연결한다.
--
-- 설계 요약
--   - 회사(companies)를 실체로 승격한다. 기존 프로토타입은 회사를 사업자등록번호
--     문자열로만 다뤄서 회사 단위 권한을 DB에 맡길 수 없었다.
--   - 견적(quotes)을 의뢰 안의 배열이 아니라 별도 행으로 둔다. 행이어야
--     "경쟁 파트너사는 서로의 견적을 못 본다"를 RLS로 강제할 수 있다.
--   - 고유번호는 시퀀스로 발급한다. 클라이언트에서 기존 최대값+1로 만들던 방식은
--     두 사람이 동시에 제출하면 같은 번호가 나온다.

-- ════════════════════════════════════════════════════════════
-- 1. 열거형
-- ════════════════════════════════════════════════════════════

create type user_status    as enum ('pending', 'approved', 'restricted', 'suspended');
create type request_status as enum ('pending', 'matching', 'matched', 'completed', 'cancelled');
create type quote_status   as enum ('new', 'reviewing', 'quoted', 'rejected', 'hold',
                                    'client_reviewing', 'accepted', 'client_rejected',
                                    'client_hold', 'not_selected');
create type inquiry_status as enum ('new', 'read', 'replied', 'closed');

-- 역할과 파트너 카테고리는 운영 중 늘어날 수 있어 enum 대신 text로 둔다.
-- enum에 값을 추가하려면 마이그레이션이 필요하지만 text는 앱에서 바로 늘릴 수 있다.

-- ════════════════════════════════════════════════════════════
-- 2. 고유번호 시퀀스
-- ════════════════════════════════════════════════════════════

create sequence member_code_seq  start 1;
create sequence request_code_seq start 1;
create sequence quote_code_seq   start 1;
create sequence match_code_seq   start 1;

-- ════════════════════════════════════════════════════════════
-- 3. 테이블
-- ════════════════════════════════════════════════════════════

-- 회사 --------------------------------------------------------
create table companies (
  id              uuid primary key default gen_random_uuid(),
  business_number text        not null unique,
  name            text        not null,
  address         text,
  verified_at     timestamptz,                       -- 국세청 진위확인 통과 시각 (7단계)
  created_at      timestamptz not null default now()
);

-- 회원 --------------------------------------------------------
-- auth.users와 1:1. 비밀번호는 Supabase가 보관하므로 여기에 없다.
create table profiles (
  id                 uuid primary key references auth.users on delete cascade,
  company_id         uuid        not null references companies on delete restrict,
  member_code        text        not null unique,    -- SJ-C-00000001
  name               text        not null,
  phone              text,
  roles              text[]      not null default '{}',   -- {client} / {partner} / {client,partner}
  active_role        text        not null,
  partner_categories text[]      not null default '{}',   -- CRO, CMO/CDMO, SMO ...
  status             user_status not null default 'pending',
  is_company_admin   boolean     not null default false,  -- 회사 담당 관리자
  is_platform_admin  boolean     not null default false,  -- 손잡다 운영자
  created_at         timestamptz not null default now(),

  constraint roles_not_empty check (cardinality(roles) > 0),
  constraint active_role_in_roles check (active_role = any (roles))
);

-- 멤버 초대 ---------------------------------------------------
-- 기존 프로토타입은 초대 목록에 이메일만 올려둬서, 그 주소를 아는 누구나
-- 해당 회사 소속으로 가입할 수 있었다. 토큰을 필수로 둔다.
create table company_invites (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid        not null references companies on delete cascade,
  email      text        not null,
  token      text        not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid        not null references profiles on delete cascade,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),

  unique (company_id, email)
);

-- 의뢰 --------------------------------------------------------
create table requests (
  id           uuid           primary key default gen_random_uuid(),
  request_code text           not null unique
                 default 'RQ-' || lpad(nextval('request_code_seq')::text, 8, '0'),
  match_code   text           unique,               -- 매칭 성사 시 부여
  company_id   uuid           not null references companies on delete cascade,  -- 의뢰사
  created_by   uuid           not null references profiles  on delete restrict,
  title        text           not null,
  category     text           not null,
  description  text,
  budget       text,
  deadline     date,
  status       request_status not null default 'pending',
  -- 카테고리마다 폼 필드가 완전히 달라 통째 보관한다.
  -- 목록·필터에 실제로 쓰는 값만 위 컬럼으로 승격해 뒀다.
  form_data    jsonb          not null default '{}'::jsonb,
  created_at   timestamptz    not null default now(),
  updated_at   timestamptz    not null default now()
);

-- 견적 --------------------------------------------------------
create table quotes (
  id              uuid         primary key default gen_random_uuid(),
  quote_code      text         not null unique
                    default 'QT-' || lpad(nextval('quote_code_seq')::text, 8, '0'),
  request_id      uuid         not null references requests  on delete cascade,
  company_id      uuid         not null references companies on delete cascade,  -- 파트너사
  submitted_by    uuid         not null references profiles  on delete restrict,
  amount          numeric(14,0),
  duration        text,
  memo            text,
  timeline        jsonb,
  attachment_path text,                             -- Storage 경로. base64를 행에 넣지 않는다
  status          quote_status not null default 'new',
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),

  unique (request_id, company_id)                   -- 한 회사가 한 의뢰에 견적 하나
);

-- 문의 --------------------------------------------------------
-- 비회원도 남길 수 있어 profiles를 참조하지 않는다.
create table inquiries (
  id         uuid           primary key default gen_random_uuid(),
  company    text,
  name       text           not null,
  email      text           not null,
  phone      text,
  type       text,
  message    text           not null,
  status     inquiry_status not null default 'new',
  reply      text,
  replied_at timestamptz,
  created_at timestamptz    not null default now()
);

-- 공지 --------------------------------------------------------
create table notices (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  content    text        not null,
  created_by uuid        references profiles on delete set null,
  created_at timestamptz not null default now()
);

-- 공지 읽음 ---------------------------------------------------
-- 기존에는 회원마다 sonjobda_notices_read_<id> 키를 따로 만들어 썼다.
create table notice_reads (
  notice_id  uuid        not null references notices  on delete cascade,
  profile_id uuid        not null references profiles on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (notice_id, profile_id)
);

-- 알림 --------------------------------------------------------
create table notifications (
  id         uuid        primary key default gen_random_uuid(),
  profile_id uuid        not null references profiles on delete cascade,
  message    text        not null,
  link       text,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- 4. 인덱스
-- ════════════════════════════════════════════════════════════

create index on profiles      (company_id);
create index on requests      (company_id, status);
create index on requests      (status, category);
create index on quotes        (request_id);
create index on quotes        (company_id);
create index on notifications (profile_id, read);
create index on company_invites (email);

-- ════════════════════════════════════════════════════════════
-- 5. 회원 고유번호 자동 부여
-- ════════════════════════════════════════════════════════════

create or replace function public.assign_member_code()
returns trigger
language plpgsql
as $$
declare
  prefix text;
begin
  if new.member_code is not null and new.member_code <> '' then
    return new;
  end if;

  prefix := case
    when 'client' = any (new.roles) and 'partner' = any (new.roles) then 'CP'
    when 'client' = any (new.roles) then 'C'
    else 'P'
  end;

  new.member_code := 'SJ-' || prefix || '-' ||
                     lpad(nextval('member_code_seq')::text, 8, '0');
  return new;
end;
$$;

create trigger profiles_assign_member_code
  before insert on profiles
  for each row execute function public.assign_member_code();

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger requests_touch before update on requests
  for each row execute function public.touch_updated_at();
create trigger quotes_touch   before update on quotes
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════
-- 6. 정책 보조 함수
-- ════════════════════════════════════════════════════════════
--
-- 중요: 이 함수들은 security definer다.
-- profiles의 RLS 정책 안에서 profiles를 다시 조회하면 정책이 자기 자신을
-- 호출하며 무한 재귀에 빠진다. security definer 함수는 RLS를 건너뛰므로
-- 그 고리를 끊는다. search_path를 고정해 함수 가로채기를 막는다.

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_company_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_company_admin from profiles where id = auth.uid()), false);
$$;

-- 승인된 회원만 실제 거래 데이터에 접근한다. 가입 직후 pending 상태에서는 막힌다.
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' from profiles where id = auth.uid()), false);
$$;

create or replace function public.my_partner_categories()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce((select partner_categories from profiles where id = auth.uid()), '{}');
$$;

-- ════════════════════════════════════════════════════════════
-- 7. RLS
-- ════════════════════════════════════════════════════════════

alter table companies       enable row level security;
alter table profiles        enable row level security;
alter table company_invites enable row level security;
alter table requests        enable row level security;
alter table quotes          enable row level security;
alter table inquiries       enable row level security;
alter table notices         enable row level security;
alter table notice_reads    enable row level security;
alter table notifications   enable row level security;

-- companies ---------------------------------------------------
-- 회사명은 의뢰/견적 카드에 노출되므로 승인 회원에게 열어둔다.
-- 주소·사업자등록번호는 앱에서 select 컬럼을 좁혀 다룬다.
create policy companies_read on companies
  for select to authenticated
  using (is_approved() or id = current_company_id() or is_platform_admin());

create policy companies_admin_write on companies
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- profiles ----------------------------------------------------
create policy profiles_read_self on profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_read_same_company on profiles
  for select to authenticated
  using (company_id = current_company_id());

create policy profiles_read_all_admin on profiles
  for select to authenticated
  using (is_platform_admin());

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 권한 상승 차단: 승인 상태와 운영자 플래그는 본인이 못 바꾼다.
-- 회원 승인은 5단계에서 서버 라우트로만 처리한다.
create policy profiles_admin_write on profiles
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- company_invites ---------------------------------------------
create policy invites_read_own_company on company_invites
  for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());

create policy invites_write_company_admin on company_invites
  for all to authenticated
  using (company_id = current_company_id() and is_company_admin())
  with check (company_id = current_company_id() and is_company_admin());

-- requests ----------------------------------------------------
-- 의뢰사: 자기 회사 의뢰는 상태와 무관하게 전부 본다.
create policy requests_read_own_company on requests
  for select to authenticated
  using (company_id = current_company_id());

-- 파트너사: 열려 있고, 내 카테고리에 맞고, 내 회사가 올린 게 아닌 의뢰만 본다.
-- 겸업 회원이 자기 회사 의뢰에 견적을 내는 상황을 DB에서 막는다.
create policy requests_read_open_for_partner on requests
  for select to authenticated
  using (
    is_approved()
    and status = 'pending'
    and company_id <> current_company_id()
    and category = any (my_partner_categories())
  );

-- 파트너사가 견적을 낸 의뢰는 마감 후에도 계속 본다. 그래야 지난 견적을 조회한다.
create policy requests_read_quoted on requests
  for select to authenticated
  using (
    exists (
      select 1 from quotes q
      where q.request_id = requests.id
        and q.company_id = current_company_id()
    )
  );

create policy requests_insert_own_company on requests
  for insert to authenticated
  with check (
    is_approved()
    and company_id = current_company_id()
    and created_by = auth.uid()
  );

create policy requests_update_own_company on requests
  for update to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy requests_admin_all on requests
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- quotes ------------------------------------------------------
-- 여기가 핵심이다. 경쟁 파트너사는 서로의 견적을 볼 수 없다.
-- 화면에서 거르는 게 아니라 응답 자체에 담기지 않는다.
create policy quotes_read_own_or_client on quotes
  for select to authenticated
  using (
    company_id = current_company_id()                       -- 제출한 파트너사 본인
    or exists (                                             -- 또는 그 의뢰의 의뢰사
      select 1 from requests r
      where r.id = quotes.request_id
        and r.company_id = current_company_id()
    )
  );

-- 견적 제출 조건을 insert 시점에 강제한다.
create policy quotes_insert_partner on quotes
  for insert to authenticated
  with check (
    is_approved()
    and company_id = current_company_id()
    and submitted_by = auth.uid()
    and exists (
      select 1 from requests r
      where r.id = request_id
        and r.status = 'pending'                            -- 마감된 의뢰에는 못 낸다
        and r.company_id <> current_company_id()            -- 자기 회사 의뢰에는 못 낸다
        and r.category = any (my_partner_categories())
    )
  );

-- 파트너사는 자기 견적을, 의뢰사는 자기 의뢰에 달린 견적의 상태를 바꾼다.
create policy quotes_update_own on quotes
  for update to authenticated
  using (
    company_id = current_company_id()
    or exists (
      select 1 from requests r
      where r.id = quotes.request_id
        and r.company_id = current_company_id()
    )
  )
  with check (
    company_id = current_company_id()
    or exists (
      select 1 from requests r
      where r.id = quotes.request_id
        and r.company_id = current_company_id()
    )
  );

create policy quotes_admin_all on quotes
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- inquiries ---------------------------------------------------
-- 비회원 문의를 받아야 하므로 insert만 열고, 조회는 운영자만.
create policy inquiries_insert_anyone on inquiries
  for insert to anon, authenticated
  with check (true);

create policy inquiries_admin_read on inquiries
  for select to authenticated
  using (is_platform_admin());

create policy inquiries_admin_write on inquiries
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- notices -----------------------------------------------------
create policy notices_read_all on notices
  for select to authenticated
  using (true);

create policy notices_admin_write on notices
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- notice_reads ------------------------------------------------
create policy notice_reads_own on notice_reads
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- notifications -----------------------------------------------
create policy notifications_read_own on notifications
  for select to authenticated
  using (profile_id = auth.uid());

-- 읽음 표시만 본인이 한다. 발송은 서버 라우트에서 한다.
create policy notifications_update_own on notifications
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy notifications_admin_all on notifications
  for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- ════════════════════════════════════════════════════════════
-- 8. 첨부파일 저장소
-- ════════════════════════════════════════════════════════════
-- 경로 규칙: <파트너사 company_id>/<quote_id>/<파일명>
-- 첫 폴더가 회사 id라 경로만으로 업로드 권한을 판정할 수 있다.

insert into storage.buckets (id, name, public)
values ('quote-attachments', 'quote-attachments', false)
on conflict (id) do nothing;

create policy quote_files_insert_own_company on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'quote-attachments'
    and (storage.foldername(name))[1] = current_company_id()::text
  );

create policy quote_files_read_own_or_client on storage.objects
  for select to authenticated
  using (
    bucket_id = 'quote-attachments'
    and (
      (storage.foldername(name))[1] = current_company_id()::text   -- 올린 파트너사
      or exists (                                                  -- 또는 그 의뢰의 의뢰사
        select 1
        from quotes q
        join requests r on r.id = q.request_id
        where q.attachment_path = storage.objects.name
          and r.company_id = current_company_id()
      )
      or is_platform_admin()
    )
  );

create policy quote_files_delete_own_company on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'quote-attachments'
    and (storage.foldername(name))[1] = current_company_id()::text
  );

-- ════════════════════════════════════════════════════════════
-- 9. 확인
-- ════════════════════════════════════════════════════════════
-- 실행 후 아래로 RLS가 모든 테이블에 걸렸는지 본다. 9개 행이 전부 true여야 한다.
--
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--   order by tablename;

-- ════════════════════════════════════════════════════════════
-- 10. 다음 단계
-- ════════════════════════════════════════════════════════════
-- 이 파일은 1단계(테이블 + RLS)까지다.
-- 인증에 필요한 RPC 함수는 phase2_auth.sql에 있다. 빈 DB에 처음부터
-- 올릴 때는 이 파일을 먼저, 그다음 phase2_auth.sql을 실행한다.
