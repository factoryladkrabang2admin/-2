import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  PieChart, 
  BarChart3, 
  Shirt, 
  CheckCircle2, 
  Waves, 
  Package, 
  TrendingUp, 
  Building2, 
  Sparkles,
  Layers,
  Filter,
  Calendar,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Check
} from 'lucide-react';
import { LaundryOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getDepartmentColor, getGarmentColor } from '../utils/laundryColorHelper';

interface LaundryAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: LaundryOrder[];
  initialDateScope?: 'today' | 'current_month' | 'all' | 'custom';
  initialMonth?: string;
  initialDepartment?: string;
  initialStage?: 'all' | 'washing' | 'ready';
}

export const LaundryAnalyticsModal: React.FC<LaundryAnalyticsModalProps> = ({
  isOpen,
  onClose,
  orders,
  initialDateScope = 'today',
  initialMonth = 'current',
  initialDepartment = 'all',
  initialStage = 'all',
}) => {
  const { language } = useLanguage();
  const [hoveredTypeIndex, setHoveredTypeIndex] = useState<number | null>(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState<number | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'garments' | 'status' | 'departments'>('garments');

  // Filter states inside statistics modal
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filterDateScope, setFilterDateScope] = useState<'today' | 'current_month' | 'all' | 'custom'>(initialDateScope);
  const [filterMonth, setFilterMonth] = useState<string>(initialMonth);
  const [filterDepartment, setFilterDepartment] = useState<string>(initialDepartment);
  const [filterStage, setFilterStage] = useState<'all' | 'washing' | 'ready'>(initialStage);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Current Date & Month helpers
  const currentNow = new Date();
  const currentYear = currentNow.getFullYear();
  const currentMonth = currentNow.getMonth() + 1;
  const currentDay = currentNow.getDate();
  const currentYearMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

  const thaiMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const englishMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthDisplayName = language === 'th'
    ? `${thaiMonthNames[currentMonth - 1]} ${currentYear + 543}`
    : `${englishMonthNames[currentMonth - 1]} ${currentYear}`;
  const currentDayDisplayName = language === 'th'
    ? `${currentDay} ${thaiMonthNames[currentMonth - 1]} ${currentYear + 543}`
    : `${englishMonthNames[currentMonth - 1]} ${currentDay}, ${currentYear}`;

  // Helper to extract date YYYY-MM-DD from order
  const getOrderDateString = (order: LaundryOrder): string | null => {
    if (order.orderDate) {
      const match = order.orderDate.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (order.receivedAt) {
      const slashMatch = order.receivedAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (slashMatch) {
        let yr = parseInt(slashMatch[3], 10);
        if (yr > 2400) yr -= 543;
        else if (yr < 100) yr += 2000;
        const mm = slashMatch[2].padStart(2, '0');
        const dd = slashMatch[1].padStart(2, '0');
        return `${yr}-${mm}-${dd}`;
      }
      const matchISO = order.receivedAt.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (matchISO) return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
    }
    const matchCode = order.trackingCode.replace(/\s+/g, '').match(/LKB2-?(\d{2})(\d{2})(\d{2})/i);
    if (matchCode) {
      const yy = parseInt(matchCode[1], 10);
      const year = yy < 50 ? `20${matchCode[1]}` : (yy > 2400 ? `${yy - 543}` : `19${matchCode[1]}`);
      const month = matchCode[2];
      const day = matchCode[3];
      return `${year}-${month}-${day}`;
    }
    if (order.id) {
      const match = order.id.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (order.receivedAt && order.receivedAt.toLowerCase().includes('today')) {
      return new Date().toISOString().split('T')[0];
    }
    return null;
  };

  // Available departments
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    orders.forEach((o) => {
      if (o.customerRoomOrDept && o.customerRoomOrDept.trim()) {
        depts.add(o.customerRoomOrDept.trim());
      }
    });
    return Array.from(depts).sort();
  }, [orders]);

  // Available months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentYearMonthStr);
    orders.forEach((o) => {
      const d = getOrderDateString(o);
      if (d) monthsSet.add(d.substring(0, 7));
    });
    return Array.from(monthsSet).sort().reverse();
  }, [orders, currentYearMonthStr]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterDateScope !== 'today') count++;
    if (filterDepartment !== 'all') count++;
    if (filterStage !== 'all') count++;
    if (filterStartDate) count++;
    if (filterEndDate) count++;
    return count;
  }, [filterDateScope, filterDepartment, filterStage, filterStartDate, filterEndDate]);

  // Reset filters inside modal
  const handleResetFilters = () => {
    setFilterDateScope('today');
    setFilterMonth('current');
    setFilterDepartment('all');
    setFilterStage('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Dynamic filtered orders for statistics calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDateStr = getOrderDateString(order);

      // 1. Date Scope Filter
      if (filterStartDate || filterEndDate) {
        if (orderDateStr) {
          if (filterStartDate && orderDateStr < filterStartDate) return false;
          if (filterEndDate && orderDateStr > filterEndDate) return false;
        }
      } else if (filterDateScope === 'today') {
        if (orderDateStr && orderDateStr !== currentDateStr) return false;
      } else if (filterDateScope === 'current_month' || filterMonth === 'current') {
        const orderYearMonth = orderDateStr ? orderDateStr.substring(0, 7) : currentYearMonthStr;
        if (orderYearMonth !== currentYearMonthStr) return false;
      } else if (filterDateScope === 'all' || filterMonth === 'all') {
        // no date restriction
      } else if (filterMonth && filterMonth !== 'current' && filterMonth !== 'all') {
        const orderYearMonth = orderDateStr ? orderDateStr.substring(0, 7) : currentYearMonthStr;
        if (orderYearMonth !== filterMonth) return false;
      }

      // 2. Department Filter
      if (filterDepartment !== 'all') {
        if ((order.customerRoomOrDept || '') !== filterDepartment) return false;
      }

      // 3. Stage / Status Filter
      if (filterStage === 'washing') {
        if (order.stage === 'ready' || order.stage === 'delivered') return false;
      } else if (filterStage === 'ready') {
        if (order.stage !== 'ready' && order.stage !== 'delivered') return false;
      }

      return true;
    });
  }, [orders, filterDateScope, filterMonth, filterStartDate, filterEndDate, filterDepartment, filterStage, currentDateStr, currentYearMonthStr]);

  if (!isOpen) return null;

  // Key KPI calculations
  const totalOrders = filteredOrders.length;
  const inWashingCount = filteredOrders.filter((o) => o.stage !== 'ready' && o.stage !== 'delivered').length;
  const readyCount = filteredOrders.filter((o) => o.stage === 'ready' || o.stage === 'delivered').length;
  const totalPieces = filteredOrders.reduce((sum, o) => sum + o.items.reduce((isum, i) => isum + i.quantity, 0), 0);
  const readyPercentage = totalOrders > 0 ? Math.round((readyCount / totalOrders) * 100) : 0;
  const inWashingPercentage = totalOrders > 0 ? 100 - readyPercentage : 0;
  const avgPiecesPerOrder = totalOrders > 0 ? (totalPieces / totalOrders).toFixed(1) : '0';

  // 1. Garment Types Breakdown
  const garmentTypeStats: Record<string, number> = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      const name = item.name.trim() || (language === 'th' ? 'ผ้าทั่วไป' : 'General');
      garmentTypeStats[name] = (garmentTypeStats[name] || 0) + item.quantity;
    });
  });

  const sortedGarmentTypes = Object.entries(garmentTypeStats).sort((a, b) => b[1] - a[1]);
  const modernPalette = [
    '#0284c7', // Sky blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#6366f1', // Indigo
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#84cc16', // Lime
  ];

  // Donut 1 Math (Garments)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let garmentAccumulatedOffset = 0;

  const garmentSegments = sortedGarmentTypes.map(([name, count], index) => {
    const percentageVal = totalPieces > 0 ? count / totalPieces : 0;
    const strokeLength = percentageVal * circumference;
    const dashOffset = garmentAccumulatedOffset;
    garmentAccumulatedOffset += strokeLength;
    const color = getGarmentColor(name).hex || modernPalette[index % modernPalette.length];
    return {
      name,
      count,
      percentage: (percentageVal * 100).toFixed(1),
      strokeLength,
      dashOffset,
      color,
      index,
    };
  });

  const activeGarmentSegment = hoveredTypeIndex !== null ? garmentSegments[hoveredTypeIndex] : null;

  // 2. Department Volume Breakdown
  const deptStats: Record<string, { orders: number; pieces: number }> = {};
  filteredOrders.forEach((o) => {
    const dept = o.customerRoomOrDept?.trim() || (language === 'th' ? 'แผนกทั่วไป' : 'General');
    const pieces = o.items.reduce((s, i) => s + i.quantity, 0);
    if (!deptStats[dept]) {
      deptStats[dept] = { orders: 0, pieces: 0 };
    }
    deptStats[dept].orders += 1;
    deptStats[dept].pieces += pieces;
  });

  const sortedDepts = Object.entries(deptStats).sort((a, b) => b[1].pieces - a[1].pieces);
  let deptAccumulatedOffset = 0;
  const deptSegments = sortedDepts.map(([name, stat], index) => {
    const percentageVal = totalPieces > 0 ? stat.pieces / totalPieces : 0;
    const strokeLength = percentageVal * circumference;
    const dashOffset = deptAccumulatedOffset;
    deptAccumulatedOffset += strokeLength;
    const color = getDepartmentColor(name).hex || modernPalette[(index + 3) % modernPalette.length];
    return {
      name,
      orders: stat.orders,
      pieces: stat.pieces,
      percentage: (percentageVal * 100).toFixed(1),
      strokeLength,
      dashOffset,
      color,
      index,
    };
  });
  const activeDeptSegment = hoveredDeptIndex !== null ? deptSegments[hoveredDeptIndex] : null;

  // Get active scope text for subtitle and badge
  const getActiveScopeText = () => {
    if (filterStartDate && filterEndDate) return `${filterStartDate} ถึง ${filterEndDate}`;
    if (filterStartDate) return `ตั้งแต่ ${filterStartDate}`;
    if (filterEndDate) return `ถึงวันที่ ${filterEndDate}`;
    if (filterDateScope === 'today') return language === 'th' ? `วันนี้ (${currentDayDisplayName})` : `Today (${currentDayDisplayName})`;
    if (filterDateScope === 'current_month') return language === 'th' ? `เดือนปัจจุบัน (${currentMonthDisplayName})` : `This Month (${currentMonthDisplayName})`;
    if (filterDateScope === 'all') return language === 'th' ? 'ทุกช่วงเวลา (ทั้งหมด)' : 'All Time';
    if (filterMonth && filterMonth !== 'current' && filterMonth !== 'all') return `เดือน ${filterMonth}`;
    return language === 'th' ? 'กำหนดเอง' : 'Custom';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0061a5] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
              <PieChart className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {language === 'th' ? 'สถิติและการวิเคราะห์ข้อมูลการซัก-อบผ้า' : 'Laundry Analytics & Statistics'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-[11px] font-bold text-emerald-100">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  {language === 'th' ? 'กราฟวงกลมไดนามิก' : 'Dynamic Donut Charts'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {language === 'th' 
                  ? `ประมวลผลข้อมูลจากใบงานที่เลือก ${totalOrders} รายการ รวม ${totalPieces.toLocaleString()} ชิ้นผ้า (${getActiveScopeText()})` 
                  : `Analytics from ${totalOrders} orders (${totalPieces.toLocaleString()} pieces) • ${getActiveScopeText()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Filter Toggle Button in Statistics Header (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`relative w-10 h-10 rounded-2xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-white text-emerald-950 border-white font-bold shadow-md ring-2 ring-emerald-300/60'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/30'
              }`}
              title={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filter Data'}
              aria-label={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2.2] ${isFilterOpen || activeFilterCount > 0 ? 'text-emerald-700' : 'text-white'}`} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-emerald-950 font-black text-[10px] flex items-center justify-center shadow-xs ring-2 ring-emerald-800">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#f8fafc]">
          
          {/* Interactive Filter Selection Panel (Toggleable inside Statistics Modal) */}
          {isFilterOpen && (
            <div className="bg-white rounded-2xl border-2 border-emerald-200/90 p-4 sm:p-5 shadow-sm space-y-4 animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Filter className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#002045]">
                      {language === 'th' ? 'เลือกข้อมูลเพื่อแสดงสถิติ (Filter Analytics)' : 'Filter Analytics Criteria'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {language === 'th' ? 'เลือกช่วงเวลา แผนก หรือสถานะ เพื่อให้กราฟสถิติคำนวณใหม่แบบเรียลไทม์' : 'Select time range, department or status to update charts instantly'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-200"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-600" />
                      <span>{language === 'th' ? 'ล้างตัวกรอง' : 'Reset'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title={language === 'th' ? 'ปิดแผงตัวกรอง' : 'Close Panel'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Time Scope */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#002045] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{language === 'th' ? 'ช่วงเวลาข้อมูล (Time Scope)' : 'Time Scope'}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDateScope('today');
                        setFilterMonth('current');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        filterDateScope === 'today' && !filterStartDate && !filterEndDate
                          ? 'bg-emerald-700 text-white shadow-2xs ring-1 ring-emerald-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {language === 'th' ? 'วันนี้' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDateScope('current_month');
                        setFilterMonth('current');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        filterDateScope === 'current_month' && !filterStartDate && !filterEndDate
                          ? 'bg-emerald-700 text-white shadow-2xs ring-1 ring-emerald-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {language === 'th' ? 'เดือนนี้' : 'Month'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDateScope('all');
                        setFilterMonth('all');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        filterDateScope === 'all' && !filterStartDate && !filterEndDate
                          ? 'bg-emerald-700 text-white shadow-2xs ring-1 ring-emerald-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {language === 'th' ? 'ทั้งหมด' : 'All'}
                    </button>
                  </div>

                  {/* Specific month selector */}
                  <div className="mt-2">
                    <select
                      value={filterMonth}
                      onChange={(e) => {
                        setFilterMonth(e.target.value);
                        if (e.target.value === 'all') setFilterDateScope('all');
                        else if (e.target.value === 'current') setFilterDateScope('current_month');
                        else setFilterDateScope('custom');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="current">
                        {language === 'th' ? `เดือนปัจจุบัน (${currentMonthDisplayName})` : `Current Month (${currentMonthDisplayName})`}
                      </option>
                      <option value="all">
                        {language === 'th' ? '— ทุกเดือน (All Months) —' : '— All Months —'}
                      </option>
                      {availableMonths
                        .filter((m) => m !== currentYearMonthStr)
                        .map((m) => (
                          <option key={m} value={m}>
                            {language === 'th' ? `เดือน ${m}` : `Month ${m}`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* 2. Department Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#002045] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-violet-700" />
                    <span>{language === 'th' ? 'แผนกที่ส่งผ้า (Department)' : 'Department'}</span>
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">{language === 'th' ? '— ทุกแผนก (All Departments) —' : '— All Departments —'}</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>

                  {/* Date range picker if needed */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">จากวันที่</span>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => {
                          setFilterStartDate(e.target.value);
                          setFilterDateScope('custom');
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] bg-slate-50"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">ถึงวันที่</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => {
                          setFilterEndDate(e.target.value);
                          setFilterDateScope('custom');
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[11px] bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Status Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#002045] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
                    <span>{language === 'th' ? 'สถานะงานซัก (Status)' : 'Status'}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterStage('all')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        filterStage === 'all'
                          ? 'bg-[#002045] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {language === 'th' ? 'ทั้งหมด' : 'All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStage('washing')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        filterStage === 'washing'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <Waves className="w-3 h-3" />
                      <span>{language === 'th' ? 'ซักอยู่' : 'Wash'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStage('ready')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        filterStage === 'ready'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{language === 'th' ? 'เสร็จ' : 'Ready'}</span>
                    </button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'ดูผลการวิเคราะห์' : 'Apply & View'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Indicator Chips Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                <span>{language === 'th' ? 'ขอบเขตข้อมูล:' : 'Filter Scope:'}</span>
              </span>

              {/* Time Scope Badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold">
                <Clock className="w-3 h-3 text-emerald-700" />
                <span>{getActiveScopeText()}</span>
              </span>

              {/* Department Badge */}
              {filterDepartment !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-900 border border-violet-200 text-xs font-bold">
                  <Building2 className="w-3 h-3 text-violet-700" />
                  <span>{filterDepartment}</span>
                </span>
              )}

              {/* Status Badge */}
              {filterStage !== 'all' && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  filterStage === 'washing'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}>
                  {filterStage === 'washing' ? <Waves className="w-3 h-3 text-amber-600" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  <span>{filterStage === 'washing' ? (language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing') : (language === 'th' ? 'ซักเสร็จแล้ว' : 'Ready')}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isFilterOpen ? (language === 'th' ? 'ซ่อนตัวกรอง' : 'Hide Filters') : (language === 'th' ? 'เปลี่ยนตัวกรอง' : 'Change Filter')}</span>
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title={language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* If no orders match the selected filters */}
          {totalOrders === 0 ? (
            <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#002045]">
                {language === 'th' ? 'ไม่พบข้อมูลตามเงื่อนไขตัวกรองที่เลือก' : 'No records match the current filter selection'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {language === 'th' ? 'ลองปรับเปลี่ยนช่วงเวลา แผนก หรือสถานะ หรือกดล้างตัวกรองเพื่อดูสถิติทั้งหมด' : 'Try expanding the time range or clearing the active filters'}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'ล้างตัวกรองและดูข้อมูลทั้งหมด' : 'Reset to All Orders'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Top KPI Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Orders */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                    <span>{language === 'th' ? 'ใบงานทั้งหมด' : 'Total Orders'}</span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-[#002045]">{totalOrders}</p>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md self-start mt-1">
                    {totalPieces.toLocaleString()} {language === 'th' ? 'ชิ้นผ้ารวม' : 'pcs total'}
                  </span>
                </div>

                {/* In Washing */}
                <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
                    <span>{language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing'}</span>
                    <Waves className="w-4 h-4 text-amber-500 animate-pulse" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-amber-600">{inWashingCount}</p>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md self-start mt-1">
                    {inWashingPercentage}% {language === 'th' ? 'ของงานที่เลือก' : 'of batch'}
                  </span>
                </div>

                {/* Washed & Ready */}
                <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
                    <span>{language === 'th' ? 'ซักเสร็จสมบูรณ์' : 'Washed & Ready'}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-700">{readyCount}</p>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md self-start mt-1">
                    {readyPercentage}% {language === 'th' ? 'พร้อมส่งมอบ' : 'ready'}
                  </span>
                </div>

                {/* Average Pieces */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                    <span>{language === 'th' ? 'เฉลี่ยชิ้น/ใบงาน' : 'Avg. Items/Order'}</span>
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-sky-800">{avgPiecesPerOrder}</p>
                  <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md self-start mt-1">
                    {language === 'th' ? 'ชิ้นต่อ 1 ใบงาน' : 'pcs per order'}
                  </span>
                </div>
              </div>

              {/* Sub Tab Navigation for Analytics */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('garments')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === 'garments'
                      ? 'bg-[#064e3b] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5" />
                  {language === 'th' ? '1. กราฟวงกลม: สัดส่วนประเภทผ้า' : '1. Garment Types Donut'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChartTab('status')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === 'status'
                      ? 'bg-[#064e3b] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {language === 'th' ? '2. กราฟวงกลม: ความคืบหน้าสถานะ' : '2. Status Donut'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChartTab('departments')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeChartTab === 'departments'
                      ? 'bg-[#064e3b] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {language === 'th' ? '3. กราฟวงกลม: สัดส่วนแผนก' : '3. Department Donut'}
                </button>
              </div>

              {/* TAB 1: Garment Types Circular Donut Chart */}
              {activeChartTab === 'garments' && (
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-base text-[#002045] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {language === 'th' ? 'กราฟวงกลมแสดงสัดส่วนประเภทผ้าทั้งหมด' : 'Garment Types Modern Donut Chart'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {language === 'th' ? 'แตะหรือวางเมาส์เหนือส่วนของกราฟเพื่อดูรายละเอียดจำนวนชิ้นและร้อยละ' : 'Hover or tap chart slices to inspect volume and percentages'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
                      {sortedGarmentTypes.length} {language === 'th' ? 'หมวดหมู่ผ้า' : 'categories'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* SVG Interactive Donut Chart */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90 filter drop-shadow-sm">
                          {/* Background Ring */}
                          <circle
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="transparent"
                            stroke="#f1f5f9"
                            strokeWidth="24"
                          />
                          {/* Interactive Slices */}
                          {garmentSegments.map((seg) => {
                            const isHovered = hoveredTypeIndex === seg.index;
                            return (
                              <circle
                                key={seg.name}
                                cx="110"
                                cy="110"
                                r={radius}
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth={isHovered ? 28 : 22}
                                strokeDasharray={`${Math.max(0, seg.strokeLength - 2)} ${circumference - Math.max(0, seg.strokeLength - 2)}`}
                                strokeDashoffset={-seg.dashOffset}
                                className="transition-all duration-300 cursor-pointer"
                                onMouseEnter={() => setHoveredTypeIndex(seg.index)}
                                onMouseLeave={() => setHoveredTypeIndex(null)}
                                onClick={() => setHoveredTypeIndex(hoveredTypeIndex === seg.index ? null : seg.index)}
                              />
                            );
                          })}
                        </svg>

                        {/* Center Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                          {activeGarmentSegment ? (
                            <div className="animate-in fade-in zoom-in-90 duration-150">
                              <span className="text-[11px] font-bold text-slate-500 line-clamp-1 max-w-[120px]">
                                {activeGarmentSegment.name}
                              </span>
                              <p className="text-xl font-black text-[#002045] leading-tight">
                                {activeGarmentSegment.count} <span className="text-xs font-normal text-slate-600">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                              </p>
                              <span 
                                className="text-xs font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5"
                                style={{ backgroundColor: `${activeGarmentSegment.color}20`, color: activeGarmentSegment.color }}
                              >
                                {activeGarmentSegment.percentage}%
                              </span>
                            </div>
                          ) : (
                            <div>
                              <Shirt className="w-5 h-5 text-emerald-600 mx-auto mb-0.5" />
                              <p className="text-2xl font-black text-[#002045] leading-none">{totalPieces.toLocaleString()}</p>
                              <span className="text-[11px] text-slate-500 font-bold mt-1 block">
                                {language === 'th' ? 'ชิ้นผ้ารวมทั้งหมด' : 'Total Pieces'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 font-medium mt-3 text-center">
                        {language === 'th' ? 'แตะชิ้นกราฟเพื่อดูสถิติแยกประเภท' : 'Tap slices to inspect categories'}
                      </p>
                    </div>

                    {/* Legend & Details List */}
                    <div className="md:col-span-7 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {garmentSegments.map((seg) => {
                        const isHovered = hoveredTypeIndex === seg.index;
                        return (
                          <div
                            key={seg.name}
                            onMouseEnter={() => setHoveredTypeIndex(seg.index)}
                            onMouseLeave={() => setHoveredTypeIndex(null)}
                            onClick={() => setHoveredTypeIndex(hoveredTypeIndex === seg.index ? null : seg.index)}
                            className={`flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all cursor-pointer border ${
                              isHovered 
                                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs' 
                                : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white"
                                style={{ backgroundColor: seg.color }}
                              />
                              <span className={`font-bold truncate ${isHovered ? 'text-emerald-950' : 'text-slate-700'}`}>
                                {seg.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-black text-slate-900">{seg.count.toLocaleString()} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                              <span className="text-xs font-bold text-slate-500 w-14 text-right">({seg.percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Status Breakdown Circular Ring */}
              {activeChartTab === 'status' && (
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-base text-[#002045] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                        {language === 'th' ? 'กราฟวงกลมแสดงสถานะการดำเนินการซักผ้า' : 'Laundry Status & Progress Gauge'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {language === 'th' ? 'เปรียบเทียบสัดส่วนระหว่างงานที่ซักเสร็จสมบูรณ์กับงานที่อยู่ระหว่างดำเนินการ' : 'Ratio between ready/completed garments vs in-washing batch'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const gaugeRadius = 75;
                    const gaugeCircumference = 2 * Math.PI * gaugeRadius;
                    const readyStroke = (readyPercentage / 100) * gaugeCircumference;
                    const inWashStroke = (inWashingPercentage / 100) * gaugeCircumference;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-5 flex flex-col items-center justify-center">
                          <div className="relative flex items-center justify-center">
                            <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90">
                              {/* Background Ring */}
                              <circle
                                cx="110"
                                cy="110"
                                r={gaugeRadius}
                                fill="transparent"
                                stroke="#f1f5f9"
                                strokeWidth="24"
                              />
                              {/* In Washing Arc */}
                              <circle
                                cx="110"
                                cy="110"
                                r={gaugeRadius}
                                fill="transparent"
                                stroke="#f59e0b"
                                strokeWidth="24"
                                strokeDasharray={`${Math.max(0, inWashStroke - 2)} ${gaugeCircumference}`}
                                strokeDashoffset={0}
                                className="transition-all duration-700"
                              />
                              {/* Ready Arc */}
                              <circle
                                cx="110"
                                cy="110"
                                r={gaugeRadius}
                                fill="transparent"
                                stroke="#10b981"
                                strokeWidth="24"
                                strokeDasharray={`${Math.max(0, readyStroke - 2)} ${gaugeCircumference}`}
                                strokeDashoffset={-inWashStroke}
                                className="transition-all duration-700"
                              />
                            </svg>

                            {/* Center Metric */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                              <p className="text-3xl font-black text-emerald-700 leading-none">{readyPercentage}%</p>
                              <span className="text-[11px] font-bold text-emerald-900 mt-1">
                                {language === 'th' ? 'ซักเสร็จแล้ว' : 'Ready'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-7 space-y-4">
                          {/* Status Cards */}
                          <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-emerald-950 text-sm">
                                  {language === 'th' ? 'ซักเสร็จสมบูรณ์ พร้อมส่งมอบ' : 'Ready / Completed'}
                                </h4>
                                <p className="text-xs text-emerald-700">
                                  {language === 'th' ? 'ผ้าผ่านกระบวนการซักและอบแห้งเรียบร้อยแล้ว' : 'Washed, dried and ready for pickup'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-emerald-800">{readyCount} <span className="text-xs font-medium">{language === 'th' ? 'ใบงาน' : 'orders'}</span></p>
                              <span className="text-xs font-bold text-emerald-600">{readyPercentage}%</span>
                            </div>
                          </div>

                          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                <Waves className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-amber-950 text-sm">
                                  {language === 'th' ? 'อยู่ระหว่างดำเนินการซัก-อบ' : 'In Washing & Drying'}
                                </h4>
                                <p className="text-xs text-amber-700">
                                  {language === 'th' ? 'กำลังดำเนินการซักตามลำดับคิว' : 'Currently being washed in machines'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-amber-800">{inWashingCount} <span className="text-xs font-medium">{language === 'th' ? 'ใบงาน' : 'orders'}</span></p>
                              <span className="text-xs font-bold text-amber-600">{inWashingPercentage}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: Department Breakdown Circular Chart */}
              {activeChartTab === 'departments' && (
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-base text-[#002045] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                        {language === 'th' ? 'กราฟวงกลมแสดงสัดส่วนยอดผ้าตามแผนก' : 'Department Garment Volume Donut'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {language === 'th' ? 'จำแนกสัดส่วนจำนวนชิ้นผ้าตามแผนกที่ส่งซัก' : 'Distribution of laundry volume requested by department'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-violet-800 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full self-start sm:self-auto">
                      {sortedDepts.length} {language === 'th' ? 'แผนก' : 'departments'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* SVG Donut */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90">
                          <circle
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="transparent"
                            stroke="#f1f5f9"
                            strokeWidth="24"
                          />
                          {deptSegments.map((seg) => {
                            const isHovered = hoveredDeptIndex === seg.index;
                            return (
                              <circle
                                key={seg.name}
                                cx="110"
                                cy="110"
                                r={radius}
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth={isHovered ? 28 : 22}
                                strokeDasharray={`${Math.max(0, seg.strokeLength - 2)} ${circumference - Math.max(0, seg.strokeLength - 2)}`}
                                strokeDashoffset={-seg.dashOffset}
                                className="transition-all duration-300 cursor-pointer"
                                onMouseEnter={() => setHoveredDeptIndex(seg.index)}
                                onMouseLeave={() => setHoveredDeptIndex(null)}
                                onClick={() => setHoveredDeptIndex(hoveredDeptIndex === seg.index ? null : seg.index)}
                              />
                            );
                          })}
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                          {activeDeptSegment ? (
                            <div className="animate-in fade-in zoom-in-90 duration-150">
                              <span className="text-[11px] font-bold text-slate-500 line-clamp-1 max-w-[120px]">
                                {activeDeptSegment.name}
                              </span>
                              <p className="text-xl font-black text-[#002045] leading-tight">
                                {activeDeptSegment.pieces} <span className="text-xs font-normal text-slate-600">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                              </p>
                              <span 
                                className="text-xs font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5"
                                style={{ backgroundColor: `${activeDeptSegment.color}20`, color: activeDeptSegment.color }}
                              >
                                {activeDeptSegment.percentage}%
                              </span>
                            </div>
                          ) : (
                            <div>
                              <Building2 className="w-5 h-5 text-violet-600 mx-auto mb-0.5" />
                              <p className="text-2xl font-black text-[#002045] leading-none">{sortedDepts.length}</p>
                              <span className="text-[11px] text-slate-500 font-bold mt-1 block">
                                {language === 'th' ? 'แผนกทั้งหมด' : 'Total Depts'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dept list */}
                    <div className="md:col-span-7 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {deptSegments.map((seg) => {
                        const isHovered = hoveredDeptIndex === seg.index;
                        return (
                          <div
                            key={seg.name}
                            onMouseEnter={() => setHoveredDeptIndex(seg.index)}
                            onMouseLeave={() => setHoveredDeptIndex(null)}
                            onClick={() => setHoveredDeptIndex(hoveredDeptIndex === seg.index ? null : seg.index)}
                            className={`flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all cursor-pointer border ${
                              isHovered 
                                ? 'bg-violet-50/80 border-violet-300 ring-2 ring-violet-400/20 shadow-xs' 
                                : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white"
                                style={{ backgroundColor: seg.color }}
                              />
                              <span className={`font-bold truncate ${isHovered ? 'text-violet-950' : 'text-slate-700'}`}>
                                {seg.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-slate-500">{seg.orders} {language === 'th' ? 'ใบ' : 'orders'}</span>
                              <span className="font-black text-slate-900">{seg.pieces.toLocaleString()} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                              <span className="text-xs font-bold text-slate-500 w-12 text-right">({seg.percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};

