import React, { useState, useEffect } from 'react';
import { MaintenanceTicket, MaintenanceStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  User, 
  X, 
  Layers
} from 'lucide-react';

interface MaintenanceCalendarViewProps {
  tickets: MaintenanceTicket[];
  onSelectTicket: (ticket: MaintenanceTicket) => void;
}

/**
 * Extracts { year, month (0-indexed), day } from a MaintenanceTicket
 */
export function extractTicketDate(ticket: MaintenanceTicket): { year: number; month: number; day: number } | null {
  // 1. Check reportedDate (formats: DD-MM-YY, DD/MM/YYYY, YYYY-MM-DD, etc.)
  if (ticket.reportedDate && ticket.reportedDate !== '-') {
    const clean = ticket.reportedDate.trim();
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

      // Format: DD-MM-YY or DD-MM-YYYY
      let year = p2;
      if (year < 100) {
        year += 2000;
      } else if (year > 2400) {
        year -= 543;
      }
      return { year, month: p1 - 1, day: p0 };
    }
  }

  // 2. Try actionDate
  if (ticket.actionDate && ticket.actionDate !== '-') {
    const clean = ticket.actionDate.trim();
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      else if (year > 2400) year -= 543;
      return { year, month: p1 - 1, day: p0 };
    }
  }

  return null;
}

export const MaintenanceCalendarView: React.FC<MaintenanceCalendarViewProps> = ({
  tickets,
  onSelectTicket,
}) => {
  const { language } = useLanguage();

  // Initialize date from tickets (e.g. latest sheet date August 2026) or fallback to current
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    for (const ticket of tickets) {
      const parsed = extractTicketDate(ticket);
      if (parsed) {
        return new Date(parsed.year, parsed.month, 1);
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    for (const ticket of tickets) {
      const parsed = extractTicketDate(ticket);
      if (parsed) {
        return parsed.day;
      }
    }
    return new Date().getDate();
  });

  const [showDayModal, setShowDayModal] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNamesTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeekTh = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const daysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const shortDaysOfWeekTh = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const shortDaysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    const ticketWithDate = tickets.find((t) => extractTicketDate(t) !== null);
    if (ticketWithDate) {
      const parsed = extractTicketDate(ticketWithDate)!;
      setCurrentDate(new Date(parsed.year, parsed.month, 1));
      setSelectedDay(parsed.day);
    } else {
      const today = new Date();
      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
      setSelectedDay(today.getDate());
    }
  };

  // Get tickets that strictly belong to the specified day in the currently viewed month & year
  const getTicketsForDay = (day: number) => {
    return tickets.filter((ticket) => {
      const parsed = extractTicketDate(ticket);
      if (!parsed) return false;
      return parsed.year === year && parsed.month === month && parsed.day === day;
    });
  };

  // Month-level tickets calculation
  const monthTickets = tickets.filter((ticket) => {
    const parsed = extractTicketDate(ticket);
    return parsed && parsed.year === year && parsed.month === month;
  });
  const monthNewCount = monthTickets.filter((t) => t.status === 'แจ้งใหม่').length;
  const monthInProgressCount = monthTickets.filter((t) => t.status === 'อยู่ระหว่างดำเนินการ').length;
  const monthCompletedCount = monthTickets.filter((t) => t.status === 'เสร็จแล้ว').length;

  const handleSelectDay = (dayNum: number) => {
    setSelectedDay(dayNum);
    setShowDayModal(true);
  };

  const selectedDayTickets = selectedDay ? getTicketsForDay(selectedDay) : [];
  const selectedDayNewCount = selectedDayTickets.filter((t) => t.status === 'แจ้งใหม่').length;
  const selectedDayInProgressCount = selectedDayTickets.filter((t) => t.status === 'อยู่ระหว่างดำเนินการ').length;
  const selectedDayCompletedCount = selectedDayTickets.filter((t) => t.status === 'เสร็จแล้ว').length;

  const realToday = new Date();
  const isCurrentMonthReal = realToday.getFullYear() === year && realToday.getMonth() === month;

  const getStatusPill = (status: MaintenanceStatus) => {
    switch (status) {
      case 'เสร็จแล้ว':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{status}</span>
          </span>
        );
      case 'อยู่ระหว่างดำเนินการ':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <Clock className="w-3 h-3 text-sky-600 animate-spin" />
            <span>{status}</span>
          </span>
        );
      case 'แจ้งใหม่':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header / Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002045] to-[#083366] text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#002045]">
              {language === 'th' 
                ? `${monthNamesTh[month]} ${year + 543}` 
                : `${monthNamesEn[month]} ${year}`}
            </h2>
          </div>
        </div>

        {/* Month summary & navigation controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {monthTickets.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 mr-1">
              <span className="font-bold text-slate-700">{monthTickets.length} {language === 'th' ? 'งาน' : 'jobs'}</span>
              {monthNewCount > 0 && (
                <span className="text-amber-700 font-semibold">• {monthNewCount} {language === 'th' ? 'ใหม่' : 'new'}</span>
              )}
              {monthInProgressCount > 0 && (
                <span className="text-sky-700 font-semibold">• {monthInProgressCount} {language === 'th' ? 'กำลังทำ' : 'active'}</span>
              )}
              {monthCompletedCount > 0 && (
                <span className="text-emerald-700 font-semibold">• {monthCompletedCount} {language === 'th' ? 'เสร็จ' : 'done'}</span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#002045] rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'th' ? 'วันที่ล่าสุด' : 'Latest Date'}
          </button>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-[#002045] hover:bg-white rounded-md transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-[#002045] hover:bg-white rounded-md transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-[#002045] py-2.5">
          {(language === 'th' ? daysOfWeekTh : daysOfWeekEn).map((d, i) => (
            <div key={i} className={i === 0 || i === 6 ? 'text-red-600' : ''}>
              <span className="hidden md:inline">{d}</span>
              <span className="md:hidden">{language === 'th' ? shortDaysOfWeekTh[i] : shortDaysOfWeekEn[i]}</span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {/* Previous Month trailing days */}
          {Array.from({ length: firstDayIndex }).map((_, i) => {
            const prevDayNum = daysInPrevMonth - firstDayIndex + i + 1;
            return (
              <div key={`prev-${i}`} className="min-h-[68px] sm:min-h-[115px] p-1 sm:p-2 bg-slate-50/50 text-slate-400 flex flex-col items-center sm:items-start">
                <span className="text-xs font-medium">{prevDayNum}</span>
              </div>
            );
          })}

          {/* Current Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = isCurrentMonthReal && realToday.getDate() === dayNum;
            const isSelected = selectedDay === dayNum;
            const dayTickets = getTicketsForDay(dayNum);

            const newCount = dayTickets.filter((t) => t.status === 'แจ้งใหม่').length;
            const inProgressCount = dayTickets.filter((t) => t.status === 'อยู่ระหว่างดำเนินการ').length;
            const completedCount = dayTickets.filter((t) => t.status === 'เสร็จแล้ว').length;

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => handleSelectDay(dayNum)}
                className={`min-h-[68px] sm:min-h-[115px] p-1 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-orange-50/80 ring-2 ring-orange-500 ring-inset z-10'
                    : 'hover:bg-slate-50'
                } ${isToday ? 'bg-amber-50/40' : ''}`}
              >
                {/* Header row for Date & Counts */}
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1">
                  {/* Date Number */}
                  <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-bold ${
                    isToday
                      ? 'bg-red-600 text-white shadow-xs'
                      : isSelected
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-800'
                  }`}>
                    {dayNum}
                  </span>

                  {/* Count indicator */}
                  {dayTickets.length > 0 && (
                    <>
                      {/* Mobile View */}
                      <div className="sm:hidden flex flex-col items-center mt-0.5">
                        <span 
                          className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-md text-[9.5px] font-black bg-[#002045] text-white shadow-2xs leading-none"
                          title={`${dayTickets.length} ${language === 'th' ? 'รายการ' : 'tickets'}`}
                        >
                          {dayTickets.length}
                        </span>
                      </div>

                      {/* Desktop View */}
                      <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#002045] text-white shadow-2xs">
                        {dayTickets.length} {language === 'th' ? 'งาน' : 'jobs'}
                      </span>
                    </>
                  )}
                </div>

                {/* Day Content Badges - Desktop Only */}
                <div className="hidden sm:block mt-1 space-y-1 overflow-hidden">
                  {dayTickets.slice(0, 2).map((ticket) => {
                    const isNew = ticket.status === 'แจ้งใหม่';
                    const isInProgress = ticket.status === 'อยู่ระหว่างดำเนินการ';
                    return (
                      <div
                        key={ticket.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTicket(ticket);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border transition-colors ${
                          isNew
                            ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                            : isInProgress
                            ? 'bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={`${ticket.workOrderNo || `ลำดับ #${ticket.seq}`} - ${ticket.department}: ${ticket.issueDetail}`}
                      >
                        {isNew ? (
                          <AlertCircle className="w-2.5 h-2.5 shrink-0 text-amber-600 animate-pulse" />
                        ) : isInProgress ? (
                          <Clock className="w-2.5 h-2.5 shrink-0 text-sky-600 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                        )}
                        <span className="truncate font-semibold">{ticket.workOrderNo || (language === 'th' ? `ลำดับ #${ticket.seq}` : `#${ticket.seq}`)}</span>
                      </div>
                    );
                  })}

                  {dayTickets.length > 2 && (
                    <div className="text-[10px] text-blue-700 font-bold pl-1">
                      +{dayTickets.length - 2} {language === 'th' ? 'รายการเพิ่มเติม' : 'more'}
                    </div>
                  )}
                </div>

                {/* Summary dots */}
                <div className="flex items-center justify-center sm:justify-start gap-1 mt-0.5 sm:mt-1 pt-0.5 sm:pt-1 border-t border-slate-100">
                  {newCount > 0 && (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500" title={`${newCount} แจ้งใหม่`} />
                  )}
                  {inProgressCount > 0 && (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500" title={`${inProgressCount} กำลังซ่อม`} />
                  )}
                  {completedCount > 0 && (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" title={`${completedCount} เสร็จแล้ว`} />
                  )}
                  {dayTickets.length === 0 && (
                    <span className="w-1.5 h-1.5 opacity-0" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Next Month leading days */}
          {Array.from({
            length: (7 - ((firstDayIndex + daysInMonth) % 7)) % 7,
          }).map((_, i) => (
            <div key={`next-${i}`} className="min-h-[68px] sm:min-h-[115px] p-1 sm:p-2 bg-slate-50/50 text-slate-400 flex flex-col items-center sm:items-start">
              <span className="text-xs font-medium">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pop-up Modal when clicking to view day data */}
      {showDayModal && selectedDay !== null && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setShowDayModal(false)}
        >
          <div 
            className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#002045] to-[#083366] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 font-black text-lg shrink-0 shadow-inner">
                  {selectedDay}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                      {language === 'th' 
                        ? `งานแจ้งซ่อมประจำวันที่ ${selectedDay} ${monthNamesTh[month]} ${year + 543}` 
                        : `Maintenance Tickets for ${selectedDay} ${monthNamesEn[month]} ${year}`}
                    </h3>
                  </div>
                  
                  {/* Summary badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    <span className="bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      {selectedDayTickets.length} {language === 'th' ? 'รายการทั้งหมด' : 'total jobs'}
                    </span>
                    {selectedDayTickets.length > 0 && (
                      <>
                        {selectedDayNewCount > 0 && (
                          <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-300" />
                            {selectedDayNewCount} {language === 'th' ? 'แจ้งใหม่' : 'new'}
                          </span>
                        )}
                        {selectedDayInProgressCount > 0 && (
                          <span className="bg-sky-400/20 text-sky-200 border border-sky-300/30 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-300" />
                            {selectedDayInProgressCount} {language === 'th' ? 'กำลังทำ' : 'in progress'}
                          </span>
                        )}
                        {selectedDayCompletedCount > 0 && (
                          <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                            {selectedDayCompletedCount} {language === 'th' ? 'เสร็จแล้ว' : 'completed'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowDayModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Tickets List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              {selectedDayTickets.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Wrench className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm font-semibold">
                    {language === 'th' ? 'ไม่มีงานแจ้งซ่อมในวันนี้' : 'No maintenance tickets recorded on this day'}
                  </p>
                </div>
              ) : (
                selectedDayTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setShowDayModal(false);
                      onSelectTicket(ticket);
                    }}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer bg-white group space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#002045] group-hover:text-orange-600 transition-colors">
                          {ticket.workOrderNo || (language === 'th' ? `ลำดับ #${ticket.seq}` : `#${ticket.seq}`)}
                        </span>
                      </div>
                      {getStatusPill(ticket.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg w-fit">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold">{ticket.department}</span>
                    </div>

                    <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
                      {ticket.issueDetail}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{language === 'th' ? 'ผู้แจ้ง:' : 'Requester:'} <strong className="text-slate-700">{ticket.requester}</strong></span>
                      </div>
                      {ticket.completedDate && (
                        <div className="text-emerald-700 font-semibold text-[11px]">
                          {language === 'th' ? 'เสร็จเมื่อ:' : 'Done:'} {ticket.completedDate}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDayModal(false)}
                className="px-5 py-2 bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
