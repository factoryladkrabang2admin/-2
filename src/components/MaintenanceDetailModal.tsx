import React, { useState } from 'react';
import { 
  X, 
  Wrench, 
  Calendar, 
  Building2, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink,
  MapPin,
  Sparkles,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { MaintenanceTicket, MaintenanceStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { MAINTENANCE_SHEET_URL } from '../services/googleSheetSyncService';

interface MaintenanceDetailModalProps {
  isOpen: boolean;
  ticket: MaintenanceTicket | null;
  onClose: () => void;
  onUpdateStatus?: (ticketId: string, newStatus: MaintenanceStatus) => void;
}

export const MaintenanceDetailModal: React.FC<MaintenanceDetailModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onUpdateStatus,
}) => {
  const { language } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleCopyTicketNo = () => {
    const textToCopy = ticket.workOrderNo || `ลำดับที่ ${ticket.seq}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Status visual mapping
  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'เสร็จแล้ว':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: language === 'th' ? 'เสร็จแล้ว (Completed)' : 'Completed',
        };
      case 'อยู่ระหว่างดำเนินการ':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          icon: <Clock className="w-4 h-4 text-sky-600 animate-spin" />,
          label: language === 'th' ? 'อยู่ระหว่างดำเนินการ (In Progress)' : 'In Progress',
        };
      case 'แจ้งใหม่':
      default:
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-200',
          icon: <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />,
          label: language === 'th' ? 'แจ้งใหม่ (New / Pending)' : 'New / Pending',
        };
    }
  };

  const statusInfo = getStatusBadge(ticket.status);

  return (
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
                <Wrench className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold tracking-wider">
                    ลำดับที่ {ticket.seq}
                  </span>
                  <span className="text-xs text-slate-300">
                    {language === 'th' ? 'ใบแจ้งงานซ่อมบำรุง' : 'Maintenance Work Order'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                    {ticket.workOrderNo || (language === 'th' ? 'ไม่มีเลขที่ใบแจ้งงาน' : 'No Work Order No.')}
                  </h2>
                  <button
                    type="button"
                    onClick={handleCopyTicketNo}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title={language === 'th' ? (ticket.workOrderNo ? 'คัดลอกเลขที่ใบแจ้งงาน' : 'คัดลอกลำดับที่') : 'Copy Work Order / Seq'}
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
          {/* Status & Department Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{language === 'th' ? 'สถานะปัจจุบัน:' : 'Current Status:'}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{language === 'th' ? 'หน่วยงานรับแจ้ง:' : 'Assigned Dept:'}</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate max-w-[200px]">{ticket.department}</span>
              </span>
            </div>
          </div>

          {/* Issue Detail Box */}
          <div className="bg-amber-50/40 rounded-2xl p-5 border border-amber-200/80">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
              <FileText className="w-4 h-4 text-amber-700" />
              <span>{language === 'th' ? 'ปัญหา / รายละเอียดการแจ้งซ่อม' : 'Issue & Problem Description'}</span>
            </div>
            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {ticket.issueDetail}
            </p>

            {ticket.location && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-semibold text-amber-900">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'th' ? 'สถานที่:' : 'Location:'} {ticket.location}</span>
              </div>
            )}
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Requester */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>{language === 'th' ? 'ผู้แจ้งงาน' : 'Reported By'}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{ticket.requester || '-'}</p>
            </div>

            {/* Reported Date */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'th' ? 'วันที่แจ้ง' : 'Reported Date'}</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{ticket.reportedDate || '-'}</p>
            </div>

            {/* Action / Started Date */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>{language === 'th' ? 'วันดำเนินการ' : 'Action Date'}</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{ticket.actionDate || '-'}</p>
            </div>
          </div>

          {/* Completion & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
              <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'th' ? 'วันที่แล้วเสร็จ' : 'Completed Date'}</span>
              </div>
              <p className="text-sm font-bold text-emerald-950">{ticket.completedDate || (ticket.status === 'เสร็จแล้ว' ? 'เรียบร้อย' : 'กำลังดำเนินการ')}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold mb-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'th' ? 'หมายเหตุ' : 'Notes / Remarks'}</span>
              </div>
              <p className="text-xs font-medium text-slate-700">{ticket.note || '-'}</p>
            </div>
          </div>

          {/* Timeline Process */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{language === 'th' ? 'ลำดับขั้นตอนการดำเนินงาน' : 'Process Workflow Timeline'}</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mx-auto mb-1.5" />
                <span className="font-bold text-slate-800 block">{language === 'th' ? '1. รับแจ้งงาน' : '1. Logged'}</span>
                <span className="text-[11px] text-slate-500">{ticket.reportedDate || '-'}</span>
              </div>

              <div className={`p-2.5 rounded-xl border ${ticket.status !== 'แจ้งใหม่' ? 'bg-sky-50 border-sky-300' : 'bg-white border-slate-200 opacity-60'}`}>
                <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-1.5 ${ticket.status !== 'แจ้งใหม่' ? 'bg-sky-500' : 'bg-slate-300'}`} />
                <span className="font-bold text-slate-800 block">{language === 'th' ? '2. ดำเนินการ' : '2. Action'}</span>
                <span className="text-[11px] text-slate-500">{ticket.actionDate || '-'}</span>
              </div>

              <div className={`p-2.5 rounded-xl border ${ticket.status === 'เสร็จแล้ว' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 opacity-60'}`}>
                <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-1.5 ${ticket.status === 'เสร็จแล้ว' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="font-bold text-slate-800 block">{language === 'th' ? '3. แล้วเสร็จ' : '3. Completed'}</span>
                <span className="text-[11px] text-slate-500">{ticket.completedDate || (ticket.status === 'เสร็จแล้ว' ? 'เสร็จแล้ว' : '-')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <a
            href={MAINTENANCE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'th' ? 'เปิดใน Google Sheet' : 'Open in Sheet'}</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>{language === 'th' ? 'พิมพ์ใบงาน' : 'Print Order'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {language === 'th' ? 'ปิด' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
