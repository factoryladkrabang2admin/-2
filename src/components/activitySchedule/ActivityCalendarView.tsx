import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Sparkles,
  Bus,
  Users,
  X
} from 'lucide-react';
import { ActivityScheduleRecord } from '../../types';

interface ActivityCalendarViewProps {
  activities: ActivityScheduleRecord[];
  onSelectActivity: (activity: ActivityScheduleRecord) => void;
}

export const ActivityCalendarView: React.FC<ActivityCalendarViewProps> = ({
  activities,
  onSelectActivity,
}) => {
  // Map activities by rawDate (yyyy-mm-dd)
  const activityMap = useMemo(() => {
    const map = new Map<string, ActivityScheduleRecord[]>();
    activities.forEach(item => {
      let key = item.rawDate;
      if (!key) {
        const parts = item.dateStr.split(/[-/.]/);
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          let y = parseInt(parts[2], 10);
          if (y > 2500) y -= 543;
          key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
      if (key) {
        const existing = map.get(key) || [];
        existing.push(item);
        map.set(key, existing);
      }
    });
    return map;
  }, [activities]);

  // Initial year/month from activities or current date
  const initialYearMonth = useMemo(() => {
    if (activities.length > 0) {
      // Find first upcoming or today or first activity
      const first = activities[0];
      if (first.rawDate) {
        const parts = first.rawDate.split('-');
        if (parts.length === 3) {
          return {
            year: parseInt(parts[0], 10),
            month: parseInt(parts[1], 10) - 1,
          };
        }
      }
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [activities]);

  const [currentYear, setCurrentYear] = useState<number>(initialYearMonth.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialYearMonth.month);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    dayOfWeek: string;
    events: ActivityScheduleRecord[];
  } | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const weekDayHeaders = [
    { name: 'อาทิตย์', short: 'อา.', color: 'text-rose-600 bg-rose-50/70 border-rose-100' },
    { name: 'จันทร์', short: 'จ.', color: 'text-amber-700 bg-amber-50/70 border-amber-100' },
    { name: 'อังคาร', short: 'อ.', color: 'text-pink-700 bg-pink-50/70 border-pink-100' },
    { name: 'พุธ', short: 'พ.', color: 'text-emerald-700 bg-emerald-50/70 border-emerald-100' },
    { name: 'พฤหัสบดี', short: 'พฤ.', color: 'text-orange-700 bg-orange-50/70 border-orange-100' },
    { name: 'ศุกร์', short: 'ศ.', color: 'text-sky-700 bg-sky-50/70 border-sky-100' },
    { name: 'เสาร์', short: 'ส.', color: 'text-purple-700 bg-purple-50/70 border-purple-100' }
  ];

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dayNumber: number;
      isCurrentMonth: boolean;
      dateKey: string;
      events: ActivityScheduleRecord[];
      isWeekend: boolean;
      isToday: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const key = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = activityMap.get(key) || [];
      const dayOfWeek = new Date(prevYear, prevMonth, d).getDay();
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: key,
        events,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: key === todayKey,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = activityMap.get(key) || [];
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateKey: key,
        events,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: key === todayKey,
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const key = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = activityMap.get(key) || [];
      const dayOfWeek = new Date(nextYear, nextMonth, d).getDay();
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: key,
        events,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: key === todayKey,
      });
    }

    return days;
  }, [currentYear, currentMonth, activityMap, todayKey]);

  const handleDayClick = (cell: typeof calendarDays[0]) => {
    if (!cell.events || cell.events.length === 0) return;
    if (cell.events.length === 1) {
      onSelectActivity(cell.events[0]);
    } else {
      setSelectedDayEvents({
        dateStr: cell.events[0].formattedDate || cell.dateKey,
        dayOfWeek: cell.events[0].dayOfWeek || '',
        events: cell.events
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-200/90 shadow-sm overflow-hidden p-4 sm:p-5 space-y-4">
      {/* Month Navigator Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-emerald-950">
              {monthNamesThai[currentMonth]} {currentYear + 543}
            </h3>
            <p className="text-xs text-emerald-800/70 font-medium">
              แสดงปฏิทินตารางกิจกรรมตามเดือน
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer mr-1"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
        {weekDayHeaders.map((header, idx) => (
          <div
            key={idx}
            className={`py-2 px-1 rounded-xl text-xs font-black border ${header.color}`}
          >
            <span className="hidden sm:inline">{header.name}</span>
            <span className="sm:hidden">{header.short}</span>
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((cell, idx) => {
          const hasEvents = cell.events.length > 0;
          return (
            <div
              key={idx}
              onClick={() => {
                if (hasEvents) handleDayClick(cell);
              }}
              className={`min-h-[85px] sm:min-h-[105px] lg:min-h-[125px] rounded-2xl p-1.5 sm:p-2 border transition-all flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/50 border-slate-100 text-slate-300 opacity-60'
                  : cell.isToday
                  ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
                  : hasEvents
                  ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 hover:shadow-sm cursor-pointer'
                  : cell.isWeekend
                  ? 'bg-slate-50/80 border-slate-200/80 text-slate-600'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm font-black ${
                    cell.isToday
                      ? 'w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs'
                      : !cell.isCurrentMonth
                      ? 'text-slate-300'
                      : cell.isWeekend
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Desktop view event counter pill */}
                {hasEvents && (
                  <span className="hidden lg:inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                    {cell.events.length} งาน
                  </span>
                )}
              </div>

              {/* Mobile & Tablet Mode (< lg): แสดงข้อมูลในช่องวันที่ที่มีรายการจำนวนเป็น ตัวเลข */}
              <div className="lg:hidden flex-1 flex flex-col items-center justify-center my-auto py-1">
                {hasEvents ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(cell);
                    }}
                    className="min-w-[28px] h-7 sm:min-w-[34px] sm:h-8 px-1.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer ring-2 ring-emerald-200"
                    title={`${cell.events.length} รายการกิจกรรม (แตะเพื่อดูรายละเอียด)`}
                  >
                    {cell.events.length}
                  </button>
                ) : (
                  <span className="text-slate-300 text-[11px]">-</span>
                )}
              </div>

              {/* Desktop Mode (>= lg): Detailed activity items list */}
              <div className="hidden lg:block space-y-1 mt-1 flex-1 overflow-y-auto max-h-[80px]">
                {cell.events.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectActivity(act);
                    }}
                    className="w-full text-left p-1.5 rounded-lg bg-white hover:bg-emerald-100/80 border border-emerald-300 shadow-2xs transition-all cursor-pointer group"
                  >
                    <div className="text-[11px] font-bold text-emerald-950 truncate flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                      <span className="truncate group-hover:text-emerald-700">{act.title}</span>
                    </div>
                    <div className="text-[9px] text-emerald-800/80 font-medium truncate flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span>{act.startTime || act.timeRange}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog for selecting an activity when a day has multiple events on Mobile/Tablet */}
      {selectedDayEvents && (
        <div 
          className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 border border-emerald-200 shadow-2xl space-y-3.5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  รายการกิจกรรมประจำวัน
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDayEvents.dayOfWeek ? `${selectedDayEvents.dayOfWeek} • ` : ''}
                  {selectedDayEvents.dateStr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selectedDayEvents.events.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    setSelectedDayEvents(null);
                    onSelectActivity(act);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200/90 transition-all cursor-pointer group"
                >
                  <div className="text-xs font-black text-emerald-950 group-hover:text-emerald-800">
                    {act.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-emerald-800/80 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      {act.startTime || act.timeRange}
                    </span>
                    {act.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
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
