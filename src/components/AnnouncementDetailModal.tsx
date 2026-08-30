import React, { useState } from 'react';
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
  Pin
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDepartmentName } from './AnnouncementsView';

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  announcement: AnnouncementItem | null;
  onClose: () => void;
  isAdmin?: boolean;
  onTogglePin?: (item: AnnouncementItem) => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  isOpen,
  announcement,
  onClose,
  isAdmin = false,
  onTogglePin,
}) => {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);

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

            {/* Attached Image Section - Sized precisely to fit the image */}
            {announcement.imageUrl && !imageError && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950/5 flex items-center justify-center group shadow-xs">
                <img
                  src={announcement.imageUrl}
                  alt={announcement.title}
                  onError={() => setImageError(true)}
                  className="w-full max-h-[520px] object-contain mx-auto cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.01]"
                  onClick={() => setImageZoomed(true)}
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating Zoom Button */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs shadow-md">
                  <button
                    onClick={() => setImageZoomed(true)}
                    className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer font-medium"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>{t.zoomFullImage}</span>
                  </button>
                </div>
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

      {/* Fullscreen Image Zoom Overlay */}
      {imageZoomed && announcement.imageUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setImageZoomed(false)}
        >
          <button
            onClick={() => setImageZoomed(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-all cursor-pointer"
            title={t.closeModal}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={announcement.imageUrl}
            alt={announcement.title}
            className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
};
