import React, { useState, useEffect } from 'react';
import { LaundryOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ArrowLeft,
  Copy,
  Printer,
  Share2,
  RefreshCw,
  Check,
  Download,
  Image as ImageIcon,
  ZoomIn,
  Sparkles,
  X
} from 'lucide-react';

interface MobileTrackingViewProps {
  order: LaundryOrder;
  onClose?: () => void;
  onRefresh?: () => void;
  isStandalone?: boolean; // When opened directly via QR code or URL
}

export const MobileTrackingView: React.FC<MobileTrackingViewProps> = ({
  order,
  onClose,
  onRefresh,
  isStandalone = false,
}) => {
  const { language } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [showFullImageModal, setShowFullImageModal] = useState(false);

  const currentStage: 'washing' | 'ready' = 
    (order.stage === 'ready' || order.stage === 'delivered') ? 'ready' : 'washing';

  const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                         order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  const trackingUrl = typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}${window.location.pathname}?track=${encodeURIComponent(order.trackingCode)}`
    : `https://app.laundry.com/track?code=${encodeURIComponent(order.trackingCode)}`;

  // Generate crisp 2x Canvas Status Image
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;

    const isReady = currentStage === 'ready';

    // 1. Background (Deep Dark Slate with subtle vignette)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Subtle background mesh glow
    const bgGlow = ctx.createRadialGradient(width / 2, 260, 20, width / 2, 260, 480);
    if (isReady) {
      bgGlow.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
      bgGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else {
      bgGlow.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
      bgGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    }
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, height);

    // 2. Header Box (Royal Navy)
    const headerGrad = ctx.createLinearGradient(0, 0, width, 210);
    headerGrad.addColorStop(0, '#001a38');
    headerGrad.addColorStop(1, '#003366');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, 210);

    // Top status indicator bar
    ctx.fillStyle = isReady ? '#10b981' : '#f59e0b';
    ctx.fillRect(0, 0, width, 8);

    // System Title
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('LAUNDRY TRACKING SYSTEM • REAL-TIME', 45, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText('บัตรติดตามสถานะผ้าเรียลไทม์', 45, 96);

    // Tracking Code Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(45, 120, 290, 52, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(order.trackingCode, 65, 155);

    // Live Badge Pill
    ctx.fillStyle = isReady ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)';
    ctx.beginPath();
    ctx.roundRect(width - 200, 42, 155, 42, 21);
    ctx.fill();
    ctx.strokeStyle = isReady ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isReady ? '#34d399' : '#fbbf24';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('● LIVE STATUS', width - 180, 69);

    // 3. Main Status Banner Card
    const statusY = 230;
    const statusH = 175;
    const statusGrad = ctx.createLinearGradient(45, statusY, width - 45, statusY + statusH);
    if (isReady) {
      statusGrad.addColorStop(0, '#059669');
      statusGrad.addColorStop(1, '#0f766e');
    } else {
      statusGrad.addColorStop(0, '#d97706');
      statusGrad.addColorStop(1, '#c2410c');
    }
    ctx.fillStyle = statusGrad;
    ctx.beginPath();
    ctx.roundRect(45, statusY, width - 90, statusH, 24);
    ctx.fill();

    // Status Title & Subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('สถานะปัจจุบัน (CURRENT STATUS)', 78, statusY + 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px system-ui, -apple-system, sans-serif';
    ctx.fillText(isReady ? 'ซักเสร็จเรียบร้อยแล้ว' : 'อยู่ระหว่างซัก - อบผ้า', 78, statusY + 102);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      isReady ? 'ผ้าผ่านการซัก-อบฆ่าเชื้อ พร้อมส่งมอบคืนแผนก' : 'กำลังดำเนินการซักและอบแห้งด้วยความร้อนตามมาตรฐาน',
      78,
      statusY + 144
    );

    // 4. White Content Body Card
    const cardY = 425;
    const cardH = 630;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(45, cardY, width - 90, cardH, 24);
    ctx.fill();

    // Row 1: แผนก & ผู้ส่ง
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.fillText('แผนกที่ส่งผ้า (DEPARTMENT)', 80, cardY + 48);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.fillText(order.customerRoomOrDept || 'แผนกทั่วไป', 80, cardY + 90);

    ctx.fillStyle = '#64748b';
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillText(`ผู้ส่ง/ผู้รับผิดชอบ: ${order.customerName}`, 80, cardY + 124);

    // Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, cardY + 150);
    ctx.lineTo(width - 80, cardY + 150);
    ctx.stroke();

    // Row 2: ประเภทผ้า & จำนวน
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.fillText('ประเภทผ้า (GARMENT TYPE)', 80, cardY + 190);

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillText(garmentTypeName, 80, cardY + 232);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.fillText('จำนวนผ้าทั้งหมด', width - 270, cardY + 190);

    ctx.fillStyle = '#002045';
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${totalItems} ชิ้น`, width - 270, cardY + 232);

    // Divider
    ctx.beginPath();
    ctx.moveTo(80, cardY + 260);
    ctx.lineTo(width - 80, cardY + 260);
    ctx.stroke();

    // Row 3: Timelines
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('ขั้นตอนการดำเนินงาน (WORKFLOW STEPS)', 80, cardY + 305);

    // Step 1
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(102, cardY + 355, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓', 95, cardY + 361);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('1. รับผ้าเข้าสู่ระบบเรียบร้อย', 135, cardY + 362);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 19px monospace';
    ctx.fillText(order.receivedAt, width - 260, cardY + 362);

    // Step 2
    ctx.fillStyle = isReady ? '#10b981' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(102, cardY + 425, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(isReady ? '✓' : '●', 95, cardY + 431);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('2. กระบวนการซักและอบความร้อน', 135, cardY + 431);
    ctx.fillStyle = isReady ? '#10b981' : '#d97706';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(isReady ? 'เสร็จสิ้น' : 'กำลังดำเนินการ', width - 245, cardY + 431);

    // Step 3
    ctx.fillStyle = isReady ? '#10b981' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(102, cardY + 495, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(isReady ? '✓' : '3', 96, cardY + 501);

    ctx.fillStyle = isReady ? '#047857' : '#94a3b8';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('3. ซักเสร็จเรียบร้อย พร้อมส่งมอบ', 135, cardY + 501);
    if (isReady) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('พร้อมรับผ้า', width - 200, cardY + 501);
    }

    // Step 4 Box: Timestamps
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(80, cardY + 540, width - 160, 64, 14);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.fillText(`วันที่ส่งคืน: ${order.estimatedCompletion || order.receivedAt}`, 105, cardY + 580);

    // 5. Footer Information
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ระบบติดตามสถานะผ้าอัตโนมัติ (Automated Linen Status Tracker)', width / 2, 1090);
    ctx.fillStyle = '#64748b';
    ctx.font = '16px monospace';
    ctx.fillText(`ID: ${order.trackingCode} • วันที่: ${new Date().toLocaleDateString('th-TH')}`, width / 2, 1125);
    ctx.textAlign = 'left';

    const dataUrl = canvas.toDataURL('image/png');
    setGeneratedImageUrl(dataUrl);
  }, [order, currentStage, garmentTypeName, totalItems]);

  const handleCopy = () => {
    navigator.clipboard.writeText(order.trackingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `รูปภาพสถานะผ้า ${order.trackingCode}`,
          text: `สถานะผ้า ${order.customerRoomOrDept} (${garmentTypeName}): ${currentStage === 'ready' ? 'ซักเสร็จแล้ว' : 'อยู่ระหว่างซัก-อบ'}`,
          url: trackingUrl,
        });
      } catch {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(trackingUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `Laundry_Status_${order.trackingCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`w-full flex items-center justify-center ${isStandalone ? 'min-h-screen bg-slate-950 p-2 sm:p-4' : ''}`}>
      {/* Clean Status Image Card Container */}
      <div className="relative w-full max-w-[460px] bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top App Header & Controls */}
        <div className="bg-gradient-to-r from-[#002045] to-[#003875] text-white p-3.5 shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
                  title="ย้อนกลับ / ปิด"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{language === 'th' ? 'รูปภาพสถานะผ้าเรียลไทม์' : 'Live Status Picture'}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleManualRefresh}
                className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
                title="อัปเดตสถานะ"
              >
                <RefreshCw className="w-4 h-4 text-[#66affe]" />
              </button>
              <button
                onClick={handleDownloadImage}
                className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs flex items-center gap-1.5 text-xs font-bold"
                title="บันทึกรูปภาพสถานะ (Save Image)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>เซฟรูป</span>
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="แชร์รูปภาพ / ลิงก์"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Body Content: Display Status as Image */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950">
          {/* Rendered Digital Image Card */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-xl group">
            {generatedImageUrl ? (
              <>
                <img 
                  src={generatedImageUrl} 
                  alt={`Laundry Status - ${order.trackingCode}`} 
                  className="w-full h-auto object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                  onClick={() => setShowFullImageModal(true)}
                />
                
                {/* Zoom / Tap hint badge */}
                <div 
                  onClick={() => setShowFullImageModal(true)}
                  className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-md cursor-pointer hover:bg-black"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-[#66affe]" />
                  <span>แตะเพื่อดูรูปขนาดเต็ม</span>
                </div>
              </>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs">กำลังสร้างรูปภาพสถานะ...</span>
              </div>
            )}
          </div>

          {/* Action Buttons for Image */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleDownloadImage}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>บันทึกรูปภาพ</span>
            </button>
            <button
              onClick={() => setShowFullImageModal(true)}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5 text-[#66affe]" />
              <span>ดูรูปเต็ม</span>
            </button>
            <button
              onClick={handleShare}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#66affe]" />
              <span>แชร์</span>
            </button>
            <button
              onClick={handleCopy}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'คัดลอกแล้ว' : 'รหัสผ้า'}</span>
            </button>
          </div>

          {/* Share Toast */}
          {showShareToast && (
            <div className="p-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl text-center shadow-lg animate-in fade-in duration-150 flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>คัดลอกลิงก์รูปภาพติดตามเรียบร้อยแล้ว</span>
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs shrink-0 text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Digital Status Card</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 font-mono">{order.trackingCode}</span>
        </div>
      </div>

      {/* FULL IMAGE PREVIEW MODAL */}
      {showFullImageModal && generatedImageUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="max-w-md w-full flex items-center justify-between text-white mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>รูปภาพสถานะผ้า (Full Image View)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadImage}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>บันทึกรูป</span>
              </button>
              <button
                onClick={() => setShowFullImageModal(false)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-w-md w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center p-1">
            <img 
              src={generatedImageUrl} 
              alt="Full Laundry Status" 
              className="w-full h-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
