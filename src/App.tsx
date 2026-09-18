import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Plus, 
  Search, 
  Star, 
  Camera, 
  Layers,
  Grid,
  Map as MapIcon,
  ArrowUp,
  X,
  Clock,
  ChevronRight,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { INITIAL_TRAVEL_DATA } from './data/initialTravelData';
import { TravelDiaryModal } from './components/TravelDiaryModal';
import { TravelDetailModal } from './components/TravelDetailModal';
import { TravelMapPage } from './components/TravelMapPage';
import { TravelDiary, ViewMode } from './types';
import { APIProvider } from '@vis.gl/react-google-maps';

const STORAGE_KEY = 'travel_archive_diaries_v3';
const LEGACY_KEY = 'travel_archive_diaries_v2';

export default function App() {
  // Load data from localStorage or initial travel list
  const [diaries, setDiaries] = useState<TravelDiary[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge coordinates if not present
          return parsed.map((item: TravelDiary) => {
            if (!item.lat || !item.lng) {
              const matched = INITIAL_TRAVEL_DATA.find((init) => init.id === item.id || init.destination === item.destination);
              if (matched && matched.lat && matched.lng) {
                return { ...item, lat: matched.lat, lng: matched.lng };
              }
            }
            return item;
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_TRAVEL_DATA;
  });

  // UI filter & layout states
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState<TravelDiary | null>(null);
  const [viewingDiary, setViewingDiary] = useState<TravelDiary | null>(null);
  const [diaryToDelete, setDiaryToDelete] = useState<{ id: string; title: string } | null>(null);
  
  // Current view mode: 'timeline' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // URL Hash routing for Google Map page link
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#map') {
        setViewMode('map');
      } else if (hash === '#timeline' || hash === '' || hash === '#/') {
        setViewMode('timeline');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToMap = () => {
    window.location.hash = 'map';
    setViewMode('map');
  };

  const navigateToTimeline = () => {
    window.location.hash = 'timeline';
    setViewMode('timeline');
  };

  // Save to localStorage whenever diaries change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
    } catch {
      // LocalStorage fallback
    }
  }, [diaries]);

  // Distinct Years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(diaries.map((d) => d.year)));
    return years.sort((a, b) => b - a);
  }, [diaries]);

  // Distinct Regions
  const availableRegions = useMemo(() => {
    const regions = Array.from(new Set(diaries.map((d) => d.region)));
    return regions.filter(Boolean);
  }, [diaries]);

  // Filtered diaries
  const filteredDiaries = useMemo(() => {
    return diaries.filter((d) => {
      if (selectedYear !== 'all' && d.year.toString() !== selectedYear) return false;
      if (selectedMonth !== 'all' && d.month.toString() !== selectedMonth) return false;
      if (selectedRegion !== 'all' && d.region !== selectedRegion) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchDest = d.destination.toLowerCase().includes(q);
        const matchContent = d.content.toLowerCase().includes(q);
        const matchTags = d.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDest && !matchContent && !matchTags) return false;
      }
      return true;
    });
  }, [diaries, selectedYear, selectedMonth, selectedRegion, searchQuery]);

  // Group diaries by year for timeline layout
  const diariesGroupedByYear = useMemo(() => {
    const sorted = [...filteredDiaries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const grouped: Record<number, TravelDiary[]> = {};
    sorted.forEach((item) => {
      if (!grouped[item.year]) {
        grouped[item.year] = [];
      }
      grouped[item.year].push(item);
    });

    return Object.entries(grouped)
      .map(([yr, items]) => ({ year: Number(yr), items }))
      .sort((a, b) => b.year - a.year);
  }, [filteredDiaries]);

  // Create or Update Diary
  const handleSaveDiary = (diary: TravelDiary) => {
    setDiaries((prev) => {
      const exists = prev.some((d) => d.id === diary.id);
      if (exists) {
        return prev.map((d) => (d.id === diary.id ? diary : d));
      } else {
        return [diary, ...prev];
      }
    });
  };

  const handleDeleteDiary = (id: string) => {
    setDiaries((prev) => prev.filter((d) => d.id !== id));
    if (viewingDiary?.id === id) setViewingDiary(null);
  };

  const handleEditClick = (diary: TravelDiary) => {
    setEditingDiary(diary);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingDiary(null);
    setIsModalOpen(true);
  };

  // High-level statistics
  const stats = useMemo(() => {
    const totalTrips = diaries.length;
    const totalPhotos = diaries.reduce((acc, cur) => acc + (cur.images?.length || 0), 0);
    const uniqueDestinations = new Set(diaries.map((d) => d.destination)).size;
    const yearSpan = availableYears.length > 0 
      ? `${availableYears[availableYears.length - 1]}–${availableYears[0]}`
      : '-';
    return { totalTrips, totalPhotos, uniqueDestinations, yearSpan };
  }, [diaries, availableYears]);

  const hasActiveFilters = selectedYear !== 'all' || selectedMonth !== 'all' || selectedRegion !== 'all' || searchQuery.trim() !== '';
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <div className="min-h-screen flex flex-col bg-[#181310] text-[#e8ded4] selection:bg-[#523d2f] selection:text-[#faf5f0] font-sans">
      
      {/* Sleek Top Navigation Bar with Direct Google Maps Link */}
      <header className="sticky top-0 z-40 bg-[#201915]/95 backdrop-blur-md border-b border-[#382c24]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={navigateToTimeline}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#2c221b] border border-[#44352b] flex items-center justify-center text-[#e8ded4]">
              <Compass className="w-4 h-4 text-[#d9c7b8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-[#f7f0e9]">
                  TRAVEL ARCHIVE
                </span>
                <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-[#2c221b] text-[#c4b3a4] border border-[#44352b]">
                  {viewMode === 'map' ? 'Google Map' : 'Timeline'}
                </span>
              </div>
              <p className="text-[11px] text-[#b3a192] hidden sm:block">
                연도별 · 월별 여행 사진과 일기 아카이브
              </p>
            </div>
          </div>

          {/* Navigation Links: [타임라인] & [구글 맵 방문기록] */}
          <nav className="flex items-center gap-1.5 bg-[#251d18] p-1 rounded-xl border border-[#3d2f26]">
            <button
              type="button"
              onClick={navigateToTimeline}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode !== 'map'
                  ? 'bg-[#362921] text-[#faf5f0] shadow-xs'
                  : 'text-[#b8a697] hover:text-[#faf5f0]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>타임라인</span>
            </button>

            {/* Google Map Link requested by user */}
            <a
              href="#map"
              id="top-nav-google-maps-link"
              onClick={(e) => {
                e.preventDefault();
                navigateToMap();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-red-950/70 text-red-200 border border-red-800/80 shadow-xs'
                  : 'text-[#cfbeb0] hover:text-white hover:bg-[#362921]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <MapIcon className="w-3.5 h-3.5 text-red-400" />
              <span className="font-semibold">구글 맵 방문기록</span>
            </a>
          </nav>

          {/* Right Action: [새 여행 기록] */}
          <div className="flex items-center gap-2">
            <button
              id="new-travel-record-btn"
              type="button"
              onClick={handleAddNewClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ede2d6] hover:bg-[#faf5f0] text-[#241a14] font-medium text-xs sm:text-sm transition-all shadow-xs active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새 여행 기록</span>
              <span className="sm:hidden">기록</span>
            </button>
          </div>
        </div>
      </header>

      {/* RENDER GOOGLE MAPS PAGE (If viewMode === 'map') */}
      {viewMode === 'map' ? (
        <TravelMapPage
          diaries={diaries}
          onSelectDiary={(d) => setViewingDiary(d)}
          onBackToTimeline={navigateToTimeline}
        />
      ) : (
        /* TIMELINE & GRID VIEWS */
        <>
          {/* Hero Section: Sophisticated Warm Brown Atmosphere */}
          <section className="border-b border-[#382c24] bg-gradient-to-b from-[#241c16] via-[#1e1713] to-[#181310] py-8 sm:py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                
                {/* Title & Philosophy */}
                <div className="max-w-2xl space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 text-xs text-[#bdaea1]">
                    <Clock className="w-3.5 h-3.5 text-[#9e8b7c]" />
                    <span>기억의 시간을 정돈하는 나만의 여정 기록</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-[#f7f0e9] tracking-tight leading-tight">
                    연도와 계절의 결을 따라 남긴<br />
                    소중한 여정의 순간들
                  </h1>
                  <p className="text-xs sm:text-sm text-[#b8a798] leading-relaxed">
                    지나간 여행지의 공기, 마주했던 풍경, 그때의 생각들을 연도별·월별 타임라인과 구글 맵 지도로 보관합니다.
                  </p>
                </div>

                {/* Quick Map Banner Button */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={navigateToMap}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-[#251d18] border border-[#3f3127] hover:border-[#5c493c] transition-all text-left group shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0 group-hover:scale-105 transition-transform">
                      <MapPin className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#f7f0e9] group-hover:text-white">
                          방문 지역 구글 맵 열기
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      </div>
                      <p className="text-[11px] text-[#b8a798]">
                        지도 위 빨간 점과 사진 말풍선으로 확인하기 &rarr;
                      </p>
                    </div>
                  </button>
                </div>

              </div>
            </div>
          </section>

          {/* Main Content Area */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
            
            {/* Filter & Control Bar */}
            <div className="bg-[#221a15] rounded-xl p-4 border border-[#3d2f26] mb-8 space-y-3.5">
              
              {/* Top Row: Year selector pills & Search */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                
                {/* Year Selector Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <span className="text-xs text-[#b8a798] font-medium mr-1.5 shrink-0 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#9e8b7c]" />
                    <span>연도</span>
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedYear('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                      selectedYear === 'all'
                        ? 'bg-[#ede2d6] text-[#241a14] font-semibold'
                        : 'bg-[#2d231c] text-[#b8a798] hover:text-[#f7f0e9] hover:bg-[#382c24]'
                    }`}
                  >
                    전체
                  </button>

                  {availableYears.map((year) => {
                    const count = diaries.filter((d) => d.year === year).length;
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => setSelectedYear(year.toString())}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                          selectedYear === year.toString()
                            ? 'bg-[#ede2d6] text-[#241a14] font-semibold'
                            : 'bg-[#2d231c] text-[#b8a798] hover:text-[#f7f0e9] hover:bg-[#382c24]'
                        }`}
                      >
                        <span>{year}년</span>
                        <span className={`text-[10px] px-1 rounded ${
                          selectedYear === year.toString() ? 'bg-[#dfd1c3] text-[#241a14]' : 'bg-[#1c1511] text-[#998779]'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-[#8d7c6f] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="여행지, 제목, 태그 검색..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#2b211a] border border-[#44352b] text-[#f2e9e1] placeholder-[#8d7c6f] text-xs focus:border-[#8c6f5a] focus:ring-1 focus:ring-[#8c6f5a] outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8d7c6f] hover:text-[#ede2d6]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>

              {/* Bottom Row: Month & Region Dropdowns + View Mode Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#382c24] text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Month selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#b8a798]">월:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-2.5 py-1 rounded-md border border-[#44352b] bg-[#2b211a] text-[#f2e9e1] text-xs focus:border-[#8c6f5a] outline-none"
                    >
                      <option value="all">전체 월</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m.toString()}>
                          {m}월
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#b8a798]">지역:</span>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="px-2.5 py-1 rounded-md border border-[#44352b] bg-[#2b211a] text-[#f2e9e1] text-xs focus:border-[#8c6f5a] outline-none"
                    >
                      <option value="all">전체 지역</option>
                      {availableRegions.map((reg) => (
                        <option key={reg} value={reg}>
                          {reg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYear('all');
                        setSelectedMonth('all');
                        setSelectedRegion('all');
                        setSearchQuery('');
                      }}
                      className="text-[11px] text-[#b8a798] hover:text-[#ede2d6] underline underline-offset-2 ml-1"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>

                {/* View Mode Toggle: Timeline vs Grid */}
                <div className="flex items-center gap-1 bg-[#251d18] p-1 rounded-lg border border-[#3d2f26]">
                  <button
                    type="button"
                    onClick={() => setViewMode('timeline')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'timeline'
                        ? 'bg-[#362921] text-[#faf5f0] shadow-xs'
                        : 'text-[#b8a697] hover:text-[#faf5f0]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>타임라인</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'grid'
                        ? 'bg-[#362921] text-[#faf5f0] shadow-xs'
                        : 'text-[#b8a697] hover:text-[#faf5f0]'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>그리드</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Section Header with record count */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#f7f0e9] tracking-tight">
                  {selectedYear === 'all' ? '전체 여정 타임라인' : `${selectedYear}년 여행 기록`}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#2b211a] text-[#b8a798] border border-[#44352b] font-medium">
                  {filteredDiaries.length}건
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={navigateToMap}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>지도에서 보기</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="flex items-center gap-1 text-xs text-[#b8a798] hover:text-[#ede2d6] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>기록 추가</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredDiaries.length === 0 && (
              <div className="bg-[#221a15] rounded-2xl p-12 text-center border border-dashed border-[#3d2f26] max-w-md mx-auto my-12">
                <div className="w-12 h-12 rounded-xl bg-[#2c221b] text-[#b8a798] flex items-center justify-center mx-auto mb-3">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#f7f0e9] mb-1">
                  해당하는 여행 기록이 없습니다
                </h3>
                <p className="text-xs text-[#b8a798] mb-4 leading-relaxed">
                  선택한 조건의 일기가 존재하지 않습니다. 필터를 초기화하거나 새 일기를 등록해보세요.
                </p>
                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ede2d6] hover:bg-[#faf5f0] text-[#241a14] font-medium text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 여행 기록 추가</span>
                </button>
              </div>
            )}

            {/* VIEW MODE: TIMELINE LAYOUT */}
            {viewMode === 'timeline' && (
              <div className="space-y-12">
                {diariesGroupedByYear.map(({ year, items }) => (
                  <div key={year} className="relative">
                    
                    {/* Year Header Section Divider */}
                    <div className="sticky top-18 z-20 mb-6 flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#271e18]/95 backdrop-blur-md py-1.5 px-3.5 rounded-xl border border-[#3e3026] shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#b8a798]" />
                        <span className="text-sm sm:text-base font-semibold text-[#f7f0e9] tracking-tight">
                          {year}
                        </span>
                        <span className="text-[11px] text-[#b8a798] font-normal">
                          · {items.length}개의 기록
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-[#382c23]" />
                    </div>

                    {/* Vertical Timeline Stem & Cards */}
                    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-[#382c23]">
                      
                      {items.map((diary) => (
                        <div 
                          key={diary.id}
                          className="relative group animate-in fade-in duration-200"
                        >
                          {/* Timeline Node Point */}
                          <div className="absolute -left-6 sm:-left-8 top-5 -translate-x-1/2 w-4 h-4 rounded-full bg-[#181310] border-2 border-[#544336] flex items-center justify-center z-10 group-hover:border-[#ede2d6] transition-colors">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#b8a798] group-hover:bg-[#faf5f0] transition-colors" />
                          </div>

                          {/* Timeline Card */}
                          <div 
                            onClick={() => setViewingDiary(diary)}
                            className="cursor-pointer bg-[#221a15] rounded-xl border border-[#3a2e25] hover:border-[#524135] hover:bg-[#271e19] transition-all duration-200 overflow-hidden flex flex-col md:flex-row shadow-sm"
                          >
                            {/* Photo Thumbnail */}
                            <div className="md:w-5/12 lg:w-4/12 relative aspect-16/10 md:aspect-auto overflow-hidden bg-[#1a1410] shrink-0">
                              <img
                                src={diary.images[0]}
                                alt={diary.title}
                                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 min-h-[180px]"
                              />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                {/* Date Badge */}
                                <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[#faf5f0] text-xs font-medium border border-white/10">
                                  {diary.month}월 {diary.day}일
                                </span>
                                <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[#d6c7b8] text-[11px]">
                                  {diary.mood}
                                </span>
                              </div>

                              {/* Multi-photo pill */}
                              {diary.images.length > 1 && (
                                <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[#d6c7b8] text-[10px] font-medium flex items-center gap-1">
                                  <Camera className="w-3 h-3" />
                                  <span>+{diary.images.length - 1}</span>
                                </span>
                              )}
                            </div>

                            {/* Content Body */}
                            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3.5">
                              <div className="space-y-2">
                                {/* Location & Star Rating */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs text-[#b8a798]">
                                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-[#ede2d6] font-medium">{diary.destination}</span>
                                    <span className="text-[#8d7c6f]">· {diary.region}</span>
                                  </div>

                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3 h-3 ${
                                          i < diary.rating ? 'fill-amber-400 text-amber-400' : 'text-[#44352b]'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Diary Title */}
                                <h3 className="text-base sm:text-lg font-semibold text-[#f7f0e9] group-hover:text-white transition-colors leading-snug tracking-tight">
                                  {diary.title}
                                </h3>

                                {/* Highlight quote */}
                                {diary.highlight && (
                                  <p className="text-xs text-[#ded2c5] bg-[#1b1410]/90 border-l-2 border-[#8c6f5a] px-3 py-1.5 rounded-r-md">
                                    &ldquo;{diary.highlight}&rdquo;
                                  </p>
                                )}

                                {/* Diary body snippet */}
                                <p className="text-xs sm:text-sm text-[#b8a798] line-clamp-2 leading-relaxed">
                                  {diary.content}
                                </p>
                              </div>

                              {/* Footer Tags & Actions */}
                              <div className="pt-3 border-t border-[#382c24] flex items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap gap-1">
                                  {diary.tags?.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 rounded bg-[#2b211a] text-[#bdae9f] text-[11px] border border-[#3f3228]"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(diary)}
                                    className="px-2.5 py-1 rounded bg-[#2e241d] hover:bg-[#3b2e25] text-[#d6c7b8] text-[11px] transition-colors"
                                  >
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDiaryToDelete({ id: diary.id, title: diary.title })}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2e241d]/80 hover:bg-red-950/60 text-[#b5a393] hover:text-red-300 text-[11px] transition-colors border border-transparent hover:border-red-800/60"
                                    title="이 여행 기록 삭제"
                                  >
                                    <Trash2 className="w-3 h-3 text-[#b5a393]" />
                                    <span>삭제</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setViewingDiary(diary)}
                                    className="flex items-center gap-0.5 px-2.5 py-1 rounded bg-[#4a392e] hover:bg-[#5c473a] text-[#fbf7f4] text-[11px] font-medium transition-colors"
                                  >
                                    <span>상세보기</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW MODE: GRID GALLERY */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDiaries.map((diary) => (
                  <div
                    key={diary.id}
                    onClick={() => setViewingDiary(diary)}
                    className="cursor-pointer bg-[#221a15] rounded-xl border border-[#3a2e25] hover:border-[#524135] hover:bg-[#271e19] transition-all overflow-hidden flex flex-col group shadow-sm"
                  >
                    <div className="relative aspect-16/10 overflow-hidden bg-[#1a1410]">
                      <img
                        src={diary.images[0]}
                        alt={diary.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[#faf5f0] text-xs font-medium">
                        {diary.year}.{String(diary.month).padStart(2, '0')}.{String(diary.day).padStart(2, '0')}
                      </span>
                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[#d6c7b8] text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {diary.destination}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-semibold text-[#f7f0e9] group-hover:text-white transition-colors line-clamp-1 mb-1 text-sm">
                          {diary.title}
                        </h3>
                        <p className="text-xs text-[#b8a798] line-clamp-2 leading-relaxed">
                          {diary.content}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[#382c24] flex items-center justify-between text-xs">
                        <span className="text-[#b8a798]">{diary.mood} · {diary.region}</span>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setDiaryToDelete({ id: diary.id, title: diary.title })}
                            className="p-1 rounded text-[#8d7c6f] hover:text-red-400 hover:bg-[#2e241d] transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[#ede2d6] font-medium flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {diary.rating}.0
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </main>

          {/* Footer */}
          <footer className="border-t border-[#382c24] bg-[#140f0c] py-8 text-center text-xs text-[#9e8b7c] mt-16">
            <div className="max-w-6xl mx-auto px-4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Compass className="w-4 h-4 text-[#b8a798]" />
                <span className="font-medium text-[#c4b3a4]">TRAVEL ARCHIVE</span>
              </div>
              <p className="text-[#9e8b7c]">
                연도별 · 월별 · 여행지별 소중한 순간들을 정돈하는 미니멀 여행 아카이브
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#271e18] hover:bg-[#33271f] text-[#c4b3a4] hover:text-[#faf5f0] transition-colors"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>맨 위로</span>
                </button>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Modals */}
      <TravelDiaryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDiary(null);
        }}
        onSave={handleSaveDiary}
        initialData={editingDiary}
      />

      <TravelDetailModal
        diary={viewingDiary}
        isOpen={!!viewingDiary}
        onClose={() => setViewingDiary(null)}
        onEdit={(d) => {
          setViewingDiary(null);
          handleEditClick(d);
        }}
        onDelete={handleDeleteDiary}
      />

      {/* Delete Confirmation Modal */}
      {diaryToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setDiaryToDelete(null)}
        >
          <div 
            className="bg-[#221a15] rounded-2xl border border-[#44352b] p-5 max-w-sm w-full shadow-2xl text-[#e8ded4] space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#f7f0e9]">여행 일기 삭제</h4>
                <p className="text-xs text-[#b8a798] mt-0.5">삭제된 기록은 복구할 수 없습니다.</p>
              </div>
            </div>

            <div className="text-xs text-[#ded2c5] bg-[#1a1410] p-3 rounded-xl border border-[#382c24] leading-relaxed break-words">
              &ldquo;<strong className="text-[#f7f0e9] font-semibold">{diaryToDelete.title}</strong>&rdquo; 일기를 정말 삭제하시겠습니까?
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDiaryToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#2e241d] hover:bg-[#3b2e25] text-[#d6c7b8] text-xs font-medium border border-[#44352b] transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteDiary(diaryToDelete.id);
                  setDiaryToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </APIProvider>
  );
}
