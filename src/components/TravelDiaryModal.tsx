import React, { useState, useMemo } from 'react';
import { X, Image as ImageIcon, MapPin, Calendar, Star, Upload, Sparkles, Quote, RotateCw, Check } from 'lucide-react';
import { MoodType, TravelDiary, WeatherType } from '../types';
import { GoogleRecommendedPhotos } from './GoogleRecommendedPhotos';
import { getEmotionalHighlights, getHighlightPlaceholder } from '../utils/highlightSuggestions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (diary: TravelDiary) => void;
  initialData?: TravelDiary | null;
}

const MOODS: { label: MoodType; emoji: string }[] = [
  { label: '설렘', emoji: '✨' },
  { label: '힐링', emoji: '🌿' },
  { label: '모험', emoji: '🧭' },
  { label: '먹방', emoji: '🍽️' },
  { label: '낭만', emoji: '🌙' },
  { label: '휴식', emoji: '☕' },
];

const WEATHERS: { label: WeatherType; icon: string }[] = [
  { label: '맑음', icon: '☀️' },
  { label: '구름조금', icon: '⛅' },
  { label: '비', icon: '🌧️' },
  { label: '눈', icon: '❄️' },
  { label: '바람', icon: '🍃' },
  { label: '별빛', icon: '✨' },
];

const PRESET_SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=1000&q=80',
];

export const TravelDiaryModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [destination, setDestination] = useState(initialData?.destination || '');
  const [region, setRegion] = useState(initialData?.region || '국내');
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const [highlight, setHighlight] = useState(initialData?.highlight || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [mood, setMood] = useState<MoodType>(initialData?.mood || '설렘');
  const [weather, setWeather] = useState<WeatherType>(initialData?.weather || '맑음');
  const [rating, setRating] = useState<number>(initialData?.rating || 5);
  const [companions, setCompanions] = useState(initialData?.companions || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(
    initialData?.tags || ['여행', '기록']
  );
  const [images, setImages] = useState<string[]>(
    initialData?.images || [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80'
    ]
  );
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [lat, setLat] = useState<number | undefined>(initialData?.lat);
  const [lng, setLng] = useState<number | undefined>(initialData?.lng);

  // Emotional highlight suggestions based on title and destination
  const [highlightOffset, setHighlightOffset] = useState(0);

  const suggestedHighlights = useMemo(() => {
    return getEmotionalHighlights(title, destination);
  }, [title, destination]);

  const placeholderHighlight = useMemo(() => {
    return getHighlightPlaceholder(title, destination);
  }, [title, destination]);

  // Display 3 tailored recommendations at a time, cyclic with offset
  const displayedHighlights = useMemo(() => {
    if (suggestedHighlights.length <= 3) return suggestedHighlights;
    const start = highlightOffset % suggestedHighlights.length;
    const sliced = suggestedHighlights.slice(start, start + 3);
    if (sliced.length < 3) {
      return [...sliced, ...suggestedHighlights.slice(0, 3 - sliced.length)];
    }
    return sliced;
  }, [suggestedHighlights, highlightOffset]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages([...images, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddGooglePhoto = (photoUrl: string) => {
    // If there's only 1 default placeholder and it's a new diary, replace it
    if (
      images.length === 1 && 
      images[0].includes('unsplash.com/photo-1507525428034-b723cf961d3e') && 
      !initialData
    ) {
      setImages([photoUrl]);
    } else if (!images.includes(photoUrl)) {
      setImages((prev) => [...prev, photoUrl]);
    }
  };

  const handleSetCoordinates = (extractedLat: number, extractedLng: number) => {
    if (lat === undefined || lng === undefined) {
      setLat(extractedLat);
      setLng(extractedLng);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim() || !date) return;

    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    const newDiary: TravelDiary = {
      id: initialData?.id || `travel-${Date.now()}`,
      title: title.trim(),
      destination: destination.trim(),
      region: region.trim() || '국내',
      date,
      year,
      month,
      day,
      images: images.length > 0 ? images : [PRESET_SAMPLE_PHOTOS[0]],
      content: content.trim() || '소중한 여행의 기억을 남깁니다.',
      mood,
      weather,
      rating,
      tags: tags.length > 0 ? tags : [destination],
      highlight: highlight.trim() || '잊지 못할 여정의 순간',
      companions: companions.trim() || '혼자만의 여행',
      lat: lat ?? 37.5665,
      lng: lng ?? 126.9780,
      createdAt: initialData?.createdAt || Date.now(),
    };

    onSave(newDiary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        id="travel-diary-modal"
        className="bg-[#221a15] rounded-2xl border border-[#44352b] shadow-2xl w-full max-w-2xl my-auto overflow-hidden flex flex-col max-h-[92vh] text-[#e8ded4] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#2a2019] border-b border-[#3e3026] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#f7f0e9] tracking-tight">
              {initialData ? '여행 일기 수정' : '새로운 여행 기록 작성'}
            </h2>
            <p className="text-xs text-[#b8a798] mt-0.5">
              여행지의 사진과 순간의 감상을 타임라인에 등록합니다.
            </p>
          </div>
          <button
            id="close-diary-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#362a22] hover:bg-[#44352b] text-[#b8a798] hover:text-[#faf5f0] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-[#e8ded4] text-sm">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#b8a798] mb-1.5">
              여행 일기 제목 *
            </label>
            <input
              id="diary-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 푸른 동해 바다와 양양 서핑 트립"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-[#ede2d6] placeholder-[#8d7c6f] focus:border-[#d6c7b8] focus:ring-1 focus:ring-[#d6c7b8] outline-none transition-all text-sm"
            />
          </div>

          {/* Date, Destination, Region, Companion Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#b8a798] mb-1.5">
                여행 일자 *
              </label>
              <input
                id="diary-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-[#ede2d6] focus:border-[#d6c7b8] focus:ring-1 focus:ring-[#d6c7b8] outline-none transition-all text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#b8a798] mb-1.5">
                여행지 / 장소 *
              </label>
              <input
                id="diary-destination-input"
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="예: 강원도 양양 죽도해변"
                className="w-full px-3 py-2.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-[#ede2d6] placeholder-[#8d7c6f] focus:border-[#d6c7b8] focus:ring-1 focus:ring-[#d6c7b8] outline-none transition-all text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#b8a798] mb-1.5">
                지역 분류
              </label>
              <select
                id="diary-region-select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-[#ede2d6] focus:border-[#d6c7b8] focus:ring-1 focus:ring-[#d6c7b8] outline-none transition-all text-xs sm:text-sm"
              >
                <option value="국내">국내 여행</option>
                <option value="아시아">아시아</option>
                <option value="유럽">유럽</option>
                <option value="미주">미주 / 대양주</option>
                <option value="기타">기타 해외</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#b8a798] mb-1.5">
                동행
              </label>
              <input
                id="diary-companion-input"
                type="text"
                value={companions}
                onChange={(e) => setCompanions(e.target.value)}
                placeholder="예: 친구들과 함께, 가족, 홀로 여행"
                className="w-full px-3 py-2.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-[#ede2d6] placeholder-[#8d7c6f] focus:border-[#d6c7b8] focus:ring-1 focus:ring-[#d6c7b8] outline-none transition-all text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Emotional One-Line Highlight with Place-Tailored Recommendations */}
          <div className="rounded-xl p-3.5 bg-[#1a1410] border border-[#3e3026] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#ede2d6] flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-amber-400" />
                <span>한 줄 하이라이트</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-normal border border-amber-500/30">
                  감성 추천
                </span>
              </label>
              <button
                type="button"
                onClick={() => setHighlightOffset((prev) => prev + 1)}
                className="flex items-center gap-1 text-[11px] text-[#b8a798] hover:text-amber-300 transition-colors group"
                title="다른 감성 멘트 추천 보기"
              >
                <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-300" />
                <span>다른 문구 추천</span>
              </button>
            </div>

            <div className="relative">
              <input
                id="diary-highlight-input"
                type="text"
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder={placeholderHighlight}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-[#ede2d6] placeholder-[#8d7c6f] focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 outline-none text-xs sm:text-sm leading-normal transition-all"
              />
              {highlight && (
                <button
                  type="button"
                  onClick={() => setHighlight('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d7c6f] hover:text-[#ede2d6] text-xs"
                  title="지우기"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Place-tailored sentiment recommendation pills */}
            <div className="pt-1">
              <p className="text-[11px] text-[#b8a798] mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  {destination.trim() ? (
                    <>
                      <strong className="text-[#ede2d6] font-medium">‘{destination}’</strong>에 어울리는 감성 문구 예시입니다. 클릭 시 바로 적용됩니다:
                    </>
                  ) : (
                    <>여행지에 맞춤 감성 문구 예시입니다. 클릭 시 바로 적용됩니다:</>
                  )}
                </span>
              </p>

              <div className="space-y-1.5">
                {displayedHighlights.map((phrase, idx) => {
                  const isSelected = highlight === phrase;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHighlight(phrase)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-start gap-2.5 border group ${
                        isSelected
                          ? 'bg-[#453325] text-amber-100 border-amber-500/70 shadow-xs'
                          : 'bg-[#261d17] hover:bg-[#32261f] text-[#d6c7b8] hover:text-[#faf5f0] border-[#3e3026] hover:border-[#524135]'
                      }`}
                    >
                      <Quote className={`w-3 h-3 shrink-0 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-[#8d7c6f] group-hover:text-amber-400/80'}`} />
                      <span className="flex-1 leading-relaxed text-xs">
                        &ldquo;{phrase}&rdquo;
                      </span>
                      {isSelected ? (
                        <span className="shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                          <Check className="w-2.5 h-2.5" />
                          적용됨
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-[#8d7c6f] group-hover:text-[#d6c7b8] transition-colors">
                          선택
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mood, Weather & Rating */}
          <div className="bg-[#1a1410] p-4 rounded-xl border border-[#3e3026] space-y-3.5">
            <div>
              <span className="block text-xs font-medium text-[#b8a798] mb-2">
                여행 무드
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setMood(m.label)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      mood === m.label
                        ? 'bg-[#ede2d6] text-[#201813] font-semibold shadow-xs'
                        : 'bg-[#2a2019] text-[#d6c7b8] border border-[#3e3026] hover:bg-[#382c24]'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#382c24]">
              <div>
                <span className="block text-xs font-medium text-[#b8a798] mb-1.5">날씨</span>
                <div className="flex items-center gap-1">
                  {WEATHERS.map((w) => (
                    <button
                      key={w.label}
                      type="button"
                      onClick={() => setWeather(w.label)}
                      title={w.label}
                      className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-all ${
                        weather === w.label
                          ? 'bg-[#ede2d6] text-[#201813] ring-1 ring-[#ede2d6]'
                          : 'bg-[#2a2019] text-[#b8a798] hover:bg-[#382c24] hover:text-[#faf5f0]'
                      }`}
                    >
                      {w.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#b8a798] mb-1.5">만족도</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className="text-[#524135] hover:text-amber-400 transition-colors p-0.5"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          starVal <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[#4e3d31]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Photo upload & gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#b8a798] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#b8a798]" />
                <span>여행 사진 ({images.length}장)</span>
              </label>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2a2019] hover:bg-[#382c24] text-[#ede2d6] text-xs font-medium border border-[#4a3a2f] transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#b8a798]" />
                  <span>내 사진 파일 업로드</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex-1 flex gap-1.5">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="사진 URL 직접 추가 (https://...)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-xs text-[#ede2d6] placeholder-[#8d7c6f] focus:border-[#d6c7b8] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImageUrl();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 rounded-xl bg-[#382c24] hover:bg-[#4a3a2f] text-[#ede2d6] text-xs font-medium transition-colors"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* Google Images Recommended Photos based on title & place keyword */}
              <GoogleRecommendedPhotos
                title={title}
                destination={destination}
                currentImages={images}
                onAddPhoto={handleAddGooglePhoto}
                onSetCoordinates={handleSetCoordinates}
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-2.5 bg-[#1a1410] rounded-xl border border-[#3e3026]">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-[#2a2019]">
                    <img
                      src={img}
                      alt={`여행사진 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-black/80 text-[#ede2d6] text-[9px] font-semibold px-1.5 py-0.5 rounded">
                        대표
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-[#d6c7b8] hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diary Content */}
          <div>
            <label className="block text-xs font-medium text-[#b8a798] mb-1.5">
              여행 일기 본문 *
            </label>
            <textarea
              id="diary-content-textarea"
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여행지에서의 기억, 마주했던 풍경, 마음속에 남은 생각을 차분히 기록해보세요..."
              className="w-full p-3.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] focus:border-[#d6c7b8] focus:ring-1 focus:ring-[#d6c7b8] outline-none text-[#ede2d6] placeholder-[#8d7c6f] text-sm leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-[#b8a798] mb-1.5">
              태그
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-0.5 rounded-md bg-[#2a2019] text-[#d6c7b8] text-xs font-medium flex items-center gap-1 border border-[#3e3026]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="태그 입력 (Enter)"
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#281f18] border border-[#4a3a2f] text-[#ede2d6] text-xs outline-none focus:border-[#d6c7b8]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-xl bg-[#2a2019] hover:bg-[#382c24] text-[#d6c7b8] text-xs font-medium border border-[#3e3026]"
              >
                추가
              </button>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-[#3e3026] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#4a3a2f] text-[#b8a798] hover:text-[#ede2d6] hover:bg-[#2a2019] text-xs font-medium transition-colors"
            >
              취소
            </button>
            <button
              id="submit-diary-btn"
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#ede2d6] hover:bg-[#faf5f0] text-[#1e1713] font-semibold text-xs transition-all active:scale-95"
            >
              {initialData ? '수정 저장' : '타임라인에 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
