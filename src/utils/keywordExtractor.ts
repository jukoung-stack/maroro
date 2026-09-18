// Korean place and travel location keyword extractor from title & destination

// Common known locations in Korea & abroad
const KNOWN_PLACES = [
  // 국내
  '양양', '죽도해변', '인구해변', '하조대', '낙산사', '설악산', '속초', '강릉', '경포대', '안목해변',
  '정동진', '동해', '삼척', '평창', '원주', '춘천', '남이섬', '가평', '단양', '제천',
  '제주도', '제주', '서귀포', '성산일출봉', '성산', '우도', '한라산', '협재', '함덕', '애월',
  '사려니숲길', '중문', '섭지코지', '비자림', '산방산', '송악산',
  '부산', '해운대', '광안리', '광안대교', '송도', '영도', '태종대', '기장', '청사포', '자갈치',
  '경주', '황리단길', '대릉원', '첨성대', '불국사', '석굴암', '동궁과월지', '안압지', '보문단지',
  '대전', '소제동', '한빛탑', '엑스포', '유성', '대청호', '식장산',
  '여수', '오동도', '향일암', '돌산도', '순천', '순천만', '국가정원', '남해', '독일마을', '보리암',
  '통영', '동피랑', '거제', '바람의언덕', '외도', '포항', '호미곶', '영일대', '울릉도', '독도',
  '전주', '한옥마을', '군산', '선유도', '목포', '유달산', '담양', '죽녹원', '보성', '녹차밭',
  '서울', '경복궁', '창덕궁', '북촌', '인사동', '명동', '남산', '홍대', '성수동', '한강', '여의도',
  '수원', '화성행궁', '인천', '차이나타운', '송도', '월미도', '강화도',

  // 해외
  '일본', '교토', '청수사', '기요미즈데라', '기온', '도쿄', '시부야', '신주쿠', '아사쿠사', '오사카', '도톤보리',
  '후쿠오카', '유후인', '삿포로', '오타루', '오키나와',
  '스위스', '인터라켄', '융프라우', '융프라우요흐', '체르마트', '마테호른', '그린델발트', '루체른', '취리히',
  '프랑스', '파리', '에펠탑', '루브르', '이탈리아', '로마', '콜로세움', '피렌체', '베네치아',
  '영국', '런던', '빅벤', '스페인', '바르셀로나', '사그라다파밀리아', '마드리드',
  '베트남', '다낭', '호이안', '나트랑', '푸꾸옥', '하노이', '태국', '방콕', '치앙마이', '푸켓',
  '인도네시아', '발리', '싱가포르', '마리나베이', '대만', '타이베이', '지우펀',
  '미국', '하와이', '와이키키', '괌', '사이판', '뉴욕', '맨해튼', '샌프란시스코', 'LA', '로스앤젤레스'
];

// Stopwords that should not be considered place names
const STOPWORDS = new Set([
  '여행', '트립', '투어', '여정', '휴가', '방문', '산책', '나들이', '추억', '기록', '순간', '하루',
  '소리', '바람', '바다', '하늘', '노을', '야경', '풍경', '여명', '단풍', '눈꽃', '세상', '골목',
  '골목길', '카페', '거리', '감성', '감상', '힐링', '모험', '설렘', '낭만', '휴식', '먹방', '최고',
  '행복', '즐거운', '시원한', '푸른', '황금빛', '고즈넉한', '하얀', '선선한', '따뜻한', '함께'
]);

/**
 * Extracts candidate place keywords from a travel title and optional destination.
 */
export function extractPlaceKeywords(title: string, destination?: string): string[] {
  const candidates: string[] = [];

  // 1. If destination is explicitly provided, clean it and prioritize it
  if (destination && destination.trim()) {
    const destCleaned = destination.replace(/[&,·]/g, ' ').trim();
    const destParts = destCleaned.split(/\s+/).filter(Boolean);
    if (destParts.length > 0) {
      candidates.push(destParts.slice(0, 2).join(' ')); // e.g. "강원도 양양" or "양양 죽도해변"
      candidates.push(...destParts);
    }
  }

  // 2. Search known places in title
  const normalizedTitle = title.replace(/[^\w\s가-힣]/g, ' ');
  for (const place of KNOWN_PLACES) {
    if (title.includes(place)) {
      candidates.push(place);
    }
  }

  // 3. Heuristic: Find Korean words ending in typical place suffixes
  // e.g. 해변, 해수욕장, 산, 봉, 사, 궁, 탑, 단지, 마을, 섬, 도, 시, 군, 구, 역, 로, 길
  const placeSuffixRegex = /[가-힣]{2,}(해변|해수욕장|봉|사|궁|탑|단지|마을|역|거리|공원|호|대|리|동|읍|면|시|군|구|도)/g;
  let match;
  while ((match = placeSuffixRegex.exec(normalizedTitle)) !== null) {
    const matchedWord = match[0];
    if (!STOPWORDS.has(matchedWord) && matchedWord.length >= 2) {
      candidates.push(matchedWord);
    }
  }

  // 4. Tokenize title words and add non-stopword tokens of length >= 2
  const tokens = normalizedTitle.split(/\s+/).filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  for (const token of tokens) {
    if (!candidates.includes(token)) {
      candidates.push(token);
    }
  }

  // Deduplicate and filter
  const unique = Array.from(new Set(candidates))
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !STOPWORDS.has(s));

  return unique.slice(0, 6);
}

/**
 * Returns the single best place search query from title and destination
 */
export function getPrimaryPlaceQuery(title: string, destination?: string): string {
  const keywords = extractPlaceKeywords(title, destination);
  if (destination && destination.trim()) {
    // If destination exists, combine destination + top title keyword if different
    const destClean = destination.split('&')[0].trim();
    return destClean;
  }
  if (keywords.length > 0) {
    // Pick first two relevant keywords joined
    return keywords.slice(0, 2).join(' ');
  }
  return title.slice(0, 15).trim();
}
