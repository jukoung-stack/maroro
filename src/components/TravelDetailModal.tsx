import React, { useState } from 'react';
import { X, Calendar, MapPin, Star, Edit3, Trash2, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { TravelDiary } from '../types';

interface Props {
  diary: TravelDiary | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (diary: TravelDiary) => void;
  onDelete: (id: string) => void;
}

export const TravelDetailModal: React.FC<Props> = ({
  diary,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen || !diary) return null;

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : diary.images.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev < diary.images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="travel-detail-card"
        className="bg-[#221a15] rounded-2xl border border-[#44352b] shadow-2xl w-full max-w-3xl my-auto overflow-hidden flex flex-col max-h-[92vh] text-[#e8ded4] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top bar with quick actions */}
        <div className="px-6 py-4 bg-[#2a2019] border-b border-[#3e3026] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-[#362a22] text-[#e2d5c8] font-medium tracking-wide">
              {diary.year}.{String(diary.month).padStart(2, '0')}.{String(diary.day).padStart(2, '0')}
            </span>
            <span className="flex items-center gap-1.5 text-[#b8a798]">
              <MapPin className="w-3.5 h-3.5 text-[#b8a798]" />
              <span className="text-[#ede2d6] font-medium">{diary.destination}</span>
              <span className="text-[#8d7c6f]">· {diary.region}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(diary)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#362a22] hover:bg-[#44352b] text-[#d6c7b8] text-xs font-medium border border-[#4a3a2f] transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#b8a798]" />
              <span>수정</span>
            </button>
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1 bg-red-950/80 border border-red-800/80 rounded-lg px-2 py-1">
                <span className="text-[11px] text-red-200 font-medium mr-1">정말 삭제할까요?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(diary.id);
                    onClose();
                  }}
                  className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition-colors"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2 py-0.5 rounded bg-[#362a22] hover:bg-[#44352b] text-[#d6c7b8] text-[11px] transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#362a22]/80 hover:bg-red-950/60 hover:text-red-300 text-[#b8a798] text-xs font-medium border border-[#4a3a2f] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#362a22] hover:bg-[#44352b] text-[#b8a798] hover:text-[#faf5f0] flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* Main Photo Viewer */}
          {diary.images && diary.images.length > 0 && (
            <div className="relative rounded-xl overflow-hidden bg-[#181310] border border-[#3e3026] group aspect-16/10 sm:aspect-2/1">
              <img
                src={diary.images[activePhotoIdx] || diary.images[0]}
                alt={diary.title}
                className="w-full h-full object-cover"
              />

              {/* Prev / Next controls if multiple photos */}
              {diary.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-[#e8ded4] text-[11px] font-medium flex items-center gap-1.5">
                    {diary.images.map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === activePhotoIdx ? 'bg-[#faf5f0] w-3.5' : 'bg-[#695446]'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-[10px] text-[#b8a798]">
                      {activePhotoIdx + 1} / {diary.images.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Title & Key Highlight */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#362a22] border border-[#4a3a2f] text-[#ede2d6] text-xs font-medium">
                {diary.mood}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#1a1410] border border-[#3e3026] text-[#b8a798] text-xs">
                날씨: {diary.weather}
              </span>
              <div className="flex items-center gap-0.5 ml-auto">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-3.5 h-3.5 ${
                      idx < diary.rating ? 'fill-amber-400 text-amber-400' : 'text-[#4e3d31]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold text-[#f7f0e9] tracking-tight leading-snug">
              {diary.title}
            </h1>

            {diary.highlight && (
              <p className="text-sm font-normal text-[#ded2c5] bg-[#1a1410]/90 border-l-2 border-[#8c6f5a] px-3.5 py-2.5 rounded-r-lg">
                &ldquo;{diary.highlight}&rdquo;
              </p>
            )}
          </div>

          {/* Details metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#281f18] border border-[#3e3026] text-xs">
            <div>
              <span className="text-[#9e8b7c] block text-[11px] mb-0.5">여행지</span>
              <span className="font-medium text-[#ede2d6]">{diary.destination}</span>
            </div>
            <div>
              <span className="text-[#9e8b7c] block text-[11px] mb-0.5">방문 시기</span>
              <span className="font-medium text-[#ede2d6]">{diary.year}년 {diary.month}월</span>
            </div>
            <div>
              <span className="text-[#9e8b7c] block text-[11px] mb-0.5">동행</span>
              <span className="font-medium text-[#ede2d6]">{diary.companions || '개인 여행'}</span>
            </div>
            <div>
              <span className="text-[#9e8b7c] block text-[11px] mb-0.5">평점</span>
              <span className="font-medium text-[#ede2d6]">{diary.rating}.0 / 5.0</span>
            </div>
          </div>

          {/* Full Diary Story */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#b8a798]">
              여행 일기
            </h3>
            <div className="text-[#ded2c5] text-sm leading-relaxed whitespace-pre-line bg-[#1b1511] p-5 rounded-xl border border-[#382c24]">
              {diary.content}
            </div>
          </div>

          {/* Photo gallery preview if more than 1 image */}
          {diary.images.length > 1 && (
            <div>
              <h4 className="text-xs font-semibold text-[#b8a798] mb-2.5">
                전체 사진 ({diary.images.length})
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {diary.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${
                      idx === activePhotoIdx
                        ? 'border-[#d6c7b8] ring-1 ring-[#d6c7b8]'
                        : 'border-[#3e3026] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="썸네일" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {diary.tags && diary.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#382c24]">
              <Tag className="w-3.5 h-3.5 text-[#9e8b7c] mr-1" />
              {diary.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md bg-[#1a1410] border border-[#3e3026] text-[#b8a798] text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
