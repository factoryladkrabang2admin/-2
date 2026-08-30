import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  User, 
  Building2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Sparkles,
  Printer,
  CalendarCheck,
  Timer
} from 'lucide-react';
import { OtRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatOtHoursDisplay } from '../services/googleSheetSyncService';

interface OtDetailModalProps {
  record: OtRecord | null;
  onClose: () => void;
}

export const OtDetailModal: React.FC<OtDetailModalProps> = ({ record, onClose }) => {
  const { language } = useLanguage();
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [copiedEmpId, setCopiedEmpId] = useState(false);

  useEffect(() => {
    if (!record) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const isApproved = record.status.toLowerCase().includes('approved') || record.status.includes('อนุมัติ');

  const handleCopyDoc = () => {
    if (!record.docNo || record.docNo === '-') return;
    navigator.clipboard.writeText(record.docNo);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleCopyEmpId = () => {
    if (!record.employeeId || record.employeeId === '-') return;
    navigator.clipboard.writeText(record.employeeId);
    setCopiedEmpId(true);
    setTimeout(() => setCopiedEmpId(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-sky-100 overflow-hidden flex flex-col max-h-[90vh] z-[110] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#002045] via-[#003366] to-[#0a4a82] text-white p-6 relative flex items-start justify-between">
          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-400/20 text-sky-200 border border-sky-300/30">
                  #{record.seq}
                </span>
                <span 
                  className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    isApproved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {record.status}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight text-white flex items-center gap-2">
                {record.employeeName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#1a1c1c]">
          {/* Key OT Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. เวลาทำ OT และชั่วโมง */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
                <span className="flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-sky-700" />
                  {language === 'th' ? 'เวลาปฏิบัติงาน OT' : 'OT Working Time'}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-sky-200 text-sky-900 font-bold text-[11px]">
                  {formatOtHoursDisplay(record.startTime, record.endTime, record.totalHours)} {language === 'th' ? 'ชั่วโมง' : 'hrs'}
                </span>
              </div>
              <p className="text-xl font-bold text-[#002045]">
                {record.startTime} - {record.endTime} น.
              </p>
              <p className="text-xs text-sky-800">
                {language === 'th' ? 'วันที่ทำ OT:' : 'OT Date:'} <span className="font-semibold text-[#002045]">{record.otDate}</span>
              </p>
            </div>

            {/* 2. เลขที่เอกสาร */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  {language === 'th' ? 'เลขที่เอกสาร' : 'Document No.'}
                </span>
                {record.docNo && record.docNo !== '-' && (
                  <button
                    type="button"
                    onClick={handleCopyDoc}
                    className="flex items-center gap-1 text-[11px] text-sky-700 hover:text-sky-900 font-medium cursor-pointer"
                  >
                    {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedDoc ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}
                  </button>
                )}
              </div>
              <p className="text-xl font-bold font-mono text-[#002045]">
                {record.docNo || '-'}
              </p>
              <p className="text-xs text-slate-500">
                {language === 'th' ? 'วันที่บันทึก:' : 'Recorded Date:'} <span className="font-semibold text-slate-700">{record.recordedDate}</span>
              </p>
            </div>
          </div>

          {/* Details Breakdown */}
          <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/70 space-y-3.5 text-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              {language === 'th' ? 'รายละเอียดพนักงานและสังกัด' : 'Employee & Department Info'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee ID */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{language === 'th' ? 'รหัสพนักงาน' : 'Employee ID'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-[#002045] text-base">{record.employeeId}</span>
                    {record.employeeId && record.employeeId !== '-' && (
                      <button
                        type="button"
                        onClick={handleCopyEmpId}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={language === 'th' ? 'คัดลอกรหัสพนักงาน' : 'Copy ID'}
                      >
                        {copiedEmpId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Department */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{language === 'th' ? 'ฝ่ายงาน / แผนก' : 'Department'}</span>
                  <span className="font-bold text-[#002045] text-base">{record.department}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Remarks */}
          {record.note && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1.5">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                {language === 'th' ? 'หมายเหตุ / วัตถุประสงค์การทำ OT' : 'Notes & Remarks'}
              </span>
              <p className="text-sm font-medium text-amber-950 leading-relaxed">
                {record.note}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            {language === 'th' ? 'พิมพ์รายการ' : 'Print'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
