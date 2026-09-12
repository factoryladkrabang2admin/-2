import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  QrCode, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Download,
  Share2,
  PackageCheck,
  Building2,
  Send,
  Inbox,
  Clock,
  FileText,
  Lock
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';

interface ModernParcelQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  parcel?: ParcelDeliveryRecord | null;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
}

// Cute Courier Mascot SVG encoded as Data URL for QR Code Center Excavation
const CUTE_CARTOON_MASCOT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF5F7" />
      <stop offset="100%" stop-color="#FFE4E9" />
    </linearGradient>
    <linearGradient id="capGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F43F5E" />
      <stop offset="100%" stop-color="#BE185D" />
    </linearGradient>
    <linearGradient id="boxGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#BE185D" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Cute Circular Badge Base -->
  <circle cx="60" cy="60" r="56" fill="url(#bgGrad)" stroke="#F43F5E" stroke-width="4" filter="url(#shadow)" />
  <circle cx="60" cy="60" r="51" fill="none" stroke="#FDA4AF" stroke-width="1.5" stroke-dasharray="3 3" />

  <!-- Cute Bunny Courier Ears -->
  <!-- Left Ear -->
  <g transform="rotate(-15 42 26)">
    <ellipse cx="42" cy="26" rx="9" ry="19" fill="#FFFFFF" stroke="#F43F5E" stroke-width="2.5" />
    <ellipse cx="42" cy="27" rx="5" ry="12" fill="#FDA4AF" />
  </g>
  <!-- Right Ear -->
  <g transform="rotate(15 78 26)">
    <ellipse cx="78" cy="26" rx="9" ry="19" fill="#FFFFFF" stroke="#F43F5E" stroke-width="2.5" />
    <ellipse cx="78" cy="27" rx="5" ry="12" fill="#FDA4AF" />
  </g>

  <!-- Courier Hat / Cap -->
  <path d="M 36 43 Q 60 27 84 43 Q 90 48 82 51 Q 60 48 38 51 Q 30 48 36 43 Z" fill="url(#capGrad)" stroke="#9F1239" stroke-width="1.5" />
  <!-- Cap Visor -->
  <path d="M 33 48 Q 60 56 87 48 Q 78 55 42 55 Z" fill="#881337" opacity="0.85" />
  <!-- Cap Badge (Golden Star) -->
  <circle cx="60" cy="39" r="5" fill="#FDE047" stroke="#CA8A04" stroke-width="1" />
  <path d="M 60 36 L 61.2 38.5 L 64 38.8 L 62 40.7 L 62.5 43.5 L 60 42.1 L 57.5 43.5 L 58 40.7 L 56 38.8 L 58.8 38.5 Z" fill="#EAB308" />

  <!-- Bunny Head -->
  <ellipse cx="60" cy="63" rx="27" ry="22" fill="#FFFFFF" stroke="#F43F5E" stroke-width="2" />

  <!-- Rosy Pink Cheeks with Sparkle -->
  <ellipse cx="41" cy="68" rx="6.5" ry="4" fill="#FDA4AF" opacity="0.85" />
  <ellipse cx="79" cy="68" rx="6.5" ry="4" fill="#FDA4AF" opacity="0.85" />

  <!-- Happy Anime Eyes with Highlights -->
  <ellipse cx="47" cy="61" rx="3.8" ry="4.8" fill="#1E293B" />
  <circle cx="45.5" cy="59.5" r="1.6" fill="#FFFFFF" />
  <circle cx="48.5" cy="63" r="0.8" fill="#FFFFFF" />

  <ellipse cx="73" cy="61" rx="3.8" ry="4.8" fill="#1E293B" />
  <circle cx="71.5" cy="59.5" r="1.6" fill="#FFFFFF" />
  <circle cx="74.5" cy="63" r="0.8" fill="#FFFFFF" />

  <!-- Cute Nose & Mouth -->
  <path d="M 58 64 Q 60 66 62 64" fill="none" stroke="#F43F5E" stroke-width="1.8" stroke-linecap="round" />
  <path d="M 57 66 Q 60 70 63 66" fill="none" stroke="#E11D48" stroke-width="2" stroke-linecap="round" />

  <!-- Cute Parcel Box in Paws -->
  <g transform="translate(41, 74)">
    <!-- Box Body -->
    <rect x="0" y="2" width="38" height="24" rx="4" fill="url(#boxGrad)" stroke="#D97706" stroke-width="2" />
    <!-- Ribbon Vertical -->
    <rect x="16" y="2" width="6" height="24" fill="#F43F5E" />
    <!-- Ribbon Horizontal -->
    <rect x="0" y="11" width="38" height="5" fill="#F43F5E" />
    <!-- Little Heart Sticker on Parcel -->
    <path d="M 19 9 C 19 6.5, 15.5 6.5, 15.5 9 C 15.5 11.5, 19 14, 19 14 C 19 14, 22.5 11.5, 22.5 9 C 22.5 6.5, 19 6.5, 19 9 Z" fill="#FFFFFF" />
  </g>

  <!-- Paws holding the Box -->
  <ellipse cx="40" cy="83" rx="5" ry="6" fill="#FFFFFF" stroke="#F43F5E" stroke-width="1.5" transform="rotate(18 40 83)" />
  <ellipse cx="80" cy="83" rx="5" ry="6" fill="#FFFFFF" stroke="#F43F5E" stroke-width="1.5" transform="rotate(-18 80 83)" />
</svg>
`)}`;

export const ModernParcelQrModal: React.FC<ModernParcelQrModalProps> = ({
  isOpen,
  onClose,
  url: propUrl,
  parcel,
  currentUser,
  isAuthenticated,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const trackingCode = parcel?.trackingCode || '';
  const isParcelTracking = Boolean(parcel && trackingCode);
  const isAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);

  // Restrict visibility of Parcel Tracking QR Code to Admins and Page Admins only
  if (isParcelTracking && !isAdmin) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 text-center relative overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 mb-2">
            จำกัดสิทธิ์การเข้าถึง
          </span>

          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
            เฉพาะผู้ดูแลและแอดมินเพจเท่านั้น
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            QR Code ติดตามสถานะพัสดุนี้ ถูกจำกัดสิทธิ์การมองเห็นเฉพาะ ผู้ดูแลระบบและแอดมินเพจ (Supervisor / Page Administrator) เท่านั้น
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const fallbackPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  const effectiveUrl = propUrl || (
    isParcelTracking
      ? `${fallbackOrigin}${fallbackPath}?tab=document_delivery&track=${encodeURIComponent(trackingCode)}`
      : `${fallbackOrigin}${fallbackPath}?tab=document_delivery`
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(effectiveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // High-resolution Canvas generator for downloading the Modern QR with the cute cartoon center
  const handleDownloadQr = async () => {
    try {
      setDownloading(true);
      const canvas = document.createElement('canvas');
      const size = 800; // High resolution 800x800 for crisp printing
      canvas.width = size;
      canvas.height = isParcelTracking ? 1100 : size + 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background gradient (Soft luxurious blush)
      const bgGrad = ctx.createLinearGradient(0, 0, size, canvas.height);
      bgGrad.addColorStop(0, '#FFF5F7');
      bgGrad.addColorStop(0.5, '#FFFFFF');
      bgGrad.addColorStop(1, '#FFF1F2');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card outer decorative rounded frame
      ctx.save();
      ctx.strokeStyle = '#FDA4AF';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
      ctx.restore();

      // 2. Header Text
      ctx.fillStyle = '#9F1239';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isParcelTracking ? 'ระบบติดตามสถานะ รับ-ส่ง เอกสาร / พัสดุ' : 'รับ - ส่ง เอกสาร / พัสดุ',
        size / 2,
        65
      );

      ctx.fillStyle = '#E11D48';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('โรงงานลาดกระบัง 2 (LKB2)', size / 2, 98);

      if (isParcelTracking && trackingCode) {
        // Tracking code badge on canvas
        ctx.fillStyle = '#F43F5E';
        ctx.beginPath();
        ctx.roundRect((size - 440) / 2, 115, 440, 48, 24);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`รหัสติดตาม: ${trackingCode}`, size / 2, 147);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.font = '500 20px sans-serif';
        ctx.fillText('สแกน QR Code เพื่อเปิดหน้าต่างทำรายการ', size / 2, 130);
      }

      // 3. Render the QR SVG to Image and draw on canvas
      const svgElement = qrContainerRef.current?.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const blobURL = URL.createObjectURL(svgBlob);

        const qrImg = new Image();
        qrImg.onload = () => {
          const qrSize = 520;
          const qrX = (size - qrSize) / 2;
          const qrY = isParcelTracking ? 180 : 155;

          // QR Card background with rounded shadow
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = 'rgba(244, 63, 94, 0.2)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetY = 8;
          ctx.beginPath();
          ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 32);
          ctx.fill();
          ctx.shadowColor = 'transparent';

          // Inner pink accent border
          ctx.strokeStyle = '#FECDD3';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Draw the QR image (which already includes the cute cartoon excavated center)
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          if (isParcelTracking && parcel) {
            // Details box at bottom of canvas
            const boxY = qrY + qrSize + 40;
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#FBCFE8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(40, boxY, size - 80, 220, 20);
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'left';
            ctx.fillStyle = '#831843';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(`รายการ: ${parcel.itemTitle || '-'}`, 65, boxY + 45);

            ctx.fillStyle = '#334155';
            ctx.font = '18px sans-serif';
            ctx.fillText(`ผู้ส่ง: ${parcel.senderName} (${parcel.senderDepartment})`, 65, boxY + 85);
            ctx.fillText(`ผู้รับ: ${parcel.recipientName} (${parcel.recipientDepartment})`, 65, boxY + 125);

            ctx.fillStyle = '#64748B';
            ctx.font = '16px sans-serif';
            ctx.fillText(`วันที่เวลาบันทึก: ${parcel.timestamp}`, 65, boxY + 165);

            ctx.fillStyle = '#E11D48';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(`ประเภท: ${parcel.actionType === 'ส่ง' ? 'รายการส่ง (Outgoing)' : 'รายการรับ (Incoming)'}`, 65, boxY + 195);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#9D174D';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('✨ สแกนด้วยกล้องมือถือเพื่อติดตามสถานะการจัดส่งแบบเรียลไทม์ ✨', size / 2, canvas.height - 35);
          } else {
            // 4. Footer brand
            ctx.fillStyle = '#BE185D';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('✨ สแกนเพื่อเข้าสู่หน้าต่าง รับ-ส่ง เอกสาร / พัสดุ ✨', size / 2, size + 115);
          }

          // Trigger download
          const link = document.createElement('a');
          link.download = isParcelTracking 
            ? `parcel-tracking-${trackingCode.replace(/\s+/g, '')}.png`
            : 'parcel-delivery-qr-code.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
          URL.revokeObjectURL(blobURL);
          setDownloading(false);
        };
        qrImg.src = blobURL;
      } else {
        setDownloading(false);
      }
    } catch (err) {
      console.error('Error downloading modern QR code:', err);
      setDownloading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-gradient-to-b from-white via-white to-pink-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-3xl shadow-2xl border border-pink-200/80 dark:border-pink-900/40 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-pink-400/20 dark:bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-5 pt-5 pb-3 border-b border-pink-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-pink-500/30 shrink-0">
              <QrCode className="w-5 h-5" />
              <Sparkles className="w-3.5 h-3.5 text-amber-200 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                  {isParcelTracking 
                    ? (language === 'th' ? 'QR Code ติดตามสถานะพัสดุ' : 'Parcel Tracking QR Code')
                    : (language === 'th' ? 'QR Code รับ - ส่งเอกสาร / พัสดุ' : 'Parcel Delivery QR Code')}
                </h3>
                {!isParcelTracking && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 border border-pink-300/60">
                    Direct Link
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isParcelTracking 
                  ? (language === 'th' ? 'สแกนเพื่อตรวจสอบสถานะการจัดส่งแบบเรียลไทม์' : 'Scan to check parcel status in real-time')
                  : (language === 'th' ? 'สแกนด้วยมือถือเพื่อเปิดหน้าต่างทำรายการทันที' : 'Scan to open delivery window immediately')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={language === 'th' ? 'ปิด' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Modern QR Code Display with Cute Cartoon Center */}
        <div className="relative z-10 p-5 flex flex-col items-center justify-center text-center">
          
          {/* Tracking Code Chip when parcel tracking is active */}
          {isParcelTracking && trackingCode && (
            <div className="mb-3.5 w-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 p-0.5 rounded-2xl shadow-md">
              <div className="bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-[14px] flex items-center justify-between gap-2">
                <div className="text-left min-w-0">
                  <div className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                    {language === 'th' ? 'รหัสติดตามสถานะ' : 'Tracking Code'}
                  </div>
                  <div className="font-mono font-black text-base text-slate-900 dark:text-white tracking-wider truncate">
                    {trackingCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/60 hover:bg-pink-100 text-pink-700 dark:text-pink-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-pink-200 dark:border-pink-800 shrink-0"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Modern QR Frame with Corner Brackets & Soft Ambient Ring */}
          <div className="relative group p-1 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-400 shadow-xl shadow-pink-500/20">
            <div 
              ref={qrContainerRef}
              className="relative p-4 sm:p-5 bg-white rounded-[22px] overflow-hidden flex items-center justify-center"
            >
              {/* Modern Tech-Corner Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-pink-500 rounded-tl-md pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-pink-500 rounded-tr-md pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-pink-500 rounded-bl-md pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-pink-500 rounded-br-md pointer-events-none" />

              {/* Gentle Laser Scanning Beam Animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse pointer-events-none opacity-40 top-1/2 -translate-y-1/2" />

              {/* High-Resolution SVG QR Code with High Error Correction and Cute Cartoon Excavation */}
              <QRCodeSVG
                value={effectiveUrl}
                size={230}
                level="H" // High error correction level (30%) ensures instant scan reliability with center logo
                fgColor="#0f172a"
                bgColor="#ffffff"
                marginSize={1}
                imageSettings={{
                  src: CUTE_CARTOON_MASCOT_SVG,
                  height: 60,
                  width: 60,
                  excavate: true, // Cleans underlying dark QR blocks cleanly around the cute mascot
                }}
              />

              {/* Cute Cartoon Mascot Optical Layer with subtle hover bounce */}
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                aria-hidden="true"
              >
                <div className="relative w-15 h-15 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 shadow-md shadow-pink-500/30 transform transition-transform group-hover:scale-105">
                  <img
                    src={CUTE_CARTOON_MASCOT_SVG}
                    alt="Cute Delivery Mascot"
                    className="w-full h-full rounded-full bg-white object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle twinkle star badge */}
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                    <Sparkles className="relative w-3.5 h-3.5 text-amber-400 fill-amber-300 drop-shadow-xs" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Parcel Details Mini Card if parcel exists */}
          {isParcelTracking && parcel ? (
            <div className="mt-3.5 w-full bg-pink-50/70 dark:bg-slate-800/80 border border-pink-200/80 dark:border-pink-900/40 rounded-2xl p-3 text-left space-y-1.5 text-xs">
              <div className="font-bold text-pink-900 dark:text-pink-100 line-clamp-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                <span>{parcel.itemTitle}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-pink-100 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">ผู้ส่ง:</span>
                  <span className="font-semibold text-slate-800 dark:text-white truncate block">{parcel.senderName}</span>
                  <span className="text-slate-500 dark:text-slate-400 truncate block">({parcel.senderDepartment})</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">ผู้รับ:</span>
                  <span className="font-semibold text-slate-800 dark:text-white truncate block">{parcel.recipientName}</span>
                  <span className="text-slate-500 dark:text-slate-400 truncate block">({parcel.recipientDepartment})</span>
                </div>
              </div>
            </div>
          ) : (
            /* Subtitle Badge */
            <div className="mt-3.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 dark:from-pink-950/40 dark:via-slate-800 dark:to-slate-850 text-pink-900 dark:text-pink-200 border border-pink-200/80 dark:border-pink-900/60 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <PackageCheck className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
              <span>{language === 'th' ? 'หน้าต่างแสดงข้อมูลและทำรายการ รับ-ส่ง เอกสาร / พัสดุ' : 'Document & Parcel Delivery Window'}</span>
            </div>
          )}

          {/* URL Box with Quick Copy Button */}
          <div className="mt-3 w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-left shadow-2xs">
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate flex-1 select-all px-1">
              {effectiveUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white dark:bg-slate-700 hover:bg-pink-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
              }`}
              title={language === 'th' ? 'คัดลอกลิงก์' : 'Copy Link'}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                  <span>{language === 'th' ? 'คัดลอก' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Action Footer Buttons */}
        <div className="relative z-10 px-5 pb-5 pt-1 grid grid-cols-2 gap-2.5">
          {/* Open Link Directly in New Tab */}
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:via-rose-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{language === 'th' ? 'เปิดลิงก์ติดตาม' : 'Open Link'}</span>
          </a>

          {/* Download High Quality QR Code Image */}
          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={downloading}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-pink-200 dark:border-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-4 h-4 text-pink-600 dark:text-pink-400 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึกบัตร QR' : 'Save QR Card')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
