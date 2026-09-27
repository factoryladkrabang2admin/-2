import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Check,
  Copy,
  Tag,
  User,
  Building2,
  Calendar,
  Key,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { EquipmentRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { KEYS_DEPARTMENTS } from './CreateEquipmentModal';

interface ReturnKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: EquipmentRecord | null;
  onReturnSuccess: (returnedRecord: EquipmentRecord, trackingCode: string) => void;
}

export const ReturnKeyModal: React.FC<ReturnKeyModalProps> = ({
  isOpen,
  onClose,
  record,
  onReturnSuccess,
}) => {
  const { language } = useLanguage();

  const [returnDate, setReturnDate] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [keyNumbers, setKeyNumbers] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);

  // Initialize values when record opens
  useEffect(() => {
    if (record && isOpen) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setReturnDate(`${yyyy}-${mm}-${dd}`);

      setPersonName(
        record.requesterName && record.requesterName !== 'ไม่ระบุชื่อ'
          ? record.requesterName
          : record.borrowerName || record.requesterName || ''
      );

      // Match department to KEYS_DEPARTMENTS options
      const rawDept = (record.department || '').trim();
      let matchedDept = KEYS_DEPARTMENTS.find(
        (d) => d.toLowerCase() === rawDept.toLowerCase()
      );
      if (!matchedDept && rawDept && rawDept !== 'แผนกทั่วไป') {
        matchedDept = KEYS_DEPARTMENTS.find(
          (d) => d.includes(rawDept) || rawDept.includes(d)
        );
      }
      if (!matchedDept && (rawDept.includes('วิศวกรรม') || rawDept.includes('เครื่องกล'))) {
        matchedDept = 'แผนกวิศกรรมเครื่องกล';
      }
      setDepartment(matchedDept || 'แผนกธุรการลาดกระบัง 2');

      // Extract key numbers
      let extractedKeys = (record.keyNumbers || '').trim();
      if (!extractedKeys && record.itemSummary) {
        const match = record.itemSummary.match(/#(.+)$/);
        if (match && match[1]) {
          extractedKeys = match[1].trim();
        }
      }
      setKeyNumbers(extractedKeys || '1');
      setTrackingCode(record.trackingCode || '');

      setIsSubmitting(false);
      setIsSuccess(false);
      setErrorMessage(null);
      setCopiedTracking(false);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุชื่อผู้ส่งคืน' : 'Please provide returner name');
      return;
    }
    if (!department.trim()) {
      setErrorMessage(language === 'th' ? 'กรุณาเลือกแผนก' : 'Please select department');
      return;
    }
    if (!keyNumbers.trim()) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุหมายเลขกุญแจที่ส่งคืน' : 'Please specify key number(s)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const effectiveTracking = trackingCode.trim();
    const payload = {
      actionType: 'คืน',
      date: returnDate,
      personName: personName.trim(),
      department: department.trim(),
      keyNumbers: keyNumbers.trim(),
      trackingCode: effectiveTracking || undefined,
    };

    try {
      const res = await fetch('/api/equipment-keys-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSuccess(true);
        const updatedRecord: EquipmentRecord = {
          ...record,
          actionType: 'คืน',
          status: 'คืนแล้ว',
          date: returnDate,
          returnDate: returnDate,
          requesterName: personName.trim(),
          returnerName: personName.trim(),
          department: department.trim(),
          keyNumbers: keyNumbers.trim(),
          itemSummary: `กุญแจห้อง/อาคาร หมายเลข #${keyNumbers.trim()}`,
          trackingCode: effectiveTracking || record.trackingCode,
        };
        setTimeout(() => {
          onReturnSuccess(updatedRecord, effectiveTracking || record.trackingCode || '');
          onClose();
        }, 900);
      } else {
        setErrorMessage(
          data?.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการส่งคืนกุญแจ' : 'Failed to submit key return')
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {language === 'th' ? 'ส่งคืนกุญแจ' : 'Return Key'}
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                {language === 'th'
                  ? 'บันทึกการส่งคืนลง Google Sheet อ้างอิงตามรหัสติดตาม'
                  : 'Record key return to Google Sheet by tracking code'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Tracking Code Highlight Banner */}
          {trackingCode ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-rose-600" />
                  {language === 'th' ? 'รหัสติดตามที่อิงในการส่งคืน' : 'Referenced Tracking Code'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-rose-200 shadow-2xs">
                <span className="font-mono font-black text-rose-950 text-sm sm:text-base tracking-wider">
                  {trackingCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(trackingCode);
                    setCopiedTracking(true);
                    setTimeout(() => setCopiedTracking(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>
                    {copiedTracking
                      ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied')
                      : (language === 'th' ? 'คัดลอก' : 'Copy')}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <label className="font-bold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>{language === 'th' ? 'รหัสติดตาม' : 'Tracking Code'}</span>
              </label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="LKB2 - 26092601"
                className="w-full px-3 py-2 rounded-xl border border-amber-300 font-mono text-xs bg-white text-slate-900"
              />
            </div>
          )}

          {/* Status Change Flow Badge */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-200">
                {language === 'th' ? 'สถานะปัจจุบัน: เบิกแล้ว' : 'Current: Borrowed'}
              </span>
              <span className="text-slate-400 font-bold">→</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {language === 'th' ? 'สถานะใหม่: คืนแล้ว' : 'New: Returned'}
              </span>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Return Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'th' ? 'วันที่ส่งคืน' : 'Return Date'}</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium bg-white"
              />
            </div>

            {/* 2. Person Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'th' ? 'ชื่อผู้ส่งคืน' : 'Returner Name'}</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
                placeholder={language === 'th' ? 'ชื่อผู้ส่งคืน' : 'Name'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium bg-white"
              />
            </div>
          </div>

          {/* 3. Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'th' ? 'แผนก' : 'Department'}</span>
              <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium bg-white appearance-none pr-9 cursor-pointer"
              >
                {KEYS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Key Numbers */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-600" />
              <span>{language === 'th' ? 'หมายเลขกุญแจที่ส่งคืน' : 'Key Number(s) to Return'}</span>
              <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={keyNumbers}
              onChange={(e) => setKeyNumbers(e.target.value)}
              required
              placeholder={language === 'th' ? 'เช่น 17, 19 หรือ ห้องประชุม 1' : 'e.g. 17, 19'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-black bg-white text-slate-900"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-2 text-emerald-900 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                {language === 'th'
                  ? `บันทึกการส่งคืนกุญแจ ${trackingCode ? `(รหัส ${trackingCode})` : ''} ลงใน Google Sheet เรียบร้อย`
                  : 'Key return recorded to Google Sheet successfully!'}
              </span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !keyNumbers.trim() || !personName.trim() || isSuccess}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all cursor-pointer bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-amber-800 shadow-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'th' ? 'กำลังบันทึกข้อมูล...' : 'Saving...'}</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>{language === 'th' ? 'ส่งคืนสำเร็จแล้ว' : 'Returned!'}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 text-amber-200" />
                  <span>{language === 'th' ? 'ยืนยันการส่งคืนกุญแจ' : 'Confirm Return'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
