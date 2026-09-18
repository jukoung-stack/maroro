import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  Search, 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  Check, 
  Image as ImageIcon,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { extractPlaceKeywords, getPrimaryPlaceQuery } from '../utils/keywordExtractor';

// Curated travel photo fallbacks mapped to top travel destinations
const LOCATION_PHOTO_FALLBACKS: Record<string, string[]> = {
  양양: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1000&q=80',
  ],
  제주: [
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
  ],
  교토: [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1000&q=80',
  ],
  대전: [
    'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80',
  ],
  스위스: [
    'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&w=1000&q=80',
  ],
  인터라켄: [
    'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&w=1000&q=80',
  ],
  부산: [
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=80',
  ],
  경주: [
    'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
  ],
  서울: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
  ]
};

export interface ExtractedPhotoItem {
  url: string;
  source: 'google' | 'curated';
  attribution?: string;
}

interface GoogleRecommendedPhotosProps {
  title: string;
  destination: string;
  currentImages: string[];
  onAddPhoto: (photoUrl: string) => void;
  onSetCoordinates?: (lat: number, lng: number) => void;
}

export const GoogleRecommendedPhotos: React.FC<GoogleRecommendedPhotosProps> = ({
  title,
  destination,
  currentImages,
  onAddPhoto,
  onSetCoordinates,
}) => {
  const placesLibrary = useMapsLibrary('places');
  const [activeKeyword, setActiveKeyword] = useState<string>('');
  const [extractedPhotos, setExtractedPhotos] = useState<ExtractedPhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());
  const [manualInput, setManualInput] = useState('');
  const [isEditingKeyword, setIsEditingKeyword] = useState(false);

  // Extract all candidate keywords from title & destination
  const candidateKeywords = extractPlaceKeywords(title, destination);

  // Auto-update active keyword when title or destination changes
  useEffect(() => {
    const primary = getPrimaryPlaceQuery(title, destination);
    if (primary && primary !== activeKeyword) {
      setActiveKeyword(primary);
      setManualInput(primary);
    }
  }, [title, destination]);

  // Extract photos using Google Places API
  const fetchGooglePhotos = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      setIsLoading(true);

      const candidates: ExtractedPhotoItem[] = [];

      // 1. If Google Maps Places library is available, use textSearch
      const googleObj = (window as unknown as { google?: any }).google;
      if (placesLibrary && googleObj?.maps?.places) {
        try {
          const dummyContainer = document.createElement('div');
          const service = new (placesLibrary as any).PlacesService(dummyContainer);

          service.textSearch(
            {
              query: query,
              language: 'ko',
            },
            (results: any[] | null, status: any) => {
              setIsLoading(false);
              if (
                status === googleObj.maps.places.PlacesServiceStatus.OK &&
                results &&
                results.length > 0
              ) {
                // Update coordinates if available
                const topPlace = results[0];
                if (topPlace.geometry?.location && onSetCoordinates) {
                  const lat = topPlace.geometry.location.lat();
                  const lng = topPlace.geometry.location.lng();
                  onSetCoordinates(lat, lng);
                }

                // Gather photos across top results
                results.slice(0, 4).forEach((place: any) => {
                  if (place.photos && place.photos.length > 0) {
                    place.photos.slice(0, 3).forEach((p: any) => {
                      const photoUrl = p.getUrl({ maxWidth: 1200, maxHeight: 900 });
                      const attribution = p.html_attributions?.[0]
                        ? p.html_attributions[0].replace(/<[^>]*>/g, '')
                        : undefined;

                      if (photoUrl && !candidates.some((c) => c.url === photoUrl)) {
                        candidates.push({
                          url: photoUrl,
                          source: 'google',
                          attribution: attribution ? `Google · ${attribution}` : 'Google Maps',
                        });
                      }
                    });
                  }
                });
              }

              // Fallback if Google photos are scarce
              if (candidates.length < 4) {
                for (const [key, fallbackList] of Object.entries(LOCATION_PHOTO_FALLBACKS)) {
                  if (query.includes(key)) {
                    fallbackList.forEach((fbUrl) => {
                      if (!candidates.some((c) => c.url === fbUrl)) {
                        candidates.push({ url: fbUrl, source: 'curated' });
                      }
                    });
                  }
                }
              }

              setExtractedPhotos(candidates);
            }
          );
          return;
        } catch (err) {
          console.warn('Google Places API search failed, using fallback:', err);
        }
      }

      // If Places Library not yet ready or failed, fallback to matched place photos
      setIsLoading(false);
      for (const [key, fallbackList] of Object.entries(LOCATION_PHOTO_FALLBACKS)) {
        if (query.includes(key)) {
          fallbackList.forEach((fbUrl) => {
            if (!candidates.some((c) => c.url === fbUrl)) {
              candidates.push({ url: fbUrl, source: 'curated' });
            }
          });
        }
      }
      setExtractedPhotos(candidates);
    },
    [placesLibrary, onSetCoordinates]
  );

  // Trigger search when activeKeyword changes
  useEffect(() => {
    if (activeKeyword) {
      fetchGooglePhotos(activeKeyword);
    }
  }, [activeKeyword, fetchGooglePhotos]);

  const handleSelectCandidate = (kw: string) => {
    setActiveKeyword(kw);
    setManualInput(kw);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      setActiveKeyword(manualInput.trim());
      setIsEditingKeyword(false);
    }
  };

  const handleAddImage = (item: ExtractedPhotoItem) => {
    onAddPhoto(item.url);
    setAddedUrls((prev) => new Set(prev).add(item.url));
  };

  return (
    <div className="bg-[#1b1511] rounded-xl border border-[#3e3026] p-3.5 space-y-3">
      {/* Header with Google branding & extracted keyword */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#382c24] border border-[#524135] text-[#d6c7b8]">
            <Sparkles className="w-3 h-3 text-amber-400" />
          </span>
          <span className="text-xs font-semibold text-[#ede2d6]">
            구글 이미지 추천 사진
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2019] text-[#b8a798] border border-[#3e3026] font-medium">
            제목 키워드 장소 기반
          </span>
        </div>

        {/* External Google Images link */}
        {activeKeyword && (
          <a
            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(activeKeyword)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-[#b8a798] hover:text-[#ede2d6] transition-colors"
            title="구글 이미지 검색에서 더 보기"
          >
            <span>Google 이미지 검색</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Extracted keyword pills & search bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#9e8b7c] text-[11px] shrink-0">추출된 장소:</span>

        {isEditingKeyword ? (
          <form onSubmit={handleManualSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="장소 키워드 입력..."
              className="px-2 py-1 rounded bg-[#2a2019] border border-[#4a3a2f] text-[#ede2d6] text-xs focus:border-[#b8a798] outline-none w-32"
              autoFocus
            />
            <button
              type="submit"
              className="px-2 py-1 rounded bg-[#382c24] hover:bg-[#4a3a2f] text-[#ede2d6] text-xs font-medium"
            >
              추출
            </button>
            <button
              type="button"
              onClick={() => setIsEditingKeyword(false)}
              className="text-[#9e8b7c] hover:text-[#ede2d6] text-xs px-1"
            >
              취소
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeKeyword ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#362a22] text-[#e8ded4] border border-[#4e3d31] text-xs font-medium">
                <MapPin className="w-3 h-3 text-[#d6c7b8]" />
                <span>{activeKeyword}</span>
              </span>
            ) : (
              <span className="text-[#8d7c6f] text-xs italic">
                제목이나 여행지를 입력하면 장소 키워드가 자동 추출됩니다
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsEditingKeyword(true)}
              className="text-[11px] text-[#b8a798] hover:text-[#ede2d6] underline underline-offset-2 ml-1"
            >
              키워드 변경
            </button>
          </div>
        )}

        {/* Candidate pills from title */}
        {candidateKeywords.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap ml-auto">
            <span className="text-[10px] text-[#9e8b7c]">다른 후보:</span>
            {candidateKeywords
              .filter((kw) => kw !== activeKeyword)
              .slice(0, 3)
              .map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleSelectCandidate(kw)}
                  className="px-1.5 py-0.5 rounded bg-[#2a2019] hover:bg-[#382c24] text-[#b8a798] hover:text-[#ede2d6] text-[10px] border border-[#3e3026] transition-colors"
                >
                  #{kw}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Extracted Photos Gallery Area */}
      <div className="pt-1">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#b8a798]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#d6c7b8]" />
            <span>Google 이미지 및 장소 사진을 추출하는 중입니다...</span>
          </div>
        ) : extractedPhotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {extractedPhotos.map((item, idx) => {
              const isAlreadyAdded = currentImages.includes(item.url) || addedUrls.has(item.url);
              return (
                <div
                  key={idx}
                  className="relative group rounded-lg overflow-hidden border border-[#3e3026] bg-[#140f0c] aspect-16/10 flex flex-col"
                >
                  <img
                    src={item.url}
                    alt={`${activeKeyword} 사진 ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Badge: Google Source */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[9px] font-semibold text-[#ded2c5]">
                    {item.source === 'google' ? 'Google' : '추천'}
                  </span>

                  {/* Overlay button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                    {isAlreadyAdded ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#221a15]/95 text-emerald-400 text-xs font-semibold shadow border border-emerald-900/50">
                        <Check className="w-3.5 h-3.5" />
                        <span>추가됨</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddImage(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ede2d6] hover:bg-[#faf5f0] text-[#1e1713] text-xs font-bold shadow-lg transition-transform active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>일기에 추가</span>
                      </button>
                    )}
                  </div>

                  {/* Bottom attribution if from Google */}
                  {item.attribution && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1.5 py-0.5 text-[8px] text-[#b8a798] truncate">
                      {item.attribution}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 bg-[#140f0c]/60 rounded-lg border border-dashed border-[#3e3026] text-xs text-[#9e8b7c]">
            <span>제목이나 여행지를 입력하면 Google의 고화질 장소 사진이 여기에 나타납니다.</span>
          </div>
        )}
      </div>
    </div>
  );
};
