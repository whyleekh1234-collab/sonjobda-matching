-- 23단계: 분야 이름 변경 — "임상시험 보험" → "기업보험"
--
-- 보험 분야를 임상시험에 한정하지 않고 책임보험·생산물보험·단체보험까지
-- 넓혔다. 임상시험 보험은 그중 하나가 된다.
--
-- partner_categories는 enum이 아니라 text[]라 스키마를 바꿀 것은 없고,
-- 이미 쌓인 값만 고치면 된다. 이름이 어긋나면 그 파트너사는 자기 분야의
-- 의뢰를 못 받게 되므로(목록이 이름으로 걸러진다) 반드시 함께 돌려야 한다.
--
-- 새로 생긴 "원료·첨가제 공급"은 옮겨올 과거 값이 없어 손댈 것이 없다.

update profiles
set partner_categories = array_replace(partner_categories, '임상시험 보험', '기업보험')
where '임상시험 보험' = any (partner_categories);

-- 의뢰에도 분야가 박혀 있다.
update requests
set category = '기업보험'
where category = '임상시험 보험';

-- 견적은 제출 시점의 분야를 details에 복사해 둔다(phase12).
update quotes
set details = jsonb_set(
      details,
      '{partnerCategories}',
      (select jsonb_agg(case when value::text = '"임상시험 보험"' then '"기업보험"'::jsonb else value end)
       from jsonb_array_elements(details->'partnerCategories'))
    )
where details ? 'partnerCategories'
  and details->'partnerCategories' @> '"임상시험 보험"';

-- ── 확인 ────────────────────────────────────────────────────
-- select count(*) from profiles where '임상시험 보험' = any (partner_categories);  -- 0이어야 한다
-- select count(*) from requests where category = '임상시험 보험';                  -- 0이어야 한다
