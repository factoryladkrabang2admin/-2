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
  Shirt, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Minus
} from 'lucide-react';
import { EquipmentRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const GOWN_DEPARTMENTS = [
  'แผนกความปลอดภัย',
  'แผนกซ่อมบำรุง',
  'แผนกเทคนิคการผลิต 4',
  'แผนกเทคนิคบริการ',
  'แผนกธุรการลาดกระบัง 2',
  'แผนกปรับอากาศและทำความเย็น',
  'แผนกไฟฟ้าและสื่อสาร',
  'แผนกสุขาภิบาล',
  'แผนกสต็อก 4',
  'แผนกวิศวกรรม',
  'แผนก A/2',
  'แผนก A/3',
  'แผนก A/4',
  'แผนก B/1',
  'แผนก B/5',
  'แผนก QC Line',
  'แผนกการตลาด (ขาย 1)',
  'แผนกการตลาด (ขาย 2)',
  'แผนกสารสนเทศ',
] as const;

interface ReturnGownModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: EquipmentRecord | null;
  onReturnSuccess: (returnedRecord: EquipmentRecord, trackingCode: string) => void;
}

export const ReturnGownModal: React.FC<ReturnGownModalProps> = ({
  isOpen,
  onClose,
  record,
  onReturnSuccess,
}) => {
  const { language } = useLanguage();

  const [returnDate, setReturnDate] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [department, setDepartment] = useState<string>('แผนกธุรการลาดกระบัง 2');
  const [trackingCode, setTrackingCode] = useState<string>('');
  const [sizeL, setSizeL] = useState<string>('');
  const [sizeXL, setSizeXL] = useState<string>('');
  const [size2XL, setSize2XL] = useState<string>('');

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

      // Match department to GOWN_DEPARTMENTS options accurately
      const rawDept = (record.department || '').trim();
      let matchedDept = GOWN_DEPARTMENTS.find(
        (d) => d.toLowerCase() === rawDept.toLowerCase()
      );
      if (!matchedDept && rawDept) {
        // Handle short codes like "B/1", "A/2", "b1", "a3"
        const clean = rawDept.replace(/^(?:แผนก|อาคาร|ตึก|ฝ่าย)\s*/i, '').trim().toUpperCase();
        const alphaMatch = clean.match(/^([AB])\s*[\/\-\.]?\s*(\d+)$/i);
        if (alphaMatch) {
          const target = `แผนก ${alphaMatch[1]}/${alphaMatch[2]}`.toUpperCase();
          matchedDept = GOWN_DEPARTMENTS.find((d) => d.toUpperCase() === target);
        }
      }
      if (!matchedDept && rawDept) {
        const clean = rawDept.replace(/^(?:แผนก|อาคาร|ตึก|ฝ่าย)\s*/i, '').trim().toLowerCase();
        matchedDept = GOWN_DEPARTMENTS.find((d) => {
          const dClean = d.replace(/^แผนก\s*/i, '').trim().toLowerCase();
          return clean === dClean || dClean.includes(clean) || clean.includes(dClean);
        });
      }
      let effectiveTracking = (record.trackingCode || '').trim();
      if (!effectiveTracking) {
        const yy = String(yyyy).slice(-2);
        effectiveTracking = `LKB2 - ${yy}${mm}${dd}01`;
      }
      setTrackingCode(effectiveTracking);

      let l = '';
      let xl = '';
      let xxl = '';
      if (record.gownSizes && record.gownSizes.length > 0) {
        for (const gs of record.gownSizes) {
          if (gs.size === 'L') l = String(Math.min(8, gs.count));
          if (gs.size === 'XL') xl = String(Math.min(8, gs.count));
          if (gs.size === '2XL') xxl = String(Math.min(8, gs.count));
        }
      }
      if (!l && !xl && !xxl && record.totalQuantity) {
        l = String(Math.min(8, record.totalQuantity));
      }
      if (!l && !xl && !xxl) {
        l = '1';
      }
      setSizeL(l);
      setSizeXL(xl);
      setSize2XL(xxl);

      setIsSubmitting(false);
      setIsSuccess(false);
      setErrorMessage(null);
      setCopiedTracking(false);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const totalPieces =
    (parseInt(sizeL || '0', 10) || 0) +
    (parseInt(sizeXL || '0', 10) || 0) +
    (parseInt(size2XL || '0', 10) || 0);

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
    if (totalPieces <= 0) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุจำนวนเสื้อกาวน์ที่ส่งคืนอย่างน้อย 1 ตัว' : 'Please specify at least 1 gown');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      actionType: 'คืนเสื้อกาวน์',
      date: returnDate,
      personName: personName.trim(),
      department: department.trim(),
      sizeL: parseInt(sizeL || '0', 10) || undefined,
      sizeXL: parseInt(sizeXL || '0', 10) || undefined,
      size2XL: parseInt(size2XL || '0', 10) || undefined,
      trackingCode: trackingCode.trim() || undefined,
    };

    try {
      const res = await fetch('/api/equipment-gown-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.googleSheetSynced !== false) {
        setIsSuccess(true);
        setTimeout(() => {
          onReturnSuccess(record, trackingCode.trim());
          onClose();
        }, 1200);
      } else {
        setErrorMessage(
          data?.error || 
          (language === 'th' 
            ? 'ไม่สามารถบันทึกข้อมูลกลับเข้า Google Sheet ได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง' 
            : 'Failed to record return to Google Sheet. Please check details and try again.')
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSize = (current: string, delta: number, setter: (val: string) => void) => {
    const curVal = parseInt(current || '0', 10) || 0;
    const nextVal = Math.max(0, Math.min(8, curVal + delta));
    setter(nextVal === 0 ? '' : String(nextVal));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {language === 'th' ? 'ส่งคืนเสื้อกาวน์สีกรมท่า' : 'Return Navy Blue Gown'}
              </h2>
              <p className="text-xs text-amber-100/90 font-medium">
                {language === 'th' ? 'บันทึกข้อมูลการส่งคืนลงใน Google Sheet อิงตามรหัสติดตาม' : 'Record return directly into Google Sheet'}
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
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                  {language === 'th' ? 'อ้างอิงข้อมูลเบิกเดิม' : 'Original Requisition Ref'}
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
                  <span>{copiedTracking ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <label className="font-bold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>{language === 'th' ? 'รหัสติดตาม (ถ้ามี)' : 'Tracking Code (Optional)'}</span>
              </label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="LKB2 - 26101601"
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
            <span className="text-slate-500 font-medium text-[11px] hidden sm:inline">
              {language === 'th' ? 'ซิงค์เข้า Google Sheet ทันที' : 'Sync to Google Sheet'}
            </span>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium bg-white text-slate-900 shadow-2xs"
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
                placeholder={language === 'th' ? 'ระบุชื่อผู้ส่งคืน' : 'Name'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium bg-white text-slate-900 shadow-2xs"
              />
            </div>
          </div>

          {/* 3. Department (Standardized Google Form Dropdown) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'th' ? 'แผนก' : 'Department'}</span>
                <span className="text-rose-600">*</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {language === 'th' ? 'ตัวเลือกตรงกับ Google Form' : 'Matches Form Options'}
              </span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium bg-white text-slate-900 shadow-2xs"
            >
              {GOWN_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Sizes & Quantity Return breakdown */}
          <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-orange-600" />
                {language === 'th' ? 'จำนวนเสื้อกาวน์ที่ส่งคืน' : 'Return Gown Quantities'}
                <span className="text-rose-600">*</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-orange-900 font-black text-xs border border-orange-200 shadow-2xs">
                {language === 'th' ? `รวม ${totalPieces} ตัว` : `Total ${totalPieces} pcs`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Size L */}
              <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs space-y-2 text-center">
                <span className="font-bold text-xs text-slate-700 block">Size L</span>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateSize(sizeL, -1, setSizeL)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="-1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="8"
                    value={sizeL}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setSizeL('');
                      else {
                        const num = Math.max(0, Math.min(8, parseInt(val, 10) || 0));
                        setSizeL(num === 0 ? '' : String(num));
                      }
                    }}
                    placeholder="0"
                    className="w-12 text-center py-1 rounded-lg border border-slate-200 focus:border-amber-500 font-bold text-sm bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => updateSize(sizeL, 1, setSizeL)}
                    className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="+1"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Size XL */}
              <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs space-y-2 text-center">
                <span className="font-bold text-xs text-slate-700 block">Size XL</span>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateSize(sizeXL, -1, setSizeXL)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="-1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="8"
                    value={sizeXL}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setSizeXL('');
                      else {
                        const num = Math.max(0, Math.min(8, parseInt(val, 10) || 0));
                        setSizeXL(num === 0 ? '' : String(num));
                      }
                    }}
                    placeholder="0"
                    className="w-12 text-center py-1 rounded-lg border border-slate-200 focus:border-amber-500 font-bold text-sm bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => updateSize(sizeXL, 1, setSizeXL)}
                    className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="+1"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Size 2XL */}
              <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs space-y-2 text-center">
                <span className="font-bold text-xs text-slate-700 block">Size 2XL</span>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateSize(size2XL, -1, setSize2XL)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="-1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="8"
                    value={size2XL}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setSize2XL('');
                      else {
                        const num = Math.max(0, Math.min(8, parseInt(val, 10) || 0));
                        setSize2XL(num === 0 ? '' : String(num));
                      }
                    }}
                    placeholder="0"
                    className="w-12 text-center py-1 rounded-lg border border-slate-200 focus:border-amber-500 font-bold text-sm bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => updateSize(size2XL, 1, setSize2XL)}
                    className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="+1"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-orange-900/70 text-center">
              {language === 'th' ? '* รองรับการส่งคืนจำนวนสูงสุด 8 ตัวต่อขนาดตามแบบฟอร์ม' : '* Maximum 8 pieces per size as per form specification'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-semibold animate-in fade-in">
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
                  ? `บันทึกการส่งคืนรหัส ${trackingCode || ''} ลงใน Google Sheet สำเร็จเรียบร้อย`
                  : `Return recorded into Google Sheet successfully!`}
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
              disabled={isSubmitting || totalPieces <= 0 || isSuccess}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all cursor-pointer bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-amber-800 shadow-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'th' ? 'กำลังบันทึกลง Google Sheet...' : 'Saving to Google Sheet...'}</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>{language === 'th' ? 'บันทึกสำเร็จแล้ว' : 'Saved!'}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 text-amber-200" />
                  <span>{language === 'th' ? 'ยืนยันการส่งคืนเสื้อกาวน์' : 'Confirm Return'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
