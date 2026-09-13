import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Building2, 
  Clock, 
  Send, 
  Inbox, 
  Copy, 
  Check, 
  Sparkles,
  FileText,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount } from '../data/mockData';
import { isParcelConfirmedReceived } from '../utils/parcelTrackingUtils';

interface ParcelDetailModalProps {
  isOpen: boolean;
  parcel: ParcelDeliveryRecord | null;
  onClose: () => void;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
  onQuickReceive?: (parcel: ParcelDeliveryRecord) => void;
  allRecords?: ParcelDeliveryRecord[];
}

export const ParcelDetailModal: React.FC<ParcelDetailModalProps> = ({
  isOpen,
  parcel,
  onClose,
  currentUser,
  isAuthenticated,
  onQuickReceive,
  allRecords,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  if (!isOpen || !parcel) return null;

  const isSending = parcel.actionType === 'ส่ง';
  const isConfirmedReceived = isParcelConfirmedReceived(parcel, allRecords);

  const handleCopy = () => {
    const textToCopy = `[${parcel.actionType}] ${parcel.itemTitle} | ผู้ส่ง: ${parcel.senderName} (${parcel.senderDepartment}) -> ผู้รับ: ${parcel.recipientName} (${parcel.recipientDepartment}) | วันที่เวลา: ${parcel.timestamp}${parcel.trackingCode ? ` | รหัสติดตาม: ${parcel.trackingCode}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTrackingCode = () => {
    if (!parcel.trackingCode) return;
    navigator.clipboard.writeText(parcel.trackingCode);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Pink Gradient) */}
        <div className="p-6 relative text-white bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md shadow-inner text-white">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${
                    !isSending 
                      ? 'bg-emerald-900/40 text-emerald-100 border-emerald-400/60 shadow-xs'
                      : isConfirmedReceived
                        ? 'bg-emerald-900/40 text-emerald-100 border-emerald-400/60 shadow-xs'
                        : 'bg-rose-900/30 text-rose-100 border-white/30'
                  }`}>
                    {!isSending ? '📥 รายการรับ' : isConfirmedReceived ? '📤 รายการส่ง (รับแล้ว)' : '📤 รายการส่ง'}
                  </span>
                  {parcel.trackingCode && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border backdrop-blur-xs ${
                      isConfirmedReceived
                        ? 'bg-emerald-950/70 text-emerald-100 border-emerald-400/70 shadow-xs'
                        : 'bg-white/20 text-white border-white/30'
                    }`}>
                      <span>{isConfirmedReceived ? (isSending ? 'รหัสติดตาม (รับแล้ว):' : 'รหัสติดตามที่รับ:') : 'รหัสติดตาม:'}</span>
                      <span className={`tracking-wider font-black ${isConfirmedReceived ? 'text-emerald-300' : ''}`}>
                        {parcel.trackingCode}
                      </span>
                      {isConfirmedReceived && (
                        <span className="font-sans font-bold text-[11px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-md">
                          รับแล้ว
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyTrackingCode}
                        className="ml-1 p-0.5 hover:bg-white/20 rounded cursor-pointer transition-colors"
                        title="คัดลอกรหัสติดตาม"
                      >
                        {copiedTracking ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 text-white" />}
                      </button>
                    </div>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-1 mt-1">
                  {parcel.itemTitle}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          {/* Flow Visual (Sender -> Recipient) */}
          <div className="bg-pink-50/70 dark:bg-pink-950/20 rounded-2xl p-4 sm:p-5 border border-pink-100 dark:border-pink-900/40">
            <div className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              เส้นทางการจัดส่ง (Dispatch Flow)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
              {/* Sender Box */}
              <div className="sm:col-span-5 bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-pink-100/80 dark:border-slate-700 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                  <Send className="w-3.5 h-3.5" />
                  ผู้ส่งตามหน้าซอง
                </div>
                <div className="font-bold text-base text-slate-900 dark:text-white">
                  {parcel.senderName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {parcel.senderDepartment}
                </div>
              </div>

              {/* Arrow */}
              <div className="sm:col-span-1 flex justify-center text-pink-400 dark:text-pink-500">
                <ArrowRight className="w-6 h-6 hidden sm:block" />
                <div className="text-xs font-bold sm:hidden text-pink-500">▼ ส่งต่อไปยัง</div>
              </div>

              {/* Recipient Box */}
              <div className="sm:col-span-5 bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-pink-100/80 dark:border-slate-700 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                  <Inbox className="w-3.5 h-3.5" />
                  ผู้รับตามหน้าซอง
                </div>
                <div className="font-bold text-base text-slate-900 dark:text-white">
                  {parcel.recipientName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {parcel.recipientDepartment}
                </div>
              </div>
            </div>
          </div>

          {/* Received Status Banner if isConfirmedReceived */}
          {isConfirmedReceived && (
            <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/80 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    สถานะการรับเอกสาร / พัสดุ
                  </div>
                  <div className="font-bold text-sm text-emerald-900 dark:text-emerald-100 flex items-center gap-2 flex-wrap">
                    <span>{isSending ? 'เอกสาร / พัสดุขาส่งนี้ ปลายทางได้กดรับเรียบร้อยแล้ว' : 'รับเอกสาร / พัสดุแล้ว'}</span>
                    {parcel.trackingCode && (
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white/90 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                        <span className="font-black text-emerald-700 dark:text-emerald-300">{parcel.trackingCode}</span>
                        <span className="font-sans text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-200/80 dark:bg-emerald-900 px-1.5 py-0.2 rounded font-bold">
                          รับแล้ว
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Item Title */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <FileText className="w-4 h-4 text-pink-500" />
                ชื่อเอกสาร / พัสดุ
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {parcel.itemTitle}
              </div>
            </div>

            {/* Timestamp */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <Clock className="w-4 h-4 text-pink-500" />
                วันและเวลาที่บันทึก
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {parcel.timestamp}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>คัดลอกข้อมูล</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {isSending && (
              isConfirmedReceived ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ปลายทางได้รับแล้ว</span>
                </div>
              ) : onQuickReceive ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onQuickReceive(parcel);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="กดรับเอกสารหรือพัสดุนี้"
                >
                  <Inbox className="w-4 h-4" />
                  <span>กดรับเอกสาร / พัสดุนี้</span>
                </button>
              ) : null
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
