-- 46단계: 분야별 "견적 대기중" 집계
--
-- 메인 화면에 전광판을 띄운다. 분야마다 지금 견적을 기다리는 의뢰가 몇
-- 건인지 보여 주는 것이다. 파트너사가 될 사람에게 "여기 일이 있다"고
-- 말하는 자리다.
--
-- 왜 함수로 하는가.
--
-- requests는 RLS로 묶여 있다. 비회원은 한 줄도 못 읽고, 파트너사도 자기
-- 분야만 본다. 그게 맞다 — 의뢰 제목과 내용은 남의 사업 계획이다.
-- 그런데 전광판에 필요한 것은 숫자뿐이다. 그래서 숫자만 돌려주는 문을
-- 따로 낸다. 제목도, 회사도, 예산도 나가지 않는다.
--
-- 마감일이 지난 것은 세지 않는다. 지금 운영에 보름 지난 건이 'pending'
-- 으로 떠 있다. 그런 것까지 세면 전광판이 "기다리는 일이 있다"고 거짓말을
-- 하고, 그걸 보고 가입한 파트너사가 들어와서 빈손으로 돌아간다.
--
-- 반환 칸 이름을 category가 아니라 cat으로 둔다. 테이블 칸과 이름이 겹치면
-- 함수 안에서 모호해질 수 있고, 43단계에서 바로 그것(42702)으로 데였다.
-- 겹치지 않게 지어 두면 애초에 생기지 않을 일이다.

create or replace function public.open_request_counts()
returns table (cat text, cnt bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.category, count(*)
  from requests r
  where r.status = 'pending'
    and (r.deadline is null or r.deadline >= current_date)
  group by r.category
  order by count(*) desc, r.category;
$$;

-- 함수는 기본으로 PUBLIC에 실행 권한이 붙는다. 먼저 떼고 필요한 쪽에만
-- 준다. 비회원도 봐야 하므로 anon에 준다 — 나가는 것은 분야 이름과
-- 숫자뿐이다.
revoke execute on function public.open_request_counts() from public;
grant execute on function public.open_request_counts() to anon, authenticated;

-- ── 확인 ────────────────────────────────────────────────────
-- 적용한 뒤 반드시 한 번 불러 봐야 한다. "Success"는 함수가 돈다는 뜻이
-- 아니다.
--
--   select * from public.open_request_counts();
--
-- 마감 지난 것이 빠졌는지 (위 결과와 숫자가 달라야 정상이다):
--
--   select category, count(*) from requests
--    where status = 'pending' group by category;
