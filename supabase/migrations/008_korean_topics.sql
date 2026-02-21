-- 008_korean_topics.sql — 한국어 토론 주제 54개 삽입
-- 기존 영어 주제가 있다면 비활성화 후 한국어 주제 삽입

UPDATE public.topics SET is_active = FALSE WHERE topic ~ '^[A-Z]';

INSERT INTO public.topics (topic, category, difficulty, is_active) VALUES
  -- ─── CASUAL ───
  ('안드로이드가 아이폰보다 낫다', 'technology', 'casual', TRUE),
  ('들여쓰기는 탭이 스페이스보다 낫다', 'technology', 'casual', TRUE),
  ('AI가 만든 작품도 진정한 예술로 인정해야 한다', 'technology', 'casual', TRUE),
  ('파인애플은 피자 토핑이 될 자격이 있다', 'culture', 'casual', TRUE),
  ('책이 영화보다 낫다', 'culture', 'casual', TRUE),
  ('아침형 인간이 야행성 인간보다 더 생산적이다', 'culture', 'casual', TRUE),
  ('개가 고양이보다 좋은 반려동물이다', 'psychology', 'casual', TRUE),
  ('재택근무가 사무실 출근보다 낫다', 'psychology', 'casual', TRUE),
  ('여름이 사계절 중 최고다', 'psychology', 'casual', TRUE),
  ('현금이 카드 결제보다 낫다', 'economics', 'casual', TRUE),
  ('집을 사는 것보다 임대가 현명한 선택이다', 'economics', 'casual', TRUE),
  ('상처를 주지 않기 위한 선의의 거짓말은 괜찮다', 'ethics', 'casual', TRUE),
  ('학교 숙제는 폐지해야 한다', 'ethics', 'casual', TRUE),

  -- ─── STANDARD ───
  ('민주주의 국가에서 투표는 의무화되어야 한다', 'politics', 'standard', TRUE),
  ('기본소득이 기존 복지 시스템을 대체해야 한다', 'politics', 'standard', TRUE),
  ('모든 선출직에 임기 제한을 적용해야 한다', 'politics', 'standard', TRUE),
  ('SNS는 사회에 득보다 해를 끼쳤다', 'technology', 'standard', TRUE),
  ('자율주행차는 모든 공공도로에서 허용되어야 한다', 'technology', 'standard', TRUE),
  ('오픈소스가 결국 독점 소프트웨어를 대체할 것이다', 'technology', 'standard', TRUE),
  ('스마트폰은 우리를 점점 더 멍청하게 만들고 있다', 'technology', 'standard', TRUE),
  ('우주 식민지화는 인류의 최우선 과제여야 한다', 'science', 'standard', TRUE),
  ('인간 유전자 편집은 광범위하게 허용되어야 한다', 'science', 'standard', TRUE),
  ('원자력은 기후변화 대응에 필수적이다', 'science', 'standard', TRUE),
  ('암호화폐가 결국 법정화폐를 대체할 것이다', 'economics', 'standard', TRUE),
  ('세계화는 선진국보다 개발도상국에 더 유리하다', 'economics', 'standard', TRUE),
  ('긱 이코노미는 노동자를 강화시키기보다 착취한다', 'economics', 'standard', TRUE),
  ('캔슬 컬처는 득보다 해가 더 많다', 'culture', 'standard', TRUE),
  ('e스포츠는 진정한 스포츠로 공식 인정받아야 한다', 'culture', 'standard', TRUE),
  ('SNS 인플루언서는 여론에 지나치게 큰 영향력을 갖고 있다', 'culture', 'standard', TRUE),
  ('개인 프라이버시가 국가 안보보다 중요하다', 'ethics', 'standard', TRUE),
  ('AI가 생사의 결정을 내리는 것은 윤리적이다', 'ethics', 'standard', TRUE),
  ('동물은 인간과 동등한 도덕적 대우를 받아야 한다', 'ethics', 'standard', TRUE),
  ('SNS 중독은 정신 질환으로 분류되어야 한다', 'psychology', 'standard', TRUE),
  ('성공에는 IQ보다 감성 지능이 더 중요하다', 'psychology', 'standard', TRUE),
  ('행복은 상황이 아니라 선택의 문제다', 'psychology', 'standard', TRUE),
  ('환경 변화에는 정부 정책보다 개인의 실천이 더 효과적이다', 'environment', 'standard', TRUE),
  ('제조 과정까지 고려하면 전기차는 진정으로 친환경적이지 않다', 'environment', 'standard', TRUE),
  ('산업혁명은 인류에게 전반적으로 유익했다', 'history', 'standard', TRUE),
  ('역사는 승자가 쓰는 것이므로 객관성이 없다', 'history', 'standard', TRUE),

  -- ─── ADVANCED ───
  ('민주주의는 가장 효과적인 통치 형태다', 'politics', 'advanced', TRUE),
  ('현대 세계에서 민족주의는 득보다 해가 많다', 'politics', 'advanced', TRUE),
  ('자유의지는 환상이다', 'philosophy', 'advanced', TRUE),
  ('트롤리 딜레마는 공리주의 사고의 근본적 결함을 드러낸다', 'philosophy', 'advanced', TRUE),
  ('의식은 물리적 과정만으로는 설명될 수 없다', 'philosophy', 'advanced', TRUE),
  ('도덕 상대주의는 그 자체로 자멸적인 철학적 입장이다', 'philosophy', 'advanced', TRUE),
  ('과학적 방법론만이 지식을 얻는 유일하게 신뢰할 수 있는 방법이다', 'science', 'advanced', TRUE),
  ('범용 인공지능은 20년 안에 실현될 것이다', 'science', 'advanced', TRUE),
  ('자본주의는 빈곤 감소를 위한 최선의 경제 체제다', 'economics', 'advanced', TRUE),
  ('탈성장만이 생태 위기의 실현 가능한 해결책이다', 'environment', 'advanced', TRUE),
  ('잊힐 권리는 정보의 자유보다 우선해야 한다', 'ethics', 'advanced', TRUE),
  ('유전자 강화는 계층 간 돌이킬 수 없는 불평등을 낳을 것이다', 'ethics', 'advanced', TRUE),
  ('식민주의의 부정적 영향은 그것이 가져온 근대화를 압도한다', 'history', 'advanced', TRUE),
  ('성격 형성에 있어 환경보다 본성이 더 중요하다', 'psychology', 'advanced', TRUE),
  ('''정신 질환'' 개념은 의학적 실재가 아니라 사회적 구성물이다', 'psychology', 'advanced', TRUE)

ON CONFLICT DO NOTHING;
