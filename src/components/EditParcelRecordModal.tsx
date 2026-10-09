import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Pencil,
  Save,
  Send,
  Inbox,
  Clock,
  Sparkles,
  Building2,
  User,
  FileText,
  QrCode,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount } from '../data/mockData';
import {
  generateParcelTrackingCode,
} from '../utils/parcelTrackingUtils';
import {
  formatCurrentThaiParcelTimestamp,
  updateParcelDeliveryRecord,
} from '../services/googleSheetSyncService';
import {
  getRememberedSenders,
  getRememberedRecipients,
  getRememberedSenderDepartments,
  getRememberedRecipientDepartments,
} from '../services/parcelContactMemoryService';
import { SuggestiveInput } from './SuggestiveInput';

interface EditParcelRecordModalProps {
  isOpen: boolean;
  parcel: ParcelDeliveryRecord | null;
  onClose: () => void;
  onRecordUpdated: (updatedRecord: ParcelDeliveryRecord) => void;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
  existingRecords?: ParcelDeliveryRecord[];
}

const POPULAR_ITEMS = [
  'PO ผลไม้',
  'ใบสั่งซื้อ (PO)',
  'ใบกำกับภาษี / ใบเสร็จ',
  'เอกสารสัญญา / บันทึกข้อตกลง',
  'ใบส่งของ / ใบแจ้งหนี้',
  'ซองเอกสารธุรการ',
  'กล่องพัสดุด่วน',
  'พัสดุอะไหล่ / อุปกรณ์ช่าง',
  'ใบเซ็นรับ',
  'บัตรพนักงาน',
  'ใบ OT',
];

const POPULAR_DEPARTMENTS = [
  'การเงิน',
  'ธุรการลาดกระบัง 2',
  'ธุรการลาดกระบัง 1',
  'บัญชี',
  'ช่างกล บางชัน',
  'บุคคล ลาดกระบัง',
  'จัดซื้อ',
  'ฝ่ายผลิต',
  'คลังสินค้า',
  'ประกันคุณภาพ (QA/QC)',
  'สุขาภิบาลลาดกระบัง2',
  'สวัสดิการลาดกระบัง 1',
  'สวัสดิการบางชัน',
];

export const EditParcelRecordModal: React.FC<EditParcelRecordModalProps> = ({
  isOpen,
  parcel,
  onClose,
  onRecordUpdated,
  currentUser,
  existingRecords = [],
}) => {
  const { language } = useLanguage();

  const [actionType, setActionType] = useState<'ส่ง' | 'รับ'>('ส่ง');
  const [trackingCode, setTrackingCode] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderDepartment, setSenderDepartment] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientDepartment, setRecipientDepartment] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [operatorDepartment, setOperatorDepartment] = useState('');
  const [status, setStatus] = useState<'รอรับ' | 'รับแล้ว' | 'บันทึกสำเร็จ'>('บันทึกสำเร็จ');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when modal opens with parcel data
  useEffect(() => {
    if (isOpen && parcel) {
      setActionType(parcel.actionType === 'รับ' ? 'รับ' : 'ส่ง');
      setTrackingCode(parcel.trackingCode || '');
      setTimestamp(parcel.timestamp || formatCurrentThaiParcelTimestamp(new Date()));
      setItemTitle(parcel.itemTitle || '');
      setSenderName(parcel.senderName && parcel.senderName !== '-' ? parcel.senderName : '');
      setSenderDepartment(parcel.senderDepartment && parcel.senderDepartment !== '-' ? parcel.senderDepartment : '');
      setRecipientName(parcel.recipientName && parcel.recipientName !== '-' ? parcel.recipientName : '');
      setRecipientDepartment(parcel.recipientDepartment && parcel.recipientDepartment !== '-' ? parcel.recipientDepartment : '');
      setOperatorName(parcel.operatorName && parcel.operatorName !== '-' ? parcel.operatorName : (currentUser?.name || 'เจม'));
      setOperatorDepartment(parcel.operatorDepartment && parcel.operatorDepartment !== '-' ? parcel.operatorDepartment : 'ธุรการลาดกระบัง 2');

      if (parcel.actionType === 'รับ') {
        setStatus('รับแล้ว');
      } else {
        setStatus(parcel.status === 'รับแล้ว' ? 'รับแล้ว' : 'รอรับ');
      }

      setErrorMessage(null);
    }
  }, [isOpen, parcel, currentUser]);

  const senderSuggestions = useMemo(() => getRememberedSenders(existingRecords), [existingRecords]);
  const senderDeptSuggestions = useMemo(() => {
    const fromRecords = getRememberedSenderDepartments(existingRecords);
    return Array.from(new Set([...POPULAR_DEPARTMENTS, ...fromRecords]));
  }, [existingRecords]);

  const recipientSuggestions = useMemo(() => getRememberedRecipients(existingRecords), [existingRecords]);
  const recipientDeptSuggestions = useMemo(() => {
    const fromRecords = getRememberedRecipientDepartments(existingRecords);
    return Array.from(new Set([...POPULAR_DEPARTMENTS, ...fromRecords]));
  }, [existingRecords]);

  if (!isOpen || !parcel) return null;

  const handleGenerateTrackingCode = () => {
    const newCode = generateParcelTrackingCode(timestamp || new Date(), existingRecords);
    setTrackingCode(newCode);
  };

  const handleResetTimestamp = () => {
    setTimestamp(formatCurrentThaiParcelTimestamp(new Date()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!itemTitle.trim()) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุชื่อเอกสาร / พัสดุ' : 'Item title is required');
      return;
    }
    if (!senderName.trim()) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุชื่อผู้ส่ง' : 'Sender name is required');
      return;
    }
    if (!recipientName.trim()) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุชื่อผู้รับ' : 'Recipient name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const parts = timestamp.split(/[\s,]+/);
      const dateStr = parts[0] || parcel.dateStr || '';
      const timeStr = parts[1] || parcel.timeStr || '';

      const updatedRecord: ParcelDeliveryRecord = {
        ...parcel,
        actionType,
        trackingCode: trackingCode.trim() || undefined,
        timestamp: timestamp.trim() || parcel.timestamp,
        dateStr,
        timeStr,
        itemTitle: itemTitle.trim(),
        senderName: senderName.trim(),
        senderDepartment: senderDepartment.trim() || '-',
        recipientName: recipientName.trim(),
        recipientDepartment: recipientDepartment.trim() || '-',
        operatorName: operatorName.trim() || '-',
        operatorDepartment: operatorDepartment.trim() || '-',
        status,
      };

      const res = await updateParcelDeliveryRecord(updatedRecord);
      if (res.success) {
        onRecordUpdated(res.record || updatedRecord);
        onClose();
      } else {
        setErrorMessage(res.message || (language === 'th' ? 'บันทึกการแก้ไขไม่สำเร็จ' : 'Failed to update record'));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึก' : 'Error updating record'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-pink-200/80 dark:border-pink-900/50 shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                {language === 'th' ? 'แก้ไขข้อมูล รับ-ส่ง เอกสาร / พัสดุ' : 'Edit Document / Parcel Record'}
              </h2>
              <p className="text-xs text-white/80 font-medium">
                {parcel.trackingCode ? `${language === 'th' ? 'รหัสติดตาม:' : 'Tracking:'} ${parcel.trackingCode}` : `${language === 'th' ? 'รายการ:' : 'ID:'} ${parcel.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer relative z-10"
            title={language === 'th' ? 'ปิด' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Action Type & Status Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'th' ? 'ประเภทรายการ' : 'Action Type'}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setActionType('ส่ง');
                    if (status === 'รับแล้ว') setStatus('รอรับ');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    actionType === 'ส่ง'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'ส่ง' : 'Send'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionType('รับ');
                    setStatus('รับแล้ว');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    actionType === 'รับ'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'รับ' : 'Receive'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'th' ? 'สถานะรายการ' : 'Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="รอรับ">{language === 'th' ? 'รอรับ (Pending)' : 'Pending'}</option>
                <option value="รับแล้ว">{language === 'th' ? 'รับแล้ว (Received)' : 'Received'}</option>
                <option value="บันทึกสำเร็จ">{language === 'th' ? 'บันทึกสำเร็จ (Saved)' : 'Saved'}</option>
              </select>
            </div>
          </div>

          {/* Tracking Code & Timestamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                  <span>{language === 'th' ? 'รหัสติดตาม (Tracking Code)' : 'Tracking Code'}</span>
                </label>
                {!trackingCode && (
                  <button
                    type="button"
                    onClick={handleGenerateTrackingCode}
                    className="text-[11px] font-bold text-pink-600 hover:text-pink-700 dark:text-pink-400 cursor-pointer"
                  >
                    + {language === 'th' ? 'สร้างรหัส' : 'Generate'}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="เช่น LKB2 - 26100901"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                  <span>{language === 'th' ? 'วันที่และเวลา' : 'Timestamp'}</span>
                </label>
                <button
                  type="button"
                  onClick={handleResetTimestamp}
                  className="text-[11px] font-bold text-pink-600 hover:text-pink-700 dark:text-pink-400 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'th' ? 'ตอนนี้' : 'Now'}</span>
                </button>
              </div>
              <input
                type="text"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="เช่น 9/10/2026, 08:30:00"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Item Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                <span>{language === 'th' ? 'ชื่อเอกสาร / พัสดุ *' : 'Document / Parcel Title *'}</span>
              </span>
            </label>
            <SuggestiveInput
              value={itemTitle}
              onChange={setItemTitle}
              suggestions={POPULAR_ITEMS}
              placeholder={language === 'th' ? 'เช่น PO ผลไม้, ใบกำกับภาษี, ซองเอกสาร...' : 'e.g. PO, Invoice...'}
              className="w-full text-xs font-medium"
            />
          </div>

          {/* Sender Details */}
          <div className="bg-rose-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-rose-100 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ข้อมูลผู้ส่ง' : 'Sender Information'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'th' ? 'ชื่อผู้ส่งตามหน้าซอง *' : 'Sender Name *'}
                </label>
                <SuggestiveInput
                  value={senderName}
                  onChange={setSenderName}
                  suggestions={senderSuggestions}
                  placeholder={language === 'th' ? 'ระบุชื่อผู้ส่ง' : 'Sender name'}
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'th' ? 'แผนกผู้ส่ง' : 'Sender Department'}
                </label>
                <SuggestiveInput
                  value={senderDepartment}
                  onChange={setSenderDepartment}
                  suggestions={senderDeptSuggestions}
                  placeholder={language === 'th' ? 'ระบุแผนกผู้ส่ง' : 'Sender department'}
                  className="w-full text-xs"
                />
              </div>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="bg-emerald-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-emerald-100 dark:border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ข้อมูลผู้รับ' : 'Recipient Information'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'th' ? 'ชื่อผู้รับตามหน้าซอง *' : 'Recipient Name *'}
                </label>
                <SuggestiveInput
                  value={recipientName}
                  onChange={setRecipientName}
                  suggestions={recipientSuggestions}
                  placeholder={language === 'th' ? 'ระบุชื่อผู้รับ' : 'Recipient name'}
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'th' ? 'แผนกผู้รับ' : 'Recipient Department'}
                </label>
                <SuggestiveInput
                  value={recipientDepartment}
                  onChange={setRecipientDepartment}
                  suggestions={recipientDeptSuggestions}
                  placeholder={language === 'th' ? 'ระบุแผนกผู้รับ' : 'Recipient department'}
                  className="w-full text-xs"
                />
              </div>
            </div>
          </div>

          {/* Operator Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'th' ? 'ผู้ดำเนินการ / ผู้บันทึก' : 'Operator Name'}
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="เช่น เจม"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'th' ? 'แผนกผู้ดำเนินการ' : 'Operator Department'}
              </label>
              <input
                type="text"
                value={operatorDepartment}
                onChange={(e) => setOperatorDepartment(e.target.value)}
                placeholder="เช่น ธุรการลาดกระบัง 2"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
