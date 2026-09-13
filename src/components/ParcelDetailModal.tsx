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
  ArrowRight,
  QrCode,
  ExternalLink,
  PackageCheck
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { ModernParcelQrModal } from './ModernParcelQrModal';

interface ParcelDetailModalProps {
  isOpen: boolean;
  parcel: ParcelDeliveryRecord | null;
  onClose: () => void;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
  onReceiveParcel?: (parcel: ParcelDeliveryRecord) => void;
}

export const ParcelDetailModal: React.FC<ParcelDetailModalProps> = ({
  isOpen,
  parcel,
  onClose,
  currentUser,
  isAuthenticated,
  onReceiveParcel,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const isAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);

  if (!isOpen || !parcel) return null;

  const isSending = parcel.actionType === 'ส่ง';

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

          {/* Status badge & Timeline (สถานะปัจจุบัน) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-emerald-50 via-teal-50 to-emerald-50/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>สถานะปัจจุบัน (Current Status)</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {parcel.status || (isSending ? 'บันทึกข้อมูลจัดส่งเรียบร้อยแล้ว' : 'รับเอกสาร/พัสดุเข้าเรียบร้อยแล้ว')}
                  </h3>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/80">
                ✓ สมบูรณ์ในระบบ
              </span>
            </div>

            {/* Visual 3-Step Tracking Timeline */}
            <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-800/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white/80 dark:bg-slate-800/70 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">1. วันและเวลาบันทึก</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{parcel.timestamp}</div>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/70 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">2. ผู้ทำรายการ</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{parcel.operatorName} ({parcel.operatorDepartment || 'ลาดกระบัง'})</div>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/70 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">3. การดำเนินการ</div>
                <div className="font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                  {isSending ? 'ส่งมอบตามรายชื่อ' : 'รับเข้าคลังเอกสาร'}
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

            {/* Operator Name */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <Package className="w-4 h-4 text-pink-500" />
                ผู้ทำรายการบันทึก
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {parcel.operatorName || '-'}
              </div>
            </div>

            {/* Operator Department */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <Building2 className="w-4 h-4 text-pink-500" />
                แผนกผู้ทำรายการ
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {parcel.operatorDepartment || '-'}
              </div>
            </div>
          </div>

          {/* Tracking Code Section (for Outgoing/Send records) */}
          {(parcel.trackingCode || isSending) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-pink-50 via-rose-50 to-amber-50 dark:from-pink-950/40 dark:via-rose-950/20 dark:to-slate-900 border-2 border-pink-200 dark:border-pink-800/60 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center shadow-xs">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-pink-950 dark:text-pink-100 flex items-center gap-1.5">
                      <span>รหัสติดตามสถานะ</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300 font-semibold">
                        LKB2 - YYMMDDXX
                      </span>
                    </h4>
                    <p className="text-sm text-pink-700 dark:text-pink-300 font-mono font-black mt-0.5 tracking-wider">
                      {parcel.trackingCode || 'สร้างอัตโนมัติ'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {parcel.trackingCode && (
                    <button
                      onClick={handleCopyTrackingCode}
                      className="px-2.5 py-1.5 rounded-xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-slate-800 hover:bg-pink-50 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTracking ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => setShowQrModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>เปิด QR Code ติดตาม</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
            {isAdmin && (parcel.trackingCode || isSending) && (
              <button
                onClick={() => setShowQrModal(true)}
                className="px-4 py-2 rounded-xl border border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/40 text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>QR ติดตาม</span>
              </button>
            )}

            {isSending && onReceiveParcel && (
              <button
                type="button"
                onClick={() => {
                  onReceiveParcel(parcel);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                title="กดลงรับเอกสาร/พัสดุนี้ทันที"
              >
                <PackageCheck className="w-4 h-4" />
                <span>กดรับเอกสาร / พัสดุ</span>
              </button>
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

      {/* Modern Parcel QR Modal */}
      <ModernParcelQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        parcel={parcel}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};
