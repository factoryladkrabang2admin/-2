import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  PieChart, 
  BarChart3, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Sparkles,
  TrendingUp,
  Award,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag
} from 'lucide-react';
import { MaintenanceTicket } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MaintenanceAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: MaintenanceTicket[];
}

export const MaintenanceAnalyticsModal: React.FC<MaintenanceAnalyticsModalProps> = ({
  isOpen,
  onClose,
  tickets,
}) => {
  const { language } = useLanguage();
  const [hoveredStatusIndex, setHoveredStatusIndex] = useState<number | null>(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState<number | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'status' | 'departments' | 'efficiency'>('status');

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [timeScope, setTimeScope] = useState<'all' | 'today' | 'this_month' | 'specific_month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');

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

  // Extract unique departments
  const availableDepts = useMemo(() => {
    const list = Array.from(
      new Set(tickets.map((t) => (t.department || '').trim()).filter(Boolean))
    ).sort();
    return list;
  }, [tickets]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYearMonth = todayStr.substring(0, 7);

    return tickets.filter((t) => {
      const recDate = (t.timestamp || t.date || '').trim();

      // Time Scope
      if (timeScope === 'today') {
        if (recDate && !recDate.startsWith(todayStr)) return false;
      } else if (timeScope === 'this_month') {
        if (recDate && !recDate.startsWith(currentYearMonth)) return false;
      } else if (timeScope === 'specific_month') {
        if (recDate && !recDate.startsWith(selectedMonth)) return false;
      } else if (timeScope === 'custom') {
        if (startDate && recDate && recDate < startDate) return false;
        if (endDate && recDate && recDate > endDate) return false;
      }

      // Status
      if (selectedStatus !== 'all') {
        if (t.status !== selectedStatus) return false;
      }

      // Department
      if (selectedDept !== 'all') {
        if ((t.department || '').trim() !== selectedDept) return false;
      }

      return true;
    });
  }, [tickets, timeScope, selectedMonth, startDate, endDate, selectedStatus, selectedDept]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (timeScope !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedDept !== 'all') count++;
    return count;
  }, [timeScope, selectedStatus, selectedDept]);

  const handleResetFilters = () => {
    setTimeScope('all');
    setStartDate('');
    setEndDate('');
    setSelectedStatus('all');
    setSelectedDept('all');
  };

  if (!isOpen) return null;

  const totalCount = filteredTickets.length;
  const newCount = filteredTickets.filter((t) => t.status === 'แจ้งใหม่').length;
  const inProgressCount = filteredTickets.filter((t) => t.status === 'อยู่ระหว่างดำเนินการ').length;
  const completedCount = filteredTickets.filter((t) => t.status === 'เสร็จแล้ว').length;
  const otherCount = totalCount - (newCount + inProgressCount + completedCount);

  const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const inProgressPct = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
  const newPct = totalCount > 0 ? Math.round((newCount / totalCount) * 100) : 0;

  // 1. Status Donut Math
  const statusItems = [
    {
      name: language === 'th' ? 'เสร็จแล้ว' : 'Completed',
      count: completedCount,
      color: '#10b981', // Emerald
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200',
      textColor: 'text-emerald-700',
      percentage: completedPct,
    },
    {
      name: language === 'th' ? 'อยู่ระหว่างดำเนินการ' : 'In Progress',
      count: inProgressCount,
      color: '#0284c7', // Sky blue
      bgLight: 'bg-sky-50',
      borderLight: 'border-sky-200',
      textColor: 'text-sky-700',
      percentage: inProgressPct,
    },
    {
      name: language === 'th' ? 'แจ้งใหม่' : 'New Ticket',
      count: newCount,
      color: '#f59e0b', // Amber
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200',
      textColor: 'text-amber-700',
      percentage: newPct,
    },
  ].filter(item => item.count > 0 || totalCount === 0);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let statusAccumulatedOffset = 0;

  const statusSegments = statusItems.map((item, index) => {
    const frac = totalCount > 0 ? item.count / totalCount : 0;
    const strokeLength = frac * circumference;
    const dashOffset = statusAccumulatedOffset;
    statusAccumulatedOffset += strokeLength;
    return {
      ...item,
      strokeLength,
      dashOffset,
      index,
    };
  });

  const activeStatusSegment = hoveredStatusIndex !== null ? statusSegments[hoveredStatusIndex] : null;

  // 2. Department Breakdown
  const deptStats: Record<string, number> = {};
  filteredTickets.forEach((t) => {
    const dept = t.department?.trim() || (language === 'th' ? 'หน่วยงานทั่วไป' : 'General');
    deptStats[dept] = (deptStats[dept] || 0) + 1;
  });

  const sortedDepts = Object.entries(deptStats).sort((a, b) => b[1] - a[1]);
  const modernPalette = [
    '#f97316', // Orange
    '#0284c7', // Sky
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
  ];

  let deptAccumulatedOffset = 0;
  const deptSegments = sortedDepts.map(([name, count], index) => {
    const frac = totalCount > 0 ? count / totalCount : 0;
    const strokeLength = frac * circumference;
    const dashOffset = deptAccumulatedOffset;
    deptAccumulatedOffset += strokeLength;
    const color = modernPalette[index % modernPalette.length];
    return {
      name,
      count,
      percentage: (frac * 100).toFixed(1),
      strokeLength,
      dashOffset,
      color,
      index,
    };
  });

  const activeDeptSegment = hoveredDeptIndex !== null ? deptSegments[hoveredDeptIndex] : null;

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
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#7c2d12] via-[#9a3412] to-[#002045] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-amber-300 shadow-inner">
              <PieChart className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {language === 'th' ? 'สถิติและการวิเคราะห์งานแจ้งซ่อม' : 'Maintenance Analytics & Statistics'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-[11px] font-bold text-amber-100">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  {language === 'th' ? 'กราฟวงกลมแบบไดนามิก' : 'Modern Donut Charts'}
                </span>
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5">
                {language === 'th' 
                  ? `วิเคราะห์จาก ${totalCount.toLocaleString()} รายการ${tickets.length !== totalCount ? ` จากทั้งหมด ${tickets.length.toLocaleString()} รายการ` : ''}` 
                  : `Analyzed from ${totalCount.toLocaleString()} tickets${tickets.length !== totalCount ? ` of total ${tickets.length.toLocaleString()}` : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle Button (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-amber-400 text-[#7c2d12] ring-2 ring-amber-200 shadow-sm'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
              }`}
              title={language === 'th' ? `ตัวกรองข้อมูลสถิติ${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}` : `Filter Analytics${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}`}
              aria-label={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filter'}
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#7c2d12] text-amber-300 text-[9px] font-black flex items-center justify-center border border-amber-200 shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Filter Box */}
        {isFilterOpen && (
          <div className="bg-amber-50/70 border-b border-amber-200/80 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-black text-[#7c2d12] uppercase tracking-wider">
                  {language === 'th' ? 'ตั้งค่าตัวกรองข้อมูลสำหรับสถิติงานแจ้งซ่อม' : 'Filter Maintenance Analytics'}
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Time Scope */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'ช่วงเวลา (Time Scope)' : 'Time Scope'}
                </label>
                <select
                  value={timeScope}
                  onChange={(e) => setTimeScope(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด (All Time)' : 'All Time'}</option>
                  <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
                  <option value="this_month">{language === 'th' ? 'เดือนปัจจุบัน (This Month)' : 'This Month'}</option>
                  <option value="specific_month">{language === 'th' ? 'เลือกเดือนระบุ' : 'Specific Month'}</option>
                  <option value="custom">{language === 'th' ? 'กำหนดช่วงวันที่เอง' : 'Custom Date Range'}</option>
                </select>
              </div>

              {/* 2. Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'สถานะงาน (Status)' : 'Status'}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกสถานะ (All)' : 'All Statuses'}</option>
                  <option value="แจ้งใหม่">{language === 'th' ? 'แจ้งใหม่ (New)' : 'New Ticket'}</option>
                  <option value="อยู่ระหว่างดำเนินการ">{language === 'th' ? 'อยู่ระหว่างดำเนินการ (In Progress)' : 'In Progress'}</option>
                  <option value="เสร็จแล้ว">{language === 'th' ? 'เสร็จแล้ว (Completed)' : 'Completed'}</option>
                </select>
              </div>

              {/* 3. Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'หน่วยงาน/แผนก (Department)' : 'Department'}
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกหน่วยงาน (All)' : 'All Depts'}</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extra Date Pickers */}
            {timeScope === 'specific_month' && (
              <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">{language === 'th' ? 'เลือกเดือน-ปี:' : 'Select Month:'}</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                />
              </div>
            )}

            {timeScope === 'custom' && (
              <div className="mt-3 pt-3 border-t border-amber-200/80 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">{language === 'th' ? 'ตั้งแต่วันที่:' : 'From:'}</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">{language === 'th' ? 'ถึงวันที่:' : 'To:'}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[#f8fafc]">
          
          {/* Active Filter Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs">
              <span className="font-bold text-[#7c2d12] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-orange-600" />
                {language === 'th' ? 'เงื่อนไขที่เลือก:' : 'Active Filters:'}
              </span>

              {timeScope !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-semibold shadow-2xs">
                  📅 {timeScope === 'today' ? (language === 'th' ? 'วันนี้' : 'Today') : timeScope === 'this_month' ? (language === 'th' ? 'เดือนนี้' : 'This Month') : timeScope === 'specific_month' ? selectedMonth : `${startDate || '...'} ~ ${endDate || '...'}`}
                </span>
              )}

              {selectedStatus !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-semibold shadow-2xs">
                  ⚡ {selectedStatus}
                </span>
              )}

              {selectedDept !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-semibold shadow-2xs">
                  🏢 {selectedDept}
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-amber-900 hover:text-rose-600 transition-colors cursor-pointer px-2 py-0.5"
              >
                {language === 'th' ? 'ล้างทั้งหมด' : 'Clear'}
              </button>
            </div>
          )}

          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Work Orders */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>{language === 'th' ? 'ใบแจ้งงานทั้งหมด' : 'Total Work Orders'}</span>
                <Wrench className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002045]">{totalCount.toLocaleString()}</p>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md self-start mt-1">
                {language === 'th' ? 'รายการซ่อมบำรุง' : 'maintenance tickets'}
              </span>
            </div>

            {/* New Tickets */}
            <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
                <span>{language === 'th' ? 'แจ้งใหม่ (รอดำเนินการ)' : 'New Tickets'}</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600">{newCount}</p>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md self-start mt-1">
                {newPct}% {language === 'th' ? 'ของงานทั้งหมด' : 'of total'}
              </span>
            </div>

            {/* In Progress */}
            <div className="p-4 rounded-2xl bg-white border border-sky-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-sky-700 text-xs font-bold mb-1">
                <span>{language === 'th' ? 'กำลังดำเนินการ' : 'In Progress'}</span>
                <AlertTriangle className="w-4 h-4 text-sky-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-sky-600">{inProgressCount}</p>
              <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md self-start mt-1">
                {inProgressPct}% {language === 'th' ? 'อยู่ระหว่างเข้าซ่อม' : 'in action'}
              </span>
            </div>

            {/* Completed */}
            <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
                <span>{language === 'th' ? 'ซ่อมเสร็จสิ้น' : 'Completed'}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700">{completedCount}</p>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md self-start mt-1">
                {completedPct}% {language === 'th' ? 'อัตราความสำเร็จ' : 'success rate'}
              </span>
            </div>
          </div>

          {/* Sub Tab Navigation for Analytics */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveChartTab('status')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'status'
                  ? 'bg-[#7c2d12] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'th' ? '1. กราฟวงกลม: สัดส่วนสถานะงาน' : '1. Status Donut Chart'}
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('departments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'departments'
                  ? 'bg-[#7c2d12] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {language === 'th' ? '2. กราฟวงกลม: แยกตามหน่วยงาน' : '2. Department Donut'}
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('efficiency')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'efficiency'
                  ? 'bg-[#7c2d12] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              {language === 'th' ? '3. อัตราการปิดงานซ่อม' : '3. Resolution Gauge'}
            </button>
          </div>

          {/* TAB 1: Status Donut Chart */}
          {activeChartTab === 'status' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-base text-[#002045] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    {language === 'th' ? 'กราฟวงกลมแสดงสัดส่วนสถานะงานแจ้งซ่อม' : 'Maintenance Status Donut Chart'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'th' ? 'แตะหรือวางเมาส์เพื่อดูสัดส่วนงานแจ้งใหม่, อยู่ระหว่างดำเนินการ และเสร็จสิ้น' : 'Interactive donut chart breaking down tickets by current status'}
                  </p>
                </div>
                <span className="text-xs font-bold text-orange-900 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full self-start sm:self-auto">
                  {totalCount} {language === 'th' ? 'ใบงาน' : 'tickets'}
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
                      {statusSegments.map((seg) => {
                        const isHovered = hoveredStatusIndex === seg.index;
                        return (
                          <circle
                            key={seg.name}
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={isHovered ? 28 : 22}
                            strokeDasharray={`${Math.max(0, seg.strokeLength - 2.5)} ${circumference - Math.max(0, seg.strokeLength - 2.5)}`}
                            strokeDashoffset={-seg.dashOffset}
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredStatusIndex(seg.index)}
                            onMouseLeave={() => setHoveredStatusIndex(null)}
                            onClick={() => setHoveredStatusIndex(hoveredStatusIndex === seg.index ? null : seg.index)}
                          />
                        );
                      })}
                    </svg>

                    {/* Center Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                      {activeStatusSegment ? (
                        <div className="animate-in fade-in zoom-in-90 duration-150">
                          <span className="text-[11px] font-bold text-slate-500 line-clamp-1 max-w-[120px]">
                            {activeStatusSegment.name}
                          </span>
                          <p className="text-xl font-black text-[#002045] leading-tight">
                            {activeStatusSegment.count} <span className="text-xs font-normal text-slate-600">{language === 'th' ? 'งาน' : 'tickets'}</span>
                          </p>
                          <span 
                            className="text-xs font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5"
                            style={{ backgroundColor: `${activeStatusSegment.color}20`, color: activeStatusSegment.color }}
                          >
                            {activeStatusSegment.percentage}%
                          </span>
                        </div>
                      ) : (
                        <div>
                          <Wrench className="w-5 h-5 text-orange-600 mx-auto mb-0.5" />
                          <p className="text-2xl font-black text-[#002045] leading-none">{completedPct}%</p>
                          <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                            {language === 'th' ? 'ปิดงานสำเร็จ' : 'Resolved'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-medium mt-3 text-center">
                    {language === 'th' ? 'แตะชิ้นกราฟเพื่อดูสถิติแยกสถานะ' : 'Tap slices to inspect status stats'}
                  </p>
                </div>

                {/* Legend & Details List */}
                <div className="md:col-span-7 space-y-3">
                  {statusSegments.map((seg) => {
                    const isHovered = hoveredStatusIndex === seg.index;
                    return (
                      <div
                        key={seg.name}
                        onMouseEnter={() => setHoveredStatusIndex(seg.index)}
                        onMouseLeave={() => setHoveredStatusIndex(null)}
                        onClick={() => setHoveredStatusIndex(hoveredStatusIndex === seg.index ? null : seg.index)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl text-xs transition-all cursor-pointer border ${
                          isHovered 
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
                            : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span
                            className="w-4 h-4 rounded-full shrink-0 shadow-xs border border-white"
                            style={{ backgroundColor: seg.color }}
                          />
                          <div>
                            <span className={`font-bold block text-sm ${isHovered ? 'text-amber-950' : 'text-slate-800'}`}>
                              {seg.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {seg.name === 'เสร็จแล้ว' 
                                ? (language === 'th' ? 'งานที่ดำเนินการแก้ไขเสร็จสิ้นแล้ว' : 'Resolved & completed jobs')
                                : seg.name === 'อยู่ระหว่างดำเนินการ'
                                ? (language === 'th' ? 'ช่างกำลังดำเนินการซ่อมแซม' : 'Technicians actively working')
                                : (language === 'th' ? 'รายการแจ้งซ่อมใหม่ที่รอเข้าดำเนินการ' : 'New incoming repair requests')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <span className="font-black text-sm text-slate-900 block">{seg.count.toLocaleString()} {language === 'th' ? 'งาน' : 'jobs'}</span>
                            <span className="text-xs font-bold text-slate-500">({seg.percentage}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Department Donut Chart */}
          {activeChartTab === 'departments' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-base text-[#002045] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    {language === 'th' ? 'กราฟวงกลมแสดงสัดส่วนงานตามหน่วยงานที่รับแจ้ง' : 'Department Job Volume Donut Chart'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'th' ? 'วิเคราะห์การกระจายตัวของงานซ่อมในแต่ละแผนกหรือหน่วยงาน' : 'Workload distribution across maintenance departments'}
                  </p>
                </div>
                <span className="text-xs font-bold text-orange-900 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full self-start sm:self-auto">
                  {sortedDepts.length} {language === 'th' ? 'หน่วยงาน' : 'departments'}
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
                            {activeDeptSegment.count} <span className="text-xs font-normal text-slate-600">{language === 'th' ? 'งาน' : 'jobs'}</span>
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
                          <Building2 className="w-5 h-5 text-orange-600 mx-auto mb-0.5" />
                          <p className="text-2xl font-black text-[#002045] leading-none">{sortedDepts.length}</p>
                          <span className="text-[11px] text-slate-500 font-bold mt-1 block">
                            {language === 'th' ? 'หน่วยงานทั้งหมด' : 'Total Depts'}
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
                            ? 'bg-orange-50/80 border-orange-300 ring-2 ring-orange-400/20 shadow-xs' 
                            : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className={`font-bold truncate ${isHovered ? 'text-orange-950' : 'text-slate-700'}`}>
                            {seg.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-slate-900">{seg.count.toLocaleString()} {language === 'th' ? 'งาน' : 'jobs'}</span>
                          <span className="text-xs font-bold text-slate-500 w-12 text-right">({seg.percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Resolution Efficiency Gauge */}
          {activeChartTab === 'efficiency' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-base text-[#002045] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    {language === 'th' ? 'ดัชนีประสิทธิภาพการปิดงานซ่อมบำรุง' : 'Maintenance Resolution Efficiency Gauge'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'th' ? 'อัตราความสำเร็จในการปิดงานเทียบกับปริมาณงานที่แจ้งเข้ามาทั้งหมด' : 'Overall resolution rate and operational performance'}
                  </p>
                </div>
              </div>

              {(() => {
                const gaugeRadius = 75;
                const gaugeCircumference = 2 * Math.PI * gaugeRadius;
                const completedStroke = (completedPct / 100) * gaugeCircumference;
                const pendingPct = 100 - completedPct;
                const pendingStroke = (pendingPct / 100) * gaugeCircumference;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-5 flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90">
                          <circle
                            cx="110"
                            cy="110"
                            r={gaugeRadius}
                            fill="transparent"
                            stroke="#f1f5f9"
                            strokeWidth="24"
                          />
                          <circle
                            cx="110"
                            cy="110"
                            r={gaugeRadius}
                            fill="transparent"
                            stroke="#e2e8f0"
                            strokeWidth="24"
                            strokeDasharray={`${pendingStroke} ${gaugeCircumference}`}
                            strokeDashoffset={0}
                          />
                          <circle
                            cx="110"
                            cy="110"
                            r={gaugeRadius}
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth="24"
                            strokeDasharray={`${completedStroke} ${gaugeCircumference}`}
                            strokeDashoffset={-pendingStroke}
                            className="transition-all duration-700"
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <p className="text-3xl font-black text-emerald-700 leading-none">{completedPct}%</p>
                          <span className="text-[11px] font-bold text-emerald-900 mt-1">
                            {language === 'th' ? 'ปิดงานสำเร็จ' : 'Resolved'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-4">
                      <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-emerald-950 text-sm">
                              {language === 'th' ? 'งานซ่อมที่ปิดงานแล้วเสร็จ' : 'Completed Work Orders'}
                            </h4>
                            <p className="text-xs text-emerald-700">
                              {language === 'th' ? 'ผ่านการตรวจรับงานและแก้ไขเรียบร้อย' : 'Inspected and marked as finished'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-emerald-800">{completedCount} <span className="text-xs font-medium">{language === 'th' ? 'งาน' : 'jobs'}</span></p>
                          <span className="text-xs font-bold text-emerald-600">{completedPct}%</span>
                        </div>
                      </div>

                      <div className="p-4 bg-orange-50/80 rounded-2xl border border-orange-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-orange-950 text-sm">
                              {language === 'th' ? 'งานที่อยู่ระหว่างดำเนินการและรอรับงาน' : 'Pending & In Progress'}
                            </h4>
                            <p className="text-xs text-orange-700">
                              {language === 'th' ? 'รวมงานแจ้งใหม่และงานที่กำลังเข้าซ่อม' : 'New and active repairs'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-orange-800">{newCount + inProgressCount} <span className="text-xs font-medium">{language === 'th' ? 'งาน' : 'jobs'}</span></p>
                          <span className="text-xs font-bold text-orange-600">{100 - completedPct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#7c2d12] hover:bg-[#9a3412] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};

