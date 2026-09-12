import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Building2, 
  Clock, 
  Send, 
  Inbox, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles,
  FileText,
  ArrowRight
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ParcelDetailModalProps {
  isOpen: boolean;
  parcel: ParcelDeliveryRecord | null;
  onClose: () => void;
}

export const ParcelDetailModal: React.FC<ParcelDetailModalProps> = ({
  isOpen,
  parcel,
  onClose,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !parcel) return null;

  const isSending = parcel.actionType === 'ส่ง';

  const handleCopy = () => {
    const textToCopy = `[${parcel.actionType}] ${parcel.itemTitle} | ผู้ส่ง: ${parcel.senderName} (${parcel.senderDepartment}) -> ผู้รับ: ${parcel.recipientName} (${parcel.recipientDepartment}) | วันที่เวลา: ${parcel.timestamp}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${
                    isSending 
                      ? 'bg-rose-900/30 text-rose-100 border-white/30' 
                      : 'bg-emerald-900/30 text-emerald-100 border-white/30'
                  }`}>
                    {isSending ? '📤 รายการส่ง' : '📥 รายการรับ'}
                  </span>
                  <span className="text-xs text-pink-100/90 font-medium">
                    ลำดับที่ {parcel.seq}
                  </span>
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

          {/* Status badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              สถานะ: บันทึกข้อมูลเรียบร้อยแล้ว
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

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
