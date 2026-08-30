import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Plane,
  Calendar as CalendarIcon,
  User,
  AlertCircle
} from 'lucide-react';
import { DailyWorkSchedule, WorkScheduleStatus } from '../../types';

interface WorkScheduleCalendarViewProps {
  schedules: DailyWorkSchedule[];
  onSelectSchedule: (schedule: DailyWorkSchedule) => void;
}

export const WorkScheduleCalendarView: React.FC<WorkScheduleCalendarViewProps> = ({
  schedules,
  onSelectSchedule
}) => {
  // Map dateStr (e.g. "1/8/2026", "2/8/2026") or standard ISO date to DailyWorkSchedule
  const scheduleMap = useMemo(() => {
    const map = new Map<string, DailyWorkSchedule>();
    schedules.forEach(s => {
      // Key by parsed day/month/year components
      const parts = s.dateStr.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        map.set(key, s);
      }
      // Also map by formatted or raw
      map.set(s.dateStr, s);
    });
    return map;
  }, [schedules]);

  // Determine available year and month, default to current date / current month
  const initialYearMonth = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const [currentYear, setCurrentYear] = useState<number>(initialYearMonth.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialYearMonth.month);

  // Month navigation
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

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dayNumber: number;
      isCurrentMonth: boolean;
      dateKey: string;
      schedule?: DailyWorkSchedule;
      isWeekend: boolean;
    }[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const key = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const schedule = scheduleMap.get(key) || scheduleMap.get(`${d}/${prevMonth + 1}/${prevYear}`);
      const dayOfWeek = new Date(prevYear, prevMonth, d).getDay();
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: key,
        schedule,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const schedule = scheduleMap.get(key) || scheduleMap.get(`${d}/${currentMonth + 1}/${currentYear}`);
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateKey: key,
        schedule,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const key = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const schedule = scheduleMap.get(key) || scheduleMap.get(`${d}/${nextMonth + 1}/${nextYear}`);
      const dayOfWeek = new Date(nextYear, nextMonth, d).getDay();
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: key,
        schedule,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    return days;
  }, [currentYear, currentMonth, scheduleMap]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
      {/* Calendar Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {monthNamesThai[currentMonth]} {currentYear + 543}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              (ค.ศ. {currentYear}) • ตารางเข้ากะและการปฏิบัติงานรายวัน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCurrentYear(now.getFullYear());
              setCurrentMonth(now.getMonth());
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            วันนี้
          </button>
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:shadow-xs transition-all cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:shadow-xs transition-all cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {weekDayHeaders.map((header, idx) => (
          <div
            key={idx}
            className={`py-2 px-1 rounded-xl border text-xs font-black ${header.color}`}
          >
            <span className="hidden sm:inline">{header.name}</span>
            <span className="sm:hidden">{header.short}</span>
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {calendarDays.map((cell, idx) => {
          const schedule = cell.schedule;
          const hasData = Boolean(schedule);
          const today = new Date();
          const isToday = cell.isCurrentMonth && 
            cell.dayNumber === today.getDate() && 
            currentMonth === today.getMonth() && 
            currentYear === today.getFullYear();

          return (
            <div
              key={idx}
              onClick={() => {
                if (schedule) onSelectSchedule(schedule);
              }}
              className={`min-h-[110px] sm:min-h-[135px] rounded-2xl p-2 sm:p-2.5 border transition-all flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/50 border-slate-100 opacity-40'
                  : isToday
                  ? 'bg-orange-50/40 border-orange-400 ring-2 ring-orange-300 shadow-xs'
                  : hasData
                  ? 'bg-white border-slate-200 hover:border-orange-400 hover:shadow-md cursor-pointer group'
                  : 'bg-slate-50/40 border-slate-100'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm font-black w-6 h-6 rounded-lg flex items-center justify-center ${
                    isToday
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : cell.isWeekend
                      ? 'text-rose-600 bg-rose-50'
                      : 'text-slate-800'
                  } ${schedule && !isToday ? 'group-hover:bg-orange-600 group-hover:text-white transition-colors' : ''}`}
                >
                  {cell.dayNumber}
                </span>

                <div className="flex items-center gap-1">
                  {isToday && (
                    <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-800 text-[10px] font-extrabold border border-orange-200">
                      วันนี้
                    </span>
                  )}
                  {schedule && schedule.totalLeaves > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`มีคนลา ${schedule.totalLeaves} คน`} />
                  )}
                </div>
              </div>

              {/* Day Content / Badges */}
              {schedule ? (
                <div className="my-auto pt-1">
                  {/* Tablet & Mobile Mode (< lg): Display numbers only */}
                  <div className="lg:hidden flex flex-wrap items-center justify-center gap-1">
                    <span
                      className="inline-flex items-center justify-center min-w-[22px] h-5 sm:h-6 px-1.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[11px] sm:text-xs shadow-2xs"
                      title={`เข้างาน ${schedule.totalOnDuty} คน`}
                    >
                      {schedule.totalOnDuty}
                    </span>
                    {schedule.totalLeaves > 0 && (
                      <span
                        className="inline-flex items-center justify-center min-w-[22px] h-5 sm:h-6 px-1.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-black text-[11px] sm:text-xs shadow-2xs"
                        title={`ลา / หยุด ${schedule.totalLeaves} คน`}
                      >
                        {schedule.totalLeaves}
                      </span>
                    )}
                  </div>

                  {/* Desktop Mode (>= lg): Full detailed badges */}
                  <div className="hidden lg:block space-y-1">
                    {/* On-Duty Pill */}
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <Sun className="w-3 h-3 text-emerald-600 shrink-0" />
                        เข้างาน
                      </span>
                      <span className="font-extrabold">{schedule.totalOnDuty}</span>
                    </div>

                    {/* Leaves Pill if any */}
                    {schedule.totalLeaves > 0 && (
                      <div className="flex items-center justify-between px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                        <span className="flex items-center gap-1 truncate">
                          <Plane className="w-3 h-3 text-rose-600 shrink-0" />
                          ลา / หยุด
                        </span>
                        <span className="font-extrabold">{schedule.totalLeaves}</span>
                      </div>
                    )}

                    {/* Staff List Preview */}
                    <div className="space-y-0.5 pt-0.5">
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {schedule.onDutyEmployees.slice(0, 2).map(e => e.name.split(' ')[0]).join(', ')}
                        {schedule.onDutyEmployees.length > 2 && ` +${schedule.onDutyEmployees.length - 2}`}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-300">
                  -
                </div>
              )}

              {/* Bottom tag */}
              {schedule && (
                <div className="text-[9px] text-orange-600/80 font-bold opacity-0 group-hover:opacity-100 transition-opacity text-right">
                  คลิกดู ➔
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
