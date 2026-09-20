import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Download,
  RefreshCw,
  Package,
  Shirt,
  Sparkles,
  FileSpreadsheet,
  Info,
  Send,
  AlertCircle,
  Calendar,
  User,
  Building2,
  FileText,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const MASTER_EQUIPMENT_REQUISITION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScSaoDIIxRWdKWDK9HQRXkRwsMCGQoxViNRzi5INLEqSdmIPQ/viewform?usp=pp_url';

export const GOWN_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1AQXHNA1gDBXl5gWMeXu_y04ziGi3CDk-z6MbH6DQQ2M/edit?gid=1537050902#gid=1537050902';

const GOWN_DEPARTMENTS = [
  'แผนกเทคนิคการผลิต 4',
  'แผนกความปลอดภัย',
  'แผนกซ่อมบำรุง',
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
];

interface CreateEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  currentSubCategoryName?: string;
  activeSubCategory?: string;
  formUrl?: string;
  sheetUrl?: string;
}

export const CreateEquipmentModal: React.FC<CreateEquipmentModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  currentSubCategoryName,
  activeSubCategory,
  formUrl: propFormUrl,
  sheetUrl: propSheetUrl,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const formUrl = propFormUrl || MASTER_EQUIPMENT_REQUISITION_FORM_URL;
  const isGown = activeSubCategory === 'gown' || formUrl === MASTER_EQUIPMENT_REQUISITION_FORM_URL;
  const effectiveSheetUrl = propSheetUrl || (isGown ? GOWN_GOOGLE_SHEET_URL : undefined);

  // Tab: only used for non-gown equipment
  const [activeTab, setActiveTab] = useState<'form' | 'direct'>('direct');

  // Gown Form States - All initialized completely blank as requested by user
  const [actionType, setActionType] = useState<'เบิกเสื้อกาวน์' | 'คืนเสื้อกาวน์'>('เบิกเสื้อกาวน์');
  const [date, setDate] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [sizeL, setSizeL] = useState<string>('');
  const [sizeXL, setSizeXL] = useState<string>('');
  const [size2XL, setSize2XL] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate('');
      setPersonName('');
      setDepartment('');
      setSizeL('');
      setSizeXL('');
      setSize2XL('');
      setIsSubmitting(false);
      setIsSubmittedSuccess(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formUrl)}`;

  const numL = parseInt(sizeL || '0', 10) || 0;
  const numXL = parseInt(sizeXL || '0', 10) || 0;
  const num2XL = parseInt(size2XL || '0', 10) || 0;
  const totalGownPieces = numL + numXL + num2XL;

  const handleCopy = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyQrUrl = () => {
    navigator.clipboard.writeText(formUrl);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2500);
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!date.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุวันที่' : 'Please specify date');
      return;
    }

    if (!personName.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุชื่อผู้เบิก-คืน' : 'Please enter borrower/returner name');
      return;
    }

    if (!department.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุแผนก' : 'Please specify department');
      return;
    }

    if (totalGownPieces <= 0) {
      setSubmitError(language === 'th' ? 'กรุณาระบุขนาดและจำนวนเสื้อกาวน์อย่างน้อย 1 ตัว' : 'Please specify at least 1 gown');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        actionType,
        date: date.trim(),
        personName: personName.trim(),
        department: department.trim(),
        sizeL: numL > 0 ? numL : undefined,
        sizeXL: numXL > 0 ? numXL : undefined,
        size2XL: num2XL > 0 ? num2XL : undefined,
      };

      const res = await fetch('/api/equipment-gown-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Change button to "บันทึกเรียบร้อย"
        setIsSubmittedSuccess(true);

        // Refresh data in table
        if (onRefreshData) {
          onRefreshData();
        }

        // Keep button as "บันทึกเรียบร้อย" for 1.8s, then smoothly close modal
        setTimeout(() => {
          setIsSubmittedSuccess(false);
          onClose();
        }, 1800);
      } else {
        setSubmitError(data.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to submit data'));
      }
    } catch (err: any) {
      setSubmitError(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-rose-200/90 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xs">
              {isGown ? (
                <Shirt className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
              ) : (
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-xs">
                  {isGown
                    ? (language === 'th' ? 'แบบฟอร์มการเบิก-คืน เสื้อกาวน์สีกรมท่า' : 'Navy Gown Requisition & Return Form')
                    : (language === 'th' ? `เพิ่มรายการเบิก ${currentSubCategoryName || 'อุปกรณ์'}` : 'Add Equipment Requisition')}
                </h2>
                {/* For non-gown equipment, show tag if needed; hidden for gown as per requirement 1 */}
                {!isGown && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 shadow-xs">
                    Form
                  </span>
                )}
              </div>
              {!isGown && (
                <p className="text-xs text-rose-100 font-medium mt-0.5">
                  {language === 'th'
                    ? 'ลงข้อมูลและทำรายการเบิกอุปกรณ์ผ่านระบบออนไลน์'
                    : 'Submit and requisition equipment via online form'}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Completely hidden for Gown as per Requirement 2 */}
        {!isGown && (
          <div className="p-3 sm:p-4 bg-rose-50/50 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{language === 'th' ? 'เปิดแบบฟอร์ม' : 'Open Form'}</span>
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white text-slate-700 border-rose-200"
              >
                <Copy className="w-4 h-4 text-rose-600" />
                <span>{copied ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอกลิงก์' : 'Copy Link')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Error Message if any */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{submitError}</p>
            </div>
          )}

          {/* Direct Form for Gown (Requirement 1, 3, 4, 5, 6) */}
          {isGown ? (
            <form onSubmit={handleDirectSubmit} className="space-y-5">
              {/* 1. Action Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {language === 'th' ? 'กรุณาเลือกการเบิก-คืน' : 'Select Action Type'} <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActionType('เบิกเสื้อกาวน์')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      actionType === 'เบิกเสื้อกาวน์'
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-600 shadow-md scale-[1.01]'
                        : 'bg-white hover:bg-rose-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Shirt className="w-4 h-4" />
                    <span>{language === 'th' ? 'เบิกเสื้อกาวน์' : 'Requisition (Borrow)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('คืนเสื้อกาวน์')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      actionType === 'คืนเสื้อกาวน์'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-md scale-[1.01]'
                        : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{language === 'th' ? 'คืนเสื้อกาวน์' : 'Return Gown'}</span>
                  </button>
                </div>
              </div>

              {/* 2. Date & Borrower Name - Blank and customizable (Requirement 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'วันที่' : 'Date'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'ชื่อผู้เบิก-คืน' : 'Name of Person'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder={language === 'th' ? 'กรอกชื่อผู้เบิก-คืน' : 'Enter name'}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>
              </div>

              {/* 3. Department - Blank input with datalist, freely customizable, no "+ ระบุแผนกอื่นๆ" (Requirement 3 & 4) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{language === 'th' ? 'แผนก' : 'Department'}</span> <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="gown-departments-datalist"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder={language === 'th' ? 'พิมพ์หรือเลือกแผนก' : 'Type or select department'}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                  <datalist id="gown-departments-datalist">
                    {GOWN_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 4. Sizes and Quantity - Blank inputs, customizable (Requirement 4) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    {language === 'th' ? 'ระบุขนาดและจำนวนเสื้อกาวน์ที่ต้องการ' : 'Specify Size and Quantity'} <span className="text-rose-600">*</span>
                  </label>
                  {totalGownPieces > 0 && (
                    <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                      {language === 'th' ? `รวม ${totalGownPieces} ตัว` : `Total ${totalGownPieces} pcs`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Size L */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-2">
                    <span className="text-xs font-black text-slate-700 block">ไซส์ L</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(0, (parseInt(sizeL || '0', 10) || 0) - 1);
                          setSizeL(val === 0 ? '' : String(val));
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={sizeL}
                        onChange={(e) => setSizeL(e.target.value)}
                        placeholder="0"
                        className="w-12 py-1 text-center font-black text-base text-rose-900 border border-slate-200 rounded-lg outline-hidden focus:border-rose-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.min(8, (parseInt(sizeL || '0', 10) || 0) + 1);
                          setSizeL(String(val));
                        }}
                        className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Size XL */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-2">
                    <span className="text-xs font-black text-slate-700 block">ไซส์ XL</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(0, (parseInt(sizeXL || '0', 10) || 0) - 1);
                          setSizeXL(val === 0 ? '' : String(val));
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={sizeXL}
                        onChange={(e) => setSizeXL(e.target.value)}
                        placeholder="0"
                        className="w-12 py-1 text-center font-black text-base text-rose-900 border border-slate-200 rounded-lg outline-hidden focus:border-rose-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.min(8, (parseInt(sizeXL || '0', 10) || 0) + 1);
                          setSizeXL(String(val));
                        }}
                        className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Size 2XL */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-2">
                    <span className="text-xs font-black text-slate-700 block">ไซส์ 2XL</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.max(0, (parseInt(size2XL || '0', 10) || 0) - 1);
                          setSize2XL(val === 0 ? '' : String(val));
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={size2XL}
                        onChange={(e) => setSize2XL(e.target.value)}
                        placeholder="0"
                        className="w-12 py-1 text-center font-black text-base text-rose-900 border border-slate-200 rounded-lg outline-hidden focus:border-rose-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Math.min(8, (parseInt(size2XL || '0', 10) || 0) + 1);
                          setSize2XL(String(val));
                        }}
                        className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button (Requirement 5 & 6) */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || isSubmittedSuccess || totalGownPieces <= 0}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                    isSubmittedSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 hover:from-rose-800 hover:via-red-700 hover:to-amber-700 text-white shadow-rose-500/30 hover:scale-102 active:scale-98'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'th' ? 'กำลังบันทึกข้อมูล...' : 'Saving...'}</span>
                    </>
                  ) : isSubmittedSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{language === 'th' ? 'บันทึกเรียบร้อย' : 'Saved Successfully'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{language === 'th' ? 'บันทึกข้อมูล' : 'Save Data'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* General Equipment View */
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-white overflow-hidden shadow-sm">
                <div className="relative w-full h-[540px] bg-slate-100 flex flex-col items-center justify-center">
                  <iframe
                    src={`${formUrl}&embedded=true`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    marginHeight={0}
                    marginWidth={0}
                    title="Equipment Requisition"
                    className="w-full h-full border-0 bg-white"
                  >
                    Loading...
                  </iframe>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {currentSubCategoryName ? `หมวดหมู่: ${currentSubCategoryName}` : 'ระบบเบิกอุปกรณ์'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            {language === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
