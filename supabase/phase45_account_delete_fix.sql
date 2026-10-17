-- 45단계: 탈퇴가 막혀 있다
--
-- 무슨 일이 있었나.
--
-- Supabase가 플랫폼 차원에서 storage 테이블의 직접 삭제를 막았다. 행을
-- 지워도 실제 파일은 저장소에 남기 때문이다 — 행만 사라지고 바이트는
-- 그대로인 "주인 없는 객체"가 생긴다. 그래서 Storage API를 쓰라고 한다.
--
-- 40단계의 delete_my_account는 마지막 멤버가 나갈 때 바로 그 방식으로
-- 서류를 파기했다. 그래서 지금은 이렇게 된다:
--
--   탈퇴  HTTP 403
--   42501  Direct deletion from storage tables is not allowed.
--   계정: 남아 있다
--
-- **회사의 마지막 멤버는 탈퇴할 수 없다.** 운영정책 제7조 ①이 "언제든지
-- 탈퇴할 수 있다"고 적어 둔 그 기능이다. 짐작이 아니라 시험 계정을 만들어
-- 실제로 불러 보고 확인했다.
--
-- 어떻게 고치나.
--
-- 함수 안에서는 파일을 지울 수 없다. 트리거를 붙여도 마찬가지다 — 결국
-- 같은 구문이다. 그러니 파기는 Storage API를 쓸 수 있는 서버 라우트로
-- 옮긴다(`/api/account/delete`).
--
-- 다만 "누구 서류를 파기해야 하는가"는 이 함수만 안다. 지우고 나면
-- 프로필이 사라져 밖에서는 알 수 없다. 그래서 반환값을 바꾼다 —
-- 마지막 멤버였으면 그 회사 id를, 아니면 null을 준다. 라우트는 그것만
-- 보고 파기한다.
--
-- 반환형이 바뀌므로 create or replace로는 안 되고 먼저 지워야 한다.

drop function if exists public.delete_my_account();

create or replace function public.delete_my_account()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_me        profiles;
  v_heir      uuid;
  v_remaining int;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null then
    -- 프로필이 없어도 계정은 지울 수 있어야 한다. 중간에 끊긴 가입이 있다.
    delete from auth.users where id = auth.uid();
    return null;
  end if;

  select count(*) into v_remaining
  from profiles where company_id = v_me.company_id and id <> v_me.id;

  if v_remaining > 0 then
    -- 담당 관리자가 나가면 남은 사람 중 가장 먼저 들어온 이에게 넘긴다.
    -- 비워 두면 그 회사는 멤버 초대도, 회사정보 변경 요청도 못 하게 되고,
    -- 고쳐 달라고 말할 길부터 막힌다.
    if v_me.is_company_admin then
      select id into v_heir
      from profiles
      where company_id = v_me.company_id and id <> v_me.id
      order by created_at
      limit 1;

      update profiles set is_company_admin = true where id = v_heir;
    end if;

    delete from auth.users where id = auth.uid();
    return null;
  end if;

  -- 마지막 한 사람이다. 회사에 달린 서류를 파기해야 한다.
  --
  -- 운영정책 제1조 ②와 개인정보처리방침이 "회원 탈퇴 시 파기한다"고
  -- 밝힌 것들이다. 보존 의무가 있는 것은 의뢰·견적이지 이 서류가 아니다.
  --
  -- 회사 행 자체는 남긴다. 지우면 남은 거래 기록이 어느 회사 것인지
  -- 알 수 없게 된다. 이름과 사업자등록번호만 남고 서류는 사라진다.
  --
  -- 파일을 치우는 일은 여기서 못 한다. 가리키는 칸만 비우고, 회사 id를
  -- 돌려주어 라우트가 Storage API로 지우게 한다. 칸을 먼저 비우는 이유는
  -- 관리자 화면이 companies.license_path로 링크를 만들기 때문이다 — 남겨
  -- 두면 열 수 없는 링크를 계속 내민다.
  update companies
  set license_path            = null,
      license_name            = null,
      license_uploaded_at     = null,
      logo_path               = null,
      profile_doc_path        = null,
      profile_doc_name        = null,
      profile_doc_uploaded_at = null
  where id = v_me.company_id;

  -- 역량 소개도 사람이 적은 글이라 함께 지운다.
  delete from partner_profiles where company_id = v_me.company_id;

  v_heir := v_me.company_id;
  delete from auth.users where id = auth.uid();
  return v_heir;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- 이 파일을 적용한 뒤 반드시 한 번 불러 봐야 한다. plpgsql은 본문을 만들
-- 때 검사하지 않으므로 "Success"는 함수가 돈다는 뜻이 아니다. 43단계에서
-- 같은 자리에 데였다.
--
-- 반환형이 바뀌었는지:
--
--   select pg_get_function_result('public.delete_my_account()'::regprocedure);
--   -- uuid 여야 한다
--
-- 멤버가 없는데 서류 칸이 남은 회사가 있는지 (0줄이어야 한다):
--
--   select c.name, c.license_path
--     from companies c
--    where c.license_path is not null
--      and not exists (select 1 from profiles p where p.company_id = c.id);
