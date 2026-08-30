import React, { useState, useEffect, useMemo } from 'react';
import { LaundryOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeDate } from '../services/googleSheetSyncService';
import { getDepartmentColor, getGarmentColor } from '../utils/laundryColorHelper';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Waves, 
  CheckCircle2, 
  Building2, 
  Clock, 
  Package, 
  X,
  Tag,
  FileSpreadsheet,
  Filter,
  Sparkles
} from 'lucide-react';

interface LaundryCalendarViewProps {
  orders: LaundryOrder[];
  onSelectOrder: (order: LaundryOrder) => void;
  onOpenCreateOrder?: () => void;
  onToggleStage?: (e: React.MouseEvent, order: LaundryOrder) => void;
  onDeleteRequest?: (order: LaundryOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
}

/**
 * Extracts { year, month (0-indexed), day } from a LaundryOrder
 */
export function extractOrderDate(order: LaundryOrder): { year: number; month: number; day: number } | null {
  if (!order) return null;

  // 1. If order has explicit orderDate in YYYY-MM-DD or DD/MM/YYYY
  if (order.orderDate) {
    if (order.orderDate.includes('-')) {
      const parts = order.orderDate.split('-');
      if (parts.length === 3) {
        let y = parseInt(parts[0], 10);
        if (y > 2400) y -= 543;
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return { year: y, month: m, day: d };
        }
      }
    } else if (order.orderDate.includes('/')) {
      const parts = order.orderDate.split('/');
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (y > 2400) y -= 543;
        else if (y < 100) y += 2000;
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return { year: y, month: m, day: d };
        }
      }
    }
  }

  // 2. Try parsing from tracking code: LKB2 - YYMMDDSS
  if (order.trackingCode) {
    const codeDigits = order.trackingCode.replace(/\s+/g, '');
    const match = codeDigits.match(/LKB2-?(\d{2})(\d{2})(\d{2})/i);
    if (match) {
      const yy = parseInt(match[1], 10);
      const mm = parseInt(match[2], 10) - 1;
      const dd = parseInt(match[3], 10);
      const fullYear = yy < 50 ? 2000 + yy : (yy > 2400 ? yy - 543 : 1900 + yy);
      return { year: fullYear, month: mm, day: dd };
    }
  }

  // 3. Try parsing from ID: gsheet-YYYY-MM-DD-... or gsheet-DD-MM-YYYY
  if (order.id) {
    const match = order.id.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      let y = parseInt(match[1], 10);
      if (y > 2400) y -= 543;
      return {
        year: y,
        month: parseInt(match[2], 10) - 1,
        day: parseInt(match[3], 10),
      };
    }
  }

  // 4. Try parsing from receivedAt string using normalizeDate
  if (order.receivedAt) {
    const normalized = normalizeDate(undefined, order.receivedAt);
    if (normalized) {
      const parts = normalized.split('-');
      if (parts.length === 3) {
        let y = parseInt(parts[0], 10);
        if (y > 2400) y -= 543;
        return {
          year: y,
          month: parseInt(parts[1], 10) - 1,
          day: parseInt(parts[2], 10),
        };
      }
    }
  }

  // 5. Try parsing from notes if it contains date pattern
  if (order.notes) {
    const normalized = normalizeDate(undefined, order.notes);
    if (normalized) {
      const parts = normalized.split('-');
      if (parts.length === 3) {
        let y = parseInt(parts[0], 10);
        if (y > 2400) y -= 543;
        return {
          year: y,
          month: parseInt(parts[1], 10) - 1,
          day: parseInt(parts[2], 10),
        };
      }
    }
  }

  return null;
}

export const LaundryCalendarView: React.FC<LaundryCalendarViewProps> = ({
  orders,
  onSelectOrder,
}) => {
  const { language } = useLanguage();
  
  // Find initial date from orders (e.g. latest order date) or current date
  const latestOrderDate = useMemo(() => {
    let latest: { year: number; month: number; day: number } | null = null;
    let maxTime = 0;
    for (const order of orders) {
      const parsed = extractOrderDate(order);
      if (parsed) {
        const time = new Date(parsed.year, parsed.month, parsed.day).getTime();
        if (time > maxTime) {
          maxTime = time;
          latest = parsed;
        }
      }
    }
    return latest;
  }, [orders]);

  const [currentDate, setCurrentDate] = useState(() => {
    if (latestOrderDate) {
      return new Date(latestOrderDate.year, latestOrderDate.month, 1);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (latestOrderDate) {
      return latestOrderDate.day;
    }
    return new Date().getDate();
  });

  // Sync to latest order date if calendar starts with 0 orders in the viewed month but orders exist in other months
  useEffect(() => {
    if (latestOrderDate) {
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const hasOrdersInCurrentView = orders.some(o => {
        const p = extractOrderDate(o);
        return p && p.year === currentYear && p.month === currentMonth;
      });
      if (!hasOrdersInCurrentView) {
        setCurrentDate(new Date(latestOrderDate.year, latestOrderDate.month, 1));
        setSelectedDay(latestOrderDate.day);
      }
    }
  }, [orders, latestOrderDate]);

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

  const goToTodayOrLatest = () => {
    if (latestOrderDate) {
      setCurrentDate(new Date(latestOrderDate.year, latestOrderDate.month, 1));
      setSelectedDay(latestOrderDate.day);
    } else {
      const today = new Date();
      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
      setSelectedDay(today.getDate());
    }
  };

  // Get orders that strictly belong to the specified day in the currently viewed month & year
  const getOrdersForDay = (day: number) => {
    return orders.filter((order) => {
      const parsed = extractOrderDate(order);
      if (!parsed) return false;
      return parsed.year === year && parsed.month === month && parsed.day === day;
    });
  };

  const handleSelectDay = (dayNum: number) => {
    setSelectedDay(dayNum);
    setShowDayModal(true);
  };

  // List of all days in the current month that have orders
  const daysWithOrders = useMemo(() => {
    const dayMap = new Map<number, number>();
    orders.forEach((order) => {
      const parsed = extractOrderDate(order);
      if (parsed && parsed.year === year && parsed.month === month) {
        dayMap.set(parsed.day, (dayMap.get(parsed.day) || 0) + 1);
      }
    });
    return Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [orders, year, month]);

  const totalMonthOrders = useMemo(() => {
    return daysWithOrders.reduce((sum, [, count]) => sum + count, 0);
  }, [daysWithOrders]);

  const selectedDayOrders = selectedDay ? getOrdersForDay(selectedDay) : [];
  const selectedDayWashingCount = selectedDayOrders.filter((o) => o.stage !== 'ready' && o.stage !== 'delivered').length;
  const selectedDayReadyCount = selectedDayOrders.filter((o) => o.stage === 'ready' || o.stage === 'delivered').length;
  const selectedDayTotalPieces = selectedDayOrders.reduce((sum, o) => sum + o.items.reduce((isum, i) => isum + i.quantity, 0), 0);

  const realToday = new Date();
  const isCurrentMonthReal = realToday.getFullYear() === year && realToday.getMonth() === month;

  return (
    <div className="space-y-4">
      {/* Calendar Header / Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#002045] text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5 text-[#66affe]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#002045]">
                {language === 'th' 
                  ? `${monthNamesTh[month]} ${year + 543}` 
                  : `${monthNamesEn[month]} ${year}`}
              </h2>
              {totalMonthOrders > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0061a5] border border-blue-200">
                  {totalMonthOrders} {language === 'th' ? 'รายการในเดือนนี้' : 'orders this month'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'th' 
                ? `แสดงข้อมูลผ้าทุกวันในเดือน • แตะที่วันที่เพื่อดูรายการฉบับเต็ม` 
                : `Showing laundry records across all days • Click any day to inspect details`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToTodayOrLatest}
            className="px-3 py-1.5 bg-[#f3f3f4] hover:bg-[#e2e8f0] text-[#002045] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'th' ? 'วันที่มีข้อมูลล่าสุด' : 'Latest Date'}</span>
          </button>

          <div className="flex items-center bg-[#f3f3f4] rounded-lg p-0.5 border border-[#e2e8f0]">
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
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-[#f8fafc] border-b border-[#e2e8f0] text-center text-xs font-bold text-[#002045] py-2.5">
          {(language === 'th' ? daysOfWeekTh : daysOfWeekEn).map((d, i) => (
            <div key={i} className={i === 0 || i === 6 ? 'text-[#ba1a1a]' : ''}>
              <span className="hidden md:inline">{d}</span>
              <span className="md:hidden">{language === 'th' ? shortDaysOfWeekTh[i] : shortDaysOfWeekEn[i]}</span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#e2e8f0]">
          {/* Previous Month trailing days */}
          {Array.from({ length: firstDayIndex }).map((_, i) => {
            const prevDayNum = daysInPrevMonth - firstDayIndex + i + 1;
            return (
              <div key={`prev-${i}`} className="min-h-[64px] sm:min-h-[110px] p-1 sm:p-2 bg-[#fafafa]/60 text-[#c4c6cf] flex flex-col items-center sm:items-start select-none">
                <span className="text-xs font-medium">{prevDayNum}</span>
              </div>
            );
          })}

          {/* Current Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = isCurrentMonthReal && realToday.getDate() === dayNum;
            const isSelected = selectedDay === dayNum;
            const dayOrders = getOrdersForDay(dayNum);

            const washingCount = dayOrders.filter((o) => o.stage !== 'ready' && o.stage !== 'delivered').length;
            const readyCount = dayOrders.filter((o) => o.stage === 'ready' || o.stage === 'delivered').length;
            const totalPiecesInDay = dayOrders.reduce((sum, o) => sum + o.items.reduce((isum, item) => isum + item.quantity, 0), 0);

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => handleSelectDay(dayNum)}
                className={`min-h-[64px] sm:min-h-[110px] p-1 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 ring-2 ring-[#0061a5] ring-inset z-10'
                    : dayOrders.length > 0
                    ? 'bg-white hover:bg-blue-50/40'
                    : 'bg-white/60 hover:bg-slate-50'
                } ${isToday ? 'bg-amber-50/40' : ''}`}
              >
                {/* Header row for Date & Counts */}
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1">
                  {/* Date Number */}
                  <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-bold ${
                    isToday
                      ? 'bg-[#ba1a1a] text-white shadow-xs'
                      : isSelected
                      ? 'bg-[#0061a5] text-white'
                      : dayOrders.length > 0
                      ? 'text-[#002045] font-extrabold'
                      : 'text-[#1a1c1c]'
                  }`}>
                    {dayNum}
                  </span>

                  {/* Quantity Number Indicator */}
                  {dayOrders.length > 0 && (
                    <>
                      {/* Mobile View: Displayed BELOW date */}
                      <div className="sm:hidden flex flex-col items-center mt-0.5">
                        <span 
                          className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-md text-[9.5px] font-black bg-[#002045] text-white shadow-2xs leading-none"
                          title={`${dayOrders.length} ${language === 'th' ? 'รายการ (แตะเพื่อดูแบบป็อปอัพ)' : 'orders (tap to view popup)'}`}
                        >
                          {dayOrders.length}
                        </span>
                      </div>

                      {/* Desktop View: Show count pill with label on right */}
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#002045] text-white shadow-2xs">
                        <span>{dayOrders.length}</span>
                        <span className="text-[9px] font-normal opacity-80">{language === 'th' ? 'รายการ' : 'ord'}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Day Content Badges - Desktop Only */}
                <div className="hidden sm:block mt-1 space-y-1 overflow-hidden">
                  {dayOrders.slice(0, 2).map((order) => {
                    const isWashing = order.stage !== 'ready' && order.stage !== 'delivered';
                    const garmentName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                                        order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'Linen');
                    return (
                      <div
                        key={order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center justify-between gap-1 border transition-colors ${
                          isWashing
                            ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={`${order.trackingCode} - ${order.customerRoomOrDept || ''} (${garmentName})`}
                      >
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          {isWashing ? (
                            <Waves className="w-2.5 h-2.5 shrink-0 text-amber-600 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                          )}
                          <span className="truncate font-bold">{order.customerRoomOrDept || order.trackingCode}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 shrink-0">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} ชิ้น
                        </span>
                      </div>
                    );
                  })}

                  {dayOrders.length > 2 && (
                    <div className="text-[10px] text-[#0061a5] font-bold pl-1">
                      +{dayOrders.length - 2} {language === 'th' ? 'รายการเพิ่มเติม' : 'more'}
                    </div>
                  )}
                </div>

                {/* Summary dots & pieces */}
                <div className="flex items-center justify-between gap-1 mt-0.5 sm:mt-1 pt-0.5 sm:pt-1 border-t border-slate-100 text-[9px] text-slate-400">
                  <div className="flex items-center gap-1">
                    {washingCount > 0 && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 inline-block" title={`${washingCount} กำลังซัก`} />
                    )}
                    {readyCount > 0 && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 inline-block" title={`${readyCount} ซักเสร็จ`} />
                    )}
                    {dayOrders.length === 0 && (
                      <span className="w-1.5 h-1.5 opacity-0 inline-block" />
                    )}
                  </div>
                  {dayOrders.length > 0 && (
                    <span className="hidden sm:inline text-[9.5px] font-semibold text-slate-600">
                      {totalPiecesInDay} ชิ้น
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Next Month leading days to fill 35 or 42 grid slots */}
          {Array.from({
            length: (7 - ((firstDayIndex + daysInMonth) % 7)) % 7,
          }).map((_, i) => (
            <div key={`next-${i}`} className="min-h-[64px] sm:min-h-[110px] p-1 sm:p-2 bg-[#fafafa]/60 text-[#c4c6cf] flex flex-col items-center sm:items-start select-none">
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
            className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#002045] to-[#003b70] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-inner">
                  {selectedDay}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                      {language === 'th' 
                        ? `รายการผ้าประจำวันที่ ${selectedDay} ${monthNamesTh[month]} ${year + 543}` 
                        : `Laundry Orders for ${selectedDay} ${monthNamesEn[month]} ${year}`}
                    </h3>
                  </div>
                  
                  {/* Summary badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    <span className="bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      {selectedDayOrders.length} {language === 'th' ? 'รายการทั้งหมด' : 'total orders'}
                    </span>
                    {selectedDayOrders.length > 0 && (
                      <>
                        <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Waves className="w-3 h-3 text-amber-300" />
                          {selectedDayWashingCount} {language === 'th' ? 'กำลังซัก' : 'washing'}
                        </span>
                        <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                          {selectedDayReadyCount} {language === 'th' ? 'เสร็จแล้ว' : 'ready'}
                        </span>
                        <span className="bg-blue-400/20 text-blue-100 border border-blue-300/30 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Package className="w-3 h-3 text-blue-200" />
                          {selectedDayTotalPieces} {language === 'th' ? 'ชิ้นรวม' : 'pcs total'}
                        </span>
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
                title={language === 'th' ? 'ปิด' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 max-h-[62vh] overflow-y-auto bg-[#f8fafc]">
              {selectedDayOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-sm text-[#002045]">
                    {language === 'th' ? 'ไม่มีรายการผ้าในวันที่เลือก' : 'No laundry orders for this date.'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'th' 
                      ? 'ท่านสามารถดูรายการในวันอื่นๆ ที่มีเครื่องหมายแจ้งเตือนบนปฏิทิน' 
                      : 'You can check other dates highlighted on the calendar.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {selectedDayOrders.map((order) => {
                    const totalItemQty = order.items.reduce((s, i) => s + i.quantity, 0);
                    const isReady = order.stage === 'ready' || order.stage === 'delivered';
                    const isSheetOrder = order.id.startsWith('gsheet-');
                    const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                                           order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
                    const deptStyle = getDepartmentColor(order.customerRoomOrDept);
                    const garmentStyle = getGarmentColor(garmentTypeName);
                    
                    return (
                      <div
                        key={order.id}
                        onClick={() => {
                          setShowDayModal(false);
                          onSelectOrder(order);
                        }}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#0061a5] hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                      >
                        <div>
                          {/* Top Row: Code & Sheet Badge & Status */}
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#002045] bg-[#f3f3f4] px-2 py-0.5 rounded-md border border-slate-200">
                                {order.trackingCode}
                              </span>
                              {isSheetOrder && (
                                <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <FileSpreadsheet className="w-2.5 h-2.5" />
                                  Sheet
                                </span>
                              )}
                            </div>
                            
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 select-none ${
                                isReady
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {isReady ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{language === 'th' ? 'เสร็จแล้ว' : 'Ready'}</span>
                                </>
                              ) : (
                                <>
                                  <Waves className="w-3 h-3 text-amber-600 animate-spin shrink-0" />
                                  <span>{language === 'th' ? 'กำลังซัก' : 'Washing'}</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Department with distinct color badge */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${deptStyle.pill}`}>
                              <Building2 className={`w-3.5 h-3.5 shrink-0 ${deptStyle.icon}`} />
                              <h4 className="font-extrabold text-sm leading-tight">
                                {order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General Intake')}
                              </h4>
                            </div>
                          </div>

                          {/* Garment Type Badge with distinct color */}
                          <div className="mt-2.5 flex items-center gap-1.5">
                            <span className={`text-[11px] font-bold border px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${garmentStyle.pill}`}>
                              <Tag className={`w-3 h-3 ${garmentStyle.icon}`} />
                              {garmentTypeName}
                            </span>
                          </div>

                          {/* Submitter */}
                          <p className="text-xs text-[#74777f] mt-2">
                            {language === 'th' ? 'ผู้บันทึก: ' : 'Submitter: '}
                            <span className="text-[#1a1c1c] font-semibold">{order.customerName}</span>
                          </p>
                        </div>

                        {/* Card Bottom: Qty & Est Time / View Details */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block">{language === 'th' ? 'จำนวนผ้า' : 'Total Pieces'}</span>
                            <span className="font-extrabold text-[#002045] text-sm">{totalItemQty} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'ชิ้น' : 'pcs'}</span></span>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block">{language === 'th' ? 'เวลา' : 'Time'}</span>
                            <span className="font-semibold text-slate-700 text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#0061a5]" />
                              {order.estimatedCompletion || '-'}
                            </span>
                          </div>
                        </div>

                        {/* View details button hint */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-xs font-bold text-[#0061a5] group-hover:text-[#004d84]">
                          <span>{language === 'th' ? 'แตะเพื่อดูรายละเอียด' : 'View Full Details'}</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 hidden sm:block">
                {language === 'th' 
                  ? '💡 คลิกที่รายการผ้าใดๆ เพื่อเปิดดูข้อมูลประวัติและสถานะฉบับสมบูรณ์' 
                  : '💡 Click any laundry card to inspect complete timeline and details'}
              </p>
              <button
                type="button"
                onClick={() => setShowDayModal(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer ml-auto"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


