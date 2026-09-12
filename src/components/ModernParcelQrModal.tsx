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
  PackageCheck
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ModernParcelQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
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
  url,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // High-resolution Canvas generator for downloading the Modern QR with the cute cartoon center
  const handleDownloadQr = async () => {
    try {
      setDownloading(true);
      const canvas = document.createElement('canvas');
      const size = 800; // High resolution 800x800 for crisp printing
      canvas.width = size;
      canvas.height = size + 160; // Extra room for title header and footer
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background gradient (Soft luxurious blush)
      const bgGrad = ctx.createLinearGradient(0, 0, size, size + 160);
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
      ctx.fillText('รับ - ส่ง เอกสาร / พัสดุ', size / 2, 75);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 20px sans-serif';
      ctx.fillText('สแกน QR Code ด้วยกล้องมือถือเพื่อเปิดแบบฟอร์ม', size / 2, 115);

      // 3. Render the QR SVG to Image and draw on canvas
      const svgElement = qrContainerRef.current?.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const blobURL = URL.createObjectURL(svgBlob);

        const qrImg = new Image();
        qrImg.onload = () => {
          const qrX = (size - 600) / 2;
          const qrY = 145;

          // QR Card background with rounded shadow
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = 'rgba(244, 63, 94, 0.2)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetY = 8;
          ctx.beginPath();
          ctx.roundRect(qrX - 25, qrY - 25, 650, 650, 32);
          ctx.fill();
          ctx.shadowColor = 'transparent';

          // Inner pink accent border
          ctx.strokeStyle = '#FECDD3';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Draw the QR image (which already includes the cute cartoon excavated center)
          ctx.drawImage(qrImg, qrX, qrY, 600, 600);

          // 4. Footer brand
          ctx.fillStyle = '#BE185D';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('✨ สแกนเพื่อบันทึกข้อมูลเรียลไทม์ ✨', size / 2, size + 115);

          // Trigger download
          const link = document.createElement('a');
          link.download = 'parcel-delivery-qr-code.png';
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
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-pink-500/30 shrink-0">
              <QrCode className="w-5 h-5" />
              <Sparkles className="w-3.5 h-3.5 text-amber-200 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {language === 'th' ? 'QR Code รับ - ส่งเอกสาร / พัสดุ' : 'Parcel Delivery QR Code'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 border border-pink-300/60">
                  Modern
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'th' ? 'สแกนด้วยมือถือเพื่อเปิดแบบฟอร์มทันที' : 'Scan to open document & parcel delivery form'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title={language === 'th' ? 'ปิด' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Modern QR Code Display with Cute Cartoon Center */}
        <div className="relative z-10 p-5 flex flex-col items-center justify-center text-center">
          
          {/* Modern QR Frame with Corner Brackets & Soft Ambient Ring */}
          <div className="relative group p-1 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-400 shadow-xl shadow-pink-500/20">
            <div 
              ref={qrContainerRef}
              className="relative p-4 sm:p-5 bg-white rounded-[22px] overflow-hidden flex items-center justify-center"
            >
              {/* Modern Tech-Corner Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-pink-500 rounded-tl-md pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-pink-500 rounded-tr-md pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-pink-500 rounded-bl-md pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-pink-500 rounded-br-md pointer-events-none" />

              {/* Gentle Laser Scanning Beam Animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse pointer-events-none opacity-40 top-1/2 -translate-y-1/2" />

              {/* High-Resolution SVG QR Code with High Error Correction and Cute Cartoon Excavation */}
              <QRCodeSVG
                value={url}
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

          {/* Subtitle Badge */}
          <div className="mt-3.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 dark:from-pink-950/40 dark:via-slate-800 dark:to-slate-850 text-pink-900 dark:text-pink-200 border border-pink-200/80 dark:border-pink-900/60 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <PackageCheck className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
            <span>{language === 'th' ? 'แบบฟอร์ม Google Apps Script บันทึกส่งพัสดุ' : 'Google Apps Script Parcel & Document Form'}</span>
          </div>

          {/* URL Box with Quick Copy Button */}
          <div className="mt-3 w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-left shadow-2xs">
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate flex-1 select-all px-1">
              {url}
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
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:via-rose-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{language === 'th' ? 'เปิดแบบฟอร์ม' : 'Open Form'}</span>
          </a>

          {/* Download High Quality QR Code Image */}
          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={downloading}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-pink-200 dark:border-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-4 h-4 text-pink-600 dark:text-pink-400 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึกรูป QR' : 'Save QR')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
