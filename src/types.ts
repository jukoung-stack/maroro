export type MoodType = '설렘' | '힐링' | '모험' | '먹방' | '낭만' | '휴식';
export type WeatherType = '맑음' | '구름조금' | '비' | '눈' | '바람' | '별빛';

export interface TravelDiary {
  id: string;
  title: string;
  destination: string;
  region: string; // e.g. '국내' | '아시아' | '유럽' | '미주' 등
  date: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  images: string[];
  content: string;
  mood: MoodType;
  weather: WeatherType;
  rating: number; // 1 - 5
  tags: string[];
  highlight?: string; // 한 줄 요약
  companions?: string; // 여행 동반자
  lat?: number;
  lng?: number;
  createdAt: number;
}

export type ViewMode = 'timeline' | 'grid' | 'map';
