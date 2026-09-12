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
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
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
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-pink-100 dark:border-slate-800 shadow-xs">
        {/* Month Picker & Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white px-2 min-w-[160px] text-center">
            {monthLabel}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-pink-200 dark:border-pink-900/50 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 text-xs font-bold hover:bg-pink-100 transition-colors cursor-pointer"
          >
            วันนี้
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setTypeFilter('ส่ง')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              typeFilter === 'ส่ง'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📤 ส่ง
          </button>
          <button
            onClick={() => setTypeFilter('รับ')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-pink-100 dark:border-slate-800 p-4 sm:p-5 shadow-xs overflow-hidden">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {weekDays.map((d, i) => (
            <div 
              key={d} 
              className={`text-center py-2 font-bold text-xs ${
                i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty padding days */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 opacity-40" />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayRecords = recordsByDay[dayNum] || [];
            const hasRecords = dayRecords.length > 0;
            const isSelected = selectedDay === dayNum;

            const isToday = 
              new Date().getDate() === dayNum &&
              new Date().getMonth() === currentMonth &&
              new Date().getFullYear() === currentYear;

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
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
                  <span className={`text-xs sm:text-sm font-bold ${
                    isToday 
                      ? 'w-6 h-6 rounded-full bg-pink-600 text-white flex items-center justify-center' 
                      : isSelected 
                      ? 'text-pink-600 dark:text-pink-400' 
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {dayNum}
                  </span>
                  {hasRecords && (
                    <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300">
                      {dayRecords.length}
                    </span>
                  )}
                </div>

                {/* Mini Indicators */}
                <div className="space-y-1 overflow-hidden">
                  {dayRecords.slice(0, 2).map((rec, index) => (
                    <div 
                      key={`${rec.id}-${rec.seq || index}`}
                      className={`text-[9px] sm:text-[10px] truncate px-1 rounded-sm font-medium ${
                        rec.actionType === 'ส่ง' 
                          ? 'bg-rose-100/90 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' 
                          : 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                      }`}
                      title={`${rec.actionType}: ${rec.itemTitle}`}
                    >
                      {rec.actionType === 'ส่ง' ? '📤' : '📥'} {rec.itemTitle}
                    </div>
                  ))}
                  {dayRecords.length > 2 && (
                    <div className="text-[9px] text-slate-500 font-medium text-center">
                      +{dayRecords.length - 2} รายการ
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Drawer / Details */}
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
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
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
                      <span className="text-xs text-slate-400">ลำดับที่ {rec.seq}</span>
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
    </div>
  );
};
