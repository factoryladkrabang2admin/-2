import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Copy, 
  Sparkles, 
  Filter, 
  Table, 
  Info,
  Check,
  ChevronRight,
  Eye
} from 'lucide-react';
import { MaintenanceTicket } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const MAINTENANCE_GOOGLE_SHEET_HEADERS = [
  'ลำดับ',
  'เลขที่ใบแจ้งงาน',
  'หน่วยงานที่รับแจ้ง',
  'ปัญหา / รายละเอียด',
  'วันที่แจ้ง',
  'สถานะใบงาน',
  'วันดำเนินการ',
  'ผู้แจ้ง',
  'วันที่แล้วเสร็จ',
  'หมายเหตุุ'
] as const;

export function formatTicketToSheetRow(ticket: MaintenanceTicket): string[] {
  return [
    String(ticket.seq ?? ''),
    String(ticket.workOrderNo ?? ''),
    String(ticket.department ?? ''),
    String(ticket.issueDetail ?? ''),
    String(ticket.reportedDate ?? ''),
    String(ticket.status ?? ''),
    String(ticket.actionDate ?? ''),
    String(ticket.requester ?? ''),
    String(ticket.completedDate ?? ''),
    String(ticket.note ?? '')
  ];
}

export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportTicketsToGoogleSheetCsv(
  tickets: MaintenanceTicket[],
  mode: 'all' | 'filtered' = 'all'
): string {
  // If 'all', sort ascending by seq (1, 2, 3...) to match the original Google Sheet order row-by-row
  const exportList = mode === 'all'
    ? [...tickets].sort((a, b) => a.seq - b.seq)
    : [...tickets];

  const headerLine = MAINTENANCE_GOOGLE_SHEET_HEADERS.map(escapeCsvCell).join(',');
  const rowLines = exportList.map((ticket) => {
    return formatTicketToSheetRow(ticket).map(escapeCsvCell).join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel and Google Sheets open Thai characters correctly
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

export function exportTicketsToGoogleSheetTsv(
  tickets: MaintenanceTicket[],
  mode: 'all' | 'filtered' = 'all'
): string {
  const exportList = mode === 'all'
    ? [...tickets].sort((a, b) => a.seq - b.seq)
    : [...tickets];

  const headerLine = MAINTENANCE_GOOGLE_SHEET_HEADERS.join('\t');
  const rowLines = exportList.map((ticket) => {
    return formatTicketToSheetRow(ticket)
      .map((v) => v.replace(/[\t\r\n]/g, ' '))
      .join('\t');
  });

  return [headerLine, ...rowLines].join('\n');
}

export function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface MaintenanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: MaintenanceTicket[];
  filteredTickets: MaintenanceTicket[];
  activeFiltersCount: number;
  onSuccessToast?: (msg: string) => void;
}

export const MaintenanceExportModal: React.FC<MaintenanceExportModalProps> = ({
  isOpen,
  onClose,
  tickets,
  filteredTickets,
  activeFiltersCount,
  onSuccessToast,
}) => {
  const { language } = useLanguage();
  const [copiedType, setCopiedType] = useState<'all' | 'filtered' | null>(null);
  const [downloadSuccessType, setDownloadSuccessType] = useState<'all' | 'filtered' | null>(null);
  const [showTablePreview, setShowTablePreview] = useState(false);

  // Preview rows (first 5 records sorted by seq 1..N)
  const previewRows = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => a.seq - b.seq);
    return sorted.slice(0, 5);
  }, [tickets]);

  if (!isOpen) return null;

  const handleDownload = (mode: 'all' | 'filtered') => {
    const list = mode === 'all' ? tickets : filteredTickets;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = mode === 'all' 
      ? `การแจ้งซ่อม_GoogleSheet_ต้นฉบับ_${dateStr}.csv` 
      : `การแจ้งซ่อม_ตามตัวกรอง_${dateStr}.csv`;

    const csvContent = exportTicketsToGoogleSheetCsv(list, mode);
    triggerDownload(csvContent, filename);

    setDownloadSuccessType(mode);
    const msg = mode === 'all'
      ? `ดาวน์โหลดข้อมูลต้นฉบับ Google Sheet สำเร็จ (${list.length} รายการ)`
      : `ดาวน์โหลดข้อมูลตามตัวกรองสำเร็จ (${list.length} รายการ)`;
    onSuccessToast?.(msg);

    setTimeout(() => {
      setDownloadSuccessType(null);
    }, 2500);
  };

  const handleCopyClipboard = async (mode: 'all' | 'filtered') => {
    const list = mode === 'all' ? tickets : filteredTickets;
    const tsvContent = exportTicketsToGoogleSheetTsv(list, mode);
    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopiedType(mode);
      const msg = `คัดลอกข้อมูลตาราง (${list.length} รายการ) แล้ว สามารถ Paste ลง Google Sheet หรือ Excel ได้ทันที`;
      onSuccessToast?.(msg);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = tsvContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedType(mode);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-orange-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#7c2d12] via-[#9a3412] to-[#c2410c] text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <FileSpreadsheet className="w-40 h-40 text-white" />
          </div>

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-md">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {language === 'th' ? 'ดาวน์โหลดข้อมูลแจ้งซ่อม' : 'Download Maintenance Data'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300/40 text-emerald-200 text-[11px] font-bold">
                  Google Sheet Format
                </span>
              </div>
              <p className="text-xs text-orange-100/90 mt-0.5">
                {language === 'th' 
                  ? 'ไฟล์ CSV (UTF-8 BOM) โครงสร้าง 10 คอลัมน์ตรงตามต้นฉบับ Google Sheet 100%' 
                  : 'CSV file with exact 10 columns matching original Google Sheet row-for-row'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer relative z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Format Highlights Banner */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-950 leading-relaxed">
              <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <span>โครงสร้าง 10 คอลัมน์มาตรฐาน Google Sheet</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-semibold">
                  UTF-8 BOM
                </span>
              </div>
              <p className="text-amber-800">
                <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-200 font-mono text-[10px]">
                  ลำดับ, เลขที่ใบแจ้งงาน, หน่วยงานที่รับแจ้ง, ปัญหา / รายละเอียด, วันที่แจ้ง, สถานะใบงาน, วันดำเนินการ, ผู้แจ้ง, วันที่แล้วเสร็จ, หมายเหตุุ
                </code>
              </p>
              <p className="text-amber-700 text-[10px] mt-1">
                * เปิดใช้งานได้ทันทีใน Microsoft Excel ทุกเวอร์ชัน และ Google Sheets โดยสระภาษาไทยไม่เพี้ยน ไม่เป็นภาษาต่างดาว
              </p>
            </div>
          </div>

          {/* Download Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: All Original Google Sheet Data */}
            <div className="bg-gradient-to-br from-orange-50/50 to-white border-2 border-orange-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-orange-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">
                      ข้อมูลต้นฉบับทั้งหมด
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-black">
                    {tickets.length} รายการ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                  ดาวน์โหลดข้อมูลทั้งหมด ลำดับ 1 ถึง {tickets.length > 0 ? Math.max(...tickets.map(t => t.seq || 0)) : 0} เรียงลำดับตรงตามต้นฉบับใน Google Sheet 100%
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-orange-100">
                <button
                  type="button"
                  onClick={() => handleDownload('all')}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {downloadSuccessType === 'all' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>ดาวน์โหลดแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลดไฟล์ CSV ทั้งหมด</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyClipboard('all')}
                  className="w-full py-1.5 px-3 rounded-lg bg-orange-100/60 hover:bg-orange-100 text-orange-800 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'all' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>คัดลอกตารางแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกตาราง (Paste ลง Sheet ได้เลย)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Filtered Subset */}
            <div className={`bg-gradient-to-br from-slate-50/50 to-white border-2 rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-all ${
              activeFiltersCount > 0 
                ? 'border-indigo-200 hover:border-indigo-300' 
                : 'border-slate-200 opacity-90'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Filter className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">
                      ตามตัวกรอง / หน้าจอ
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-black ${
                    activeFiltersCount > 0
                      ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {filteredTickets.length} รายการ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                  {activeFiltersCount > 0 ? (
                    <span className="text-indigo-900 font-medium">
                      ดาวน์โหลดเฉพาะข้อมูลที่ค้นหาหรือกรองอยู่ ({activeFiltersCount} ตัวกรองที่เปิดใช้งาน)
                    </span>
                  ) : (
                    <span>
                      ข้อมูลที่แสดงผลบนหน้าจอ (ปัจจุบันแสดงข้อมูลทั้งหมดโดยไม่มีตัวกรอง)
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDownload('filtered')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {downloadSuccessType === 'filtered' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>ดาวน์โหลดแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลดตามตัวกรอง ({filteredTickets.length})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyClipboard('filtered')}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'filtered' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>คัดลอกตารางแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกตารางที่กรอง</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Table Preview Accordion */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTablePreview((prev) => !prev)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-xs text-slate-800">
                  ตรวจสอบตัวอย่างข้อมูล 10 คอลัมน์ต้นฉบับ (5 แถวแรก)
                </span>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showTablePreview ? 'rotate-90' : ''}`} />
            </button>

            {showTablePreview && (
              <div className="p-3 bg-white overflow-x-auto max-h-56">
                <table className="min-w-full text-[10px] divide-y divide-slate-200 border border-slate-200">
                  <thead className="bg-slate-100 text-slate-800">
                    <tr>
                      {MAINTENANCE_GOOGLE_SHEET_HEADERS.map((h, i) => (
                        <th key={i} className="px-2.5 py-1.5 text-left font-bold border-r border-slate-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {previewRows.map((t, rowIdx) => (
                      <tr key={t.id || rowIdx} className="hover:bg-orange-50/50">
                        <td className="px-2.5 py-1 text-center font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                          {t.seq}
                        </td>
                        <td className="px-2.5 py-1 font-semibold text-orange-950 border-r border-slate-100 whitespace-nowrap">
                          {t.workOrderNo || '-'}
                        </td>
                        <td className="px-2.5 py-1 text-slate-700 border-r border-slate-100 max-w-[120px] truncate">
                          {t.department || '-'}
                        </td>
                        <td className="px-2.5 py-1 text-slate-700 border-r border-slate-100 max-w-[160px] truncate">
                          {t.issueDetail || '-'}
                        </td>
                        <td className="px-2.5 py-1 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                          {t.reportedDate || '-'}
                        </td>
                        <td className="px-2.5 py-1 text-slate-800 border-r border-slate-100 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            t.status === 'เสร็จแล้ว' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : t.status === 'อยู่ระหว่างดำเนินการ' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-2.5 py-1 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                          {t.actionDate || '-'}
                        </td>
                        <td className="px-2.5 py-1 text-slate-700 border-r border-slate-100 whitespace-nowrap">
                          {t.requester || '-'}
                        </td>
                        <td className="px-2.5 py-1 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                          {t.completedDate || '-'}
                        </td>
                        <td className="px-2.5 py-1 text-slate-500 whitespace-nowrap">
                          {t.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>พร้อมดาวน์โหลดเป็นไฟล์ CSV สำหรับ Excel และ Google Sheet</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
