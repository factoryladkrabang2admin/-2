import React, { useState } from 'react';
import { 
  X, 
  FlaskConical, 
  Calendar, 
  Building2, 
  User, 
  Clock, 
  CheckCircle2, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink,
  MapPin,
  Image as ImageIcon,
  ZoomIn,
  Sparkles,
  Download
} from 'lucide-react';
import { ChlorineInspectionRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CHLORINE_SHEET_URL } from '../services/googleSheetSyncService';

interface ChlorineDetailModalProps {
  isOpen: boolean;
  record: ChlorineInspectionRecord | null;
  onClose: () => void;
}

export const ChlorineDetailModal: React.FC<ChlorineDetailModalProps> = ({
  isOpen,
  record,
  onClose,
}) => {
  const { language } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen || !record) return null;

  const handleCopySeq = () => {
    const textToCopy = `บันทึกสุ่มตรวจคลอรีน ลำดับที่ ${record.seq} (${record.building}) โดย ${record.inspectorName}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isBuildingA = record.building.includes('A');

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#002045] text-white p-6 relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                  <FlaskConical className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold tracking-wider">
                      ลำดับที่ {record.seq}
                    </span>
                    <span className="text-xs text-slate-300">
                      {language === 'th' ? 'บันทึกผลการสุ่มตรวจคลอรีน' : 'Chlorine Inspection Record'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {record.rawArea || (language === 'th' ? 'สุ่มตรวจคลอรีน' : 'Chlorine Check')}
                    </h2>
                    <button
                      type="button"
                      onClick={handleCopySeq}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={language === 'th' ? 'คัดลอกข้อมูล' : 'Copy info'}
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Status & Building Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{language === 'th' ? 'สถานะ:' : 'Status:'}</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'th' ? 'บันทึกผลเรียบร้อย (Completed)' : 'Completed'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{language === 'th' ? 'พื้นที่ / อาคาร:' : 'Area / Building:'}</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                  isBuildingA 
                    ? 'bg-amber-50 text-amber-900 border-amber-200' 
                    : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                }`}>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{record.building}</span>
                </span>
              </div>
            </div>

            {/* Photo Evidence Section */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>{language === 'th' ? 'ภาพถ่ายผลการสุ่มตรวจ' : 'Inspection Photo Evidence'}</span>
                </div>

                {record.rawPhotoUrl && (
                  <a
                    href={record.rawPhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{language === 'th' ? 'เปิดใน Google Drive' : 'Open in Drive'}</span>
                  </a>
                )}
              </div>

              {record.photoUrl && !imageError ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 group">
                  <img
                    src={record.photoUrl}
                    alt={`Chlorine inspection #${record.seq}`}
                    className="w-full max-h-80 object-contain mx-auto bg-slate-950/5 transition-transform duration-300 group-hover:scale-102"
                    onError={() => setImageError(true)}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none">
                    <button
                      type="button"
                      onClick={() => setShowFullPhoto(true)}
                      className="pointer-events-auto px-4 py-2 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-white cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span>{language === 'th' ? 'ขยายภาพเต็มจอ' : 'Zoom In'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-500">
                    {language === 'th' ? 'ไม่มีรูปภาพหรือลิงก์รูปภาพไม่สามารถแสดงผลได้โดยตรง' : 'No preview available'}
                  </p>
                  {record.rawPhotoUrl && (
                    <a
                      href={record.rawPhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'เปิดดูรูปภาพใน Google Drive' : 'Open in Google Drive'}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Inspector */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{language === 'th' ? 'ผู้ผสมสาร / ผู้สุ่มตรวจ' : 'Inspector'}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 truncate">{record.inspectorName || '-'}</p>
              </div>

              {/* Inspection Date */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'th' ? 'วันที่ระบุ' : 'Inspection Date'}</span>
                </div>
                <p className="text-sm font-bold text-slate-800">{record.inspectionDate || '-'}</p>
              </div>

              {/* Timestamp */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>{language === 'th' ? 'เวลาบันทึก' : 'Timestamp'}</span>
                </div>
                <p className="text-sm font-bold text-slate-800">{record.timestamp || '-'}</p>
              </div>
            </div>

            {/* Google Sheets Reference Banner */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                  <FlaskConical className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {language === 'th' ? 'ฐานข้อมูลสุ่มตรวจคลอรีน Google Sheets' : 'Google Sheets Chlorine Database'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {language === 'th' ? 'เชื่อมต่อข้อมูลสดแบบสองทางกับชีตหลัก' : 'Connected to central inspection sheet'}
                  </p>
                </div>
              </div>
              <a
                href={CHLORINE_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เปิดชีต' : 'Open Sheet'}</span>
              </a>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>{language === 'th' ? 'พิมพ์ใบรายงาน' : 'Print Report'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Full Photo Modal */}
      {showFullPhoto && record.photoUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowFullPhoto(false)}
        >
          <div className="relative max-w-5xl max-h-[95vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowFullPhoto(false)}
              className="absolute -top-12 right-0 text-white hover:text-amber-400 p-2 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={record.photoUrl}
              alt="Full size chlorine inspection"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <p className="mt-3 text-white text-xs font-mono font-medium">
              ลำดับที่ {record.seq} • {record.building} • {record.inspectorName} ({record.inspectionDate})
            </p>
          </div>
        </div>
      )}
    </>
  );
};
