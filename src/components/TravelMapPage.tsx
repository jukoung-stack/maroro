import React, { useState, useEffect } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
  ControlPosition,
  MapControl
} from '@vis.gl/react-google-maps';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Star, 
  ExternalLink, 
  ChevronRight, 
  ArrowLeft,
  RotateCcw,
  Layers,
  Map as MapIcon,
  Mountain,
  Globe,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { TravelDiary } from '../types';

interface TravelMapPageProps {
  diaries: TravelDiary[];
  onSelectDiary: (diary: TravelDiary) => void;
  onBackToTimeline: () => void;
}

// Controller to smoothly pan to selected diary and enforce 2D flat tilt
function MapController({ 
  selectedDiary, 
  targetCenter 
}: { 
  selectedDiary: TravelDiary | null;
  targetCenter: { lat: number; lng: number; zoom: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    // Always enforce flat 2D view (0 tilt, 0 heading)
    map.setTilt(0);
    map.setHeading(0);
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (selectedDiary && selectedDiary.lat !== undefined && selectedDiary.lng !== undefined) {
      map.panTo({ lat: selectedDiary.lat, lng: selectedDiary.lng });
      map.setTilt(0);
      if (map.getZoom() && (map.getZoom()! < 8 || map.getZoom()! > 14)) {
        map.setZoom(10);
      }
    }
  }, [map, selectedDiary]);

  useEffect(() => {
    if (!map || !targetCenter) return;
    map.panTo({ lat: targetCenter.lat, lng: targetCenter.lng });
    map.setZoom(targetCenter.zoom);
    map.setTilt(0);
    map.setHeading(0);
  }, [map, targetCenter]);

  return null;
}

export const TravelMapPage: React.FC<TravelMapPageProps> = ({
  diaries,
  onSelectDiary,
  onBackToTimeline,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [selectedDiary, setSelectedDiary] = useState<TravelDiary | null>(null);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  
  // Flat map type: 'roadmap' (평면 일반 지도), 'terrain' (평면 지형도), 'hybrid' (위성/하이브리드)
  const [mapType, setMapType] = useState<string>('roadmap');

  // Marker display mode: 'photo' (방문기록 대표 사진 표출) | 'pin' (기본 빨간 핀)
  const [markerMode, setMarkerMode] = useState<'photo' | 'pin'>('photo');
  
  // Center reset trigger
  const [resetTarget, setResetTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  // Filter diaries with valid coordinates
  const mappedDiaries = diaries.filter((d) => d.lat !== undefined && d.lng !== undefined);

  const displayedDiaries = mappedDiaries.filter((d) => {
    if (filterYear !== 'all' && d.year.toString() !== filterYear) return false;
    if (filterRegion !== 'all' && d.region !== filterRegion) return false;
    return true;
  });

  const years = Array.from(new Set(diaries.map((d) => d.year))).sort((a, b) => b - a);
  const regions = Array.from(new Set(diaries.map((d) => d.region))).filter(Boolean);

  // Default center around Korea
  const defaultCenter = { lat: 36.3, lng: 127.8 };

  const handleResetToKorea = () => {
    setSelectedDiary(null);
    setResetTarget({ lat: 36.3, lng: 127.8, zoom: 7 });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#181310] text-[#e8ded4]">
      {/* Subheader Toolbar */}
      <div className="bg-[#201915] border-b border-[#382c24] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToTimeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2d231c] hover:bg-[#382c24] text-[#d6c7b8] hover:text-[#faf5f0] text-xs font-medium border border-[#44352b] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>타임라인으로 돌아가기</span>
          </button>

          <div className="h-4 w-px bg-[#382c24] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            <h2 className="text-sm font-semibold text-[#f7f0e9] tracking-tight">
              방문 여행지 구글 맵 (평면 2D 지도)
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#2b211a] text-[#b8a798] border border-[#44352b] font-medium">
              총 {displayedDiaries.length}곳 표시 중
            </span>
          </div>
        </div>

        {/* Map Type Controls & Marker Display Switcher & Filter */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Marker Display Mode Switcher (사진 표출 vs 핀) */}
          <div className="flex items-center bg-[#281f19] p-1 rounded-lg border border-[#3e3026]">
            <button
              type="button"
              id="map-marker-photo-mode-btn"
              onClick={() => setMarkerMode('photo')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                markerMode === 'photo'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-[#b8a798] hover:text-[#faf5f0]'
              }`}
              title="지도 위에 방문지 대표 사진 직접 표출"
            >
              <ImageIcon className="w-3.5 h-3.5 text-white" />
              <span>사진 마커 표출</span>
            </button>

            <button
              type="button"
              id="map-marker-pin-mode-btn"
              onClick={() => setMarkerMode('pin')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                markerMode === 'pin'
                  ? 'bg-[#3e3026] text-white shadow-xs'
                  : 'text-[#b8a798] hover:text-[#faf5f0]'
              }`}
              title="심플 빨간 핀 마커로 전환"
            >
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>기본 핀</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#382c24] hidden sm:block" />

          {/* Map View Mode Switcher */}
          <div className="flex items-center bg-[#281f19] p-1 rounded-lg border border-[#3e3026]">
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                mapType === 'roadmap'
                  ? 'bg-[#3e3026] text-white shadow-xs'
                  : 'text-[#b8a798] hover:text-[#faf5f0]'
              }`}
              title="평면 일반 2D 로드맵"
            >
              <MapIcon className="w-3 h-3 text-red-400" />
              <span>평면 지도</span>
            </button>

            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                mapType === 'terrain'
                  ? 'bg-[#3e3026] text-white shadow-xs'
                  : 'text-[#b8a798] hover:text-[#faf5f0]'
              }`}
              title="평면 지형도"
            >
              <Mountain className="w-3 h-3 text-emerald-400" />
              <span>지형도</span>
            </button>

            <button
              type="button"
              onClick={() => setMapType('hybrid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                mapType === 'hybrid'
                  ? 'bg-[#3e3026] text-white shadow-xs'
                  : 'text-[#b8a798] hover:text-[#faf5f0]'
              }`}
              title="위성/항공 사진"
            >
              <Globe className="w-3 h-3 text-blue-400" />
              <span>위성</span>
            </button>
          </div>

          {/* Reset Center View Button */}
          <button
            type="button"
            onClick={handleResetToKorea}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2d231c] hover:bg-[#382c24] text-[#d6c7b8] hover:text-[#faf5f0] text-xs font-medium border border-[#44352b] transition-colors"
            title="한국 중심 평면 뷰로 초기화"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">전체 평면 보기</span>
          </button>

          <div className="h-4 w-px bg-[#382c24] hidden sm:block" />

          {/* Year and Region Filtering */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#b8a798]">연도:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-2 py-1 rounded-md border border-[#44352b] bg-[#2b211a] text-[#f2e9e1] text-xs focus:border-[#8c6f5a] outline-none"
            >
              <option value="all">전체</option>
              {years.map((yr) => (
                <option key={yr} value={yr.toString()}>
                  {yr}년
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#b8a798]">지역:</span>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-2 py-1 rounded-md border border-[#44352b] bg-[#2b211a] text-[#f2e9e1] text-xs focus:border-[#8c6f5a] outline-none"
            >
              <option value="all">전체</option>
              {regions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Flat Google Map, Right Interactive List */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Google Map Area */}
        <div className="flex-1 relative h-full min-h-[400px]">
          {apiKey ? (
            <Map
              key={mapType}
              defaultCenter={defaultCenter}
              defaultZoom={7}
              mapId="DEMO_MAP_ID"
              mapTypeId={mapType}
              tilt={0}
              heading={0}
              rotateControl={false}
              mapTypeControl={false}
              internalUsageAttributionIds={['gmp_git_agentskills_v1']}
              className="w-full h-full"
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              {/* Controller for maintaining 2D flat projection and smooth focus */}
              <MapController 
                selectedDiary={selectedDiary} 
                targetCenter={resetTarget} 
              />

              {/* Visited Locations Markers: Photo Marker or Classic Pin */}
              {displayedDiaries.map((diary) => {
                const isSelected = selectedDiary?.id === diary.id;
                return (
                  <AdvancedMarker
                    key={diary.id}
                    position={{ lat: diary.lat!, lng: diary.lng! }}
                    title={`${diary.destination} - ${diary.title}`}
                    onClick={() => setSelectedDiary(diary)}
                    zIndex={isSelected ? 999 : 20}
                  >
                    {markerMode === 'photo' ? (
                      <div 
                        className={`relative flex flex-col items-center group cursor-pointer transition-all duration-200 select-none ${
                          isSelected ? 'scale-125 -translate-y-3 z-50' : 'hover:scale-115 hover:-translate-y-1.5'
                        }`}
                      >
                        {/* Destination Title Pill */}
                        <div className={`px-2 py-0.5 mb-1 rounded-full text-[10px] font-bold tracking-tight whitespace-nowrap shadow-md transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-red-600 text-white border border-red-400 opacity-100 ring-2 ring-red-400/40 shadow-red-900/50'
                            : 'bg-[#201915]/95 text-[#f2e9e1] border border-[#44352b] group-hover:border-red-400 group-hover:text-white group-hover:opacity-100 opacity-90'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          <span>{diary.destination}</span>
                        </div>

                        {/* Photo Frame Badge with Pointer */}
                        <div className={`relative w-12 h-12 rounded-2xl overflow-hidden shadow-2xl transition-all ${
                          isSelected
                            ? 'ring-4 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.85)] border-2 border-white'
                            : 'border-2 border-[#ded2c4] group-hover:border-red-400 group-hover:ring-3 group-hover:ring-red-400/50 shadow-lg'
                        } bg-[#1a1410]`}>
                          <img
                            src={diary.images[0]}
                            alt={diary.destination}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                          {/* Year & Month overlay */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-2 pb-0.5 text-center">
                            <span className="text-[8.5px] font-semibold text-white/95 leading-none">
                              {diary.year}.{diary.month}
                            </span>
                          </div>
                        </div>

                        {/* Pointer needle */}
                        <div className={`w-3 h-3 -mt-1.5 rotate-45 border-r border-b transition-colors shadow-xs ${
                          isSelected
                            ? 'bg-red-500 border-red-400'
                            : 'bg-[#ded2c4] border-[#b09e8f] group-hover:bg-red-400 group-hover:border-red-400'
                        }`} />
                      </div>
                    ) : (
                      <Pin
                        background="#ef4444"
                        borderColor="#991b1b"
                        glyphColor="#ffffff"
                        scale={isSelected ? 1.3 : 1.0}
                      />
                    )}
                  </AdvancedMarker>
                );
              })}

              {/* Information Callout Bubble (말풍선 / InfoWindow) */}
              {selectedDiary && selectedDiary.lat !== undefined && selectedDiary.lng !== undefined && (
                <InfoWindow
                  position={{ lat: selectedDiary.lat, lng: selectedDiary.lng }}
                  onCloseClick={() => setSelectedDiary(null)}
                  maxWidth={340}
                >
                  <div className="p-1 text-[#241a14] font-sans">
                    {/* Primary Photo Banner */}
                    <div className="relative h-32 w-full rounded-xl overflow-hidden mb-2 bg-[#e6dcce] group">
                      <img
                        src={selectedDiary.images[0]}
                        alt={selectedDiary.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold shadow-xs">
                        {selectedDiary.year}.{String(selectedDiary.month).padStart(2, '0')}.{String(selectedDiary.day).padStart(2, '0')}
                      </span>
                      {selectedDiary.images.length > 1 && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium flex items-center gap-1 shadow-xs">
                          <ImageIcon className="w-3 h-3" />
                          <span>{selectedDiary.images.length}장의 사진</span>
                        </span>
                      )}
                    </div>

                    {/* Additional Photo Strip if multiple photos */}
                    {selectedDiary.images.length > 1 && (
                      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-thin">
                        {selectedDiary.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-[#ded2c4] bg-[#f0e8dc] shadow-2xs"
                          >
                            <img
                              src={imgUrl}
                              alt={`${selectedDiary.destination} 사진 ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Destination & Title */}
                    <div className="flex items-center gap-1 text-[11px] text-[#614e41] font-medium mb-1">
                      <MapPin className="w-3 h-3 text-red-600 shrink-0" />
                      <span className="font-semibold text-[#241a14]">{selectedDiary.destination}</span>
                      <span>· {selectedDiary.region}</span>
                    </div>

                    <h4 className="font-bold text-[#241a14] text-xs sm:text-sm line-clamp-1 mb-1 leading-snug">
                      {selectedDiary.title}
                    </h4>

                    {selectedDiary.highlight && (
                      <p className="text-[11px] text-[#5c4a3d] line-clamp-2 italic mb-2 bg-[#f3ece3] p-1.5 rounded-lg border border-[#e2d6c7]">
                        &ldquo;{selectedDiary.highlight}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#ded2c4] text-[11px]">
                      <span className="text-[#614e41] font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>평점 {selectedDiary.rating}.0</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectDiary(selectedDiary)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2c221b] text-white hover:bg-[#3a2e25] text-[11px] font-semibold transition-colors shadow-xs"
                      >
                        <span>일기 전체 보기</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#181310] p-8 text-center">
              <Compass className="w-8 h-8 text-[#8d7c6f] mb-2" />
              <p className="text-sm font-medium text-[#b8a798]">구글 맵 API 키를 로드하는 중입니다...</p>
            </div>
          )}

          {/* Floating Flat-Map Guide Badge with Photo Indicator */}
          <div className="absolute bottom-5 left-5 z-10 bg-[#221a15]/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#3e3026] text-xs text-[#d6c7b8] shadow-xl hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-red-400 font-semibold text-[11px] bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
              <ImageIcon className="w-3 h-3" />
              <span>사진 마커 표출 중</span>
            </div>
            <span className="text-[11px] text-[#d6c7b8]">
              지도 위의 <strong>여행 사진 마커</strong>를 클릭하면 말풍선과 상세 정보가 열립니다.
            </span>
          </div>
        </div>

        {/* Right Side Location Sidebar Drawer (Destinations List with Prominent Photos) */}
        <div className="w-full lg:w-84 xl:w-96 bg-[#1e1713] border-t lg:border-t-0 lg:border-l border-[#382c24] flex flex-col shrink-0 max-h-[42vh] lg:max-h-full">
          <div className="p-4 border-b border-[#382c24] bg-[#241c17] flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#f7f0e9] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>방문 기록 목록 ({displayedDiaries.length})</span>
            </h3>
            <span className="text-[11px] text-[#a89788]">클릭 시 지도 이동</span>
          </div>

          <div className="p-3 overflow-y-auto space-y-2.5 flex-1 scrollbar-thin">
            {displayedDiaries.map((item) => {
              const isSelected = selectedDiary?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDiary(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 group ${
                    isSelected
                      ? 'bg-[#2c221b] border-red-500/80 ring-1 ring-red-500/50 shadow-md'
                      : 'bg-[#231b16] border-[#382c24] hover:bg-[#2c221b] hover:border-[#4d3c30]'
                  }`}
                >
                  {/* Visual Photo Thumbnail */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#16110e] shrink-0 relative border border-[#44352b]">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {item.images.length > 1 && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] text-white font-medium flex items-center gap-0.5 backdrop-blur-xs">
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>{item.images.length}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#a89788] mb-1">
                        <span className="font-semibold text-[#f2e9e1] truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span>{item.destination}</span>
                        </span>
                        <span className="shrink-0 text-[#8d7c6f] text-[10px]">
                          {item.year}.{item.month}.{item.day}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#f7f0e9] truncate mb-1">
                        {item.title}
                      </h4>
                      {item.highlight && (
                        <p className="text-[11px] text-[#b8a798] truncate italic">
                          &ldquo;{item.highlight}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[#382c24] text-[11px]">
                      <span className="text-[#b8a798] text-[10px] px-1.5 py-0.5 rounded bg-[#1a1410] border border-[#382c24]">
                        {item.mood}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDiary(item);
                        }}
                        className="text-red-400 hover:text-red-300 font-medium flex items-center gap-0.5 text-xs transition-colors"
                      >
                        <span>일기 보기</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
