-- 27단계: 강점 한 줄 길이 제한
--
-- 화면에서는 100자를 넘기지 못하게 막아 두었지만, 그것만으로는 부족하다.
-- 테이블에 update 권한이 있는 회원은 API로 값을 직접 넣을 수 있고, 그러면
-- 의뢰사 목록의 카드 한 장이 수십 줄로 늘어나 비교 화면이 무너진다.
--
-- 100자로 잡은 이유: 카드에서 두 줄 안에 들어가는 길이다. 그보다 길면
-- 카드 높이가 제각각이 되어 여러 파트너사를 나란히 놓고 보기 어려워진다.
--
-- 기존 값 중 100자를 넘는 것이 있으면 제약을 걸 수 없다. 먼저 줄인다.
-- (지금은 없지만, 빈 DB에 순서대로 적용할 때를 위해 남겨 둔다.)
update partner_profiles
set intro = left(intro, 100)
where intro is not null and char_length(intro) > 100;

alter table partner_profiles
  drop constraint if exists partner_profiles_intro_len;

alter table partner_profiles
  add constraint partner_profiles_intro_len
  check (intro is null or char_length(intro) <= 100);

comment on column partner_profiles.intro is
  '강점 한 줄. 100자 이하. 의뢰사 목록 카드에서 두 줄 안에 들어가야 한다.';

-- 확인
-- select char_length(intro), intro from partner_profiles order by 1 desc limit 5;
