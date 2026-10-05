import React, { useState, useEffect } from 'react';
import { AnnouncementItem } from '../types';
import { 
  X, 
  Calendar, 
  Building2, 
  ExternalLink, 
  Share2, 
  Printer, 
  ZoomIn, 
  Check, 
  Megaphone,
  Clock,
  Sparkles,
  Tag,
  Pin,
  ChevronLeft,
  ChevronRight,
  Layers,
  Image as ImageIcon,
  Pencil
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDepartmentName } from './AnnouncementsView';
import { AnnouncementCarousel } from './AnnouncementCarousel';
import { extractGoogleDriveFileId } from '../services/googleSheetSyncService';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  announcement: AnnouncementItem | null;
  onClose: () => void;
  isAdmin?: boolean;
  onTogglePin?: (item: AnnouncementItem) => void;
  onEditAnnouncement?: (item: AnnouncementItem) => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  isOpen,
  announcement,
  onClose,
  isAdmin = false,
  onTogglePin,
  onEditAnnouncement,
}) => {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Extract up to 3 valid display images
  const displayImages = React.useMemo(() => {
    if (!announcement) return [];
    const list: string[] = [];
    if (announcement.imageUrls && Array.isArray(announcement.imageUrls)) {
      announcement.imageUrls.forEach((u) => {
        if (typeof u === 'string' && u.trim() && !list.includes(u.trim())) {
          list.push(u.trim());
        }
      });
    }
    if (list.length === 0 && announcement.imageUrl) {
      list.push(announcement.imageUrl.trim());
    }
    return list.slice(0, 3);
  }, [announcement]);

  const rawImages = React.useMemo(() => {
    if (!announcement) return [];
    const list: string[] = [];
    if (announcement.rawImageUrls && Array.isArray(announcement.rawImageUrls)) {
      announcement.rawImageUrls.forEach((u) => {
        if (typeof u === 'string' && u.trim() && !list.includes(u.trim())) {
          list.push(u.trim());
        }
      });
    }
    if (list.length === 0 && announcement.rawImageUrl) {
      list.push(announcement.rawImageUrl.trim());
    }
    return list.slice(0, 3);
  }, [announcement]);

  // Reset active image when announcement changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [announcement?.id]);

  // Keyboard navigation for zoom lightbox
  useEffect(() => {
    if (!imageZoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImageZoomed(false);
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % Math.max(1, displayImages.length));
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + displayImages.length) % Math.max(1, displayImages.length));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageZoomed, displayImages.length]);

  if (!isOpen || !announcement) return null;

  const handleCopyLink = () => {
    try {
      const shareUrl = announcement.rawImageUrl || window.location.href;
      navigator.clipboard.writeText(`${announcement.title}\n${announcement.content}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDetailImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, originalSrc?: string) => {
    const target = e.currentTarget;
    const srcToCheck = originalSrc || target.src;
    const fileId = extractGoogleDriveFileId(srcToCheck);
    if (!fileId) return;

    if (target.src.includes('/api/drive-image')) {
      target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
      return;
    }
    if (target.src.includes('google.com/thumbnail')) {
      target.src = `https://lh3.googleusercontent.com/d/${fileId}`;
      return;
    }
    if (target.src.includes('googleusercontent.com')) {
      target.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
      return;
    }
  };

  // Format date display
  const formatDateRange = () => {
    if (announcement.startDate && announcement.endDate) {
      return `${announcement.startDate} - ${announcement.endDate}`;
    }
    if (announcement.startDate) {
      return `${announcement.startDate} ${t.onwards}`;
    }
    return t.unspecifiedDuration;
  };

  const getStatusBadge = () => {
    if (announcement.status === 'upcoming') {
      return {
        label: t.statusUpcoming,
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (announcement.status === 'expired') {
      return {
        label: t.statusExpired,
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
      };
    }
    return {
      label: t.statusActive,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500 animate-pulse',
    };
  };

  const statusBadge = getStatusBadge();
  const formattedDept = formatDepartmentName(announcement.department, language);

  return (
    <>
      <div 
        id="announcement-detail-backdrop"
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          id="announcement-detail-modal"
          className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Bar */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300/90">
                    {t.companyPRBadge}
                  </span>
                  {announcement.isPinned && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/90 text-amber-950 flex items-center gap-1 border border-amber-300 shadow-xs">
                      <Pin className="w-3 h-3 fill-amber-950" />
                      <span>{t.pinnedBadge}</span>
                    </span>
                  )}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusBadge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    {statusBadge.label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white truncate max-w-md">
                  {formattedDept}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Admin Edit Announcement Button */}
              {isAdmin && onEditAnnouncement && (
                <button
                  id="btn-edit-announcement-modal"
                  onClick={() => onEditAnnouncement(announcement)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white/15 hover:bg-white/25 text-white border border-white/20"
                  title="แก้ไขข้อมูลข่าวประชาสัมพันธ์นี้"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">แก้ไขข้อมูล</span>
                </button>
              )}

              {/* Admin Pin/Unpin Button */}
              {isAdmin && onTogglePin && (
                <button
                  id="btn-toggle-pin-modal"
                  onClick={() => onTogglePin(announcement)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    announcement.isPinned
                      ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-xs'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  }`}
                  title={announcement.isPinned ? t.unpinAnnouncementTitle : t.pinAnnouncementTitle}
                >
                  <Pin className={`w-3.5 h-3.5 ${announcement.isPinned ? 'fill-amber-950 rotate-45' : ''}`} />
                  <span className="hidden sm:inline">{announcement.isPinned ? t.unpinAction : t.pinAction}</span>
                </button>
              )}

              <button
                id="btn-copy-announcement"
                onClick={handleCopyLink}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer"
                title={t.copyLink}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
              </button>
              <button
                id="btn-print-announcement"
                onClick={handlePrint}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer hidden sm:flex"
                title={t.printDoc}
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                id="btn-close-announcement-detail"
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer"
                title={t.closeModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* Title & Metadata */}
            <div className="space-y-3 border-b border-slate-100 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                {announcement.isPinned && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Pin className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
                    <span>{t.pinnedByNotice} {announcement.pinnedBy ? `(${announcement.pinnedBy})` : ''}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {formattedDept}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  {formatDateRange()}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {announcement.title}
              </h2>
            </div>

            {/* Attached Image Section - 3-Image Rotating Carousel with Thumbnails */}
            {displayImages.length > 0 && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950/5 flex items-center justify-center group shadow-xs">
                  <AnnouncementCarousel
                    images={displayImages}
                    title={announcement.title}
                    activeIndex={activeImageIndex}
                    onIndexChange={(idx) => setActiveImageIndex(idx)}
                    aspectClass="w-full h-[300px] sm:h-[420px]"
                    objectFit="contain"
                    showControls={displayImages.length > 1}
                    showIndicators={displayImages.length > 1}
                    showBadge={displayImages.length > 1}
                    badgePosition="top-right"
                    autoRotateInterval={4000}
                    onImageClick={(idx) => {
                      setActiveImageIndex(idx);
                      setImageZoomed(true);
                    }}
                  />
                  
                  {/* Floating Zoom Button */}
                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs shadow-md">
                    <button
                      onClick={() => setImageZoomed(true)}
                      className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer font-medium"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>{t.zoomFullImage}</span>
                    </button>
                    {rawImages[activeImageIndex] && (
                      <a
                        href={rawImages[activeImageIndex]}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-amber-300 transition-colors border-l border-white/30 pl-2 text-white/80 hover:text-white"
                        title="เปิดดูไฟล์ต้นฉบับในแท็บใหม่"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Multiple Images Selector Strip (when 2 or 3 images exist) */}
                {displayImages.length > 1 && (
                  <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {displayImages.map((imgUrl, idx) => {
                        const isCurrent = idx === activeImageIndex;
                        return (
                          <button
                            key={`thumb-${imgUrl}-${idx}`}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20 text-blue-700'
                                : 'bg-slate-100 hover:bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`รูปที่ ${idx + 1}`}
                              onError={(e) => handleDetailImageError(e, imgUrl)}
                              className="w-7 h-7 rounded-md object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <span>รูปที่ {idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 shrink-0 hidden sm:inline">
                      {displayImages.length} รูปภาพหมุนวน
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Announcement Full Content */}
            <div className="space-y-4">
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  {t.announcementDetailsTitle}
                </h4>
                <p className="text-base text-slate-800 leading-relaxed whitespace-pre-line">
                  {announcement.content}
                </p>
              </div>

              {/* Validity timeline info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-sky-800">{t.startDateLabel}</div>
                    <div className="text-sm font-bold text-slate-900">{announcement.startDate || t.unspecifiedDate}</div>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-amber-800">{t.endDateLabel}</div>
                    <div className="text-sm font-bold text-slate-900">{announcement.endDate || t.unspecifiedEndDate}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500">
              {t.departmentLabel} <strong className="text-slate-800">{formattedDept}</strong>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && onEditAnnouncement && (
                <button
                  id="btn-edit-announcement-footer"
                  onClick={() => onEditAnnouncement(announcement)}
                  className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูลข่าว</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-all cursor-pointer shadow-2xs"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Zoom Lightbox Overlay with 3-Image Gallery */}
      {imageZoomed && displayImages.length > 0 && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setImageZoomed(false)}
        >
          {/* Top Bar inside Lightbox */}
          <div className="w-full flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold bg-white/15 px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-300" />
                <span>รูปที่ {activeImageIndex + 1} จาก {displayImages.length}</span>
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline">
                {announcement.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {rawImages[activeImageIndex] && (
                <a
                  href={rawImages[activeImageIndex]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/80 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="เปิดดูไฟล์ต้นฉบับในแท็บใหม่"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">เปิดไฟล์ต้นฉบับ</span>
                </a>
              )}
              <button
                onClick={() => setImageZoomed(false)}
                className="text-white/80 hover:text-white bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-all cursor-pointer"
                title={t.closeModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Zoomed Image Area with Navigation Arrows */}
          <div className="relative w-full flex-1 flex items-center justify-center my-auto min-h-0" onClick={(e) => e.stopPropagation()}>
            {displayImages.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl transition-all hover:scale-110 cursor-pointer"
                aria-label="รูปก่อนหน้า"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}

            <img
              src={displayImages[activeImageIndex]}
              alt={`${announcement.title} - รูปที่ ${activeImageIndex + 1}`}
              onError={(e) => handleDetailImageError(e, displayImages[activeImageIndex])}
              className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl transition-all duration-300"
              referrerPolicy="no-referrer"
            />

            {displayImages.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev + 1) % displayImages.length)}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl transition-all hover:scale-110 cursor-pointer"
                aria-label="รูปถัดไป"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Lightbox */}
          {displayImages.length > 1 && (
            <div 
              className="flex items-center gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {displayImages.map((imgUrl, idx) => {
                const isSelected = idx === activeImageIndex;
                return (
                  <button
                    key={`zoom-thumb-${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative rounded-xl overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-amber-400 scale-105 opacity-100'
                        : 'opacity-50 hover:opacity-85'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`ภาพที่ ${idx + 1}`}
                      onError={(e) => handleDetailImageError(e, imgUrl)}
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
};
