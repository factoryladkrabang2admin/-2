import React, { useState, useMemo } from 'react';
import { OtRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatOtHoursDisplay } from '../services/googleSheetSyncService';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Timer
} from 'lucide-react';

interface OtCalendarViewProps {
  records: OtRecord[];
  onSelectRecord: (record: OtRecord) => void;
}

export function extractOtDate(record: OtRecord): { year: number; month: number; day: number } | null {
  const dateStr = record.otDate || record.recordedDate;
  if (!dateStr || dateStr === '-') return null;

  const clean = dateStr.trim();
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

    // Format: DD/MM/YYYY or DD-MM-YY
    let year = p2;
    if (year < 100) year += 2000;
    else if (year > 2400) year -= 543;
    return { year, month: p1 - 1, day: p0 };
  }
  return null;
}

export const OtCalendarView: React.FC<OtCalendarViewProps> = ({ records, onSelectRecord }) => {
  const { language } = useLanguage();

  // Find default active month to current date (Today)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDayModal, setShowDayModal] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Map of records per day in current month
  const dayRecordsMap = useMemo(() => {
    const map = new Map<number, OtRecord[]>();
    records.forEach(r => {
      const parsed = extractOtDate(r);
      if (parsed && parsed.year === year && parsed.month === month) {
        const list = map.get(parsed.day) || [];
        list.push(r);
        map.set(parsed.day, list);
      }
    });
    return map;
  }, [records, year, month]);

  const monthNamesTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDaysTh = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const activeDayRecords = selectedDay ? (dayRecordsMap.get(selectedDay) || []) : [];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-md space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#002045]/5 text-[#002045] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#002045]">
              {language === 'th' ? monthNamesTh[month] : monthNamesEn[month]} {language === 'th' ? year + 543 : year}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'th' ? 'คลิกที่วันเพื่อดูรายชื่อผู้ทำ OT ประจำวัน' : 'Click on a date to view OT records'}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-xs"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#002045] hover:bg-[#003366] text-white transition-all cursor-pointer shadow-xs"
          >
            {language === 'th' ? 'วันนี้' : 'Today'}
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-xs"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
        {(language === 'th' ? weekDaysTh : weekDaysEn).map((day, idx) => (
          <div 
            key={day} 
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg ${
              idx === 0 ? 'text-rose-600 bg-rose-50/50' :
              idx === 6 ? 'text-sky-600 bg-sky-50/50' :
              'text-slate-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Blank cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`blank-${i}`} className="min-h-[85px] sm:min-h-[105px] rounded-2xl bg-slate-50/40 border border-transparent" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const dayList = dayRecordsMap.get(dayNumber) || [];
          const hasRecords = dayList.length > 0;
          const isSelected = selectedDay === dayNumber;
          const isCurrentToday = dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div
              key={`day-${dayNumber}`}
              onClick={() => {
                setSelectedDay(dayNumber);
                if (hasRecords) setShowDayModal(true);
              }}
              className={`min-h-[85px] sm:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-300 shadow-md'
                  : isCurrentToday
                  ? 'border-orange-400 bg-orange-50/40 ring-2 ring-orange-300 shadow-xs'
                  : hasRecords
                  ? 'border-sky-200 bg-white hover:border-sky-400 hover:shadow-md'
                  : 'border-slate-100 bg-white/70 hover:bg-slate-50 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs sm:text-sm font-black w-6 h-6 rounded-lg flex items-center justify-center ${
                  isCurrentToday
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : hasRecords 
                    ? 'text-[#002045]' 
                    : 'text-slate-500'
                }`}>
                  {dayNumber}
                </span>

                {isCurrentToday && (
                  <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-800 text-[10px] font-extrabold border border-orange-200">
                    {language === 'th' ? 'วันนี้' : 'Today'}
                  </span>
                )}
              </div>

              {/* Centered clean indicator for days with records (single count display) */}
              {hasRecords ? (
                <div className="flex-1 flex items-center justify-center py-1">
                  <span className="text-xs sm:text-sm font-black text-sky-800 bg-sky-100/90 border border-sky-300 px-2.5 py-0.5 rounded-lg shadow-2xs min-w-[28px] text-center">
                    {dayList.length}
                  </span>
                </div>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Day OT Details Modal */}
      {showDayModal && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-sky-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-[#002045] to-[#003366] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {language === 'th' ? 'รายการ OT วันที่' : 'OT Records on'} {selectedDay} {language === 'th' ? monthNamesTh[month] : monthNamesEn[month]} {language === 'th' ? year + 543 : year}
                  </h3>
                  <p className="text-xs text-sky-200">
                    {activeDayRecords.length} {language === 'th' ? 'รายการ' : 'records'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDayModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
              {activeDayRecords.map(record => (
                <div 
                  key={record.id}
                  onClick={() => {
                    setShowDayModal(false);
                    onSelectRecord(record);
                  }}
                  className="pt-3 first:pt-0 p-3 rounded-2xl hover:bg-sky-50/70 border border-transparent hover:border-sky-200 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#002045] truncate">{record.employeeName}</span>
                      <span className="text-xs text-slate-500 font-mono">({record.employeeId})</span>
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{record.department}</span>
                      <span>•</span>
                      <Timer className="w-3.5 h-3.5 text-sky-600" />
                      <span className="font-semibold text-sky-800">{record.startTime} - {record.endTime} น. ({formatOtHoursDisplay(record.startTime, record.endTime, record.totalHours)} ชม.)</span>
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    record.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDayModal(false)}
                className="px-5 py-2 rounded-xl bg-[#002045] text-white text-xs font-bold cursor-pointer"
              >
                {language === 'th' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
