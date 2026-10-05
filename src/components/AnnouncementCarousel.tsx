import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Layers, RefreshCw, Loader2 } from 'lucide-react';
import { extractGoogleDriveFileId } from '../services/googleSheetSyncService';

export interface AnnouncementCarouselProps {
  images?: string[];
  title?: string;
  autoRotateInterval?: number; // ms, default 3500ms
  className?: string;
  aspectClass?: string; // e.g. 'h-52 sm:h-64' or 'aspect-[16/9]'
  objectFit?: 'contain' | 'cover';
  showControls?: boolean;
  showIndicators?: boolean;
  showBadge?: boolean;
  badgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  onImageClick?: (index: number) => void;
  roundedClass?: string;
  fallbackIcon?: React.ReactNode;
}

/**
 * Generate an ordered list of fallback candidates for any image URL
 */
function getImageFallbackCandidates(rawSrc: string): string[] {
  if (!rawSrc) return [];
  const trimmed = rawSrc.trim();
  if (!trimmed) return [];

  // Local uploaded path (e.g. /uploads/announcements/...)
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('data:image/')) {
    return [trimmed];
  }

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    return [
      `/api/drive-image?id=${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
      `https://drive.google.com/uc?export=view&id=${fileId}`,
    ];
  }

  // Generic external image
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return [trimmed, `/api/drive-image?url=${encodeURIComponent(trimmed)}`];
  }

  return [trimmed];
}

export const AnnouncementCarousel: React.FC<AnnouncementCarouselProps> = ({
  images: rawImages = [],
  title = '',
  autoRotateInterval = 3500,
  className = '',
  aspectClass = 'min-h-[220px] max-h-[320px] h-auto',
  objectFit = 'contain',
  showControls = true,
  showIndicators = true,
  showBadge = true,
  badgePosition = 'top-right',
  activeIndex: externalIndex,
  onIndexChange,
  onImageClick,
  roundedClass = 'rounded-none',
  fallbackIcon,
}) => {
  // Filter out empty or duplicate strings, limit to 3 images per requirement
  const cleanList: string[] = [];
  (rawImages || []).forEach((img) => {
    if (typeof img === 'string' && img.trim().length > 0) {
      const trimmed = img.trim();
      if (!cleanList.includes(trimmed)) {
        cleanList.push(trimmed);
      }
    }
  });
  const images = cleanList.slice(0, 3);

  const [internalIndex, setInternalIndex] = useState(0);
  const currentIndex = externalIndex !== undefined ? externalIndex : internalIndex;

  const setCurrentIndex = (newIdx: number | ((prev: number) => number)) => {
    const resolved = typeof newIdx === 'function' ? newIdx(currentIndex) : newIdx;
    setInternalIndex(resolved);
    if (onIndexChange) {
      onIndexChange(resolved);
    }
  };

  const [isHovered, setIsHovered] = useState(false);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [activeSources, setActiveSources] = useState<Record<number, string>>({});
  const [attemptsMap, setAttemptsMap] = useState<Record<number, number>>({});
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});
  const timerRef = useRef<any>(null);

  // Initialize or reset activeSources when images array changes
  useEffect(() => {
    const initialMap: Record<number, string> = {};
    const initAttempts: Record<number, number> = {};
    const initLoaded: Record<number, boolean> = {};

    images.forEach((img, idx) => {
      const candidates = getImageFallbackCandidates(img);
      initialMap[idx] = candidates[0] || img;
      initAttempts[idx] = 0;
      initLoaded[idx] = false;
    });

    setActiveSources(initialMap);
    setAttemptsMap(initAttempts);
    setLoadedMap(initLoaded);
    setFailedIndices(new Set());
  }, [images.join('::')]);

  const validImages = images.filter((_, idx) => !failedIndices.has(idx));
  const hasMultiple = validImages.length > 1;

  // Handle auto-rotation
  useEffect(() => {
    if (!hasMultiple || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoRotateInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasMultiple, isHovered, autoRotateInterval, images.length]);

  // Make sure currentIndex stays within bounds if images change
  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handleDotClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setCurrentIndex(idx);
  };

  const handleImageError = (idx: number) => {
    const rawImg = images[idx] || '';
    const candidates = getImageFallbackCandidates(rawImg);
    const currentAttempt = attemptsMap[idx] || 0;
    const nextAttempt = currentAttempt + 1;

    if (nextAttempt < candidates.length) {
      const nextCandidate = candidates[nextAttempt];
      setAttemptsMap((prev) => ({ ...prev, [idx]: nextAttempt }));
      setActiveSources((prev) => ({ ...prev, [idx]: nextCandidate }));
      return;
    }

    // All fallback endpoints exhausted for this slot
    setFailedIndices((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const handleImageLoaded = (idx: number) => {
    setLoadedMap((prev) => ({ ...prev, [idx]: true }));
  };

  const handleRetryAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const initialMap: Record<number, string> = {};
    const initAttempts: Record<number, number> = {};
    const initLoaded: Record<number, boolean> = {};

    images.forEach((img, idx) => {
      const candidates = getImageFallbackCandidates(img);
      initialMap[idx] = candidates[0] || img;
      initAttempts[idx] = 0;
      initLoaded[idx] = false;
    });

    setActiveSources(initialMap);
    setAttemptsMap(initAttempts);
    setLoadedMap(initLoaded);
    setFailedIndices(new Set());
  };

  // If no images or all failed
  if (images.length === 0 || failedIndices.size >= images.length) {
    return (
      <div className={`w-full ${aspectClass} flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 ${roundedClass} ${className} relative overflow-hidden`}>
        {fallbackIcon || (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
            <ImageIcon className="w-10 h-10 stroke-1 opacity-50 mb-1" />
            <span className="text-xs font-medium">ไม่มีรูปภาพประกอบ</span>
            {images.length > 0 && (
              <button
                type="button"
                onClick={handleRetryAll}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>โหลดรูปใหม่อีกครั้ง</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const getBadgePositionClasses = () => {
    switch (badgePosition) {
      case 'top-left':
        return 'top-3 left-3';
      case 'bottom-left':
        return 'bottom-3 left-3';
      case 'bottom-right':
        return 'bottom-3 right-3';
      case 'top-right':
      default:
        return 'top-3 right-3';
    }
  };

  return (
    <div
      className={`relative w-full ${aspectClass} overflow-hidden bg-slate-950/5 group/carousel select-none ${roundedClass} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Images container with smooth fade transition */}
      <div className="w-full h-full flex items-center justify-center relative">
        {images.map((imgUrl, idx) => {
          const isActive = idx === currentIndex;
          if (failedIndices.has(idx)) return null;

          const isLoaded = loadedMap[idx] === true;
          const currentSrc = activeSources[idx] || imgUrl;

          return (
            <div
              key={`${imgUrl}-${idx}`}
              className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Subtle Loading Shimmer while image downloads */}
              {!isLoaded && isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse z-0">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="text-[11px] font-medium">กำลังโหลดรูปภาพ...</span>
                  </div>
                </div>
              )}

              <img
                src={currentSrc}
                alt={`${title} - รูปที่ ${idx + 1}`}
                onLoad={() => handleImageLoaded(idx)}
                onError={() => handleImageError(idx)}
                onClick={() => onImageClick && onImageClick(idx)}
                className={`w-full h-full max-h-[550px] transition-transform duration-300 ${
                  objectFit === 'contain' ? 'object-contain' : 'object-cover'
                } ${onImageClick ? 'cursor-zoom-in' : ''} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                referrerPolicy="no-referrer"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}
      </div>

      {/* Multiple Images Rotation Badge (e.g. "1/3 รูป") */}
      {showBadge && hasMultiple && (
        <div className={`absolute ${getBadgePositionClasses()} z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold shadow-md border border-white/20`}>
          <Layers className="w-3 h-3 text-amber-300 animate-pulse" />
          <span>
            {currentIndex + 1}/{images.length}
          </span>
        </div>
      )}

      {/* Prev / Next Controls (shown on hover or when multiple images) */}
      {showControls && hasMultiple && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="รูปก่อนหน้า"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 hover:scale-110 shadow-md cursor-pointer focus:opacity-100"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="รูปถัดไป"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 hover:scale-110 shadow-md cursor-pointer focus:opacity-100"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </>
      )}

      {/* Indicator Dots at Bottom */}
      {showIndicators && hasMultiple && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/50 backdrop-blur-md border border-white/10">
          {images.map((_, idx) => {
            if (failedIndices.has(idx)) return null;
            const isActive = idx === currentIndex;
            return (
              <button
                key={`dot-${idx}`}
                type="button"
                onClick={(e) => handleDotClick(e, idx)}
                aria-label={`ไปยังรูปที่ ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? 'w-5 h-1.5 bg-amber-400 shadow-xs'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
