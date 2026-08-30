import React, { useState, useEffect, useMemo } from 'react';
import { MeetingRoomBooking } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  DoorOpen, 
  Clock, 
  Users, 
  Building2, 
  Phone, 
  X, 
  Sparkles,
  Layers
} from 'lucide-react';

interface MeetingRoomCalendarViewProps {
  bookings: MeetingRoomBooking[];
  onSelectBooking: (booking: MeetingRoomBooking) => void;
}

export function extractBookingDate(booking: MeetingRoomBooking): { year: number; month: number; day: number } | null {
  if (!booking.bookingDate) return null;
  const clean = booking.bookingDate.trim();
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

export const MeetingRoomCalendarView: React.FC<MeetingRoomCalendarViewProps> = ({
  bookings,
  onSelectBooking,
}) => {
  const { language } = useLanguage();
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<'all' | 'TPM 1' | 'TPM 2'>('all');

  // Filter bookings by room if selected
  const activeBookings = useMemo(() => {
    if (selectedRoomFilter === 'all') return bookings;
    return bookings.filter(b => b.room.toUpperCase().includes(selectedRoomFilter));
  }, [bookings, selectedRoomFilter]);

  // Default calendar view to current month (เดือนปัจจุบัน)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    return new Date().getDate();
  });

  const [showDayModal, setShowDayModal] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const enMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeekTh = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const daysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  // Map bookings to day numbers
  const bookingsByDay = useMemo(() => {
    const map: Record<number, MeetingRoomBooking[]> = {};
    activeBookings.forEach((b) => {
      const parsed = extractBookingDate(b);
      if (parsed && parsed.year === year && parsed.month === month) {
        if (!map[parsed.day]) {
          map[parsed.day] = [];
        }
        map[parsed.day].push(b);
      }
    });

    // Sort bookings within day by start time
    Object.keys(map).forEach((dayStr) => {
      const d = parseInt(dayStr, 10);
      map[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  }, [activeBookings, year, month]);

  // Selected Day Bookings
  const selectedDayBookings = useMemo(() => {
    if (selectedDay === null) return [];
    return bookingsByDay[selectedDay] || [];
  }, [bookingsByDay, selectedDay]);

  const monthTitle = language === 'th'
    ? `${thaiMonths[month]} ${year + 543}`
    : `${enMonths[month]} ${year}`;

  const isToday = (dayNum: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;
  };

  return (
    <div className="space-y-6">
      {/* Calendar Control Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>{monthTitle}</span>
              <span className="text-xs font-normal text-slate-500 font-mono">
                ({(Object.values(bookingsByDay) as MeetingRoomBooking[][]).reduce((acc, curr) => acc + curr.length, 0)} {language === 'th' ? 'รายการเดือนนี้' : 'bookings'})
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'th' ? 'ตารางการใช้ห้องประชุม TPM 1 และ TPM 2' : 'Meeting Room TPM 1 & TPM 2 Schedule'}
            </p>
          </div>
        </div>

        {/* Room Filter & Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Room Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRoomFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRoomFilter === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'ทุกห้อง' : 'All Rooms'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoomFilter('TPM 1')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRoomFilter === 'TPM 1'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-blue-700 hover:text-blue-900'
              }`}
            >
              TPM 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoomFilter('TPM 2')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedRoomFilter === 'TPM 2'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-purple-700 hover:text-purple-900'
              }`}
            >
              TPM 2
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs cursor-pointer"
          >
            {language === 'th' ? 'วันนี้' : 'Today'}
          </button>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar on Left (7 cols), Selected Day Schedule on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid Container (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {(language === 'th' ? daysOfWeekTh : daysOfWeekEn).map((d, idx) => (
              <div
                key={d}
                className={`py-2 text-xs font-bold ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-600'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Prev month placeholder days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const prevDayNum = totalDaysInPrevMonth - firstDayIndex + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="min-h-[54px] sm:min-h-[64px] lg:min-h-[88px] p-1.5 rounded-xl bg-slate-50/50 border border-transparent text-slate-300 text-xs flex flex-col justify-between select-none"
                >
                  <span className="font-medium text-[11px]">{prevDayNum}</span>
                </div>
              );
            })}

            {/* Current Month Active Days */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayBookings = bookingsByDay[dayNum] || [];
              const isSelected = selectedDay === dayNum;
              const isCurrentDay = isToday(dayNum);

              const tpm1Count = dayBookings.filter(b => b.room.toUpperCase().includes('TPM 1')).length;
              const tpm2Count = dayBookings.filter(b => b.room.toUpperCase().includes('TPM 2')).length;

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => {
                    setSelectedDay(dayNum);
                    if (window.innerWidth < 1024 && dayBookings.length > 0) {
                      setShowDayModal(true);
                    }
                  }}
                  className={`min-h-[54px] sm:min-h-[64px] lg:min-h-[88px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-xs'
                      : isCurrentDay
                      ? 'bg-amber-50/40 border-amber-300 hover:bg-slate-50'
                      : dayBookings.length > 0
                      ? 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                      : 'bg-white hover:bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-md px-1.5 py-0.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isCurrentDay
                          ? 'bg-amber-500 text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 font-mono hidden lg:inline">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>

                  {/* Mode 1: Tablet & Mobile - แสดงเฉพาะจำนวนตัวเลข (Numbers Only) */}
                  {dayBookings.length > 0 && (
                    <div className="lg:hidden flex items-center justify-center gap-1 mt-1 flex-wrap">
                      {tpm1Count > 0 && (
                        <span 
                          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] font-mono shadow-2xs"
                          title={`TPM 1: ${tpm1Count}`}
                        >
                          {tpm1Count}
                        </span>
                      )}
                      {tpm2Count > 0 && (
                        <span 
                          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] font-mono shadow-2xs"
                          title={`TPM 2: ${tpm2Count}`}
                        >
                          {tpm2Count}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Desktop - Micro event indicators with full text details */}
                  <div className="hidden lg:block space-y-1 mt-1 overflow-hidden">
                    {dayBookings.slice(0, 2).map((booking) => {
                      const isT1 = booking.room.toUpperCase().includes('TPM 1');
                      return (
                        <div
                          key={booking.id}
                          className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded truncate border leading-tight ${
                            isT1
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                          title={`${booking.room} (${booking.startTime}-${booking.endTime}): ${booking.subject}`}
                        >
                          <span className="font-bold mr-0.5">{booking.room}:</span>
                          <span>{booking.subject}</span>
                        </div>
                      );
                    })}

                    {dayBookings.length > 2 && (
                      <div className="text-[9px] text-slate-500 font-bold px-1 text-center">
                        +{dayBookings.length - 2} {language === 'th' ? 'รายการ' : 'more'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs text-slate-600">
            <span className="font-bold">{language === 'th' ? 'สัญลักษณ์ห้อง:' : 'Legend:'}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
              <span>ห้อง TPM 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
              <span>ห้อง TPM 2</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto text-[11px] text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-500 inline mr-1" />
              <span>{language === 'th' ? 'คลิกวันที่เพื่อดูรายละเอียด' : 'Click day to view details'}</span>
            </div>
          </div>
        </div>

        {/* Selected Day Schedule Side Panel (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'th' ? 'กำหนดการรายวัน' : 'Daily Schedule'}
              </span>
              <h3 className="text-base font-black text-slate-800">
                {selectedDay !== null
                  ? `${selectedDay} ${thaiMonths[month]} ${year + 543}`
                  : language === 'th'
                  ? 'กรุณาเลือกวันที่'
                  : 'Select a date'}
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200">
              {selectedDayBookings.length} {language === 'th' ? 'รายการ' : 'bookings'}
            </span>
          </div>

          {/* Booking list for selected day */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-1">
            {selectedDayBookings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                <DoorOpen className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
                <p className="text-xs font-medium text-slate-600">
                  {language === 'th' ? 'ไม่มีการจองห้องประชุมในวันนี้' : 'No bookings for this date'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'th' ? 'ห้องประชุมว่างตลอดทั้งวัน' : 'Rooms are available all day'}
                </p>
              </div>
            ) : (
              selectedDayBookings.map((booking) => {
                const isT1 = booking.room.toUpperCase().includes('TPM 1');
                return (
                  <div
                    key={booking.id}
                    onClick={() => onSelectBooking(booking)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer shadow-2xs space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                        isT1 
                          ? 'bg-blue-100 text-blue-900 border-blue-300' 
                          : 'bg-purple-100 text-purple-900 border-purple-300'
                      }`}>
                        ห้อง {booking.room}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{booking.startTime} - {booking.endTime} น.</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
                      {booking.subject}
                    </h4>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[120px]">{booking.department}</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{booking.attendeesCount} คน</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile Day Schedule Modal */}
      {showDayModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          onClick={() => setShowDayModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {selectedDay} {thaiMonths[month]} {year + 543}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedDayBookings.length} {language === 'th' ? 'รายการจอง' : 'bookings'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDayModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => {
                    setShowDayModal(false);
                    onSelectBooking(booking);
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">ห้อง {booking.room}</span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {booking.startTime} - {booking.endTime} น.
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">{booking.subject}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{booking.department}</span>
                    <span>{booking.attendeesCount} คน</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
