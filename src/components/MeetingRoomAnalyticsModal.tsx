import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  PieChart as PieChartIcon, 
  DoorOpen, 
  Users, 
  Building2, 
  Sparkles,
  CalendarCheck,
  TrendingUp,
  Clock,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag
} from 'lucide-react';
import { MeetingRoomBooking } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MeetingRoomAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: MeetingRoomBooking[];
}

export const MeetingRoomAnalyticsModal: React.FC<MeetingRoomAnalyticsModalProps> = ({
  isOpen,
  onClose,
  bookings,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'rooms' | 'departments' | 'status'>('rooms');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [timeScope, setTimeScope] = useState<'all' | 'today' | 'this_month' | 'specific_month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

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
      new Set(bookings.map((b) => (b.department || '').trim()).filter(Boolean))
    ).sort();
    return list;
  }, [bookings]);

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYearMonth = todayStr.substring(0, 7);

    return bookings.filter((b) => {
      const recDate = (b.date || b.timestamp || '').trim();

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

      // Room
      if (selectedRoom !== 'all') {
        if (selectedRoom === 'tpm1' && !b.room.toUpperCase().includes('TPM 1')) return false;
        if (selectedRoom === 'tpm2' && !b.room.toUpperCase().includes('TPM 2')) return false;
        if (selectedRoom === 'other' && (b.room.toUpperCase().includes('TPM 1') || b.room.toUpperCase().includes('TPM 2'))) return false;
      }

      // Department
      if (selectedDept !== 'all') {
        if ((b.department || '').trim() !== selectedDept) return false;
      }

      // Status
      if (selectedStatus !== 'all') {
        if (b.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [bookings, timeScope, selectedMonth, startDate, endDate, selectedRoom, selectedDept, selectedStatus]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (timeScope !== 'all') count++;
    if (selectedRoom !== 'all') count++;
    if (selectedDept !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    return count;
  }, [timeScope, selectedRoom, selectedDept, selectedStatus]);

  const handleResetFilters = () => {
    setTimeScope('all');
    setStartDate('');
    setEndDate('');
    setSelectedRoom('all');
    setSelectedDept('all');
    setSelectedStatus('all');
  };

  const totalBookings = filteredBookings.length;
  const totalAttendees = useMemo(() => filteredBookings.reduce((sum, b) => sum + (b.attendeesCount || 0), 0), [filteredBookings]);
  const avgAttendees = totalBookings > 0 ? (totalAttendees / totalBookings).toFixed(1) : '0';

  // 1. Room Distribution Data (TPM 1 vs TPM 2 vs Other)
  const roomData = useMemo(() => {
    const tpm1 = filteredBookings.filter((b) => b.room.toUpperCase().includes('TPM 1'));
    const tpm2 = filteredBookings.filter((b) => b.room.toUpperCase().includes('TPM 2'));
    const other = filteredBookings.filter((b) => !b.room.toUpperCase().includes('TPM 1') && !b.room.toUpperCase().includes('TPM 2'));

    const items = [
      {
        id: 'tpm1',
        name: 'ห้องประชุม TPM 1',
        count: tpm1.length,
        attendees: tpm1.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#2563eb', // Blue
        bgColor: 'bg-blue-500',
        lightBg: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        percentage: totalBookings > 0 ? Math.round((tpm1.length / totalBookings) * 100) : 0,
      },
      {
        id: 'tpm2',
        name: 'ห้องประชุม TPM 2',
        count: tpm2.length,
        attendees: tpm2.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#9333ea', // Purple
        bgColor: 'bg-purple-500',
        lightBg: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700',
        percentage: totalBookings > 0 ? Math.round((tpm2.length / totalBookings) * 100) : 0,
      },
    ];

    if (other.length > 0) {
      items.push({
        id: 'other',
        name: 'ห้องอื่นๆ',
        count: other.length,
        attendees: other.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#64748b', // Slate
        bgColor: 'bg-slate-500',
        lightBg: 'bg-slate-50',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-700',
        percentage: totalBookings > 0 ? Math.round((other.length / totalBookings) * 100) : 0,
      });
    }

    return items;
  }, [filteredBookings, totalBookings]);

  // 2. Department Distribution Data
  const deptData = useMemo(() => {
    const deptMap: Record<string, { count: number; attendees: number }> = {};
    filteredBookings.forEach((b) => {
      const dept = (b.department || 'ไม่ระบุ').trim();
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, attendees: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].attendees += (b.attendeesCount || 0);
    });

    const palette = [
      '#0284c7', // Sky
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#64748b', // Slate
    ];

    return Object.entries(deptMap)
      .map(([name, data], idx) => ({
        id: `dept-${idx}`,
        name,
        count: data.count,
        attendees: data.attendees,
        color: palette[idx % palette.length],
        percentage: totalBookings > 0 ? Math.round((data.count / totalBookings) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings, totalBookings]);

  // 3. Status Distribution Data
  const statusData = useMemo(() => {
    const sMap: Record<string, number> = {
      'เสร็จสิ้นแล้ว': 0,
      'กำลังประชุม': 0,
      'รอเริ่มวันนี้': 0,
      'นัดหมายล่วงหน้า': 0,
    };
    filteredBookings.forEach((b) => {
      const s = b.status || 'นัดหมายล่วงหน้า';
      sMap[s] = (sMap[s] || 0) + 1;
    });

    const colorConfigs: Record<string, { color: string; bg: string }> = {
      'เสร็จสิ้นแล้ว': { color: '#10b981', bg: 'bg-emerald-500' },
      'กำลังประชุม': { color: '#0284c7', bg: 'bg-sky-500' },
      'รอเริ่มวันนี้': { color: '#f59e0b', bg: 'bg-amber-500' },
      'นัดหมายล่วงหน้า': { color: '#6366f1', bg: 'bg-indigo-500' },
    };

    return Object.entries(sMap)
      .map(([name, count], idx) => ({
        id: `status-${idx}`,
        name,
        count,
        color: colorConfigs[name]?.color || '#64748b',
        percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
      }))
      .filter((item) => item.count > 0);
  }, [filteredBookings, totalBookings]);

  // Select active dataset for circular donut chart
  const currentChartItems = useMemo(() => {
    if (activeTab === 'rooms') return roomData;
    if (activeTab === 'departments') return deptData;
    return statusData;
  }, [activeTab, roomData, deptData, statusData]);

  // Calculate circular SVG donut stroke geometry
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const donutSegments = currentChartItems.map((item, index) => {
    const fraction = totalBookings > 0 ? item.count / totalBookings : 0;
    const strokeLength = fraction * circumference;
    const dashOffset = accumulatedOffset;
    accumulatedOffset += strokeLength;

    return {
      ...item,
      strokeLength,
      dashOffset,
      isHovered: hoveredIndex === index,
    };
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#1e3a8a] text-white p-6 relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
              <PieChartIcon className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {language === 'th' ? 'สถิติและการใช้งานห้องประชุม' : 'Meeting Room Analytics & Statistics'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[11px] font-bold text-blue-200">
                  {totalBookings} {language === 'th' ? 'รายการ' : 'bookings'}
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                {language === 'th' 
                  ? `วิเคราะห์จาก ${totalBookings} รายการ${bookings.length !== totalBookings ? ` จากทั้งหมด ${bookings.length} รายการ` : ''}` 
                  : `Analyzed from ${totalBookings} bookings${bookings.length !== totalBookings ? ` of total ${bookings.length}` : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle Button (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`relative w-10 h-10 rounded-2xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs ${
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-amber-400 text-blue-950 border-amber-300 font-black ring-2 ring-amber-200'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/30'
              }`}
              title={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filter Analytics'}
              aria-label={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2.2] ${isFilterOpen || activeFiltersCount > 0 ? 'text-blue-950' : 'text-white'}`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-blue-950 font-black text-[10px] flex items-center justify-center shadow-xs ring-2 ring-blue-900">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center justify-center border border-white/20 active:scale-95"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Filter Box */}
        {isFilterOpen && (
          <div className="bg-blue-50/70 border-b border-blue-200 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                  {language === 'th' ? 'ตั้งค่าตัวกรองข้อมูลสำหรับสถิติห้องประชุม' : 'Filter Meeting Room Analytics'}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Time Scope */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'ช่วงเวลา (Time Scope)' : 'Time Scope'}
                </label>
                <select
                  value={timeScope}
                  onChange={(e) => setTimeScope(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด (All Time)' : 'All Time'}</option>
                  <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
                  <option value="this_month">{language === 'th' ? 'เดือนปัจจุบัน (This Month)' : 'This Month'}</option>
                  <option value="specific_month">{language === 'th' ? 'เลือกเดือนระบุ' : 'Specific Month'}</option>
                  <option value="custom">{language === 'th' ? 'กำหนดช่วงวันที่เอง' : 'Custom Date Range'}</option>
                </select>
              </div>

              {/* 2. Room */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'ห้องประชุม (Meeting Room)' : 'Room'}
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกห้อง (All Rooms)' : 'All Rooms'}</option>
                  <option value="tpm1">ห้องประชุม TPM 1</option>
                  <option value="tpm2">ห้องประชุม TPM 2</option>
                  <option value="other">ห้องอื่นๆ</option>
                </select>
              </div>

              {/* 3. Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'แผนก/ฝ่าย (Department)' : 'Department'}
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกแผนก (All)' : 'All Depts'}</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* 4. Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'สถานะการประชุม (Status)' : 'Status'}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกสถานะ (All)' : 'All Statuses'}</option>
                  <option value="เสร็จสิ้นแล้ว">{language === 'th' ? 'เสร็จสิ้นแล้ว' : 'Completed'}</option>
                  <option value="กำลังประชุม">{language === 'th' ? 'กำลังประชุม' : 'In Meeting'}</option>
                  <option value="รอเริ่มวันนี้">{language === 'th' ? 'รอเริ่มวันนี้' : 'Starts Today'}</option>
                  <option value="นัดหมายล่วงหน้า">{language === 'th' ? 'นัดหมายล่วงหน้า' : 'Upcoming'}</option>
                </select>
              </div>
            </div>

            {/* Extra Date Pickers */}
            {timeScope === 'specific_month' && (
              <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-3">
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
              <div className="mt-3 pt-3 border-t border-blue-200 flex flex-wrap items-center gap-3">
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

        {/* Modal Body with Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active Filter Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs">
              <span className="font-bold text-blue-950 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                {language === 'th' ? 'เงื่อนไขที่เลือก:' : 'Active Filters:'}
              </span>

              {timeScope !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  📅 {timeScope === 'today' ? (language === 'th' ? 'วันนี้' : 'Today') : timeScope === 'this_month' ? (language === 'th' ? 'เดือนนี้' : 'This Month') : timeScope === 'specific_month' ? selectedMonth : `${startDate || '...'} ~ ${endDate || '...'}`}
                </span>
              )}

              {selectedRoom !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  🚪 {selectedRoom === 'tpm1' ? 'TPM 1' : selectedRoom === 'tpm2' ? 'TPM 2' : 'ห้องอื่นๆ'}
                </span>
              )}

              {selectedDept !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  🏢 {selectedDept}
                </span>
              )}

              {selectedStatus !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  ⚡ {selectedStatus}
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-blue-900 hover:text-rose-600 transition-colors cursor-pointer px-2 py-0.5"
              >
                {language === 'th' ? 'ล้างทั้งหมด' : 'Clear'}
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-900">{language === 'th' ? 'จองทั้งหมด' : 'Total'}</p>
                <p className="text-lg font-black text-blue-950">{totalBookings} <span className="text-xs font-normal text-blue-700">{language === 'th' ? 'ครั้ง' : ''}</span></p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-purple-900">TPM 1 / TPM 2</p>
                <p className="text-lg font-black text-purple-950">
                  {roomData.find(r => r.id === 'tpm1')?.count || 0} / {roomData.find(r => r.id === 'tpm2')?.count || 0}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-900">{language === 'th' ? 'ผู้เข้าร่วมรวม' : 'Attendees'}</p>
                <p className="text-lg font-black text-emerald-950">{totalAttendees} <span className="text-xs font-normal text-emerald-700">{language === 'th' ? 'คน' : ''}</span></p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-900">{language === 'th' ? 'เฉลี่ยต่อครั้ง' : 'Avg / Meeting'}</p>
                <p className="text-lg font-black text-amber-950">{avgAttendees} <span className="text-xs font-normal text-amber-700">{language === 'th' ? 'คน' : ''}</span></p>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab('rooms'); setHoveredIndex(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'rooms'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DoorOpen className="w-4 h-4 text-blue-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนห้องประชุม' : 'Donut: By Meeting Room'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('departments'); setHoveredIndex(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'departments'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: แยกตามแผนก/ฝ่าย' : 'Donut: By Department'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('status'); setHoveredIndex(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: แยกตามสถานะ' : 'Donut: By Status'}</span>
            </button>
          </div>

          {/* Circular Donut Graph Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50/70 p-6 rounded-3xl border border-slate-200">
            {/* SVG Circular Donut Chart */}
            <div className="md:col-span-6 flex flex-col items-center justify-center relative select-none">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background Track Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    className="stroke-slate-200"
                    strokeWidth="24"
                    fill="transparent"
                  />

                  {/* Circular Donut Segments */}
                  {totalBookings > 0 && donutSegments.map((seg, idx) => (
                    <circle
                      key={seg.id}
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={seg.isHovered ? '28' : '24'}
                      strokeDasharray={`${seg.strokeLength} ${circumference}`}
                      strokeDashoffset={-seg.dashOffset}
                      fill="transparent"
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: seg.isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' : 'none',
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  ))}
                </svg>

                {/* Donut Center Core Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                  {hoveredIndex !== null && donutSegments[hoveredIndex] ? (
                    <div className="animate-in zoom-in-75 duration-150">
                      <p className="text-2xl font-black text-slate-800">
                        {donutSegments[hoveredIndex].percentage}%
                      </p>
                      <p className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
                        {donutSegments[hoveredIndex].name}
                      </p>
                      <p className="text-[10px] font-bold text-blue-700">
                        {donutSegments[hoveredIndex].count} {language === 'th' ? 'รายการ' : 'items'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-black text-[#002045]">{totalBookings}</p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {language === 'th' ? 'การจองทั้งหมด' : 'Total Bookings'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 text-xs mt-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{language === 'th' ? 'นำเมาส์ชี้ที่แถบวงกลมเพื่อดูสัดส่วน' : 'Hover over segments to inspect'}</span>
              </div>
            </div>

            {/* Breakdown Legend List */}
            <div className="md:col-span-6 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {activeTab === 'rooms' && (language === 'th' ? 'สัดส่วนและจำนวนคนตามห้องประชุม' : 'Breakdown by Room')}
                {activeTab === 'departments' && (language === 'th' ? 'สัดส่วนการจองแยกตามแผนก/ฝ่าย' : 'Breakdown by Department')}
                {activeTab === 'status' && (language === 'th' ? 'สัดส่วนตามสถานะการประชุม' : 'Breakdown by Status')}
              </h4>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {currentChartItems.map((item, idx) => {
                  const isHov = hoveredIndex === idx;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isHov
                          ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-200'
                          : 'bg-white/80 hover:bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          {'attendees' in item && (
                            <p className="text-[10px] text-slate-500">
                              {language === 'th' ? 'ผู้เข้าร่วม:' : 'Attendees:'} {(item as any).attendees} {language === 'th' ? 'คน' : 'people'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <p className="text-xs font-black text-slate-800">
                          {item.count} <span className="text-[10px] font-normal text-slate-500">{language === 'th' ? 'ครั้ง' : ''}</span>
                        </p>
                        <p className="text-[11px] font-bold text-blue-600 font-mono">
                          {item.percentage}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {language === 'th' ? 'อัปเดตข้อมูลอัตโนมัติจาก Google Sheet' : 'Auto-synced with Google Sheet'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
