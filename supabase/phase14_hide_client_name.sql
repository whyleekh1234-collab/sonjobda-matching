-- 손잡다매칭 14단계: 매칭 전 의뢰사명 비공개
--
-- ▶ 통째로 실행. 여러 번 돌려도 안전하다.
--
-- 지금까지 companies는 승인 회원이면 누구나 읽을 수 있었다(companies_read).
-- 그래서 파트너사가 의뢰 카드에서 의뢰사 이름을 그대로 봤다. 운영정책
-- 제5조 ②의 취지대로, 회사 이름도 상대에게 보이는 조건을 둔다:
--
--   - 내 회사, 운영자는 항상
--   - 의뢰사 → 내 의뢰에 견적을 낸 파트너사는 보인다 (견적 비교에 필요)
--   - 파트너사 → 내 견적이 수락된 의뢰의 의뢰사만 보인다
--
-- 그 밖의 회사는 행 자체가 안 보인다. 조인해서 가져오면 null로 온다.

create or replace function public.can_see_company(p_company uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_company = current_company_id()
      or is_platform_admin()
      or exists (
        select 1 from quotes q join requests r on r.id = q.request_id
        where q.company_id = p_company and r.company_id = current_company_id()
      )
      or exists (
        select 1 from quotes q join requests r on r.id = q.request_id
        where r.company_id = p_company
          and q.company_id = current_company_id()
          and q.status = 'accepted'
      );
$$;
grant execute on function public.can_see_company to authenticated;

drop policy if exists companies_read on companies;
create policy companies_read on companies
  for select to authenticated
  using (can_see_company(id));

-- 확인: 파트너 계정으로
--   select name from companies;
-- 하면 자기 회사(와 수락된 의뢰의 의뢰사)만 나와야 한다.
