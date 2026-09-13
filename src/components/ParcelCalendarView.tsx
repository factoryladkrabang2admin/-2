import React, { useState, useMemo } from 'react';
import { ParcelDeliveryRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Package, 
  Clock, 
  Send, 
  Inbox, 
  Building2, 
  X, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ParcelCalendarViewProps {
  records: ParcelDeliveryRecord[];
  onSelectRecord: (record: ParcelDeliveryRecord) => void;
}

export function extractParcelDate(record: ParcelDeliveryRecord): { year: number; month: number; day: number } | null {
  const target = record.dateStr || record.timestamp || '';
  if (!target.trim()) return null;

  const clean = target.split(/[\s,]+/)[0].trim();
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // Format: YYYY-MM-DD
    if (p0 > 1000 || parts[0].length === 4) {
      let year = p0;
      if (year > 2400) year -= 543;
      return { year, month: p1 - 1, day: p2 };
    }

    // Format: DD/MM/YYYY
    let year = p2;
    if (year < 100) year += 2000;
    else if (year > 2400) year -= 543;
    return { year, month: p1 - 1, day: p0 };
  }
  return null;
}

export const ParcelCalendarView: React.FC<ParcelCalendarViewProps> = ({
  records,
  onSelectRecord,
}) => {
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(() => {
    // Pick the most recent record date or today
    if (records.length > 0) {
      const parsed = extractParcelDate(records[0]);
      if (parsed) {
        return new Date(parsed.year, parsed.month, 1);
      }
    }
    return new Date();
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'ส่ง' | 'รับ'>('all');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Filter records by type
  const activeRecords = useMemo(() => {
    if (typeFilter === 'all') return records;
    return records.filter(r => r.actionType === typeFilter);
  }, [records, typeFilter]);

  // Group records by day for current month
  const recordsByDay = useMemo(() => {
    const map: Record<number, ParcelDeliveryRecord[]> = {};

    activeRecords.forEach(r => {
      const parsed = extractParcelDate(r);
      if (parsed && parsed.year === currentYear && parsed.month === currentMonth) {
        if (!map[parsed.day]) {
          map[parsed.day] = [];
        }
        map[parsed.day].push(r);
      }
    });

    return map;
  }, [activeRecords, currentYear, currentMonth]);

  // Calendar calculations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
    setIsDayModalOpen(false);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
    setIsDayModalOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

  const handleDayClick = (dayNum: number) => {
    setSelectedDay(dayNum);
    setIsDayModalOpen(true);
  };

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const monthLabel = language === 'th'
    ? `${thaiMonths[currentMonth]} ${currentYear + 543}`
    : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const weekDays = language === 'th'
    ? ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedDayRecords = selectedDay ? (recordsByDay[selectedDay] || []) : [];

  return (
    <div className="space-y-4">
      {/* Top Controls Bar - Mobile & Tablet friendly */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-pink-100 dark:border-slate-800 shadow-xs">
        {/* Month Picker & Arrows */}
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-1 sm:gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white px-1 sm:px-2 min-w-[130px] sm:min-w-[160px] text-center truncate">
            {monthLabel}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={handleToday}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-pink-200 dark:border-pink-900/50 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 text-xs font-bold hover:bg-pink-100 transition-colors cursor-pointer ml-auto sm:ml-0"
          >
            วันนี้
          </button>
        </div>

        {/* Filter Buttons - Fitted compactly for mobile and tablet portrait */}
        <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              typeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setTypeFilter('ส่ง')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              typeFilter === 'ส่ง'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📤 ส่ง
          </button>
          <button
            onClick={() => setTypeFilter('รับ')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              typeFilter === 'รับ'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📥 รับ
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-pink-100 dark:border-slate-800 p-1.5 sm:p-3 lg:p-5 shadow-xs overflow-hidden">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-2">
          {weekDays.map((d, i) => (
            <div 
              key={d} 
              className={`text-center py-1 sm:py-1.5 md:py-2 font-bold text-[10px] sm:text-xs md:text-sm ${
                i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
          {/* Empty padding days */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 sm:h-20 md:h-24 rounded-lg sm:rounded-xl bg-slate-50/50 dark:bg-slate-800/30 opacity-40" />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayRecords = recordsByDay[dayNum] || [];
            const hasRecords = dayRecords.length > 0;
            const isSelected = selectedDay === dayNum;
            const sentCount = dayRecords.filter(r => r.actionType === 'ส่ง').length;
            const receivedCount = dayRecords.filter(r => r.actionType === 'รับ').length;

            const isToday = 
              new Date().getDate() === dayNum &&
              new Date().getMonth() === currentMonth &&
              new Date().getFullYear() === currentYear;

            // Responsive font sizing based on number of records (fits mobile portrait & tablet portrait seamlessly)
            const getBadgeClass = (count: number) => {
              if (count >= 100) return 'text-[6.5px] sm:text-[8px] md:text-[10px] px-0.5 sm:px-1';
              if (count >= 10) return 'text-[7.5px] sm:text-[9px] md:text-[11px] px-0.5 sm:px-1.5';
              return 'text-[8.5px] sm:text-[10px] md:text-xs px-0.5 sm:px-1.5';
            };

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => handleDayClick(dayNum)}
                className={`h-16 sm:h-20 md:h-24 p-1 sm:p-1.5 md:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? 'border-pink-500 bg-pink-50/80 dark:bg-pink-950/40 shadow-xs ring-2 ring-pink-400/50'
                    : isToday
                    ? 'border-pink-300 dark:border-pink-700 bg-pink-50/40 dark:bg-pink-950/20'
                    : hasRecords
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700'
                    : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 hover:bg-slate-50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold transition-all ${
                    isToday 
                      ? 'w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-pink-600 text-white flex items-center justify-center text-[9px] sm:text-[10px] md:text-xs shadow-xs' 
                      : isSelected 
                      ? 'text-[10px] sm:text-xs md:text-sm text-pink-600 dark:text-pink-400' 
                      : 'text-[10px] sm:text-xs md:text-sm text-slate-800 dark:text-slate-200'
                  }`}>
                    {dayNum}
                  </span>
                </div>

                {/* Display only numeric counts of รับ and ส่ง with responsive scaling for mobile & tablet portrait */}
                <div className="flex flex-col items-center justify-center flex-1 py-0.5 gap-0.5 sm:gap-1 w-full min-w-0">
                  {hasRecords && (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-0.5 sm:gap-1 w-full min-w-0">
                      {sentCount > 0 && (
                        <span 
                          className={`inline-flex items-center justify-center gap-0.5 py-0.5 rounded sm:rounded-md font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 w-full md:w-auto leading-none min-w-0 ${getBadgeClass(sentCount)}`}
                          title={`ส่ง ${sentCount} รายการ`}
                        >
                          <span className="text-[7px] sm:text-[8px] md:text-[10px] shrink-0 scale-95 sm:scale-100">ส่ง</span>
                          <span className="font-mono font-black">{sentCount}</span>
                        </span>
                      )}
                      {receivedCount > 0 && (
                        <span 
                          className={`inline-flex items-center justify-center gap-0.5 py-0.5 rounded sm:rounded-md font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 w-full md:w-auto leading-none min-w-0 ${getBadgeClass(receivedCount)}`}
                          title={`รับ ${receivedCount} รายการ`}
                        >
                          <span className="text-[7px] sm:text-[8px] md:text-[10px] shrink-0 scale-95 sm:scale-100">รับ</span>
                          <span className="font-mono font-black">{receivedCount}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section (Desktop / Inline view) */}
      {selectedDay && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-pink-200 dark:border-slate-800 p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-600" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                รายการวันที่ {selectedDay} {language === 'th' ? `${thaiMonths[currentMonth]} ${currentYear + 543}` : monthLabel}
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-bold">
                {selectedDayRecords.length} รายการ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDayModalOpen(true)}
                className="text-xs px-3 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/50 hover:bg-pink-100 text-pink-700 dark:text-pink-300 font-bold transition-colors cursor-pointer border border-pink-200 dark:border-pink-800"
              >
                เปิดในหน้าต่าง
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedDayRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              ไม่มีบันทึกรับ-ส่ง เอกสาร / พัสดุ ในวันที่เลือก
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDayRecords.map((rec, index) => {
                const isSent = rec.actionType === 'ส่ง';
                return (
                  <div
                    key={`${rec.id}-${rec.seq || index}`}
                    onClick={() => onSelectRecord(rec)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-pink-50/40 dark:hover:bg-pink-950/20 transition-all cursor-pointer flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isSent 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        }`}>
                          {isSent ? '📤 รายการส่ง' : '📥 รายการรับ'}
                        </span>
                        <span className="text-xs text-slate-400">{rec.timeStr || rec.timestamp}</span>
                      </div>
                      {rec.trackingCode && (
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          isSent
                            ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                            : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {rec.trackingCode}
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {rec.itemTitle}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="truncate">{rec.senderName} ({rec.senderDepartment})</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{rec.recipientName} ({rec.recipientDepartment})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Day Details Modal Window (หน้าต่างป๊อปอัปเมื่อกดดูข้อมูล) */}
      {isDayModalOpen && selectedDay !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsDayModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-inner">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      รายการวันที่ {selectedDay} {language === 'th' ? `${thaiMonths[currentMonth]} ${currentYear + 543}` : monthLabel}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold border border-white/30">
                      {selectedDayRecords.length} รายการ
                    </span>
                  </div>
                  <p className="text-xs text-pink-100/90 mt-0.5">
                    รับ-ส่ง เอกสาร / พัสดุ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDayModalOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {selectedDayRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30 text-pink-500" />
                  <p className="text-sm font-semibold">ไม่มีบันทึกรับ-ส่ง เอกสาร / พัสดุ ในวันที่เลือก</p>
                </div>
              ) : (
                selectedDayRecords.map((rec, index) => {
                  const isSent = rec.actionType === 'ส่ง';
                  return (
                    <div
                      key={`${rec.id}-${rec.seq || index}`}
                      onClick={() => {
                        setIsDayModalOpen(false);
                        onSelectRecord(rec);
                      }}
                      className="p-4 rounded-2xl border border-pink-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-pink-50/40 dark:hover:bg-pink-950/20 hover:border-pink-300 dark:hover:border-pink-700 transition-all cursor-pointer flex flex-col gap-2.5 group"
                    >
                      {/* Item Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                            isSent 
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800' 
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {isSent ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
                            {isSent ? 'รายการส่ง' : 'รายการรับ'}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.timeStr || rec.timestamp}
                          </span>
                        </div>

                        {rec.trackingCode && (
                          <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-md border ${
                            isSent
                              ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
                              : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
                          }`}>
                            {rec.trackingCode}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {rec.itemTitle}
                      </div>

                      {/* Sender -> Recipient */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600 dark:text-slate-300 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-400">ผู้ส่ง:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{rec.senderName}</span>
                          <span className="text-slate-400">({rec.senderDepartment})</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-400">ผู้รับ:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{rec.recipientName}</span>
                          <span className="text-slate-400">({rec.recipientDepartment})</span>
                        </div>
                      </div>

                      {/* View Details Prompt */}
                      <div className="flex items-center justify-end text-xs text-pink-600 dark:text-pink-400 font-bold group-hover:translate-x-0.5 transition-transform pt-1">
                        ดูรายละเอียด <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDayModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
